#!/usr/bin/env node

import { loadConfig } from './config.js';
import { indexAllBots } from './indexer.js';
import { generateMetrics } from './metrics.js';
import { runBot, runAllBots } from './runner.js';
import { generateLeaderboard } from './leaderboard.js';

const command = process.argv[2];
const args = process.argv.slice(3);

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      }
    }
  }
  return parsed;
}

async function main() {
  console.log('🦀 Clawfolio Runner\n');

  try {
    const config = loadConfig();

    switch (command) {
      case 'index':
        await indexAllBots(config);
        await generateMetrics(config);
        break;

      case 'run': {
        const parsed = parseArgs(args);
        const botId = parsed.botId;
        if (!botId) {
          console.error('❌ Missing --botId argument');
          console.log('\nUsage: npm run run -- --botId <id>');
          process.exit(1);
        }
        await runBot(config, parseInt(botId));
        break;
      }

      case 'run-all':
        await runAllBots(config);
        break;

      case 'leaderboard':
        generateLeaderboard(config);
        break;

      default:
        console.log('Available commands:');
        console.log('  npm run index      - Index bot events and generate metrics');
        console.log('  npm run run -- --botId <id>  - Dry-run single bot');
        console.log('  npm run run-all    - Dry-run all bots');
        console.log('  npm run leaderboard - Generate leaderboard');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
