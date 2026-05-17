import express, { Request, Response } from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

import User from './models/User';
import Roadmap from './models/Roadmap';
import ChatMessage from './models/ChatMessage';
import Flashcard from './models/Flashcard';
import { auth } from './middleware/authMiddleware';

// Force dotenv to look directly inside the current server folder structure
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Fallback validation check for the developer terminal
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("⚠️ SYSTEM WARNING: GEMINI_API_KEY is missing from your active server/.env file!");
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("⚠️ SYSTEM WARNING: MONGODB_URI is missing from your active server/.env file!");
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));
}

// Pass the checked key directly to the constructor instance
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

console.log('--- System Check ---');
console.log('🤖 Gemini AI Engine initialized with current Environment Key profiles!');

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'Please enter all fields' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'Email already exists' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ error: 'Username is already taken' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ email, passwordHash, username });
    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.json({ token, user: { id: savedUser._id, email: savedUser.email, username: savedUser.username } });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during signup', details: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Please enter all fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

// --- ROADMAP ROUTES (PROTECTED) ---

app.post('/api/generate-roadmap', auth, async (req: Request, res: Response) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const daysMatch = goal.match(/\d+/);
    const totalDays = daysMatch ? parseInt(daysMatch[0], 10) : 5;

    const systemPrompt = `You are an expert curriculum builder. Create a comprehensive, day-by-day technical learning roadmap for a student whose goal is: "${goal}".
Generate exactly ${totalDays} days of data. For each individual day, provide:
1. A short, highly precise milestone title.
2. A list of specific subtopics to master.
3. A list of high-quality, real-world learning resources (like official docs, interactive websites, articles). Do not include video links.
4. Exactly 10 highly contextual multiple-choice questions testing concepts learned that day.
Additionally, at the end of the course, provide:
5. A final Capstone Portfolio Project that strings together multiple concepts they learned, complete with a project scope and success criteria.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { 
                          type: Type.STRING,
                          enum: ["Official Documentation", "Article", "Interactive Website", "Book"]
                        },
                        name: { type: Type.STRING },
                        url: { type: Type.STRING }
                      },
                      required: ["type", "name", "url"]
                    }
                  },
                  quiz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        options: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING } 
                        },
                        answer: { type: Type.STRING }
                      },
                      required: ["question", "options", "answer"]
                    }
                  }
                },
                required: ["day", "title", "subtopics", "resources", "quiz"]
              }
            },
            capstoneProject: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                projectScope: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                successCriteria: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "description", "projectScope", "successCriteria"]
            }
          },
          required: ["roadmap", "capstoneProject"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    
    // Save to MongoDB with User ID
    const newRoadmap = new Roadmap({
      userId: req.user?.id,
      goal,
      roadmapData: parsedData,
      notes: ''
    });
    
    const savedDoc = await newRoadmap.save();

    res.json({ 
      _id: savedDoc._id,
      goal: savedDoc.goal, 
      roadmap: parsedData.roadmap, 
      capstoneProject: parsedData.capstoneProject,
      notes: savedDoc.notes
    });

  } catch (error: any) {
    console.error("AI Roadmap Generation Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      // Fallback mock roadmap for 429 errors
      const mockRoadmap = [
        {
          day: 1,
          title: "Introduction (Fallback Mode)",
          subtopics: ["Rate Limits", "API Quotas"],
          resources: [{ type: "Article", name: "Understanding Rate Limits", url: "https://developers.google.com" }],
          quiz: [{ question: "What is a 429 error?", options: ["Success", "Rate Limit Exceeded", "Not Found", "Server Error"], answer: "Rate Limit Exceeded" }]
        }
      ];
      const mockCapstone = {
        title: "Fallback Project",
        description: "AI is resting. This is a placeholder.",
        projectScope: ["Wait for quota reset"],
        successCriteria: ["App doesn't crash"]
      };
      
      const newRoadmap = new Roadmap({
        userId: req.user?.id,
        goal: req.body.goal || "Fallback Goal",
        roadmapData: { roadmap: mockRoadmap, capstoneProject: mockCapstone },
        notes: 'Generated via fallback due to rate limits.'
      });
      const savedDoc = await newRoadmap.save();
      
      return res.json({ 
        _id: savedDoc._id,
        goal: savedDoc.goal, 
        roadmap: mockRoadmap, 
        capstoneProject: mockCapstone,
        notes: savedDoc.notes,
        isFallback: true
      });
    }
    res.status(500).json({ error: 'AI failed to construct this roadmap.', details: error.message });
  }
});

// Fetch all saved roadmaps history for the logged-in user
app.get('/api/roadmaps', auth, async (req: Request, res: Response) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user?.id }, '_id goal createdAt').sort({ createdAt: -1 });
    res.json(roadmaps);
  } catch (error: any) {
    console.error("Fetch Roadmaps Error: ", error);
    res.status(500).json({ error: 'Failed to fetch roadmaps', details: error.message });
  }
});

// Fetch a single roadmap by ID (must belong to user)
app.get('/api/roadmaps/:id', auth, async (req: Request, res: Response) => {
  try {
    const doc = await Roadmap.findOne({ _id: req.params.id, userId: req.user?.id });
    if (!doc) return res.status(404).json({ error: 'Roadmap not found' });
    
    res.json({
      _id: doc._id,
      goal: doc.goal,
      roadmap: doc.roadmapData.roadmap,
      capstoneProject: doc.roadmapData.capstoneProject,
      notes: doc.notes,
      createdAt: doc.createdAt
    });
  } catch (error: any) {
    console.error("Fetch Single Roadmap Error: ", error);
    res.status(500).json({ error: 'Failed to fetch roadmap', details: error.message });
  }
});

// Update notes for a specific roadmap (must belong to user)
app.put('/api/roadmaps/:id/notes', auth, async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const doc = await Roadmap.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.id }, 
      { notes }, 
      { new: true }
    );
    
    if (!doc) return res.status(404).json({ error: 'Roadmap not found' });
    
    res.json({ message: 'Notes saved successfully', notes: doc.notes });
  } catch (error: any) {
    console.error("Update Notes Error: ", error);
    res.status(500).json({ error: 'Failed to save notes', details: error.message });
  }
});

// Delete a roadmap and its associated chat history
app.delete('/api/roadmaps/:id', auth, async (req: Request, res: Response) => {
  try {
    const roadmapId = req.params.id;
    const userId = req.user?.id;

    const doc = await Roadmap.findOneAndDelete({ _id: roadmapId, userId });
    if (!doc) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Cascade delete associated ChatMessages
    await ChatMessage.deleteMany({ roadmapId });

    res.json({ message: 'Roadmap and associated data deleted successfully' });
  } catch (error: any) {
    console.error("Delete Roadmap Error: ", error);
    res.status(500).json({ error: 'Failed to delete roadmap', details: error.message });
  }
});

// --- ANALYTICS & VISUALIZATION ROUTES ---

app.post('/api/generate-mindmap', auth, async (req: Request, res: Response) => {
  try {
    const { topic, context } = req.body;
    
    const systemPrompt = `You are a technical data architect. Generate a mind-map for the topic: "${topic}".
Context: ${context || 'None'}
Output a strict hierarchical JSON structure.
Schema:
{
  "mindmap": {
    "name": "Root Topic",
    "children": [
      {
        "name": "Subtopic 1",
        "children": [
          { "name": "Detail A" },
          { "name": "Detail B" }
        ]
      }
    ]
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    res.json({ mindmap: parsedData.mindmap });

  } catch (error: any) {
    console.error("Mindmap Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const mockMindmap = {
        name: "AI is Resting",
        children: [
          { name: "Rate Limit Hit", children: [{ name: "Please try again later" }] }
        ]
      };
      return res.json({ mindmap: mockMindmap, isFallback: true });
    }
    res.status(500).json({ error: 'Failed to generate mindmap', details: error.message });
  }
});

