export interface GoalAction {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Affirmation {
  id: string;
  text: string;
  isAcknowledged: boolean;
}

export interface ManifestationPlan {
  affirmations: Affirmation[];
  actions: GoalAction[];
  generatedAt: string; // ISO Date string
}

export interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
}

export interface UserGoal {
  id: string;
  wish: string;
  plan: ManifestationPlan;
  createdAt: string;
}

export interface UserState {
  userId: string;
  nickname: string;
  activeGoalId: string | null;
  goals: UserGoal[];
  gratitudeEntries: GratitudeEntry[];
  history: {
    date: string;
    wish: string;
    completedActions: number;
    totalActions: number;
  }[];
}

export type ViewState = 'ONBOARDING' | 'LOADING' | 'DASHBOARD' | 'GRATITUDE_ENTRY';
