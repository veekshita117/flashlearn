import React, { useState, useEffect } from 'react';

interface FlashcardsProps {
  token: string | null;
  roadmapId: string;
  dayNumber: number;
  concepts: Array<{ concept: string; summary: string }>;
  onClose: () => void;
}

const Flashcards: React.FC<FlashcardsProps> = ({ token, roadmapId, dayNumber, concepts, onClose }) => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [roadmapId, dayNumber]);

  const fetchCards = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5002/api/flashcards/${roadmapId}/${dayNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (e) {
      console.error("Failed to fetch flashcards", e);
    } finally {
      setLoading(false);
    }
  };

  const generateCards = async (isMore = false) => {
    if (!token) return;
    try {
      setGenerating(true);
      const offset = isMore ? cards.length : 0;
      const res = await fetch('http://localhost:5002/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roadmapId, dayNumber, concepts, offset })
      });
      if (res.ok) {
        await fetchCards();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate flashcards");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (rating: number) => {
    if (!token || cards.length === 0) return;
    try {
      setReviewing(true);
      const currentCard = cards[currentIndex];
      
      await fetch(`http://localhost:5002/api/flashcards/${currentCard._id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating })
      });

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        // Finished deck for today
        setCards([]); // Clear to show finish screen
      }
    } catch (e) {
      console.error("Failed to submit review", e);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col items-center min-h-[400px]">
        
        <div className="w-full flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span>📇</span> Spaced Repetition (Day {dayNumber})
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-2"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Loading your deck...</div>
        ) : cards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-200">You're all caught up!</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-xs">
              There are no due flashcards for this day. 
            </p>
            <button
              onClick={() => generateCards(false)}
              disabled={generating}
              className="px-6 py-2.5 mt-4 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating via AI...' : 'Generate New Deck'}
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center perspective-1000">
            <div className="mb-4 text-sm font-semibold text-slate-500 dark:text-zinc-400">
              Card {currentIndex + 1} of {cards.length}
            </div>

            {/* 3D Flip Card */}
            <div 
              className={`relative w-full h-64 cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => !isFlipped && setIsFlipped(true)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div 
                className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 text-center bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-inner"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <h3 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                  {cards[currentIndex].front}
                </h3>
                {!isFlipped && (
                  <div className="absolute bottom-4 text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
                    Tap to Flip
                  </div>
                )}
              </div>
              
              {/* Back */}
              <div 
                className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 text-center bg-indigo-50 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 rounded-xl shadow-inner rotate-y-180 overflow-y-auto custom-scrollbar"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="max-h-full my-auto w-full">
                  <p className="text-base md:text-lg text-slate-700 dark:text-zinc-200 font-medium text-left leading-relaxed break-words">
                    {cards[currentIndex].back}
                  </p>
                </div>
              </div>
            </div>

            {/* SM-2 Rating Controls */}
            {isFlipped && (
              <div className="w-full mt-8 animate-in slide-in-from-bottom-4 duration-300 flex flex-col items-center">
                <p className="text-center text-sm text-slate-500 dark:text-zinc-400 mb-3 font-medium">How well did you know this?</p>
                <div className="flex w-full justify-between gap-2">
                  <button onClick={() => handleReview(1)} disabled={reviewing} className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-bold">Again</button>
                  <button onClick={() => handleReview(3)} disabled={reviewing} className="flex-1 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm font-bold">Hard</button>
                  <button onClick={() => handleReview(4)} disabled={reviewing} className="flex-1 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-bold">Good</button>
                  <button onClick={() => handleReview(5)} disabled={reviewing} className="flex-1 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-bold">Easy</button>
                </div>
              </div>
            )}
            
            <div className="w-full mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800 text-center">
              <button
                onClick={() => generateCards(true)}
                disabled={generating}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline disabled:opacity-50"
              >
                {generating ? 'Generating More...' : '+ Generate More Cards'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