app.post('/api/explain-concept', async (req: Request, res: Response) => {
  try {
    const { concept, contextTopic } = req.body;

    if (!concept || !contextTopic) {
      return res.status(400).json({ error: 'Both concept and contextTopic are required' });
    }

    const systemPrompt = `You are an expert tutor known for making complex topics incredibly simple. 
The user is learning about "${contextTopic}" and needs an explanation for the specific concept: "${concept}".
Provide a dead-simple, highly relatable real-world analogy breaking down this concept as if you were explaining it to a 5-year-old (ELI5). Do not use any academic jargon.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analogy: { type: Type.STRING }
          },
          required: ["analogy"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    res.json({ analogy: parsedData.analogy });

  } catch (error: any) {
    console.error("AI ELI5 Generation Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      return res.json({ analogy: "AI is currently resting due to rate limitations. Please imagine a very simple analogy involving pizzas or cars!", isFallback: true });
    }
    res.status(500).json({ error: 'AI failed to explain concept.', details: error.message });
  }
});

app.post('/api/generate-more-questions', async (req: Request, res: Response) => {
  try {
    const { topic, day } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const systemPrompt = `You are an expert technical evaluator. The user has requested a deep-dive assessment on the topic: "${topic}".
Generate exactly 5 advanced, highly relevant multiple-choice questions to test deep understanding of this specific topic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  },
                  answer: { type: Type.STRING }
                },
                required: ["question", "options", "answer"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    res.json({ questions: parsedData.questions });

  } catch (error: any) {
    console.error("AI Question Generation Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const mockQuestions = [
        {
          question: "AI is resting. What should you do?",
          options: ["Panic", "Take a break", "Review notes", "Both B and C"],
          answer: "Both B and C"
        }
      ];
      return res.json({ questions: mockQuestions, isFallback: true });
    }
    res.status(500).json({ error: 'AI failed to construct additional questions.', details: error.message });
  }
});

