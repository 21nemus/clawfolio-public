import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import type sqlite3 from 'sqlite3';
import { open, type Database as SqliteDatabase } from 'sqlite';
import type { RunnerConfig } from './config.js';

type BetterDb = BetterSqlite3Database;
type SqliteDb = SqliteDatabase<sqlite3.Database, sqlite3.Statement>;

type DbMode = 'better-sqlite3' | 'sqlite3';

export interface RunSummary {
  indexedBots: number;
  updatedPerf: number;
  ts: number;
}

export interface LeaderboardRow {
  botId: string;
  name: string | null;
  handle: string | null;
  hasToken: number;
  tokenSymbol: string | null;
  pnlPct: number;
  pnl: number;
  trades: number;
  lastDecisionTs: number | null;
  lastActivityTs: number | null;
}

export interface PerfRow {
  ts: number;
  equity: number;
  pnl: number;
  pnlPct: number;
  trades: number;
  mode: string;
}

export interface LatestPerfRow extends PerfRow {
  botId: string;
}

export interface BotStateRow {
  botId: string;
  botAccount: string;
  name: string | null;
  handle: string | null;
  hasToken: number;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  lifecycleState: number | null;
  paused: number;
  cooldownSeconds: number | null;
}

function ensureDbDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

export class RunnerDb {
  private mode: DbMode;
  private betterDb: BetterDb | null = null;
  private sqliteDb: SqliteDb | null = null;

  private constructor(mode: DbMode) {
    this.mode = mode;
  }

  static async init(config: RunnerConfig): Promise<RunnerDb> {
    ensureDbDir(config.dbPath);

    try {
      const mod = await import('better-sqlite3');
      const Better = mod.default;
      const db = new RunnerDb('better-sqlite3');
      db.betterDb = new Better(config.dbPath);
      db.betterDb.pragma('journal_mode = WAL');
      db.betterDb.pragma('synchronous = NORMAL');
      await db.migrate();
      return db;
    } catch (error) {
      // Fallback for environments where better-sqlite3 native build is unavailable.
      console.warn('[runner] better-sqlite3 unavailable, falling back to sqlite3:', error);
      const db = new RunnerDb('sqlite3');
      const sqlite3Mod = await import('sqlite3');
      db.sqliteDb = await open({
        filename: config.dbPath,
        driver: sqlite3Mod.Database,
      });
      await db.sqliteDb.exec('PRAGMA journal_mode = WAL;');
      await db.sqliteDb.exec('PRAGMA synchronous = NORMAL;');
      await db.migrate();
      return db;
    }
  }

  getMode(): DbMode {
    return this.mode;
  }

  async close(): Promise<void> {
    if (this.betterDb) {
      this.betterDb.close();
      return;
    }
    if (this.sqliteDb) {
      await this.sqliteDb.close();
    }
  }

  async migrate(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS runner_state (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS bot_state (
        botId TEXT PRIMARY KEY,
        botAccount TEXT NOT NULL,
        name TEXT,
        handle TEXT,
        hasToken INTEGER NOT NULL DEFAULT 0,
        tokenAddress TEXT,
        tokenSymbol TEXT,
        lifecycleState INTEGER,
        paused INTEGER NOT NULL DEFAULT 0,
        cooldownSeconds INTEGER,
        updatedTs INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bot_last_activity (
        botId TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        eventName TEXT NOT NULL,
        blockNumber INTEGER NOT NULL,
        txHash TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bot_perf (
        botId TEXT NOT NULL,
        ts INTEGER NOT NULL,
        equity REAL NOT NULL,
        pnl REAL NOT NULL,
        pnlPct REAL NOT NULL,
        trades INTEGER NOT NULL,
        mode TEXT NOT NULL,
        PRIMARY KEY(botId, ts)
      )`,
      `CREATE TABLE IF NOT EXISTS bot_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        botId TEXT NOT NULL,
        ts INTEGER NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        meta TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bot_perf_bot_ts ON bot_perf(botId, ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_bot_decisions_bot_ts ON bot_decisions(botId, ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_bot_state_updated ON bot_state(updatedTs DESC)`,
    ];

    for (const stmt of statements) {
      await this.exec(stmt);
    }
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    if (this.betterDb) {
      this.betterDb.prepare(sql).run(...params);
      return;
    }
    if (!this.sqliteDb) throw new Error('Database not initialized');
    await this.sqliteDb.run(sql, params);
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    if (this.betterDb) {
      return this.betterDb.prepare(sql).get(...params) as T | undefined;
    }
    if (!this.sqliteDb) throw new Error('Database not initialized');
    return (await this.sqliteDb.get<T>(sql, params)) ?? undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (this.betterDb) {
      return this.betterDb.prepare(sql).all(...params) as T[];
    }
    if (!this.sqliteDb) throw new Error('Database not initialized');
    return (await this.sqliteDb.all(sql, params)) as T[];
  }
}

