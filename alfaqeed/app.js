// أدوات مشتركة لموقع «حملة الفقيد»
const SITE = 'https://sadaqa.yanbuquran.app';
const WA = '966553671414';
const PROJECTS = {
  halaqa: { name: 'كفالة حلقة قرآنية', unit: 6600, steps: [1, 2, 3, 5], unitLabel: 'حلقة سنويًا', countLabel: 'الحلقات المكفولة', desc: 'حلقةٌ يُحفظ فيها كتاب الله عامًا دراسيًا كاملًا.', link: 'https://store.yq.org.sa' },
  mushaf: { name: 'ورِّث مصحفًا', unit: 30, steps: [10, 50, 100, 220], unitLabel: 'مصحف', countLabel: 'المصاحف', desc: 'مصاحف يُتلى فيها كتاب الله آناء الليل وأطراف النهار.', link: 'https://store.yq.org.sa' },
  student: { name: 'كفالة طالب أو طالبة', unit: 300, steps: [1, 5, 10, 22], unitLabel: 'طالب سنويًا', countLabel: 'الطلاب المكفولون', desc: 'طالبٌ يحفظ كتاب الله عامًا دراسيًا كاملًا.', link: 'https://store.yq.org.sa' },
  waqf: { name: 'سهم في وقف الأم', unit: 100, steps: [10, 50, 100, 500], unitLabel: 'سهم', countLabel: 'أسهم الوقف', desc: 'وقفٌ قائم ينفع ما بقي.', link: 'https://store.yq.org.sa/p/173745' },
};
const ar = (n) => Number(n || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 });
const latinDigits = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const waLink = (text, to) => 'https://wa.me/' + (to || WA) + '?text=' + encodeURIComponent(text);
const shareLink = (text) => 'https://wa.me/?text=' + encodeURIComponent(text);

function mournerMessage(name, suffix, projectKey, url) {
  const p = PROJECTS[projectKey] || PROJECTS.mushaf;
  return 'عظّم الله أجرنا وأجركم في فقيدنا ' + name + ' ' + suffix + '.\n' +
    'أنشأنا له حملة صدقة جارية لدى الجمعية الخيرية لتحفيظ القرآن الكريم بمحافظة ينبع، في مشروع «' + p.name + '».\n' +
    'من أراد أن يُهدي له برًّا فهذا رابط حملته:\n' + (url || SITE) + '\n' +
    'جزاكم الله خيرًا، ولا تنسوه من دعائكم.';
}