// --- ANALYTICS ROUTES ---

app.post('/api/user/activity', auth, async (req: Request, res: Response) => {
  try {
    const { actionType, score, totalCompleted } = req.body;
    
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const lastActive = user.lastActiveDate;
    
    if (lastActive) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isToday = lastActive.toDateString() === now.toDateString();
      const isYesterday = lastActive.toDateString() === yesterday.toDateString();
      
      if (isYesterday) {
        user.streakCount += 1;
      } else if (!isToday) {
        user.streakCount = 1; // Reset streak if missed a day
      }
    } else {
      user.streakCount = 1; // First activity
    }

    user.lastActiveDate = now;

    if (actionType === 'completed_milestone' && typeof totalCompleted === 'number') {
      // Sync exactly to the count provided by the frontend so it can properly decrease when unchecked
      if (totalCompleted > user.milestonesCompleted) {
        user.xp += 50 * (totalCompleted - user.milestonesCompleted);
      } else if (totalCompleted < user.milestonesCompleted) {
        user.xp -= 50 * (user.milestonesCompleted - totalCompleted);
      }
      user.milestonesCompleted = totalCompleted;
    } else if (actionType === 'completed_quiz') {
      user.totalQuizzesTaken += 1;
      user.totalQuizScore += (score || 0);
      user.xp += 100;
    }

    await user.save();
    res.json({ streakCount: user.streakCount, milestonesCompleted: user.milestonesCompleted, xp: user.xp });
  } catch (error: any) {
    console.error("Activity Error: ", error);
    res.status(500).json({ error: 'Failed to update activity', details: error.message });
  }
});

