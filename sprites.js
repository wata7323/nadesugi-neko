// 猫の進化形態ドット絵（48×48 / 24×24・8コマ）
// 形は 48 単位の座標で定義し、サイズごとにピクセル中心で塗る。顔だけはサイズ別に手で置く。
// 構図は原則として左右対称（x=24 が軸）。改行される猫・宇宙猫は点対称。動きも対称を崩さない。
// render(id, S, f) … S=48|24, f=0..7（8コマで1周、8fps想定）
(function(){
const TAU = Math.PI * 2;
const FRAMES = 8;
const PAL = {
  O:'#3a2620', F:'#eaa45a', D:'#b8642c', L:'#fff4e3', P:'#f19aa6', E:'#2b2220', W:'#ffffff',
  Y:'#ffd84a', Yd:'#e0a91f', B:'#8fd6ff', Bd:'#3f7fc4', R:'#d94b3d', Rd:'#8e2a22', V:'#b49ae6',
  G1:'#fbeee0', G2:'#ead2b8', C1:'#ffffff', C2:'#dde6ef', C3:'#8fa3b8',
  T:'#f08a2c', K:'#2a2020', S1:'#8a8f99', S2:'#c3c8d0', S3:'#5d626b', S4:'#6b6f80',
  X1:'#d4a466', X2:'#b0803f', X3:'#6e4a22', N1:'#1d2340', N2:'#4b3f8c', M:'#4da3e0', Gr:'#6cc06a',
  Au:'#f2c84b', Ad:'#c9952a', Sk:'#f2c9a0', Gn:'#9cc25a', Bl:'#7fb8e8',
};
// ---------- 毛色 ----------
// F=地の色 D=縞 L=お腹 / Er=耳 Pw=足 Tl=しっぽ（なければ F）/ Pt=シャムの顔 Ca,Cb=三毛の斑
const COATS = {
  tora:    { name:'茶トラ',     map:{ F:'#eaa45a', D:'#b8642c', L:'#fff4e3' }, stripes:true, belly:true, eye:'E' },
  kiji:    { name:'キジトラ',   map:{ F:'#a58463', D:'#4e3b2a', L:'#efe3d2' }, stripes:true, belly:true, eye:'Gn' },
  saba:    { name:'サバトラ',   map:{ F:'#b3b8c0', D:'#4f545e', L:'#f4f4f4' }, stripes:true, belly:true, eye:'Gn' },
  kuro:    { name:'黒',         map:{ F:'#34303b', D:'#26232b' }, eye:'Y', line:'#a59aa6', oc:'#120e14' },
  shiro:   { name:'白',         map:{ F:'#fbf8f3', D:'#e6ddd2' }, eye:'Bl' },
  mike:    { name:'三毛',       map:{ F:'#fbf8f3', D:'#e6ddd2', Ca:'#e5954a', Cb:'#3a3434' }, pat:'mike', eye:'E' },
  hachi:   { name:'ハチワレ',   map:{ F:'#34303b', D:'#26232b', L:'#ffffff', Pw:'#ffffff' }, pat:'hachi', belly:true, eye:'Y', oc:'#120e14' },
  chashiro:{ name:'茶白',       map:{ F:'#eaa45a', D:'#b8642c', L:'#ffffff', Pw:'#ffffff' }, pat:'hachi', stripes:true, belly:true, eye:'E' },
  siam:    { name:'シャム',     map:{ F:'#f1e4cf', D:'#e8d8bf', Er:'#5a4334', Pw:'#5a4334', Tl:'#5a4334', Pt:'#5a4334' }, pat:'point', eye:'Bl' },
  gray:    { name:'グレー',     map:{ F:'#8e98a8', D:'#7d8798' }, eye:'Gn' },
};
function colorOf(c, coat){ const m = coat.map; if (m[c]) return m[c]; if (c === 'Er' || c === 'Pw' || c === 'Tl') return m.F; return PAL[c] || c; }
const BOB = [0, 0, 1, 1, 1, 1, 0, 0];

class Grid {
  constructor(S, f = 0, coat = 'tora'){ this.coat = COATS[coat] || COATS.tora; this.coatId = coat; this.sx = 1; this.S = S; this.f = f % FRAMES; this.ph = this.f / FRAMES * TAU; this.k = S / 48; this.p1 = 48 / S;
    this.c = new Array(S * S).fill(null); this.id = new Int16Array(S * S); this.pid = 0; this.edge = {}; this.oc = this.coat.oc || 'O'; this.overOnly = false; this.ox = 0; this.oy = 0; }
  at(arr){ return arr[this.f % arr.length]; }
  part(edge = true){ this.pid++; this.edge[this.pid] = edge; }
  set(x, y, c){ if (this.rec) this.rec.push([x, y, c, this.overOnly]); x += this.ox; y += this.oy; const S = this.S; if (x < 0 || y < 0 || x >= S || y >= S) return; const i = y * S + x;
    if (this.overOnly){ if (!this.c[i]) return; this.c[i] = c; return; }
    if (this.underOnly && this.c[i]) return; this.c[i] = c; this.id[i] = this.pid; }
  px(x, y, c){ this.set(x, y, c); }
  fill(test0, c){ const S = this.S, k = this.k, sx = this.sx; const test = sx === 1 ? test0 : (u, v) => test0(24 + (u - 24) / sx, v); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++){ if (test((x + .5) / k, (y + .5) / k)) this.set(x, y, c); } }
  ell(cx, cy, rx, ry, c){ this.fill((u, v) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1 + 1e-9, c); }
  box(cx, cy, w, h, c){ this.fill((u, v) => Math.abs(u - cx) <= w / 2 + 1e-9 && Math.abs(v - cy) <= h / 2 + 1e-9, c); }
  ann(cx, cy, rx1, ry1, rx2, ry2, c, f){ this.fill((u, v) => { const a = ((u - cx) / rx1) ** 2 + ((v - cy) / ry1) ** 2, b = ((u - cx) / rx2) ** 2 + ((v - cy) / ry2) ** 2; return a <= 1 && b > 1 && (!f || f(u, v)); }, c); }
  path(pts, r, c){ this.fill((u, v) => { for (let i = 0; i < pts.length - 1; i++){ if (segD(u, v, pts[i], pts[i + 1]) <= r + 1e-9) return true; } return false; }, c); }
  poly(pts, c){ this.fill((u, v) => inPoly(u, v, pts), c); }
  // 左右対で描く
  // 左右対で描く：左側を塗ったドットをそのまま鏡写しにする（端数で左右がずれない）
  mirr(fn){ const rec = []; this.rec = rec; fn(); this.rec = null; const ov = this.overOnly;
    for (const [x, y, c, o] of rec){ this.overOnly = o; this.set(this.S - 1 - x, y, c); } this.overOnly = ov; }
  pathM(pts, r, c){ this.mirr(() => this.path(pts, r, c)); }
  polyM(pts, c){ this.mirr(() => this.poly(pts, c)); }
  ellM(cx, cy, rx, ry, c){ this.mirr(() => this.ell(cx, cy, rx, ry, c)); }
  boxM(cx, cy, w, h, c){ this.mirr(() => this.box(cx, cy, w, h, c)); }
  over(fn){ this.overOnly = true; fn(); this.overOnly = false; }
  under(fn){ this.underOnly = true; fn(); this.underOnly = false; }
  // 模様：48なら2×2ブロック、24なら1ピクセル。x は左端（48単位）
  pat(x, y, rows, mode){ const s = this.S === 48 ? 2 : 1; const w = rows[0].length * s, h = rows.length * s;
    const X = mode === 'center' ? this.S / 2 - w / 2 : Math.round(x * this.k), Y = Math.round(y * this.k);
    const put = (X0, flip) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; const ii = flip ? r.length - 1 - i : i;
      for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this.set(X0 + ii * s + a, Y + j * s + b, ch); }));
    put(X, false); if (mode === 'mirror') put(this.S - X - w, true); }
  text(str, cx, cy, size, c){ const S = this.S, k = this.k; const cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
    x.font = `900 ${size * k}px "Yu Gothic","Meiryo","Hiragino Sans",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, cx * k, cy * k);
    const d = x.getImageData(0, 0, S, S).data; for (let i = 0; i < S * S; i++) if (d[i * 4 + 3] > 110) this.set(i % S, Math.floor(i / S), c); }
  outline(){
    const S = this.S, c0 = this.c.slice(), id0 = this.id.slice();
    const nb = i => { const x = i % S, y = (i / S) | 0; const r = []; if (x > 0) r.push(i - 1); if (x < S - 1) r.push(i + 1); if (y > 0) r.push(i - S); if (y < S - 1) r.push(i + S); return r; };
    for (let i = 0; i < S * S; i++){
      if (!c0[i]){ if (nb(i).some(n => c0[n] && id0[n] > 0)){ this.c[i] = this.oc; this.id[i] = -1; } }
      else { const a = id0[i]; if (this.edge[a] && nb(i).some(n => id0[n] > 0 && id0[n] < a)) this.c[i] = this.oc; }
    }
  }
  toCanvas(scale = 1){ const S = this.S; const cv = document.createElement('canvas'); cv.width = cv.height = S * scale; const x = cv.getContext('2d');
    for (let i = 0; i < S * S; i++) if (this.c[i]){ x.fillStyle = colorOf(this.c[i], this.coat); x.fillRect((i % S) * scale, ((i / S) | 0) * scale, scale, scale); }
    return cv; }
}
function segD(u, v, a, b){ const dx = b[0] - a[0], dy = b[1] - a[1]; const L = dx * dx + dy * dy; let t = L ? ((u - a[0]) * dx + (v - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(u - a[0] - t * dx, v - a[1] - t * dy); }
function inPoly(u, v, p){ let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++){ const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
const mirror = (pts, c = 24) => pts.map(([x, y]) => [2 * c - x, y]);

// ---------- 顔（サイズ別に手置き・左右対称） ----------
function face(g, fx, fy, mode = 'open', o = {}){
  const E = o.eye || 'E', LC = o.line || 'O', P = (x, y, c) => g.px(x, y, c); const mouth = o.mouth || 'w';
  if (g.S === 48){
    const X = Math.round(fx), Y = Math.round(fy), a = o.a48 ?? 5; const L = [X - a - 1, X - a], R = [X + a - 1, X + a];
    if (o.whisk !== false && a >= 4){ for (const r of [Y + 1, Y + 3]){ for (let x = L[0] - 9; x <= L[0] - 5; x++) P(x, r, LC); for (let x = R[1] + 5; x <= R[1] + 9; x++) P(x, r, LC); } }
    if (o.blush){ P(L[0] - 2, Y + 2, 'P'); P(L[0] - 1, Y + 2, 'P'); P(R[1] + 1, Y + 2, 'P'); P(R[1] + 2, Y + 2, 'P'); }
    const lc = E === 'E' ? LC : E;
    for (const [e, inner] of [[L, 1], [R, 0]]){ const outer = 1 - inner;
      if (mode === 'open'){ for (const x of e) for (let y = Y - 1; y <= Y + 1; y++) P(x, y, E);
        if (E === 'E') P(e[outer], Y - 1, 'W'); else { P(e[inner], Y, 'E'); P(e[inner], Y + 1, 'E'); } }
      else if (mode === 'dot'){ P(e[inner], Y, E); P(e[inner], Y + 1, E); }
      else if (mode === 'teary'){ for (const x of e) for (let y = Y - 1; y <= Y + 1; y++) P(x, y, E); P(e[outer], Y - 1, 'W'); P(e[inner], Y + 1, 'Bl'); P(e[0], Y + 2, 'B'); P(e[1], Y + 2, 'B'); }
      else if (mode === 'closed'){ P(e[0] - 1, Y, lc); P(e[0], Y - 1, lc); P(e[1], Y - 1, lc); P(e[1] + 1, Y, lc); }
      else if (mode === 'angry'){ for (const x of e) for (let y = Y; y <= Y + 1; y++) P(x, y, E); if (E !== 'E'){ P(e[inner], Y, 'E'); P(e[inner], Y + 1, 'E'); }
        if (inner === 1){ P(e[0] - 1, Y - 2, LC); P(e[0], Y - 2, LC); P(e[1], Y - 1, LC); P(e[1] + 1, Y - 1, LC); }
        else { P(e[0] - 1, Y - 1, LC); P(e[0], Y - 1, LC); P(e[1], Y - 2, LC); P(e[1] + 1, Y - 2, LC); } }
      else if (mode === 'wide' || mode === 'cosmic'){ const bg = mode === 'cosmic' ? 'N2' : 'W';
        for (let x = e[0] - 1; x <= e[1] + 1; x++) for (let y = Y - 2; y <= Y + 1; y++) P(x, y, bg);
        if (mode === 'wide'){ for (const x of e) for (let y = Y - 1; y <= Y; y++) P(x, y, 'E'); }
        else { const t = g.f % 2; P(e[t ? inner : outer], Y - 1, 'Y'); P(e[t ? outer : inner], Y, 'W'); } }
    }
    if (mode !== 'none'){ P(X - 1, Y + 2, 'P'); P(X, Y + 2, 'P'); }
    if (mouth === 'w' && mode !== 'none'){ [[X - 3, Y + 3], [X - 2, Y + 4], [X - 1, Y + 3], [X, Y + 3], [X + 1, Y + 4], [X + 2, Y + 3]].forEach(([x, y]) => P(x, y, LC)); }
    if (mouth === 'O'){ for (let x = X - 2; x <= X + 1; x++) for (let y = Y + 3; y <= Y + 6; y++) P(x, y, 'Rd'); P(X - 1, Y + 6, 'P'); P(X, Y + 6, 'P');
      for (let y = Y + 3; y <= Y + 6; y++){ P(X - 3, y, LC); P(X + 2, y, LC); } for (let x = X - 2; x <= X + 1; x++) P(x, Y + 7, LC); }
    if (mouth === 'sad'){ [[X - 3, Y + 4], [X - 2, Y + 3], [X - 1, Y + 3], [X, Y + 3], [X + 1, Y + 3], [X + 2, Y + 4]].forEach(([x, y]) => P(x, y, LC)); }
    if (mouth === 'flat'){ for (let x = X - 2; x <= X + 1; x++) P(x, Y + 4, LC); }
    if (mouth === 'bite' || mouth === 'roar'){ const h = mouth === 'roar' ? 5 : 3, w = mouth === 'roar' ? 4 : 3;
      for (let x = X - w; x <= X + w - 1; x++) for (let y = Y + 3; y < Y + 3 + h; y++) P(x, y, 'Rd');
      for (let x = X - w - 1; x <= X + w; x++){ P(x, Y + 2, x === X - 1 || x === X ? 'P' : LC); P(x, Y + 3 + h, LC); }
      for (let y = Y + 3; y < Y + 3 + h; y++){ P(X - w - 1, y, LC); P(X + w, y, LC); }
      P(X - w, Y + 3, 'W'); P(X - w, Y + 4, 'W'); P(X + w - 1, Y + 3, 'W'); P(X + w - 1, Y + 4, 'W');
      if (mouth === 'roar'){ P(X - w, Y + 2 + h, 'W'); P(X + w - 1, Y + 2 + h, 'W'); } }
  } else {
    const X = Math.round(fx / 2), Y = Math.floor(fy / 2), a = o.a24 ?? 2; const L = X - 1 - a, R = X + a;
    const lc = E === 'E' ? LC : E;
    if (o.blush){ P(L - 1, Y + 1, 'P'); P(R + 1, Y + 1, 'P'); }
    for (const [e, s] of [[L, -1], [R, 1]]){
      if (mode === 'open'){ P(e, Y - 1, E); P(e, Y, 'E'); }
      else if (mode === 'closed'){ P(e - 1, Y, lc); P(e, Y - 1, lc); P(e + 1, Y, lc); }
      else if (mode === 'dot'){ P(e, Y, E); }
      else if (mode === 'teary'){ P(e, Y - 1, E); P(e, Y, 'E'); P(e, Y + 1, 'B'); }
      else if (mode === 'angry'){ P(e, Y, E); P(e + s, Y - 1, LC); }
      else if (mode === 'wide'){ P(e, Y - 1, 'W'); P(e - 1, Y, 'W'); P(e + 1, Y, 'W'); P(e, Y, 'E'); }
      else if (mode === 'cosmic'){ P(e, Y - 1, 'N2'); P(e - 1, Y, 'N2'); P(e + 1, Y, 'N2'); P(e, Y, g.f % 2 ? 'W' : 'Y'); }
    }
    if (mode !== 'none'){ P(X - 1, Y + 1, 'P'); P(X, Y + 1, 'P'); }
    if (mouth === 'O'){ P(X - 1, Y + 2, 'Rd'); P(X, Y + 2, 'Rd'); P(X - 1, Y + 3, 'Rd'); P(X, Y + 3, 'Rd'); }
    if (mouth === 'sad' || mouth === 'flat'){ P(X - 1, Y + 2, LC); P(X, Y + 2, LC); }
    if (mouth === 'bite' || mouth === 'roar'){ P(X - 1, Y + 2, 'Rd'); P(X, Y + 2, 'Rd'); P(X - 2, Y + 2, 'W'); P(X + 1, Y + 2, 'W'); if (mouth === 'roar'){ P(X - 1, Y + 3, 'Rd'); P(X, Y + 3, 'Rd'); } }
  }
}

// ---------- 部品 ----------
function ears(g, type, hx, hy, hs, F, tw = 0){
  const T = pts => pts.map(([x, y]) => [hx + x * hs, hy + y * hs]); const M = pts => pts.map(([x, y]) => [-x, y]);
  if (type === 'none') return;
  if (type === 'round'){ for (const s of [-1, 1]){ g.ell(hx + s * 8.5 * hs, hy - 7.5 * hs, 4 * hs, 4 * hs, F); g.ell(hx + s * 8.5 * hs, hy - 7.5 * hs, 2 * hs, 2 * hs, 'K'); } return; }
  const S = { up:[[[-11.5,-1],[-10,-13],[-2,-7]], [[-9,-4],[-8.5,-10],[-4.5,-6.5]]],
              flat:[[[-9,-1],[-19,-5],[-5,-8]], [[-9,-4],[-15.5,-5],[-7,-6.5]]],
              droop:[[[-12,1],[-15,-9],[-3,-7]], [[-10,-2],[-12.5,-7],[-6,-6]]] }[type];
  const o = S[0].map(p => p.slice()), n = S[1].map(p => p.slice());
  if (tw){ o[1][0] -= tw; o[1][1] += tw * .6; n[1][0] -= tw; n[1][1] += tw * .6; }   // 両耳いっしょにぴくっ
  if (hx === 24){ g.mirr(() => { g.poly(T(o), F); g.poly(T(n), 'P'); }); return; }
  for (const s of [1, -1]){ const f = s === 1 ? (p => p) : M; g.poly(T(f(o)), F); g.poly(T(f(n)), 'P'); }
}
function spikes(g, cx, cy, rx, ry, n, len, c, a0 = -Math.PI / 2, a1 = -Math.PI / 2 + TAU){
  for (let i = 0; i < n; i++){ const a = a0 + (a1 - a0) * (i + .5) / n, d = (a1 - a0) / n * .5;
    const P = (ang, r) => [cx + (rx + r) * Math.cos(ang), cy + (ry + r) * Math.sin(ang)];
    g.poly([P(a - d, -1.5), P(a, len), P(a + d, -1.5)], c); }
}
function bolt(x, y, s = 1){ return [[x + 3 * s, y], [x - 2 * s, y + 7 * s], [x + 1 * s, y + 7 * s], [x - 3 * s, y + 15 * s], [x + 5 * s, y + 5 * s], [x + 2 * s, y + 5 * s]]; }
function spark(g, x, y, c = 'Y'){ g.box(x, y, 1, 3, c); g.box(x, y, 3, 1, c); }
function sparkM(g, x, y, c = 'Y'){ g.mirr(() => spark(g, Math.min(x, 48 - x), y, c)); }
function flame(g, x, y, h, c = 'B'){ g.poly([[x, y - h],[x + 3, y - 3],[x + 2.5, y + .5],[x, y + 1.5],[x - 2.5, y + .5],[x - 3, y - 3]], c); g.ell(x, y - 1.5, 1, 1.6, 'W'); }
const ANGER = ['.R..R.', 'RR..RR', '......', 'RR..RR', '.R..R.'];
const QMARK = ['.OO.', 'O..O', '..O.', '.O..', '....', '.O..'];
const ZZZ = ['OOOO', '..O.', '.O..', 'OOOO'];   // Z は点対称
const NOTE = ['..R.', '..RR', '..R.', 'RRR.', 'RR..'];   // 音符

function catBase(g, o = {}){
  const C = g.coat, own = !o.F;   // own=毛色を反映する（虎・猫神など色が決まっている形態は反映しない）
  const hx = o.hx ?? 24, hs = o.hs ?? 1, F = o.F || 'F', D = o.D || 'D';
  const BL = o.belly === undefined ? (own && !C.belly ? null : 'L') : o.belly, STR = o.stripes !== false && (!own || C.stripes);
  const bob = (o.bob === false ? 0 : g.at(BOB)) * g.p1; const hy = (o.hy ?? 19) + bob;
  if (o.pre) o.pre(g);
  g.part(); if (o.tailFn) o.tailFn(g, own ? 'Tl' : F, D);
  g.part();
  if (o.bodyFn) o.bodyFn(g, F, D, BL);
  else if (o.body !== false){ const by = o.by ?? 35, bw = o.bw ?? 11, bh = o.bh ?? 9; g.ell(24, by, bw, bh, F);
    const hw = C.pat === 'hachi' && own; if (BL) g.ell(24, by + 1, bw * (hw ? .62 : .45), bh * (hw ? .85 : .66), BL);
    if (STR){ for (const dy of [-2, 2]) g.boxM(24 - bw + 3, by + dy, 3, 1, D); }
    if (own && C.pat === 'mike') g.over(() => { g.ell(24 - bw * .6, by + bh * .35, bw * .5, bh * .5, 'Cb'); g.ell(24 + bw * .6, by + bh * .35, bw * .5, bh * .5, 'Ca'); }); }
  if (o.bodyExtra) o.bodyExtra(g, F, D);
  if (o.paws !== false){ g.part(); g.ellM(19.5, o.pawsY ?? 43.5, 3.5, 2.2, own ? 'Pw' : F); }
  if (o.arms) o.arms(g, F);
  g.part(); ears(g, o.ears || 'up', hx, (o.earHy ?? (o.hy ?? 19)) + bob, o.earHs ?? hs, own ? 'Er' : F, o.earTw ? o.earTw(g) : 0);
  g.part();
  if (o.headFn) o.headFn(g, F, D, hy); else g.ell(hx, hy, 12 * hs, 9.5 * hs, F);
  if (o.muzzle) g.ell(hx, hy + 3.5 * hs, 5.5 * hs, 3.2 * hs, o.muzzle);
  if (own && C.pat === 'mike') g.over(() => { g.ell(hx - 8 * hs, hy - 6 * hs, 7 * hs, 6 * hs, 'Ca'); g.ell(hx + 8 * hs, hy - 6 * hs, 7 * hs, 6 * hs, 'Cb'); });
  if (own && C.pat === 'hachi' && hx === 24) g.over(() => g.polyM([[24, hy - 5 * hs],[24, hy + 10 * hs],[24 - 11 * hs, hy + 10 * hs],[24 - 7 * hs, hy + 1 * hs]], 'L'));
  if (own && C.pat === 'point') g.over(() => g.ell(hx, hy + 2.5 * hs, 7.5 * hs, 6 * hs, 'Pt'));
  if (STR){ g.box(hx, hy - 8 * hs, 2, 4 * hs, D); g.boxM(hx - 4.5 * hs, hy - 7 * hs, 1, 3 * hs, D);
    g.over(() => g.boxM(hx - 11 * hs, hy + 1 * hs, 3 * hs, 1, D)); }
  if (o.headExtra) o.headExtra(g, F, D, hy);
  if (o.post) o.post(g, hy);
  g.outline();
  let mode = typeof o.face === 'function' ? o.face(g) : (o.face || 'open');
  if (mode === 'open' && g.f === 6 && o.blink !== false) mode = 'closed';
  const fs = o.faceScale ?? 1;
  if (o.face !== false) face(g, hx, hy, mode, { eye:o.eye ?? (own ? C.eye : 'E'), line: own && C.pat !== 'hachi' ? C.line : undefined, mouth: typeof o.mouth === 'function' ? o.mouth(g) : o.mouth,
    a48:Math.round(5 * hs * fs), a24:Math.max(1, Math.round(2 * hs * fs)), blush:o.blush, whisk:o.whisk ?? (fs > .9 ? undefined : false) });
  if (o.fx) o.fx(g, hy);
}
function boxFront(g){
  g.part(); g.polyM([[9,30],[1,24],[5,22],[13,30]], 'X2');
  g.part(); g.box(24, 38, 30, 16, 'X1'); g.over(() => { g.box(24, 30.5, 30, 1, 'X2'); g.box(24, 45.5, 30, 1, 'X2'); g.box(24, 36, 6, 1.4, 'X3'); });
}
function cloudBase(g, cy, c1, c2){ g.ell(24, cy, 20, 5, c1); g.ellM(12, cy - 2, 8, 5, c1); g.ell(24, cy - 3, 9, 5, c1); if (c2) g.over(() => g.ell(24, cy + 4, 22, 2.5, c2)); }

// ---------- 形態 ----------
const FORMS = [
  { id:'normal', line:'start', stage:0, name:'ふつうの猫', desc:'正面の座り姿。呼吸とまばたき。', draw:g => catBase(g) },

  // とろけ系
  { id:'yurumi', line:'melt', stage:1, name:'ゆるみ猫', desc:'低く広がって耳が垂れる。目はとろん。',
    draw:g => catBase(g, { hy:21, by:38, bw:14, bh:7.5 + g.at(BOB) * .5 * g.p1, ears:'droop', face:'closed', blush:true, pawsY:44.5 }) },
  { id:'liquid', line:'melt', stage:2, name:'液体猫', desc:'顔＋水たまり。表面が左右にたぷたぷ。',
    draw:g => { const w = Math.sin(g.ph); catBase(g, { hy:29, body:false, paws:false,
      headFn:(g, F, D, hy) => { g.ell(24, hy, 12, 9.5, F); g.ell(24, 42, 21 + w * 1.2, 4.5 - w * .4, F); g.polyM([[12.5,hy],[24,hy],[24,41],[5,41]], F); },
      post:g => g.over(() => { const d = Math.round(w) * g.p1; g.boxM(10 - d, 42, 3, 1, 'W'); g.boxM(14 - d, 43, 1, 1, 'W'); }) }); } },
  { id:'gas', line:'melt', stage:3, name:'気体猫', desc:'湯のみの湯気が猫の形に。ほかほかで元気。',
    draw:g => {
      g.part(); g.box(24, 40, 14, 9, 'W'); g.ell(24, 44.5, 7, 1.5, 'W'); g.over(() => g.box(24, 41, 14, 1, 'C2'));
      g.part(); g.ell(24, 46, 13, 1.8, 'C2');
      g.part(); g.ell(24, 35.8, 7, 1.4, 'X3');
      g.outline();
      const sy = -g.at(BOB) * g.p1, st = 'G2', sf = 'G1', hy = 20 + sy;
      for (let i = 0; i < 2; i++){ const t = ((g.f / 8) + i / 2) % 1, y = 34 - t * 22; if (t < .9){ g.pathM([[13, y + 4],[11, y],[13, y - 3]], 1, st); } }
      ears(g, 'up', 24, hy, .85, st); g.ell(24, hy, 11, 8.6, st); g.ell(24, 29, 8, 6.5, st);
      g.ell(24, hy, 10, 7.6, sf); g.ell(24, 29, 7, 5.5, sf); g.path([[24,33],[24,35]], 3, sf);
      g.polyM([[-11,-1],[-10,-12],[-3,-7]].map(([x, y]) => [24 + x * .75, hy + y * .75]), sf);
      face(g, 24, hy, 'open', { eye:'E', mouth:'w', a48:4, a24:2, blush:true, whisk:false });
    } },
  { id:'cloud', line:'melt', stage:4, name:'もくもく猫', desc:'雲みたいにもくもく。ごきげんでぱらぱら雨を降らせる。',
    draw:g => { g.oc = 'C3'; g.oy = -g.at(BOB);
      g.part(); ears(g, 'up', 24, 24, 1, 'C1');
      g.part(); g.ell(24, 25, 13, 10, 'C1'); g.ellM(12, 30, 8, 7, 'C1'); g.ellM(18, 34, 9, 6, 'C1');
      g.over(() => { g.ell(24, 39, 18, 3.5, 'C2'); g.ellM(7, 33, 3, 3, 'C2'); });
      g.outline();
      face(g, 24, 26, g.f === 6 ? 'closed' : 'open', { eye:'E', blush:true, whisk:false, a48:5 });
      g.oy = 0;
      [[14,0],[19,2]].forEach(([x, d]) => g.boxM(x, 41 + ((g.f + d) % 4) * 1.5 * g.p1, 1, 2, 'B'));
      g.box(24, 41 + ((g.f + 1) % 4) * 1.5 * g.p1, 1, 2, 'B');
    } },

  // のびる系
  { id:'dounaga', line:'long', stage:1, name:'胴長猫', desc:'縦にびよーん。首がさらに伸び縮み。',
    draw:g => { const st = g.at([0, 1, 2, 3, 3, 2, 1, 0]) * g.p1; catBase(g, { hy:13 - st, hs:.85, pawsY:45.5, bob:false,
      bodyFn:(g, F, D, BL) => { g.path([[24,20 - st],[24,40]], 8, F); g.path([[24,24 - st],[24,38]], 3.5, BL); for (const y of [26, 31, 36]) g.boxM(18, y - st * .5, 3, 1, D); } }); } },
  { id:'hamidashi', line:'long', stage:2, name:'はみ出す猫', desc:'横に広がりすぎて画面の左右から出る。縞が外へ流れる。',
    draw:g => { const off = (g.f % 3) * 2; catBase(g, { hy:23, hs:.9,
      bodyFn:(g, F, D, BL) => { g.ell(24, 36, 34, 9.5, F); g.ell(24, 37, 6, 5.5, BL); g.over(() => { for (let x = 31 + off; x < 50; x += 6) g.boxM(x, 30, 1, 3, D); }); } }); } },
  { id:'kaigyo', line:'long', stage:3, name:'改行される猫', desc:'文章みたいに3行に折り返す（点対称）。縞が流れる。',
    draw:g => { const off = (g.f % 5) * 2; catBase(g, { hx:10, hy:10, hs:.6, body:false, paws:false, stripes:false, bob:false,
      pre:g => {
        g.part(); g.path([[12,12],[52,12]], 4, 'F'); g.path([[-4,24],[52,24]], 4, 'F'); g.path([[-4,36],[36,36]], 4, 'F'); g.ell(38, 37, 6, 5, 'F');
        g.over(() => { for (const [y, x0, x1] of [[12, 18, 50], [24, -2, 50], [36, -2, 32]]) for (let x = x0 + off; x < x1; x += 10) g.box(x, y - 2.5, 1, 2.5, 'D'); });
        g.part(); g.path([[43,39],[45,45]], 1.8, 'F');
      } }); } },
  { id:'chikyu', line:'long', stage:4, name:'地球一周猫', desc:'地球に胴がぐるっと一周。顔は正面、地球が回る。',
    draw:g => catBase(g, { hy:37, hs:.6, body:false, paws:false, stripes:false,
      pre:g => {
        const back = (u, v) => v < 26, front = (u, v) => v >= 26;
        g.part(); g.ann(24, 26, 23, 9.5, 18, 5.5, 'F', back);
        g.part(); g.ell(24, 24, 13, 13, 'M');
        for (const [x, y, rx, ry] of [[20,19,4.5,3],[29,27,5,3.5],[16,29,3,2],[30,15,2,1.5]]){ const xx = 9 + ((x - 9 + g.f * 3.75) % 30); g.fill((u, v) => ((u - xx) / rx) ** 2 + ((v - y) / ry) ** 2 <= 1 && (u - 24) ** 2 + (v - 24) ** 2 <= 13 ** 2, 'Gr'); }
        g.part(); g.ann(24, 26, 23, 9.5, 18, 5.5, 'F', front); g.over(() => { g.boxM(12, 31, 1, 2, 'D'); g.boxM(36, 22, 1, 2, 'D'); });
      } }) },

  // 妖系
  { id:'ware', line:'yokai', stage:1, name:'しっぽが割れかけ', desc:'しっぽが左右に割れはじめた。頭上にふしぎなきらめき。',
    draw:g => catBase(g, {
      tailFn:(g, F) => { const t = g.at([0, 0, 1, 1, 1, 1, 0, 0]) * g.p1; g.pathM([[18,41],[9,40],[6,35 - t]], 2.4, F); },
      fx:(g, hy) => { const y = hy - 15; if (g.f % 4 < 2) spark(g, 24, y, 'V'); else { g.box(24, y, 1, 1, 'V'); sparkM(g, 18, y + 2, 'V'); } } }) },
  { id:'nekomata', line:'yokai', stage:2, name:'猫又', desc:'手ぬぐいで二本足のばんざい踊り。音符が跳ねる。',
    draw:g => { const up = g.f < 4; const T = [[18,42],[9,40],[4,33],[5,24]];
      catBase(g, { eye:'Y', paws:false,
      tailFn:(g, F) => g.pathM(T, 2.2, F),
      bodyFn:(g, F, D, BL) => { g.ell(24, 34, 9, 10, F); g.ell(24, 35, 4.5, 6.5, BL); g.boxM(16.5, 33, 2, 1, D); },
      arms:(g, F) => { g.part(); g.ellM(20, 44.5, 3, 2, F === 'F' ? 'Pw' : F);
        g.part(); const A = up ? [[17,29],[12,20]] : [[17,30],[13,37]]; g.pathM(A, 2.4, F); g.ellM(A[1][0], A[1][1], 2.6, 2.6, F === 'F' ? 'Pw' : F); },
      post:(g, hy) => { g.part(); g.ell(24, hy - 7.5, 12.5, 3.8, 'Bd');
        g.over(() => { g.boxM(17, hy - 7.5, 1, 1, 'W'); g.box(24, hy - 7.5, 1, 1, 'W'); }); },
      fx:g => { g.pat(2, 2 + g.at([0, 1, 2, 1]) * g.p1, NOTE, 'mirror'); } }); } },
  { id:'kyubi', line:'yokai', stage:3, name:'九尾猫', desc:'しっぽ9本が扇に広がり、左右そろって波打つ。',
    draw:g => catBase(g, { eye:'Y',
      tailFn:(g, F) => { for (const j of [0, 8, 1, 7, 2, 6, 3, 5, 4]){ g.part(); const sg = Math.sign(j - 4);
        const a = Math.PI * (1.1 + .8 * j / 8) + sg * Math.sin(g.ph + Math.abs(j - 4) * .8) * .05, C = Math.cos(a), Sn = Math.sin(a);
        g.path([[24 + 10 * C, 36 + 10 * Sn],[24 + 25 * C, 36 + 25 * Sn]], 4, F); g.ell(24 + 28 * C, 36 + 28 * Sn, 3.4, 3.4, 'L'); } } }) },
  { id:'nekogami', line:'yokai', stage:4, name:'ありがたい猫神', desc:'金色・座布団・後光。にこにこ。',
    draw:g => catBase(g, { F:'Au', D:'Ad', blush:true,
      pre:g => { g.part(); g.ell(24, 43, 22, 4.5, 'R'); g.over(() => g.box(24, 41, 40, 1, 'Rd')); },
      fx:(g, hy) => { const L = 22 + (g.f % 4 < 2 ? 0 : 2); g.under(() => g.mirr(() => { for (const a of [-170, -145, -120, -97]){ const r = a * Math.PI / 180; g.path([[24 + 13 * Math.cos(r), hy + 11 * Math.sin(r)],[24 + L * Math.cos(r), hy + L * Math.sin(r)]], .9, 'Y'); } }));
        [[7,9],[4,26],[9,36]].forEach(([x, y], i) => { if ((g.f + i * 2) % 6 < 3) sparkM(g, x, y, i % 2 ? 'Yd' : 'Y'); }); } }) },

  // 帯電系
  { id:'sakadachi', line:'elec', stage:1, name:'毛が逆立つ', desc:'全身トゲトゲ。毛がふくらんだりしぼんだり。',
    draw:g => { const L = 2.5 + (g.f % 2) * 1.2; catBase(g, { face:'wide', blink:false, bob:false,
      headExtra:(g, F, D, hy) => spikes(g, 24, hy, 12, 9.5, 18, L, F),
      bodyExtra:(g, F) => spikes(g, 24, 35, 11, 9, 16, L - .5, F, Math.PI * .1, Math.PI * .9 - TAU),
      fx:g => { if (g.f % 4 < 2) sparkM(g, 5, 8); else sparkM(g, 5, 32); } }); } },
  { id:'kedama', line:'elec', stage:2, name:'静電気の毛玉', desc:'まんまる毛玉がぴょんぴょん跳ねる。',
    draw:g => { g.oy = -Math.ceil(g.at([0, 2, 4, 4, 2, 0, 0, 0]) * g.k); catBase(g, { hy:27, earHy:17, earHs:.8, body:false, face:'wide', pawsY:43, bob:false, blink:false,
      headFn:(g, F) => { g.ell(24, 27, 16, 15, F); spikes(g, 24, 27, 16, 15, 22, 3, F); },
      fx:g => { if (g.f % 2) sparkM(g, 4, 10); else sparkM(g, 5, 40); } }); } },
  { id:'kaminari', line:'elec', stage:3, name:'雷猫', desc:'雷雲に乗る。左右の稲妻しっぽが光る。',
    draw:g => { const c = g.f % 4 === 0 ? 'W' : 'Y'; catBase(g, { eye:'Y', pawsY:41,
      tailFn:() => { g.mirr(() => g.poly(mirror(bolt(40, 15, 1.2)), c)); },
      post:g => { g.part(); cloudBase(g, 43, 'S4', 'S3'); },
      fx:g => { if (g.f === 0 || g.f === 1 || g.f === 4){ g.mirr(() => g.poly(mirror(bolt(42, 1, .5)), 'Y')); } } }); } },
  { id:'hatsuden', line:'elec', stage:4, name:'猫型発電所', desc:'耳つきの発電所。左右の煙突から煙、窓がまばたき。',
    draw:g => {
      g.part(); g.boxM(5, 31, 4, 26, 'S1'); g.over(() => { g.boxM(5, 21, 4, 2, 'Y'); g.boxM(5, 26, 4, 2, 'Y'); });
      g.part(); g.polyM([[11,27],[13,13],[21,25]], 'S2'); g.over(() => g.polyM([[13.5,25],[14,17],[18,24]], 'P'));
      g.part(); g.box(24, 35, 28, 19, 'S2');
      const win = g.f === 6 ? 'S3' : 'Y';
      g.over(() => { g.box(24, 26, 28, 1, 'S1'); g.boxM(18, 32, 4, 4, win); g.box(24, 37, 2, 1, 'P'); g.box(24, 41.5, 4, 6, 'S3'); });
      g.part(); g.box(24, 45.5, 48, 1, 'S3');
      g.outline();
      for (let i = 0; i < 3; i++){ const t = ((g.f / 8) + i / 3) % 1; g.ellM(5, 15 - t * 14, 1.6 + t * 1.8, 1.4 + t * 1.4, 'S2'); }
      if (g.f % 4 === 0){ g.mirr(() => g.poly(bolt(13, 2, .45), 'Y')); }
    } },

  // 怒り系
  { id:'ikamimi', line:'angry', stage:1, name:'イカ耳', desc:'耳が横に倒れる。頭上の怒りマークがドクドク。',
    draw:g => catBase(g, { ears:'flat', face:'angry', mouth:'none', bob:false, fx:g => g.pat(0, 1 - (g.f % 2) * g.p1, ANGER, 'center') }) },
  { id:'kamu', line:'angry', stage:2, name:'噛む', desc:'下から差し出された指にガブッ。',
    draw:g => { g.oy = g.f % 2; catBase(g, { ears:'flat', face:'angry', mouth:'bite', bob:false,
      post:(g, hy) => { g.part(); g.path([[24,52],[24,hy + 8]], 3, 'Sk'); g.over(() => g.box(24, hy + 7, 2, 1, 'W')); },
      fx:g => { if (g.f % 4 < 2) g.pat(4, 20, ['R..', '.R.', '..R'], 'mirror'); } }); } },
  { id:'tora', line:'angry', stage:3, name:'虎', desc:'丸い耳・黒い縞・白い口元。もう猫じゃない。',
    draw:g => catBase(g, { F:'T', D:'K', belly:'W', muzzle:'W', ears:'round', bw:13, bh:10, hs:1.08, eye:'Y', face:'angry', mouth:'w', blink:false,
      headExtra:(g, F, D, hy) => g.over(() => g.boxM(13, hy + 3, 3, 1, 'K')),
      bodyExtra:g => g.over(() => { for (const dy of [-5, 5]) g.boxM(14, 35 + dy, 3, 1, 'K'); }) }) },
  { id:'kaiju', line:'angry', stage:4, name:'怪獣', desc:'画面いっぱいの巨大猫。咆哮で地面が揺れる。',
    draw:g => { g.oy = g.f % 2; catBase(g, { hy:18, hs:1.45, eye:'Y', face:'angry', mouth:g => g.f < 4 ? 'roar' : 'bite', paws:false, bob:false,
      bodyFn:(g, F, D, BL) => { g.ell(24, 47, 22, 13, F); g.ell(24, 48, 9, 9, BL); },
      post:g => { g.part(); g.boxM(5, 43, 8, 10, 'S2'); g.part(); g.boxM(12, 45, 6, 6, 'S1');
        g.over(() => { for (const [x, y] of [[3,40],[7,40],[3,44],[7,44]]) g.boxM(x, y, 1, 1, 'Y'); }); } }); } },

  // 放置系
  { id:'koubako', line:'idle', stage:1, name:'香箱座り', desc:'手足をしまった食パン形。すやすや Zzz。',
    draw:g => catBase(g, { hy:25, hs:.95, paws:false, face:'closed',
      bodyFn:(g, F, D) => { g.ell(24, 36, 18, 9.5 + g.at(BOB) * .5 * g.p1, F); g.boxM(10, 34, 1, 3, D); },
      fx:g => { if (g.f >= 2 && g.f <= 6) g.pat(0, 8 - (g.f - 2) * g.p1, ZZZ, 'center'); } }) },
  { id:'hako', line:'idle', stage:2, name:'箱に入る', desc:'段ボールにすっぽり。顔が出たり沈んだり。',
    draw:g => catBase(g, { hy:23 + g.at([0, 0, 1, 2, 3, 2, 1, 0]) * g.p1, hs:.9, body:false, paws:false, bob:false,
      post:g => { boxFront(g); g.part(); g.ellM(18, 30.5, 3, 2, 'F'); } }) },
  { id:'hakodake', line:'idle', stage:3, name:'箱だけ', desc:'猫はどこ。両耳の先だけ見えて、ときどき箱が跳ねる。',
    draw:g => { const hop = g.at([0, 0, 0, 0, 1, 1, 0, 0]); g.oy = -hop;
      g.part(); g.polyM([[16,31],[18.5,25.5 - hop * 2],[21,31]], 'F'); g.over(() => g.polyM([[17.5,31],[18.5,28 - hop * 2],[19.5,31]], 'P'));
      boxFront(g); g.outline(); g.oy = 0; g.pat(0, 11 - g.at(BOB) * g.p1, QMARK, 'center'); } },

  // 隠し
  { id:'uchu', line:'secret', stage:4, name:'宇宙猫', desc:'宇宙に浮かぶ顔。星と目がまたたく。',
    draw:g => catBase(g, { hy:24, hs:1.1, body:false, paws:false, face:'cosmic', mouth:'none',
      pre:g => { g.part(false); g.ell(24, 24, 23.5, 23.5, 'N1'); g.over(() => { g.ellM(10, 12, 6, 3.5, 'N2'); g.ellM(9, 36, 5, 3, 'N2'); }); },
      fx:g => { [[8,8],[17,3],[4,20],[14,43],[6,30]].forEach(([x, y], i) => { if ((g.f + i) % 3) g.boxM(x, y, 1, 1, 'W'); });
        if (g.f < 4) sparkM(g, 8, 24, 'Y'); else sparkM(g, 15, 8, 'Yd'); } }) },
  { id:'gainen', line:'secret', stage:4, name:'概念としての猫', desc:'ついに文字になった。両耳だけぴくっと動く。',
    draw:g => { const tw = g.f === 5 || g.f === 6 ? 1.5 : 0; g.oy = -g.at(BOB);
      g.part(); g.polyM([[9 - tw,14],[11 - tw * 1.5,3 + tw],[19,10]], 'F');
      g.over(() => g.polyM([[11 - tw * .5,12],[12 - tw,6 + tw],[16,10]], 'P'));
      g.part(); g.text('猫', 24, 28, 38, 'F'); g.outline(); } },

  // ミーム系（よく知られた猫ミームのネタを、この作品の猫で描く）
  { id:'pop', line:'meme', stage:5, name:'パカ口猫', desc:'口を「パカッ」と開けたり閉じたり。',
    draw:g => { const op = g.at([0, 0, 1, 1, 0, 0, 1, 1]); catBase(g, { mouth: op ? 'O' : 'w', blink:false, bob:false, hy:19 - op * g.p1 }); } },
  { id:'spin', line:'meme', stage:5, name:'回る猫', desc:'なで回したら回り出した。正面→背中→正面。',
    draw:g => { const c = Math.cos(g.ph), back = c < 0; g.sx = Math.max(.16, Math.abs(c));
      catBase(g, { face: back ? false : 'open', faceScale:g.sx, blink:false, bob:false, belly: back ? null : undefined,
        post: back ? (g => { g.part(); g.path([[24,45],[24,32]], 2.3, 'Tl'); g.ell(24, 31, 2.6, 2.6, 'Tl'); }) : undefined }); g.sx = 1; } },
  { id:'naki', line:'meme', stage:5, name:'泣き猫', desc:'うるうるの目から涙が止まらない。',
    draw:g => catBase(g, { face:'teary', mouth:'sad', blink:false,
      fx:(g, hy) => { g.boxM(19, hy + 5, 2, 3, 'B'); for (const d of [0, 5]){ const y = hy + 7 + ((g.f * 1.5 + d) % 10); g.boxM(19, y, 2, 2, 'B'); } } }) },
  { id:'magao', line:'meme', stage:5, name:'真顔で見つめる猫', desc:'点の目、一文字の口。じわじわ寄ってくる。',
    draw:g => catBase(g, { hs:1.3 + g.at([0, 1, 2, 3, 4, 3, 2, 1]) * .04, hy:24, by:46, bw:15, bh:10, paws:false, face:'dot', mouth:'flat', blink:false, bob:false }) },
  { id:'yoshi', line:'meme', stage:5, name:'指差し確認猫', desc:'ヘルメットで正面をビシッと指差す。',
    draw:g => { const s = 4.2 + g.at([0, 0, 1, 2, 2, 1, 0, 0]) * .9; catBase(g, { ears:'none', blink:false,
      arms:() => { g.part(); g.ell(24, 33, s, s, 'Pw'); g.over(() => { g.ell(24, 34.2, s * .42, s * .34, 'P'); g.ellM(24 - s * .55, 31, s * .17, s * .17, 'P'); g.ellM(24 - s * .2, 30, s * .17, s * .17, 'P'); }); },
      post:(g, hy) => { g.part(); g.fill((u, v) => ((u - 24) / 13) ** 2 + ((v - hy + 3) / 10) ** 2 <= 1 && v <= hy - 3, 'Y'); g.box(24, hy - 3, 30, 2, 'Yd'); g.over(() => g.box(24, hy - 9, 4, 3, 'W')); },
      fx:() => { if (g.f >= 2 && g.f <= 5) g.pat(6, 30, ['O..', '.O.', '..O'], 'mirror'); } }); } },
  { id:'banana', line:'meme', stage:5, name:'バナナ猫', desc:'バナナの着ぐるみで泣いている。',
    draw:g => { const sw = g.at(BOB) * g.p1; catBase(g, { ears:'none', hs:.85, hy:21, face:'teary', mouth:'sad', blink:false,
      bodyFn:g => { g.ell(24, 36, 12, 10, 'Y'); g.polyM([[14,35],[3,43 + sw],[8,46],[18,42]], 'Y'); g.over(() => g.boxM(19, 37, 1, 8, 'Yd')); },
      arms:g => { g.part(); g.ell(24, 20, 15.5, 15, 'Y'); g.over(() => g.boxM(12, 20, 1, 12, 'Yd')); g.part(); g.box(24, 4, 3, 4, 'X3'); },
      fx:(g, hy) => { for (const d of [0, 5]){ const y = hy + 6 + ((g.f * 1.5 + d) % 9); g.boxM(20, y, 2, 2, 'B'); } } }); } },
  { id:'happy', line:'meme', stage:5, name:'はっぴー猫', desc:'うれしすぎて跳びはねる。',
    draw:g => { const j = g.at([0, 3, 6, 8, 6, 3, 0, 0]); g.oy = -Math.ceil(j * g.k); catBase(g, { face:'closed', blush:true, mouth:'O', bob:false, bh: j === 0 ? 8 : 9.5,
      arms:() => { g.part(); g.pathM([[16,31],[10,21]], 2.4, 'F'); g.ellM(10, 20, 2.6, 2.6, 'Pw'); },
      fx:() => { g.oy = 0; if (j > 4) sparkM(g, 4, 10); else if (j > 0) sparkM(g, 6, 36); } }); } },
  { id:'jouhin', line:'meme', stage:5, name:'上品な猫', desc:'前足をそろえて、ゆっくりお辞儀。',
    draw:g => catBase(g, { hy:19 + g.at([0, 0, 0, 1, 2, 2, 1, 0]) * g.p1, bob:false, face:'closed', paws:false, belly:null,
      arms:() => { g.part(); g.ellM(21.4, 40, 3, 2.6, 'Pw'); g.part(); g.polyM([[24,29.5],[19,27],[19,32]], 'R'); g.box(24, 29.5, 2, 2, 'Rd'); } }) },
];

const LINES = [
  { key:'start', name:'はじまり', how:'', tint:'#f7f1e8' },
  { key:'melt', name:'とろけ系', how:'あご・ほっぺをゆっくり', tint:'#e4f1fa' },
  { key:'long', name:'のびる系', how:'胴を長いストロークでなでる', tint:'#f4eedc' },
  { key:'yokai', name:'妖系', how:'耳をなでる', tint:'#ece5f8' },
  { key:'elec', name:'帯電系', how:'高速往復・逆なで', tint:'#fbf4cf' },
  { key:'angry', name:'怒り系', how:'お腹をなでる（罠）', tint:'#fbe3de' },
  { key:'idle', name:'放置系', how:'なでない', tint:'#ece6dc' },
  { key:'secret', name:'隠し', how:'全系統を均等に', tint:'#e2e3f1' },
  { key:'meme', name:'ミーム系', how:'特別ななで方で出会う（リズム・円を描く・回数など）', tint:'#e3f2e4' },
];

function render(id, S, f = 0, coat = 'tora'){ const fm = FORMS.find(x => x.id === id); const g = new Grid(S, f, coat); fm.draw(g); return g; }

// ---------- 描画パターン（ドットの並びは変えず、色の置き換えと1マスの描き方だけ変える） ----------
const STYLES = [
  { id:'std', name:'標準' }, { id:'gb', name:'緑4階調' }, { id:'fc', name:'8bit配色' }, { id:'pastel', name:'パステル' },
  { id:'mono', name:'1bit白黒' }, { id:'crt', name:'ブラウン管' }, { id:'neon', name:'ネオン' }, { id:'bead', name:'アイロンビーズ' }, { id:'sticker', name:'ステッカー' },
];
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]) => (.299 * r + .587 * g + .114 * b) / 255;
const FC = ['#000000','#fcfcfc','#bcbcbc','#7c7c7c','#f83800','#e45c10','#fca044','#fce0a8','#f8b800','#ac7c00','#503000','#00a800','#58d854','#0058f8','#3cbcfc','#a4e4fc','#6844fc','#f878f8','#f8a4c0','#a81000','#d8b8f8','#f0d0b0','#881400','#f8d878','#787878'].map(rgb);
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const STYLE_BG = { std:'#f7f3ee', gb:'#9bbc0f', fc:'#101a3a', pastel:'#fff4f2', mono:'#f4f1e8', crt:'#0a0e13', neon:'#140c28', bead:'#efe7da', sticker:'#dde7ee' };
// opt.noBg … 背景を塗らない（ゲーム画面に重ねる用）／ opt.silhouette … 1色の影絵にする
function drawStyled(g, scale, style = 'std', opt = {}){
  const S = g.S, W = S * scale, cv = document.createElement('canvas'); cv.width = cv.height = W; const x = cv.getContext('2d');
  const px = []; for (let i = 0; i < S * S; i++){ const c = g.c[i]; px.push(c ? { c, h:colorOf(c, g.coat), o: c === g.oc || c === 'O' } : null); }
  const each = fn => px.forEach((p, i) => { if (p) fn(p, i % S, (i / S) | 0); });
  const sq = (X, Y, c) => { x.fillStyle = c; x.fillRect(X * scale, Y * scale, scale, scale); };
  const bg = c => { if (opt.noBg) return; x.fillStyle = c; x.fillRect(0, 0, W, W); };
  const layer = () => { const l = document.createElement('canvas'); l.width = l.height = W; return [l, l.getContext('2d')]; };
  const glow = (l, blur, a) => { x.save(); x.filter = `blur(${blur}px)`; x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.drawImage(l, 0, 0); x.restore(); };
  if (style === 'std'){ bg('#f7f3ee'); each((p, X, Y) => sq(X, Y, p.h)); }
  else if (style === 'gb'){ const P4 = ['#0f380f', '#306230', '#8bac0f', '#d4e6a0']; bg('#9bbc0f');
    each((p, X, Y) => { const l = lum(rgb(p.h)); sq(X, Y, P4[p.o ? 0 : l < .3 ? 0 : l < .55 ? 1 : l < .8 ? 2 : 3]); }); }
  else if (style === 'fc'){ bg('#101a3a');
    each((p, X, Y) => { const c = rgb(p.h); let b = FC[0], d = 1e9; for (const q of FC){ const e = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2; if (e < d){ d = e; b = q; } } sq(X, Y, hex(b)); }); }
  else if (style === 'pastel'){ bg('#fff4f2'); each((p, X, Y) => sq(X, Y, p.o ? '#a08396' : hex(rgb(p.h).map(v => v + (255 - v) * .45)))); }
  else if (style === 'mono'){ bg('#f4f1e8'); each((p, X, Y) => { const t = (BAYER[Y % 4][X % 4] + .5) / 16; if (p.o || lum(rgb(p.h)) < t) sq(X, Y, '#1b1b1b'); }); }
  else if (style === 'crt'){ bg('#0a0e13'); const [l, lx] = layer();
    each((p, X, Y) => { lx.fillStyle = p.h; lx.fillRect(X * scale, Y * scale, scale, scale); });
    glow(l, scale * 1.2, .6); x.drawImage(l, 0, 0); x.fillStyle = 'rgba(0,0,0,.38)'; for (let y = 0; y < W; y += 2) x.fillRect(0, y, W, 1);
    const v = x.createRadialGradient(W / 2, W / 2, W * .3, W / 2, W / 2, W * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); if (!opt.noBg){ x.fillStyle = v; x.fillRect(0, 0, W, W); } }
  else if (style === 'neon'){ bg('#140c28'); const [l, lx] = layer();
    each((p, X, Y) => { if (p.o || p.c === 'E' || p.c === 'W' || p.c === 'Y' || p.c === 'B'){ lx.fillStyle = p.o ? '#ff5ad6' : p.c === 'E' ? '#7ff7ff' : p.h; lx.fillRect(X * scale, Y * scale, scale, scale); }
      else { x.globalAlpha = .28; sq(X, Y, p.h); x.globalAlpha = 1; } });
    glow(l, scale * 1.5, .9); x.drawImage(l, 0, 0); }
  else if (style === 'bead'){ bg('#efe7da'); const r = scale * .46;
    for (let i = 0; i < S * S; i++){ const X = i % S, Y = (i / S) | 0, cx = (X + .5) * scale, cy = (Y + .5) * scale; const p = px[i];
      if (!p){ x.fillStyle = '#ddd2c0'; x.beginPath(); x.arc(cx, cy, scale * .1, 0, TAU); x.fill(); continue; }
      x.fillStyle = p.h; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(cx, cy, r * .32, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.arc(cx - r * .38, cy - r * .38, r * .2, 0, TAU); x.fill(); } }
  else if (style === 'sticker'){ bg('#dde7ee'); const R = S === 48 ? 2 : 1; const m = px.map(p => !!p); const brd = new Array(S * S).fill(false);
    for (let i = 0; i < S * S; i++){ if (m[i]) continue; const X = i % S, Y = (i / S) | 0;
      for (let dy = -R; dy <= R && !brd[i]; dy++) for (let dx = -R; dx <= R; dx++){ if (dx * dx + dy * dy > R * R + 1) continue; const xx = X + dx, yy = Y + dy; if (xx >= 0 && yy >= 0 && xx < S && yy < S && m[yy * S + xx]){ brd[i] = true; break; } } }
    for (let i = 0; i < S * S; i++) if (m[i] || brd[i]){ x.fillStyle = 'rgba(40,30,20,.22)'; x.fillRect((i % S) * scale, (((i / S) | 0) + 1) * scale, scale, scale); }
    for (let i = 0; i < S * S; i++) if (brd[i]) sq(i % S, (i / S) | 0, '#ffffff');
    each((p, X, Y) => sq(X, Y, p.h)); }
  if (opt.silhouette){ x.globalCompositeOperation = 'source-in'; x.fillStyle = opt.silhouette; x.fillRect(0, 0, W, W); x.globalCompositeOperation = 'source-over'; }
  return cv;
}
window.CatSprites = { PAL, COATS, FORMS, LINES, FRAMES, STYLES, STYLE_BG, render, drawStyled };
})();
