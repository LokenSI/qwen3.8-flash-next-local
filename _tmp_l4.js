// Controlled experiment: single test particle near L4 in the circular restricted
// three-body problem. Velocity Verlet, same convention as the app.
const G = 1, M = 1, m = 0.01, a = 1;
const mu = m / (M + m);
const om = Math.sqrt((M + m) / (a * a * a));
const P0 = { x: -mu * a, y: 0 }, S0 = { x: (1 - mu) * a, y: 0 };
const Lx = (0.5 - mu) * a, Ly = Math.sqrt(3) / 2 * a;
const rL = Math.hypot(Lx, Ly), ang4 = Math.atan2(Ly, Lx);

function accel(pos) {
  let ax = 0, ay = 0;
  const bodies = [
    { p: P0, m: M },
    { p: S0, m: m }
  ];
  for (const b of bodies) {
    const dx = b.p.x - pos.x, dy = b.p.y - pos.y;
    const r2 = dx * dx + dy * dy + 0.02 * 0.02;
    const r = Math.sqrt(r2), inv = G * b.m / (r2 * r);
    ax += inv * dx; ay += inv * dy;
  }
  return { ax, ay };
}

function run(label, p0, v0, T, dt) {
  let p = { x: p0[0], y: p0[1] }, v = { x: v0[0], y: v0[1] };
  let a1 = accel(p);
  const n = Math.round(T / dt), h = dt / 2;
  let maxDev = 0, minR = 1e9;
  const prim = { x: P0.x, y: P0.y }, sec = { x: S0.x, y: S0.y };
  void prim; void sec;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    // primaries on exact circular orbits
    const c = Math.cos(om * t), s = Math.sin(om * t);
    P0.x = -mu * a * c; P0.y = -mu * a * s;
    S0.x = (1 - mu) * a * c; S0.y = (1 - mu) * a * s;
    v.x += a1.ax * h; v.y += a1.ay * h;
    p.x += v.x * dt; p.y += v.y * dt;
    a1 = accel(p);
    v.x += a1.ax * h; v.y += a1.ay * h;
    const dx = (S0.x - P0.x) * 0.5 - (S0.y - P0.y) * Math.sqrt(3) / 2;
    const dy = (S0.x - P0.x) * Math.sqrt(3) / 2 + (S0.y - P0.y) * 0.5;
    const dev = Math.hypot(p.x - (P0.x + dx), p.y - (P0.y + dy));
    if (dev > maxDev) maxDev = dev;
    minR = Math.min(minR, Math.hypot(p.x, p.y));
  }
  console.log(label.padEnd(38) + ' maxDevFromL4=' + maxDev.toFixed(4) + '  minR=' + minR.toFixed(4));
}

const T = 40, dt = 2e-4;
function rot(ang) { return { c: Math.cos(ang), s: Math.sin(ang) }; }
function offsetPoint(dAng, dRad) {
  const th = ang4 + dAng, r = rL * (1 + dRad);
  return [r * Math.cos(th), r * Math.sin(th)];
}
function corot(vx, vy) { return [vx, vy]; }

run('exact L4', [Lx, Ly], corot(-om * Ly, om * Lx), T, dt);
for (const d of [0.002, 0.005, 0.01, 0.02, 0.045, 0.08]) {
  const p = offsetPoint(d, 0);
  run('L4 +' + d + ' rad (corotating v)', p, corot(-om * p[1], om * p[0]), T, dt);
}
for (const d of [0.002, 0.01, 0.045]) {
  const p = offsetPoint(0, d);
  run('L4 +' + d + ' radial (corotating v)', p, corot(-om * p[1], om * p[0]), T, dt);
}
{ // exact L4 position, small rotating-frame velocity kick
  const k = 0.01 * om * a;
  run('L4 + velocity kick 0.01', [Lx, Ly], corot(-om * Ly + k, om * Lx), T, dt);
}