app.get('/api/user/stats', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const averageQuizScore = user.totalQuizzesTaken > 0 
      ? Math.round(user.totalQuizScore / user.totalQuizzesTaken) 
      : 0;

    res.json({
      streakCount: user.streakCount,
      milestonesCompleted: user.milestonesCompleted,
      totalQuizzesTaken: user.totalQuizzesTaken,
      averageQuizScore,
      totalStudyMinutes: user.totalStudyMinutes || 0,
      xp: user.xp || 0,
      isPublic: user.isPublic !== false,
      username: user.username || ''
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

app.put('/api/user/profile', auth, async (req: Request, res: Response) => {
  try {
    const { isPublic, username } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (username !== undefined && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ error: 'Username is already taken' });
      user.username = username;
    }
    
    if (isPublic !== undefined) {
      user.isPublic = isPublic;
    }
    
    await user.save();
    res.json({ isPublic: user.isPublic, username: user.username });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

app.get('/api/leaderboard', auth, async (req: Request, res: Response) => {
  try {
    const leaders = await User.find({ isPublic: { $ne: false } })
      .sort({ xp: -1 })
      .limit(10)
      .select('username xp streakCount milestonesCompleted totalQuizzesTaken totalStudyMinutes -email');
    res.json(leaders);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
  }
});

app.get('/api/roadmaps/:id/certificate', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.user?.id });

    if (!user || !roadmap) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const issueDate = new Date().toISOString();
    const hashData = `${user._id}-${roadmap._id}-${issueDate}`;
    const certHash = crypto.createHash('sha256').update(hashData).digest('hex');

    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 50
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${roadmap._id}.pdf`);
    
    doc.pipe(res);

    doc.rect(20, 20, 802, 555).stroke('#4f46e5');
    doc.rect(25, 25, 792, 545).stroke('#4f46e5');
    
    doc.fontSize(40).font('Helvetica-Bold').fillColor('#1e293b').text('CERTIFICATE OF COMPLETION', 0, 140, { align: 'center' });
    doc.fontSize(16).font('Helvetica').fillColor('#64748b').text('This certifies that', 0, 210, { align: 'center' });
    doc.fontSize(30).font('Helvetica-Bold').fillColor('#4f46e5').text(user.email.split('@')[0], 0, 245, { align: 'center' });
    doc.fontSize(16).font('Helvetica').fillColor('#64748b').text('has successfully mastered the comprehensive technical curriculum:', 0, 300, { align: 'center' });
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e293b').text(roadmap.goal, 0, 335, { align: 'center' });
    
    doc.fontSize(12).font('Helvetica').fillColor('#64748b').text(`Awarded on: ${new Date().toLocaleDateString()}`, 0, 440, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(`Verify Hash: ${certHash}`, 0, 490, { align: 'center' });
    
    doc.end();

  } catch (error: any) {
    console.error("Certificate Error: ", error);
    res.status(500).json({ error: 'Failed to generate certificate', details: error.message });
  }
});

// --- CHATBOT ROUTE ---

app.get('/api/chat/history/:roadmapId/:dayNumber', auth, async (req: Request, res: Response) => {
  try {
    const { roadmapId, dayNumber } = req.params;
    const messages = await ChatMessage.find({ roadmapId, dayNumber }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch chat history', details: error.message });
  }
});

app.post('/api/chat/ask', auth, async (req: Request, res: Response) => {
  try {
    const { roadmapId, dayNumber, milestoneTitle, message } = req.body;
    
    if (!message || !milestoneTitle || !roadmapId) {
      return res.status(400).json({ error: 'Missing chat context or message' });
    }

    // Save user message
    await ChatMessage.create({ roadmapId, dayNumber, sender: 'user', text: message });

    // Fetch up to 10 previous messages for context
    const history = await ChatMessage.find({ roadmapId, dayNumber }).sort({ createdAt: 1 }).limit(10);
    const historyContents = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const systemPrompt = `You are an expert AI tutor. The student is currently studying Day ${dayNumber} (${milestoneTitle}) of their custom roadmap. Answer their question directly, keeping your response clear, concise, and focused on this specific learning context. Do not use markdown headers.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Understood. I'm ready to help them with this specific topic." }] },
      ...historyContents,
      { role: 'user', parts: [{ text: message }] } // Include the current message again just in case history is empty or to reinforce
    ];

    const chatSession = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents as any
    });

    const response = await chatSession;
    if (!response.text) throw new Error("No response from AI");

    // Save AI response
    await ChatMessage.create({ roadmapId, dayNumber, sender: 'ai', text: response.text });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Chat Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const fallbackReply = "AI is currently resting due to rate limitations. I'll be back shortly to answer your questions!";
      await ChatMessage.create({ roadmapId: req.body.roadmapId, dayNumber: req.body.dayNumber, sender: 'ai', text: fallbackReply });
      return res.json({ reply: fallbackReply, isFallback: true });
    }
    res.status(500).json({ error: 'Failed to communicate with AI Buddy', details: error.message });
  }
});

