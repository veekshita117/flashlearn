import React, { useState, useEffect } from 'react';

interface TimerProps {
  token: string | null;
}

const Timer: React.FC<TimerProps> = ({ token }) => {
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [alarmAudio, setAlarmAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.src = '';
      }
    };
  }, [isActive, timeLeft, alarmAudio]);

  const stopAlarm = () => {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      setAlarmAudio(null);
    }
    setIsRinging(false);
  };

  const handleSessionComplete = async () => {
    // Play audio alarm
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.loop = true;
      await audio.play();
      setAlarmAudio(audio);
      setIsRinging(true);
    } catch (e) {
      console.error("Audio play failed", e);
    }

    // If we just finished a focus session, ping backend
    if (!isBreak && token) {
      try {
        await fetch('http://localhost:5002/api/user/time', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ minutes: focusDuration })
        });
      } catch (err) {
        console.error("Failed to sync study time", err);
      }
      
      // Auto switch to break
      setIsBreak(true);
      setTimeLeft(breakDuration * 60);
    } else {
      // Auto switch to focus
      setIsBreak(false);
      setTimeLeft(focusDuration * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? breakDuration * 60 : focusDuration * 60);
    stopAlarm();
  };

  const switchMode = () => {
    setIsActive(false);
    setIsBreak(!isBreak);
    setTimeLeft(!isBreak ? breakDuration * 60 : focusDuration * 60);
    stopAlarm();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        ⏱️ {formatTime(timeLeft)}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-64 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl transition-colors overflow-hidden">
      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-zinc-800">
        <span className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400">
          {isBreak ? '☕ Break Time' : '🧠 Focus Mode'}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200" title="Settings">
            ⚙️
          </button>
          <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200" title="Minimize">
            ▼
          </button>
        </div>
      </div>
      
      {isSettingsOpen && (
        <div className="p-4 text-left border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#1a1a1a]">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">Focus ({focusDuration} min)</label>
            <input 
              type="range" min="1" max="300" value={focusDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setFocusDuration(val);
                if (!isBreak) setTimeLeft(val * 60);
              }}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">Break ({breakDuration} min)</label>
            <input 
              type="range" min="1" max="30" value={breakDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setBreakDuration(val);
                if (isBreak) setTimeLeft(val * 60);
              }}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      )}

      <div className="p-5 text-center">
        {isRinging && (
          <div className="mb-4 animate-bounce">
            <button
              onClick={stopAlarm}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-md shadow-lg shadow-red-500/30 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
            >
              <span>🔔</span> Stop Alarm
            </button>
          </div>
        )}

        <div className="text-5xl font-mono font-bold text-slate-800 dark:text-zinc-100 mb-4 tracking-tighter">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={toggleTimer}
            className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive 
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500'
                : 'bg-indigo-600 text-white dark:bg-indigo-500'
            }`}
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={resetTimer}
            className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-md text-sm transition-colors"
          >
            ↺
          </button>
        </div>
        
        <button 
          onClick={switchMode}
          className="text-xs text-slate-500 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline"
        >
          Switch to {isBreak ? 'Focus' : 'Break'}
        </button>
      </div>
    </div>
  );
};

export default Timer;
