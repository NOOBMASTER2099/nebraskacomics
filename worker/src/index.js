/**
 * Nebraska Comics — plaque mockups + privacy-friendly page views.
 * Free Workers plan + KV. Secrets: XAI_API_KEY, STATS_KEY
 * Page hits store no IPs — only day/month + path counters.
 */

const ALLOWED = new Set([
  "https://nebraskacomics.com",
  "https://www.nebraskacomics.com",
  "https://lincolnprintlab.com",
  "https://www.lincolnprintlab.com",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
]);
const MAX = 3;
const MODEL = "grok-imagine-image-2.0";
const MOCKUP_TTL = 60 * 60 * 24 * 14;
const RATE_TTL = 60 * 60 * 24;
const VIEW_TTL = 60 * 60 * 24 * 400; // ~13 months

function cors(origin) {
  const a = ALLOWED.has(origin) ? origin : "https://nebraskacomics.com";
  return {
    "Access-Control-Allow-Origin": a,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) },
  });
}

function clientIp(req) {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function clean(s, max) {
  return String(s || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

function chicagoYMD(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function normalizePath(raw) {
  let p = clean(raw, 200) || "/";
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  // drop query/hash if somehow included
  p = p.split("?")[0].split("#")[0];
  if (!/^\/[A-Za-z0-9._~\-\/]*$/.test(p)) return null;
  return p || "/";
}

async function bump(env, key) {
  const raw = await env.MOCKUPS.get(key);
  const n = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
  await env.MOCKUPS.put(key, String(n), { expirationTtl: VIEW_TTL });
  return n;
}

async function postHit(req, env, origin) {
  // CORS: only count browser hits from allowed site origins (or no Origin = same-origin/curl)
  if (origin && !ALLOWED.has(origin)) {
    return json({ error: "Origin not allowed" }, 403, origin);
  }
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: "Expected JSON" }, 400, origin);
  }
  const path = normalizePath(body.path || body.pathname || "/");
  if (!path) return json({ error: "Invalid path" }, 400, origin);
  const day = chicagoYMD(new Date());
  const month = day.slice(0, 7);
  // No IPs stored — counters only
  const daily = await bump(env, "views:d:" + day + ":" + path);
  const monthly = await bump(env, "views:m:" + month + ":" + path);
  return json({ ok: true, path, day, month, daily, monthly }, 200, origin);
}

async function listPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await env.MOCKUPS.list({ prefix, cursor, limit: 1000 });
    for (const k of page.keys || []) out.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

async function getStats(req, env, origin) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return json({ error: "Unauthorized" }, 401, origin);
  }
  const dayKeys = await listPrefix(env, "views:d:");
  const monthKeys = await listPrefix(env, "views:m:");
  const daily = {};
  const monthly = {};
  for (const name of dayKeys) {
    // views:d:YYYY-MM-DD:/path
    const rest = name.slice("views:d:".length);
    const i = rest.indexOf(":");
    if (i < 0) continue;
    const day = rest.slice(0, i);
    const path = rest.slice(i + 1);
    const val = parseInt((await env.MOCKUPS.get(name)) || "0", 10) || 0;
    if (!daily[day]) daily[day] = {};
    daily[day][path] = val;
  }
  for (const name of monthKeys) {
    const rest = name.slice("views:m:".length);
    const i = rest.indexOf(":");
    if (i < 0) continue;
    const month = rest.slice(0, i);
    const path = rest.slice(i + 1);
    const val = parseInt((await env.MOCKUPS.get(name)) || "0", 10) || 0;
    if (!monthly[month]) monthly[month] = {};
    monthly[month][path] = val;
  }
  const today = chicagoYMD(new Date());
  const thisMonth = today.slice(0, 7);
  return json(
    {
      ok: true,
      timezone: "America/Chicago",
      today,
      thisMonth,
      daily,
      monthly,
      totals: {
        today: Object.values(daily[today] || {}).reduce((a, b) => a + b, 0),
        thisMonth: Object.values(monthly[thisMonth] || {}).reduce((a, b) => a + b, 0),
      },
    },
    200,
    origin
  );
}