// --- PIVOT ROADMAP ROUTE ---

app.post('/api/roadmaps/:id/pivot', auth, async (req: Request, res: Response) => {
  try {
    const { feedback, completedDaysIndex } = req.body;
    const completedIndex = completedDaysIndex || 0; // fallback to 0
    
    const doc = await Roadmap.findOne({ _id: req.params.id, userId: req.user?.id });
    if (!doc) return res.status(404).json({ error: 'Roadmap not found' });

    const currentRoadmap = doc.roadmapData.roadmap;
    const remainingDays = currentRoadmap.slice(completedIndex);

    if (remainingDays.length === 0) {
      return res.status(400).json({ error: 'No days left to pivot' });
    }

    const systemPrompt = `You are an expert curriculum builder. The student is currently on a learning path for: "${doc.goal}".
They have completed up to day ${completedIndex}. 
They provided the following feedback for the remaining part of the course: "${feedback}".

Here is what was originally planned for the remaining days:
${JSON.stringify(remainingDays)}

Please REGENERATE the remaining days based on their feedback. Ensure you keep the exact same JSON schema as before. Start the new 'day' index at ${completedIndex + 1}.

Return exactly ${remainingDays.length} days of data covering the rest of the course.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, enum: ["Official Documentation", "Article", "Interactive Website", "Book"] },
                        name: { type: Type.STRING },
                        url: { type: Type.STRING }
                      },
                      required: ["type", "name", "url"]
                    }
                  },
                  quiz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        answer: { type: Type.STRING }
                      },
                      required: ["question", "options", "answer"]
                    }
                  }
                },
                required: ["day", "title", "subtopics", "resources", "quiz"]
              }
            }
          },
          required: ["roadmap"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    // Clean potential markdown from response
    const cleanJsonText = aiResultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanJsonText);
    
    // Stitch the roadmap back together
    const newFullRoadmap = [
      ...currentRoadmap.slice(0, completedIndex),
      ...parsedData.roadmap
    ];

    doc.roadmapData.roadmap = newFullRoadmap;
    await doc.save();

    res.json({ roadmap: newFullRoadmap });
  } catch (error: any) {
    console.error("Pivot Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      // Return the current original roadmap unmodified if pivot fails due to rate limit
      const doc = await Roadmap.findOne({ _id: req.params.id, userId: req.user?.id });
      return res.json({ roadmap: doc?.roadmapData.roadmap, isFallback: true });
    }
    res.status(500).json({ error: 'Failed to pivot roadmap', details: error.message });
  }
});

// --- GAMIFICATION & POMODORO ROUTES ---

app.post('/api/user/activity', auth, async (req: Request, res: Response) => {
  try {
    const { actionType, score, totalCompleted } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (actionType === 'completed_milestone') {
      user.xp += (score || 0);
      if (score && score > 0) user.milestonesCompleted += 1;
      else if (score && score < 0) user.milestonesCompleted = Math.max(0, user.milestonesCompleted - 1);
    } else if (actionType === 'completed_quiz') {
      user.xp += (score || 0) * 10; // 10 XP per quiz score
      user.totalQuizzesTaken += 1;
      user.totalQuizScore += (score || 0);
    }
    
    await user.save();
    res.json({ xp: user.xp, milestonesCompleted: user.milestonesCompleted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sync activity', details: error.message });
  }
});

app.put('/api/user/time', auth, async (req: Request, res: Response) => {
  try {
    const { minutes } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.totalStudyMinutes += minutes;
    await user.save();
    res.json({ totalStudyMinutes: user.totalStudyMinutes });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update time', details: error.message });
  }
});

app.get('/api/leaderboard', auth, async (req: Request, res: Response) => {
  try {
    // Top 10 users by XP
    const users = await User.find({ isPublic: { $ne: false } }, 'username xp streakCount milestonesCompleted totalStudyMinutes -email').sort({ xp: -1 }).limit(10);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
  }
});

app.post('/api/roadmaps/:id/deep-dive', auth, async (req: Request, res: Response) => {
  try {
    const { subtopic } = req.body;
    
    const systemPrompt = `You are an expert curriculum designer. Create a 3-hour intensive micro-roadmap specifically focusing on the technical concept: "${subtopic}".
Break it down into 3 "hours" (treat them like days in the schema).
Schema:
{
  "subPlan": [
    { "day": 1, "title": "Hour 1: Core Fundamentals", "subtopics": ["Concept A", "Concept B"] },
    { "day": 2, "title": "Hour 2: Practical Application", "subtopics": ["Concept C"] },
    { "day": 3, "title": "Hour 3: Advanced Edge Cases", "subtopics": ["Concept D"] }
  ]
}
Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["day", "title", "subtopics"]
              }
            }
          },
          required: ["subPlan"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    res.json({ subPlan: parsedData.subPlan });
  } catch (error: any) {
    console.error("Deep Dive Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const mockSubPlan = [
        { day: 1, title: "Hour 1: System Pause", subtopics: ["AI Resting"] },
        { day: 2, title: "Hour 2: Rate Limits", subtopics: ["Quota Exceeded"] },
        { day: 3, title: "Hour 3: Resolution", subtopics: ["Please try again soon"] }
      ];
      return res.json({ subPlan: mockSubPlan, isFallback: true });
    }
    res.status(500).json({ error: 'Failed to generate deep dive', details: error.message });
  }
});

