// Эволюция фигуры (spec 1.1): таблица параметров по 9 тирам, поза, скелет, контур, созвездие.
// Всё в координатах Silhouette: x от −0.5 до 0.5, y от 0 до 1 по высоте фигуры.
export const TIER_MIN = [0, 3, 8, 15, 25, 40, 55, 75, 100];
export const MAX_LINES = 80;

// Колонки spec 1.1.3: skeleton/contour — непрозрачность линий, gradient 0..1, posture 0..1,
// breath — амплитуда масштаба, idle — перенос веса, orbit — частиц, const* — узлы и непрозрачность линий.
const T = {
  skeleton: [0, 0, 0.25, 0.3, 0.2, 0.15, 0.1, 0.1, 0],
  contour: [0, 0, 0, 0, 0.35, 0.45, 0.5, 0.55, 0.6],
  gradient: [0, 0, 0, 0, 0.6, 1, 1, 1, 1],
  posture: [0, 0.1, 0.3, 0.45, 0.55, 0.7, 0.78, 0.88, 1],
  breath: [0, 0, 0.008, 0.01, 0.012, 0.012, 0.014, 0.014, 0.016],
  idle: [0, 0, 0, 0, 1, 1, 1, 1, 1],
  hatch: [0, 0, 0, 0, 0, 0.3, 0.35, 0.4, 0.4],
  spark: [0, 0, 1, 1, 1, 1, 1, 1, 1], // «искорка» в центре груди
  core: [0, 0, 0, 0, 0, 0, 0, 0.5, 1], // белая сердцевина
  orbit: [0, 0, 0, 0, 0, 3, 4, 5, 6],
  constN: [0, 0, 0, 0, 0, 0, 0, 8, 14],
  constOp: [0, 0, 0, 0, 0, 0, 0, 0.2, 0.45],
};
const NUM = ['skeleton', 'contour', 'gradient', 'posture', 'breath', 'hatch', 'core', 'constOp'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Параметры тира; level (0…100) плавно ведёт числовые параметры к следующему тиру.
export function evoParams(tier, level) {
  const k = clamp(Math.round(+tier || 0), 0, 8);
  const out = {};
  Object.keys(T).forEach((n) => { out[n] = T[n][k]; });
  if (level != null && Number.isFinite(+level) && k < 8) {
    const f = clamp((+level - TIER_MIN[k]) / (TIER_MIN[k + 1] - TIER_MIN[k]), 0, 1);
    NUM.forEach((n) => { out[n] = T[n][k] + (T[n][k + 1] - T[n][k]) * f; });
  }
  return out;
}

const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
};

// Поза: p=0 — как раньше; с ростом p руки отводятся (до 14°), голова приподнимается.
export function posture(x, y, p) {
  if (!p) return [x, y];
  if (y < 0.17) return [x, y - p * 0.012];
  const s = x < 0 ? -1 : 1, ax = Math.abs(x);
  if (ax > 0.1 && y > 0.19 && y < 0.58 && segDist(ax, y, 0.15, 0.22, 0.25, 0.53) < 0.05) {
    const th = (p * 14 * Math.PI) / 180, dx = ax - 0.15, dy = y - 0.22;
    return [s * (0.15 + dx * Math.cos(th) + dy * Math.sin(th)), 0.22 + dy * Math.cos(th) - dx * Math.sin(th)];
  }
  return [x, y];
}

// Скелет: позвоночник, руки, ноги, плечи.
const SKEL = [[0, 0.17, 0, 0.55], [0.15, 0.22, 0.25, 0.53], [-0.15, 0.22, -0.25, 0.53], [0.065, 0.55, 0.095, 0.98], [-0.065, 0.55, -0.095, 0.98], [-0.15, 0.22, 0.15, 0.22]];
export const skeletonLines = (p, lite) => SKEL.slice(0, lite ? 4 : SKEL.length).map(([a, b, c, d]) => [posture(a, b, p), posture(c, d, p)]);

// Контур одним Path (голова + тело с руками и ногами), в долях высоты.
const HALF = [[0.03, 0.165], [0.17, 0.2], [0.27, 0.4], [0.285, 0.54], [0.225, 0.54], [0.14, 0.4], [0.095, 0.55], [0.14, 0.98], [0.05, 0.98], [0, 0.6]];
export function contourPoints(p) {
  const body = HALF.map(([x, y]) => [x, y]).concat(HALF.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
  const head = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; head.push([Math.sin(a) * 0.075, 0.09 - Math.cos(a) * 0.075 / 0.92]); }
  return [head.map(([x, y]) => posture(x, y, p)), body.map(([x, y]) => posture(x, y, p))];
}

// Штриховка на груди и бёдрах: короткие дуги (x1,y1,cx,cy,x2,y2).
export const HATCH = [[-0.07, 0.3, 0, 0.34, 0.07, 0.3], [-0.06, 0.37, 0, 0.4, 0.06, 0.37], [-0.07, 0.5, 0, 0.53, 0.07, 0.5]];

// Созвездие: узлы (первые 8 — частичное) и линии между ними.
export const NODES = [[0, 0.07], [0, 0.17], [-0.15, 0.22], [0.15, 0.22], [0, 0.3], [0, 0.52], [-0.08, 0.76], [0.08, 0.76], [-0.2, 0.38], [0.2, 0.38], [-0.25, 0.52], [0.25, 0.52], [-0.095, 0.97], [0.095, 0.97]];
const EDGES = [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5], [2, 4], [3, 4], [5, 6], [5, 7], [2, 8], [3, 9], [8, 10], [9, 11], [6, 12], [7, 13]];
export function constellation(n, p, lite) {
  const cnt = lite ? Math.ceil(n / 2) : n;
  const nodes = NODES.slice(0, cnt).map(([x, y]) => posture(x, y, p));
  const lines = EDGES.filter(([a, b]) => a < cnt && b < cnt).map(([a, b]) => [nodes[a], nodes[b]]);
  return { nodes, lines };
}
