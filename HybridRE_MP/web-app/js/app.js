// Narmada Hybrid · presenter app. 8 judging criteria → sub-sections → line-by-line story + visual.
import { createPlant } from "./scene.js";

const D = window.DATA, M = D.model, FIN = Object.fromEntries(D.fin), CAP = D.capex, SENS = D.sens, K = D.kpi;
const kp = n => K[Object.keys(K).find(k => k.startsWith(n))];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const inr = (v, d = 0) => (v == null || isNaN(v)) ? "–" : Number(v).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";
const SVGNS = "http://www.w3.org/2000/svg";
function S(tag, a = {}, p) { const e = document.createElementNS(SVGNS, tag); for (const k in a) { if (k === "text") e.textContent = a[k]; else e.setAttribute(k, a[k]); } if (p) p.appendChild(e); return e; }
function H(tag, a = {}, html) { const e = document.createElement(tag); for (const k in a) { if (k === "class") e.className = a[k]; else e.setAttribute(k, a[k]); } if (html != null) e.innerHTML = html; return e; }
const SRC = { solar: "--solar", wind: "--wind", hydro: "--hydro", bess: "--bess", grid: "--grid", carbon: "--carbon", accent: "--olive", risk: "--risk", muted: "--muted-c" };
const YRS = M.rv_tot.map((_, i) => "Y" + i);
const plant = createPlant();

// day profile (dry season, MW) used by the 24-hour animation and the line-utilisation story
const DAY = {
  hydroOnly: [120, 120, 120, 120, 150, 250, 350, 350, 300, 250, 220, 220, 220, 220, 250, 300, 450, 800, 1000, 1000, 1000, 900, 500, 200],
  hydro: [250, 200, 150, 150, 150, 230, 330, 290, 200, 120, 80, 60, 60, 60, 80, 140, 700, 900, 930, 924, 920, 940, 970, 700],
  solar: [0, 0, 0, 0, 0, 0, 10, 60, 130, 200, 260, 295, 300, 290, 255, 195, 125, 55, 8, 0, 0, 0, 0, 0],
  wind: [30, 30, 28, 26, 24, 20, 16, 12, 10, 8, 8, 8, 8, 8, 10, 12, 14, 18, 22, 26, 30, 30, 30, 30],
  bess: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 50, 50, 30, 0, 0],
};

// ============================================================ chart helpers (large type)
function axes(svg, x0, y0, x1, y1, min, max, ticks, fmt) { for (let i = 0; i <= ticks; i++) { const v = min + (max - min) * i / ticks, y = y1 - (y1 - y0) * (v - min) / (max - min); S("line", { x1: x0, x2: x1, y1: y, y2: y, class: "axl", style: Math.abs(v) < 1e-9 ? "stroke:var(--muted-c)" : "" }, svg); S("text", { x: x0 - 10, y: y + 5, "text-anchor": "end", class: "ax", text: fmt(v) }, svg); } }
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function legend(svg, items, x, y) { let cx = x; items.forEach(([c, t]) => { S("circle", { cx: cx + 6, cy: y - 5, r: 6, style: `fill:var(${c})` }, svg); S("text", { x: cx + 17, y, class: "ax", style: "fill:var(--ink);font-family:var(--sans);font-size:14px", text: t }, svg); cx += 32 + t.length * 7.2; }); }
function stackedCols(series, cats, opt = {}) {
  const W = 860, Hh = 430, x0 = 72, y0 = 44, x1 = W - 16, y1 = Hh - 38, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": opt.label || "chart" });
  const tot = cats.map((_, i) => series.reduce((s, se) => s + Math.max(0, se.v[i]), 0)), mx = niceMax(Math.max(...tot) * 1.05);
  axes(svg, x0, y0, x1, y1, 0, mx, 4, v => inr(v)); const bw = (x1 - x0) / cats.length, bars = [];
  cats.forEach((c, i) => { const g = S("g", {}, svg); let acc = 0; series.forEach(se => { const v = Math.max(0, se.v[i]), h = (y1 - y0) * v / mx; S("rect", { x: x0 + i * bw + bw * .16, y: y1 - acc - h, width: bw * .68, height: Math.max(0, h), rx: 2, style: `fill:var(${se.c})` }, g); acc += h; });
    g.style.transformOrigin = `0 ${y1}px`; if (!RM) { g.style.transform = "scaleY(0)"; g.style.transition = `transform .7s cubic-bezier(.2,.8,.2,1) ${i * 35}ms`; requestAnimationFrame(() => requestAnimationFrame(() => g.style.transform = "scaleY(1)")); }
    if (cats.length <= 14 || i % 2 === 0) S("text", { x: x0 + i * bw + bw / 2, y: y1 + 20, "text-anchor": "middle", class: "ax", text: c }, svg); bars.push(g); });
  legend(svg, series.map(s => [s.c, s.n]), x0, 20); if (opt.unit) S("text", { x: x0 - 10, y: y0 - 14, "text-anchor": "end", class: "ax", text: opt.unit }, svg);
  return { svg, x0, y0, y1, bw, hl: idx => bars.forEach((b, i) => b.style.opacity = (idx == null || idx.includes(i)) ? 1 : .25) };
}
function lines(series, cats, opt = {}) {
  const W = 860, Hh = 430, x0 = 72, y0 = 44, x1 = W - 16, y1 = Hh - 38, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": opt.label || "chart" });
  const all = series.flatMap(s => s.v); let mn = Math.min(0, ...all), mx = Math.max(...all); const step = niceMax((mx - mn) / 4); mn = Math.floor(mn / step) * step; mx = Math.ceil(mx / step) * step;
  axes(svg, x0, y0, x1, y1, mn, mx, Math.round((mx - mn) / step), v => opt.fmt ? opt.fmt(v) : inr(v));
  const X = i => x0 + (x1 - x0) * i / (cats.length - 1), Y = v => y1 - (y1 - y0) * (v - mn) / (mx - mn);
  cats.forEach((c, i) => { if (cats.length <= 14 || i % 2 === 0) S("text", { x: X(i), y: y1 + 20, "text-anchor": "middle", class: "ax", text: c }, svg); });
  const paths = series.map(se => { if (se.area) S("path", { d: se.v.map((v, i) => (i ? "L" : "M") + X(i) + "," + Y(v)).join("") + `L${X(se.v.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z`, style: `fill:var(${se.c});opacity:.12` }, svg);
    const p = S("path", { d: se.v.map((v, i) => (i ? "L" : "M") + X(i) + "," + Y(v)).join(""), style: `fill:none;stroke:var(${se.c});stroke-width:${se.w || 3};stroke-linejoin:round;${se.dash ? "stroke-dasharray:6 6" : ""}` }, svg);
    if (se.dots) se.v.forEach((v, i) => S("circle", { cx: X(i), cy: Y(v), r: 3.2, style: `fill:var(${se.c})` }, svg)); return p; });
  if (opt.draw && !RM) paths.forEach((p, k) => { const L = p.getTotalLength ? 2000 : 0; p.style.strokeDasharray = "2000"; p.style.strokeDashoffset = "2000"; p.style.transition = `stroke-dashoffset 1.6s ease ${k * .25}s`; requestAnimationFrame(() => requestAnimationFrame(() => p.style.strokeDashoffset = "0")); });
  legend(svg, series.map(s => [s.c, s.n]), x0, 20); if (opt.unit) S("text", { x: x0 - 10, y: y0 - 14, "text-anchor": "end", class: "ax", text: opt.unit }, svg);
  return { svg, X, Y, y0, y1, paths };
}
function hbars(rows, opt = {}) {
  const W = 860, rh = opt.rh || 40, top = opt.legend ? 40 : 14, Hh = top + rows.length * rh + (opt.ref != null ? 30 : 10), x0 = opt.x0 || 320, x1 = W - 96, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": opt.label || "chart" });
  const mx = opt.max || niceMax(Math.max(...rows.map(r => r.v.reduce((a, b) => a + b, 0)))), gs = [];
  rows.forEach((r, i) => { const y = top + i * rh, g = S("g", {}, svg); S("text", { x: x0 - 12, y: y + rh * .62, "text-anchor": "end", class: "ttl", text: r.n }, g);
    S("rect", { x: x0, y: y + 6, width: x1 - x0, height: rh - 14, rx: (rh - 14) / 2, style: "fill:var(--card)" }, g);
    let acc = 0; r.v.forEach((v, j) => { const w = (x1 - x0) * Math.max(0, v) / mx, rect = S("rect", { x: x0 + acc, y: y + 6, width: w, height: rh - 14, rx: Math.min((rh - 14) / 2, w / 2), style: `fill:var(${(r.c && r.c[j]) || opt.c[j]})` }, g);
      if (!RM) { rect.style.transformOrigin = `${x0}px 0`; rect.style.transform = "scaleX(0)"; rect.style.transition = `transform .8s cubic-bezier(.2,.8,.2,1) ${i * 60}ms`; requestAnimationFrame(() => requestAnimationFrame(() => rect.style.transform = "scaleX(1)")); } acc += w; });
    S("text", { x: x0 + acc + 10, y: y + rh * .62, class: "ax", style: "fill:var(--ink);font-size:14px", text: opt.fmt ? opt.fmt(r) : inr(r.v.reduce((a, b) => a + b, 0), 1) }, g); gs.push(g); });
  if (opt.ref != null) { const x = x0 + (x1 - x0) * opt.ref / mx; S("line", { x1: x, x2: x, y1: top - 4, y2: Hh - 22, style: "stroke:var(--risk);stroke-width:2;stroke-dasharray:5 5" }, svg); S("text", { x: x + 6, y: Hh - 8, class: "ax", style: "fill:var(--risk);font-size:14px", text: opt.refLabel }, svg); }
  if (opt.legend) legend(svg, opt.legend, x0, 22);
  return { svg, hl: idx => gs.forEach((b, i) => b.style.opacity = (idx == null || idx.includes(i)) ? 1 : .28) };
}
function table(cols, rows) { const t = H("table", { class: "tbl" }); t.innerHTML = `<thead><tr>${cols.map(c => `<th${c.num ? ' style="text-align:right"' : ""}>${c.h}</th>`).join("")}</tr></thead>`;
  const tb = H("tbody"); rows.forEach(r => { const tr = H("tr"); tr.innerHTML = r.map((v, i) => `<td class="${cols[i].num ? "num" : ""}">${v}</td>`).join(""); tb.appendChild(tr); }); t.appendChild(tb);
  return { el: t, hl: idx => [...tb.children].forEach((tr, i) => { tr.classList.toggle("hot", idx != null && idx.includes(i)); tr.classList.toggle("dim", idx != null && !idx.includes(i)); }) }; }
