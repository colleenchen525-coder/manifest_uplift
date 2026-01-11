import React from 'react';
import { UserGoal } from '../types';
import { PlusIcon, CheckIcon, SparklesIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  goals: UserGoal[];
  activeGoalId: string | null;
  nickname: string;
  userId: string;
  onSwitchGoal: (id: string) => void;
  onAddNewGoal: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  goals, 
  activeGoalId,
  nickname,
  userId,
  onSwitchGoal,
  onAddNewGoal 
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <span className="font-bold text-lg">{nickname.charAt(0).toUpperCase()}</span>
             </div>
             <div>
               <h2 className="font-bold text-stone-900 leading-tight truncate max-w-[150px]">{nickname}</h2>
               <p className="text-[10px] text-stone-400 font-mono">ID: {userId.substring(0,8)}...</p>
             </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-3 mb-2">My Goals</h3>
          
          {goals.map((goal) => {
            const isActive = goal.id === activeGoalId;
            return (
              <button
                key={goal.id}
                onClick={() => {
                  onSwitchGoal(goal.id);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 group flex items-start space-x-3 ${
                  isActive 
                    ? 'bg-orange-50 text-orange-900 ring-1 ring-orange-200' 
                    : 'bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className={`mt-0.5 ${isActive ? 'text-orange-500' : 'text-stone-300'}`}>
                    <SparklesIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-stone-900' : 'text-stone-700'}`}>
                    {goal.wish}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {new Date(goal.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/30">
          <button 
            onClick={() => {
              onAddNewGoal();
              onClose();
            }}
            className="flex w-full items-center justify-center space-x-2 py-3.5 rounded-xl bg-stone-900 text-white font-medium shadow-sm hover:bg-stone-800 transition-colors active:scale-[0.98]"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Goal</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;