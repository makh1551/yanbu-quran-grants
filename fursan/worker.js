// عامل موقع «فرسان وفارسات القرآن» — fursan.yanbuquran.app
// يقرأ الملفات من نسخة مثبّتة (commit) في المستودع، ويحفظها في ذاكرة الحافة؛ عند التحديث يُغيَّر REV إلى آخر commit ويُعاد رفع العامل.
// صفحة اللجنة /lajna محمية بكلمة مرور (السر LAJNA_PASS)، وبياناتها في قاعدة D1 «fursan-lajna» (الربط DB).
const REV = '289f250cccfabb5e285f6a9d5b11f3ed4f9846e6';
const BASE = 'https://raw.githubusercontent.com/makh1551/yanbu-quran-grants/' + REV + '/fursan';
const FILES = { '/': 'index.html', '/team': 'team.html', '/logo.png': 'logo.png', '/name.png': 'name.png', '/logo-white.png': 'logo-white.png', '/name-white.png': 'name-white.png', '/letterhead-a4.jpg': 'letterhead-a4.jpg', '/rayah.pdf': 'rayah.pdf', '/letter.pdf': 'letter.pdf', '/plan.pdf': 'plan.pdf', '/form.pdf': 'form.pdf', '/certs.pdf': 'certs.pdf', '/shield.pdf': 'shield.pdf', '/agreement.docx': 'agreement.docx', '/rayah-g.pdf': 'rayah-g.pdf', '/plan-g.pdf': 'plan-g.pdf', '/banin': 'banin.html', '/banat': 'banat.html', '/letter-g.pdf': 'letter-g.pdf', '/agreement-g.docx': 'agreement-g.docx', '/certs-g.pdf': 'certs-g.pdf', '/shield-g.pdf': 'shield-g.pdf', '/letter-all.pdf': 'letter-all.pdf', '/letter-takamul.pdf': 'letter-takamul.pdf', '/letter-marafiq.pdf': 'letter-marafiq.pdf', '/letter-samref.pdf': 'letter-samref.pdf', '/letter-luberef.pdf': 'letter-luberef.pdf', '/letter-sec.pdf': 'letter-sec.pdf' };
const PRIVATE = { '/lajna': 'lajna.html', '/lajna/tarshih.xlsx': 'tarshih.xlsx' };
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const H = { 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
const ALIAS = { '/team.html': '/team', '/index.html': '/', '/banin.html': '/banin', '/banat.html': '/banat', '/lajna.html': '/lajna' };
const DOCS = ['schedule', 'members', 'checklist', 'qnotes'];
const COOKIE = 'lj';

async function token(env) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((env.LAJNA_PASS || '') + '|fursan-lajna-1448'));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function authed(req, env) {
  if (!env.LAJNA_PASS) return false;
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([a-f0-9]{64})'));
  return !!m && m[1] === await token(env);
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...H } }); }
function loginPage(err) {
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>دخول اللجنة — فرسان وفارسات القرآن</title><link rel="icon" href="/logo.png"><link href="https://fonts.googleapis.com/css2?family=Almarai:wght@700;800&family=IBM+Plex+Sans+Arabic:wght@500&display=swap" rel="stylesheet"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(160deg,#0B5071,#062F44);font-family:"IBM Plex Sans Arabic"}form{background:#fff;border-radius:20px;padding:30px 26px;width:min(340px,88vw);text-align:center;box-shadow:0 20px 40px rgba(0,0,0,.25)}img{height:60px}h1{font-family:Almarai;font-weight:800;color:#0B5071;font-size:20px;margin:10px 0 4px}p{color:#5C6E78;font-size:14px;margin:0 0 16px}input{width:100%;box-sizing:border-box;font-size:16px;border:1px solid #D3E6EE;border-radius:12px;padding:12px;text-align:center}button{margin-top:12px;width:100%;border:0;border-radius:99px;padding:12px;font-family:Almarai;font-weight:800;font-size:15px;background:linear-gradient(90deg,#B8901E,#E3B740);color:#062F44;cursor:pointer}.e{color:#B3261E;font-size:13px;margin-top:10px}</style></head><body><form method="post" action="/lajna/login"><img src="/logo.png" alt=""><h1>لجنة «فرسان وفارسات القرآن»</h1><p>صفحة داخلية لأعضاء اللجنة</p><input type="password" name="p" placeholder="كلمة المرور" autocomplete="current-password" required autofocus><button>دخول</button>${err ? '<div class="e">كلمة المرور غير صحيحة</div>' : ''}</form></body></html>`, { status: err ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...H } });
}
async function serve(file, req, ctx, priv) {
  const ext = file.split('.').pop();
  const key = new Request('https://fursan-cache.local/' + REV + '/' + file);
  const cache = caches.default;
  let hit = await cache.match(key);
  if (!hit) {
    const r = await fetch(BASE + '/' + file, { cf: { cacheTtl: 31536000, cacheEverything: true } });
    if (!r.ok) return new Response('غير متاح مؤقتًا', { status: 502, headers: H });
    const body = await r.arrayBuffer();
    hit = new Response(body, { headers: { 'content-type': TYPES[ext], 'cache-control': 'public, max-age=31536000' } });
    ctx.waitUntil(cache.put(key, hit.clone()));
  }
  const browser = priv ? 'private, no-store' : ext === 'html' ? 'public, max-age=300' : 'public, max-age=604800';
  return new Response(req.method === 'HEAD' ? null : hit.body, { headers: { 'content-type': TYPES[ext], 'cache-control': browser, 'x-rev': REV.slice(0, 7), ...H } });
}
async function apiRoute(req, env, path) {
  if (!await authed(req, env)) return json({ error: 'auth' }, 401);
  const db = env.DB;
  const now = new Date().toISOString();
  if (path === '/lajna/api/all' && req.method === 'GET') {
    const d = await db.prepare('SELECT k, v FROM docs').all();
    const s = await db.prepare('SELECT data FROM scores').all();
    const docs = {};
    for (const r of d.results) { try { docs[r.k] = JSON.parse(r.v); } catch (e) {} }
    return json({ docs, scores: s.results.map(r => JSON.parse(r.data)) });
  }
  let m = path.match(/^\/lajna\/api\/doc\/([a-z]+)$/);
  if (m && req.method === 'PUT') {
    if (!DOCS.includes(m[1])) return json({ error: 'key' }, 400);
    const v = await req.text();
    if (v.length > 200000) return json({ error: 'size' }, 413);
    JSON.parse(v);
    await db.prepare('INSERT INTO docs (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = ?2, at = ?3').bind(m[1], v, now).run();
    return json({ ok: true });
  }
  if (path === '/lajna/api/scores' && req.method === 'POST') {
    const rows = await req.json();
    if (!Array.isArray(rows) || rows.length > 1000) return json({ error: 'rows' }, 400);
    const st = db.prepare('INSERT INTO scores (id, data, at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET data = ?2, at = ?3');
    const batch = [];
    for (const r of rows) {
      if (!r || typeof r.id !== 'string' || r.id.length > 64) return json({ error: 'id' }, 400);
      const data = JSON.stringify(r);
      if (data.length > 4000) return json({ error: 'size' }, 413);
      batch.push(st.bind(r.id, data, now));
    }
    if (batch.length) await db.batch(batch);
    return json({ ok: true, n: batch.length });
  }
  m = path.match(/^\/lajna\/api\/scores\/([A-Za-z0-9-]{1,64})$/);
  if (m && req.method === 'DELETE') {
    await db.prepare('DELETE FROM scores WHERE id = ?1').bind(m[1]).run();
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    path = ALIAS[path] || path;
    if (path.startsWith('/lajna/api/')) return apiRoute(req, env, path);
    if (path === '/lajna/login' && req.method === 'POST') {
      const f = await req.formData();
      const p = String(f.get('p') || '');
      if (env.LAJNA_PASS && p === env.LAJNA_PASS) {
        return new Response(null, { status: 303, headers: { location: '/lajna', 'set-cookie': `${COOKIE}=${await token(env)}; Path=/lajna; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax`, ...H } });
      }
      await new Promise(r => setTimeout(r, 800));
      return loginPage(true);
    }
    if (path === '/lajna/logout') return new Response(null, { status: 303, headers: { location: '/lajna', 'set-cookie': `${COOKIE}=; Path=/lajna; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, ...H } });
    if (PRIVATE[path]) {
      if (!['GET', 'HEAD'].includes(req.method)) return new Response('', { status: 405, headers: H });
      if (!await authed(req, env)) return path === '/lajna' ? loginPage(false) : new Response(null, { status: 303, headers: { location: '/lajna', ...H } });
      return serve(PRIVATE[path], req, ctx, true);
    }
    const file = FILES[path];
    if (!file || !['GET', 'HEAD'].includes(req.method)) return new Response('الصفحة غير موجودة', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...H } });
    return serve(file, req, ctx, false);
  },
};