function cards(items, cols, render) { const g = H("div", { class: "grid" }); g.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`; const els = items.map((it, i) => { const c = H("div", { class: "card" }, render(it, i)); g.appendChild(c); return c; });
  return { el: g, hl: idx => els.forEach((c, i) => { c.classList.toggle("hot", idx != null && idx.includes(i)); c.classList.toggle("dim", idx != null && !idx.includes(i)); }) }; }

// ============================================================ draggable diagrams
function Diagram(spec) {
  const W = spec.w || 1160, Hh = spec.h || 520, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, class: "dg", role: "img", "aria-label": spec.label || "Diagram" });
  const defs = S("defs", {}, svg); Object.entries(SRC).forEach(([k, v]) => { const m = S("marker", { id: "ar-" + k + spec.id, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" }, defs); S("path", { d: "M0,1 L9,5 L0,9 z", style: `fill:var(${v})` }, m); });
  const gE = S("g", {}, svg), gN = S("g", {}, svg), nodes = {}, edges = [];
  spec.nodes.forEach(n => { const w = n.w || spec.nw || 190, h = n.h || spec.nh || 64, node = { ...n, w, h, x0: n.x, y0: n.y }, g = S("g", { class: "node", tabindex: "0" }, gN);
    S("rect", { class: "halo", x: -4, y: -4, width: w + 8, height: h + 8, rx: 18 }, g); S("rect", { class: "card2", width: w, height: h, rx: 14 }, g);
    S("circle", { cx: 18, cy: 22, r: 6, style: `fill:var(${SRC[n.k || "accent"]})` }, g); S("text", { class: "t", x: 32, y: 27, text: n.t }, g);
    if (n.s) String(n.s).split("|").forEach((l, i) => S("text", { class: "s", x: 16, y: 48 + i * 16, text: l }, g));
    node.g = g; nodes[n.id] = node; place(node); let drag = null;
    g.addEventListener("pointerdown", ev => { const p = pt(ev); drag = { dx: p.x - node.x, dy: p.y - node.y }; g.setPointerCapture(ev.pointerId); ev.stopPropagation(); });
    g.addEventListener("pointermove", ev => { if (!drag) return; const p = pt(ev); node.x = Math.max(0, Math.min(W - node.w, p.x - drag.dx)); node.y = Math.max(0, Math.min(Hh - node.h, p.y - drag.dy)); place(node); route(); });
    g.addEventListener("pointerup", () => { drag = null; }); });
  spec.edges.forEach(e => { const k = e.k || "accent", p = S("path", { class: "edge" + (e.c ? " ctl" : ""), "marker-end": `url(#ar-muted${spec.id})` }, gE); if (e.both) p.setAttribute("marker-start", `url(#ar-muted${spec.id})`); edges.push({ ...e, p, k }); });
  function pt(ev) { return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse()); }
  function place(n) { n.g.setAttribute("transform", `translate(${n.x},${n.y})`); }
  function anchor(a, b) { const ax = a.x + a.w / 2, ay = a.y + a.h / 2, dx = b.x + b.w / 2 - ax, dy = b.y + b.h / 2 - ay; if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) return { x: dx > 0 ? a.x + a.w : a.x, y: ay, hz: 1 }; return { x: ax, y: dy > 0 ? a.y + a.h : a.y, hz: 0 }; }
  function route() { edges.forEach(e => { const a = nodes[e.f], b = nodes[e.t], s = anchor(a, b), t = anchor(b, a), c = Math.max(30, Math.hypot(t.x - s.x, t.y - s.y) / 3);
    const c1 = s.hz ? { x: s.x + (t.x > s.x ? c : -c), y: s.y } : { x: s.x, y: s.y + (t.y > s.y ? c : -c) }, c2 = t.hz ? { x: t.x + (s.x > t.x ? c : -c), y: t.y } : { x: t.x, y: t.y + (s.y > t.y ? c : -c) };
    e.p.setAttribute("d", `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${t.x},${t.y}`); }); }
  route();
  function highlight(h) { const on = !!(h && h.n && h.n.length); svg.classList.toggle("focus", on);
    Object.values(nodes).forEach(n => n.g.classList.toggle("hot", !!(on && h.n.includes(n.id))));
    edges.forEach(e => { const hot = on && h.n.includes(e.f) && h.n.includes(e.t); e.p.classList.toggle("hot", hot); e.p.style.stroke = hot ? `var(${SRC[e.k]})` : ""; e.p.setAttribute("marker-end", `url(#ar-${hot ? e.k : "muted"}${spec.id})`); }); }
  return { svg, highlight, reset() { Object.values(nodes).forEach(n => { n.x = n.x0; n.y = n.y0; place(n); }); route(); } };
}

// ============================================================ MP map
const SITES = [
  { id: "isp", n: "Indira Sagar–Omkareshwar", dist: "Khandwa", lat: 22.27, lon: 76.35, sc: [5, 5, 3, 3, 5, 5, 4], why: "Largest reservoir, existing 400 kV switchyard, NHDC partner, Indore buyers" },
  { id: "tawa", n: "Tawa–Satpura", dist: "Betul", lat: 22.4, lon: 78.0, sc: [4, 2, 5, 4, 4, 4, 3], why: "Coal-to-clean switchyard; weak hydro needs pumped storage" },
  { id: "bargi", n: "Bargi", dist: "Jabalpur", lat: 22.94, lon: 79.92, sc: [3, 3, 4, 2, 4, 5, 4], why: "At the Jabalpur load centre; small scale and weak wind" },
  { id: "gs", n: "Gandhi Sagar", dist: "Mandsaur", lat: 24.7, lon: 75.55, sc: [3, 3, 4, 5, 3, 1, 4], why: "Best wind, but Malwa grid is saturated; cheetah eco-zone" },
  { id: "bs", n: "Bansagar–Rewa", dist: "Shahdol", lat: 24.19, lon: 81.29, sc: [3, 4, 4, 2, 3, 2, 3], why: "Good hydro; next to Singrauli coal, no nearby buyer" }];
const W8 = [.25, .15, .15, .15, .15, .10, .05], wscore = s => s.sc.reduce((a, v, i) => a + v * W8[i], 0);
const RANK = SITES.map(s => ({ ...s, w: wscore(s) })).sort((a, b) => b.w - a.w);
function mpMap() {
  const W = 760, Hh = 470, lo0 = 73.4, lo1 = 83, la0 = 21, la1 = 26.9, X = lo => 40 + (W - 80) * (lo - lo0) / (lo1 - lo0), Y = la => Hh - 34 - (Hh - 70) * (la - la0) / (la1 - la0);
  const svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "Candidate sites in Madhya Pradesh", class: "bigmap" });
  for (let lo = 74; lo <= 82; lo += 2) { S("line", { x1: X(lo), x2: X(lo), y1: Y(la0), y2: Y(la1), class: "axl", style: "stroke-dasharray:2 6" }, svg); S("text", { x: X(lo), y: Hh - 10, "text-anchor": "middle", class: "ax", text: lo + "°E" }, svg); }
  for (let la = 22; la <= 26; la += 2) { S("line", { x1: X(lo0), x2: X(lo1), y1: Y(la), y2: Y(la), class: "axl", style: "stroke-dasharray:2 6" }, svg); S("text", { x: X(lo0) + 2, y: Y(la) - 6, class: "ax", text: la + "°N" }, svg); }
  const riv = (pts, w, o) => S("path", { d: pts.map((p, i) => (i ? "L" : "M") + X(p[0]) + "," + Y(p[1])).join(""), style: `fill:none;stroke:var(--hydro);stroke-width:${w};opacity:${o};stroke-linecap:round` }, svg);
  riv([[81.75, 22.67], [80.9, 22.9], [79.9, 23.1], [78.9, 22.95], [77.72, 22.75], [76.9, 22.4], [76.47, 22.28], [76.15, 22.24], [75.4, 22.1], [74.9, 22.03], [74.2, 21.9]], 4, .45);
  riv([[75.55, 24.7], [76.2, 25.3], [77, 26], [78.3, 26.6]], 2.5, .3);
  S("text", { x: X(78.7), y: Y(22.6) + 22, class: "ax", style: "fill:var(--hydro);font-size:14px", text: "Narmada" }, svg);
  [["Indore", 22.72, 75.86], ["Bhopal", 23.26, 77.41], ["Jabalpur", 23.18, 79.95], ["Gwalior", 26.22, 78.18]].forEach(([n, la, lo]) => { S("rect", { x: X(lo) - 4, y: Y(la) - 4, width: 8, height: 8, rx: 1, style: "fill:var(--muted)" }, svg); S("text", { x: X(lo) + 8, y: Y(la) - 7, class: "ax", text: n }, svg); });
  [["Sardar Sarovar · Gujarat-run", 21.83, 74.1], ["Pench · inter-state", 21.7, 79.25], ["Madhikheda · too small", 25.55, 77.9]].forEach(([n, la, lo]) => { S("path", { d: `M${X(lo) - 6},${Y(la) - 6}l12,12m0,-12l-12,12`, style: "stroke:var(--risk);stroke-width:2.5" }, svg); S("text", { x: X(lo) + 10, y: Y(la) + 5, class: "ax", style: "fill:var(--risk)", text: n }, svg); });
  const LO = { isp: [1, 30, "start"], tawa: [-14, -1, "start"], bs: [-1, 5, "end"] };
  SITES.forEach(s => { const v = wscore(s), r = 8 + v * 3.6, b = s.id === "isp", cx = X(s.lon), cy = Y(s.lat);
    if (b) S("circle", { cx, cy, r: r + 8, style: "fill:none;stroke:var(--lime);stroke-width:6" }, svg);
    S("circle", { cx, cy, r, style: `fill:var(${b ? "--olive" : "--muted-c"});opacity:${b ? .95 : .55}` }, svg);
    const o = LO[s.id] || [1, 5, "start"], dx = o[0] === 1 ? r + 8 : o[0] === -1 ? -r - 8 : o[0], dy = o[1] === -1 ? -r - 10 : o[1];
    S("text", { x: cx + dx, y: cy + dy, "text-anchor": o[2], class: "ttl", style: b ? "font-weight:700" : "", text: `${s.n} · ${v.toFixed(2)}` }, svg); });
  return svg;
}

