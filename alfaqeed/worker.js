// عامل موقع «حملة الفقيد» — sadaqa.yanbuquran.app
// الصفحات من مستودع الجمعية، والحملات في مخزن KV (الربط: CAMPAIGNS)، ورمز الإدارة في ADMIN_CODE.
const BASE = 'https://raw.githubusercontent.com/makh1551/yanbu-quran-grants/main/alfaqeed';
const FILES = { '/': 'index.html', '/majlis': 'majlis.html', '/admin': 'admin.html', '/style.css': 'style.css', '/app.js': 'app.js', '/logo.png': 'logo.png', '/waqf.jpg': 'waqf.jpg' };
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', png: 'image/png', jpg: 'image/jpeg' };
const PROJECTS = ['halaqa', 'mushaf', 'student', 'waqf'];
const STATUSES = ['pending', 'active', 'closed', 'rejected'];
const SUFFIXES = ['رحمه الله', 'رحمها الله'];
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...NOINDEX } });
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const digits = (v) => String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, '');
const newId = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(6))].map((x) => a[x % a.length]).join(''); };
const validId = (id) => /^[a-z0-9]{6}$/.test(id || '');

async function serveFile(file) {
  const r = await fetch(BASE + '/' + file, { cf: { cacheTtl: 120, cacheEverything: true } });
  if (!r.ok) return new Response('غير متاح', { status: 502, headers: NOINDEX });
  const ext = file.split('.').pop();
  return new Response(r.body, { headers: { 'content-type': TYPES[ext], 'cache-control': ext === 'html' ? 'public, max-age=60' : 'public, max-age=300', ...NOINDEX } });
}

// حد للمحاولات لكل عنوان: n محاولة في الساعة
async function limited(env, key, max) {
  const k = 'rl:' + key, n = parseInt((await env.CAMPAIGNS.get(k)) || '0', 10);
  if (n >= max) return true;
  await env.CAMPAIGNS.put(k, String(n + 1), { expirationTtl: 3600 });
  return false;
}

