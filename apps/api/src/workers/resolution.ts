/**
 * Resolution Worker — processes prediction resolution and score recalculation
 * Uses BullMQ. Run as a separate process: `node dist/workers/resolution.js`
 */
import { Worker, Job } from 'bullmq';
import { db } from '../services/db';
import { updateLeaderboard } from '../services/redis';
import { redis } from '../services/redis';
import 'dotenv/config';

const connection = redis;

// ─── VOTE WRITE WORKER ────────────────────────────────────
// Writes votes from Redis to Postgres asynchronously
const voteWorker = new Worker(
  'votes',
  async (job: Job) => {
    const { user_id, prediction_id, choice, yes_count, no_count } = job.data;

    // Write vote record to Postgres
    const { error: voteError } = await db.from('votes').insert({
      user_id,
      prediction_id,
      choice,
    });

    if (voteError && voteError.code !== '23505') { // 23505 = unique violation (already voted)
      throw new Error(`Vote write failed: ${voteError.message}`);
    }

    // Sync vote counts from Redis to Postgres
    await db
      .from('predictions')
      .update({ yes_count, no_count })
      .eq('id', prediction_id);

    console.log(`[VoteWorker] Vote written: user=${user_id} pred=${prediction_id} choice=${choice}`);
  },
  { connection, concurrency: 20 }
);

// ─── SCORE RECALCULATION WORKER ──────────────────────────
// Recalculates user score and updates leaderboard after resolution
const scoreWorker = new Worker(
  'resolution',
  async (job: Job) => {
    const { userId, predictionId } = job.data;

    // Call the Postgres function that recalculates score
    const { error } = await db.rpc('recalculate_user_score', { p_user_id: userId });

    if (error) {
      throw new Error(`Score recalc failed for ${userId}: ${error.message}`);
    }

    // Get updated score and sync to Redis leaderboard
    const { data: user } = await db
      .from('users')
      .select('id, predict_score, tier')
      .eq('id', userId)
      .single();

    if (user) {
      await updateLeaderboard(userId, user.predict_score);

      // Send push notification
      await sendScoreNotification(userId, predictionId, user.predict_score);
    }

    console.log(`[ScoreWorker] Score recalculated: user=${userId} score=${user?.predict_score}`);
  },
  { connection, concurrency: 10 }
);

async function sendScoreNotification(userId: string, predictionId: string, newScore: number) {
  // Insert notification record
  await db.from('notifications').insert({
    user_id:  userId,
    type:     'prediction_resolved',
    title:    'Prediction resolved!',
    body:     `Your score is now ${newScore}`,
    payload:  { predictionId, newScore },
  });

  // OneSignal push notification (add API key to env)
  const oneSignalKey = process.env.ONESIGNAL_API_KEY;
  const oneSignalApp = process.env.ONESIGNAL_APP_ID;

  if (oneSignalKey && oneSignalApp) {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${oneSignalKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id:   oneSignalApp,
        filters:  [{ field: 'tag', key: 'user_id', relation: '=', value: userId }],
        headings: { en: '🎯 Prediction Resolved!' },
        contents: { en: `Check your PredictScore — it's been updated!` },
        data:     { predictionId },
      }),
    });
  }
}

// ─── ERROR HANDLERS ───────────────────────────────────────
voteWorker.on('failed', (job, err) => {
  console.error(`[VoteWorker] Job ${job?.id} failed:`, err.message);
});

scoreWorker.on('failed', (job, err) => {
  console.error(`[ScoreWorker] Job ${job?.id} failed:`, err.message);
});

console.log('🔧 Workers started: votes + resolution');
