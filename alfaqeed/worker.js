// عامل موقع «حملة الفقيد» — sadaqa.yanbuquran.app
// الصفحات من مستودع الجمعية، والحملات في مخزن KV (الربط: CAMPAIGNS)، ورمز الإدارة في ADMIN_CODE.
// تنبيه تيليجرام لكل طلب جديد عبر مخزن واتسابي (الربط: WA، المفتاح tg_out).
const BASE = 'https://raw.githubusercontent.com/makh1551/yanbu-quran-grants/main/alfaqeed';
const FILES = { '/': 'index.html', '/majlis': 'majlis.html', '/admin': 'admin.html', '/talab': 'talab.html', '/style.css': 'style.css', '/app.js': 'app.js', '/logo.png': 'logo.png', '/waqf.jpg': 'waqf.jpg', '/talab.jpg': 'talab.jpg', '/ahl-photo.jpg': 'ahl-photo.jpg', '/ahl-logo.png': 'ahl-logo.png' };
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', png: 'image/png', jpg: 'image/jpeg' };
const PROJECTS = ['halaqa', 'mushaf', 'student', 'waqf'];
const PROJECT_NAMES = { halaqa: 'كفالة حلقة', mushaf: 'ورّث مصحفًا', student: 'كفالة طالب', waqf: 'أسهم في وقف الأم' };
// باقات الطلب (مطابقة لنموذج «صدقة جارية لعزيز عليك»): [الكمية، المبلغ]
const PACKAGES = { halaqa: [[1, 7000], [2, 14000]], mushaf: [[50, 1500], [100, 3000], [150, 4500], [200, 6000]], waqf: [[30, 3000], [50, 5000], [100, 10000]] };
const UNITS = { halaqa: 'حلقة', mushaf: 'مصحف', waqf: 'سهم' };
const STATUSES = ['pending', 'active', 'closed', 'rejected'];
const SUFFIXES = ['رحمه الله', 'رحمها الله'];
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...NOINDEX } });
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const digits = (v) => String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, '');
const newId = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(6))].map((x) => a[x % a.length]).join(''); };
const validId = (id) => /^[a-z0-9]{6}$/.test(id || '');
const newKey = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(10))].map((x) => a[x % a.length]).join(''); };
const validKey = (k) => /^[a-z0-9]{10}$/.test(k || '');
const DAYS = (project) => (project === 'halaqa' ? 45 : 30);
const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 864e5).toISOString();

// الحصيلة الحيّة من صفحة المشروع في المتجر (المبلغ المجموع والمستهدف والنسبة)، مع ذاكرة مؤقتة دقيقة واحدة
async function storeLive(link, ctx) {
  const m = String(link || '').match(/^https:\/\/store\.yq\.org\.sa\/p\/(\d{3,9})/);
  if (!m) return null;
  const key = new Request('https://cache.alfaqeed/store/' + m[1]);
  const hit = await caches.default.match(key);
  if (hit) return hit.json();
  let st = { ok: false, collected: 0, target: 0, pct: 0 };
  try {
    const r = await fetch('https://store.yq.org.sa/p/' + m[1], { headers: { 'user-agent': 'Mozilla/5.0 (alfaqeed status)', 'accept-language': 'ar' }, cf: { cacheTtl: 0 } });
    const h = await r.text();
    const x = h.match(/<div class="col-4">\s*([\d,.]+)\s*<i class='iconf-sar'><\/i>\s*<\/div>\s*<div class="col-4 text-center">\s*%\s*(\d+)\s*<\/div>\s*<div class="col-4 text-end">\s*([\d,.]+)/);
    const n = (v) => Number(String(v).replace(/,/g, '')) || 0;
    if (r.ok && x) st = { ok: true, collected: n(x[1]), pct: Number(x[2]), target: n(x[3]) };
  } catch (e) {}
  const res = new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=60' } });
  if (ctx) ctx.waitUntil(caches.default.put(key, res.clone())); else await caches.default.put(key, res.clone());
  return st;
}
const liveTotal = (c, st) => Math.max(c.total || 0, st && st.ok ? Math.round(st.collected) : 0);

