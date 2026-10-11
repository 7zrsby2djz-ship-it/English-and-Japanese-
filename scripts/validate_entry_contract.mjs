#!/usr/bin/env node
// 離線檢查：網址政策、設定相容、文案唯一來源。不是瀏覽器或iPhone實測。
// Offline policy + copy checks (adapted from handoff v1.2). Run: node scripts/validate_entry_contract.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  assessClassroomUrl, createClassroomSetting, readClassroomSetting,
  URL_POLICY_VERSION
} from "../site/js/classroom_url.mjs";
import copy from "../site/js/ui_copy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFile(resolve(root, path), "utf8");
const fixture = JSON.parse(await read("tests/url_cases.json"));
assert.equal(fixture.policyVersion, URL_POLICY_VERSION);
let assertions = 1;
for (const test of fixture.cases) {
  const assessment = assessClassroomUrl(test.input);
  assert.equal(assessment.kind, test.expected, test.name);
  assertions++;
  if (test.expected === "reject") {
    assert.equal(createClassroomSetting(test.input, test.input).ok, false,
      `${test.name}: a confirmation cannot override rejection`);
    assertions++;
  } else if (test.expected === "confirm") {
    assert.equal(createClassroomSetting(test.input).ok, false,
      `${test.name}: no implicit confirmation`);
    const saved = createClassroomSetting(test.input, assessment.href);
    assert.equal(saved.ok, true, `${test.name}: explicit confirmation recovers`);
    assert.equal(readClassroomSetting(saved.setting).ok, true,
      `${test.name}: confirmed setting survives reload`);
    assertions += 3;
  } else {
    assert.equal(createClassroomSetting(test.input).ok, true,
      `${test.name}: supported shape needs no extra confirmation`);
    assertions++;
  }
}

const full = "https://chatgpt.com/c/EXAMPLE_01?view=example#section";
assert.equal(createClassroomSetting(full).setting.chatUrl, full, "preserve query and fragment");
const unknown = "https://chatgpt.com/g/EXAMPLE_PROJECT/c/EXAMPLE_01";
assert.equal(createClassroomSetting(`${unknown}?view=changed`, unknown).ok, false,
  "confirmation does not apply after a URL edit");
assert.equal(readClassroomSetting({schemaVersion: 1, chatUrl: full}).ok, true,
  "legacy supported setting continues without reset");
assert.equal(readClassroomSetting({schemaVersion: 1, chatUrl: unknown}).ok, false,
  "legacy unknown setting needs confirmation");
assert.equal(readClassroomSetting({schemaVersion: 1, chatUrl: unknown,
  routeStatus: "user_confirmed_unrecognized", urlPolicyVersion: "old-policy"}).ok, false,
  "unknown route confirmation expires with changed policy");
assert.equal(readClassroomSetting({schemaVersion: 1,
  chatUrl: "https://example.test/c/EXAMPLE_01", routeStatus: "user_confirmed_unrecognized",
  urlPolicyVersion: URL_POLICY_VERSION}).ok, false, "stored fields cannot bypass host check");
assert.equal(readClassroomSetting(null).ok, false, "corrupt settings recover");
assert.equal(readClassroomSetting({schemaVersion: 2, chatUrl: full}).ok, false,
  "unrecognized settings version recovers");
assertions += 8;

// 文案：啟動文字唯一來源是 ui_copy.mjs 的 setupPrompt。
const prompt = copy.setupPrompt;
assert.equal(typeof prompt, "string");
assert.ok(prompt.length > 0 && !prompt.includes("\n"), "setupPrompt is one paragraph");
assert.equal(copy.rules.startup_prompt_single_source, "setupPrompt");
assert.equal(copy.setup.newClassroomPromptSource, "setupPrompt");
assert.ok(!/第[一二三1-9]+堂|Day ?\d/.test(prompt), "setupPrompt must not hard-code a lesson number");
for (const path of ["site/index.html", "site/setup.html", "site/js/setup.mjs", "site/js/home.mjs", "README.md", "AI_HANDOFF.md"]) {
  const body = await read(path);
  assert.ok(!body.includes(prompt), `${path}: must not keep its own copy of setupPrompt`);
  assertions++;
}
assert.equal(copy.rules.existing_classroom_is_default, true);
assert.equal(copy.rules.rejected_url_has_no_override, true);
assert.equal(copy.rules.home_interactive_elements, 1);
assert.equal(copy.setup.skipHomeUrl, "https://chatgpt.com/");
assert.equal(assessClassroomUrl(copy.setup.skipHomeUrl).kind, "reject",
  "skip destination cannot become a saved classroom");
assert.equal(copy.setup.iphoneSteps.length, 3);
assert.equal(copy.setup.newClassroomSteps.length, 3);
assertions += 12;

// 每個 data-copy 都要找得到文字。
const getCopy = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), copy);
for (const page of ["site/setup.html"]) {
  const html = await read(page);
  for (const [, key] of html.matchAll(/data-copy="([^"]+)"/g)) {
    assert.equal(typeof getCopy(key), "string", `${page}: data-copy="${key}" has no text`);
    assertions++;
  }
}

console.log(`PASS: ${fixture.cases.length} URL cases; ${assertions} total assertions.`);
console.log("Scope: offline policy/copy checks only. Browser flows: npm run test:e2e. Real iPhone + real private chat still need the owner.");
