const BOT_UA = [
  'bot', 'crawl', 'spider', 'slurp', 'mediapartners', 'facebookexternalhit',
  'wget', 'curl', 'python', 'java/', 'go-http', 'scrapy', 'ahrefsbot',
  'semrushbot', 'dotbot', 'yandexbot', 'baiduspider', 'duckduckbot',
  'petalbot', 'bytespider', 'gptbot', 'claudebot', 'applebot',
];

function isBot(ua) {
  if (!ua || ua.length < 10) return true;
  const l = ua.toLowerCase();
  return BOT_UA.some(p => l.includes(p));
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get('User-Agent') || '';
  if (isBot(ua)) return new Response('{}', { status: 200, headers: CORS });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('{}', { status: 400, headers: CORS });
  }

  const mode    = String(body.mode   || 'home').slice(0, 64);
  const device  = String(body.device || 'desktop').slice(0, 16);
  const ip      = request.headers.get('CF-Connecting-IP') || 'unknown';
  const country = (request.headers.get('CF-IPCountry') || 'XX').slice(0, 2).toUpperCase();

  // Visit key: IP + 30-min bucket. One real visit keeps this same value
  // no matter how many links the user clicks during that window.
  const bucket = Math.floor(Date.now() / 1000 / 1800);
  const sessionHash = await sha256hex(`${ip}-${bucket}`);

  // Mode key: IP + mode + bucket, used only to dedup repeated clicks on
  // the same link (not to identify the visit itself).
  const modeHash = await sha256hex(`${ip}-${mode}-${bucket}`);

  const cutoff = Math.floor(Date.now() / 1000) - 1800;
  const dup = await env.DB.prepare(
    'SELECT 1 FROM visits WHERE mode_hash = ? AND ts > ? LIMIT 1'
  ).bind(modeHash, cutoff).first();

  if (dup) return new Response('{}', { status: 200, headers: CORS });

  const ts = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'INSERT INTO visits (ts, country, device, mode, session, mode_hash) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(ts, country, device, mode, sessionHash, modeHash).run();

  return new Response('{}', { status: 200, headers: CORS });
}
