import 'dotenv/config'; // MUST BE FIRST
import { runMarketMaker } from './src/services/marketMaker';

async function main() {
  console.log('🚀 Triggering Live AI Market Maker with real keys...');
  const result = await runMarketMaker();
  console.log(`✅ Done! Created ${result.createdCount} live predictions from real news.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed to run Market Maker:', err);
  process.exit(1);
});
