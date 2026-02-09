import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RunnerConfig } from './config.js';
import { BotMetrics } from './types.js';

export function generateLeaderboard(config: RunnerConfig): void {
  console.log('🏆 Generating leaderboard...\n');

  const metricsDir = join(config.outDir, 'metrics');

  try {
    const files = readdirSync(metricsDir).filter((f) => f.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('❌ No metrics found. Run npm run index first.');
      return;
    }

    const bots: BotMetrics[] = files.map((file) => {
      const path = join(metricsDir, file);
      return JSON.parse(readFileSync(path, 'utf-8'));
    });

    // Sort bots
    const sorted = bots.sort((a, b) => {
      // If both have PnL estimates, sort by PnL
      if (a.pnl.mode === 'estimated' && b.pnl.mode === 'estimated') {
        const aPnl = a.pnl.pnlBase ? BigInt(a.pnl.pnlBase.raw) : 0n;
        const bPnl = b.pnl.pnlBase ? BigInt(b.pnl.pnlBase.raw) : 0n;
        if (aPnl !== bPnl) return Number(bPnl - aPnl);
      }

      // Otherwise sort by trade count
      return b.tradeCount - a.tradeCount;
    });

    // Print console table
    console.log('┌───────────────────────────────────────────────────────────┐');
    console.log('│                       LEADERBOARD                          │');
    console.log('├────────┬────────────┬─────────────────────────────────────┤');
    console.log('│ Bot ID │ Trades     │ Value / PnL                          │');
    console.log('├────────┼────────────┼─────────────────────────────────────┤');

    sorted.forEach((bot, index) => {
      const rank = (index + 1).toString().padStart(2);
      const botId = bot.botId.toString().padEnd(6);
      const trades = bot.tradeCount.toString().padEnd(10);
      
      let valuePnl = 'N/A';
      if (bot.pnl.mode === 'estimated' && bot.pnl.currentValueBase) {
        valuePnl = `${bot.pnl.currentValueBase.formatted} ${bot.pnl.baseSymbol}`;
        if (bot.pnl.pnlBase) {
          const pnlNum = BigInt(bot.pnl.pnlBase.raw);
          const sign = pnlNum >= 0n ? '+' : '';
          valuePnl += ` (${sign}${bot.pnl.pnlBase.formatted})`;
        }
      } else if (bot.balances.length > 0) {
        // Show first balance as fallback
        valuePnl = `${bot.balances[0].formatted} ${bot.balances[0].symbol}`;
      }

      console.log(`│ ${rank}. ${botId} │ ${trades} │ ${valuePnl.padEnd(35)} │`);
    });

    console.log('└────────┴────────────┴─────────────────────────────────────┘');

    // Save leaderboard JSON
    const outPath = join(config.outDir, 'leaderboard.json');
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          count: sorted.length,
          bots: sorted.map((bot, index) => ({
            rank: index + 1,
            botId: bot.botId,
            botAccount: bot.botAccount,
            tradeCount: bot.tradeCount,
            pnlMode: bot.pnl.mode,
            currentValue: bot.pnl.currentValueBase?.formatted,
            pnl: bot.pnl.pnlBase?.formatted,
            baseSymbol: bot.pnl.baseSymbol,
          })),
        },
        null,
        2
      )
    );

    console.log(`\n✅ Leaderboard saved to ${outPath}`);
  } catch (error) {
    console.error('❌ Failed to generate leaderboard:', error);
  }
}
