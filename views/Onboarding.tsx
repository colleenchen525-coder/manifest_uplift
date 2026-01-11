import React, { useState } from 'react';
import { SparklesIcon, ArrowRightIcon, MenuIcon } from '../components/Icons';

interface OnboardingProps {
  onConfirm: (wish: string, nickname: string) => void;
  existingNickname?: string;
  onOpenSidebar: () => void;
  hasExistingGoals: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({ 
  onConfirm, 
  existingNickname, 
  onOpenSidebar,
  hasExistingGoals
}) => {
  const [wish, setWish] = useState('');
  const [nickname, setNickname] = useState(existingNickname || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wish.trim().length > 2 && nickname.trim().length > 0) {
      onConfirm(wish, nickname);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col">
       {/* Top Bar - Only show if we have existing goals to switch back to */}
       {hasExistingGoals && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4 flex items-center justify-between">
          <button 
            onClick={onOpenSidebar}
            className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-colors text-stone-900"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in max-w-lg mx-auto w-full">
        <div className="w-full space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-gradient-to-br from-orange-100 to-orange-50 text-orange-500 shadow-sm border border-orange-100">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 font-display">
                Make it Real
              </h1>
              <p className="text-stone-500 text-lg mt-2 leading-relaxed">
                Turn your intention into scientific<br/>micro-wins.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {!existingNickname && (
                <div className="space-y-2">
                  <label htmlFor="nickname" className="block text-sm font-semibold text-stone-900 ml-1">
                    What should we call you?
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-stone-900 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.03)] ring-1 ring-inset ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-orange-500 text-lg transition-all"
                    placeholder="Your Name"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="wish" className="block text-sm font-semibold text-stone-900 ml-1">
                  What is your new goal?
                </label>
                <textarea
                  id="wish"
                  rows={4}
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-stone-900 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.03)] ring-1 ring-inset ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-orange-500 text-lg leading-relaxed resize-none transition-all"
                  placeholder="e.g., I want to run a marathon..."
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!wish.trim() || !nickname.trim()}
              className="group relative flex w-full justify-center items-center rounded-2xl bg-stone-900 px-3 py-4 text-lg font-semibold text-white shadow-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            >
              Start Manifesting
              <ArrowRightIcon className="ml-2 h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <div className="border-t border-stone-100 pt-6">
            <p className="text-[10px] uppercase tracking-widest text-center text-stone-400 font-semibold">
               Powered by Behavioral Science
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;