// ============================================================ animated visuals
function reservoirAnim(host) {
  const W = 1000, Hh = 520, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "Reservoir cross-section" });
  const FRL = 150, MDDL = 228, ground = "M0,160 C110,175 220,260 340,340 C420,392 470,420 500,432 L500,520 L0,520Z";
  const defs = S("defs", {}, svg); const cp = S("clipPath", { id: "basin" }, defs); S("path", { d: "M0,140 L498,140 L498,432 C470,420 420,392 340,340 C220,260 110,175 0,160Z" }, cp);
  S("path", { d: ground, style: "fill:#D9D2BE" }, svg); S("path", { d: "M470,440 L1000,440 L1000,520 L470,520Z", style: "fill:#D9D2BE" }, svg);
  const wg = S("g", { "clip-path": "url(#basin)" }, svg); const water = S("rect", { x: 0, y: FRL, width: 500, height: 400, style: "fill:#6FA6C0" }, wg); S("rect", { x: 0, y: MDDL, width: 500, height: 300, style: "fill:#3F86A6" }, wg);
  S("line", { x1: 0, x2: 520, y1: FRL, y2: FRL, style: "stroke:var(--ink);stroke-dasharray:6 6;stroke-width:1.5" }, svg); S("line", { x1: 60, x2: 520, y1: MDDL, y2: MDDL, style: "stroke:#fff;stroke-dasharray:6 6;stroke-width:1.5" }, svg);
  S("text", { x: 10, y: FRL - 10, class: "ttl", text: "FRL 262.13 m" }, svg); S("text", { x: 300, y: MDDL + 26, class: "ttl", style: "fill:#fff", text: "MDDL 243.24 m" }, svg);
  const pv = S("g", {}, svg); for (let i = 0; i < 8; i++) { S("rect", { x: 150 + i * 34, y: -7, width: 28, height: 7, rx: 2, style: "fill:#16305f" }, pv); S("rect", { x: 148 + i * 34, y: 0, width: 32, height: 4, style: "fill:#e9ecec" }, pv); }
  S("path", { d: "M497,110 L560,110 L650,440 L488,440Z", style: "fill:#C9C5BB;stroke:#A9A497" }, svg); S("text", { x: 520, y: 98, class: "ttl", text: "Indira Sagar dam" }, svg);
  S("path", { d: "M500,300 L560,300 L700,400", class: "flowline", style: "fill:none;stroke:var(--hydro);stroke-width:14;stroke-linecap:round;opacity:.9" }, svg);
  S("rect", { x: 690, y: 360, width: 130, height: 80, rx: 10, style: "fill:#B4B9BD;stroke:#8F969B" }, svg); S("ellipse", { cx: 755, cy: 412, rx: 30, ry: 12, style: "fill:var(--hydro)" }, svg);
  S("text", { x: 755, y: 384, "text-anchor": "middle", class: "ttl", text: "8 × 125 MW" }, svg);
  S("path", { d: "M820,446 L1000,446", class: "flowline", style: "stroke:#6FA6C0;stroke-width:12" }, svg); S("text", { x: 990, y: 476, "text-anchor": "end", class: "ttl", text: "→ Omkareshwar (520 MW) → Sardar Sarovar" }, svg);
  S("path", { d: "M10,96 L110,118", class: "flowline", style: "stroke:var(--hydro);stroke-width:5" }, svg); S("text", { x: 10, y: 84, class: "ttl", style: "fill:var(--hydro)", text: "Narmada inflow · peaks Jul–Sep" }, svg);
  S("line", { x1: 880, x2: 880, y1: FRL, y2: 440, style: "stroke:var(--olive);stroke-width:3" }, svg); S("line", { x1: 560, x2: 890, y1: FRL, y2: FRL, style: "stroke:var(--olive);stroke-dasharray:3 6" }, svg);
  S("text", { x: 890, y: 300, class: "ttl", style: "fill:var(--olive);font-size:18px", text: "Head ≈ 70 m" }, svg);
  const lvl = S("text", { x: 10, y: 470, class: "ttl", style: "font-size:17px", text: "" }, svg);
  host.appendChild(svg);
  let raf, t0 = performance.now();
  function tick(now) { const ph = RM ? 0 : (now - t0) / 7000, k = (Math.sin(ph * Math.PI * 2) + 1) / 2, y = FRL + (MDDL - FRL - 8) * k; water.setAttribute("y", y); pv.setAttribute("transform", `translate(${k * 60},${y - 4})`);
    lvl.textContent = `Water level now: ${(262.13 - 18.89 * k * (MDDL - FRL - 8) / (MDDL - FRL)).toFixed(1)} m · panels float with it`; if (svg.isConnected) raf = requestAnimationFrame(tick); }
  raf = requestAnimationFrame(tick);
}
function journey() {
  const W = 1000, Hh = 470, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "How one unit of power earns" });
  const d = "M40,250 C170,250 220,160 330,160 S540,250 640,250 S830,180 960,176";
  const path = S("path", { d, style: "fill:none;stroke:var(--muted-c);stroke-width:2.5;stroke-dasharray:3 7;stroke-linecap:round" }, svg);
  const N = [{ x: 120, y: 250, big: "390 MWp", t: "Sun on the water", d: ["Floating panels make", "cheap daytime power"], ic: "☀" },
    { x: 330, y: 160, big: "1,520 MW", t: "Reservoir as battery", d: ["Hydro backs off by day;", "the dam keeps the water"], ic: "💧" },
    { x: 640, y: 250, big: "₹4.80/kWh", t: "Firm power at peak", d: ["Saved water runs the", "6–10 pm evening peak"], ic: "⚡" },
    { x: 900, y: 178, big: "5.08 lakh t", t: "Carbon credits", d: ["Every clean MWh earns", "credits under India's CCTS"], ic: "🌿" }];
  const pulse = S("circle", { r: 8, style: "fill:var(--olive)" }, svg);
  const gs = N.map((n, i) => { const g = S("g", {}, svg); const ring = S("circle", { cx: n.x, cy: n.y, r: 46, style: "fill:none;stroke:var(--lime);stroke-width:7;opacity:0" }, g);
    const c = S("circle", { cx: n.x, cy: n.y, r: 36, style: "fill:var(--paper);stroke:var(--line2);stroke-width:1.5" }, g); S("text", { x: n.x, y: n.y + 10, "text-anchor": "middle", style: "font-size:28px", text: n.ic }, g);
    const cx = Math.min(W - 232, Math.max(8, n.x - 112)), cy = n.y + 56; S("rect", { x: cx, y: cy, width: 224, height: 128, rx: 18, style: "fill:var(--paper);stroke:var(--line2)" }, g);
    S("text", { x: cx + 16, y: cy + 30, class: "ax", text: "0" + (i + 1) }, g); S("text", { x: cx + 208, y: cy + 31, "text-anchor": "end", style: "font:600 19px var(--sans);fill:var(--ink)", text: n.big }, g);
    S("text", { x: cx + 16, y: cy + 62, style: "font:600 18px var(--sans);fill:var(--ink)", text: n.t }, g);
    n.d.forEach((l, j) => S("text", { x: cx + 16, y: cy + 88 + j * 21, style: "font:400 15px var(--sans);fill:var(--muted)", text: l }, g)); return { g, ring, c }; });
  let raf; const L = path.getTotalLength ? null : null;
  function tick(now) { if (!svg.isConnected) return; const len = path.getTotalLength(), u = RM ? .5 : (now / 5200) % 1, p = path.getPointAtLength(len * u); pulse.setAttribute("cx", p.x); pulse.setAttribute("cy", p.y); raf = requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  return { svg, hl: i => gs.forEach((o, k) => { const on = i == null || i === k; o.g.style.opacity = on ? 1 : .35; o.ring.style.opacity = i === k ? 1 : 0; o.c.style.fill = i === k ? "var(--lime)" : "var(--paper)"; }) };
}
function day24(host, onNote) {
  const W = 960, Hh = 470, x0 = 78, x1 = 700, y0 = 70, y1 = 420, svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "24-hour dispatch animation" });
  const X = h => x0 + (x1 - x0) * h / 23, Y = v => y1 - (y1 - y0) * v / 1100;
  axes(svg, x0, y0, x1, y1, 0, 1000, 4, v => inr(v)); S("text", { x: x0 - 10, y: y0 - 14, "text-anchor": "end", class: "ax", text: "MW" }, svg);
  [0, 6, 12, 18, 23].forEach(h => S("text", { x: X(h), y: y1 + 22, "text-anchor": "middle", class: "ax", text: h + ":00" }, svg));
  const defs = S("defs", {}, svg), cp = S("clipPath", { id: "dayclip" }, defs), clip = S("rect", { x: x0, y: 0, width: 0, height: Hh }, cp);
  const area = S("g", { "clip-path": "url(#dayclip)" }, svg);
  const order = [["hydro", "--hydro", "Hydro (NHDC)"], ["wind", "--wind", "Wind"], ["solar", "--solar", "Solar"], ["bess", "--bess", "Battery"]];
  let base = Array(24).fill(0);
  order.forEach(([k, c]) => { const top = base.map((b, i) => b + DAY[k][i]); const dd = "M" + top.map((v, i) => `${X(i)},${Y(v)}`).join(" L") + " L" + base.map((v, i) => `${X(23 - i)},${Y(base[23 - i])}`).join(" L") + "Z"; S("path", { d: dd, style: `fill:var(${c});opacity:.92` }, area); base = top; });
  S("path", { d: "M" + DAY.hydroOnly.map((v, i) => `${X(i)},${Y(v)}`).join(" L"), style: "fill:none;stroke:var(--ink);stroke-width:2;stroke-dasharray:5 6;opacity:.55" }, svg);
  S("line", { x1: x0, x2: x1, y1: Y(1000), y2: Y(1000), style: "stroke:var(--risk);stroke-width:2.5;stroke-dasharray:8 6" }, svg);
  S("text", { x: x0 + 8, y: Y(1000) - 10, class: "ttl", style: "fill:var(--risk)", text: "Line limit ≈ 1,000 MW (example)" }, svg);
  S("text", { x: x1 - 4, y: Y(1000) - 10, "text-anchor": "end", class: "ax", text: "- - - hydro alone, today" }, svg);
  const cur = S("line", { x1: x0, x2: x0, y1: y0 - 10, y2: y1, style: "stroke:var(--ink);stroke-width:2" }, svg);
  const sunG = S("g", {}, svg); const sunC = S("circle", { r: 14, style: "fill:var(--solar)" }, sunG);
  const panel = S("g", {}, svg); S("rect", { x: 722, y: 60, width: 226, height: 360, rx: 18, style: "fill:var(--card);stroke:var(--line)" }, panel);
  const clock = S("text", { x: 740, y: 100, style: "font:300 34px var(--display);fill:var(--ink)", text: "00:00" }, panel);
  const rows = order.map(([k, c, n], i) => { S("circle", { cx: 748, cy: 136 + i * 34, r: 7, style: `fill:var(${c})` }, panel); S("text", { x: 762, y: 141 + i * 34, class: "ttl", style: "font-weight:500", text: n }, panel); return S("text", { x: 934, y: 141 + i * 34, "text-anchor": "end", class: "ttl", text: "0" }, panel); });
  S("line", { x1: 740, x2: 934, y1: 270, y2: 270, style: "stroke:var(--line)" }, panel); S("text", { x: 740, y: 296, class: "ttl", text: "Through the line" }, panel); const tot = S("text", { x: 934, y: 296, "text-anchor": "end", class: "ttl", text: "0" }, panel);
  S("text", { x: 740, y: 332, class: "ax", style: "font-family:var(--sans);font-size:14px", text: "Water saved in the reservoir" }, panel);
  S("rect", { x: 740, y: 344, width: 194, height: 16, rx: 8, style: "fill:var(--line)" }, panel); const wbar = S("rect", { x: 740, y: 344, width: 0, height: 16, rx: 8, style: "fill:var(--hydro)" }, panel);
  const wtxt = S("text", { x: 740, y: 388, class: "ttl", style: "font-weight:500", text: "" }, panel);
  legend(svg, order.map(o => [o[1], o[2]]), x0, 26);
  host.appendChild(svg);
  const lerp = (arr, h) => { const a = Math.floor(Math.min(22.999, h)), f = h - a; return arr[a] + (arr[Math.min(23, a + 1)] - arr[a]) * f; };
  const saved = []; let acc = 0; for (let h = 0; h < 24; h++) { acc += DAY.hydroOnly[h] - DAY.hydro[h]; saved.push(acc); }
  const maxSaved = Math.max(...saved.map(s => Math.max(0, s)));
  let t = 0, target = 23, playing = !RM, last = performance.now();
  function draw() { clip.setAttribute("width", Math.max(0, X(t) - x0)); cur.setAttribute("x1", X(t)); cur.setAttribute("x2", X(t));
    const sunUp = t > 6 && t < 18.5; sunG.style.opacity = sunUp ? 1 : .15; const sx = X(t), sy = y0 + 6 - Math.sin(Math.max(0, Math.min(1, (t - 6) / 12.5)) * Math.PI) * 30; sunC.setAttribute("cx", sx); sunC.setAttribute("cy", sy + 0);
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60); clock.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    let sum = 0; order.forEach(([k], i) => { const v = Math.round(lerp(DAY[k], t)); sum += v; rows[i].textContent = inr(v) + " MW"; }); tot.textContent = inr(sum) + " MW";
    const s = Math.max(0, lerp(saved, t)); wbar.setAttribute("width", 194 * s / maxSaved); wtxt.textContent = `≈ ${(s / .175 / 1000).toFixed(1)} million m³`; }
  function tick(now) { if (!svg.isConnected) return; const dt = (now - last) / 1000; last = now; if (playing && t < target) { t = Math.min(target, t + dt * 2.2); } draw(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  return { go(to, from) { if (from != null) t = from; target = to; playing = true; if (RM) t = to; }, replay() { t = 0; target = 23; playing = true; } };
}

// ============================================================ deck content
const CATS = [
  { id: "site", n: 1, label: "Site selection", judged: "Quality of site selection (non-private land in MP)" },
  { id: "synergy", n: 2, label: "Solar+hydro+wind", judged: "Clarity of how solar + hydro + wind work together" },
  { id: "model", n: 3, label: "3D model", judged: "Quality and usefulness of the 3D model" },
  { id: "tech", n: 4, label: "Technical", judged: "Technical feasibility and smart integration" },
  { id: "cost", n: 5, label: "Costs", judged: "Realism of cost estimates and financial projections" },
  { id: "rev", n: 6, label: "Day-1 revenue", judged: "Strength of the Day-1 revenue strategy" },
  { id: "policy", n: 7, label: "Policy", judged: "Policy alignment (Central + MP)" },
  { id: "prac", n: 8, label: "Practicality", judged: "Overall practicality" },
];
const DECK = []; const add = (cat, sub, title, o) => DECK.push({ cat, sub, title, ...o });

/* ---------- 1 SITE ---------- */
add("site", "Why this site", "Why Indira Sagar–Omkareshwar", { lede: "NHDC's two reservoirs on the Narmada, Khandwa district.",
  v: { type: "usp" }, notes: "Start with the answer. We picked NHDC's Indira Sagar–Omkareshwar reservoirs, and four advantages make it the strongest site in MP.",
  lines: [["We build on <b>government water and land</b>: NHDC's reservoirs on the Narmada, Khandwa.", { i: null }],
    ["<b>USP 1 · Land:</b> panels float on state-owned water. Nothing is bought, no one is moved.", { i: [0] }],
    ["<b>USP 2 · Storage:</b> India's largest reservoir works as our battery.", { i: [1] }],
    ["<b>USP 3 · Turbines:</b> 16 hydro units (1,520 MW) already exist and ramp in minutes.", { i: [2] }],
    ["<b>USP 4 · Grid:</b> a 400 kV switchyard is already built. No new transmission line.", { i: [3] }]] });
add("site", "Six-tier strategy", "How we chose: the six-tier strategy", { lede: "China's hydro-first rule plus India's clearance rule, scored like a bank would.",
  v: { type: "tiers" }, notes: "We did not guess. We removed fatal flaws first, then scored six tiers. Tier 1 is the Chinese rule: the reservoir decides how much solar and wind to add. Tier 4 is the Indian rule: the slowest clearance sets the schedule.",
  lines: [["First, remove <b>fatal flaws</b>: Gujarat-run dams, inter-state dams, dams too small, any private land.", { i: null }],
    ["<b>Tier 1 · Hydro anchor</b> (以水定风光): start from a reservoir that can store energy.", { i: [0] }],
    ["<b>Tier 2 · Evacuation:</b> reuse a switchyard. The line limits the plant, not the sunshine.", { i: [1] }],
    ["<b>Tier 3 · Complementarity:</b> sun, river inflow and wind must peak at different times.", { i: [2] }],
    ["<b>Tier 4 · Land:</b> pick land whose slowest clearance is already done.", { i: [3] }],
    ["<b>Tier 5 · Grid absorption:</b> buyers nearby, so nothing is curtailed.", { i: [4] }],
    ["<b>Tier 6 · Hazard & ecology:</b> earthquakes, floods, level swing, wildlife zones.", { i: [5] }]] });
add("site", "5 sites ranked", "Five finalists, ranked", { lede: "Weighted score out of 5: business 25%, six tiers 75%.",
  v: { type: "rank" }, notes: "Five government sites made the final round. Indira Sagar–Omkareshwar scores 4.35. Tawa–Satpura is our Phase 2. Gandhi Sagar has the best wind, but a saturated grid and a cheetah eco-zone.",
  lines: RANK.map((s, i) => [`<b>#${i + 1} ${s.n} · ${s.w.toFixed(2)}</b>: ${s.why}.`, { i: [i] }]) });
add("site", "MP Bhu-Abhilekh", "Proving the land is non-private", { lede: "Madhya Pradesh's digital land records, checked parcel by parcel.",
  v: { type: "diagram", title: "Land verification flow · drag any box", spec: { id: "l", w: 1160, h: 520, nw: 230, nodes: [
    { id: "a", t: "MP Bhu-Abhilekh", s: "mpbhulekh.gov.in", x: 20, y: 30, k: "grid" }, { id: "b", t: "Khasra number", s: "the plot's ID", x: 300, y: 30, k: "grid" },
    { id: "c", t: "Khatauni / B-1", s: "owner must be Shasakiya,|NVDA, WRD or NHDC", x: 580, y: 30, h: 74, k: "accent" },
    { id: "d", t: "Land class", s: "Banjar ✓  Charnoi ⚠|Van (forest) → FCA 1980", x: 880, y: 30, w: 250, h: 74, k: "risk" },
    { id: "e", t: "Naksha + DGPS survey", s: "map matches the ground", x: 880, y: 210, w: 250, k: "grid" }, { id: "f", t: "RCMS check", s: "no pending disputes", x: 580, y: 210, k: "grid" },
    { id: "g", t: "Reservoir water surface", s: "state property → one NOC|(RUMSL did this at Omkareshwar)", x: 20, y: 260, w: 280, h: 74, k: "hydro" },
    { id: "h", t: "Diversion + NOCs", s: "MP Land Revenue Code 1959|MPPCB · fisheries · CEIG", x: 300, y: 410, w: 260, h: 74, k: "carbon" },
    { id: "i", t: "Clean site", s: "zero land purchase", x: 880, y: 420, w: 250, k: "accent" }],
    edges: [{ f: "a", t: "b" }, { f: "b", t: "c" }, { f: "c", t: "d" }, { f: "d", t: "e" }, { f: "e", t: "f" }, { f: "f", t: "h" }, { f: "g", t: "h", k: "hydro" }, { f: "h", t: "i" }] } },
  notes: "This is how an Indian engineer proves land is non-private. Search the parcel on MP Bhu-Abhilekh by Khasra number, read the owner in the Khatauni or B-1, check the land class, match the Naksha with a DGPS survey, and check RCMS. Our panels are on state water, so they need only one NOC.",
  lines: [["Open <b>MP Bhu-Abhilekh</b> and find each shore parcel by its <b>Khasra number</b>.", { n: ["a", "b"] }],
    ["Read the <b>Khatauni / B-1</b>: the owner must be Shasakiya (government), NVDA, WRD or NHDC.", { n: ["b", "c"] }],
    ["Check the <b>land class</b>: Banjar is easiest; Charnoi is protected pasture; Van (forest) needs FCA 1980 clearance.", { n: ["c", "d"] }],
    ["Match the <b>Naksha</b> to the ground with a DGPS survey, then check <b>RCMS</b> for disputes.", { n: ["d", "e", "f"] }],
    ["The 390 MWp of panels sit on <b>state water</b>: one reservoir-use NOC, the route RUMSL used at Omkareshwar.", { n: ["g", "h", "i"] }]] });
add("site", "Hydropower potential", "Understanding the reservoir", { lede: "Why Indira Sagar can firm our solar without touching irrigation.",
  v: { type: "reservoir", title: "Reservoir cross-section · water level moves between FRL and MDDL" },
  notes: "The water level moves 19 metres between full and minimum, holding about 9.75 billion cubic metres. Power is rho g Q H eta. We shift only 0.035% of live storage per day, so irrigation and river flows are untouched.",
  lines: [["Full level <b>262.13 m</b>, minimum <b>243.24 m</b>: a 19 m swing holding ≈ <b>9.75 billion m³</b>.", {}],
    ["Power = <b>ρ · g · Q · H · η</b>. At ~70 m head, one 125 MW unit passes ≈ 200 m³ of water per second.", {}],
    ["One cubic metre at 70 m is worth ≈ <b>0.175 kWh</b>.", {}],
    ["To firm our solar we shift ≈ <b>3.4 million m³ a day</b>: only <b>0.035%</b> of live storage.", {}],
    ["The water is used twice: <b>Indira Sagar → Omkareshwar → Sardar Sarovar</b>.", {}]] });

/* ---------- 2 SYNERGY ---------- */
add("synergy", "The core idea", "The reservoir is the battery", { lede: "One unit of power, from sunlight to money.",
  v: { type: "journey" }, notes: "Here is the whole idea. Solar runs by day, so hydro backs off and the dam keeps its water. That water runs the evening peak. We sell firm power, and every clean unit earns carbon credits.",
  lines: [["<b>Sun on the water:</b> 390 MWp of floating panels make cheap daytime power.", { i: 0 }],
    ["<b>The reservoir is the battery:</b> while the sun shines, hydro backs down and saves water.", { i: 1 }],
    ["<b>Firm power at peak:</b> that saved water runs the 6–10 pm peak. We sell it as FDRE power at ₹4.80/kWh.", { i: 2 }],
    ["<b>Carbon credits on top:</b> every clean MWh is counted under India's CCTS.", { i: 3 }],
    ["Three variable sources become <b>one firm supply</b>.", { i: null }]] });
add("synergy", "A day, animated", "A day in the plant", { lede: "Watch the same 1,000 MW line through 24 hours.",
  v: { type: "day24", title: "Animated dispatch · a dry-season day" },
  notes: "Watch the clock. At night hydro and wind carry the base. From morning, solar ramps up and hydro backs down, so the reservoir fills with saved water. In the evening that water runs hydro close to the line limit. Same line, 31% more energy.",
  lines: [["<b>Night:</b> hydro and wind supply the base load.", { t: 5 }], ["<b>Morning to noon:</b> solar rises to 300 MW; hydro backs down to ~60 MW.", { t: 12 }],
    ["<b>Afternoon:</b> the water saved builds up, about 2 million m³ by 4 pm.", { t: 16 }], ["<b>6–10 pm:</b> saved water runs hydro near the 1,000 MW limit; the battery adds 50 MW.", { t: 21 }],
    ["<b>Result:</b> 12.3 GWh through the line instead of 9.4 GWh, +31%, never above the limit.", { t: 23, from: 0 }]] });
add("synergy", "Across the year", "Across the seasons", { lede: "Each source is strong when another is weak.",
  v: { type: "seasons", title: "Monthly output shape (indicative, MP climate)" }, notes: "Across the year: solar is strong from October to May, river inflow peaks July to September, and MP wind peaks May to August. The reservoir carries water from one season to the next.",
  lines: [["<b>Dry season (Oct–May):</b> clear skies, so solar does most of the work.", {}], ["<b>Monsoon (Jul–Sep):</b> clouds cut solar, but inflow and wind peak.", {}],
    ["<b>The reservoir</b> carries water across seasons, so the plant stays firm all year.", {}]] });
add("synergy", "Energy chain", "Harvest, convert, store, distribute", { lede: "The electrical path from nature to the buyer.",
  v: { type: "diagram", title: "System block diagram · drag any box", spec: { id: "b", w: 1180, h: 560, nw: 200, nodes: [
    { id: "pv", t: "Floating PV", s: "390 MWp bifacial", x: 16, y: 30, k: "solar" }, { id: "inv", t: "String inverters", s: "1500 V DC → AC", x: 236, y: 30, k: "solar" },
    { id: "wt", t: "Wind turbines", s: "16 × 3.15 MW", x: 16, y: 150, k: "wind" }, { id: "wc", t: "Converters", s: "→ 33 kV", x: 236, y: 150, k: "wind" },
    { id: "bs", t: "Battery (LFP)", s: "100 MWh", x: 16, y: 270, k: "bess" }, { id: "pcs", t: "Grid-forming PCS", s: "50 MW", x: 236, y: 270, k: "bess" },
    { id: "bus", t: "33 kV bus", s: "floating + land cables", x: 456, y: 150, k: "accent" }, { id: "pool", t: "Pooling S/S", s: "33/400 kV · 2×200 MVA", x: 676, y: 150, k: "accent" },
    { id: "swy", t: "400 kV switchyard", s: "existing (NHDC)", x: 676, y: 300, k: "grid" }, { id: "isp", t: "Indira Sagar hydro", s: "8 × 125 MW", x: 456, y: 420, k: "hydro" },
    { id: "osp", t: "Omkareshwar hydro", s: "8 × 65 MW", x: 676, y: 460, k: "hydro" }, { id: "grid", t: "MPPTCL grid", s: "400 kV", x: 960, y: 300, k: "grid" },
    { id: "fdre", t: "FDRE buyer", s: "MPPMCL via SECI", x: 960, y: 150, k: "grid" }, { id: "ci", t: "Industry", s: "Indore · Pithampur", x: 960, y: 450, k: "grid" }],
    edges: [{ f: "pv", t: "inv", k: "solar" }, { f: "inv", t: "bus", k: "solar" }, { f: "wt", t: "wc", k: "wind" }, { f: "wc", t: "bus", k: "wind" }, { f: "bs", t: "pcs", k: "bess", both: 1 }, { f: "pcs", t: "bus", k: "bess", both: 1 },
      { f: "bus", t: "pool" }, { f: "pool", t: "swy" }, { f: "isp", t: "swy", k: "hydro" }, { f: "osp", t: "swy", k: "hydro" }, { f: "swy", t: "grid", k: "grid" }, { f: "grid", t: "fdre", k: "grid" }, { f: "grid", t: "ci", k: "grid" }] } },
  notes: "Follow the chain: harvest, convert to 33 kV, store in the battery or the reservoir, step up to 400 kV in the pooling substation, send through NHDC's existing switchyard to the grid and to our two buyers.",
  lines: [["<b>Harvest:</b> sun on floating panels, wind on 16 turbines, falling water in 16 hydro units.", { n: ["pv", "wt", "isp", "osp"] }],
    ["<b>Convert:</b> inverters and converters bring everything to 33 kV.", { n: ["pv", "inv", "wt", "wc", "bus"] }],
    ["<b>Store:</b> the battery for minutes; the reservoir for hours and seasons.", { n: ["bs", "pcs", "bus", "isp"] }],
    ["<b>Distribute:</b> pooling substation → NHDC switchyard → grid → our buyers.", { n: ["bus", "pool", "swy", "grid", "fdre", "ci", "isp", "osp"] }]] });

/* ---------- 3 MODEL ---------- */
add("model", "Guided tour", "The plant in 3D: guided tour", { lede: "Every part on the screen is in the cost model.",
  v: { type: "3d", title: "3D model · Indira Sagar–Omkareshwar", focus: ["overview", "fpv", "wind", "bess", "hydro", "pool", "ctrl", "grid", "osp"] },
  notes: "Let me walk you around the site. The camera flies to each part as I talk. You can click any part to see its specification and cost.",
  lines: [["<b>The whole site:</b> reservoir, two dams, solar, wind, battery and grid in one place.", {}], ["<b>Floating solar · 390 MWp</b> near the dam, moored for the 19 m level swing.", {}],
    ["<b>Wind · 16 turbines</b> on the plateau above the reservoir.", {}], ["<b>Battery · 50 MW / 100 MWh</b> beside the pooling substation.", {}],
    ["<b>Indira Sagar dam and powerhouse · 1,000 MW</b>, existing.", {}], ["<b>Pooling substation 33/400 kV</b> collects solar, wind and battery.", {}],
    ["<b>AI control centre</b> runs every unit every 15 minutes.", {}], ["<b>Existing 400 kV switchyard and line</b> to the grid. No new line.", {}],
    ["<b>Omkareshwar · 520 MW</b> downstream uses the same water again.", {}]] });
add("model", "Day · evening · monsoon", "Watch it run", { lede: "The same plant at three moments. The readout shows who carries the load.",
  v: { type: "3d", title: "Operating modes", modes: true, focus: ["overview", "overview", "overview"] },
  notes: "Noon: solar carries the load and hydro saves water. Evening peak: the sky goes dark, the saved water runs the turbines, and the battery helps. Monsoon: clouds cut solar, but inflow and wind take over.",
  lines: [["<b>Dry-season noon:</b> solar 300 MW carries the load; hydro backs down and saves water.", { mode: "day" }],
    ["<b>Evening peak, 7 pm:</b> solar is zero; saved water runs hydro at 1,200 MW; the battery adds 50 MW.", { mode: "night" }],
    ["<b>Monsoon:</b> clouds cut solar to 110 MW; heavy inflow and monsoon wind take over.", { mode: "monsoon" }]] });
add("model", "Explore it", "Explore the model yourself", { lede: "Hand the judges the mouse.",
  v: { type: "3d", title: "Free exploration", explore: true, focus: ["overview"] },
  notes: "Invite a judge to rotate the model and click any part. Each part shows its size, its role and its cost from our financial model.",
  lines: [["<b>Drag</b> to rotate, <b>scroll</b> to zoom.", {}], ["<b>Click any part</b> to see its size, role and cost.", { info: "hydro" }], ["The model slowly orbits so it can run on a screen while we talk.", { orbit: true }]] });

/* ---------- 4 TECHNICAL ---------- */
add("tech", "Turbines", "Turbines: hydro firms solar, wind fills the nights", { lede: "16 existing hydro turbines and 16 new low-wind turbines.",
  v: { type: "img", src: "assets/turbines.svg", title: "Francis hydro unit and low-wind turbine" },
  notes: "The Francis hydro units reach full output in minutes and can black-start the grid. The wind turbines have a 140 m hub, because power rises with the cube of wind speed. We build wind only after 12 months of measurement.",
  lines: [["<b>Hydro (existing):</b> 8 × 125 MW + 8 × 65 MW Francis units. Full output in minutes.", {}], ["They <b>spin in sync</b> with the grid and can <b>black-start</b> it after a blackout.", {}],
    ["<b>Wind:</b> 16 × 3.15 MW low-wind turbines, ~140 m hub, ~160 m rotor.", {}], ["Power rises with <b>wind speed cubed</b>, so we measure for 12 months before building.", {}]] });
add("tech", "Switchyard & line", "Switchyard strategy: same line, more energy", { lede: "Example: a 1,000 MW line from Indira Sagar's existing switchyard.",
  v: { type: "img", src: "assets/line.svg", title: "Line utilisation on a dry-season day" },
  notes: "Today the line is idle most of the day. We add solar into the idle hours and move hydro to the evening, all under the same limit. Annual line use rises from 22.6% to 30.8%, with no new transmission line.",
  lines: [["<b>Today:</b> hydro uses the line mainly in the evening. It sits idle by day.", {}], ["<b>Our plan:</b> solar fills the idle hours; hydro moves its water to the evening.", {}],
    ["The AI-EMS keeps the total <b>under the line limit</b> at every moment.", {}], ["Annual line use rises from <b>22.6% to 30.8%</b> (1,980 GWh hydro + our 716 GWh).", {}],
    ["Reusing the switchyard saves <b>₹150–300 Cr</b> and 2–3 years of right-of-way.", {}]] });
add("tech", "AI energy management", "Smart control: the AI energy-management loop", { lede: "Measure, forecast, optimise, dispatch and learn, every 15 minutes.",
  v: { type: "diagram", title: "AI-EMS loop · drag any box", spec: { id: "c", w: 1180, h: 540, nw: 220, nodes: [
    { id: "s1", t: "Sky cameras", s: "cloud motion, irradiance", x: 16, y: 20, k: "solar" }, { id: "s2", t: "Wind LiDAR", s: "speed, direction", x: 16, y: 120, k: "wind" },
    { id: "s3", t: "Reservoir gauges", s: "level, inflow, rainfall", x: 16, y: 220, k: "hydro" }, { id: "s4", t: "Grid & market", s: "frequency, prices", x: 16, y: 320, k: "grid" },
    { id: "dp", t: "Data + digital twin", s: "one live copy of the plant", x: 290, y: 170, k: "accent" }, { id: "f1", t: "AI forecasts", s: "solar · wind · inflow · price", x: 560, y: 170, k: "accent" },
    { id: "opt", t: "Dispatch optimiser", s: "line limit · reservoir rules|eco-flow · PPA commitment", x: 560, y: 330, w: 250, h: 74, k: "accent" },
    { id: "a1", t: "Inverters", s: "solar set-points", x: 930, y: 30, k: "solar" }, { id: "a2", t: "Hydro governors", s: "NHDC units", x: 930, y: 140, k: "hydro" },
    { id: "a3", t: "Battery PCS", s: "charge / discharge", x: 930, y: 250, k: "bess" }, { id: "a4", t: "Wind controllers", s: "pitch / curtail", x: 930, y: 360, k: "wind" }],
    edges: [{ f: "s1", t: "dp", c: 1 }, { f: "s2", t: "dp", c: 1 }, { f: "s3", t: "dp", c: 1 }, { f: "s4", t: "dp", c: 1 }, { f: "dp", t: "f1" }, { f: "f1", t: "opt" }, { f: "opt", t: "a1" }, { f: "opt", t: "a2" }, { f: "opt", t: "a3" }, { f: "opt", t: "a4" }, { f: "a2", t: "dp", c: 1 }] } },
  notes: "Sensors stream into a digital twin. Machine-learning models forecast solar, wind, inflow and price. An optimiser picks the best plan every 15 minutes within the line limit and the reservoir rules, and sends set-points to every unit.",
  lines: [["<b>Sense:</b> sky cameras, wind LiDAR, reservoir gauges, grid frequency, prices.", { n: ["s1", "s2", "s3", "s4", "dp"] }],
    ["<b>Forecast:</b> AI predicts solar, wind, inflow and price from 15 minutes to a day ahead.", { n: ["dp", "f1"] }],
    ["<b>Optimise:</b> the best plan every 15 minutes within the line limit and reservoir rules.", { n: ["f1", "opt"] }],
    ["<b>Dispatch:</b> set-points go to inverters, hydro governors, battery and turbines.", { n: ["opt", "a1", "a2", "a3", "a4"] }],
    ["<b>Learn:</b> actual results retrain the forecasts.", { n: ["a2", "dp", "f1"] }]] });
add("tech", "Fail-safes", "Fail-safes and redundancy", { lede: "A backup at every timescale, from milliseconds to seasons.",
  v: { type: "failsafe" }, notes: "The battery holds the grid within milliseconds. Hydro ramps within minutes. The reservoir covers hours and seasons. Every key item has a spare, and hydro can restart the grid after a blackout.",
  lines: [["<b>0–200 ms:</b> the grid-forming battery holds voltage and frequency.", { i: [0] }], ["<b>1–10 min:</b> hydro units ramp when a cloud passes.", { i: [1] }],
    ["<b>Hours to seasons:</b> the reservoir shifts energy and plans the year.", { i: [2] }], ["<b>N-1 spares:</b> two transformers, double circuits, 60+ inverter blocks, dual SCADA.", { i: [3] }],
    ["<b>Black-start and islanding:</b> hydro restarts the grid; local feeders run alone if needed.", { i: [4] }]] });

/* ---------- 5 COSTS ---------- */
add("cost", "Cost breakdown", `Cost breakdown: ₹${inr(FIN["TOTAL PROJECT COST (gross)"])} Cr`, { lede: "Built item by item at 2026 Indian prices.",
  v: { type: "capex", title: "Capital cost by component (₹ Cr) · manufacturing vs installation" },
  notes: "Floating solar is the biggest item at Rs 1,560 crore, Rs 4 crore per MWp, half of which is modules. 85% of the total is manufactured equipment. Operating cost is Rs 76.7 crore a year in Year 3.",
  lines: [["<b>Floating solar ₹1,560 Cr</b>: ₹4.00 Cr/MWp (modules ₹2.10, floats ₹0.52, mooring ₹0.33).", { i: [0] }],
    ["<b>Wind ₹343 Cr</b> at ₹6.80 Cr/MW · <b>Battery ₹100 Cr</b> at ₹1.00 Cr/MWh.", { i: [1, 2] }],
    ["<b>Grid ₹150 Cr</b> (no new line) · <b>AI layer ₹30 Cr</b> · <b>surveys ₹25 Cr</b>.", { i: [3, 4, 5] }],
    ["Plus <b>5% contingency</b> and a 1% lender fee. 85% of the cost is manufactured equipment.", { i: [6, 7] }],
    ["<b>Operating cost:</b> ₹76.7 Cr a year (₹1.07/kWh), including the firming fee to NHDC.", { i: null }]] });
add("cost", "Real-world benchmarks", "Checked against real projects in India and China", { lede: "Every key number has a real precedent.",
  v: { type: "bench" }, notes: "Our numbers are not invented. Floating solar is already built in MP and Telangana. Our tariff is below a CERC-approved auction. And China has run hydro-firmed solar at gigawatt scale for a decade.",
  lines: [["<b>SJVN Omkareshwar, MP:</b> 90 MW floating solar for ₹646 Cr. Our ₹5.2 Cr/MW reflects cheaper 2026 modules.", { i: [0] }],
    ["<b>NTPC Ramagundam, Telangana:</b> 100 MW floating solar. Utility-scale FPV is proven in India.", { i: [1] }],
    ["<b>SJVN FDRE auction:</b> ₹4.82–4.91/kWh, approved by CERC. Our ₹4.80 bid is realistic.", { i: [2] }],
    ["<b>Longyangxia, China:</b> 850 MW solar firmed by a 1,280 MW hydro dam, the same idea as ours.", { i: [3] }],
    ["<b>Kela + Lianghekou, China:</b> 1 GW solar at 4,600 m paired with 3,000 MW hydro (2023).", { i: [4] }],
    ["<b>Huainan, China:</b> floating solar on a flooded lake since 2017, proving safety on open water.", { i: [5] }]] });
add("cost", "Loan & equity", "Financing: loan and equity", { lede: "70 : 30 debt to equity through a project company with NHDC.",
  v: { type: "funding" }, notes: "We need Rs 1,634 crore of loans and Rs 700 crore of equity. IREDA leads the lenders. NHDC holds 26% of the equity, which aligns the partner that owns the reservoir.",
  lines: [[`<b>Total cost ₹${inr(FIN["TOTAL PROJECT COST (gross)"])} Cr.</b> No grant assumed.`, { i: [0] }],
    [`<b>Loan ₹${inr(FIN["DEBT (loan required)"])} Cr:</b> IREDA ₹${inr(FIN["   IREDA"])}, PFC/REC ₹${inr(FIN["   PFC / REC"])}, SBI / green bonds / ADB ₹${inr(FIN["   SBI green term loan / green bonds / ADB-WB co-lending"])}.`, { i: [1] }],
    [`<b>Equity ₹${inr(FIN["EQUITY (own contribution)"])} Cr:</b> our company 74%, NHDC 26%.`, { i: [2] }],
    ["<b>Repayment:</b> interest-only for 3 years, then 18 years. Refinance in Year 5 at ~8%.", { i: [3] }]] });
add("cost", "Cash flow & ROI", "Cash flow, break-even and returns", { lede: "25 years, from the D4 financial model (all formulas live in Excel).",
  v: { type: "cashflow" }, notes: "Investors get their money back about 9 years after construction starts. Project IRR is 10.1%, equity IRR 13.4%. The break-even tariff is Rs 4.63 against Rs 4.80 sold.",
  lines: [[`<b>Break-even:</b> investors are repaid in <b>${kp("Equity payback").toFixed(1)} years</b> from construction start.`, { k: [3] }],
    [`<b>Returns:</b> project IRR ${pct(kp("Project IRR"))}, equity IRR ${pct(kp("Equity IRR"))}, NPV ₹${inr(kp("Project NPV"))} Cr.`, { k: [0, 1, 2] }],
    [`<b>Break-even tariff ₹${kp("Levelised cost").toFixed(2)}/kWh</b> against ₹4.80 sold.`, { k: [4] }],
    [`<b>Profit:</b> ₹${inr(kp("Total profit after tax"))} Cr after tax over 25 years; equity returned ${kp("Equity multiple").toFixed(2)}×.`, { k: [5] }]] });
add("cost", "Stress tests", "Stress tests: what if things go wrong?", { lede: "Equity IRR under bad news. The red line is the 14% hurdle.",
  v: { type: "sens" }, notes: "A 10% tariff cut still leaves the loan covered 1.18 times. Without any carbon revenue, equity IRR is 11.9%. The loan stays serviceable down to Rs 3.74 per kWh.",
  lines: [["<b>Tariff −10%:</b> equity IRR 9.0%, loan still covered 1.18×.", { i: [1] }], ["<b>No carbon revenue:</b> equity IRR 11.9%. Carbon is a bonus, not a crutch.", { i: [9] }],
    ["<b>No wind:</b> equity IRR rises to 14.3%. Wind is optional and gated.", { i: [12] }], ["The loan stays serviceable down to <b>₹3.74/kWh</b>.", { i: null }]] });

/* ---------- 6 REVENUE ---------- */
add("rev", "Money from month 3", "Revenue from Day 1", { lede: "The first income arrives before any panel is installed.",
  v: { type: "revenue" }, notes: "Month 3: our AI system starts optimising NHDC's existing hydro for a fee. Month 9: the first 100 MW of solar earns. Revenue is Rs 58.7 crore in the construction year and Rs 386 crore in Year 3.",
  lines: [["<b>Month 3:</b> our AI-EMS runs NHDC's existing hydro for a fee, before any construction finishes.", { i: [0] }],
    ["<b>Month 9:</b> the first 100 MW of solar is connected and earns that day.", { i: [0, 1] }],
    [`<b>Year 0 (construction):</b> ₹${inr(M.rv_tot[0], 1)} Cr. <b>Year 1:</b> ₹${inr(M.rv_tot[1], 1)} Cr.`, { i: [0, 1] }],
    [`<b>Year 3 onwards:</b> ≈ ₹${inr(M.rv_tot[3])} Cr a year from five streams.`, { i: [3] }]] });
add("rev", "Five revenue streams", "Five ways the plant earns", { lede: "Stacked income, each with its own buyer and contract.",
  v: { type: "streams" }, notes: "Most income comes from a 25-year firm-power contract. Factories in Indore buy a quarter. On top come the AI service fee, battery grid services and carbon credits.",
  lines: [[`<b>FDRE power contract:</b> ₹${inr(M.rv_ppa[3])} Cr/yr, fixed for 25 years, sovereign-backed buyer.`, { i: [0] }],
    [`<b>Industry (green open access):</b> ₹${inr(M.rv_ci[3])} Cr/yr. Factories save ~₹2–3/kWh.`, { i: [1] }],
    [`<b>AI-EMS service:</b> ₹${inr(M.rv_ems[3], 1)} Cr/yr from day 0.`, { i: [2] }],
    [`<b>Battery grid services</b> ₹${inr(M.rv_anc[3])} Cr and <b>carbon credits</b> ₹${inr(M.rv_co2[3], 1)} Cr per year.`, { i: [3, 4] }]] });
add("rev", "Carbon credits", "How we earn carbon credits", { lede: "Under India's Carbon Credit Trading Scheme (CCTS).",
  v: { type: "diagram", title: "Carbon credit flow · drag any box", spec: { id: "k", w: 1180, h: 520, nw: 230, nodes: [
    { id: "a", t: "Clean MWh metered", s: "716 GWh a year", x: 16, y: 30, k: "solar" }, { id: "b", t: "Register project", s: "BEE method: RE with storage", x: 300, y: 30, k: "carbon" },
    { id: "c", t: "Independent check", s: "accredited verifier (ACVA)", x: 584, y: 30, k: "carbon" }, { id: "d", t: "Credits issued", s: "1 credit = 1 tonne CO₂", x: 868, y: 30, k: "carbon" },
    { id: "e", t: "Double-count check", s: "buyers' green claims → 50%", x: 868, y: 200, k: "risk" }, { id: "f", t: "Sold on exchange", s: "IEX / PXIL", x: 584, y: 200, k: "accent" },
    { id: "g", t: "Industry buys", s: "cement, steel, refineries", x: 300, y: 200, k: "grid" }, { id: "h", t: "Revenue", s: "≈ ₹16.7 Cr a year", x: 16, y: 200, k: "carbon" },
    { id: "cn", t: "China's CCER", s: "excludes plain solar & wind;|credits only what needs support", x: 300, y: 380, w: 300, h: 74, k: "risk" },
    { id: "in", t: "India's CCTS", s: "credits RE with storage:|exactly our plant", x: 660, y: 380, w: 300, h: 74, k: "carbon" }],
    edges: [{ f: "a", t: "b", k: "carbon" }, { f: "b", t: "c", k: "carbon" }, { f: "c", t: "d", k: "carbon" }, { f: "d", t: "e", k: "risk" }, { f: "e", t: "f", k: "carbon" }, { f: "f", t: "g", k: "carbon" }, { f: "g", t: "h", k: "carbon" }, { f: "cn", t: "in", c: 1 }] } },
  notes: "We register under BEE's renewable-energy-with-storage method, an accredited verifier checks our meter data, credits are issued and sold to heavy industry on the power exchanges. China excludes plain solar and wind; India credits storage-backed renewables, which is what we are.",
  lines: [["<b>Register</b> with BEE under the 'renewable energy with storage' method.", { n: ["a", "b"] }], ["An <b>accredited verifier</b> checks the meter data; credits are issued (1 credit = 1 t CO₂).", { n: ["b", "c", "d"] }],
    ["We count only <b>50%</b>, because buyers may claim the rest for their green targets.", { n: ["d", "e"] }], ["Credits are <b>sold on IEX/PXIL</b> to heavy industry: ≈ ₹16.7 Cr a year.", { n: ["e", "f", "g", "h"] }],
    ["<b>China vs India:</b> China's CCER excludes plain solar; India rewards RE with storage, which is us.", { n: ["cn", "in"] }]] });
add("rev", "Business moat", "Why competitors can't match our price", { lede: "We rent firmness from the reservoir instead of buying batteries.",
  v: { type: "moat" }, notes: "To sell firm power, a competitor needs about 1,200 MWh of batteries, around Rs 1,200 crore. We pay NHDC a firming fee worth about Rs 203 crore in today's money. That is a Rs 997 crore advantage, and NHDC is our partner, so it stays ours.",
  lines: [["A competitor needs ≈ <b>1,200 MWh of batteries</b> to sell firm power: ≈ ₹1,200 Cr.", { i: [0] }], ["We <b>rent firmness</b> from NHDC's reservoir: ≈ ₹203 Cr in today's money.", { i: [1] }],
    ["<b>Advantage ≈ ₹997 Cr</b>, so we can bid below rivals and still profit.", { i: [2] }], ["NHDC owns 26% and earns the firming fee: <b>our partner, not a competitor</b>.", { i: null }]] });

/* ---------- 7 POLICY ---------- */
const POLC = [["MoP FDRE Guidelines 2023", "Firm & dispatchable RE bidding", "Our main contract at ₹4.80/kWh"], ["MNRE Wind-Solar Hybrid Policy 2018", "Hybrids share land and grid", "Solar + wind on one connection"],
  ["Green Energy Open Access Rules 2022", "Factories buy green power directly", "25% sold to Indore industry"], ["Late Payment Surcharge Rules 2022", "Discoms must pay on time", "Lower lender risk"],
  ["CCTS 2023 + BEE methodologies 2025", "Credits for RE with storage", "Carbon revenue"], ["VGF for BESS (2025) + green loans", "₹18 lakh/MWh grant; cheap debt", "Upside; IREDA-led debt"]];
const POLM = [["NHDC (NHPC 51% : MP Govt 49%)", "Owns reservoirs and switchyard", "26% partner + firming service"], ["RUMSL", "Ran Omkareshwar floating-solar tenders", "Water-lease precedent"],
  ["MPPMCL", "State power buyer; runs battery tenders", "Buyer of firm power"], ["MP Bhu-Abhilekh + Land Revenue Code 1959", "Land records and diversion", "Proves land is non-private"],
  ["NVDA / Water Resources Dept", "Reservoir and water rules", "Water-surface NOC; river releases kept"], ["MPNRED · MPERC · MPPCB", "Single window, tariffs, consents", "Approvals"]];
add("policy", "Government of India", "Central government alignment", { lede: "Each policy is tied to a decision in our plan.",
  v: { type: "table", cols: [{ h: "Policy" }, { h: "What it gives" }, { h: "How we use it" }], rows: POLC }, notes: "The central policies give us our product, our buyers, payment security, carbon credits and cheaper money.",
  lines: [["<b>Product:</b> FDRE guidelines and the hybrid policy define what we sell and how we connect.", { i: [0, 1] }], ["<b>Buyers & payment:</b> open access lets factories buy; LPS Rules make discoms pay.", { i: [2, 3] }],
    ["<b>Extra income & cheaper money:</b> carbon credits, VGF upside, green loans.", { i: [4, 5] }]] });
add("policy", "Madhya Pradesh", "Madhya Pradesh alignment", { lede: "State agencies we work with, and the rules for land and water.",
  v: { type: "table", cols: [{ h: "Agency / rule" }, { h: "Role" }, { h: "How we use it" }], rows: POLM }, notes: "NHDC is our partner. RUMSL already leased this water for solar. MPPMCL buys the power. Bhu-Abhilekh and NVDA set our land and water rules.",
  lines: [["<b>Partners:</b> NHDC (26%) and the RUMSL precedent on the same water.", { i: [0, 1] }], ["<b>Buyer:</b> MPPMCL, which also runs battery tenders.", { i: [2] }],
    ["<b>Land & water:</b> Bhu-Abhilekh, the Land Revenue Code and NVDA/WRD rules.", { i: [3, 4] }], ["<b>Approvals:</b> MPNRED single window, MPERC, MPPCB.", { i: [5] }]] });

/* ---------- 8 PRACTICALITY ---------- */
add("prac", "Roadmap", "Implementation roadmap: build what earns first", { lede: "Five phases. Each one unlocks money or starts earning it.",
  v: { type: "phases" }, notes: "Phase 0 prepares and unlocks the loan. Phase 1 installs our AI on the existing hydro, so we earn from month 3. Phase 2 adds solar in 50 MW blocks. Phase 3 the battery. Phase 4 wind, only if the 12-month mast passes.",
  lines: [["<b>Phase 0 (−12 to 0 months):</b> surveys, wind mast, NHDC agreement, water NOC, contract, loan.", { i: [0] }], ["<b>Phase 1 (0–3):</b> AI-EMS on existing hydro → first revenue.", { i: [1] }],
    ["<b>Phase 2 (2–22):</b> floating solar in 50 MW blocks; each earns when connected.", { i: [2] }], ["<b>Phase 3 (8–18):</b> battery for peak firming and grid services.", { i: [3] }],
    ["<b>Phase 4 (14–30):</b> wind, if the mast confirms the resource. Then full operation.", { i: [4] }]] });
add("prac", "Timeline", "Timeline and testing", { lede: "◆ marks revenue starts and decision gates.",
  v: { type: "gantt" }, notes: "Every block passes factory tests, site tests, the electrical inspector, grid compliance tests and a 72-hour trial before it earns.",
  lines: [["<b>Month 3:</b> first revenue from AI-EMS.", { i: [4] }], ["<b>Month 9:</b> first 100 MW of solar earns.", { i: [6] }], ["<b>Month 30:</b> all blocks in commercial operation.", { i: [11] }],
    ["<b>Testing at every block:</b> factory → site → CEIG inspection → grid tests → 72-hour trial.", { i: null }]] });
add("prac", "Environment & safety", "Environment, safety and grid", { lede: "Safe, compliant, and good for the reservoir.",
  v: { type: "table", cols: [{ h: "Topic" }, { h: "Our approach" }], rows: [["Environment", "Under 1% of the reservoir covered; less evaporation; no forest, farmland or resettlement"], ["Aquatic life", "Open channels between arrays; fisheries monitoring"],
    ["Safety", "CEA Safety Regulations 2023; UL 9540A battery; lightning protection on water"], ["Grid", "CEA connectivity standards; grid-forming battery; black-start; islanding"],
    ["Scale", "Grows in 50 MW blocks; Phase 2 at Tawa–Satpura"], ["Smart", "AI dispatch, digital twin, drones, robotic cleaning, automated carbon accounting"]] },
  notes: "The plant covers under 1% of the reservoir, reduces evaporation, takes no land, follows CEA safety and grid standards, and can grow block by block.",
  lines: [["<b>Environment:</b> under 1% of the water covered; less evaporation; no land taken.", { i: [0, 1] }], ["<b>Safety & grid:</b> CEA standards, fire-tested battery, black-start.", { i: [2, 3] }],
    ["<b>Scale & smart:</b> 50 MW blocks, Phase 2 at Tawa–Satpura, AI everywhere.", { i: [4, 5] }]] });
add("prac", "What we need", "What we need to start", { lede: "Four approvals unlock a plant that earns in its first quarter.",
  v: { type: "close" }, notes: "To start, we need four things: an MoU with NHDC, the water-surface NOC, a firm-power contract, and IREDA-led debt. Thank you.",
  lines: [["<b>NHDC:</b> joint-venture MoU and the hydro-firming agreement.", { i: 0 }], ["<b>Water surface:</b> reservoir-use NOC from NHDC / WRD.", { i: 1 }],
    ["<b>Buyer:</b> FDRE contract via MPPMCL or SECI, plus factory contracts.", { i: 2 }], ["<b>Finance:</b> IREDA-led loan and carbon registration with BEE.", { i: 3 }]] });

// ============================================================ visual builders
function frame(title, extra) { const v = document.getElementById("visual"); v.innerHTML = ""; if (title) { const h = H("div", { class: "vhead" }, `<b>${title}</b>`); if (extra) h.appendChild(extra); v.appendChild(h); } const b = H("div", { class: "vbody" }); v.appendChild(b); return { v, b }; }
const FAILS = [["0–200 ms", "Grid-forming battery holds voltage and frequency", "--bess"], ["1–10 min", "Hydro units ramp when a cloud passes", "--hydro"], ["Hours → seasons", "Reservoir shifts energy and plans the year", "--hydro"],
  ["N-1 spares", "2 × 200 MVA transformers, double circuits, 60+ inverter blocks, dual SCADA", "--olive"], ["Black-start & islanding", "Hydro restarts the grid; local feeders can run alone", "--carbon"]];
const BUILD = {
  usp() { const { b } = frame("Our four advantages");
    const c = cards([["01", "Land solved", "Panels float on state-owned water. MP Bhu-Abhilekh checks every shore parcel.", "--carbon", "0 land bought"], ["02", "Reservoir = battery", "India's largest reservoir, ≈ 9.75 bn m³ live storage.", "--hydro", "0.035% used a day"],
      ["03", "Turbines exist", "16 hydro units (1,520 MW) ramp in minutes and can black-start.", "--wind", "₹0 turbine capex"], ["04", "Grid exists", "NHDC's 400 kV switchyard and lines are reused.", "--solar", "No new line"]], 2,
      ([n, h, p, col, tag]) => `<span class="no">${n}</span><h3><span class="dot" style="background:var(${col})"></span>${h}</h3><p>${p}</p><span class="tag">${tag}</span>`);
    b.appendChild(c.el); return { step(i, o) { c.hl(o && o.i ? o.i : null); } }; },
  tiers() { const { b } = frame("Six tiers, with the Chinese and Indian rule behind each");
    const c = cards([["T1", "Hydro anchor", "以水定风光 · hydro decides solar & wind", "India's largest reservoir"], ["T2", "Evacuation", "打捆外送 · bundle all on one line", "Existing 400 kV switchyard"],
      ["T3", "Complementarity", "Solar Oct–May · inflow Jul–Sep · wind May–Aug", "Moderate wind → small, gated"], ["T4", "Land", "Water surface is state property", "Bhu-Abhilekh for shore parcels"],
      ["T5", "Grid absorption", "消纳 · avoid curtailment", "Indore industry ~100 km"], ["T6", "Hazard & ecology", "Seismic II–III · 19 m level swing", "Under 1% of reservoir covered"]], 3,
      ([n, h, p, tag]) => `<span class="no">${n}</span><h3>${h}</h3><p>${p}</p><span class="tag">${tag}</span>`);
    b.appendChild(c.el); return { step(i, o) { c.hl(o && o.i ? o.i : null); } }; },
  rank() { const { b } = frame("Weighted score out of 5"); const sp = H("div", { class: "split" }); const mp = H("div", { class: "vbody center" }); mp.appendChild(mpMap()); sp.appendChild(mp);
    const list = H("div", { class: "rank" }); const rows = RANK.map((s, i) => { const r = H("div", { class: "rk" }, `<span class="r">#${i + 1}</span><div><h4>${s.n}</h4><p>${s.dist} · ${s.why}</p><div class="meter"><i style="width:${s.w / 5 * 100}%"></i></div></div><span class="s">${s.w.toFixed(2)}</span>`); list.appendChild(r); return r; });
    sp.appendChild(list); b.appendChild(sp); return { step(i, o) { rows.forEach((r, k) => { r.classList.toggle("hot", !!o && o.i && o.i.includes(k)); r.classList.toggle("dim", !!o && o.i && !o.i.includes(k)); }); } }; },
  diagram(s) { const sp = H("div", { class: "sp" }), rb = H("button", { class: "tog", type: "button" }, "Reset layout"); sp.appendChild(rb); const { b } = frame(s.v.title, sp); b.classList.add("center"); const d = Diagram(s.v.spec); b.appendChild(d.svg); rb.onclick = d.reset; return { step(i, o) { d.highlight(o && o.n ? o : null); } }; },
  reservoir(s) { const { b } = frame(s.v.title); b.classList.add("center"); reservoirAnim(b); return { step() {} }; },
  journey() { const { b } = frame("How one unit of power earns · animated"); b.classList.add("center"); const j = journey(); b.appendChild(j.svg); return { step(i, o) { j.hl(o ? o.i : null); } }; },
  day24(s) { const sp = H("div", { class: "sp" }), rb = H("button", { class: "tog", type: "button" }, "▶ Replay day"); sp.appendChild(rb); const { b } = frame(s.v.title, sp); b.classList.add("center"); const a = day24(b); rb.onclick = () => a.replay();
    return { step(i, o) { if (o && o.t != null) a.go(o.t, o.from); } }; },
  seasons(s) { const { b } = frame(s.v.title); b.classList.add("center"); const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const ch = lines([{ n: "Solar", c: "--solar", v: [.85, .92, 1, 1, .97, .75, .55, .55, .7, .88, .86, .82], area: 1 }, { n: "River inflow", c: "--hydro", v: [.05, .04, .03, .02, .02, .15, .75, 1, .7, .2, .08, .06], area: 1 }, { n: "Wind", c: "--wind", v: [.35, .4, .45, .6, .9, 1, .95, .85, .55, .3, .3, .32] }], mo, { fmt: v => Math.round(v * 100) + "%", draw: 1 });
    b.appendChild(ch.svg); return { step() {} }; },
  "3d"(s) { const sp = H("div", { class: "sp" }); const { b } = frame(s.v.title, sp); b.style.overflow = "hidden";
    if (s.v.modes) Object.entries({ day: "Noon", night: "Evening peak", monsoon: "Monsoon" }).forEach(([k, l]) => { const t = H("button", { class: "tog", type: "button", "aria-pressed": String(plant.mode === k) }, l); t.dataset.mode = k; t.onclick = () => { plant.setMode(k); sp.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x === t))); }; sp.appendChild(t); });
    const ov = H("button", { class: "tog", type: "button" }, "Overview"); ov.onclick = () => plant.focus("overview"); sp.appendChild(ov);
    if (!s.v.modes) plant.setMode("day");
    plant.mount(b, { readout: !!s.v.modes, orbit: false });
    return { step(i, o) { if (s.v.focus) plant.focus(s.v.focus[Math.min(i, s.v.focus.length - 1)]); if (o && o.mode) { plant.setMode(o.mode); sp.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === o.mode))); }
      if (o && o.info) plant.showInfo(o.info); plant.setOrbit(!!(o && o.orbit)); } }; },
  img(s) { const { b } = frame(s.v.title); b.classList.add("center"); const im = H("img", { src: s.v.src, alt: s.v.title }); im.style.cssText = "max-width:100%;max-height:100%;object-fit:contain"; b.appendChild(im); return { step() {} }; },
  failsafe() { const { b } = frame("Defence in depth"); const c = cards(FAILS, 1, ([h, p, col]) => `<h3><span class="dot" style="background:var(${col})"></span>${h}</h3><p>${p}</p>`); c.el.style.gridTemplateColumns = "1fr"; b.appendChild(c.el); return { step(i, o) { c.hl(o && o.i ? o.i : null); } }; },
  capex() { const { v, b } = frame("Capital cost by component (₹ Cr)"); b.classList.add("center");
    const rows = CAP.filter(r => r[1] != null).map(r => ({ n: r[0].replace(/ \(.*\)/, "").replace("Smart layer: AI-EMS, SCADA, sensors, digital twin", "Smart layer (AI-EMS)").replace("Pre-development, surveys & clearances", "Surveys & clearances"), v: [r[5], r[6]] }));
    const c = CAP.find(r => r[0] === "Contingency"), f = CAP.find(r => r[0].startsWith("Financing cost")); rows.push({ n: "Contingency (5%)", v: [c[5], c[6]] }, { n: "Lender fee", v: [0, f[4]] });
    const ch = hbars(rows, { c: ["--solar", "--grid"], x0: 290, legend: [["--solar", "Manufacturing / supply"], ["--grid", "Installation & services"]] }); b.appendChild(ch.svg);
    v.appendChild(H("div", { class: "vnote" }, `Total ₹${inr(FIN["TOTAL PROJECT COST (gross)"], 1)} Cr · O&M ₹76.7 Cr/yr · source: D4 financial model (Excel)`)); return { step(i, o) { ch.hl(o && o.i ? o.i : null); } }; },
  bench() { const { b } = frame("Reference projects");
    const t = table([{ h: "Project" }, { h: "Where" }, { h: "Size & cost / tariff" }, { h: "What it proves" }], [
      ["SJVN Omkareshwar FPV", "MP, India · 2024", "90 MW · ₹646 Cr · ₹3.26/kWh", "Floating solar on this exact reservoir"], ["NTPC Ramagundam FPV", "Telangana, India · 2022", "100 MW floating solar", "Utility-scale FPV works in India"],
      ["SJVN FDRE auction", "India · CERC, Oct 2026", "448 MW · ₹4.82–4.91/kWh", "Our ₹4.80 firm-power bid is realistic"], ["Longyangxia hydro-solar", "Qinghai, China · 2015", "850 MW PV + 1,280 MW hydro", "Hydro firming solar works at scale"],
      ["Kela PV + Lianghekou", "Sichuan, China · 2023", "1 GW PV + 3,000 MW hydro", "Water-wind-solar bases are the new norm"], ["Huainan floating PV", "Anhui, China · 2017", "Floating PV on a flooded lake", "FPV is safe on open water"]]);
    b.appendChild(t.el); return { step(i, o) { t.hl(o && o.i ? o.i : null); } }; },
  funding() { const { b } = frame("Where the money comes from (₹ Cr)"); const tot = FIN["TOTAL PROJECT COST (gross)"];
    const src = [["IREDA (loan)", FIN["   IREDA"], "--hydro"], ["PFC / REC (loan)", FIN["   PFC / REC"], "--olive"], ["SBI / green bonds / ADB (loan)", FIN["   SBI green term loan / green bonds / ADB-WB co-lending"], "--grid"], ["Our company (equity 74%)", FIN["   Project sponsor (our SPV)"], "--carbon"], ["NHDC (equity 26%)", FIN["   NHDC (government JV partner)"], "--wind"]];
    const wrap = H("div", { style: "padding:18px 20px" });
    const k = H("div", { class: "kpis" }); k.style.padding = "0 0 16px"; const tiles = [["Total project cost", "₹" + inr(tot) + " Cr"], ["Loan (70%)", "₹" + inr(FIN["DEBT (loan required)"]) + " Cr"], ["Equity (30%)", "₹" + inr(FIN["EQUITY (own contribution)"]) + " Cr"]].map(([a, v]) => { const d = H("div", { class: "kpi" }, `<small>${a}</small><b>${v}</b>`); k.appendChild(d); return d; });
    const bar = H("div", { class: "stackbar" }); src.forEach(([n, v, c]) => bar.appendChild(H("i", { style: `width:${v / tot * 100}%;background:var(${c})`, title: n })));
    const lg = H("div", { class: "legend" }); src.forEach(([n, v, c]) => lg.appendChild(H("span", {}, `<i style="background:var(${c})"></i>${n}: ₹${inr(v)} Cr`)));
    const rep = H("div", { class: "card", style: "margin-top:16px" }, "<h3>Repayment plan</h3><p>Interest-only Y0–Y2 → 18 years of equal principal → refinance in Y5 at ~8% → debt-free by Y20. Worst-year cover 1.33×.</p>");
    wrap.append(k, bar, lg, rep); b.appendChild(wrap);
    return { step(i, o) { const x = o && o.i ? o.i[0] : null; tiles.forEach((t, j) => t.classList.toggle("hot", x === j)); rep.classList.toggle("hot", x === 3); } }; },
  cashflow() { const { b } = frame("Cumulative cash flow (₹ Cr) · 25 years"); const k = H("div", { class: "kpis" });
    const tiles = [["Project IRR", pct(kp("Project IRR"))], ["Equity IRR", pct(kp("Equity IRR"))], ["NPV", "₹" + inr(kp("Project NPV")) + " Cr"], ["Payback", kp("Equity payback").toFixed(1) + " yrs"], ["Break-even tariff", "₹" + kp("Levelised cost").toFixed(2)], ["Equity multiple", kp("Equity multiple").toFixed(2) + "×"]].map(([a, v]) => { const d = H("div", { class: "kpi" }, `<small>${a}</small><b>${v}</b>`); k.appendChild(d); return d; });
    const ch = lines([{ n: "Investors' cumulative cash", c: "--carbon", v: M.ecf_cum, dots: 1, area: 1 }, { n: "Project cumulative cash", c: "--olive", v: M.fcf_cum }], YRS, { unit: "₹ Cr", draw: 1 });
    const pe = kp("Equity payback"), xp = ch.X(pe); S("line", { x1: xp, x2: xp, y1: ch.y0, y2: ch.y1, style: "stroke:var(--risk);stroke-width:2;stroke-dasharray:5 5" }, ch.svg); S("text", { x: xp + 8, y: ch.y0 + 16, class: "ax", style: "fill:var(--risk);font-size:14px", text: `break-even ≈ year ${pe.toFixed(1)}` }, ch.svg);
    const c = H("div", { class: "vbody center" }); c.style.minHeight = "300px"; c.appendChild(ch.svg); b.append(k, c);
    return { step(i, o) { tiles.forEach((t, j) => t.classList.toggle("hot", !!o && o.k && o.k.includes(j))); } }; },
  sens() { const { v, b } = frame("Equity IRR by scenario"); b.classList.add("center"); const sc = SENS.filter(r => r[3] != null);
    const rows = sc.map(r => ({ n: r[0].replace(/\s*\(.*\)/, "").replace("Combined downside: tariff −10%, capex +10%, generation −5%", "Combined downside"), v: [Math.max(0, r[2])], c: [r[2] >= .14 ? "--carbon" : r[2] >= .1 ? "--solar" : "--risk"] }));
    const ch = hbars(rows, { c: ["--olive"], x0: 300, rh: 28, max: .2, ref: .14, refLabel: "14% investor hurdle", fmt: r => pct(r.v[0]) }); b.appendChild(ch.svg);
    v.appendChild(H("div", { class: "vnote" }, "Loan serviceable down to ₹3.74/kWh · lender comfort (1.20×) down to ₹4.38/kWh")); return { step(i, o) { ch.hl(o && o.i ? o.i : null); } }; },
  revenue() { const { b } = frame("Revenue by stream (₹ Cr) · Y0 = construction year"); b.classList.add("center");
    const ch = stackedCols([{ n: "AI-EMS service", c: "--olive", v: M.rv_ems }, { n: "FDRE contract", c: "--solar", v: M.rv_ppa }, { n: "Industry", c: "--wind", v: M.rv_ci }, { n: "Battery services", c: "--bess", v: M.rv_anc }, { n: "Carbon", c: "--carbon", v: M.rv_co2 }], YRS, { unit: "₹ Cr" });
    b.appendChild(ch.svg); return { step(i, o) { ch.hl(o && o.i ? o.i : null); } }; },
  streams() { const { b } = frame("Revenue streams in Year 3");
    const c = cards([["FDRE power contract", `₹${inr(M.rv_ppa[3])} Cr/yr`, "SECI/NHPC → MPPMCL · 25 years fixed", "--solar"], ["Industry open access", `₹${inr(M.rv_ci[3])} Cr/yr`, "Indore · Pithampur · Dewas factories", "--wind"],
      ["AI-EMS service", `₹${inr(M.rv_ems[3], 1)} Cr/yr`, "NHDC · from month 3", "--olive"], ["Battery grid services", `₹${inr(M.rv_anc[3])} Cr/yr`, "Grid-India reserve markets", "--bess"], ["Carbon credits", `₹${inr(M.rv_co2[3], 1)} Cr/yr`, "CCTS · first 10 years", "--carbon"]], 3,
      ([h, v, p, col]) => `<h3><span class="dot" style="background:var(${col})"></span>${h}</h3><div style="font:300 34px var(--display);margin:4px 0">${v}</div><p>${p}</p>`);
    b.appendChild(c.el); return { step(i, o) { c.hl(o && o.i ? o.i : null); } }; },
  moat() { const { b } = frame("Make or buy firmness (₹ Cr, present value)");
    const wrap = H("div", { class: "grid" }); wrap.style.gridTemplateColumns = "1fr";
    const items = [["Competitor: buy 1,200 MWh of batteries", 1200, "--risk"], ["Us: rent the reservoir (firming fee, 25 years)", 203, "--hydro"], ["Our cost advantage", 997, "--carbon"]].map(([n, v, c]) => {
      const d = H("div", { class: "card" }, `<h3>${n}</h3><div style="display:flex;align-items:center;gap:14px"><div style="flex:1;height:26px;background:var(--line);border-radius:13px;overflow:hidden"><i style="display:block;height:100%;width:0;background:var(${c});border-radius:13px;transition:width 1s cubic-bezier(.2,.8,.2,1)"></i></div><b style="font:300 34px var(--display)">₹${inr(v)} Cr</b></div>`);
      requestAnimationFrame(() => requestAnimationFrame(() => d.querySelector("i").style.width = (v / 1200 * 100) + "%")); wrap.appendChild(d); return d; });
    b.appendChild(wrap); return { step(i, o) { items.forEach((d, k) => { d.classList.toggle("hot", !!o && o.i && o.i.includes(k)); d.classList.toggle("dim", !!o && o.i && !o.i.includes(k)); }); } }; },
  table(s) { const { b } = frame(null); const t = table(s.v.cols, s.v.rows); b.appendChild(t.el); return { step(i, o) { t.hl(o && o.i ? o.i : null); } }; },
  phases() { const { b } = frame("Five phases");
    const c = cards([["Phase 0", "Months −12 to 0", "Prepare", "Unlocks the loan"], ["Phase 1", "Months 0–3", "AI-EMS on hydro", "Revenue from month 3"], ["Phase 2", "Months 2–22", "Floating solar", "Each block earns on connection"],
      ["Phase 3", "Months 8–18", "Battery", "Peak firming + grid services"], ["Phase 4", "Months 14–30", "Wind (if gate passed)", "Then refinance in Y5"]], 1,
      ([p, m, h, r]) => `<div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap"><span class="no">${p} · ${m}</span><h3 style="margin:0">${h}</h3><span class="tag" style="margin:0 0 0 auto">${r}</span></div>`);
    c.el.style.gridTemplateColumns = "1fr"; b.appendChild(c.el); return { step(i, o) { c.hl(o && o.i ? o.i : null); } }; },
  gantt() { const { b } = frame("Implementation & revenue timeline"); b.classList.add("center");
    const rows = [["MoU + JV with NHDC", -12, -9, "olive"], ["Surveys", -11, -6, "grid"], ["Wind measurement (12 mo)", -10, 2, "wind"], ["DPR, contract, loan", -8, 0, "carbon"], ["AI-EMS on hydro", 0, 3, "olive", 3], ["Pooling substation", 0, 12, "grid"],
      ["FPV blocks 1–2 (100 MW)", 2, 9, "solar", 9], ["FPV blocks 3–6", 10, 22, "solar", 22], ["Battery", 8, 18, "bess", 18], ["Wind gate", 2, 2, "wind", 2], ["Wind construction", 14, 30, "wind", 30], ["Full operation", 30, 30, "risk", 30]];
    const W = 900, rh = 32, Hh = 48 + rows.length * rh, x0 = 260, x1 = W - 24, m0 = -12, m1 = 36, X = m => x0 + (x1 - x0) * (m - m0) / (m1 - m0), svg = S("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "Gantt" });
    for (let m = m0; m <= m1; m += 6) { S("line", { x1: X(m), x2: X(m), y1: 30, y2: Hh - 6, class: "axl", style: m === 0 ? "stroke:var(--muted-c)" : "stroke-dasharray:2 6" }, svg); S("text", { x: X(m), y: 20, "text-anchor": "middle", class: "ax", text: (m > 0 ? "+" : "") + m + " mo" }, svg); }
    const gs = rows.map((r, i) => { const y = 36 + i * rh, g = S("g", {}, svg); S("text", { x: x0 - 12, y: y + 18, "text-anchor": "end", class: "ttl", text: r[0] }, g);
      if (r[2] > r[1]) S("rect", { x: X(r[1]), y: y + 5, width: X(r[2]) - X(r[1]), height: rh - 12, rx: (rh - 12) / 2, style: `fill:var(--${r[3]})` }, g);
      if (r[4] != null) { const cx = X(r[4]), cy = y + rh / 2 - 1; S("path", { d: `M${cx},${cy - 9}l9,9l-9,9l-9,-9z`, style: "fill:var(--lime);stroke:var(--ink);stroke-width:1.4" }, g); } return g; });
    b.appendChild(svg); return { step(i, o) { gs.forEach((g, k) => g.style.opacity = (o && o.i && !o.i.includes(k)) ? .25 : 1); } }; },
  close() { const { b } = frame("Narmada Hybrid"); b.style.overflow = "hidden"; plant.setMode("night"); plant.mount(b, { orbit: true, hideHint: true });
    const asks = H("div", { class: "asks" }); const items = [["NHDC", "JV MoU + firming deal"], ["Water surface", "Reservoir-use NOC"], ["Buyer", "FDRE contract"], ["Finance", "IREDA loan + carbon registration"]].map(([h, p]) => { const d = H("div", {}, `<b>${h}</b>${p}`); asks.appendChild(d); return d; });
    b.appendChild(asks); return { step(i, o) { items.forEach((d, k) => d.classList.toggle("hot", !!o && o.i === k)); plant.setOrbit(true); } }; },
};