async function readBody(req) {
  const t = await req.text();
  if (t.length > 4000) return null;
  try { const o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}

async function createRequest(req, env, ip) {
  const b = await readBody(req);
  if (!b) return json({ error: 'بيانات الطلب غير صالحة.' }, 400);
  if (b.website) return json({ id: newId() }); // مصيدة الروبوتات
  const c = {
    name: clean(b.name, 60), suffix: SUFFIXES.includes(b.suffix) ? b.suffix : SUFFIXES[0], project: b.project,
    requester: clean(b.requester, 60), relation: clean(b.relation, 30), phone: digits(b.phone), remind: b.remind === true,
  };
  if (c.name.split(' ').length < 2) return json({ error: 'اكتب اسم الفقيد ثلاثيًا.' }, 400);
  if (!PROJECTS.includes(c.project)) return json({ error: 'اختر مشروع الحملة.' }, 400);
  if (c.requester.length < 3) return json({ error: 'اكتب اسمك.' }, 400);
  if (!/^05\d{8}$/.test(c.phone)) return json({ error: 'اكتب رقم الجوال بصيغة 05xxxxxxxx.' }, 400);
  if (await limited(env, 'req:' + ip, 5)) return json({ error: 'تجاوزت عدد الطلبات المسموح به مؤقتًا.' }, 429);
  let id = newId();
  while (await env.CAMPAIGNS.get('c:' + id)) id = newId();
  const now = new Date().toISOString();
  Object.assign(c, { id, status: 'pending', link: '', total: 0, donors: 0, year: 1, reminded: '', created: now, updated: now });
  await env.CAMPAIGNS.put('c:' + id, JSON.stringify(c));
  return json({ id });
}

async function publicCampaign(env, id) {
  if (!validId(id)) return json({ error: 'غير موجودة' }, 404);
  const c = await env.CAMPAIGNS.get('c:' + id, 'json');
  if (!c || !['active', 'closed'].includes(c.status)) return json({ error: 'غير موجودة' }, 404);
  const { name, suffix, project, status, link, total, donors } = c;
  return json({ id, name, suffix, project, status, link, total, donors, year: c.year || 1 });
}

async function admin(req, env, action, ip) {
  if (!env.ADMIN_CODE || req.headers.get('x-admin-code') !== env.ADMIN_CODE) {
    if (await limited(env, 'adm:' + ip, 10)) return json({ error: 'محاولات كثيرة، حاول لاحقًا.' }, 429);
    return json({ error: 'رمز الدخول غير صحيح.' }, 401);
  }
  if (action === 'list' && req.method === 'GET') {
    const items = [];
    let cursor;
    do {
      const l = await env.CAMPAIGNS.list({ prefix: 'c:', cursor });
      const vals = await Promise.all(l.keys.map((k) => env.CAMPAIGNS.get(k.name, 'json')));
      items.push(...vals.filter(Boolean));
      cursor = l.list_complete ? null : l.cursor;
    } while (cursor);
    items.sort((a, b) => (a.created < b.created ? 1 : -1));
    return json({ items });
  }
  if (req.method !== 'POST') return json({ error: 'غير مسموح' }, 405);
  const b = await readBody(req);
  if (!b || !validId(b.id)) return json({ error: 'بيانات غير صالحة.' }, 400);
  const key = 'c:' + b.id, c = await env.CAMPAIGNS.get(key, 'json');
  if (!c) return json({ error: 'الطلب غير موجود.' }, 404);
  if (action === 'delete') { await env.CAMPAIGNS.delete(key); return json({ ok: true }); }
  if (action === 'update') {
    if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return json({ error: 'حالة غير صالحة.' }, 400); c.status = b.status; }
    if (b.link !== undefined) {
      const link = clean(b.link, 300);
      if (link) {
        let h = ''; try { const u = new URL(link); if (u.protocol === 'https:') h = u.hostname; } catch (e) {}
        if (!(h === 'yq.org.sa' || h.endsWith('.yq.org.sa'))) return json({ error: 'رابط التبرع يجب أن يكون على نطاق الجمعية yq.org.sa.' }, 400);
      }
      c.link = link;
    }
    if (b.total !== undefined) c.total = Math.max(0, Math.min(1e9, parseInt(b.total, 10) || 0));
    if (b.donors !== undefined) c.donors = Math.max(0, Math.min(1e7, parseInt(b.donors, 10) || 0));
    if (b.remind !== undefined) c.remind = b.remind === true;
    c.updated = new Date().toISOString();
    await env.CAMPAIGNS.put(key, JSON.stringify(c));
    return json({ ok: true });
  }
  // الذكرى السنوية: تسجيل التذكير، أو تجديد الحملة لعام جديد
  if (action === 'reminded' || action === 'renew') {
    c.reminded = new Date().toISOString();
    if (action === 'renew') { c.year = (c.year || 1) + 1; c.status = 'active'; }
    c.updated = c.reminded;
    await env.CAMPAIGNS.put(key, JSON.stringify(c));
    return json({ ok: true });
  }
  return json({ error: 'غير موجود' }, 404);
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname.replace(/\/+$/, '') || '/';
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    try {
      if (p.startsWith('/api/')) {
        if (p === '/api/request' && req.method === 'POST') return await createRequest(req, env, ip);
        if (p.startsWith('/api/c/') && req.method === 'GET') return await publicCampaign(env, p.slice(7));
        if (p.startsWith('/api/admin/')) return await admin(req, env, p.slice(11), ip);
        return json({ error: 'غير موجود' }, 404);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return new Response('غير مسموح', { status: 405, headers: NOINDEX });
      if (FILES[p]) return await serveFile(FILES[p]);
      if (/^\/c\/[a-z0-9]{6}$/.test(p)) return await serveFile('c.html');
      return Response.redirect(u.origin + '/', 302);
    } catch (e) {
      return json({ error: 'حدث خطأ غير متوقع.' }, 500);
    }
  },
};
