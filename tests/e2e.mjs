#!/usr/bin/env node
// 瀏覽器流程測試（Chromium 手機寬度）。不是 iPhone Safari 實機測試。
// Browser flow tests. Run: npm install && npx playwright install chromium && npm run test:e2e
// chatgpt.com 的請求全部被攔截成假頁面；不會連到真的 ChatGPT。
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const siteDir = fileURLToPath(new URL("../site/", import.meta.url));
const shotDir = process.env.SCREENSHOT_DIR || null;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".mjs": "text/javascript",
  ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(siteDir, path));
  if (!file.startsWith(siteDir)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end("not found"); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const KEY = "weichuan-language-door:v1";
const KNOWN = "https://chatgpt.com/c/EXAMPLE_01?view=example#section";
const UNKNOWN = "https://chatgpt.com/g/EXAMPLE_PROJECT/c/EXAMPLE_01";

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let passed = 0;
async function test(name, fn, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, ...options });
  await context.route("https://chatgpt.com/**", route =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>fake chatgpt</title><p>fake classroom</p>" }));
  const page = await context.newPage();
  try { await fn(page, context); passed++; console.log(`ok - ${name}`); }
  catch (error) { console.error(`FAIL - ${name}`); throw error; }
  finally { await context.close(); }
}
const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true }); };
const noHorizontalOverflow = async page => {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(sw <= cw, `horizontal overflow: scrollWidth ${sw} > clientWidth ${cw}`);
};
const interactiveCount = page => page.evaluate(() =>
  document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])").length);

await test("new visitor is sent to setup; no course menu first", async page => {
  await page.goto(base);
  await page.waitForURL(/setup\.html$/);
  await page.getByText("先設定一次教室，之後就能直接開始。").waitFor();
  await page.getByRole("heading", { name: "接回你的教室" }).waitFor();
  await shot(page, "01-setup-new");
});

await test("rejections show text and have no override button", async page => {
  await page.goto(base + "setup.html");
  const cases = [
    ["", "請貼上ChatGPT私人對話的完整網址。"],
    ["https://chatgpt.com/share/EXAMPLE_01", "這是分享連結。請改貼你自己開啟原對話時的網址。"],
    ["https://chatgpt.com.evil.test/c/EXAMPLE_01", "請使用chatgpt.com原對話的網址；其他網站不能設為教室。"],
    ["javascript:alert(1)", "這個網址不能作為教室入口，請重新複製原對話網址。"],
    ["https://chat.openai.com/c/EXAMPLE_01", "請在目前的ChatGPT網頁開啟原對話，再複製網址列中的新網址。"],
    ["https://chatgpt.com/", "這不是可保存的教室網址。請先開啟原教學對話，再複製網址列。"]
  ];
  for (const [value, message] of cases) {
    await page.fill("#chat-url", value);
    await page.click("#save-button");
    assert.equal(await page.textContent("#url-error"), message, `error for ${value || "(empty)"}`);
    assert.equal(await page.getAttribute("#chat-url", "aria-invalid"), "true");
    assert.equal(await page.inputValue("#chat-url"), value, "keeps what was typed");
    assert.equal(await page.isVisible("#confirm-panel"), false, "no override path");
    assert.ok(page.url().startsWith(base), "did not navigate");
  }
  await shot(page, "02-setup-error");
});

await test("supported URL saves, survives reload, home has one element", async page => {
  await page.goto(base + "setup.html");
  await page.fill("#chat-url", "  " + KNOWN + "  ");
  await Promise.all([page.waitForURL(/chatgpt\.com/), page.click("#save-button")]);
  assert.equal(page.url(), KNOWN, "same-tab navigation keeps query and fragment");
  await page.goto(base);
  const link = page.getByRole("link", { name: "開始今天的課" });
  await link.waitFor();
  assert.equal(await link.getAttribute("href"), KNOWN);
  assert.equal(await link.getAttribute("target"), null, "same tab");
  assert.equal(await interactiveCount(page), 1, "home has exactly one interactive element");
  await page.getByText("今天，一小步。").waitFor();
  await page.getByText("一般約12分鐘；累了就跟老師說「3分鐘」。").waitFor();
  const body = await page.textContent("body");
  assert.ok(!/已完成|連續|分數|N[1-5]|進度/.test(body), "no fake progress on home");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "開始今天的課", "keyboard reaches the button");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.equal(outline, "solid", "focus outline visible");
  await shot(page, "03-home");
  await Promise.all([page.waitForURL(/chatgpt\.com/), page.keyboard.press("Enter")]);
  await page.goBack();
  await page.getByRole("link", { name: "開始今天的課" }).waitFor();
});

