// KPHX vertical cross-section for the TRMNL OG (800x480, 1-bit), served as a custom TRMNL server.
//
// The OG polls /api/display, is told which picture to fetch and how long to sleep, then downloads a
// 1-bit BMP from /img/<name>.bmp. Everything is rendered on request, so no cron and no KV are needed.
//
//   GET  /api/setup      first-boot registration
//   GET  /api/display    what to show + refresh_rate (seconds)
//   POST /api/log        accepts the device's log upload
//   GET  /img/<n>.bmp    the picture, as the firmware wants it (800x480, 1bpp, 62 byte header)
//   GET  /preview.png    same picture as a PNG for a browser
//   GET  /               status page with the URL to enter on the device
//
// Add ?demo=1 to /preview.png or /img/x.bmp for synthetic traffic.

// Aircraft silhouettes come from tar1090 (GPL-3.0): https://github.com/wiedehopf/tar1090
// They are the same shapes the TRMNL X plugin draws, flattened to polygons in icons.js (see build-icons.mjs).
import { FONTS } from './font.js';
import { POLYS, SHAPES, resolveIcon, getAirlineFromCallsign } from './icons.js';

const W = 800, H = 480, ROWB = W / 8;
const ICON_MUL = 1.15;  // the OG panel is small, so the X plugin's icon sizes are scaled up a little

const DEFAULTS = {
  LATITUDE: 33.4343, LONGITUDE: -112.0116, RADIUS_NM: 30, AIRPORT_LABEL: 'KPHX',
  OWNSHIP_ALT_FT: 1135, LOW_SLOTS: 5, LOW_FT: 12000, ALT_SLOTS: 7,
  TAG_HOLD_SECONDS: 10, REFRESH_SECONDS: 20, TIME_ZONE: 'America/Phoenix', ROUTES: 'true', XS_MODE: 'ew',
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://airplanes.live/',
  'Origin': 'https://airplanes.live',
};
const SOURCES = [
  (la, lo, r) => `https://api.airplanes.live/v2/point/${la}/${lo}/${r}`,
  (la, lo, r) => `https://api.adsb.lol/v2/point/${la}/${lo}/${r}`,
  (la, lo, r) => `https://opendata.adsb.fi/api/v3/lat/${la}/lon/${lo}/dist/${r}`,
];

// ---------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cfg = config(env);
    const origin = url.origin;
    try {
      if (url.pathname === '/api/setup') {
        return json({
          status: 200, api_key: 'kphx-og', friendly_id: 'KPHXOG',
          image_url: `${origin}/img/setup.bmp`, message: 'KPHX cross-section server',
        });
      }
      if (url.pathname === '/api/display') {
        console.log('device', JSON.stringify({ rate: req.headers.get('refresh-rate'), batt: req.headers.get('battery-voltage'), rssi: req.headers.get('rssi'), fw: req.headers.get('fw-version') }));
        const bucket = Math.floor(Date.now() / 1000 / Math.max(1, cfg.refresh));
        return json({
          status: 0,
          image_url: `${origin}/img/xs-${bucket.toString(36)}.bmp${url.search.includes('demo') ? '?demo=1' : ''}`,
          filename: `xs-${bucket.toString(36)}`,
          refresh_rate: cfg.refresh,
          image_url_timeout: 30,
          update_firmware: false, firmware_url: '', reset_firmware: false, special_function: '',
        });
      }
      if (url.pathname === '/api/log') { console.log('device-log', (await req.text()).slice(0, 1500)); return json({ status: 200 }); }
      if (url.pathname.startsWith('/img/') || url.pathname === '/preview.png') {
        const demo = url.searchParams.has('demo') || String(env.DEMO) === 'true';
        const fb = await renderFrame(cfg, demo);
        if (url.pathname === '/preview.png') return bytes(toPng(fb), 'image/png');
        return bytes(toBmp(fb), 'image/bmp');
      }
      return new Response(page(origin, cfg), { headers: { 'content-type': 'text/html; charset=utf-8' } });
    } catch (e) {
      return new Response(`error: ${e.message}`, { status: 500 });
    }
  },
};

const json = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });
const bytes = (b, type) => new Response(b, { headers: { 'content-type': type, 'cache-control': 'no-store' } });

function config(env) {
  const n = (k) => { const v = parseFloat(env[k]); return Number.isFinite(v) ? v : DEFAULTS[k]; };
  return {
    lat: n('LATITUDE'), lon: n('LONGITUDE'), radius: n('RADIUS_NM'), fieldAlt: n('OWNSHIP_ALT_FT'),
    lowSlots: Math.round(n('LOW_SLOTS')), lowFt: n('LOW_FT'), altSlots: Math.round(n('ALT_SLOTS')),
    refresh: Math.max(1, Math.round(n("REFRESH_SECONDS"))),
    tagHold: Math.max(1, Math.round(n('TAG_HOLD_SECONDS'))),
    label: String(env.AIRPORT_LABEL || DEFAULTS.AIRPORT_LABEL).toUpperCase().slice(0, 5),
    tz: String(env.TIME_ZONE || DEFAULTS.TIME_ZONE),
    routes: String(env.ROUTES ?? DEFAULTS.ROUTES) !== 'false',
    mode: String(env.XS_MODE || DEFAULTS.XS_MODE) === 'radial' ? 'radial' : 'ew',
  };
}

