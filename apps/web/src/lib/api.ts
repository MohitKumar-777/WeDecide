import { PredictionWithVote, ApiResponse, User, LeaderboardEntry, Club } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://wedecide-api.onrender.com';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'API error');
  }

  return res.json();
}

// ─── PREDICTIONS ───────────────────────────────────────────
export function getPredictions(params?: {
  category?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.status)   qs.set('status', params.status);
  if (params?.sort)     qs.set('sort', params.sort);
  if (params?.page)     qs.set('page', String(params.page));
  if (params?.limit)    qs.set('limit', String(params.limit ?? 20));
  if (params?.search)   qs.set('search', params.search);
  return fetchApi<ApiResponse<PredictionWithVote[]>>(`/api/v1/predictions?${qs}`);
}

export function getPrediction(id: string) {
  return fetchApi<ApiResponse<PredictionWithVote>>(`/api/v1/predictions/${id}`);
}

export function getPredictionHistory(id: string) {
  return fetchApi<ApiResponse<{ time: string; value: number }[]>>(`/api/v1/predictions/${id}/history`);
}

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  likes: number;
  users: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    tier: string;
  } | null;
}

export function getComments(predictionId: string) {
  return fetchApi<ApiResponse<Comment[]>>(`/api/v1/predictions/${predictionId}/comments`);
}

export function postComment(predictionId: string, body: string, token: string) {
  return fetchApi<ApiResponse<Comment>>(`/api/v1/predictions/${predictionId}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
}

// ─── NEWS ──────────────────────────────────────────────────
export function getNews(query: string) {
  return fetchApi<ApiResponse<unknown[]>>(`/api/v1/news?q=${encodeURIComponent(query)}`);
}

// ─── CATEGORIES ─────────────────────────────────────────────
export function getCategories() {
  return fetchApi<ApiResponse<{ name: string; count: number }[]>>('/api/v1/predictions/categories');
}

// ─── VOTES ─────────────────────────────────────────────────
export function castVote(payload: { prediction_id: string; choice: boolean }, token: string) {
  return fetchApi<ApiResponse<{ yes_count: number; no_count: number }>>('/api/v1/votes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

// ─── USERS ─────────────────────────────────────────────────
export function getUser(username: string) {
  return fetchApi<ApiResponse<User>>(`/api/v1/users/${username}`);
}

export function getMe(token: string) {
  return fetchApi<ApiResponse<User>>(`/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function updateMe(data: { username?: string; display_name?: string }, token: string) {
  return fetchApi<{ data: User; access_token: string }>(`/api/v1/users/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function getMyFeed(token: string, page = 1) {
  return fetchApi<ApiResponse<PredictionWithVote[]>>(`/api/v1/me/feed?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── LEADERBOARD ───────────────────────────────────────────
export function getLeaderboard(params?: { category?: string; timeframe?: string }) {
  const qs = new URLSearchParams();
  if (params?.category)  qs.set('category', params.category);
  if (params?.timeframe) qs.set('timeframe', params.timeframe);
  return fetchApi<ApiResponse<LeaderboardEntry[]>>(`/api/v1/leaderboard?${qs}`);
}

// ─── CLUBS ─────────────────────────────────────────────────
export function getClubs() {
  return fetchApi<ApiResponse<Club[]>>('/api/v1/clubs');
}

export function getClub(id: string) {
  return fetchApi<ApiResponse<Club>>(`/api/v1/clubs/${id}`);
}

export function createClub(name: string, token: string) {
  return fetchApi<ApiResponse<Club>>('/api/v1/clubs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
}

export function joinClub(code: string, token: string) {
  return fetchApi<ApiResponse<Club>>(`/api/v1/clubs/${code}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getClubLeaderboard(id: string, token: string) {
  return fetchApi<ApiResponse<LeaderboardEntry[]>>(`/api/v1/clubs/${id}/leaderboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── AUTH ──────────────────────────────────────────────────
export function sendOtp(phone: string) {
  return fetchApi<{ message: string }>('/api/v1/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, otp: string) {
  return fetchApi<{ access_token: string; refresh_token: string; user: User }>(
    '/api/v1/auth/otp/verify',
    {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }
  );
}

// ─── ADMIN ─────────────────────────────────────────────────
export function resolvePrediction(id: string, outcome: boolean, token: string) {
  return fetchApi<{ data: unknown }>(`/api/admin/predictions/${id}/resolve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ outcome }),
  });
}

export function triggerAMM(token: string) {
  return fetchApi<{ data: unknown }>('/api/admin/trigger-amm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}
