// Copied unchanged from handoff v1.2 engineering/classroom_url.mjs.
/**
 * V1.2 classroom-link policy. Pure function: no fetch, navigation, or telemetry.
 * "known" means supported shape, never verified private/existing conversation.
 */
export const URL_POLICY_VERSION = "classroom-url/1.2";
const blockedSegments = new Set([
  "share", "shared", "auth", "login", "logout", "signup", "sign-in",
  "sign-up", "signout", "oauth", "oauth2", "authorize", "callback",
  "redirect", "api", "backend-api", "account", "settings", "billing",
  "payment", "payments", "new"
]);
const sensitiveQueryKeys = new Set([
  "access_token", "id_token", "refresh_token", "password", "authorization"
]);
const reject = reason => ({ kind: "reject", reason, href: null, policyVersion: URL_POLICY_VERSION });

export function assessClassroomUrl(input) {
  if (typeof input !== "string") return reject("invalid_input");
  const raw = input.trim();
  if (!raw) return reject("missing_url");
  // Reject control characters/backslashes rather than let URL normalize them.
  if (/[\u0000-\u0020\u007f\\]/u.test(raw)) return reject("invalid_characters");
  let url;
  try { url = new URL(raw); } catch { return reject("invalid_url"); }
  if (url.protocol !== "https:") return reject("unsafe_protocol");
  if (url.username || url.password) return reject("credentials_not_allowed");
  if (url.port !== "") return reject("non_default_port");
  if (url.hostname === "chat.openai.com") return reject("legacy_domain_recopy");
  if (url.hostname !== "chatgpt.com") return reject("unapproved_host");

  // Decode only for classification; navigate the parsed original URL unchanged.
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return reject("invalid_path_encoding"); }
  if (/%(?:2f|5c|25)/i.test(url.pathname) || /[\u0000-\u0020\u007f\\]/u.test(path))
    return reject("ambiguous_path");
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return reject("not_a_conversation");
  const lower = segments.map(s => s.toLowerCase());
  if (lower.some(s => s === "share" || s === "shared")) return reject("shared_url");
  if (lower.some(s => blockedSegments.has(s))) return reject("non_classroom_route");
  for (const key of url.searchParams.keys()) {
    if (sensitiveQueryKeys.has(key.toLowerCase())) return reject("sensitive_query");
  }
  if (path.includes("//")) return reject("ambiguous_path");
  if (path === "/c" || path === "/c/") return reject("missing_conversation_id");

  // No UUID assumption: conversation IDs remain opaque.
  const supported = /^\/c\/[^/]+\/?$/u.test(path);
  return {
    kind: supported ? "known" : "confirm",
    reason: supported ? "supported_shape" : "unrecognized_same_origin_route",
    href: url.href,
    policyVersion: URL_POLICY_VERSION
  };
}

export function createClassroomSetting(input, confirmedUrl = null) {
  const result = assessClassroomUrl(input);
  if (result.kind === "reject") return { ok: false, assessment: result };
  if (result.kind === "confirm" && confirmedUrl !== result.href)
    return { ok: false, assessment: result };
  return {
    ok: true,
    setting: {
      schemaVersion: 1,
      chatUrl: result.href,
      routeStatus: result.kind === "known" ? "supported_shape" : "user_confirmed_unrecognized",
      urlPolicyVersion: URL_POLICY_VERSION
    }
  };
}

// Copied unchanged from handoff v1.2 engineering/classroom_url.mjs.
/**
 * Validate persisted values again before navigation.
 * Old v1 settings with supported /c/... URLs migrate without another setup.
 * A user-confirmed unknown URL needs the same current policy version.
 */
export function readClassroomSetting(stored) {
  if (!stored || typeof stored !== "object" || stored.schemaVersion !== 1)
    return { ok: false, reason: "corrupt_settings" };
  const assessment = assessClassroomUrl(stored.chatUrl);
  if (assessment.kind === "reject") return { ok: false, assessment };
  const confirmation = stored.routeStatus === "user_confirmed_unrecognized" &&
    stored.urlPolicyVersion === URL_POLICY_VERSION ? assessment.href : null;
  return createClassroomSetting(stored.chatUrl, confirmation);
}

