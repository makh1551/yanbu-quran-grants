// عامل موقع «شراكة نادي المجد» — majd.yanbuquran.app
// يقرأ الصفحات والملفات من مستودع الجمعية، والموقع كله خارج الفهرسة.
const BASE = 'https://raw.githubusercontent.com/makh1551/yanbu-quran-grants/main/majd';
const FILES = { '/': 'index.html', '/team': 'team.html', '/style.css': 'style.css', '/logo.png': 'logo.png', '/deck.pdf': 'deck.pdf', '/letter.pdf': 'letter.pdf', '/laiha.pdf': 'laiha.pdf', '/agreement.pdf': 'agreement.pdf', '/kora': 'kora.html', '/kora-deck.pdf': 'kora-deck.pdf', '/kora-letter.pdf': 'kora-letter.pdf' };
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png', pdf: 'application/pdf' };
const H = { 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };

export default {
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (path === '/team.html') path = '/team';
    if (path === '/kora.html') path = '/kora';
    const file = FILES[path];
    if (!file || !['GET', 'HEAD'].includes(req.method)) return new Response('الصفحة غير موجودة', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...H } });
    const r = await fetch(BASE + '/' + file, { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!r.ok) return new Response('غير متاح مؤقتًا', { status: 502, headers: H });
    const ext = file.split('.').pop();
    return new Response(r.body, { headers: { 'content-type': TYPES[ext], 'cache-control': ext === 'html' ? 'public, max-age=60' : 'public, max-age=300', ...H } });
  },
};
