import React, { useState, useEffect } from 'react';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import GratitudeModal from './views/GratitudeModal';
import Sidebar from './components/Sidebar';
import { generatePlanFromWish } from './services/planService';
import { UserState, ViewState, GratitudeEntry, UserGoal } from './types';

type PlanAffirmation = {
  id: string;
  text: string;
  isAcknowledged: boolean;
};

type PlanAction = {
  id: string;
  text: string;
  isCompleted: boolean;
};

type NormalizedPlan = {
  affirmations: PlanAffirmation[];
  actions: PlanAction[];
  generatedAt: string;
};

const makeId = () => Math.random().toString(36).substr(2, 9);

const coerceString = (v: any) => (typeof v === 'string' ? v.trim() : '');

const normalizePlan = (plan: any): NormalizedPlan => {
  // 1) Extract raw lists from multiple possible shapes
  const rawAffirmations = Array.isArray(plan?.affirmations) ? plan.affirmations : [];
  const rawActions = Array.isArray(plan?.actions)
    ? plan.actions
    : Array.isArray(plan?.microActions)
      ? plan.microActions
      : Array.isArray(plan?.micro_actions)
        ? plan.micro_actions
        : [];

  // 2) Normalize affirmations:
  // supports:
  // - ["string", ...]
  // - [{id,text,isAcknowledged}, ...]
  // - legacy objects with .text
  const affirmations: PlanAffirmation[] = rawAffirmations
    .slice(0, 5)
    .map((a: any) => {
      if (typeof a === 'string') {
        const text = a.trim();
        return text
          ? { id: makeId(), text, isAcknowledged: false }
          : null;
      }
      if (a && typeof a === 'object') {
        const text = coerceString(a.text);
        if (!text) return null;
        return {
          id: coerceString(a.id) || makeId(),
          text,
          isAcknowledged: !!a.isAcknowledged
        };
      }
      return null;
    })
    .filter(Boolean) as PlanAffirmation[];

  // 3) Normalize actions:
  // supports:
  // - ["string", ...]
  // - [{id,text,isCompleted}, ...]
  // - legacy objects with .text
  const actions: PlanAction[] = rawActions
    .slice(0, 2)
    .map((a: any) => {
      if (typeof a === 'string') {
        const text = a.trim();
        return text
          ? { id: makeId(), text, isCompleted: false }
          : null;
      }
      if (a && typeof a === 'object') {
        const text = coerceString(a.text);
        if (!text) return null;
        return {
          id: coerceString(a.id) || makeId(),
          text,
          isCompleted: !!a.isCompleted
        };
      }
      return null;
    })
    .filter(Boolean) as PlanAction[];

  // 4) Ensure exact counts (pad only if missing; do NOT duplicate the same string)
  // If something is missing, keep it empty rather than cloning first item.
  const safeAffirmations = affirmations.slice(0, 5);
  const safeActions = actions.slice(0, 2);

  return {
    affirmations: safeAffirmations,
    actions: safeActions,
    generatedAt: coerceString(plan?.generatedAt) || new Date().toISOString()
  };
};

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
            plan: normalizePlan(parsed.plan),
            createdAt: parsed.plan.generatedAt || new Date().toISOString()
          });
        }
        return {
          userId: parsed.userId || '',
          nickname: '',
          activeGoalId: goals.length > 0 ? goals[0].id : null,
          goals,
          gratitudeEntries: parsed.gratitudeEntries || [],
          history: parsed.history || []
        };
      }

      // Normalize all stored goals
      return {
        ...parsed,
        goals: (parsed.goals || []).map((goal: any) => ({
          ...goal,
          plan: normalizePlan(goal.plan)
        }))
      };
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
      const rawPlan = await generatePlanFromWish(wish, nickname, userState.history);

      // CRITICAL: normalize server response into the object-array plan the UI expects
      const plan = normalizePlan(rawPlan);

      const newGoal: UserGoal = {
        id: makeId(),
        wish,
        plan,
        createdAt: new Date().toISOString()
      };

      setUserState(prev => ({
        ...prev,
        nickname,
        activeGoalId: newGoal.id,
        goals: [...prev.goals, newGoal]
      }));

      setView('DASHBOARD');
    } catch (error) {
      console.error('Failed to generate plan', error);
      setView('ONBOARDING');
      alert('Something went wrong generating your plan. Please try again.');
    }
  };

  const handleUpdateAction = (id: string, isCompleted: boolean) => {
    setUserState(prev => {
      if (!prev.activeGoalId) return prev;

      const updatedGoals = prev.goals.map(goal => {
        if (goal.id === prev.activeGoalId) {
          const updatedActions = goal.plan.actions.map(action =>
            action.id === id ? { ...action, isCompleted } : action
          );
          return { ...goal, plan: { ...goal.plan, actions: updatedActions } };
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
          const updatedAffirmations = goal.plan.affirmations.map(affirmation =>
            affirmation.id === id
              ? { ...affirmation, isAcknowledged: !affirmation.isAcknowledged }
              : affirmation
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
      id: makeId(),
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
        <p className="text-stone-400 text-xs mt-2 uppercase tracking-widest">Powered by Qwen</p>
      </div>
    );
  }

  const activeGoal = userState.goals.find(g => g.id === userState.activeGoalId);

  return (
    <div className="antialiased text-stone-900 mx-auto max-w-lg bg-white min-h-screen shadow-2xl overflow-hidden relative">
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