async function serveFile(file) {
  const r = await fetch(BASE + '/' + file, { cf: { cacheTtl: 120, cacheEverything: true } });
  if (!r.ok) return new Response('غير متاح', { status: 502, headers: NOINDEX });
  const ext = file.split('.').pop();
  return new Response(r.body, { headers: { 'content-type': TYPES[ext], 'cache-control': ext === 'html' ? 'public, max-age=60' : 'public, max-age=300', ...(file === 'index.html' ? { 'x-content-type-options': 'nosniff' } : NOINDEX) } });
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

// يُضاف التنبيه إلى صندوق تيليجرام في واتسابي، ويرسله عامل واتسابي خلال دقيقة
async function notify(env, c) {
  if (!env.WA) return;
  const msg = [
    'طلب صدقة جارية جديد',
    'العزيز: ' + c.name + ' ' + c.suffix,
    'المشروع: ' + (PROJECT_NAMES[c.project] || c.project),
    c.qty ? 'الكمية: ' + c.qty + ' ' + (UNITS[c.project] || '') + ' — ' + c.goal + ' ريال' : '',
    'مقدّم الطلب: ' + c.requester + (c.relation ? ' (' + c.relation + ')' : ''),
    'الجوال: ' + c.phone,
    'التذكير السنوي: ' + (c.remind ? 'نعم' : 'لا'),
    '',
    'للاعتماد ووضع رابط المتجر:',
    'https://sadaqa.yanbuquran.app/admin',
    '',
    'تصاميم صور المتجر:',
    'https://tasmim.yanbuquran.app/?track=' + c.project + '&name=' + encodeURIComponent(c.name),
  ].filter((x, i) => x !== '' || i > 6).join('\n');
  const prev = await env.WA.get('tg_out');
  await env.WA.put('tg_out', prev ? prev + '\n\n— — —\n\n' + msg : msg);
  // تنبيه واتساب للأرقام المحددة (المفتاح alert_phones في مخزن الحملات)، يرسله «واتسابي» خلال دقيقة
  const phones = (await env.CAMPAIGNS.get('alert_phones', 'json')) || [];
  await Promise.all(phones.slice(0, 10).map((ph, i) => env.WA.put('wa_out:sadaqa-' + c.id + '-' + i, JSON.stringify({ phone: String(ph), text: msg }))));
}

async function createRequest(req, env, ip, ctx) {
  const b = await readBody(req);
  if (!b) return json({ error: 'بيانات الطلب غير صالحة.' }, 400);
  if (b.website) return json({ id: newId() }); // مصيدة الروبوتات
  const c = {
    name: clean(b.name, 60), suffix: SUFFIXES.includes(b.suffix) || b.suffix === '' ? b.suffix : SUFFIXES[0], project: b.project,
    requester: clean(b.requester, 60), relation: clean(b.relation, 30), phone: digits(b.phone), remind: b.remind === true, commit: b.commit === true,
  };
  if (c.name.split(' ').length < 2) return json({ error: 'اكتب الاسم ثلاثيًا.' }, 400);
  if (!PROJECTS.includes(c.project)) return json({ error: 'اختر مشروع الحملة.' }, 400);
  if (PACKAGES[c.project]) {
    const pk = PACKAGES[c.project].find(([q, a]) => q === Number(b.qty) && a === Number(b.goal));
    if (!pk) return json({ error: 'اختر الصدقة الجارية المناسبة لكم.' }, 400);
    c.qty = pk[0]; c.goal = pk[1];
  }
  if (c.requester.length < 3) return json({ error: 'اكتب اسمك.' }, 400);
  if (!/^05\d{8}$/.test(c.phone)) return json({ error: 'اكتب رقم الجوال بصيغة 05xxxxxxxx.' }, 400);
  if (!c.commit) return json({ error: 'الموافقة على مدة الحملة وآلية تخصيص المبلغ شرط لتقديم الطلب.' }, 400);
  if (await limited(env, 'req:' + ip, 5)) return json({ error: 'تجاوزت عدد الطلبات المسموح به مؤقتًا.' }, 429);
  let id = newId();
  while (await env.CAMPAIGNS.get('c:' + id)) id = newId();
  const now = new Date().toISOString();
  Object.assign(c, { id, key: newKey(), status: 'pending', link: '', total: 0, donors: 0, year: 1, reminded: '', created: now, updated: now });
  await env.CAMPAIGNS.put('c:' + id, JSON.stringify(c));
  ctx.waitUntil(notify(env, c).catch(() => {}));
  return json({ id });
}

async function publicCampaign(env, id, ctx) {
  if (!validId(id)) return json({ error: 'غير موجودة' }, 404);
  const c = await env.CAMPAIGNS.get('c:' + id, 'json');
  if (!c || !['active', 'closed'].includes(c.status)) return json({ error: 'غير موجودة' }, 404);
  const { name, suffix, project, status, link, donors } = c;
  const total = liveTotal(c, await storeLive(link, ctx));
  return json({ id, name, suffix, project, status, link, total, donors, goal: c.goal || 0, qty: c.qty || 0, year: c.year || 1 });
}

// صفحة الأسرة: رابط خاص /ahl/<id>/<key>
async function family(req, env, id, key, action, ctx) {
  if (!validId(id) || !validKey(key)) return json({ error: 'الرابط غير صحيح.' }, 404);
  const c = await env.CAMPAIGNS.get('c:' + id, 'json');
  if (!c || c.key !== key || c.status === 'rejected') return json({ error: 'الرابط غير صحيح.' }, 404);
  if (action === 'remind') {
    if (req.method !== 'POST') return json({ error: 'غير مسموح' }, 405);
    const b = await readBody(req);
    c.remind = !!(b && b.remind === true); c.updated = new Date().toISOString();
    await env.CAMPAIGNS.put('c:' + id, JSON.stringify(c));
    return json({ ok: true, remind: c.remind });
  }
  if (action) return json({ error: 'غير موجود' }, 404);
  const st = await storeLive(c.link, ctx);
  const days = DAYS(c.project), ends = c.started ? addDays(c.started, days) : '';
  return json({
    id, name: c.name, suffix: c.suffix || '', project: c.project, qty: c.qty || 0, goal: c.goal || 0, requester: c.requester,
    status: c.status, link: c.link || '', total: liveTotal(c, st), donors: c.donors || 0, live: !!(st && st.ok),
    created: c.created, started: c.started || '', days, ends, remind: !!c.remind, photo: c.photo || '', result: c.result || '', year: c.year || 1,
  });
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
      for (const v of vals) { if (v && !v.key) { v.key = newKey(); await env.CAMPAIGNS.put('c:' + v.id, JSON.stringify(v)); } }
      await Promise.all(vals.map(async (v) => { if (v && v.link && (v.status === 'active' || v.status === 'closed')) { const st = await storeLive(v.link); if (st && st.ok) v.live = Math.round(st.collected); } }));
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
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return json({ error: 'حالة غير صالحة.' }, 400);
      c.status = b.status;
      if (b.status === 'active' && !c.started) c.started = new Date().toISOString();
      if (b.status === 'closed' && !c.closedAt) c.closedAt = new Date().toISOString();
    }
    if (b.started !== undefined) { const d = new Date(String(b.started)); c.started = isNaN(d) ? '' : d.toISOString(); }
    if (b.photo !== undefined) { let ok = ''; try { const u = new URL(clean(b.photo, 400)); if (u.protocol === 'https:') ok = u.href; } catch (e) {} c.photo = ok; }
    if (b.result !== undefined) c.result = clean(b.result, 300);
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
    if (action === 'renew') { c.year = (c.year || 1) + 1; c.status = 'active'; c.started = new Date().toISOString(); c.closedAt = ''; c.result = ''; c.endNotified = ''; }
    c.updated = c.reminded;
    await env.CAMPAIGNS.put(key, JSON.stringify(c));
    return json({ ok: true });
  }
  return json({ error: 'غير موجود' }, 404);
}

