function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function barInline(ratio, color) {
  var w = Math.round(ratio * 100);
  return '<div style="display:inline-block;height:7px;width:' + w + '%;background:' + color + ';border-radius:4px;min-width:2px"></div>';
}

function rows(arr, maxVal, keyFn, valFn, color) {
  if (!arr || !arr.length) return '<tr><td colspan="3" style="color:#475569;text-align:center;padding:14px">Sem dados ainda</td></tr>';
  return arr.map(function (r) {
    return '<tr><td>' + keyFn(r) + '</td><td style="text-align:right;padding-right:12px;font-weight:600;color:#cbd5e1">' + valFn(r) + '</td><td style="width:40%;padding-right:8px">' + barInline(valFn(r) / maxVal, color) + '</td></tr>';
  }).join('');
}

function dailyChart(daily) {
  if (!daily || !daily.length) return '<div style="color:#475569;text-align:center;padding:32px 0;font-size:0.85rem">Sem dados ainda</div>';
  var max = Math.max.apply(null, daily.map(function (d) { return d.c; }));
  if (max < 1) max = 1;
  return daily.map(function (d) {
    var h = Math.max(4, Math.round((d.c / max) * 100));
    var label = String(d.day).slice(5);
    return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:22px;justify-content:flex-end;gap:2px">'
      + '<span style="font-size:0.6rem;color:#94a3b8">' + d.c + '</span>'
      + '<div title="' + d.day + ': ' + d.c + '" style="width:85%;background:linear-gradient(to top,#2563eb,#60a5fa);border-radius:3px 3px 0 0;height:' + h + 'px"></div>'
      + '<span style="font-size:0.55rem;color:#475569;white-space:nowrap">' + label + '</span>'
      + '</div>';
  }).join('');
}

function devicePie(devices) {
  var total = devices.reduce(function (s, d) { return s + d.c; }, 0);
  if (!total) return '<p style="color:#475569;text-align:center;padding:12px">Sem dados</p>';
  return devices.map(function (d) {
    var p = pct(d.c, total);
    var color = d.device === 'mobile' ? '#f59e0b' : '#3b82f6';
    var icon = d.device === 'mobile' ? 'ðŸ“±' : 'ðŸ–¥ï¸';
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      + '<span style="font-size:1.1rem">' + icon + '</span>'
      + '<div style="flex:1">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:0.85rem">' + d.device + '</span><span style="font-size:0.85rem;font-weight:600;color:#cbd5e1">' + d.c + ' (' + p + '%)</span></div>'
      + '<div style="height:8px;background:#1e293b;border-radius:4px"><div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:4px"></div></div>'
      + '</div></div>';
  }).join('');
}

function card(label, value, sub) {
  return '<div style="background:#1e2130;border:1px solid #2d3248;border-radius:12px;padding:20px 24px">'
    + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.09em;color:#64748b;margin-bottom:8px">' + label + '</div>'
    + '<div style="font-size:2.2rem;font-weight:800;color:#60a5fa;line-height:1">' + value + '</div>'
    + (sub ? '<div style="font-size:0.72rem;color:#475569;margin-top:6px">' + sub + '</div>' : '')
    + '</div>';
}

function section(title, content) {
  return '<div style="background:#1e2130;border:1px solid #2d3248;border-radius:12px;padding:20px 24px;margin-bottom:20px">'
    + '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:16px">' + title + '</div>'
    + content
    + '</div>';
}

