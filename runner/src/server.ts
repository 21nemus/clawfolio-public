import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { RunnerDb } from './db.js';
import { RunnerService } from './simulation.js';

async function main() {
  const config = loadConfig();
  const db = await RunnerDb.init(config);
  const service = new RunnerService(config, db);
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', async (_req, res) => {
    try {
      const health = await service.getHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get('/leaderboard', async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit ?? '20');
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 20;
      const rows = await service.getLeaderboard(limit);
      res.json({
        ok: true,
        mode: 'simulation',
        count: rows.length,
        bots: rows.map((row) => ({
          botId: row.botId,
          name: row.name,
          handle: row.handle,
          hasToken: !!row.hasToken,
          tokenSymbol: row.tokenSymbol,
          pnlPct: row.pnlPct,
          pnl: row.pnl,
          trades: row.trades,
          lastDecisionTs: row.lastDecisionTs,
          lastActivityTs: row.lastActivityTs,
        })),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get('/bots/:botId/perf', async (req, res) => {
    try {
      const botId = req.params.botId;
      const rawLimit = Number(req.query.limit ?? '200');
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, rawLimit)) : 200;
      const perf = await service.getBotPerf(botId, limit);
      res.json({
        ok: true,
        botId,
        latest: perf.latest,
        series: perf.series,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/admin/tick', async (req, res) => {
    if (!config.adminToken) {
      res.status(403).json({ ok: false, error: 'RUNNER_ADMIN_TOKEN not configured' });
      return;
    }
    const token = req.header('X-Runner-Admin-Token');
    if (!token || token !== config.adminToken) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    try {
      const summary = await service.tick();
      res.json({ ok: true, ...summary });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  const server = app.listen(config.port, () => {
    console.log(`[runner] API listening on :${config.port}`);
    console.log(`[runner] DB: ${config.dbPath}`);
  });

  let interval: NodeJS.Timeout | null = null;
  if (!config.disableLoop) {
    try {
      const bootTick = await service.tick();
      console.log(
        `[runner] boot tick complete | bots=${bootTick.indexedBots} perf=${bootTick.updatedPerf} ts=${bootTick.ts}`
      );
    } catch (error) {
      console.error('[runner] boot tick failed:', error);
    }
    interval = setInterval(async () => {
      try {
        const result = await service.tick();
        console.log(
          `[runner] tick complete | bots=${result.indexedBots} perf=${result.updatedPerf} ts=${result.ts}`
        );
      } catch (error) {
        console.error('[runner] tick failed:', error);
      }
    }, config.tickIntervalSeconds * 1000);
  } else {
    console.log('[runner] loop disabled (RUNNER_DISABLE_LOOP=true)');
  }

  process.on('SIGINT', async () => {
    if (interval) clearInterval(interval);
    server.close();
    await db.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    if (interval) clearInterval(interval);
    server.close();
    await db.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('[runner] fatal:', error);
  process.exit(1);
});