await test("setup page shows saved state; clear removes only this app's key", async page => {
  await page.goto(base + "setup.html");
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem("other-app", "keep"); },
    [KEY, JSON.stringify({ schemaVersion: 1, chatUrl: KNOWN })]);
  await page.reload();
  await page.getByText("這個瀏覽器已保存教室入口。", { exact: false }).waitFor();
  assert.equal(await page.inputValue("#chat-url"), KNOWN);
  assert.equal(await page.textContent("#save-button"), "更新教室入口");
  await page.click("#clear-button");
  await page.getByText("已清除這個瀏覽器的入口設定。").waitFor();
  const left = await page.evaluate(k => [localStorage.getItem(k), localStorage.getItem("other-app")], KEY);
  assert.deepEqual(left, [null, "keep"]);
});

await test("corrupt settings recover to setup, never a blank page", async page => {
  await page.goto(base + "setup.html");
  for (const bad of ["{not json", JSON.stringify({ schemaVersion: 2, chatUrl: KNOWN }),
    JSON.stringify({ schemaVersion: 1, chatUrl: "https://evil.test/c/EXAMPLE_01" })]) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, bad]);
    await page.goto(base);
    await page.waitForURL(/setup\.html$/);
    await page.getByText("找不到可使用的入口設定，請重新貼上教室網址。").waitFor();
  }
});

await test("unknown same-origin route: open, confirm, bound to that URL", async (page, context) => {
  await page.goto(base + "setup.html");
  await page.fill("#chat-url", UNKNOWN);
  await page.click("#save-button");
  await page.locator("#confirm-panel").waitFor();
  assert.equal(await page.isVisible("#confirm-button"), false, "must open first");
  await shot(page, "04-confirm");
  const [popup] = await Promise.all([context.waitForEvent("page"), page.click("#check-link")]);
  assert.equal(popup.url(), UNKNOWN, "opens in a new tab");
  await popup.close();
  assert.ok(page.url().endsWith("setup.html"), "setup page kept");
  await page.locator("#confirm-button").waitFor();
  // editing the field drops the confirmation
  await page.fill("#chat-url", UNKNOWN + "?view=changed");
  assert.equal(await page.isVisible("#confirm-panel"), false);
  await page.click("#save-button");
  assert.equal(await page.isVisible("#confirm-button"), false, "old confirmation not reused");
  await page.fill("#chat-url", UNKNOWN);
  await page.click("#save-button");
  const [popup2] = await Promise.all([context.waitForEvent("page"), page.click("#check-link")]);
  await popup2.close();
  await Promise.all([page.waitForURL(/chatgpt\.com/), page.click("#confirm-button")]);
  await page.goto(base + "setup.html");
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  assert.equal(saved.routeStatus, "user_confirmed_unrecognized");
  assert.equal(saved.chatUrl, UNKNOWN);
  await page.goto(base);
  assert.equal(await page.getByRole("link", { name: "開始今天的課" }).getAttribute("href"), UNKNOWN);
});

await test("draft text survives reload but confirmation does not", async page => {
  await page.goto(base + "setup.html");
  await page.fill("#chat-url", UNKNOWN);
  await page.reload();
  assert.equal(await page.inputValue("#chat-url"), UNKNOWN);
  assert.equal(await page.isVisible("#confirm-panel"), false);
});

