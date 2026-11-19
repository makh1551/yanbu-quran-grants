// عامل موقع «شراكة نادي المجد» — majd.yanbuquran.app
// يقرأ الملفات من نسخة مثبّتة (commit) في المستودع، ويحفظها في ذاكرة الحافة؛ عند التحديث يُغيَّر REV إلى آخر commit ويُعاد رفع العامل.
const REV = '3aed73d9db9cbc1b6d64d3bd948425ed2dee6920';
const BASE = 'https://raw.githubusercontent.com/makh1551/yanbu-quran-grants/' + REV + '/majd';
const FILES = { '/': 'index.html', '/team': 'team.html', '/style.css': 'style.css', '/logo.png': 'logo.png', '/deck.pdf': 'deck.pdf', '/letter.pdf': 'letter.pdf', '/laiha.pdf': 'laiha.pdf', '/agreement.pdf': 'agreement.pdf', '/kora': 'kora.html', '/rasmi': 'rasmi.html', '/kora-deck.pdf': 'kora-deck.pdf', '/kora-letter.pdf': 'kora-letter.pdf' };
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png', pdf: 'application/pdf' };
const H = { 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
const ALIAS = { '/team.html': '/team', '/kora.html': '/kora', '/rasmi.html': '/rasmi', '/index.html': '/' };
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    path = ALIAS[path] || path;
    const file = FILES[path];
    if (!file || !['GET', 'HEAD'].includes(req.method)) return new Response('الصفحة غير موجودة', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...H } });
    const ext = file.split('.').pop();
    const key = new Request('https://majd-cache.local/' + REV + '/' + file);
    const cache = caches.default;
    let hit = await cache.match(key);
    if (!hit) {
      const r = await fetch(BASE + '/' + file, { cf: { cacheTtl: 31536000, cacheEverything: true } });
      if (!r.ok) return new Response('غير متاح مؤقتًا', { status: 502, headers: H });
      const body = await r.arrayBuffer();
      hit = new Response(body, { headers: { 'content-type': TYPES[ext], 'cache-control': 'public, max-age=31536000' } });
      ctx.waitUntil(cache.put(key, hit.clone()));
    }
    const browser = ext === 'html' ? 'public, max-age=300' : 'public, max-age=604800';
    return new Response(req.method === 'HEAD' ? null : hit.body, { headers: { 'content-type': TYPES[ext], 'cache-control': browser, 'x-rev': REV.slice(0, 7), ...H } });
  },
};
