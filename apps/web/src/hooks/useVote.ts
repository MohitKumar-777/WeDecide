'use client';

import { useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { PredictionWithVote } from '@/types';
import { castVote } from '@/lib/api';

export function useVote(predictionId: string, initialUserVote?: boolean | null) {
  const queryClient = useQueryClient();
  const [token] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('px_token') ?? '' : ''
  );

  // Track the user's choice locally for instant UI feedback
  const [localChoice, setLocalChoice] = useState<boolean | null>(
    initialUserVote !== undefined && initialUserVote !== null ? initialUserVote : null
  );

  const mutation = useMutation({
    mutationFn: (choice: boolean) => castVote({ prediction_id: predictionId, choice }, token),

    onMutate: async (choice: boolean) => {
      // Optimistically update local choice immediately
      setLocalChoice(choice);

      await queryClient.cancelQueries({ queryKey: ['prediction', predictionId] });
      await queryClient.cancelQueries({ queryKey: ['predictions'] });

      const prev = queryClient.getQueryData(['prediction', predictionId]);

      const computeNewStats = (old: PredictionWithVote) => {
        const newYes = choice ? old.yes_count + 1 : old.yes_count;
        const newNo  = !choice ? old.no_count + 1 : old.no_count;
        const total  = newYes + newNo;
        return {
          ...old,
          yes_count: newYes,
          no_count:  newNo,
          yes_pct:   total > 0 ? Math.round((newYes / total) * 100) : 50,
          no_pct:    total > 0 ? Math.round((newNo  / total) * 100) : 50,
          userVote:  { prediction_id: predictionId, choice, is_correct: null, score_delta: null },
        };
      };

      // Update single prediction cache
      queryClient.setQueryData(['prediction', predictionId], (old: PredictionWithVote | undefined) => {
        return old ? computeNewStats(old) : old;
      });

      // Update all prediction list caches
      queryClient.setQueriesData({ queryKey: ['predictions'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((p: PredictionWithVote) =>
            p.id === predictionId ? computeNewStats(p) : p
          ),
        };
      });

      return { prev };
    },

    onError: (_err, _choice, ctx) => {
      // Rollback on failure
      setLocalChoice(initialUserVote !== undefined ? (initialUserVote ?? null) : null);
      if (ctx?.prev) {
        queryClient.setQueryData(['prediction', predictionId], ctx.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prediction', predictionId] });
    },
  });

  const vote = useCallback(
    (choice: boolean) => {
      if (!token || localChoice !== null || mutation.isPending) return;
      mutation.mutate(choice);
    },
    [mutation, token, localChoice]
  );

  return {
    vote,
    userChoice: localChoice,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