function flag(cc) {
  if (!cc || cc.length !== 2) return 'ðŸŒ';
  try {
    const pts = [...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
    return String.fromCodePoint(...pts);
  } catch { return 'ðŸŒ'; }
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!env.ADMIN_PASSWORD || key !== env.ADMIN_PASSWORD) {
    return new Response('403 Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
  }

  const now = Math.floor(Date.now() / 1000);
  const d = new Date();
  const todayUTC = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
  const weekUTC  = todayUTC - 6 * 86400;
  const monthUTC = todayUTC - 29 * 86400;
  const ago30    = now - 30 * 86400;

  const [todayRow, weekRow, monthRow, totalRow, dailyRes, countryRes, deviceRes, linkRes] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(todayUTC).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(weekUTC).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(monthUTC).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits').first(),
    env.DB.prepare("SELECT DATE(ts,'unixepoch') AS day, COUNT(*) AS c FROM visits WHERE ts >= ? GROUP BY day ORDER BY day ASC").bind(ago30).all(),
    env.DB.prepare('SELECT country, COUNT(*) AS c FROM visits GROUP BY country ORDER BY c DESC LIMIT 12').all(),
    env.DB.prepare('SELECT device, COUNT(*) AS c FROM visits GROUP BY device ORDER BY c DESC').all(),
    env.DB.prepare("SELECT mode, COUNT(*) AS c FROM visits WHERE mode != 'home' GROUP BY mode ORDER BY c DESC LIMIT 12").all(),
  ]);

  const vToday    = todayRow?.c  ?? 0;
  const vWeek     = weekRow?.c   ?? 0;
  const vMonth    = monthRow?.c  ?? 0;
  const vTotal    = totalRow?.c  ?? 0;
  const daily     = dailyRes?.results   ?? [];
  const countries = countryRes?.results ?? [];
  const devices   = deviceRes?.results  ?? [];
  const links     = linkRes?.results    ?? [];

  const maxCountry = Math.max.apply(null, countries.map(c => c.c).concat([1]));
  const maxLink    = Math.max.apply(null, links.map(l => l.c).concat([1]));
  const thStyle = 'font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;text-align:left;padding:6px 8px;border-bottom:1px solid #2d3248;font-weight:600';

  const countryTbody = rows(countries, maxCountry,
    r => '<span style="font-size:0.95rem">' + flag(r.country) + '</span> ' + r.country,
    r => r.c,
    'linear-gradient(to right,#10b981,#34d399)'
  );

  const linkTbody = rows(links, maxLink,
    r => 'ðŸ”— ' + r.mode,
    r => r.c,
    'linear-gradient(to right,#3b82f6,#60a5fa)'
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SC Links â€” Analytics</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0d14;color:#e2e8f0;min-height:100vh;padding:28px 20px}
@media(max-width:640px){body{padding:16px 12px}}
</style>
</head>
<body>
<div style="max-width:960px;margin:0 auto">

  <div style="margin-bottom:28px">
    <h1 style="font-size:1.6rem;font-weight:800;color:#f8fafc;letter-spacing:-0.02em">ðŸ”— Star Citizen Links Analytics</h1>
    <p style="font-size:0.78rem;color:#475569;margin-top:4px">Atualizado: ${new Date().toUTCString()}</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px">
    ${card('Hoje', vToday)}
    ${card('Esta Semana', vWeek, 'Ãºltimos 7 dias')}
    ${card('Este MÃªs', vMonth, 'Ãºltimos 30 dias')}
    ${card('Total', vTotal, 'desde o inÃ­cio')}
  </div>

  ${section('Visitas por dia â€” Ãºltimos 30 dias',
    '<div style="display:flex;align-items:flex-end;gap:3px;height:120px;overflow-x:auto;padding-bottom:2px">'
    + dailyChart(daily) + '</div>'
  )}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    ${section('Top PaÃ­ses',
      '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr><th style="' + thStyle + '">PaÃ­s</th><th style="' + thStyle + ';text-align:right">Visitas</th><th style="' + thStyle + '">Bar</th></tr></thead>'
      + '<tbody>' + countryTbody + '</tbody></table>'
    )}
    ${section('Links mais clicados',
      '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr><th style="' + thStyle + '">Link</th><th style="' + thStyle + ';text-align:right">Cliques</th><th style="' + thStyle + '">Bar</th></tr></thead>'
      + '<tbody>' + linkTbody + '</tbody></table>'
    )}
  </div>

  ${section('Dispositivos', devicePie(devices))}

  <p style="font-size:0.7rem;color:#334155;text-align:right;margin-top:16px">Star Citizen Links Analytics &mdash; Cloudflare D1</p>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