async function sendAlert(env, msg, tag) {
  if (!env.WA) return;
  const prev = await env.WA.get('tg_out');
  await env.WA.put('tg_out', prev ? prev + '\n\n— — —\n\n' + msg : msg);
  const phones = (await env.CAMPAIGNS.get('alert_phones', 'json')) || [];
  await Promise.all(phones.slice(0, 10).map((ph, i) => env.WA.put('wa_out:sadaqa-' + tag + '-' + i, JSON.stringify({ phone: String(ph), text: msg }))));
}

// كل ساعة: تنبيه مرة واحدة لكل حملة انتهت مدتها ولم تُغلق
async function endSweep(env) {
  const now = Date.now();
  let cursor;
  do {
    const l = await env.CAMPAIGNS.list({ prefix: 'c:', cursor });
    for (const k of l.keys) {
      const c = await env.CAMPAIGNS.get(k.name, 'json');
      if (!c || c.status !== 'active' || !c.started || c.endNotified) continue;
      if (now < new Date(c.started).getTime() + DAYS(c.project) * 864e5) continue;
      const sum = liveTotal(c, await storeLive(c.link));
      const msg = [
        'انتهت مدة حملة صدقة جارية',
        'العزيز: ' + c.name + (c.suffix ? ' ' + c.suffix : ''),
        'المسار: ' + (PROJECT_NAMES[c.project] || c.project) + (c.qty ? ' — ' + c.qty + ' ' + (UNITS[c.project] || '') : ''),
        'المبلغ المجموع: ' + sum + ' ريال' + (c.goal ? ' من ' + c.goal : ''),
        'مقدّم الطلب: ' + c.requester + ' — ' + c.phone,
        '',
        'لتخصيص المبلغ وإغلاق الحملة:',
        'https://sadaqa.yanbuquran.app/admin#c-' + c.id,
      ].join('\n');
      await sendAlert(env, msg, 'end-' + c.id);
      c.endNotified = new Date().toISOString();
      await env.CAMPAIGNS.put(k.name, JSON.stringify(c));
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(endSweep(env)); },
  async fetch(req, env, ctx) {
    const u = new URL(req.url), p = u.pathname.replace(/\/+$/, '') || '/';
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    try {
      if (p.startsWith('/api/')) {
        if (p === '/api/request' && req.method === 'POST') return await createRequest(req, env, ip, ctx);
        if (p.startsWith('/api/c/') && req.method === 'GET') return await publicCampaign(env, p.slice(7), ctx);
        if (p.startsWith('/api/ahl/')) { const [id, key, action] = p.slice(9).split('/'); return await family(req, env, id, key, action || '', ctx); }
        if (p.startsWith('/api/admin/')) return await admin(req, env, p.slice(11), ip);
        return json({ error: 'غير موجود' }, 404);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return new Response('غير مسموح', { status: 405, headers: NOINDEX });
      const GO = { '/admin/tasmim': 'https://tasmim.yanbuquran.app/', '/admin/muktamila': 'https://tasmim.yanbuquran.app/muktamila', '/admin/halaqat': 'https://halqa.yanbuquran.app/lawha' };
      if (GO[p]) return Response.redirect(GO[p] + u.search, 302);
      if (FILES[p]) return await serveFile(FILES[p]);
      if (/^\/c\/[a-z0-9]{6}$/.test(p)) return await serveFile('c.html');
      if (/^\/ahl\/[a-z0-9]{6}\/[a-z0-9]{10}$/.test(p)) return await serveFile('ahl.html');
      return Response.redirect(u.origin + '/', 302);
    } catch (e) {
      return json({ error: 'حدث خطأ غير متوقع.' }, 500);
    }
  },
};
