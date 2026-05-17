import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Analytics from './components/Analytics';
import Timer from './components/Timer';
import Flashcards from './components/Flashcards';
import Leaderboard from './components/Leaderboard';
import CodePlayground from './components/CodePlayground';
import MindMap from './components/MindMap';
import WorkshopChallenges from './components/WorkshopChallenges';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('theme') as 'light'|'dark' || 'dark');

  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [capstoneProject, setCapstoneProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<any[]>([]);
  
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [quizResults, setQuizResults] = useState<{ [key: string]: boolean }>({});
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState<{ [key: number]: boolean }>({});
  const [activeModal, setActiveModal] = useState<number | null>(null);
  const [activePlayground, setActivePlayground] = useState<string | null>(null);
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [deepDives, setDeepDives] = useState<{ [key: string]: any[] }>({});
  const [loadingDeepDive, setLoadingDeepDive] = useState<{ [key: string]: boolean }>({});
  
  const [completedConcepts, setCompletedConcepts] = useState<{ [key: string]: boolean }>(() => {
    try {
      return JSON.parse(localStorage.getItem('completedConcepts') || '{}');
    } catch {
      return {};
    }
  });

  const [activeExplanation, setActiveExplanation] = useState<{ concept: string, analogy: string, loading: boolean } | null>(null);
  
  // Notebook State
  const [studyNotes, setStudyNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Advanced Features State
  const [analyticsKey, setAnalyticsKey] = useState(0); // To force Analytics re-render
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    if (token) {
      fetch('http://localhost:5002/api/user/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setIsPublicProfile(data.isPublic !== false);
        setUsername(data.username || '');
        setNewUsername(data.username || '');
      })
      .catch(console.error);
    }
  }, [token]);

  const saveUsername = async () => {
    if (!token || !newUsername.trim()) return;
    try {
      const res = await fetch('http://localhost:5002/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      if (res.ok) {
        setUsername(newUsername.trim());
        setIsEditingUsername(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update username');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePrivacy = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5002/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isPublic: !isPublicProfile })
      });
      if (res.ok) {
        setIsPublicProfile(!isPublicProfile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [chatDrawer, setChatDrawer] = useState<{ isOpen: boolean, dayNumber: number, title: string, messages: {role: 'user'|'ai', text: string}[], input: string, loading: boolean }>({
    isOpen: false, dayNumber: 0, title: '', messages: [], input: '', loading: false
  });

  useEffect(() => {
    if (chatDrawer.isOpen && token && activeRoadmapId) {
      const loadChatHistory = async () => {
        try {
          const response = await fetch(`http://localhost:5002/api/chat/history/${activeRoadmapId}/${chatDrawer.dayNumber}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            const formatted = data.map((msg: any) => ({
              role: msg.sender === 'user' ? 'user' : 'ai',
              text: msg.text
            }));
            setChatDrawer(prev => ({ ...prev, messages: formatted }));
          }
        } catch (e) {
          console.error("Failed to load chat history:", e);
        }
      };
      loadChatHistory();
    }
  }, [chatDrawer.isOpen, chatDrawer.dayNumber, activeRoadmapId, token]);

  const [pivotModal, setPivotModal] = useState<{ isOpen: boolean, feedback: string, completedDays: number, loading: boolean }>({
    isOpen: false, feedback: '', completedDays: 0, loading: false
  });

  const [flashcardsModal, setFlashcardsModal] = useState<{
    isOpen: boolean;
    dayNumber: number;
    concepts: Array<{ concept: string; summary: string }>;
  }>({
    isOpen: false,
    dayNumber: 0,
    concepts: []
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchSavedRoadmaps();
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    const confirmLogout = window.confirm("Do you really want to log out?");
    if (confirmLogout) {
      setToken(null);
      setSavedRoadmaps([]);
      setActiveRoadmapId(null);
      setRoadmap([]);
      setGoal('');
    }
  };



  const generateDeepDive = async (subtopic: string, dayIdx: number, subIdx: number) => {
    if (!token || !activeRoadmapId) return;
    const key = `${activeRoadmapId}-${dayIdx}-${subIdx}`;
    
    if (deepDives[key]) {
      const newDives = { ...deepDives };
      delete newDives[key];
      setDeepDives(newDives);
      return;
    }

    try {
      setLoadingDeepDive(prev => ({ ...prev, [key]: true }));
      const res = await fetch(`http://localhost:5002/api/roadmaps/${activeRoadmapId}/deep-dive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subtopic })
      });
      const data = await res.json();
      if (res.ok) {
        setDeepDives(prev => ({ ...prev, [key]: data.subPlan }));
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error generating deep dive: ${e.message}`);
    } finally {
      setLoadingDeepDive(prev => ({ ...prev, [key]: false }));
    }
  };

  const syncActivity = async (actionType: 'completed_milestone' | 'completed_quiz', score?: number, totalCompleted?: number) => {
    if (!token) return;
    try {
      await fetch('http://localhost:5002/api/user/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ actionType, score, totalCompleted })
      });
      setAnalyticsKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSavedRoadmaps = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5002/api/roadmaps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedRoadmaps(data);
      } else if (res.status === 401) {
        setToken(null); // Auto logout on invalid token
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const loadRoadmap = async (id: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5002/api/roadmaps/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load roadmap");
      const data = await res.json();
      
      setActiveRoadmapId(data._id);
      setGoal(data.goal);
      setRoadmap(data.roadmap || []);
      setCapstoneProject(data.capstoneProject || null);
      setStudyNotes(data.notes || '');
      setQuizResults({});
      setSelectedAnswers({});
      setActiveModal(null);
      setNotesSaveStatus('idle');
    } catch (error) {
      console.error("Error loading roadmap:", error);
      alert("Error loading this saved roadmap.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoadmap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this roadmap?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5002/api/roadmaps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete roadmap");
      
      if (activeRoadmapId === id) {
        setActiveRoadmapId(null);
        setRoadmap([]);
        setGoal('');
      }
      fetchSavedRoadmaps();
    } catch (error) {
      console.error(error);
      alert("Error deleting roadmap");
    }
  };

  const generateRoadmap = async () => {
    if (!goal) {
      alert('Please enter a goal');
      return;
    }
    if (!token) return;

    try {
      setLoading(true);
      setQuizResults({});
      setSelectedAnswers({});
      setActiveModal(null);
      setRoadmap([]);
      setCapstoneProject(null);
      setStudyNotes('');
      setActiveRoadmapId(null);
      setNotesSaveStatus('idle');
      
      const response = await fetch('http://localhost:5002/api/generate-roadmap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) setToken(null);
        console.error('Server error details:', data);
        alert(`Error from server: ${data.error} \nDetails: ${data.details || 'Unknown error'}`);
        return;
      }

      setRoadmap(data.roadmap || []);
      setCapstoneProject(data.capstoneProject || null);
      setActiveRoadmapId(data._id);
      setStudyNotes(data.notes || '');
      
      fetchSavedRoadmaps();
    } catch (error: any) {
      console.error('Fetch error:', error);
      alert(`Network or Server Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!activeRoadmapId || !token) return;
    try {
      setIsSavingNotes(true);
      const response = await fetch(`http://localhost:5002/api/roadmaps/${activeRoadmapId}/notes`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: studyNotes }),
      });

      if (!response.ok) {
        if (response.status === 401) setToken(null);
        throw new Error('Failed to save notes');
      }
      
      setNotesSaveStatus('success');
      setTimeout(() => setNotesSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Notes save error:', error);
      setNotesSaveStatus('error');
      setTimeout(() => setNotesSaveStatus('idle'), 3000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleOptionSelect = (dayIndex: number, questionIndex: number, option: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [`${dayIndex}-${questionIndex}`]: option
    });
  };

  const checkAnswer = (dayIndex: number, questionIndex: number, correctAnswer: string) => {
    const key = `${dayIndex}-${questionIndex}`;
    const isCorrect = selectedAnswers[key] === correctAnswer;
    setQuizResults({
      ...quizResults,
      [key]: isCorrect
    });

    // Determine current score for this quiz to send to Analytics
    const prefix = `${dayIndex}-`;
    let score = 0;
    Object.entries(quizResults).forEach(([k, isCorr]) => {
      if (k.startsWith(prefix) && isCorr) score += 1;
    });
    if (isCorrect) score += 1; // Add the current one since state hasn't updated yet

    // Just fire activity sync on checking answer
    syncActivity('completed_quiz', score);
  };

  const handleGenerateMoreQuestions = async (dayIndex: number, topic: string) => {
    try {
      setLoadingMoreQuestions({ ...loadingMoreQuestions, [dayIndex]: true });
      
      const response = await fetch('http://localhost:5002/api/generate-more-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, day: dayIndex + 1 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch additional questions');
      }
      
      if (data.questions) {
        setRoadmap((prevRoadmap) => {
          const newRoadmap = [...prevRoadmap];
          newRoadmap[dayIndex].quiz = [...newRoadmap[dayIndex].quiz, ...data.questions];
          return newRoadmap;
        });
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoadingMoreQuestions({ ...loadingMoreQuestions, [dayIndex]: false });
    }
  };

  const toggleConcept = (dayIdx: number, conceptIdx: number) => {
    if (!activeRoadmapId) return;
    const key = `${activeRoadmapId}-day-${dayIdx}-concept-${conceptIdx}`;
    setCompletedConcepts(prev => {
      const isCurrentlyCompleted = !!prev[key];
      const next = { ...prev, [key]: !isCurrentlyCompleted };
      localStorage.setItem('completedConcepts', JSON.stringify(next));
      
      let total = 0;
      Object.keys(next).forEach(k => {
        if (k.includes('-day-concept-') && next[k]) {
          total++;
        }
      });
      syncActivity('completed_milestone', !isCurrentlyCompleted ? 50 : -50, total);
      
      return next;
    });
  };

  const fetchExplanation = async (concept: string, contextTopic: string) => {
    setActiveExplanation({ concept, analogy: '', loading: true });
    try {
      const response = await fetch('http://localhost:5002/api/explain-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, contextTopic })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to explain');
      setActiveExplanation({ concept, analogy: data.analogy, loading: false });
    } catch (error: any) {
      setActiveExplanation({ concept, analogy: `Error: ${error.message}`, loading: false });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDrawer.input.trim() || !token || !activeRoadmapId) return;

    const userMsg = chatDrawer.input;
    setChatDrawer(prev => ({ 
      ...prev, 
      input: '', 
      loading: true, 
      messages: [...prev.messages, { role: 'user', text: userMsg }] 
    }));

    try {
      const response = await fetch('http://localhost:5002/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          roadmapId: activeRoadmapId,
          dayNumber: chatDrawer.dayNumber,
          milestoneTitle: chatDrawer.title,
          message: userMsg
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chat failed');

      setChatDrawer(prev => ({ 
        ...prev, 
        loading: false, 
        messages: [...prev.messages, { role: 'ai', text: data.reply }] 
      }));
    } catch (err) {
      console.error(err);
      setChatDrawer(prev => ({ 
        ...prev, 
        loading: false, 
        messages: [...prev.messages, { role: 'ai', text: "Sorry, I couldn't process that right now." }] 
      }));
    }
  };

  const handlePivotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRoadmapId) return;

    setPivotModal(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`http://localhost:5002/api/roadmaps/${activeRoadmapId}/pivot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          feedback: pivotModal.feedback,
          completedDaysIndex: pivotModal.completedDays
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pivot failed');

      setRoadmap(data.roadmap);
      setPivotModal(prev => ({ ...prev, isOpen: false, feedback: '', loading: false }));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setPivotModal(prev => ({ ...prev, loading: false }));
    }
  };

  const openPivotModal = () => {
    // Determine last completed day based on checked concepts
    let lastCompletedDay = 0;
    for (let i = 0; i < roadmap.length; i++) {
      const dayConcepts = roadmap[i].subtopics || [];
      const allCompleted = dayConcepts.length > 0 && dayConcepts.every((_: any, idx: number) => {
        return !!completedConcepts[`${activeRoadmapId}-day-${i}-concept-${idx}`];
      });
      if (allCompleted) {
        lastCompletedDay = i + 1;
      } else {
        break;
      }
    }
    setPivotModal({ isOpen: true, feedback: '', completedDays: lastCompletedDay, loading: false });
  };

  const generateICS = () => {
    if (!roadmap || roadmap.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Learning Platform//EN\n";
    
    roadmap.forEach((item, index) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + index);
      const startDateStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `DTSTART:${startDateStr}\n`;
      icsContent += `DTEND:${endDateStr}\n`;
      icsContent += `SUMMARY:Day ${item.day}: ${item.title}\n`;
      icsContent += `DESCRIPTION:Topics: ${item.subtopics?.join(', ')}\n`;
      icsContent += `END:VEVENT\n`;
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "study_roadmap.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCertificate = async () => {
    if (!token || !activeRoadmapId) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5002/api/roadmaps/${activeRoadmapId}/certificate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to download certificate');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${activeRoadmapId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Error downloading certificate: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'Video Tutorial': return '🎥';
      case 'Official Documentation': return '📚';
      case 'Interactive Website': return '💻';
      case 'Article': return '📝';
      default: return '🔗';
    }
  };

  const getRunningScore = (dayIndex: number) => {
    let score = 0;
    const prefix = `${dayIndex}-`;
    Object.entries(quizResults).forEach(([key, isCorrect]) => {
      if (key.startsWith(prefix) && isCorrect) score += 1;
    });
    return score;
  };

  const totalQuestionsAttempted = (dayIndex: number) => {
    const prefix = `${dayIndex}-`;
    return Object.keys(quizResults).filter(key => key.startsWith(prefix)).length;
  };

  const totalConcepts = roadmap.reduce((acc, day) => acc + (day.subtopics ? day.subtopics.length : 0), 0);
  const completedCount = Object.keys(completedConcepts).filter(key => {
    if (activeRoadmapId && completedConcepts[key] && key.startsWith(`${activeRoadmapId}-day-`)) {
      const parts = key.split('-');
      const dIdx = parseInt(parts[2], 10);
      const cIdx = parseInt(parts[4], 10);
      if (roadmap[dIdx] && roadmap[dIdx].subtopics && roadmap[dIdx].subtopics[cIdx]) return true;
    }
    return false;
  }).length;
  const progressPercentage = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-50 font-sans selection:bg-indigo-500/30 flex flex-col pt-12 transition-colors">
        <div className="absolute top-4 right-6">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            AI Micro-Learning Platform
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">Secure your personal study curriculums</p>
        </div>
        {authMode === 'login' ? (
          <Login onLogin={(t) => setToken(t)} onSwitchToSignup={() => setAuthMode('signup')} />
        ) : (
          <Signup onLogin={(t) => setToken(t)} onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-50 flex font-sans selection:bg-indigo-500/30 overflow-x-hidden transition-colors relative">
      
      {/* Collapsible Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-zinc-800/80 shadow-2xl shadow-slate-300/30 dark:shadow-zinc-900/50 rounded-r-2xl flex flex-col h-screen transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 flex justify-between items-center bg-slate-50 dark:bg-[#121212] rounded-tr-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Menu</h2>
            <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1">Options & History</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-2">✕</button>
        </div>
        
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800/80 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Username</span>
              {!isEditingUsername && (
                <button 
                  onClick={() => setIsEditingUsername(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingUsername ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.trim().toLowerCase())}
                  className="flex-1 px-2 py-1.5 text-sm rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="New username"
                />
                <button onClick={saveUsername} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors">Save</button>
                <button onClick={() => { setIsEditingUsername(false); setNewUsername(username); }} className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-300 rounded-md font-medium transition-colors">Cancel</button>
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-md border border-slate-200 dark:border-zinc-800/80 break-all">
                {username || 'Anonymous User'}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-100/10 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Theme</span>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-100/10 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Profile Visibility</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isPublicProfile} onChange={togglePrivacy} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Saved Roadmaps</h3>
          {savedRoadmaps.map((item) => (
            <div key={item._id} className="relative group">
              <button
                onClick={() => loadRoadmap(item._id)}
                className={`w-full text-left px-4 py-3 rounded-md transition-all border pr-10 ${
                  activeRoadmapId === item._id 
                  ? 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-medium' 
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-300'
                }`}
              >
                <div className="truncate text-sm">{item.goal}</div>
                <div className="text-xs text-slate-400 dark:text-zinc-600 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
              </button>
              <button
                onClick={(e) => handleDeleteRoadmap(item._id, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700 transition-opacity"
                title="Delete Roadmap"
              >
                🗑️
              </button>
            </div>
          ))}
          {savedRoadmaps.length === 0 && (
            <div className="text-slate-400 dark:text-zinc-600 text-sm p-2 text-center mt-4">
              No saved roadmaps yet.
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800/80">
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium rounded-md transition-colors text-sm flex justify-center items-center gap-2"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 transition-all duration-300 flex flex-col items-center p-6 lg:p-10 w-full overflow-y-auto h-screen relative">
        
        {/* Top Header Global Navigation & Sidebar Trigger */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            title="Open Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          
          <button 
            onClick={() => {
              setActiveRoadmapId(null);
              setRoadmap([]);
              setGoal('');
            }}
            className="flex items-center gap-2 font-bold text-lg tracking-tight text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            🏠 Home
          </button>
        </div>

        <div className="max-w-5xl w-full space-y-12 md:space-y-16 text-center mt-12">
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-zinc-100 dark:to-zinc-500 pb-2">
            AI Micro-Learning Platform
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-md max-w-xl mx-auto -mt-4">
            {activeRoadmapId ? 'Viewing saved learning curriculum.' : 'Enter any topic and duration to dynamically generate an interactive study curriculum powered by real-time AI.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 relative">
            <div className="relative w-full max-w-md group">
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-700 focus:ring-4 focus:ring-slate-100 dark:focus:ring-zinc-800/50 shadow-sm transition-all"
                placeholder="e.g., Learn Rust in 5 days"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <button
              onClick={generateRoadmap}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200 shadow-md transition-all font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Consulting AI Engine...' : 'Generate New Course'}
            </button>
          </div>

          {(!activeRoadmapId && roadmap.length === 0) && (
            <div className="flex flex-col gap-12 text-left items-stretch w-full">
              <Analytics token={token} key={`analytics-${analyticsKey}`} />
              <Leaderboard token={token} currentUsername={username} key={`leaderboard-${analyticsKey}`} />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:justify-end items-center gap-4 mb-2 mt-6">
            {roadmap.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsMindMapOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-400 text-sm font-medium rounded-md transition-colors"
                >
                  <span>🧠</span> Mind Map
                </button>
                <button
                  onClick={() => setIsWorkshopOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-400 text-sm font-medium rounded-md transition-colors"
                >
                  <span>🌐</span> Live Challenges
                </button>
                <button
                  onClick={openPivotModal}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-400 text-sm font-medium rounded-md transition-colors"
                >
                  <span>🔄</span> Pivot My Plan
                </button>
                <button
                  onClick={generateICS}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium rounded-md transition-colors"
                >
                  <span>📅</span> Sync Calendar
                </button>
              </div>
            )}
          </div>

          {/* Global Progress Dashboard */}
          {roadmap.length > 0 && (
            <div className="mt-8 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-xl p-5 md:p-6 text-left shadow-lg transition-colors">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Course Completion</h2>
                <div className="flex items-center gap-4">
                  {progressPercentage === 100 && (
                    <button
                      onClick={downloadCertificate}
                      className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-md text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      🎓 Get Certificate
                    </button>
                  )}
                  <span className="text-slate-500 dark:text-zinc-400 font-medium text-sm">
                    {progressPercentage}% <span className="text-slate-400 dark:text-zinc-500 ml-1">({completedCount}/{totalConcepts})</span>
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-zinc-100 transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="mt-12 space-y-8 text-left">
            {roadmap && roadmap.map((item, dayIdx) => (
              <div key={dayIdx} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-xl p-6 space-y-6 relative transition-colors shadow-sm">
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      Day {item.day} Plan Milestone
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-3">{item.title}</h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setChatDrawer({ isOpen: true, dayNumber: item.day, title: item.title, messages: [], input: '', loading: false })}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <span>💬</span> Ask AI Study Buddy
                    </button>
                    <button
                      onClick={() => setFlashcardsModal({ isOpen: true, dayNumber: item.day, concepts: (item.subtopics || []).map((st: string) => ({ concept: st, summary: '' })) })}
                      className="px-4 py-2 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <span>📇</span> AI Flashcards
                    </button>
                  </div>
                </div>

                {/* Subtopics */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">🎯 Core Concepts to Master</h3>
                  <div className="flex flex-wrap gap-2.5 items-center mt-2">
                    {item.subtopics && item.subtopics.map((subtopic: string, subIdx: number) => {
                      const conceptKey = `${activeRoadmapId}-day-${dayIdx}-concept-${subIdx}`;
                      const isCompleted = completedConcepts[conceptKey];
                      return (
                        <div key={subIdx} className="flex flex-col gap-1 w-full max-w-full">
                          <div className="inline-flex items-center gap-1.5 self-start">
                            <div 
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                            >
                              <input 
                                type="checkbox" 
                                checked={!!isCompleted}
                                onChange={() => toggleConcept(dayIdx, subIdx)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-zinc-100 focus:ring-indigo-500 dark:focus:ring-zinc-500 cursor-pointer"
                              />
                              <span className={`text-sm transition-all select-text ${isCompleted ? 'line-through opacity-40 text-slate-500 dark:text-zinc-500' : 'text-slate-700 dark:text-zinc-300'}`}>
                                {subtopic}
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => generateDeepDive(subtopic, dayIdx, subIdx)}
                                className="p-1.5 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
                                title="Generate Deep Dive Micro-Roadmap"
                              >
                                🔍
                              </button>
                              <button
                                onClick={() => fetchExplanation(subtopic, item.title)}
                                className="p-1.5 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
                                title="Explain Like I'm 5"
                              >
                                💡
                              </button>
                              <button
                                onClick={() => setActivePlayground(subtopic)}
                                className="p-1.5 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center"
                                title="Open Code Sandbox"
                              >
                                💻
                              </button>
                            </div>
                          </div>
                          
                          {/* Deep Dive Accordion */}
                          {loadingDeepDive[`${activeRoadmapId}-${dayIdx}-${subIdx}`] && (
                            <div className="ml-8 mt-1 mb-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 animate-pulse flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                              Generating 3-hour micro-course via AI...
                            </div>
                          )}
                          {deepDives[`${activeRoadmapId}-${dayIdx}-${subIdx}`] && (
                            <div className="ml-8 mt-1 mb-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/50 space-y-2 max-w-2xl">
                              {deepDives[`${activeRoadmapId}-${dayIdx}-${subIdx}`].map((dd: any, dIdx: number) => (
                                <div key={dIdx} className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-md border border-slate-100 dark:border-zinc-800 shadow-sm">
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-2">{dd.title}</h4>
                                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-zinc-400 space-y-1">
                                    {dd.subtopics.map((ddSub: string, ddSubIdx: number) => (
                                      <li key={ddSubIdx}>{ddSub}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resources */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">📚 Curated Resources</h3>
                  <ul className="space-y-2">
                    {item.resources && item.resources.map((resource: any, resIdx: number) => (
                      <li key={resIdx} className="flex items-start gap-3 bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800/40 hover:border-slate-300 dark:hover:border-zinc-700/60 transition-colors">
                        <span className="text-xl" aria-hidden="true" title={resource.type}>{getResourceIcon(resource.type)}</span>
                        <div className="flex-1">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium hover:underline text-sm md:text-base">
                            {resource.name}
                          </a>
                          <span className="block text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{resource.type}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <button
                      onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " tutorial")}`, '_blank')}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-md transition-all border border-slate-300 dark:border-zinc-800 flex items-center justify-center gap-2 text-sm"
                    >
                      <span>🔍</span> Find Video Tutorials on YouTube
                    </button>
                  </div>
                </div>

                {/* Interactive Quiz Launcher */}
                <div className="border-t border-slate-200 dark:border-zinc-800/60 pt-6 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">📝 Knowledge Evaluation</h3>
                  <button
                    onClick={() => setActiveModal(dayIdx)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-md transition-all border border-slate-300 dark:border-zinc-800 flex items-center justify-center gap-2"
                  >
                    <span>📝</span> Take Day {item.day} Quiz
                  </button>
                </div>

              </div>
            ))}

            {/* Capstone Project Panel */}
            {capstoneProject && (
              <div className="mt-12 bg-gradient-to-br from-slate-50 to-white dark:from-[#161616] dark:to-[#0a0a0a] border border-slate-200 dark:border-zinc-700/80 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5 text-8xl pointer-events-none">🎓</div>
                <div className="relative z-10">
                  <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-md bg-indigo-100 dark:bg-zinc-100 text-indigo-800 dark:text-zinc-950 border border-indigo-200 dark:border-zinc-300">
                    Capstone Portfolio Milestone
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-zinc-100 mt-4 mb-3">{capstoneProject.title}</h2>
                  <p className="text-slate-600 dark:text-zinc-300 text-base mb-8 leading-relaxed">{capstoneProject.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-zinc-900/50 p-5 rounded-lg border border-slate-200 dark:border-zinc-800/50">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-4">🛠️ Project Scope</h3>
                      <ul className="space-y-3">
                        {capstoneProject.projectScope && capstoneProject.projectScope.map((scopeItem: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-zinc-300 text-sm">
                            <span className="text-slate-400 dark:text-zinc-500 mt-0.5">•</span>
                            <span className="leading-relaxed">{scopeItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/50 p-5 rounded-lg border border-slate-200 dark:border-zinc-800/50">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-4">✅ Success Criteria</h3>
                      <ul className="space-y-3">
                        {capstoneProject.successCriteria && capstoneProject.successCriteria.map((criteria: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-zinc-300 text-sm">
                            <span className="text-emerald-500 dark:text-zinc-400 mt-0.5">✓</span>
                            <span className="leading-relaxed">{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notebook / Study Journal Section */}
            {activeRoadmapId && (
              <div className="mt-12 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-xl p-6 md:p-8 shadow-xl flex flex-col min-h-[400px] transition-colors">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>📋</span> Study Journal
                    </h2>
                    <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1">Independent notes specific to this roadmap</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {notesSaveStatus === 'success' && <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-pulse">Notes saved successfully!</span>}
                    {notesSaveStatus === 'error' && <span className="text-red-600 dark:text-red-400 text-sm font-medium">Failed to save!</span>}
                    <button
                      onClick={saveNotes}
                      disabled={isSavingNotes}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-md transition-colors"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <textarea
                    value={studyNotes}
                    onChange={(e) => setStudyNotes(e.target.value)}
                    placeholder="Jot down notes, scratchpad code, or ideas as you study. Click Save to persist to database..."
                    className="w-full h-full min-h-[300px] bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800/80 rounded-lg text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 resize-y focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 p-4 font-mono text-sm leading-relaxed transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ELI5 Explanation Modal */}
      {activeExplanation && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl relative transition-colors">
            <button
              onClick={() => setActiveExplanation(null)}
              className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
            >
              ❌
            </button>
            <div className="pr-8 mb-4">
              <span className="px-2 py-1 text-xs font-semibold tracking-wider uppercase rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 mb-2 inline-block">
                Explain Like I'm 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{activeExplanation.concept}</h2>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-lg transition-colors">
              {activeExplanation.loading ? (
                <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400 font-medium">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Formulating simple analogy...
                </div>
              ) : (
                <p className="text-slate-700 dark:text-zinc-200 text-base leading-relaxed">
                  {activeExplanation.analogy}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#121212] border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${chatDrawer.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-[#161616]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2"><span>💬</span> AI Study Buddy</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Day {chatDrawer.dayNumber}: {chatDrawer.title}</p>
          </div>
          <button onClick={() => setChatDrawer(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300">❌</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0a0a0a]">
          {chatDrawer.messages.length === 0 && (
            <div className="text-center text-sm text-slate-500 dark:text-zinc-500 mt-10">
              Ask me anything about this milestone! I'm here to help.
            </div>
          )}
          {chatDrawer.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatDrawer.loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 p-3 rounded-lg rounded-tl-none text-sm flex gap-2 items-center">
                <span className="animate-pulse">●</span><span className="animate-pulse delay-75">●</span><span className="animate-pulse delay-150">●</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={chatDrawer.input}
              onChange={(e) => setChatDrawer(prev => ({ ...prev, input: e.target.value }))}
              placeholder="Type your question..."
              className="flex-1 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500"
            />
            <button 
              type="submit" 
              disabled={chatDrawer.loading || !chatDrawer.input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Pivot Modal */}
      {pivotModal.isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl relative transition-colors">
            <button onClick={() => setPivotModal(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500">❌</button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">🔄 Pivot My Plan</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">You've completed {pivotModal.completedDays} day(s). Tell AI how to adjust the rest of your course.</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {["Speed it up", "Make it easier", "More project-based", "Focus on theory"].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setPivotModal(prev => ({ ...prev, feedback: opt }))}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>

            <form onSubmit={handlePivotSubmit}>
              <textarea 
                className="w-full h-24 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md p-3 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 mb-4 resize-none"
                placeholder="Or type custom instructions..."
                value={pivotModal.feedback}
                onChange={(e) => setPivotModal(prev => ({ ...prev, feedback: e.target.value }))}
              />
              <button 
                type="submit" 
                disabled={pivotModal.loading || !pivotModal.feedback.trim()}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-md text-sm font-bold transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {pivotModal.loading ? (
                  <><span className="animate-spin text-lg">⏳</span> Regenerating...</>
                ) : 'Regenerate Remaining Days'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Modal Overlay */}
      {activeModal !== null && roadmap[activeModal] && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-[#0a0a0a]/95 overflow-y-auto p-4 md:p-8 flex justify-center backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-xl p-6 md:p-10 min-h-[90vh] transition-colors">
            
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800/80 pb-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Day {roadmap[activeModal].day} Quiz: {roadmap[activeModal].title}
                </h2>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 text-sm font-medium">
                    Current Score: <span className="text-indigo-600 dark:text-zinc-100 font-bold">{getRunningScore(activeModal)}</span> / {totalQuestionsAttempted(activeModal)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 px-4 py-2 rounded-md transition-colors font-medium flex-shrink-0"
                aria-label="Close modal"
              >
                ❌ Close Quiz
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {roadmap[activeModal].quiz && roadmap[activeModal].quiz.map((q: any, qIdx: number) => {
                const itemKey = `${activeModal}-${qIdx}`;
                return (
                  <div key={qIdx} className="w-full bg-slate-50 dark:bg-zinc-950/40 p-5 rounded-lg border border-slate-200 dark:border-zinc-800/50 space-y-4 transition-colors">
                    <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-zinc-200">
                      <span className="text-slate-400 dark:text-zinc-400 font-bold mr-2">Q{qIdx + 1}.</span>
                      {q.question}
                    </p>
                    
                    <div className="flex flex-col gap-2 w-full">
                      {q.options.map((opt: string, optIdx: number) => (
                        <button
                          key={optIdx}
                          onClick={() => handleOptionSelect(activeModal, qIdx, opt)}
                          className={`w-full text-left block py-3 px-4 rounded-md border transition-all ${
                            selectedAnswers[itemKey] === opt
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-200 font-medium'
                              : 'bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={() => checkAnswer(activeModal, qIdx, q.answer)}
                        disabled={!selectedAnswers[itemKey]}
                        className="px-5 py-2 bg-indigo-600 dark:bg-zinc-800 hover:bg-indigo-500 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-zinc-200 font-medium rounded-md transition-all border border-transparent dark:border-zinc-700"
                      >
                        Verify Answer
                      </button>

                      {quizResults[itemKey] !== undefined && (
                        <div className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${quizResults[itemKey] ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900'}`}>
                          {quizResults[itemKey] ? '✅ Correct' : '❌ Incorrect'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-8 flex justify-center pb-4 border-t border-slate-200 dark:border-zinc-800/80">
                <button
                  onClick={() => handleGenerateMoreQuestions(activeModal, roadmap[activeModal].title)}
                  disabled={loadingMoreQuestions[activeModal]}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 disabled:opacity-50 text-slate-700 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700 font-medium rounded-md transition-all flex items-center gap-3"
                >
                  {loadingMoreQuestions[activeModal] ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-400 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Deep-Dive...
                    </>
                  ) : '✨ Request Deep-Dive Questions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Close the min-h-screen root div */}
    </div>

    {activePlayground && (
      <CodePlayground 
        topic={activePlayground} 
        onClose={() => setActivePlayground(null)} 
      />
    )}

    {isMindMapOpen && (
      <MindMap
        token={token}
        topic={goal}
        context={roadmap.map(r => r.title).join(', ')}
        onClose={() => setIsMindMapOpen(false)}
      />
    )}

    {isWorkshopOpen && (
      <WorkshopChallenges
        token={token}
        topic={goal}
        onClose={() => setIsWorkshopOpen(false)}
      />
    )}

    {flashcardsModal.isOpen && activeRoadmapId && (
      <Flashcards 
        token={token} 
        roadmapId={activeRoadmapId} 
        dayNumber={flashcardsModal.dayNumber} 
        concepts={flashcardsModal.concepts}
        onClose={() => setFlashcardsModal({ ...flashcardsModal, isOpen: false })} 
      />
    )}
    
    <Timer token={token} />
    </>
  );
}

export default App;