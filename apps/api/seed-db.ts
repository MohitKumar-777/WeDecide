import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seed() {
  console.log('🌱 Final attempt inserting predictions...');

  const predictions = [
    {
      question: 'Will India win the 2026 Asia Cup?',
      description: 'The Men in Blue are defending champions.',
      category: 'Sports',
      status: 'open',
      yes_count: 4500,
      no_count: 1200,
      resolves_at: '2026-09-01T23:59:59Z',
    },
    {
      question: 'Will the current government win the 2029 general elections?',
      description: 'Speculation has already begun for the next big electoral battle.',
      category: 'Politics',
      status: 'open',
      yes_count: 5000,
      no_count: 4800,
      resolves_at: '2029-05-01T23:59:59Z',
    }
  ];

  const { data, error } = await supabase
    .from('predictions')
    .insert(predictions);

  if (error) {
    console.error('❌ Error inserting data:', error);
  } else {
    console.log('✅ Success! Initial predictions are now LIVE.');
  }
}

seed();