// ============================================================ navigation
let cur = 0, step = 0, vis = null;
const $ = id => document.getElementById(id);
function render() {
  const s = DECK[cur], cat = CATS.find(c => c.id === s.cat); plant.unmount();
  $("cats").querySelectorAll(".cat").forEach(b => b.setAttribute("aria-current", String(b.dataset.cat === s.cat)));
  const subs = $("subs"); subs.innerHTML = ""; DECK.forEach((d, i) => { if (d.cat !== s.cat) return; const n = DECK.filter((x, j) => x.cat === s.cat && j <= i).length; const b = H("button", { class: "sub", type: "button", "aria-current": String(i === cur) }, `<b>${cat.n}.${n}</b>${d.sub}`); b.onclick = () => go(i); subs.appendChild(b); });
  const cb = subs.querySelector('[aria-current="true"]'); if (cb) cb.scrollIntoView({ block: "nearest", inline: "nearest" });
  $("judged").textContent = "Judged on: " + cat.judged;
  const st = $("story"); st.innerHTML = ""; const n = DECK.filter((x, j) => x.cat === s.cat && j <= cur).length;
  st.appendChild(H("div", { class: "kicker" }, `<span class="num">${cat.n}.${n}</span>${cat.label}`)); st.appendChild(H("h1", {}, s.title)); if (s.lede) st.appendChild(H("p", { class: "lede" }, s.lede));
  st.appendChild(H("ol", { class: "lines", id: "lines" })); st.appendChild(H("div", { class: "more", id: "more" }));
  vis = BUILD[s.v.type](s); $("notesText").textContent = s.notes || "";
  try { history.replaceState(null, "", "#" + s.cat + "-" + n); } catch (e) {}
  update(true);
}
function update(fresh) {
  const s = DECK[cur], ol = $("lines");
  [...ol.children].forEach((li, i) => { if (i > step) li.remove(); });
  for (let i = ol.children.length; i <= step; i++) { const li = H("li", {}, `<span class="m">${String(i + 1).padStart(2, "0")}</span><span>${s.lines[i][0]}</span>`); li.onclick = () => { step = i; update(); }; ol.appendChild(li); }
  [...ol.children].forEach((li, i) => li.className = i < step ? "past" : "now");
  const left = s.lines.length - step - 1; $("more").innerHTML = left > 0 ? `${"<i></i>".repeat(left)} ${left} more ${left > 1 ? "lines" : "line"} · press Enter` : (cur < DECK.length - 1 ? `Enter → next: <b>&nbsp;${DECK[cur + 1].sub}</b>` : "End of presentation");
  ol.lastElementChild && ol.lastElementChild.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
  if (vis) vis.step(step, s.lines[step][1] || null);
  const d = $("dashes"); d.innerHTML = ""; DECK.forEach((x, i) => { if (x.cat !== s.cat) return; const e = H("i", { class: i < cur ? "done" : i === cur ? "on" : "" }); e.title = x.sub; e.onclick = () => go(i); d.appendChild(e); });
  $("next").textContent = step < s.lines.length - 1 ? "Next line ↵" : (cur < DECK.length - 1 ? "Next section ↵" : "Done");
}
function go(i, st = 0) { cur = Math.max(0, Math.min(DECK.length - 1, i)); step = st === "last" ? DECK[cur].lines.length - 1 : st; render(); }
function next() { if (step < DECK[cur].lines.length - 1) { step++; update(); } else if (cur < DECK.length - 1) go(cur + 1); }
function prev() { if (step > 0) { step--; update(); } else if (cur > 0) go(cur - 1, "last"); }
CATS.forEach(c => { const b = H("button", { class: "cat", type: "button", "data-cat": c.id, title: c.judged }, `<span class="n">${c.n}</span>${c.label}`); b.onclick = () => go(DECK.findIndex(d => d.cat === c.id)); $("cats").appendChild(b); });
$("next").onclick = next; $("back").onclick = prev;
$("notesBtn").onclick = () => { const n = $("notes"); n.hidden = !n.hidden; $("notesBtn").setAttribute("aria-pressed", String(!n.hidden)); };
document.addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("input,textarea,select")) return;
  if (["Enter", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
  else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); go(cur + 1); } else if (e.key === "ArrowUp") { e.preventDefault(); go(cur - 1); }
  else if (/^[1-8]$/.test(e.key)) go(DECK.findIndex(d => d.cat === CATS[+e.key - 1].id));
  else if (e.key === "n" || e.key === "N") $("notesBtn").click();
  else if (e.key === "f" || e.key === "F") { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); }
});
const m = /^#(\w+)-(\d+)$/.exec(location.hash); let start = 0;
if (m) { const idx = DECK.map((d, i) => [d, i]).filter(([d]) => d.cat === m[1]); if (idx[+m[2] - 1]) start = idx[+m[2] - 1][1]; }
go(start);
