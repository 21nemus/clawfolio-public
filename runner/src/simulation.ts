import { createPublicClient, http } from 'viem';
import { RunnerConfig } from './config.js';
import { RunnerDb, BotStateRow, BotTradeRow, LeaderboardRow, LatestPerfRow, PerfRow } from './db.js';
import { BotRegistryABI } from './abi/BotRegistry.js';
import { BotAccountABI } from './abi/BotAccount.js';
import { ERC20ABI } from './abi/ERC20.js';
import { decodeMetadataURI, retry } from './utils.js';

interface TickResult {
  indexedBots: number;
  updatedPerf: number;
  ts: number;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function decisionFromSignal(signal: number): 'BUY' | 'SELL' | 'HOLD' {
  if (signal > 0.35) return 'BUY';
  if (signal < -0.35) return 'SELL';
  return 'HOLD';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class RunnerService {
  private readonly config: RunnerConfig;
  private readonly db: RunnerDb;
  private readonly client: ReturnType<typeof createPublicClient>;

  constructor(config: RunnerConfig, db: RunnerDb) {
    this.config = config;
    this.db = db;
    this.client = createPublicClient({
      transport: http(this.config.rpcHttpUrl),
    });
  }

  async tick(): Promise<TickResult> {
    const ts = Date.now();
    const nowSeconds = Math.floor(ts / 1000);
    let indexedBots = 0;
    let updatedPerf = 0;

    const latestBlock = await retry(() => this.client.getBlockNumber());
    const botCount = await retry(() =>
      this.client.readContract({
        address: this.config.botRegistry,
        abi: BotRegistryABI,
        functionName: 'botCount',
      })
    ) as bigint;

    const maxBots = this.config.maxBots ? Math.min(Number(botCount), this.config.maxBots) : Number(botCount);

    for (let botId = 0; botId < maxBots; botId++) {
      try {
        const botIdBig = BigInt(botId);
        const [botAccount, metadataURI] = await Promise.all([
          retry(() =>
            this.client.readContract({
              address: this.config.botRegistry,
              abi: BotRegistryABI,
              functionName: 'botAccountOf',
              args: [botIdBig],
            })
          ) as Promise<`0x${string}`>,
          retry(() =>
            this.client.readContract({
              address: this.config.botRegistry,
              abi: BotRegistryABI,
              functionName: 'metadataURI',
              args: [botIdBig],
            })
          ) as Promise<string>,
        ]);

        if (botAccount === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        let tokenAddress = '0x0000000000000000000000000000000000000000';
        try {
          tokenAddress = await retry(() =>
            this.client.readContract({
              address: this.config.botRegistry,
              abi: BotRegistryABI,
              functionName: 'botTokenOf',
              args: [botIdBig],
            })
          ) as `0x${string}`;
        } catch {
          // Optional depending on deployed registry version.
        }

        const metadata = decodeMetadataURI(metadataURI);
        const name = (metadata?.name as string | undefined) ?? null;
        const handle = (metadata?.handle as string | undefined) ?? null;

        let tokenSymbol: string | null = null;
        const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';
        if (hasToken) {
          try {
            tokenSymbol = await retry(() =>
              this.client.readContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'symbol',
              })
            ) as string;
          } catch {
            tokenSymbol = null;
          }
        }

        const [paused, lifecycleState, nonce] = await Promise.all([
          retry(() =>
            this.client.readContract({
              address: botAccount,
              abi: BotAccountABI,
              functionName: 'paused',
            })
          ) as Promise<boolean>,
          retry(() =>
            this.client.readContract({
              address: botAccount,
              abi: BotAccountABI,
              functionName: 'lifecycleState',
            })
          ) as Promise<number>,
          retry(() =>
            this.client.readContract({
              address: botAccount,
              abi: BotAccountABI,
              functionName: 'nonce',
            })
          ) as Promise<bigint>,
        ]);

        let maxAmountInPerTradeMon = 1;
        let minSecondsBetweenTrades = this.config.tradeMinCooldownSeconds;
        try {
          const riskParams = await retry(() =>
            this.client.readContract({
              address: botAccount,
              abi: BotAccountABI,
              functionName: 'riskParams',
            })
          ) as { maxAmountInPerTrade: bigint; minSecondsBetweenTrades: bigint };
          maxAmountInPerTradeMon = Number(riskParams.maxAmountInPerTrade) / 1e18;
          minSecondsBetweenTrades = Number(riskParams.minSecondsBetweenTrades);
        } catch {
          // Some deployments may not expose riskParams; fallback keeps simulation deterministic.
        }

        const previousState = await this.db.get<BotStateRow>(
          `SELECT botId, botAccount, name, handle, hasToken, tokenAddress, tokenSymbol, lifecycleState, paused, cooldownSeconds
           FROM bot_state WHERE botId = ?`,
          [String(botId)]
        );

        const cooldownSeconds = Number.isFinite(minSecondsBetweenTrades) && minSecondsBetweenTrades > 0
          ? Math.floor(minSecondsBetweenTrades)
          : this.config.tradeMinCooldownSeconds;
        await this.db.exec(
          `INSERT INTO bot_state (botId, botAccount, name, handle, hasToken, tokenAddress, tokenSymbol, lifecycleState, paused, cooldownSeconds, updatedTs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(botId) DO UPDATE SET
             botAccount=excluded.botAccount,
             name=excluded.name,
             handle=excluded.handle,
             hasToken=excluded.hasToken,
             tokenAddress=excluded.tokenAddress,
             tokenSymbol=excluded.tokenSymbol,
             lifecycleState=excluded.lifecycleState,
             paused=excluded.paused,
             cooldownSeconds=excluded.cooldownSeconds,
             updatedTs=excluded.updatedTs`,
          [
            String(botId),
            botAccount,
            name,
            handle,
            hasToken ? 1 : 0,
            hasToken ? tokenAddress : null,
            tokenSymbol,
            lifecycleState,
            paused ? 1 : 0,
            cooldownSeconds,
            nowSeconds,
          ]
        );

        let activityEvent = 'Heartbeat';
        if (previousState) {
          if (previousState.lifecycleState !== lifecycleState) {
            activityEvent = 'LifecycleChanged';
          } else if (Boolean(previousState.paused) !== paused) {
            activityEvent = 'PausedUpdated';
          } else {
            const prevNonce = await this.db.get<{ value: string }>(
              'SELECT value FROM runner_state WHERE key = ?',
              [`nonce:${botId}`]
            );
            if (prevNonce && BigInt(prevNonce.value) < nonce) {
              activityEvent = 'TradeExecuted';
            }
          }
        }

        await this.db.exec(
          `INSERT INTO bot_last_activity (botId, ts, eventName, blockNumber, txHash)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(botId) DO UPDATE SET
             ts=excluded.ts,
             eventName=excluded.eventName,
             blockNumber=excluded.blockNumber,
             txHash=excluded.txHash`,
          [String(botId), nowSeconds, activityEvent, Number(latestBlock), `sim-${botId}-${nowSeconds}`]
        );

        await this.db.exec(
          `INSERT INTO runner_state (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
          [`nonce:${botId}`, nonce.toString()]
        );

        const latestPerf = await this.db.get<LatestPerfRow>(
          `SELECT botId, ts, equity, pnl, pnlPct, trades, mode
           FROM bot_perf
           WHERE botId = ?
           ORDER BY ts DESC
           LIMIT 1`,
          [String(botId)]
        );

        const previousEquity = latestPerf?.equity ?? 100.0;
        const previousTrades = latestPerf?.trades ?? 0;

        const tickBucket = Math.floor(nowSeconds / this.config.tickIntervalSeconds);
        const random = mulberry32(hashSeed(`${this.config.chainId}:${botId}:${tickBucket}`));
        const baseSignal = (random() * 2) - 1;

        const riskScaleFromAmount = clamp(maxAmountInPerTradeMon / 2, 0.25, 1);
        const riskScaleFromCooldown = clamp(300 / Math.max(cooldownSeconds, 1), 0.25, 1);
        const riskScale = clamp((riskScaleFromAmount + riskScaleFromCooldown) / 2, 0.25, 1);

        const rawDeltaPct = baseSignal * 0.005 * riskScale;
        const deltaPct = clamp(rawDeltaPct, -0.005, 0.005);
        const nextEquity = clamp(previousEquity * (1 + deltaPct), 1, 500);

        const lastTrade = await this.db.get<{ ts: number }>(
          `SELECT ts FROM bot_trades WHERE botId = ? ORDER BY ts DESC, id DESC LIMIT 1`,
          [String(botId)]
        );
        const cooldownElapsed = !lastTrade || (nowSeconds - lastTrade.ts) >= cooldownSeconds;

        let decision = decisionFromSignal(baseSignal);
        let reason = 'No strong signal, hold position.';
        if (decision === 'BUY') reason = 'Positive simulated momentum within risk bounds.';
        if (decision === 'SELL') reason = 'Negative simulated momentum to reduce exposure.';
        if (paused || lifecycleState === 0) {
          decision = 'HOLD';
          reason = paused ? 'Agent paused onchain.' : 'Agent not active yet.';
        }

        const tradeChance = random();
        const canExecuteTrade = !paused && lifecycleState !== 0 && decision !== 'HOLD' && cooldownElapsed;
        const shouldTrade = canExecuteTrade && tradeChance < this.config.tradeProb;
        if (!cooldownElapsed && decision !== 'HOLD') {
          reason = `Cooldown active (${cooldownSeconds}s), waiting for next window.`;
        } else if (!shouldTrade && decision !== 'HOLD') {
          reason = `Signal observed but skipped by deterministic gate (p=${this.config.tradeProb.toFixed(2)}).`;
        }

        const trades = previousTrades + (shouldTrade ? 1 : 0);
        const pnl = nextEquity - 100.0;
        const pnlPct = pnl;

        await this.db.exec(
          `INSERT OR REPLACE INTO bot_perf (botId, ts, equity, pnl, pnlPct, trades, mode)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [String(botId), nowSeconds, nextEquity, pnl, pnlPct, trades, 'simulation']
        );

        await this.db.exec(
          `INSERT INTO bot_decisions (botId, ts, decision, reason, meta)
           VALUES (?, ?, ?, ?, ?)`,
          [
            String(botId),
            nowSeconds,
            decision,
            reason,
            JSON.stringify({
              signal: Number(baseSignal.toFixed(4)),
              deltaPct: Number((deltaPct * 100).toFixed(4)),
              cooldownSeconds,
              riskScale: Number(riskScale.toFixed(4)),
              cooldownElapsed,
              tradeProbability: this.config.tradeProb,
              tradeChance: Number(tradeChance.toFixed(4)),
              tradeExecuted: shouldTrade,
            }),
          ]
        );

        if (shouldTrade) {
          const qty = 1 + Math.floor(random() * 10);
          const drift = (random() - 0.5) * 0.08;
          const price = clamp(1 + drift, 0.8, 1.2);
          await this.db.exec(
            `INSERT INTO bot_trades (botId, ts, side, qty, price, reason, meta)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              String(botId),
              nowSeconds,
              decision,
              qty,
              Number(price.toFixed(4)),
              reason,
              JSON.stringify({
                signal: Number(baseSignal.toFixed(4)),
                cooldownSeconds,
                tickBucket,
              }),
            ]
          );
        }

        indexedBots += 1;
        updatedPerf += 1;
      } catch (error) {
        console.error(`[runner] tick failed for bot ${botId}:`, error);
      }
    }

    await this.db.exec(
      `INSERT INTO runner_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      ['lastTickTs', String(nowSeconds)]
    );
    await this.db.exec(
      `INSERT INTO runner_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      ['latestBlock', String(latestBlock)]
    );

    return {
      indexedBots,
      updatedPerf,
      ts: nowSeconds,
    };
  }

  async getHealth() {
    const lastTick = await this.db.get<{ value: string }>('SELECT value FROM runner_state WHERE key = ?', ['lastTickTs']);
    const latestBlock = await this.db.get<{ value: string }>('SELECT value FROM runner_state WHERE key = ?', ['latestBlock']);

    return {
      ok: true,
      ts: Math.floor(Date.now() / 1000),
      chainId: this.config.chainId,
      dbPath: this.config.dbPath,
      mode: this.db.getMode(),
      lastTickTs: lastTick ? Number(lastTick.value) : null,
      latestBlock: latestBlock ? Number(latestBlock.value) : null,
      version: '0.2.0-sim',
    };
  }

  async getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
    return await this.db.all<LeaderboardRow>(
      `SELECT
         bs.botId as botId,
         bs.name as name,
         bs.handle as handle,
         bs.hasToken as hasToken,
         bs.tokenSymbol as tokenSymbol,
         bp.pnlPct as pnlPct,
         bp.pnl as pnl,
         bp.trades as trades,
         (SELECT bd.ts FROM bot_decisions bd WHERE bd.botId = bs.botId ORDER BY bd.ts DESC LIMIT 1) as lastDecisionTs,
         bla.ts as lastActivityTs
       FROM bot_state bs
       LEFT JOIN bot_last_activity bla ON bla.botId = bs.botId
       LEFT JOIN bot_perf bp ON bp.botId = bs.botId
       INNER JOIN (
         SELECT botId, MAX(ts) as maxTs
         FROM bot_perf
         GROUP BY botId
       ) latest ON latest.botId = bp.botId AND latest.maxTs = bp.ts
       ORDER BY bp.pnlPct DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getBotPerf(botId: string, limit = 200): Promise<{ latest: LatestPerfRow | null; series: PerfRow[] }> {
    const latest = await this.db.get<LatestPerfRow>(
      `SELECT botId, ts, equity, pnl, pnlPct, trades, mode
       FROM bot_perf
       WHERE botId = ?
       ORDER BY ts DESC
       LIMIT 1`,
      [botId]
    );
    const series = await this.db.all<PerfRow>(
      `SELECT ts, equity, pnl, pnlPct, trades, mode
       FROM bot_perf
       WHERE botId = ?
       ORDER BY ts DESC
       LIMIT ?`,
      [botId, limit]
    );

    return { latest: latest ?? null, series: series.reverse() };
  }

  async getBotTrades(botId: string, limit = 50): Promise<BotTradeRow[]> {
    return this.db.all<BotTradeRow>(
      `SELECT id, botId, ts, side, qty, price, reason, meta
       FROM bot_trades
       WHERE botId = ?
       ORDER BY ts DESC, id DESC
       LIMIT ?`,
      [botId, limit]
    );
  }
}

