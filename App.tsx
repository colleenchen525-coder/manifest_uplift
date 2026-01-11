import React, { useState, useEffect } from 'react';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import GratitudeModal from './views/GratitudeModal';
import Sidebar from './components/Sidebar';
import { generatePlanFromWish } from './services/geminiService';
import { UserState, ViewState, GratitudeEntry, UserGoal } from './types';

const App = () => {
  // --- State Management ---
  const [userState, setUserState] = useState<UserState>(() => {
    // Initial Load from LocalStorage
    const saved = localStorage.getItem('microWinState');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // MIGRATION LOGIC
      if (!parsed.goals) {
        const goals: UserGoal[] = [];
        if (parsed.hasWish && parsed.wish && parsed.plan) {
            goals.push({
                id: 'legacy-goal',
                wish: parsed.wish,
                plan: parsed.plan,
                createdAt: parsed.plan.generatedAt || new Date().toISOString()
            });
        }
        return {
            userId: parsed.userId || '',
            nickname: '',
            activeGoalId: goals.length > 0 ? goals[0].id : null,
            goals: goals,
            gratitudeEntries: parsed.gratitudeEntries || [],
            history: parsed.history || []
        };
      }
      return parsed;
    }
    
    // Default initial state
    return {
      userId: '',
      nickname: '',
      activeGoalId: null,
      goals: [],
      gratitudeEntries: [],
      history: []
    };
  });

  const [view, setView] = useState<ViewState>(() => {
    if (userState.goals.length > 0 && userState.activeGoalId) {
        return 'DASHBOARD';
    }
    return 'ONBOARDING';
  });

  const [isGratitudeOpen, setIsGratitudeOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Identity & Persistence ---

  useEffect(() => {
    const initializeIdentity = async () => {
      if (!userState.userId) {
        let newId = '';
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          newId = `ip-${data.ip.replace(/\./g, '')}-${Math.floor(Math.random() * 1000)}`;
        } catch (e) {
          newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        }
        setUserState(prev => ({ ...prev, userId: newId }));
      }
    };
    initializeIdentity();
  }, [userState.userId]);

  useEffect(() => {
    localStorage.setItem('microWinState', JSON.stringify(userState));
  }, [userState]);

  // --- Handlers ---

  const handleWishConfirmed = async (wish: string, nickname: string) => {
    setView('LOADING');
    try {
      const plan = await generatePlanFromWish(wish, nickname, userState.history);
      
      const newGoal: UserGoal = {
        id: Math.random().toString(36).substr(2, 9),
        wish,
        plan,
        createdAt: new Date().toISOString()
      };

      setUserState(prev => ({
        ...prev,
        nickname: nickname,
        activeGoalId: newGoal.id,
        goals: [...prev.goals, newGoal]
      }));
      setView('DASHBOARD');
    } catch (error) {
      console.error("Failed to generate plan", error);
      setView('ONBOARDING');
      alert("Something went wrong generating your plan. Please try again.");
    }
  };

  const handleUpdateAction = (id: string, isCompleted: boolean) => {
    setUserState(prev => {
        if (!prev.activeGoalId) return prev;

        const updatedGoals = prev.goals.map(goal => {
            if (goal.id === prev.activeGoalId) {
                const updatedActions = goal.plan.microActions.map(action => 
                    action.id === id ? { ...action, isCompleted } : action
                );
                return { ...goal, plan: { ...goal.plan, microActions: updatedActions } };
            }
            return goal;
        });

        return { ...prev, goals: updatedGoals };
    });
  };

  const handleAckAffirmation = (id: string) => {
    setUserState(prev => {
        if (!prev.activeGoalId) return prev;

        const updatedGoals = prev.goals.map(goal => {
            if (goal.id === prev.activeGoalId) {
                const updatedAffirmations = goal.plan.affirmations.map(aff => 
                    aff.id === id ? { ...aff, isAcknowledged: !aff.isAcknowledged } : aff
                );
                return { ...goal, plan: { ...goal.plan, affirmations: updatedAffirmations } };
            }
            return goal;
        });

        return { ...prev, goals: updatedGoals };
    });
  };

  const handleAddGratitude = (text: string) => {
    const newEntry: GratitudeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      date: new Date().toISOString()
    };
    
    setUserState(prev => ({
      ...prev,
      gratitudeEntries: [newEntry, ...prev.gratitudeEntries]
    }));
  };

  const handleSwitchGoal = (goalId: string) => {
      setUserState(prev => ({ ...prev, activeGoalId: goalId }));
      setView('DASHBOARD');
  };

  const handleAddNewGoalRequest = () => {
      setView('ONBOARDING');
  };

  // --- Render ---

  if (view === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-stone-900 mb-4"></div>
        <p className="text-stone-900 font-semibold animate-pulse tracking-tight">Designing your path...</p>
        <p className="text-stone-400 text-xs mt-2 uppercase tracking-widest">Powered by Gemini</p>
      </div>
    );
  }

  const activeGoal = userState.goals.find(g => g.id === userState.activeGoalId);

  return (
    <div className="antialiased text-stone-900 mx-auto max-w-lg bg-white min-h-screen shadow-2xl overflow-hidden relative">
      {/* Sidebar is always mounted but conditionally visible */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        goals={userState.goals}
        activeGoalId={userState.activeGoalId}
        nickname={userState.nickname}
        userId={userState.userId}
        onSwitchGoal={handleSwitchGoal}
        onAddNewGoal={handleAddNewGoalRequest}
      />

      {view === 'ONBOARDING' && (
        <Onboarding 
            onConfirm={handleWishConfirmed} 
            existingNickname={userState.nickname}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            hasExistingGoals={userState.goals.length > 0}
        />
      )}

      {view === 'DASHBOARD' && activeGoal && (
        <>
          <Dashboard 
            state={userState}
            activeGoal={activeGoal}
            onUpdateAction={handleUpdateAction}
            onAckAffirmation={handleAckAffirmation}
            onAddGratitude={() => setIsGratitudeOpen(true)}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
          <GratitudeModal 
            isOpen={isGratitudeOpen}
            onClose={() => setIsGratitudeOpen(false)}
            onSave={handleAddGratitude}
          />
        </>
      )}
    </div>
  );
};

export default App;
