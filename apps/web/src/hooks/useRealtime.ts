'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimePrediction(predictionId: string) {
  const queryClient = useQueryClient();

  const subscribe = useCallback(() => {
    const channel = supabase
      .channel(`prediction-${predictionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'predictions',
          filter: `id=eq.${predictionId}`,
        },
        (payload) => {
          const updated = payload.new as { yes_count: number; no_count: number };
          const total = updated.yes_count + updated.no_count;

          queryClient.setQueryData(
            ['prediction', predictionId],
            (old: any) => {
              if (!old) return old;
              return {
                ...old,
                data: {
                  ...old.data,
                  yes_count: updated.yes_count,
                  no_count:  updated.no_count,
                  yes_pct:   total > 0 ? Math.round((updated.yes_count / total) * 100) : 50,
                  no_pct:    total > 0 ? Math.round((updated.no_count  / total) * 100) : 50,
                },
              };
            }
          );
        }
      )
      .subscribe();

    return channel;
  }, [predictionId, queryClient]);

  useEffect(() => {
    const channel = subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscribe]);
}

// Subscribe to all open predictions on the feed
export function useRealtimeFeed(predictionIds: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!predictionIds.length) return;

    const channels = predictionIds.map((id) =>
      supabase
        .channel(`feed-prediction-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'predictions',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const updated = payload.new as { yes_count: number; no_count: number };
            const total = updated.yes_count + updated.no_count;

            queryClient.setQueryData(['predictions'], (old: any) => {
              if (!old?.data) return old;
              return {
                ...old,
                data: old.data.map((p: any) =>
                  p.id === id
                    ? {
                        ...p,
                        yes_count: updated.yes_count,
                        no_count:  updated.no_count,
                        yes_pct:   total > 0 ? Math.round((updated.yes_count / total) * 100) : 50,
                        no_pct:    total > 0 ? Math.round((updated.no_count  / total) * 100) : 50,
                      }
                    : p
                ),
              };
            });
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [predictionIds.join(','), queryClient]);
}

// ─── LIVE ACTIVITY FEED ──────────────────────────────────────
export interface ActivityEvent {
  id: string;
  prediction_id: string;
  question: string;
  choice: boolean;
  username: string;
  ts: Date;
}

type ActivityCallback = (event: ActivityEvent) => void;

export function useRealtimeActivity(
  questions: Record<string, string>, // predictionId -> question
  onActivity: ActivityCallback
) {
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    const channel = supabase
      .channel('global-votes-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
        },
        async (payload) => {
          const vote = payload.new as {
            id: string;
            prediction_id: string;
            user_id: string;
            choice: boolean;
            created_at: string;
          };

          // Fetch username for the voter
          const { data: user } = await supabase
            .from('users')
            .select('username, display_name')
            .eq('id', vote.user_id)
            .single();

          const question = questions[vote.prediction_id] ?? 'a prediction';

          onActivityRef.current({
            id: vote.id,
            prediction_id: vote.prediction_id,
            question,
            choice: vote.choice,
            username: user?.display_name ?? user?.username ?? 'Someone',
            ts: new Date(vote.created_at),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [Object.keys(questions).join(',')]);
}

// ─── CONNECTION STATUS ────────────────────────────────────────
export function useConnectionStatus(onStatusChange: (status: 'connected' | 'connecting' | 'disconnected') => void) {
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    onStatusRef.current('connecting');

    const channel = supabase
      .channel('connection-probe')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatusRef.current('connected');
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') onStatusRef.current('disconnected');
        else onStatusRef.current('connecting');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
