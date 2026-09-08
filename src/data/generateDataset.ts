/**
 * CLI Generator: Generates pre-fused JSON dataset for UI mock stores
 */

import { collectComprehensiveDataset } from './index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('📡 [Vanguard Collector] Initializing multi-source data collection pipeline...');
  
  const dataset = await collectComprehensiveDataset();
  
  const outputDir = path.join(__dirname, 'mock');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');

  console.log(`✅ [Vanguard Collector] Successfully collected and fused dataset from 5 streams!`);
  console.log(`📊 Output written to: ${outputPath}`);
  console.log(`📈 Summary: Total Events: ${dataset.summaryMetrics.totalEvents} | Threat Level: ${dataset.threatLevel.toUpperCase()} | Critical: ${dataset.summaryMetrics.criticalCount} | Anomalies: ${dataset.summaryMetrics.anomaliesCount}`);
}

main().catch(err => {
  console.error('❌ [Vanguard Collector] Ingestion failed:', err);
  process.exit(1);
});