app.get('/api/challenges/generate', auth, async (req: Request, res: Response) => {
  try {
    const topic = req.query.topic as string || 'javascript';
    
    const githubRes = await fetch(`https://api.github.com/search/issues?q=label:"good first issue"+state:open+${encodeURIComponent(topic)}&sort=created&order=desc&per_page=3`, {
      headers: { 'User-Agent': 'AI-Learning-Platform' }
    });
    const githubData = await githubRes.json();
    
    if (!githubData.items || githubData.items.length === 0) {
      return res.json({ challenges: [] });
    }

    const issues = githubData.items.map((item: any) => ({
      title: item.title,
      url: item.html_url,
      body: item.body ? item.body.substring(0, 300) : ''
    }));

    const systemPrompt = `You are an expert developer mentor. I have scraped ${issues.length} "good first issues" from open-source repositories related to ${topic}.
Here is the raw data: ${JSON.stringify(issues)}

Your task is to parse these issues and structure them into actionable, beginner-friendly "Live Workshop Challenges".
Simplify the technical jargon and provide a clear "Task Definition".
Schema:
{
  "challenges": [
    { 
      "title": "Cleaned up title", 
      "repoUrl": "github url",
      "taskDefinition": "A clear, actionable summary of what needs to be done, scaled to a beginner's capability.",
      "difficulty": "Beginner | Intermediate"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const parsedData = JSON.parse(aiResultText);
    res.json({ challenges: parsedData.challenges });

  } catch (error: any) {
    console.error("Challenges Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const mockChallenges = [
        {
          title: "Fix Typo in Documentation",
          repoUrl: "https://github.com/mock/repo",
          taskDefinition: "Find the README.md file and correct the spelling of 'synchronous'.",
          difficulty: "Beginner"
        }
      ];
      return res.json({ challenges: mockChallenges, isFallback: true });
    }
    res.status(500).json({ error: 'Failed to generate challenges', details: error.message });
  }
});

// --- FLASHCARD ROUTES ---

app.post('/api/flashcards/generate', auth, async (req: Request, res: Response) => {
  try {
    const { roadmapId, dayNumber, concepts, offset = 0 } = req.body;
    
    const batchNumber = Math.floor(offset / 10) + 1;
    const systemPrompt = `Parse the following concepts into exactly 10 distinct technical summary points: ${concepts.join(', ')}.
This is batch number ${batchNumber}. Generate unique concepts that were NOT covered in previous batches.
STOP generating question-and-answer pairs.
Format them as flashcards where the "front" is the specific core concept name or keyword, and the "back" is a highly informative, concise summary point or crucial takeaway explaining that concept.
Return ONLY JSON using this exact schema: { "flashcards": [ { "front": "Core Concept Name", "back": "Technical Summary/Explanation" } ] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["flashcards"]
        }
      }
    });

    const aiResultText = response.text;
    if (!aiResultText) throw new Error("No response payload from AI engine");

    const cleanJsonText = aiResultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanJsonText);
    
    const newFlashcards = parsedData.flashcards.map((f: any) => ({
      userId: req.user?.id,
      roadmapId,
      dayNumber,
      front: f.front,
      back: f.back
    }));

    await Flashcard.insertMany(newFlashcards);
    res.json({ message: 'Flashcards generated successfully' });
  } catch (error: any) {
    console.error("Flashcard Gen Error: ", error);
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
      const mockFlashcards = [
        { front: "What is an API rate limit?", back: "A restriction on the number of requests a user can make to an API within a given timeframe." },
        { front: "What is a 429 status code?", back: "Too Many Requests" }
      ];
      
      const newFlashcards = mockFlashcards.map((f: any) => ({
        userId: req.user?.id,
        roadmapId: req.body.roadmapId,
        dayNumber: req.body.dayNumber,
        front: f.front,
        back: f.back
      }));

      await Flashcard.insertMany(newFlashcards);
      return res.json({ message: 'Mock flashcards generated due to rate limits', isFallback: true });
    }
    res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
  }
});

app.get('/api/flashcards/:roadmapId/:dayNumber', auth, async (req: Request, res: Response) => {
  try {
    const { roadmapId, dayNumber } = req.params;
    const now = new Date();
    // Fetch flashcards for this user/roadmap/day that are due for review (or never reviewed)
    const cards = await Flashcard.find({ 
      userId: req.user?.id, 
      roadmapId, 
      dayNumber,
      nextReviewDate: { $lte: now }
    });
    res.json(cards);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch flashcards', details: error.message });
  }
});

app.put('/api/flashcards/:id/review', auth, async (req: Request, res: Response) => {
  try {
    const { rating } = req.body; // 0 to 5
    const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user?.id });
    if (!card) return res.status(404).json({ error: 'Flashcard not found' });

    // SM-2 Algorithm Implementation
    let { interval, repetition, efactor } = card;

    if (rating >= 3) {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * efactor);
      }
      repetition += 1;
    } else {
      repetition = 0;
      interval = 1;
    }

    efactor = efactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    card.interval = interval;
    card.repetition = repetition;
    card.efactor = efactor;
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    card.nextReviewDate = nextReview;

    await card.save();
    res.json(card);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to review flashcard', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});