await test("storage failure: no fake success, can still enter this time", async (page, context) => {
  await context.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    Storage.prototype.getItem = function () { throw new Error("SecurityError"); };
  });
  await page.goto(base);
  await page.waitForURL(/setup\.html$/);
  await page.fill("#chat-url", KNOWN);
  await page.click("#save-button");
  await page.getByText("這次可以進教室，但此瀏覽器沒有保存入口；下次可能需要再設定。").waitFor();
  const go = page.getByRole("link", { name: "這次先進教室" });
  assert.equal(await go.getAttribute("href"), KNOWN);
  assert.ok(page.url().endsWith("setup.html"), "did not pretend it saved");
  await shot(page, "05-storage-fail");
  await Promise.all([page.waitForURL(/chatgpt\.com/), go.click()]);
});

await test("clipboard failure shows manual copy box; no fake 'copied'", async (page, context) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) } });
  });
  await page.goto(base + "setup.html");
  await page.click("#new-classroom summary");
  await page.click("#copy-button");
  await page.locator("#manual-copy").waitFor();
  const status = await page.textContent("#copy-status");
  assert.ok(!status.includes("已複製"), "must not claim copied");
  const manual = await page.inputValue("#manual-prompt");
  const prompt = await page.textContent("#prompt-text");
  assert.equal(manual, prompt);
  assert.equal(await page.getAttribute("#manual-prompt", "disabled"), null, "selectable");
  assert.equal(await page.isEnabled("#save-button"), true, "setup not blocked");
  await shot(page, "06-copy-fail");
});

await test("clipboard success says copied only after write", async (page, context) => {
  await context.addInitScript(() => {
    window.__copied = null;
    Object.defineProperty(navigator, "clipboard", { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } });
  });
  await page.goto(base + "setup.html");
  await page.click("#new-classroom summary");
  await page.click("#copy-button");
  await page.getByText("已複製，請回教學對話貼上。").waitFor();
  assert.equal(await page.evaluate(() => window.__copied), await page.textContent("#prompt-text"));
});

await test("skip setup links to ChatGPT home and saves nothing", async page => {
  await page.goto(base + "setup.html");
  await page.click("#skip summary");
  assert.equal(await page.getAttribute("#skip-link", "href"), "https://chatgpt.com/");
  await Promise.all([page.waitForURL(/chatgpt\.com/), page.click("#skip-link")]);
  await page.goto(base + "setup.html");
  assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), null);
});

for (const [w, h] of [[320, 568], [390, 844], [844, 390]]) {
  await test(`layout ${w}x${h} at 100% and 200% text: no clipping or sideways scroll`, async page => {
    await page.goto(base + "setup.html");
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify({ schemaVersion: 1, chatUrl: KNOWN })]);
    for (const scale of ["100%", "200%"]) {
      await page.goto(base);
      await page.evaluate(s => { document.documentElement.style.fontSize = s; }, scale);
      await noHorizontalOverflow(page);
      const box = await page.getByRole("link", { name: "開始今天的課" }).boundingBox();
      assert.ok(box.height >= 64, "button at least 64px tall");
      if (w === 320) await shot(page, `07-home-${w}-${scale.replace("%", "")}`);
      await page.goto(base + "setup.html");
      await page.evaluate(s => {
        document.documentElement.style.fontSize = s;
        for (const d of document.querySelectorAll("details")) d.open = true;
        document.getElementById("confirm-panel").hidden = false;
        document.getElementById("confirm-button").hidden = false;
        document.getElementById("manual-copy").hidden = false;
      }, scale);
      await noHorizontalOverflow(page);
      await page.locator("#save-button").scrollIntoViewIfNeeded();
      assert.ok(await page.locator("#save-button").isVisible(), "save button reachable");
      if (w === 320) await shot(page, `08-setup-${w}-${scale.replace("%", "")}`);
    }
  }, { viewport: { width: w, height: h } });
}

await test("screen reader names: heading, labelled field, button", async page => {
  await page.goto(base + "setup.html");
  await page.getByRole("heading", { level: 1, name: "接回你的教室" }).waitFor();
  await page.getByRole("textbox", { name: "原教學對話的網址" }).waitFor();
  await page.getByRole("button", { name: "儲存並進教室" }).waitFor();
  const lang = await page.getAttribute("html", "lang");
  assert.equal(lang, "zh-Hant");
});

await browser.close();
server.close();
console.log(`PASS: ${passed} browser checks (Chromium mobile emulation; not real iPhone Safari).`);
