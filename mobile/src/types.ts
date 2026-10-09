export type Risk = 'momentum' | 'steady' | 'slipping' | 'at_risk';
export type TaskType = 'learn' | 'practice' | 'teach' | 'reflect';

export interface Profile {
  name: string;
  cv_summary: string;
  skills: Record<string, number>;
  hobbies: string[];
  goals: string[];
  daily_minutes: number;
  constraints: string[];
}

export interface GoalCandidate {
  title: string;
  fit_score: number;
  reason: string;
}

export interface Goal {
  candidates: GoalCandidate[];
  selected: string;
  rationale: string;
  target_skills: Record<string, number>;
  duration_days: number;
  success_metric: string;
}

export interface Task {
  id: string;
  day: number;
  title: string;
  minutes: number;
  skill: string;
  difficulty: number;
  type: TaskType;
  done: boolean;
}

export interface Roadmap {
  weeks: { week: number; theme: string; milestone: string }[];
  tasks: Task[];
}

export interface TwinSnapshot {
  day: number;
  real: Record<string, number>;
  ideal: Record<string, number>;
  real_xp: number;
  ideal_xp: number;
  divergence: number;
  streak: number;
  risk: Risk;
}

export interface Coach {
  mode: Risk;
  message: string;
  action: { title: string; minutes: number };
  ask_user: string | null;
}

export interface ChatMessage {
  role: 'user' | 'twin';
  text: string;
  mode?: 'chat' | 'teach';
  questions?: string[];
  score?: number | null;
  score_reason?: string | null;
}

export interface SessionView {
  session_id: string;
  mock: boolean;
  profile: Profile;
  goal: Goal;
  started: boolean;
  roadmap?: Roadmap;
  twin?: TwinSnapshot;
  history?: { day: number; real: number; ideal: number }[];
  today?: number;
  finished?: boolean;
  coach?: Coach | null;
  replan?: { interventions: string[]; explanation: string } | null;
  chat?: ChatMessage[];
}