function page(origin, cfg) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TRMNL OG cross-section</title>
<style>body{font:16px system-ui;margin:0;padding:24px;background:#111;color:#eee;display:grid;gap:16px;justify-items:center}
img{width:min(100%,800px);image-rendering:pixelated;background:#fff;border-radius:6px}code{background:#222;padding:2px 6px;border-radius:4px}
p{max-width:780px;margin:0}</style>
<h2>${cfg.label} cross-section for the TRMNL OG</h2>
<img id="p" src="/preview.png" alt="preview">
<p>Enter this as the <b>API server</b> in the device setup portal: <code>${origin}</code></p>
<p>Refresh rate sent to the device: ${cfg.refresh} s. Add <code>?demo=1</code> to the preview for synthetic traffic.</p>
<script>setInterval(()=>{document.getElementById('p').src='/preview.png?t='+Date.now()},${cfg.refresh * 1000})</script>`;
}

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------
let memo = { at: 0, key: '', list: null };

async function fetchAircraft(cfg) {
  const key = `${cfg.lat},${cfg.lon},${cfg.radius}`;
  if (memo.list && memo.key === key && Date.now() - memo.at < 6000) return memo.list;
  let lastErr = 'no sources';
  for (const build of SOURCES) {
    const url = build(cfg.lat, cfg.lon, cfg.radius);
    try {
      const r = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const d = await r.json();
        const list = d.ac || d.aircraft || [];
        memo = { at: Date.now(), key, list };
        return list;
      }
      lastErr = `${new URL(url).hostname} ${r.status}`;
    } catch (e) { lastErr = `${new URL(url).hostname} ${e.message}`; }
  }
  if (memo.list) return memo.list; // stale beats nothing
  throw new Error(`All ADS-B sources failed (${lastErr})`);
}

const routeCache = new Map(); // callsign -> { at, code }
async function lookupRoutes(flights) {
  const now = Date.now();
  const need = flights.filter((f) => f.airline && /^[A-Z]{3}\d/.test(f.callsign) &&
    !(routeCache.get(f.callsign) && now - routeCache.get(f.callsign).at < 30 * 60 * 1000));
  if (need.length) {
    try {
      const r = await fetch('https://api.adsb.lol/api/0/routeset', {
        method: 'POST',
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planes: need.map((f) => ({ callsign: f.callsign, lat: f.lat, lng: f.lon })) }),
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const rows = await r.json();
        const seen = new Set();
        for (const row of Array.isArray(rows) ? rows : []) {
          const cs = String(row.callsign || '').trim().toUpperCase();
          const codes = String(row._airport_codes_iata || '').split('-').filter(Boolean);
          seen.add(cs);
          routeCache.set(cs, { at: now, code: codes.length >= 2 && row.plausible !== false ? `${codes[0]}-${codes[codes.length - 1]}` : '' });
        }
        for (const f of need) if (!seen.has(f.callsign)) routeCache.set(f.callsign, { at: now, code: '' });
      }
    } catch (_) { /* routes are optional */ }
  }
  for (const f of flights) f.route = routeCache.get(f.callsign)?.code || '';
}

// Synthetic traffic that drifts with the clock, so successive refreshes visibly move.
const DEMO = [
  { flight: 'SWA1844', t: 'B38M', category: 'A3', x: -9, alt: 4200, gs: 170, track: 80, vr: -800 },
  { flight: 'AAL2291', t: 'A321', category: 'A3', x: 7, alt: 6800, gs: 230, track: 75, vr: 1800 },
  { flight: 'UAL1520', t: 'B789', category: 'A5', x: 21, alt: 15500, gs: 310, track: 245, vr: -1500 },
  { flight: 'DAL1123', t: 'A20N', category: 'A3', x: -16, alt: 24000, gs: 410, track: 50, vr: 2000 },
  { flight: 'FDX772', t: 'B77L', category: 'A5', x: 12, alt: 34000, gs: 470, track: 280, vr: 0 },
  { flight: 'SKW3301', t: 'CRJ9', category: 'A3', x: -4, alt: 3100, gs: 150, track: 85, vr: -700 },
  { flight: 'N734P', t: 'P28A', category: 'A1', x: -11, alt: 3500, gs: 105, track: 160, vr: 0 },
  { flight: 'N912C', t: 'C172', category: 'A1', x: 3, alt: 2600, gs: 90, track: 300, vr: -500 },
  { flight: 'LIFE31', t: 'EC35', category: 'A7', x: 1.5, alt: 2200, gs: 120, track: 40, vr: 0 },
  { flight: 'RCH407', t: 'C17', category: 'A5', dbFlags: 1, x: 18, alt: 19000, gs: 380, track: 270, vr: 0 },
];
function demoList(cfg, tms = Date.now()) {
  const t = tms / 1000;
  return DEMO.map((p, i) => {
    const period = 900;
    const tau = ((t + i * 97) % period) - period / 2;
    const d = (p.gs * tau) / 3600;
    const tr = (p.track * Math.PI) / 180;
    const x = p.x * (cfg.radius / 30) + Math.sin(tr) * d;
    const y = 1.2 * Math.cos(i) + Math.cos(tr) * d;
    return {
      hex: p.flight.toLowerCase(), flight: p.flight, t: p.t, category: p.category, dbFlags: p.dbFlags,
      lat: cfg.lat + y / 60, lon: cfg.lon + x / (60 * Math.cos((cfg.lat * Math.PI) / 180)),
      alt_baro: Math.max(cfg.fieldAlt + 300, Math.round(p.alt + (p.vr * tau) / 60)), gs: p.gs, track: p.track, baro_rate: p.vr,
    };
  });
}

const toRad = (d) => (d * Math.PI) / 180;
function distNm(la1, lo1, la2, lo2) {
  const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Dead reckoning: the ADS-B snapshot is a few seconds old by the time we draw, and the screen is redrawn
// every second or so, so slide each aircraft along its track (and vertical rate) by the data's age.
function advance(a, age) {
  const dt = Math.min(Math.max(age + (Number(a.seen_pos) || 0), -30), 30);
  if (!dt || typeof a.lat !== 'number' || typeof a.lon !== 'number') return a;
  const out = { ...a };
  const gs = Number(a.gs) || 0, trk = Number(a.track);
  if (gs > 30 && Number.isFinite(trk)) {
    const nm = (gs * dt) / 3600;
    out.lat = a.lat + (nm * Math.cos(toRad(trk))) / 60;
    out.lon = a.lon + (nm * Math.sin(toRad(trk))) / (60 * Math.cos(toRad(a.lat)));
  }
  const vr = Number(a.baro_rate ?? a.geom_rate ?? 0);
  if (typeof a.alt_baro === 'number' && Number.isFinite(vr)) out.alt_baro = Math.max(0, a.alt_baro + (vr * dt) / 60);
  return out;
}

function pickFlights(list, cfg, age = 0) {
  const eligible = list
    .map((a) => advance(a, age))
    .filter((a) => typeof a.lat === 'number' && typeof a.lon === 'number' && typeof a.alt_baro === 'number')
    .map((a) => {
      const callsign = String(a.flight || a.r || a.hex || '').trim().toUpperCase();
      const dist = distNm(cfg.lat, cfg.lon, a.lat, a.lon);
      const dx = (a.lon - cfg.lon) * Math.cos(toRad(cfg.lat)) * 60;
      const vr = Number(a.baro_rate ?? a.geom_rate ?? 0);
      const heading = Number(a.track ?? 0);
      const airlineName = getAirlineFromCallsign(a.flight);
      const ico = resolveIcon(a, airlineName);
      const brg = bearing(cfg.lat, cfg.lon, a.lat, a.lon);
      const rel = (heading - brg + 360) % 360;
      return {
        key: String(a.hex || callsign), callsign, type: String(a.t || '').toUpperCase(), alt: Math.round(a.alt_baro), gs: Math.round(a.gs || 0),
        heading: Math.round(heading), climbing: vr > 500, descending: vr < -500,
        dist, dx, lat: a.lat, lon: a.lon, military: (Number(a.dbFlags) & 1) === 1,
        icon: ico.shape, iconScale: ico.scale, outbound: rel < 90 || rel > 270,
        airline: airlineName !== 'Other', route: '',
      };
    })
    .filter((f) => f.dist <= cfg.radius);
  const byAlt = (a, b) => b.alt - a.alt, byDist = (a, b) => a.dist - b.dist;
  const low = eligible.filter((f) => f.alt < cfg.lowFt).sort(byDist).slice(0, cfg.lowSlots);
  const taken = new Set(low);
  const high = eligible.filter((f) => !taken.has(f)).sort(byAlt).slice(0, cfg.altSlots);
  return { shown: [...low, ...high], total: eligible.length, eligible };
}

function bearing(la1, lo1, la2, lo2) {
  const y = Math.sin(toRad(lo2 - lo1)) * Math.cos(toRad(la2));
  const x = Math.cos(toRad(la1)) * Math.sin(toRad(la2)) - Math.sin(toRad(la1)) * Math.cos(toRad(la2)) * Math.cos(toRad(lo2 - lo1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ---------------------------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------------------------
async function renderFrame(cfg, demo) {
  const fb = new Fb();
  let list = [], err = '';
  try { list = demo ? demoList(cfg) : await fetchAircraft(cfg); } catch (e) { err = e.message; }
  // Tags are laid out from a snapshot that only changes every TAG_HOLD_SECONDS, so they stay put and
  // their text updates slowly; the icons are drawn at the live position and joined to their tag by a leader line.
  const tNow = Date.now(), tLay = Math.floor(tNow / (cfg.tagHold * 1000)) * (cfg.tagHold * 1000);
  const ageAt = (t) => (demo ? 0 : (t - memo.at) / 1000);
  const { shown, total, eligible } = pickFlights(demo ? demoList(cfg, tLay) : list, cfg, ageAt(tLay));
  const live = new Map(pickFlights(demo ? demoList(cfg, tNow) : list, cfg, ageAt(tNow)).eligible.map((f) => [f.key, f]));
  const tEnd = tLay + cfg.tagHold * 1000;
  const later = new Map(pickFlights(demo ? demoList(cfg, tEnd) : list, cfg, ageAt(tEnd)).eligible.map((f) => [f.key, f]));
  for (const f of shown) { f.now = live.get(f.key) || f; f.later = later.get(f.key) || f.now; }
  if (cfg.routes && !demo) await lookupRoutes(shown);
  if (demo) for (const f of shown) if (f.airline) f.route = { SWA1844: 'DEN-PHX', AAL2291: 'PHX-DFW', UAL1520: 'SFO-PHX', DAL1123: 'PHX-ATL', FDX772: 'MEM-LAX' }[f.callsign] || '';
  drawFrame(fb, cfg, shown, total, eligible, err, tLay);
  return fb;
}

const CT = 68, CB = H - 42;      // graph box top / bottom (same insets as the Liquid template)
const CL = 56, CR = W - 16;     // graph box left / right

// Text with the baked Liberation Sans bitmaps (font.js). y is the baseline.
function tw(str, key) { const F = FONTS[key]; let w = 0; for (const ch of String(str)) w += (F.g[ch] || F.g[' '])[0]; return w; }
function T(fb, str, x, base, key) {
  const F = FONTS[key]; let cx = Math.round(x);
  for (const ch of String(str)) {
    const g = F.g[ch] || F.g[' '];
    if (g[4]) { const rows = g[4].split(','); for (let r = 0; r < rows.length; r++) for (let c = 0; c < g[3]; c++) if (rows[r][c] === '1') fb.px(cx + g[1] + c, base + g[2] + r, 1); }
    cx += g[0];
  }
  return cx;
}
function roundBox(fb, x, y, w, h, t) { box(fb, x, y, w, h, t); for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) fb.px(cx, cy, 0); }

let layoutCache = { sig: '', boxes: [] };
function drawFrame(fb, cfg, flights, total, eligible, err, layoutAt = 0) {
  // header
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: cfg.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const hb = 44;
  const lx = T(fb, cfg.label, 16, hb, 'b26');
  T(fb, 'AIRSPACE CROSS-SECTION', lx + 10, hb, 'b14');
  const tcount = String(eligible.length);
  const uw = tw(time, 'b20'), ux = W - 16 - uw;
  T(fb, time, ux, hb, 'b20');
  T(fb, 'UPDATED', ux + uw - tw('UPDATED', 'b10'), hb - 21, 'b10');
  const tx = ux - 22 - Math.max(tw(tcount, 'b20'), tw('TARGETS', 'b10'));
  const tww = Math.max(tw(tcount, 'b20'), tw('TARGETS', 'b10'));
  T(fb, tcount, tx + tww - tw(tcount, 'b20'), hb, 'b20');
  T(fb, 'TARGETS', tx + tww - tw('TARGETS', 'b10'), hb - 21, 'b10');
  fb.rect(16, 51, W - 32, 3, 1);

  // vertical scale (same banding as the X plugin: expanded low band)
  const maxAlt = flights.reduce((m, f) => Math.max(m, f.alt), 0);
  let ceiling = 10000, lowShare = 100;
  if (maxAlt > 40000) { ceiling = 50000; lowShare = 45; } else if (maxAlt > 30000) { ceiling = 40000; lowShare = 45; }
  else if (maxAlt > 20000) { ceiling = 30000; lowShare = 45; } else if (maxAlt > 10000) { ceiling = 20000; lowShare = 45; }
  const span = ceiling - 10000;
  const yOf = (alt) => {
    const a = Math.min(Math.max(alt, 0), ceiling);
    const fb_ = a <= 10000 ? (a * lowShare) / 10000 : lowShare + ((a - 10000) * (100 - lowShare)) / span;
    return CT + (1 - fb_ / 100) * (CB - CT);
  };
  const groundY = Math.round(yOf(cfg.fieldAlt));
  let classA = null;

  const half = (CL + CR) / 2, padX = 20;
  const innerNm = Math.min(10, cfg.radius / 3);
  const frac = (d) => { d = Math.min(Math.abs(d), cfg.radius); return d <= innerNm ? (d / innerNm) * 0.5 : 0.5 + ((d - innerNm) / (cfg.radius - innerNm)) * 0.5; };
  const radial = cfg.mode === 'radial';
  const x0 = radial ? CL + 28 : half;
  const xOf = (f) => radial ? Math.min(Math.max(x0 + frac(f.dist) * (CR - x0 - 24), CL + 14), CR - 14)
    : Math.min(Math.max(half + Math.sign(f.dx || 1) * frac(f.dx) * (half - CL - padX), CL + 14), CR - 14);

  // x ticks
  const step = cfg.radius >= 20 ? 10 : 5;
  const xt = [];
  if (!radial) for (let d = -Math.floor(cfg.radius / step) * step; d <= cfg.radius; d += step) xt.push({ x: half + Math.sign(d) * frac(d) * (half - CL - padX), label: d === 0 ? cfg.label : (d < 0 ? 'W' : 'E') + Math.abs(d) });
  else { xt.push({ x: x0, label: cfg.label }); for (let d = step; d <= cfg.radius; d += step) xt.push({ x: x0 + frac(d) * (CR - x0 - 24), label: `${d}${d + step > cfg.radius ? 'NM' : ''}` }); }

  // grid: vertical + horizontal dotted, 10k solid grey (1px checker)
  for (const t of xt) { const x = Math.round(t.x); for (let y = CT; y < CB - 3; y += 6) fb.rect(x, y, 1, 2, 1); }
  const tickAlts = ceiling === 10000 ? [2000, 4000, 6000, 8000, 10000] : [5000, 10000, 20000, 30000, 40000, 50000].filter((a) => a <= ceiling);
  for (const a of tickAlts) {
    const y = Math.round(yOf(a));
    if (a === 10000) { for (let x = CL; x < CR; x += 2) fb.px(x, y, 1); } else for (let x = CL; x < CR; x += 6) fb.rect(x, y, 2, 1, 1);
    const lab = `${a / 1000}k`;
    T(fb, lab, CL - 9 - tw(lab, 'b13'), y + 5, 'b13');
  }
  if (ceiling >= 20000) {
    const y = Math.round(yOf(18000));
    for (let x = CL; x < CR; x += 14) fb.rect(x, y, 9, 2, 1);
    const lab = 'FL180 / CLASS A', lw = tw(lab, 'b12');
    classA = rc(CR - lw - 10, y - 17, CR - 2, y);
    T(fb, lab, CR - lw - 5, y - 6, 'b12');
  }

  // ground line, axis borders, x labels
  fb.rect(CL, groundY, CR - CL, 3, 1);
  fb.rect(CL - 3, CT, 3, CB - CT, 1);
  fb.rect(CL - 3, CB - 3, CR - CL + 3, 3, 1);
  for (const t of xt) {
    const x = Math.round(t.x), w = tw(t.label, 'b13');
    T(fb, t.label, Math.min(Math.max(x - w / 2, 2), W - w - 2), CB + 18, 'b13');
  }

  const ax = Math.round(radial ? x0 : half);

  if (err && !flights.length) { fb.rect(180, 200, 440, 70, 0); box(fb, 180, 200, 440, 70, 3); T(fb, 'NO DATA', 330, 232, 'b20'); T(fb, err.slice(0, 50).toUpperCase(), 190, 256, 'b11'); drawFooter(fb, ceiling); return; }
  if (!flights.length) { fb.rect(250, 215, 300, 46, 0); box(fb, 250, 215, 300, 46, 3); T(fb, 'NO TARGETS IN RANGE', 270, 245, 'b14'); drawFooter(fb, ceiling); return; }

  // aircraft: icons at their live position, tags laid out around the path each icon will cover
  // before the layout is rebuilt (tagHold seconds), so a tag never sits where its own or a
  // neighbour's icon is about to fly.
  const clampY = (a) => Math.min(yOf(a), groundY - 10);
  const items = flights.map((f) => {
    const d = SHAPES[f.icon], iw = d[0] * f.iconScale * 0.95 * ICON_MUL, ih = d[1] * f.iconScale * 0.95 * ICON_MUL;
    const nw = f.now || f, lt = f.later || nw;
    const lx = xOf(f), ly = clampY(f.alt), ex = xOf(lt), ey = clampY(lt.alt);
    const r = Math.max(iw, ih) / 2 + 1;
    return {
      f, iw, ih, r, x: xOf(nw), y: clampY(nw.alt), lx, ly, ex, ey, mx: (lx + ex) / 2, my: (ly + ey) / 2,
      sweep: rc(Math.min(lx, ex) - r, Math.min(ly, ey) - r, Math.max(lx, ex) + r, Math.max(ly, ey) + r),
      tag: tagText(f), box: null,
    };
  });
  const fixed = [rc(0, groundY - 22, W, H), rc(0, 0, W, CT), rc(ax - 15, groundY - 28, ax + 15, groundY)];
  if (classA) fixed.push(classA);

  const candidates = (it) => {
    const { w, h } = it.tag, s = it.sweep, out = [];
    for (const g of [4, 10, 20, 34, 52, 76, 104]) {
      for (const o of [0, -0.5, 0.5]) {
        out.push([it.mx - w / 2 + o * w, s.t - g - h], [it.mx - w / 2 + o * w, s.b + g],
          [s.r + g, it.my - h / 2 + o * h], [s.l - g - w, it.my - h / 2 + o * h]);
      }
      out.push([s.r + g * 0.6, s.b + g * 0.6], [s.l - g * 0.6 - w, s.b + g * 0.6],
        [s.r + g * 0.6, s.t - g * 0.6 - h], [s.l - g * 0.6 - w, s.t - g * 0.6 - h]);
    }
    return out.map(([l, t]) => rc(l, t, l + w, t + h));
  };
  const leaderEnd = (it, bx) => [Math.min(Math.max(it.mx, bx.l), bx.r), Math.min(Math.max(it.my, bx.t), bx.b)];
  const cost = (it, bx) => {
    if (bx.l < CL + 3 || bx.r > CR - 2 || bx.t < CT + 2 || bx.b > groundY - 3) return Infinity;
    let c = 0;
    for (const ob of fixed) c += overlap(bx, ob) * 40;
    for (const jt of items) {
      c += overlap(bx, jt.sweep) * 40;
      if (jt !== it && jt.box) c += overlap(bx, jt.box) * 60;
    }
    const [px, py] = leaderEnd(it, bx);
    c += Math.hypot(px - it.mx, py - it.my) * 0.6;
    for (const jt of items) {
      if (jt === it) continue;
      if (segHitsRect(it.mx, it.my, px, py, jt.sweep)) c += 25;
      if (jt.box) {
        if (segHitsRect(it.mx, it.my, px, py, jt.box)) c += 400;
        const [qx, qy] = leaderEnd(jt, jt.box);
        if (segHitsRect(jt.mx, jt.my, qx, qy, bx)) c += 400;
      }
    }
    return c;
  };
  const place = (it) => {
    let best = null, bc = Infinity;
    for (const bx of candidates(it)) { const c = cost(it, bx); if (c < bc) { bc = c; best = bx; } }
    if (!best) { // nothing fits inside the chart: park it as close to its anchor as the chart allows
      const { w, h } = it.tag;
      const l = Math.min(Math.max(it.mx - w / 2, CL + 4), CR - w - 2), t = Math.min(Math.max(it.my + it.r + 4, CT + 2), groundY - h - 3);
      best = rc(l, t, l + w, t + h);
    }
    return best;
  };
  // The layout only changes when the hold bucket changes, so keep it between frames (per isolate).
  const sig = `${layoutAt}|${groundY}|${items.map((it) => `${it.f.key}:${it.tag.w}x${it.tag.h}`).join(',')}`;
  if (layoutCache.sig === sig) items.forEach((it, i) => { it.box = layoutCache.boxes[i]; });
  else {
    const order = [...items].sort((a, b) => b.tag.w * b.tag.h - a.tag.w * a.tag.h);
    for (const it of order) it.box = place(it);
    for (let pass = 0; pass < 2; pass++) for (const it of order) { // let each tag reconsider with everything else in place
      const old = it.box; it.box = null;
      const nb = place(it), oc = cost(it, old);
      it.box = cost(it, nb) < oc ? nb : old;
    }
    layoutCache = { sig, boxes: items.map((it) => it.box) };
  }

  for (const it of items) drawIcon(fb, it, cfg.mode);
  drawPoly(fb, 'ground_tower', ax, groundY - 13, 26, 26, 0, true);

  for (const it of items) {
    const f = it.f, big = f.airline, tg = it.tag, b = it.box;
    const nx = Math.min(Math.max(it.x, b.l), b.r), ny = Math.min(Math.max(it.y, b.t), b.b);
    if (Math.hypot(nx - it.x, ny - it.y) - it.r > 6) fb.line(it.x, it.y, nx, ny, 1, 1);
    fb.rect(b.l, b.t, tg.w, tg.h, 0);
    if (f.military) dashedBox(fb, b.l, b.t, tg.w, tg.h, big ? 2 : 1); else roundBox(fb, b.l, b.t, tg.w, tg.h, big ? 2 : 1);
    const cx = b.l + 5;
    let base = b.t + 3 + FONTS[tg.k1].a;
    const ex = T(fb, tg.l1, cx, base, tg.k1);
    if (f.type) T(fb, f.type, ex + 4, base, tg.kt);
    base += 1 + FONTS[tg.k2].h - 1;
    let x2 = T(fb, tg.alt, cx, base, tg.k2);
    if (tg.trend) { tri(fb, x2 + 2, base - 7, 7, tg.trend); x2 += 11; }
    T(fb, tg.spd, x2 + 4, base, tg.k2);
    if (f.route) T(fb, f.route, cx, base + FONTS[tg.k3].h, tg.k3);
  }
  drawFooter(fb, ceiling);
}

// Legend row, as in the template: AIRLINE / GA/OTHER / MIL on the left, CLIMB / DESC / scale note on the right.
function drawFooter(fb, ceiling) {
  const note = ceiling === 10000 ? '0-10NM EXPANDED' : '0-10NM / 0-10K EXPANDED';
  const base = H - 8, cy = base - 5;
  let x = 16;
  drawPoly(fb, 'a320', x + 7, cy, 14, 14, 90, true); x += 20; x = T(fb, 'AIRLINE', x, base, 'b11') + 14;
  drawPoly(fb, 'cessna', x + 7, cy, 14, 14, 90, false); x += 20; x = T(fb, 'GA/OTHER', x, base, 'b11') + 14;
  dashedBox(fb, x, cy - 5, 14, 10, 1); x += 20; T(fb, 'MIL', x, base, 'b11');
  let rx = W - 16 - tw(note, 'b11'); T(fb, note, rx, base, 'b11');
  rx -= 16 + tw('DESC', 'b11'); T(fb, 'DESC', rx, base, 'b11'); tri(fb, rx - 11, base - 8, 8, -1);
  rx -= 22 + tw('CLIMB', 'b11'); T(fb, 'CLIMB', rx, base, 'b11'); tri(fb, rx - 11, base - 8, 8, 1);
}

function rc(l, t, r, b) { return { l, t, r, b }; }

// Text and size of one tag.
function tagText(f) {
  const big = f.airline;
  const l1 = f.callsign.slice(0, 8);
  const k1 = big ? 'b12' : 'r10', kt = big ? 'b8' : 'r8', k2 = big ? 'b10' : 'r10', k3 = 'r9';
  const alt = f.alt >= 18000 ? `FL${String(Math.round(f.alt / 100)).padStart(3, '0')}` : `${(Math.round(f.alt / 100) / 10).toFixed(1)}k`;
  const spd = `${f.gs}kt`;
  const trend = f.climbing ? 1 : f.descending ? -1 : 0;
  const w1 = tw(l1, k1) + (f.type ? 4 + tw(f.type, kt) : 0);
  const w2 = tw(alt, k2) + (trend ? 11 : 0) + 4 + tw(spd, k2);
  const w3 = f.route ? tw(f.route, k3) : 0;
  const w = Math.ceil(Math.max(w1, w2, w3) + 10);
  const h = 4 + FONTS[k1].h - 1 + 1 + FONTS[k2].h - 1 + (f.route ? FONTS[k3].h : 0) + 4;
  return { l1, k1, kt, k2, k3, alt, spd, trend, w, h };
}

// Does the segment (x0,y0)-(x1,y1) pass through rectangle r? (Liang-Barsky)
function segHitsRect(x0, y0, x1, y1, r) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - r.l], [dx, r.r - x0], [-dy, y0 - r.t], [dy, r.b - y0]]) {
    if (p === 0) { if (q < 0) return false; } else {
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}
function overlap(a, b) { const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return w > 1 && h > 1 ? w * h : 0; }
function box(fb, x, y, w, h, t) { fb.rect(x, y, w, t, 1); fb.rect(x, y + h - t, w, t, 1); fb.rect(x, y, t, h, 1); fb.rect(x + w - t, y, t, h, 1); }
function dashedBox(fb, x, y, w, h, t) {
  for (let i = 0; i < w; i += 8) { fb.rect(x + i, y, Math.min(5, w - i), t, 1); fb.rect(x + i, y + h - t, Math.min(5, w - i), t, 1); }
  for (let i = 0; i < h; i += 8) { fb.rect(x, y + i, t, Math.min(5, h - i), 1); fb.rect(x + w - t, y + i, t, Math.min(5, h - i), 1); }
}
function tri(fb, x, y, s, dir) { fb.poly(dir > 0 ? [[x, y + s], [x + s / 2, y], [x + s, y + s]] : [[x, y], [x + s / 2, y + s], [x + s, y]], 1); }

// ---------------------------------------------------------------------------------------------
// Silhouettes: tar1090 icons flattened to polygons. Nose points up; rotated like the Liquid template does.
// ---------------------------------------------------------------------------------------------
function drawIcon(fb, it, mode) {
  const f = it.f.now || it.f;
  const pitch = f.climbing ? 20 : f.descending ? -20 : 0;
  const east = mode === 'ew' ? Math.sin(toRad(f.heading)) >= 0 : f.outbound;
  const rot = east ? 90 - pitch : 270 + pitch;
  drawPoly(fb, f.icon, it.x, it.y, it.iw, it.ih, rot, f.airline);
}

// Fill one icon into a w x h box centred on (cx, cy), rotated clockwise by rot degrees.
function drawPoly(fb, name, cx, cy, w, h, rot, solid) {
  const P = POLYS[name] || POLYS.unknown;
  const [vx, vy, vw, vh] = P.vb;
  const sc = Math.min(w / vw, h / vh), ox = vx + vw / 2, oy = vy + vh / 2;
  const a = (rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const rings = P.rings.map((r) => r.map(([x, y]) => { const X = (x - ox) * sc, Y = (y - oy) * sc; return [cx + X * c - Y * s, cy + X * s + Y * c]; }));
  fb.polys(rings, solid ? 1 : 0, P.rule);
  if (!solid) for (const r of rings) for (let i = 0; i < r.length; i++) fb.line(r[i][0], r[i][1], r[(i + 1) % r.length][0], r[(i + 1) % r.length][1], 1, 1);
}

// ---------------------------------------------------------------------------------------------
// 1-bit framebuffer. Bit 1 = white (BMP palette index 1). "black" arguments are truthy for ink.
// ---------------------------------------------------------------------------------------------
class Fb {
  constructor() { this.b = new Uint8Array(ROWB * H); this.b.fill(255); }
  px(x, y, ink = 1) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = y * ROWB + (x >> 3), m = 0x80 >> (x & 7);
    if (ink) this.b[i] &= ~m; else this.b[i] |= m;
  }
  rect(x, y, w, h, ink = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const k = j * ROWB + (i >> 3), m = 0x80 >> (i & 7);
      if (ink) this.b[k] &= ~m; else this.b[k] |= m;
    }
  }
  line(x0, y0, x1, y1, t = 1, ink = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor((t - 1) / 2);
    for (;;) {
      if (t <= 1) this.px(x0, y0, ink); else this.rect(x0 - o, y0 - o, t, t, ink);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  poly(pts, ink = 1) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const n = pts.length;
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      const yy = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])), 1, ink);
    }
  }
  disc(cx, cy, r, ink = 1, maxY = H - 1) {
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(maxY, Math.ceil(cy + r)); y++) {
      const dy = y - cy, hw = Math.sqrt(Math.max(0, r * r - dy * dy));
      this.rect(Math.round(cx - hw), y, Math.max(1, Math.round(2 * hw)), 1, ink);
    }
  }
  // Fill several rings at once with the SVG rule (nonzero or evenodd), so holes in an icon stay open.
  polys(rings, ink = 1, rule = 'nonzero') {
    let minY = Infinity, maxY = -Infinity;
    for (const r of rings) for (const p of r) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      const yy = y + 0.5, xs = [];
      for (const r of rings) for (let i = 0, n = r.length; i < n; i++) {
        const a = r[i], b = r[(i + 1) % n];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push([a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]);
      }
      xs.sort((p, q) => p[0] - q[0]);
      let wnd = 0;
      for (let i = 0; i + 1 < xs.length; i++) {
        wnd += rule === 'evenodd' ? 1 : xs[i][1];
        if (rule === 'evenodd' ? wnd % 2 !== 0 : wnd !== 0) {
          const l = Math.round(xs[i][0]), rr = Math.round(xs[i + 1][0]);
          if (rr > l) this.rect(l, y, rr - l, 1, ink);
        }
      }
    }
  }
  text(str, x, y, scale = 2) {
    scale = Math.max(1, Math.round(scale));
    let cx = Math.round(x);
    for (const ch of String(str).toUpperCase()) {
      const g = FONT[ch] || FONT[' '];
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '1') this.rect(cx + k * scale, y + r * scale, scale, scale, 1);
      cx += 4 * scale;
    }
    return cx;
  }
}

const FONT = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '011', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '010', '010'], '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['111', '101', '101', '111', '001'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  '-': ['000', '000', '111', '000', '000'], ':': ['000', '010', '000', '010', '000'], '.': ['000', '000', '000', '000', '010'],
  '/': ['001', '001', '010', '100', '100'], '+': ['000', '010', '111', '010', '000'], ' ': ['000', '000', '000', '000', '000'],
};

// ---------------------------------------------------------------------------------------------
// Encoders
// ---------------------------------------------------------------------------------------------
// 800x480, 1 bpp, 62 byte header, bottom-up rows, palette [black, white]: what the TRMNL firmware checks for.
function toBmp(fb) {
  const out = new Uint8Array(62 + ROWB * H);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  v.setUint32(2, out.length, true); v.setUint32(10, 62, true);
  v.setUint32(14, 40, true); v.setInt32(18, W, true); v.setInt32(22, H, true);
  v.setUint16(26, 1, true); v.setUint16(28, 1, true); v.setUint32(30, 0, true);
  v.setUint32(34, ROWB * H, true); v.setUint32(38, 2835, true); v.setUint32(42, 2835, true);
  v.setUint32(46, 2, true); v.setUint32(50, 2, true);
  out.set([0, 0, 0, 0, 255, 255, 255, 0], 54);
  for (let y = 0; y < H; y++) out.set(fb.b.subarray(y * ROWB, (y + 1) * ROWB), 62 + (H - 1 - y) * ROWB);
  return out;
}

let crcT;
function crc32(buf) {
  if (!crcT) { crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcT[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function toPng(fb) {
  const raw = new Uint8Array((ROWB + 1) * H);
  for (let y = 0; y < H; y++) raw.set(fb.b.subarray(y * ROWB, (y + 1) * ROWB), y * (ROWB + 1) + 1);
  let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  const z = new Uint8Array(2 + 5 + raw.length + 4);
  z[0] = 0x78; z[1] = 0x01; z[2] = 1;
  z[3] = raw.length & 255; z[4] = raw.length >> 8; z[5] = ~raw.length & 255; z[6] = (~raw.length >> 8) & 255;
  z.set(raw, 7);
  new DataView(z.buffer).setUint32(7 + raw.length, ((b << 16) | a) >>> 0);
  const chunk = (type, data) => {
    const c = new Uint8Array(12 + data.length), dv = new DataView(c.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) c[4 + i] = type.charCodeAt(i);
    c.set(data, 8);
    dv.setUint32(8 + data.length, crc32(c.subarray(4, 8 + data.length)));
    return c;
  };
  const ihdr = new Uint8Array(13), hv = new DataView(ihdr.buffer);
  hv.setUint32(0, W); hv.setUint32(4, H); ihdr[8] = 1; ihdr[9] = 0;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
