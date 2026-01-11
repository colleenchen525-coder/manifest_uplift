import React, { useState, useRef } from 'react';
import { UserState, MicroAction, UserGoal } from '../types';
import { CheckIcon, BookHeartIcon, HeartIcon, MenuIcon } from '../components/Icons';

interface DashboardProps {
  state: UserState;
  activeGoal: UserGoal;
  onUpdateAction: (id: string, isCompleted: boolean) => void;
  onAckAffirmation: (id: string) => void;
  onAddGratitude: () => void;
  onOpenSidebar: () => void;
}

const ActionItem: React.FC<{ action: MicroAction; onToggle: () => void }> = ({ action, onToggle }) => {
  return (
    <div 
      onClick={onToggle}
      className={`group flex items-center p-4 bg-white rounded-3xl shadow-sm border transition-all duration-200 cursor-pointer active:scale-[0.98] active:shadow-none ${
        action.isCompleted ? 'border-transparent bg-stone-100' : 'border-stone-100 hover:border-orange-200 hover:shadow-md'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
        action.isCompleted ? 'bg-orange-500 text-white' : 'bg-stone-100 text-transparent group-hover:text-orange-200'
      }`}>
        <CheckIcon className="w-5 h-5" />
      </div>
      <span className={`ml-4 text-[17px] font-medium leading-snug transition-all duration-200 ${
        action.isCompleted ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-900'
      }`}>
        {action.text}
      </span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  activeGoal, 
  onUpdateAction, 
  onAckAffirmation, 
  onAddGratitude,
  onOpenSidebar
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { plan } = activeGoal;

  // --- Progress Calculation ---
  const hasAckAffirmation = plan.affirmations.some(a => a.isAcknowledged);
  const completedActionsCount = plan.microActions.filter(a => a.isCompleted).length;
  const hasGratitude = state.gratitudeEntries.some(entry => {
    const entryDate = new Date(entry.date).toDateString();
    const today = new Date().toDateString();
    return entryDate === today;
  });

  const currentScore = (hasAckAffirmation ? 1 : 0) + completedActionsCount + (hasGratitude ? 1 : 0);
  const totalScore = 4;
  const progressPercent = (currentScore / totalScore) * 100;

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setActiveSlide(index);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#FDFCFB]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-stone-100/50">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-colors text-stone-900"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <span className="font-semibold text-stone-900 text-sm opacity-80 uppercase tracking-widest">MicroWin</span>
        <div className="w-8" />
      </div>

      <div className="px-5 pb-24 space-y-8 max-w-lg mx-auto">
        
        {/* 1. Progress Section (Top) */}
        <div className="mt-4">
          <div className="flex items-end justify-between mb-3 px-1">
             <div>
               <h1 className="text-3xl font-display font-bold text-stone-900">Hi, {state.nickname}</h1>
               <p className="text-stone-500 font-medium text-sm mt-1">Let's build momentum.</p>
             </div>
             <div className="text-right">
                <span className="text-3xl font-bold text-orange-600 font-display">{Math.round(progressPercent)}%</span>
             </div>
          </div>

          <div className="relative h-4 w-full bg-stone-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="mt-3 bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <span className="text-stone-600 text-sm font-medium line-clamp-1 flex-1 mr-4">
                 Goal: {activeGoal.wish}
              </span>
              {currentScore === totalScore && (
                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Day Complete
                 </span>
              )}
          </div>
        </div>

        {/* 2. Affirmations Carousel */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-lg font-bold text-stone-900">Affirmation</h3>
              <div className="flex space-x-1">
                {plan.affirmations.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeSlide ? 'w-4 bg-orange-400' : 'w-1.5 bg-stone-200'
                    }`} 
                  />
                ))}
              </div>
           </div>
           
           <div className="relative group">
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x-mandatory no-scrollbar gap-4 pb-4"
              >
                {plan.affirmations.map((aff) => (
                  <div key={aff.id} className="min-w-full snap-center">
                    <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 h-full flex flex-col justify-between min-h-[220px]">
                       <div>
                          <h2 className="text-2xl font-display font-semibold text-stone-900 leading-tight">
                            "{aff.text}"
                          </h2>
                          <div className="mt-4 flex items-start space-x-2">
                             <div className="w-0.5 h-8 bg-orange-200 rounded-full mt-1"></div>
                             <p className="text-sm text-stone-500 leading-relaxed italic">
                                {aff.reasoning}
                             </p>
                          </div>
                       </div>
                       
                       <button 
                          onClick={() => onAckAffirmation(aff.id)}
                          className={`mt-6 w-full flex items-center justify-center space-x-2 py-3 rounded-2xl transition-all duration-300 font-medium ${
                            aff.isAcknowledged 
                              ? 'bg-orange-50 text-orange-700' 
                              : 'bg-stone-900 text-white shadow-lg shadow-stone-200 hover:bg-stone-800'
                          }`}
                        >
                          <HeartIcon className={`w-5 h-5 ${aff.isAcknowledged ? 'fill-orange-600 text-orange-600' : 'text-white'}`} />
                          <span>{aff.isAcknowledged ? "I Believe" : "Tap to Affirm"}</span>
                        </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* 3. Micro Actions */}
        <div>
          <h3 className="text-lg font-bold text-stone-900 mb-3 px-1">Today's Actions</h3>
          <div className="space-y-3">
            {plan.microActions.map((action) => (
              <ActionItem 
                key={action.id} 
                action={action} 
                onToggle={() => onUpdateAction(action.id, !action.isCompleted)} 
              />
            ))}
          </div>
        </div>

        {/* 4. Gratitude */}
        <div>
           <h3 className="text-lg font-bold text-stone-900 mb-3 px-1">Gratitude</h3>
           <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-100">
             {hasGratitude ? (
               <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-green-600 mb-2">
                     <div className="p-1 bg-green-100 rounded-full"><CheckIcon className="w-4 h-4"/></div>
                     <span className="font-semibold text-sm">Recorded for today</span>
                  </div>
                  {state.gratitudeEntries.slice(0, 2).map(entry => (
                     <div key={entry.id} className="text-stone-700 bg-stone-50 p-3 rounded-xl text-sm italic">
                       "{entry.text}"
                     </div>
                   ))}
                   <button 
                     onClick={onAddGratitude}
                     className="w-full mt-2 py-3 rounded-xl text-stone-500 text-sm hover:bg-stone-50 transition-colors"
                   >
                     Write another entry
                   </button>
               </div>
             ) : (
                <div className="text-center py-2">
                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <BookHeartIcon className="w-6 h-6" />
                    </div>
                    <p className="text-stone-600 font-medium mb-1">One small good thing</p>
                    <p className="text-stone-400 text-sm mb-4">Shift your focus to the positive.</p>
                    <button 
                      onClick={onAddGratitude}
                      className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium shadow-md hover:bg-stone-800 transition-colors"
                    >
                      Write Entry
                    </button>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;