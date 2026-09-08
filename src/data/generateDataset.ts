/**
 * CLI Generator: Generates pre-fused JSON dataset for UI mock stores
 */

import { fetchAllVanguardStreams } from './dataAdapter';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('📡 [Vanguard Collector] Initializing multi-source data collection pipeline...');
  
  const dataset = await fetchAllVanguardStreams();
  
  const outputDir = path.join(__dirname, 'mock');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');

  console.log(`✅ [Vanguard Collector] Successfully collected dataset!`);
  console.log(`📊 Output written to: ${outputPath}`);
}

main().catch(err => {
  console.error('❌ [Vanguard Collector] Ingestion failed:', err);
  process.exit(1);
});
