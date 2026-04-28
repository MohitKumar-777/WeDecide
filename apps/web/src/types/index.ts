// Shared TypeScript types for WeDecide — used across web + api

export type Tier = 'Rookie' | 'Analyst' | 'Oracle' | 'Visionary' | 'Legend';

export type Category =
  | 'Cricket'
  | 'Bollywood'
  | 'Politics'
  | 'Startups'
  | 'Technology'
  | 'Sports'
  | 'Economy'
  | 'World';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type PredictionStatus = 'open' | 'closed' | 'resolved';

export interface Prediction {
  id: string;
  question: string;
  description?: string;
  category: Category;
  subcategory?: string;
  difficulty: Difficulty;
  status: PredictionStatus;
  outcome: boolean | null;
  yes_count: number;
  no_count: number;
  resolves_at: string;
  resolved_at?: string;
  curated_by?: string;
  source_url?: string;
  tags: string[];
  created_at: string;
}

export interface UserVote {
  prediction_id: string;
  choice: boolean; // true = YES
  is_correct: boolean | null;
  score_delta: number | null;
}

export interface User {
  id: string;
  phone?: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  predict_score: number;
  tier: Tier;
  accuracy_pct: number;
  total_preds: number;
  correct_preds: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

export interface ScoreLog {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  vote_id?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  movement: 'up' | 'down' | 'stable';
  movement_amount: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  requestId?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export interface VotePayload {
  prediction_id: string;
  choice: boolean;
}

export interface PredictionWithVote extends Prediction {
  userVote?: UserVote;
  yes_pct: number;
  no_pct: number;
  total_votes: number;
}

export const TIER_THRESHOLDS: Record<Tier, { min: number; max: number | null }> = {
  Rookie:    { min: 0,   max: 99 },
  Analyst:   { min: 100, max: 299 },
  Oracle:    { min: 300, max: 599 },
  Visionary: { min: 600, max: 849 },
  Legend:    { min: 850, max: null },
};

export const TIER_COLORS: Record<Tier, string> = {
  Rookie:    '#9996b0',
  Analyst:   '#38bdf8',
  Oracle:    '#00bfa5',
  Visionary: '#b66dff',
  Legend:    '#f5e0b7',
};

export const TIER_ICONS: Record<Tier, string> = {
  Rookie:    'R',
  Analyst:   'A',
  Oracle:    'O',
  Visionary: 'V',
  Legend:    'L',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  Cricket:    '',
  Bollywood:  '',
  Politics:   '',
  Startups:   '',
  Technology: '',
  Sports:     '',
  Economy:    '',
  World:      '',
};

export function getTier(score: number): Tier {
  if (score >= 850) return 'Legend';
  if (score >= 600) return 'Visionary';
  if (score >= 300) return 'Oracle';
  if (score >= 100) return 'Analyst';
  return 'Rookie';
}

export function computeYesPct(yes: number, no: number): number {
  const total = yes + no;
  if (total === 0) return 50;
  return Math.round((yes / total) * 100);
}

export function computeDifficulty(yes: number, no: number): Difficulty {
  const yesPct = computeYesPct(yes, no);
  const deviation = Math.abs(yesPct - 50);
  if (deviation > 30) return 'easy';
  if (deviation > 15) return 'medium';
  return 'hard';
}