function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
let _logo;
// يرسم بطاقة الفقيد ١٠٨٠×١٠٨٠ على لوحة canvas
async function drawCard(canvas, o) {
  const name = (o.name || 'فلان بن فلان').trim(), suffix = o.suffix || 'رحمه الله';
  const p = PROJECTS[o.project] || PROJECTS.mushaf;
  const W = 1080, c = canvas.getContext('2d');
  canvas.width = W; canvas.height = W;
  try {
    await Promise.all([
      document.fonts.load('700 80px "IBM Plex Sans Arabic"', name),
      document.fonts.load('600 32px "IBM Plex Sans Arabic"', p.name),
      document.fonts.load('400 46px "Amiri"', suffix),
    ]);
  } catch (e) {}
  if (_logo === undefined) _logo = await loadImg('/logo.png');
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#142f47'; c.fillRect(0, 0, W, W);
  // الموجتان
  c.fillStyle = 'rgba(98,178,204,.45)'; c.beginPath(); c.moveTo(0, 1034); c.bezierCurveTo(220, 998, 420, 1070, 620, 1034); c.bezierCurveTo(820, 998, 960, 1004, 1080, 1028); c.lineTo(1080, 1080); c.lineTo(0, 1080); c.fill();
  c.fillStyle = '#358141'; c.beginPath(); c.moveTo(0, 1052); c.bezierCurveTo(240, 1020, 460, 1082, 680, 1048); c.bezierCurveTo(880, 1020, 980, 1026, 1080, 1046); c.lineTo(1080, 1080); c.lineTo(0, 1080); c.fill();
  // الشعار
  const lw = 300, lh = _logo ? Math.round(lw * _logo.height / _logo.width) : 110;
  c.fillStyle = '#fff'; roundRect(c, (W - lw) / 2 - 26, 70, lw + 52, lh + 28, 22); c.fill();
  if (_logo) c.drawImage(_logo, (W - lw) / 2, 84, lw, lh);
  c.fillStyle = '#e6f3f8'; c.font = '400 44px "Amiri", serif'; c.fillText('عظّم الله أجرنا وأجركم', W / 2, 330);
  c.fillStyle = '#C8A24A'; c.font = '600 32px "IBM Plex Sans Arabic", Tahoma'; c.fillText('صدقةٌ جارية عن فقيدنا', W / 2, 400);
  let fs = 84; c.fillStyle = '#fff';
  do { c.font = '700 ' + fs + 'px "IBM Plex Sans Arabic", Tahoma'; fs -= 4; } while (c.measureText(name).width > 940 && fs > 36);
  c.fillText(name, W / 2, 520);
  c.fillStyle = '#E0C27A'; c.font = '400 52px "Amiri", serif'; c.fillText(suffix, W / 2, 600);
  const pill = 'مشروع الحملة: ' + p.name;
  c.font = '700 30px "IBM Plex Sans Arabic", Tahoma';
  const pw = c.measureText(pill).width + 76;
  c.fillStyle = '#358141'; roundRect(c, (W - pw) / 2, 648, pw, 66, 33); c.fill();
  c.fillStyle = '#fff'; c.fillText(pill, W / 2, 692);
  // الرمز والدعوة
  const url = o.url || SITE;
  const hasQR = drawQR(c, url, 150, 790, 170);
  c.textAlign = hasQR ? 'right' : 'center';
  const tx = hasQR ? 930 : W / 2;
  c.fillStyle = '#fff'; c.font = '700 36px "IBM Plex Sans Arabic", Tahoma'; c.fillText('أهدِه برًّا يصل إليه', tx, 850);
  c.fillStyle = '#e6f3f8'; c.font = '400 26px "IBM Plex Sans Arabic", Tahoma';
  c.fillText(hasQR ? 'امسح الرمز للمشاركة' : 'للمشاركة عبر رابط الحملة', tx, 900);
  c.fillText('ولا تنسوه من دعائكم', tx, 944);
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawQR(c, text, x, y, size) {
  if (typeof qrcode !== 'function') return false;
  try {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = size / n;
    c.fillStyle = '#fff'; roundRect(c, x - 14, y - 14, size + 28, size + 28, 16); c.fill();
    c.fillStyle = '#142f47';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x + k * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
    return true;
  } catch (e) { return false; }
}
function downloadCanvas(canvas, filename) {
  canvas.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
}

// سلّم الأثر: محطات الحملة داخل مشروعها، والهدف التالي والمتبقي له
function ladder(projectKey, total) {
  const p = PROJECTS[projectKey] || PROJECTS.mushaf, units = Math.floor((total || 0) / p.unit);
  const next = p.steps.find((s) => s > units) || null, prev = [...p.steps].reverse().find((s) => s <= units) || 0;
  const from = prev * p.unit, to = next ? next * p.unit : from;
  return { p, units, next, steps: p.steps.map((s) => ({ n: s, done: s <= units })), remaining: next ? to - (total || 0) : 0, pct: next ? Math.round(((total || 0) - from) / (to - from) * 100) : 100 };
}
// الذكرى السنوية: تاريخ الذكرى القادمة للحملة، وهل حان وقت التذكير (قبلها بأسبوعين)
function anniversary(c, now) {
  const d = new Date(c.created); d.setFullYear(d.getFullYear() + (c.year || 1));
  const open = new Date(d); open.setDate(open.getDate() - 14);
  const t = now || new Date();
  const due = !!c.remind && ['active', 'closed'].includes(c.status) && t >= open && !(c.reminded && new Date(c.reminded) >= open);
  return { date: d, due };
}
