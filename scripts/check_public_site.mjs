#!/usr/bin/env node
// 公開前檢查：site/ 只能有通用介面，不能有私人教材、進度、健康自述、真實聊天網址、金鑰或追蹤。
// Public-boundary check for everything deployed from site/. Run: node scripts/check_public_site.mjs
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = fileURLToPath(new URL("../site/", import.meta.url));
const repoDir = fileURLToPath(new URL("../", import.meta.url));
const allowedExt = new Set([".html", ".css", ".mjs", ".js", ".webmanifest", ".png", ".svg", ".ico", ".txt"]);
const problems = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const forbidden = [
  [/ADHD|過動|心盲|aphantasia|診斷/i, "health / diagnosis wording"],
  [/答對\s*\d|Day\s?[01]\b|接續卡內容|learning-state\//i, "learning progress or teacher state"],
  [/answer_keys|initial_state|teacher\//i, "teacher/private data reference"],
  [/chatgpt\.com\/c\/(?!EXAMPLE|CONVERSATION_ID|\.\.\.)[A-Za-z0-9-]{6,}/, "looks like a real conversation URL"],
  [/sk-[A-Za-z0-9]{16,}|api[_-]?key\s*[:=]/i, "API key"],
  [/google-analytics|gtag\(|googletagmanager|plausible|sentry|mixpanel|segment\.io/i, "analytics / telemetry"],
  [/\bfetch\(|XMLHttpRequest|sendBeacon|<iframe/i, "network call or iframe"],
  [/<script[^>]+src="https?:|<link[^>]+href="https?:|@import\s+url\(\s*["']?https?:/i, "external resource"]
];

for (const file of await walk(siteDir)) {
  const rel = file.slice(repoDir.length);
  const ext = extname(file);
  if (!allowedExt.has(ext)) { problems.push(`${rel}: file type ${ext || "(none)"} not expected in public site`); continue; }
  if (ext === ".png" || ext === ".ico") continue;
  const body = await readFile(file, "utf8");
  for (const [re, label] of forbidden) if (re.test(body)) problems.push(`${rel}: ${label} (${re})`);
}

// 私人材料不應出現在整個公開倉庫。
for (const file of await walk(repoDir)) {
  const rel = file.slice(repoDir.length);
  if (rel.startsWith(".git/") || rel.startsWith("node_modules/")) continue;
  if (/聖經|合併啟動包|initial_state|answer_keys|coach_notes|teacher\//.test(rel))
    problems.push(`${rel}: private teaching material must not be committed to this public repo`);
}

if (problems.length) {
  console.error("FAIL: public boundary problems:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("PASS: site/ has only generic UI; no private materials, real chat IDs, keys, trackers, external resources or network calls.");