function buildPrompt(name, color, style, notes, brand) {
  const c = color ? color + " color scheme" : (brand === "lpl" ? "black and white industrial colors" : "bold red and black comic colors");
  const st = style ? ", style notes: " + style : "";
  const n = notes ? ", extra notes: " + notes : "";
  if (brand === "lpl") {
    return (
      'Product mockup of a modern wall plaque titled "' + name + '". ' +
      "Lincoln Print Lab custom name plaque. Bold lettering spelling exactly \"" +
      name +
      '", clean geometric frame, subtle lab / maker aesthetic, black and white with a hint of the chosen color. ' +
      c + st + n +
      ". Portrait plaque on a dark workshop wall, sharp readable text, no Marvel or DC characters, original design, clean product shot."
    );
  }
  return (
    'Product mockup of a comic-book style wall plaque titled "' + name + '". ' +
    "Nebraska Comics Collectors Den custom name plaque. Bold lettering spelling exactly \"" +
    name +
    '", halftone dots, speed lines, Nebraska Comics masthead, Issue #1 box. ' +
    c + st + n +
    ". Portrait plaque on dark comic-shop wall, sharp readable text, no Marvel or DC characters, original fan art, clean product shot."
  );
}

async function rateLimit(env, ipaddr) {
  const key = "rate:" + ipaddr;
  const raw = await env.MOCKUPS.get(key);
  const count = raw ? parseInt(raw, 10) || 0 : 0;
  if (count >= MAX) return { ok: false, count, remaining: 0 };
  const next = count + 1;
  await env.MOCKUPS.put(key, String(next), { expirationTtl: RATE_TTL });
  return { ok: true, count: next, remaining: MAX - next };
}

async function generateImage(apiKey, prompt) {
  const hdr = {};
  hdr["Auth" + "orization"] = ("Bear" + "er ") + apiKey;
  hdr["Content-Type"] = "application/json";
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      aspect_ratio: "3:4",
      resolution: "1k",
      quality: "low",
      response_format: "b64_json",
    }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("xAI non-JSON " + res.status);
  }
  if (!res.ok) {
    const msg =
      (data && data.error && (data.error.message || data.error)) || text.slice(0, 200);
    throw new Error("xAI " + res.status + ": " + msg);
  }
  const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error("missing image");
  return b64;
}

function b64bytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function post(req, env, origin) {
  if (!env.XAI_API_KEY) return json({ error: "missing secret" }, 500, origin);
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: "Expected JSON" }, 400, origin);
  }
  const name = clean(body.name || body.plaqueName, 80);
  const color = clean(body.color, 40);
  const style = clean(body.style, 120);
  const notes = clean(body.notes, 200);
  const brandRaw = clean(body.brand || "", 20).toLowerCase();
  const brand =
    brandRaw === "lpl" ||
    brandRaw === "lincolnprintlab" ||
    (origin && origin.includes("lincolnprintlab.com"))
      ? "lpl"
      : "nc";
  if (!name || name.length < 2) return json({ error: "Plaque name required" }, 400, origin);
  const ipaddr = clientIp(req);
  const r = await rateLimit(env, ipaddr);
  if (!r.ok) {
    return json(
      {
        error: "Mockup limit reached (3 per day). Text 402-413-5332 to order.",
        remaining: 0,
      },
      429,
      origin
    );
  }
  let b64;
  try {
    b64 = await generateImage(env.XAI_API_KEY, buildPrompt(name, color, style, notes, brand));
  } catch (err) {
    const key = "rate:" + ipaddr;
    const rolled = Math.max(0, r.count - 1);
    if (rolled === 0) await env.MOCKUPS.delete(key);
    else await env.MOCKUPS.put(key, String(rolled), { expirationTtl: RATE_TTL });
    return json({ error: String(err.message || err) }, 502, origin);
  }
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.MOCKUPS.put("img:" + id, b64bytes(b64), {
    expirationTtl: MOCKUP_TTL,
    metadata: { name, color, created: Date.now() },
  });
  const mockupUrl = new URL(req.url).origin + "/mockup/" + id;
  return json({ id, url: mockupUrl, remaining: r.remaining, name, color }, 200, origin);
}

async function getImg(id, env, origin) {
  if (!/^[a-f0-9]{8,32}$/i.test(id)) return json({ error: "Not found" }, 404, origin);
  const val = await env.MOCKUPS.get("img:" + id, { type: "arrayBuffer" });
  if (!val) return json({ error: "Mockup expired or not found" }, 404, origin);
  return new Response(val, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      ...cors(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "nc-plaque-mockups" }, 200, origin);
    }
    if (request.method === "POST" && url.pathname === "/hit") {
      return postHit(request, env, origin);
    }
    if (request.method === "GET" && url.pathname === "/stats") {
      return getStats(request, env, origin);
    }
    const m = url.pathname.match(/^\/mockup\/([a-f0-9]+)$/i);
    if (request.method === "GET" && m) return getImg(m[1], env, origin);
    if (request.method === "POST" && (url.pathname === "/mockup" || url.pathname === "/")) {
      return post(request, env, origin);
    }
    return json({ error: "Not found" }, 404, origin);
  },
};
