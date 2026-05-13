function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

function barInline(ratio, color) {
  return '<div style="display:inline-block;height:7px;width:' + Math.round(ratio * 100) + '%;background:' + color + ';border-radius:4px;min-width:2px"></div>';
}

function tableRows(arr, maxVal, keyFn, valFn, color) {
  if (!arr || !arr.length) return '<tr><td colspan="3" style="color:#475569;text-align:center;padding:14px">No data yet</td></tr>';
  return arr.map(r =>
    '<tr><td>' + keyFn(r) + '</td>' +
    '<td style="text-align:right;padding-right:12px;font-weight:600;color:#cbd5e1">' + valFn(r) + '</td>' +
    '<td style="width:40%;padding-right:8px">' + barInline(valFn(r) / maxVal, color) + '</td></tr>'
  ).join('');
}

function dailyChart(daily) {
  if (!daily || !daily.length) return '<div style="color:#475569;text-align:center;padding:32px 0;font-size:0.85rem">No data yet</div>';
  const max = Math.max(...daily.map(d => d.c), 1);
  return daily.map(d => {
    const h = Math.max(4, Math.round((d.c / max) * 100));
    return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:22px;justify-content:flex-end;gap:2px">' +
      '<span style="font-size:0.6rem;color:#94a3b8">' + d.c + '</span>' +
      '<div title="' + d.day + ': ' + d.c + '" style="width:85%;background:linear-gradient(to top,#2563eb,#60a5fa);border-radius:3px 3px 0 0;height:' + h + 'px"></div>' +
      '<span style="font-size:0.55rem;color:#475569;white-space:nowrap">' + String(d.day).slice(5) + '</span></div>';
  }).join('');
}

function deviceBars(devices) {
  const total = devices.reduce((s, d) => s + d.c, 0);
  if (!total) return '<p style="color:#475569;text-align:center;padding:12px">No data</p>';
  return devices.map(d => {
    const p = pct(d.c, total);
    const color = d.device === 'mobile' ? '#f59e0b' : '#3b82f6';
    const label = d.device === 'mobile' ? '[Mobile]' : '[Desktop]';
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="font-size:0.8rem;color:#94a3b8;width:72px">' + label + '</span>' +
      '<div style="flex:1">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:0.85rem;text-transform:capitalize">' + d.device + '</span>' +
      '<span style="font-size:0.85rem;font-weight:600;color:#cbd5e1">' + d.c + ' (' + p + '%)</span></div>' +
      '<div style="height:8px;background:#1e293b;border-radius:4px"><div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:4px"></div></div>' +
      '</div></div>';
  }).join('');
}

function statCard(label, value, sub) {
  return '<div style="background:#1e2130;border:1px solid #2d3248;border-radius:12px;padding:20px 24px">' +
    '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.09em;color:#64748b;margin-bottom:8px">' + label + '</div>' +
    '<div style="font-size:2.2rem;font-weight:800;color:#60a5fa;line-height:1">' + value + '</div>' +
    (sub ? '<div style="font-size:0.72rem;color:#475569;margin-top:6px">' + sub + '</div>' : '') + '</div>';
}

function section(title, content) {
  return '<div style="background:#1e2130;border:1px solid #2d3248;border-radius:12px;padding:20px 24px;margin-bottom:20px">' +
    '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:16px">' + title + '</div>' +
    content + '</div>';
}

function flagImg(cc) {
  if (!cc || cc.length !== 2) return '';
  return '<img src="https://flagcdn.com/16x12/' + cc.toLowerCase() + '.png" width="16" height="12" style="vertical-align:middle;border-radius:2px;margin-right:4px" onerror="this.style.display=\'none\'">';
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!env.ADMIN_PASSWORD || key !== env.ADMIN_PASSWORD)
    return new Response('403 Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });

  const now = Math.floor(Date.now() / 1000);
  const d = new Date();
  const todayUTC = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
  const ago30 = now - 30 * 86400;
  const thStyle = 'font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;text-align:left;padding:6px 8px;border-bottom:1px solid #2d3248;font-weight:600';

  const [todayRow, weekRow, monthRow, totalRow, dailyRes, countryRes, deviceRes, linkRes] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(todayUTC).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(todayUTC - 6 * 86400).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits WHERE ts >= ?').bind(todayUTC - 29 * 86400).first(),
    env.DB.prepare('SELECT COUNT(*) AS c FROM visits').first(),
    env.DB.prepare("SELECT DATE(ts,'unixepoch') AS day, COUNT(*) AS c FROM visits WHERE ts >= ? GROUP BY day ORDER BY day ASC").bind(ago30).all(),
    env.DB.prepare('SELECT country, COUNT(*) AS c FROM visits GROUP BY country ORDER BY c DESC LIMIT 12').all(),
    env.DB.prepare('SELECT device, COUNT(*) AS c FROM visits GROUP BY device ORDER BY c DESC').all(),
    env.DB.prepare("SELECT mode, COUNT(*) AS c FROM visits WHERE mode != 'home' GROUP BY mode ORDER BY c DESC LIMIT 12").all(),
  ]);

  const countries = countryRes?.results ?? [];
  const links     = linkRes?.results    ?? [];
  const devices   = deviceRes?.results  ?? [];
  const daily     = dailyRes?.results   ?? [];
  const maxC = Math.max(...countries.map(c => c.c), 1);
  const maxL = Math.max(...links.map(l => l.c), 1);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SC Links - Analytics</title>
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;background:#0a0d14;color:#e2e8f0;min-height:100vh;padding:28px 20px}@media(max-width:640px){body{padding:16px 12px}}</style>
</head>
<body>
<div style="max-width:960px;margin:0 auto">
  <div style="margin-bottom:28px">
    <h1 style="font-size:1.6rem;font-weight:800;color:#f8fafc;letter-spacing:-0.02em">Star Citizen Links &mdash; Analytics</h1>
    <p style="font-size:0.78rem;color:#475569;margin-top:4px">Updated: ${new Date().toUTCString()}</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px">
    ${statCard('Today', todayRow?.c ?? 0)}
    ${statCard('This Week', weekRow?.c ?? 0, 'last 7 days')}
    ${statCard('This Month', monthRow?.c ?? 0, 'last 30 days')}
    ${statCard('Total', totalRow?.c ?? 0, 'all time')}
  </div>
  ${section('Daily Visits - Last 30 Days', '<div style="display:flex;align-items:flex-end;gap:3px;height:120px;overflow-x:auto;padding-bottom:2px">' + dailyChart(daily) + '</div>')}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    ${section('Top Countries',
      '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
      '<th style="' + thStyle + '">Country</th>' +
      '<th style="' + thStyle + ';text-align:right">Visits</th>' +
      '<th style="' + thStyle + '">Bar</th></tr></thead><tbody>' +
      tableRows(countries, maxC, r => flagImg(r.country) + r.country, r => r.c, 'linear-gradient(to right,#10b981,#34d399)') +
      '</tbody></table>'
    )}
    ${section('Most Clicked Links',
      '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
      '<th style="' + thStyle + '">Link</th>' +
      '<th style="' + thStyle + ';text-align:right">Clicks</th>' +
      '<th style="' + thStyle + '">Bar</th></tr></thead><tbody>' +
      tableRows(links, maxL, r => r.mode, r => r.c, 'linear-gradient(to right,#3b82f6,#60a5fa)') +
      '</tbody></table>'
    )}
  </div>
  ${section('Devices', deviceBars(devices))}
  <p style="font-size:0.7rem;color:#334155;text-align:right;margin-top:16px">Star Citizen Links Analytics &mdash; Cloudflare D1</p>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
