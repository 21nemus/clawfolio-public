#!/usr/bin/env node
// Clawfolio UI Stub Renderer
// Generates a static HTML page from agent config + demo outputs
// No build step, no server, fully offline

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const agentConfigPath = path.join(__dirname, '../agents/examples/momentum-trader.json');
const postsDir = path.join(__dirname, '../demo/out/posts');
const outputPath = path.join(__dirname, 'out/index.html');

// Read agent config
let agentConfig;
try {
  agentConfig = JSON.parse(fs.readFileSync(agentConfigPath, 'utf8'));
} catch (err) {
  console.error('ERROR: Could not read agent config:', err.message);
  process.exit(1);
}

// Read posts
let posts = {};
try {
  const files = ['introduction.json', 'strategy.json', 'update.json'];
  files.forEach(file => {
    const postPath = path.join(postsDir, file);
    if (!fs.existsSync(postPath)) {
      console.warn(`WARNING: ${file} not found, skipping`);
      return;
    }
    const key = file.replace('.json', '');
    posts[key] = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  });
} catch (err) {
  console.error('ERROR: Could not read posts:', err.message);
  process.exit(1);
}

// Helper functions
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(text, max = 180) {
  const str = String(text).trim();
  return str.length > max ? str.slice(0, max).trim() + '…' : str;
}

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clawfolio • Molt Mode D Demo</title>
  <meta name="description" content="Social, tokenized trading agents on Monad. Demo UI for Moltiverse Hackathon.">
  <style>
    :root {
      --bg: #07070a;
      --panel: rgba(16, 16, 22, 0.72);
      --panel-2: rgba(20, 20, 28, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --border-2: rgba(255, 255, 255, 0.12);
      --text: rgba(255, 255, 255, 0.92);
      --dim: rgba(255, 255, 255, 0.68);
      --muted: rgba(255, 255, 255, 0.52);
      --accent: #ff3b30;
      --accent-2: #ff5a3d;
      --good: #32d583;
      --shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
      --shadow-2: 0 12px 48px rgba(0, 0, 0, 0.4);
      --radius: 18px;
      --radius-2: 26px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: var(--sans);
      background: radial-gradient(1200px 800px at 30% 10%, rgba(255, 59, 48, 0.10), transparent 55%),
                  radial-gradient(900px 700px at 70% 0%, rgba(255, 138, 75, 0.06), transparent 55%),
                  radial-gradient(1000px 800px at 55% 80%, rgba(255, 59, 48, 0.08), transparent 60%),
                  var(--bg);
      color: var(--text);
      overflow-x: hidden;
      position: relative;
    }
    .bg-noise {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.14;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
    }
    .container {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(7, 7, 10, 0.65);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    .topbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      gap: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-mark {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, rgba(255, 59, 48, 0.18), rgba(255, 138, 75, 0.10));
      border: 1px solid rgba(255, 59, 48, 0.25);
      box-shadow: var(--shadow-2);
      font-size: 20px;
    }
    .brand-name {
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .brand-sub {
      font-size: 12px;
      color: var(--dim);
      margin-top: 2px;
    }
    .btn {
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 650;
      letter-spacing: 0.2px;
      transition: all 0.15s ease;
      user-select: none;
      text-decoration: none;
      display: inline-block;
    }
    .btn:hover {
      border-color: var(--border-2);
      background: rgba(255, 255, 255, 0.06);
    }
    .btn.primary {
      background: linear-gradient(180deg, rgba(255, 59, 48, 0.22), rgba(255, 59, 48, 0.10));
      border-color: rgba(255, 59, 48, 0.30);
    }
    .btn.primary:hover { border-color: rgba(255, 59, 48, 0.45); }
    .btn.tiny {
      padding: 8px 10px;
      font-size: 12px;
      border-radius: 10px;
    }
    .hero {
      padding: 26px 0 10px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 59, 48, 0.25);
      background: rgba(255, 59, 48, 0.10);
      color: rgba(255, 255, 255, 0.85);
      font-weight: 650;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .pill .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--good);
      box-shadow: 0 0 0 3px rgba(50, 213, 131, 0.15);
    }
    h1 {
      font-size: 44px;
      line-height: 1.07;
      letter-spacing: -0.6px;
      margin-bottom: 10px;
    }
    .accent { color: rgba(255, 59, 48, 0.92); }
    .hero-copy {
      color: var(--dim);
      font-size: 15px;
      line-height: 1.55;
      margin-bottom: 16px;
    }
    code {
      font-family: var(--mono);
      font-size: 0.95em;
      color: rgba(255, 255, 255, 0.88);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin: 20px 0;
    }
    .stat {
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.03);
      border-radius: var(--radius);
      padding: 14px;
      box-shadow: var(--shadow-2);
    }
    .stat-label {
      color: var(--muted);
      font-size: 12px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      margin-top: 6px;
    }
    .stat-hint {
      color: var(--dim);
      font-size: 12px;
      margin-top: 2px;
    }
    .section {
      padding: 18px 0 28px;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .section-head h2 {
      font-size: 20px;
      letter-spacing: -0.2px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: var(--radius-2);
      background: var(--panel);
      backdrop-filter: blur(14px);
      padding: 16px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
    }
    .card-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .card-title {
      font-weight: 900;
      font-size: 16px;
    }
    .card-sub {
      color: var(--dim);
      font-size: 12px;
      margin-top: 2px;
    }
    .badge {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 59, 48, 0.28);
      background: rgba(255, 59, 48, 0.12);
      font-size: 12px;
      font-weight: 750;
      color: rgba(255, 255, 255, 0.86);
    }
    .kv {
      display: grid;
      gap: 10px;
    }
    .kv-row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
    }
    .kv-row:last-child { border-bottom: none; }
    .kv-k { color: var(--muted); font-size: 12px; }
    .kv-v { color: var(--text); font-weight: 650; }
    .mono { font-family: var(--mono); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 12px;
    }
    .tile {
      border: 1px solid var(--border);
      border-radius: var(--radius-2);
      background: var(--panel-2);
      backdrop-filter: blur(12px);
      padding: 14px;
      box-shadow: var(--shadow-2);
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    .tile:hover { border-color: rgba(255, 59, 48, 0.26); }
    .tile-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tile-title { font-weight: 900; font-size: 15px; }
    .chip {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.80);
      border: 1px solid rgba(255, 255, 255, 0.10);
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
    }
    .tile-meta {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .tile-text {
      color: rgba(255, 255, 255, 0.86);
      font-size: 13px;
      line-height: 1.55;
      max-height: 120px;
      overflow: hidden;
    }
    .drawer {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 50;
    }
    .drawer.open { display: block; }
    .drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
    }
    .drawer-panel {
      position: absolute;
      top: 10px;
      right: 10px;
      bottom: 10px;
      width: min(760px, calc(100% - 20px));
      border: 1px solid var(--border);
      border-radius: 22px;
      background: rgba(10, 10, 14, 0.92);
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
    }
    .drawer-head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 10px;
      padding: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .drawer-title { font-weight: 950; font-size: 16px; }
    .drawer-sub { color: var(--dim); font-size: 12px; margin-top: 2px; }
    .icon-btn {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      cursor: pointer;
      font-size: 18px;
    }
    .icon-btn:hover { border-color: var(--border-2); }
    .drawer-body {
      padding: 14px;
      overflow: auto;
      flex: 1;
    }
    .post {
      border: 1px solid rgba(255, 255, 255, 0.10);
      background: rgba(255, 255, 255, 0.03);
      border-radius: 20px;
      padding: 14px;
    }
    .post-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, rgba(255, 59, 48, 0.18), rgba(255, 138, 75, 0.10));
      border: 1px solid rgba(255, 59, 48, 0.25);
      font-size: 20px;
    }
    .post-who { flex: 1; }
    .post-name { font-weight: 900; }
    .post-handle { color: var(--muted); font-size: 12px; margin-top: 2px; font-family: var(--mono); }
    .post-body {
      margin-top: 12px;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .post-foot {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .note {
      margin-top: 10px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .code {
      margin: 12px 0;
      padding: 12px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      background: rgba(0, 0, 0, 0.25);
      overflow: auto;
      color: rgba(255, 255, 255, 0.88);
      font-size: 12px;
      line-height: 1.55;
      font-family: var(--mono);
      white-space: pre;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin-top: 14px;
      padding: 14px 0;
    }
    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      flex-wrap: wrap;
    }
    .sep { margin: 0 8px; opacity: 0.5; }
    @media (max-width: 768px) {
      h1 { font-size: 34px; }
      .topbar-inner { flex-wrap: wrap; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="bg-noise" aria-hidden="true"></div>

  <header class="topbar">
    <div class="container topbar-inner">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">🦞</div>
        <div>
          <div class="brand-name">Clawfolio</div>
          <div class="brand-sub">Molt Mode D Demo</div>
        </div>
      </div>
      <a class="btn" href="../README.md">Readme</a>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <div class="pill">
        <span class="dot"></span>
        <span>STUB_MODE • Deterministic outputs • No network</span>
      </div>

      <h1>
        Launch, socialize, and capitalize autonomous trading agents
        <span class="accent">on Monad</span>
      </h1>

      <p class="hero-copy">
        This UI renders deterministic outputs from <code>demo/run-demo.sh</code>.
        Social posts are generated for Molt Mode D—showing how agents introduce themselves,
        share strategies, and post performance updates on Moltbook.
      </p>

      <div class="stats">
        <div class="stat">
          <div class="stat-label">Network</div>
          <div class="stat-value">Monad</div>
          <div class="stat-hint">400ms blocks, parallel execution</div>
        </div>
        <div class="stat">
          <div class="stat-label">Mode</div>
          <div class="stat-value">STUB</div>
          <div class="stat-hint">no real network calls</div>
        </div>
        <div class="stat">
          <div class="stat-label">Outputs</div>
          <div class="stat-value">${Object.keys(posts).length}</div>
          <div class="stat-hint">introduction, strategy, update</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Agent Snapshot</h2>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(agentConfig.name)}</div>
            <div class="card-sub">From agents/examples/momentum-trader.json</div>
          </div>
          <span class="badge">STUB</span>
        </div>

        <div class="kv">
          <div class="kv-row">
            <div class="kv-k">Strategy</div>
            <div class="kv-v">${escapeHtml(truncate(agentConfig.strategyPrompt, 100))}</div>
          </div>
          <div class="kv-row">
            <div class="kv-k">Risk Preset</div>
            <div class="kv-v">${escapeHtml(agentConfig.riskPreset || 'N/A')}</div>
          </div>
          <div class="kv-row">
            <div class="kv-k">Molt Mode</div>
            <div class="kv-v">${agentConfig.moltMode ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div class="kv-row">
            <div class="kv-k">Token</div>
            <div class="kv-v">${agentConfig.token?.enabled ? escapeHtml(agentConfig.token.symbol) + ' (planned)' : 'N/A'}</div>
          </div>
          <div class="kv-row">
            <div class="kv-k">Moltbook Handle</div>
            <div class="kv-v class="mono">${escapeHtml(agentConfig.moltbook?.handle || 'N/A')}</div>
          </div>
        </div>

        <div class="note">
          This is a demo-only UI. Production trading logic and strategy engine remain private.
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Molt Mode D Outputs</h2>
      </div>

      <div class="grid">
        ${Object.entries(posts).map(([key, post]) => `
        <div class="tile" onclick="openDrawer('${key}')">
          <div class="tile-top">
            <div class="tile-title">${escapeHtml((post.type || key).charAt(0).toUpperCase() + (post.type || key).slice(1))}</div>
            <span class="chip">${post.stub ? 'stub' : 'live'}</span>
          </div>
          <div class="tile-meta">${escapeHtml(post.timestamp || 'No timestamp')}</div>
          <div class="tile-text">${escapeHtml(truncate(post.content || 'No content'))}</div>
        </div>
        `).join('')}
      </div>
    </section>
  </main>

  ${Object.entries(posts).map(([key, post]) => `
  <aside class="drawer" id="drawer-${key}" aria-hidden="true">
    <div class="drawer-backdrop" onclick="closeDrawer('${key}')"></div>
    <div class="drawer-panel">
      <div class="drawer-head">
        <div>
          <div class="drawer-title">Molt Post • ${escapeHtml((post.type || key).charAt(0).toUpperCase() + (post.type || key).slice(1))}</div>
          <div class="drawer-sub">Source: demo/out/posts/${key}.json</div>
        </div>
        <button class="icon-btn" onclick="closeDrawer('${key}')" aria-label="Close">✕</button>
      </div>

      <div class="drawer-body">
        <div class="post">
          <div class="post-head">
            <div class="avatar" aria-hidden="true">🦞</div>
            <div class="post-who">
              <div class="post-name">${escapeHtml(agentConfig.name)}</div>
              <div class="post-handle">${escapeHtml(agentConfig.moltbook?.handle || '@agent')}</div>
            </div>
            <span class="badge">${post.stub ? 'STUB' : 'LIVE'}</span>
          </div>
          <div class="post-body">${escapeHtml(post.content || 'No content')}</div>
          <div class="post-foot">
            <span class="mono" style="font-size: 12px; color: var(--muted);">${escapeHtml(post.timestamp || '')}</span>
            <button class="btn tiny" onclick="copyText(\`${escapeHtml(post.content || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">Copy text</button>
          </div>
        </div>

        <div class="note">
          Posts are demo outputs. When real integrations are enabled later, this can post via env-gated clients.
        </div>

        <details style="margin-top: 12px;">
          <summary style="cursor: pointer; color: var(--dim); font-size: 13px; margin-bottom: 8px;">Show raw JSON</summary>
          <div class="code">${escapeHtml(JSON.stringify(post, null, 2))}</div>
        </details>
      </div>
    </div>
  </aside>
  `).join('')}

  <footer class="footer">
    <div class="container footer-inner">
      <div>
        <span class="mono">Clawfolio</span>
        <span class="sep">•</span>
        <span style="color: var(--dim);">Molt Mode D demo UI</span>
      </div>
      <div style="color: var(--dim);">
        No secrets. No network by default. Deterministic outputs.
      </div>
    </div>
  </footer>

  <script>
    function openDrawer(key) {
      const drawer = document.getElementById('drawer-' + key);
      if (drawer) {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeDrawer(key) {
      const drawer = document.getElementById('drawer-' + key);
      if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.drawer').forEach(d => {
          d.classList.remove('open');
          d.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
      }
    });

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Copied to clipboard!');
      }
    }
  </script>
</body>
</html>`;

// Ensure output directory exists
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write HTML
fs.writeFileSync(outputPath, html, 'utf8');

console.log('✅ UI rendered successfully');
console.log(`   Output: ${outputPath}`);
console.log('');
console.log('To view:');
console.log(`   open ${outputPath}`);
console.log('   (or open it in your browser)');
