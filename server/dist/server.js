"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("./models/User"));
const Roadmap_1 = __importDefault(require("./models/Roadmap"));
const ChatMessage_1 = __importDefault(require("./models/ChatMessage"));
const Flashcard_1 = __importDefault(require("./models/Flashcard"));
const authMiddleware_1 = require("./middleware/authMiddleware");
// Force dotenv to look directly inside the current server folder structure
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Fallback validation check for the developer terminal
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("⚠️ SYSTEM WARNING: GEMINI_API_KEY is missing from your active server/.env file!");
}
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error("⚠️ SYSTEM WARNING: MONGODB_URI is missing from your active server/.env file!");
}
else {
    mongoose_1.default.connect(mongoUri)
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch((err) => console.error('❌ MongoDB Connection Error:', err));
}
// Pass the checked key directly to the constructor instance
const ai = new genai_1.GoogleGenAI({ apiKey: apiKey || '' });
console.log('--- System Check ---');
console.log('🤖 Gemini AI Engine initialized with current Environment Key profiles!');
// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Please enter all fields' });
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser)
            return res.status(400).json({ error: 'User already exists' });
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = new User_1.default({ email, passwordHash });
        const savedUser = await newUser.save();
        const token = jsonwebtoken_1.default.sign({ id: savedUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
        res.json({ token, user: { id: savedUser._id, email: savedUser.email } });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during signup', details: error.message });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Please enter all fields' });
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(400).json({ error: 'Invalid credentials' });
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch)
            return res.status(400).json({ error: 'Invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, email: user.email } });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during login', details: error.message });
    }
});
// --- ROADMAP ROUTES (PROTECTED) ---
app.post('/api/generate-roadmap', authMiddleware_1.auth, async (req, res) => {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        roadmap: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    day: { type: genai_1.Type.INTEGER },
                                    title: { type: genai_1.Type.STRING },
                                    subtopics: {
                                        type: genai_1.Type.ARRAY,
                                        items: { type: genai_1.Type.STRING }
                                    },
                                    resources: {
                                        type: genai_1.Type.ARRAY,
                                        items: {
                                            type: genai_1.Type.OBJECT,
                                            properties: {
                                                type: {
                                                    type: genai_1.Type.STRING,
                                                    enum: ["Official Documentation", "Article", "Interactive Website", "Book"]
                                                },
                                                name: { type: genai_1.Type.STRING },
                                                url: { type: genai_1.Type.STRING }
                                            },
                                            required: ["type", "name", "url"]
                                        }
                                    },
                                    quiz: {
                                        type: genai_1.Type.ARRAY,
                                        items: {
                                            type: genai_1.Type.OBJECT,
                                            properties: {
                                                question: { type: genai_1.Type.STRING },
                                                options: {
                                                    type: genai_1.Type.ARRAY,
                                                    items: { type: genai_1.Type.STRING }
                                                },
                                                answer: { type: genai_1.Type.STRING }
                                            },
                                            required: ["question", "options", "answer"]
                                        }
                                    }
                                },
                                required: ["day", "title", "subtopics", "resources", "quiz"]
                            }
                        },
                        capstoneProject: {
                            type: genai_1.Type.OBJECT,
                            properties: {
                                title: { type: genai_1.Type.STRING },
                                description: { type: genai_1.Type.STRING },
                                projectScope: {
                                    type: genai_1.Type.ARRAY,
                                    items: { type: genai_1.Type.STRING }
                                },
                                successCriteria: {
                                    type: genai_1.Type.ARRAY,
                                    items: { type: genai_1.Type.STRING }
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        // Save to MongoDB with User ID
        const newRoadmap = new Roadmap_1.default({
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
    }
    catch (error) {
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
            const newRoadmap = new Roadmap_1.default({
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
app.get('/api/roadmaps', authMiddleware_1.auth, async (req, res) => {
    try {
        const roadmaps = await Roadmap_1.default.find({ userId: req.user?.id }, '_id goal createdAt').sort({ createdAt: -1 });
        res.json(roadmaps);
    }
    catch (error) {
        console.error("Fetch Roadmaps Error: ", error);
        res.status(500).json({ error: 'Failed to fetch roadmaps', details: error.message });
    }
});
// Fetch a single roadmap by ID (must belong to user)
app.get('/api/roadmaps/:id', authMiddleware_1.auth, async (req, res) => {
    try {
        const doc = await Roadmap_1.default.findOne({ _id: req.params.id, userId: req.user?.id });
        if (!doc)
            return res.status(404).json({ error: 'Roadmap not found' });
        res.json({
            _id: doc._id,
            goal: doc.goal,
            roadmap: doc.roadmapData.roadmap,
            capstoneProject: doc.roadmapData.capstoneProject,
            notes: doc.notes,
            createdAt: doc.createdAt
        });
    }
    catch (error) {
        console.error("Fetch Single Roadmap Error: ", error);
        res.status(500).json({ error: 'Failed to fetch roadmap', details: error.message });
    }
});
// Update notes for a specific roadmap (must belong to user)
app.put('/api/roadmaps/:id/notes', authMiddleware_1.auth, async (req, res) => {
    try {
        const { notes } = req.body;
        const doc = await Roadmap_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?.id }, { notes }, { new: true });
        if (!doc)
            return res.status(404).json({ error: 'Roadmap not found' });
        res.json({ message: 'Notes saved successfully', notes: doc.notes });
    }
    catch (error) {
        console.error("Update Notes Error: ", error);
        res.status(500).json({ error: 'Failed to save notes', details: error.message });
    }
});
// Delete a roadmap and its associated chat history
app.delete('/api/roadmaps/:id', authMiddleware_1.auth, async (req, res) => {
    try {
        const roadmapId = req.params.id;
        const userId = req.user?.id;
        const doc = await Roadmap_1.default.findOneAndDelete({ _id: roadmapId, userId });
        if (!doc) {
            return res.status(404).json({ error: 'Roadmap not found' });
        }
        // Cascade delete associated ChatMessages
        await ChatMessage_1.default.deleteMany({ roadmapId });
        res.json({ message: 'Roadmap and associated data deleted successfully' });
    }
    catch (error) {
        console.error("Delete Roadmap Error: ", error);
        res.status(500).json({ error: 'Failed to delete roadmap', details: error.message });
    }
});
// --- ANALYTICS & VISUALIZATION ROUTES ---
app.post('/api/generate-mindmap', authMiddleware_1.auth, async (req, res) => {
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        res.json({ mindmap: parsedData.mindmap });
    }
    catch (error) {
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
app.post('/api/explain-concept', async (req, res) => {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        analogy: { type: genai_1.Type.STRING }
                    },
                    required: ["analogy"]
                }
            }
        });
        const aiResultText = response.text;
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        res.json({ analogy: parsedData.analogy });
    }
    catch (error) {
        console.error("AI ELI5 Generation Error: ", error);
        if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            return res.json({ analogy: "AI is currently resting due to rate limitations. Please imagine a very simple analogy involving pizzas or cars!", isFallback: true });
        }
        res.status(500).json({ error: 'AI failed to explain concept.', details: error.message });
    }
});
app.post('/api/generate-more-questions', async (req, res) => {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        questions: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    question: { type: genai_1.Type.STRING },
                                    options: {
                                        type: genai_1.Type.ARRAY,
                                        items: { type: genai_1.Type.STRING }
                                    },
                                    answer: { type: genai_1.Type.STRING }
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        res.json({ questions: parsedData.questions });
    }
    catch (error) {
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
app.post('/api/user/activity', authMiddleware_1.auth, async (req, res) => {
    try {
        const { actionType, score, totalCompleted } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const now = new Date();
        const lastActive = user.lastActiveDate;
        if (lastActive) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isToday = lastActive.toDateString() === now.toDateString();
            const isYesterday = lastActive.toDateString() === yesterday.toDateString();
            if (isYesterday) {
                user.streakCount += 1;
            }
            else if (!isToday) {
                user.streakCount = 1; // Reset streak if missed a day
            }
        }
        else {
            user.streakCount = 1; // First activity
        }
        user.lastActiveDate = now;
        if (actionType === 'completed_milestone' && typeof totalCompleted === 'number') {
            // Sync exactly to the count provided by the frontend so it can properly decrease when unchecked
            if (totalCompleted > user.milestonesCompleted) {
                user.xp += 50 * (totalCompleted - user.milestonesCompleted);
            }
            else if (totalCompleted < user.milestonesCompleted) {
                user.xp -= 50 * (user.milestonesCompleted - totalCompleted);
            }
            user.milestonesCompleted = totalCompleted;
        }
        else if (actionType === 'completed_quiz') {
            user.totalQuizzesTaken += 1;
            user.totalQuizScore += (score || 0);
            user.xp += 100;
        }
        await user.save();
        res.json({ streakCount: user.streakCount, milestonesCompleted: user.milestonesCompleted, xp: user.xp });
    }
    catch (error) {
        console.error("Activity Error: ", error);
        res.status(500).json({ error: 'Failed to update activity', details: error.message });
    }
});
app.get('/api/user/stats', authMiddleware_1.auth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const averageQuizScore = user.totalQuizzesTaken > 0
            ? Math.round(user.totalQuizScore / user.totalQuizzesTaken)
            : 0;
        res.json({
            streakCount: user.streakCount,
            milestonesCompleted: user.milestonesCompleted,
            totalQuizzesTaken: user.totalQuizzesTaken,
            averageQuizScore,
            totalStudyMinutes: user.totalStudyMinutes || 0,
            xp: user.xp || 0
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});
app.get('/api/leaderboard', authMiddleware_1.auth, async (req, res) => {
    try {
        const leaders = await User_1.default.find()
            .sort({ xp: -1 })
            .limit(10)
            .select('email xp streakCount milestonesCompleted totalQuizzesTaken');
        res.json(leaders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
    }
});
app.get('/api/roadmaps/:id/certificate', authMiddleware_1.auth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        const roadmap = await Roadmap_1.default.findOne({ _id: req.params.id, userId: req.user?.id });
        if (!user || !roadmap) {
            return res.status(404).json({ error: 'Data not found' });
        }
        const issueDate = new Date().toISOString();
        const hashData = `${user._id}-${roadmap._id}-${issueDate}`;
        const certHash = crypto_1.default.createHash('sha256').update(hashData).digest('hex');
        const doc = new pdfkit_1.default({
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
    }
    catch (error) {
        console.error("Certificate Error: ", error);
        res.status(500).json({ error: 'Failed to generate certificate', details: error.message });
    }
});
// --- CHATBOT ROUTE ---
app.get('/api/chat/history/:roadmapId/:dayNumber', authMiddleware_1.auth, async (req, res) => {
    try {
        const { roadmapId, dayNumber } = req.params;
        const messages = await ChatMessage_1.default.find({ roadmapId, dayNumber }).sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history', details: error.message });
    }
});
app.post('/api/chat/ask', authMiddleware_1.auth, async (req, res) => {
    try {
        const { roadmapId, dayNumber, milestoneTitle, message } = req.body;
        if (!message || !milestoneTitle || !roadmapId) {
            return res.status(400).json({ error: 'Missing chat context or message' });
        }
        // Save user message
        await ChatMessage_1.default.create({ roadmapId, dayNumber, sender: 'user', text: message });
        // Fetch up to 10 previous messages for context
        const history = await ChatMessage_1.default.find({ roadmapId, dayNumber }).sort({ createdAt: 1 }).limit(10);
        const historyContents = history.map((msg) => ({
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
            contents: contents
        });
        const response = await chatSession;
        if (!response.text)
            throw new Error("No response from AI");
        // Save AI response
        await ChatMessage_1.default.create({ roadmapId, dayNumber, sender: 'ai', text: response.text });
        res.json({ reply: response.text });
    }
    catch (error) {
        console.error("Chat Error: ", error);
        if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            const fallbackReply = "AI is currently resting due to rate limitations. I'll be back shortly to answer your questions!";
            await ChatMessage_1.default.create({ roadmapId: req.body.roadmapId, dayNumber: req.body.dayNumber, sender: 'ai', text: fallbackReply });
            return res.json({ reply: fallbackReply, isFallback: true });
        }
        res.status(500).json({ error: 'Failed to communicate with AI Buddy', details: error.message });
    }
});
// --- PIVOT ROADMAP ROUTE ---
app.post('/api/roadmaps/:id/pivot', authMiddleware_1.auth, async (req, res) => {
    try {
        const { feedback, completedDaysIndex } = req.body;
        const completedIndex = completedDaysIndex || 0; // fallback to 0
        const doc = await Roadmap_1.default.findOne({ _id: req.params.id, userId: req.user?.id });
        if (!doc)
            return res.status(404).json({ error: 'Roadmap not found' });
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        roadmap: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    day: { type: genai_1.Type.INTEGER },
                                    title: { type: genai_1.Type.STRING },
                                    subtopics: {
                                        type: genai_1.Type.ARRAY,
                                        items: { type: genai_1.Type.STRING }
                                    },
                                    resources: {
                                        type: genai_1.Type.ARRAY,
                                        items: {
                                            type: genai_1.Type.OBJECT,
                                            properties: {
                                                type: { type: genai_1.Type.STRING, enum: ["Official Documentation", "Article", "Interactive Website", "Book"] },
                                                name: { type: genai_1.Type.STRING },
                                                url: { type: genai_1.Type.STRING }
                                            },
                                            required: ["type", "name", "url"]
                                        }
                                    },
                                    quiz: {
                                        type: genai_1.Type.ARRAY,
                                        items: {
                                            type: genai_1.Type.OBJECT,
                                            properties: {
                                                question: { type: genai_1.Type.STRING },
                                                options: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.STRING } },
                                                answer: { type: genai_1.Type.STRING }
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
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
    }
    catch (error) {
        console.error("Pivot Error: ", error);
        if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            // Return the current original roadmap unmodified if pivot fails due to rate limit
            const doc = await Roadmap_1.default.findOne({ _id: req.params.id, userId: req.user?.id });
            return res.json({ roadmap: doc?.roadmapData.roadmap, isFallback: true });
        }
        res.status(500).json({ error: 'Failed to pivot roadmap', details: error.message });
    }
});
// --- GAMIFICATION & POMODORO ROUTES ---
app.put('/api/user/time', authMiddleware_1.auth, async (req, res) => {
    try {
        const { minutes } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        user.totalStudyMinutes += minutes;
        await user.save();
        res.json({ totalStudyMinutes: user.totalStudyMinutes });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update time', details: error.message });
    }
});
app.get('/api/leaderboard', authMiddleware_1.auth, async (req, res) => {
    try {
        // Top 10 users by XP
        const users = await User_1.default.find({}, 'email xp streakCount milestonesCompleted totalStudyMinutes').sort({ xp: -1 }).limit(10);
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
    }
});
app.post('/api/roadmaps/:id/deep-dive', authMiddleware_1.auth, async (req, res) => {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        subPlan: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    day: { type: genai_1.Type.INTEGER },
                                    title: { type: genai_1.Type.STRING },
                                    subtopics: {
                                        type: genai_1.Type.ARRAY,
                                        items: { type: genai_1.Type.STRING }
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        res.json({ subPlan: parsedData.subPlan });
    }
    catch (error) {
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
app.get('/api/challenges/generate', authMiddleware_1.auth, async (req, res) => {
    try {
        const topic = req.query.topic || 'javascript';
        const githubRes = await fetch(`https://api.github.com/search/issues?q=label:"good first issue"+state:open+${encodeURIComponent(topic)}&sort=created&order=desc&per_page=3`, {
            headers: { 'User-Agent': 'AI-Learning-Platform' }
        });
        const githubData = await githubRes.json();
        if (!githubData.items || githubData.items.length === 0) {
            return res.json({ challenges: [] });
        }
        const issues = githubData.items.map((item) => ({
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const parsedData = JSON.parse(aiResultText);
        res.json({ challenges: parsedData.challenges });
    }
    catch (error) {
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
app.post('/api/flashcards/generate', authMiddleware_1.auth, async (req, res) => {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        flashcards: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    front: { type: genai_1.Type.STRING },
                                    back: { type: genai_1.Type.STRING }
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
        if (!aiResultText)
            throw new Error("No response payload from AI engine");
        const cleanJsonText = aiResultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        const parsedData = JSON.parse(cleanJsonText);
        const newFlashcards = parsedData.flashcards.map((f) => ({
            userId: req.user?.id,
            roadmapId,
            dayNumber,
            front: f.front,
            back: f.back
        }));
        await Flashcard_1.default.insertMany(newFlashcards);
        res.json({ message: 'Flashcards generated successfully' });
    }
    catch (error) {
        console.error("Flashcard Gen Error: ", error);
        if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            const mockFlashcards = [
                { front: "What is an API rate limit?", back: "A restriction on the number of requests a user can make to an API within a given timeframe." },
                { front: "What is a 429 status code?", back: "Too Many Requests" }
            ];
            const newFlashcards = mockFlashcards.map((f) => ({
                userId: req.user?.id,
                roadmapId: req.body.roadmapId,
                dayNumber: req.body.dayNumber,
                front: f.front,
                back: f.back
            }));
            await Flashcard_1.default.insertMany(newFlashcards);
            return res.json({ message: 'Mock flashcards generated due to rate limits', isFallback: true });
        }
        res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
    }
});
app.get('/api/flashcards/:roadmapId/:dayNumber', authMiddleware_1.auth, async (req, res) => {
    try {
        const { roadmapId, dayNumber } = req.params;
        const now = new Date();
        // Fetch flashcards for this user/roadmap/day that are due for review (or never reviewed)
        const cards = await Flashcard_1.default.find({
            userId: req.user?.id,
            roadmapId,
            dayNumber,
            nextReviewDate: { $lte: now }
        });
        res.json(cards);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch flashcards', details: error.message });
    }
});
app.put('/api/flashcards/:id/review', authMiddleware_1.auth, async (req, res) => {
    try {
        const { rating } = req.body; // 0 to 5
        const card = await Flashcard_1.default.findOne({ _id: req.params.id, userId: req.user?.id });
        if (!card)
            return res.status(404).json({ error: 'Flashcard not found' });
        // SM-2 Algorithm Implementation
        let { interval, repetition, efactor } = card;
        if (rating >= 3) {
            if (repetition === 0) {
                interval = 1;
            }
            else if (repetition === 1) {
                interval = 6;
            }
            else {
                interval = Math.round(interval * efactor);
            }
            repetition += 1;
        }
        else {
            repetition = 0;
            interval = 1;
        }
        efactor = efactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        if (efactor < 1.3)
            efactor = 1.3;
        card.interval = interval;
        card.repetition = repetition;
        card.efactor = efactor;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);
        card.nextReviewDate = nextReview;
        await card.save();
        res.json(card);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to review flashcard', details: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
