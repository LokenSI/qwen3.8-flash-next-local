// Brute-force verify candidate figure-eight ICs: integrate a full period, measure return distance.
const G = 1, MM = [1, 1, 1], eps2 = 0;

function accel(q) {
  const n = q.length;
  const a = q.map(() => [0, 0]);
  let U = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const dx = q[j][0] - q[i][0], dy = q[j][1] - q[i][1];
    const r2 = dx * dx + dy * dy + eps2; if (r2 < 1e-16) continue;
    const r = Math.sqrt(r2), inv = G / (r2 * r);
    a[i][0] += inv * MM[j] * dx; a[i][1] += inv * MM[j] * dy;
    a[j][0] -= inv * MM[i] * dx; a[j][1] -= inv * MM[i] * dy;
    U -= G * MM[i] * MM[j] / r;
  }
  return { a, U };
}

function integrate(q0, v0, T, dt) {
  let q = q0.map(p => p.slice()), v = v0.map(p => p.slice());
  let A = accel(q);
  const n = Math.max(1, Math.round(T / dt));
  const h = dt / 2;
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < q.length; i++) { v[i][0] += h * A.a[i][0]; v[i][1] += h * A.a[i][1]; q[i][0] += dt * v[i][0]; q[i][1] += dt * v[i][1]; }
    A = accel(q);
    for (let i = 0; i < q.length; i++) { v[i][0] += h * A.a[i][0]; v[i][1] += h * A.a[i][1]; }
  }
  return { q, v, U: A.U };
}

function stats(label, q0, v0, T, dt, periods) {
  const total = T * (periods || 1);
  const st = integrate(q0, v0, total, dt);
  let d = 0; for (let i = 0; i < q0.length; i++) d += (st.q[i][0] - q0[i][0]) ** 2 + (st.q[i][1] - q0[i][1]) ** 2;
  let K = 0, p = [0, 0];
  for (let i = 0; i < q0.length; i++) { K += 0.5 * MM[i] * (st.v[i][0] ** 2 + st.v[i][1] ** 2); p[0] += MM[i] * st.v[i][0]; p[1] += MM[i] * st.v[i][1]; }
  // per-body curve self-intersection: max excursion + axis crossings of body 1
  let minSep = Infinity, rmax = 0, cross = 0, prevSign = null, L = 0;
  const N = 360;
  let prevQ = null;
  for (let s = 0; s <= N; s++) {
    const sub = integrate(q0, v0, total * s / N, Math.min(dt, 2e-5)).q;
    for (let i = 0; i < 3; i++) {
      rmax = Math.max(rmax, Math.hypot(sub[i][0], sub[i][1]));
      for (let j = i + 1; j < 3; j++) { const dd = Math.hypot(sub[j][0] - sub[i][0], sub[j][1] - sub[i][1]); if (dd < minSep) minSep = dd; }
    }
    const sign = sub[0][1] >= 0 ? 1 : -1;
    if (prevSign !== null && sign !== prevSign) cross++;
    prevSign = sign;
    if (prevQ) { for (let i = 0; i < 3; i++) L += Math.hypot(sub[i][0] - prevQ[i][0], sub[i][1] - prevQ[i][1]); }
    prevQ = sub;
  }
  console.log(label.padEnd(28), 'ret=' + Math.sqrt(d).toExponential(2),
    'E=' + (K + st.U).toFixed(5), '|p|=' + Math.hypot(p[0], p[1]).toExponential(1),
    'minSep=' + minSep.toFixed(4), 'rmax=' + rmax.toFixed(4), 'b1 ycross=' + cross);
}

const XC = 0.97004355, YC = 0.24287268;
const V3 = [-0.93240737, -0.86473146];
const V12 = [-V3[0] / 2, -V3[1] / 2];
const T = 6.325913902600669;

const cands = {
  A_pos: [[[XC, -YC], [-XC, YC], [0, 0]], [V12, V12, V3]],
  B_posneg: [[[XC, -YC], [-XC, YC], [0, 0]], [[-V12[0], -V12[1]], [-V12[0], -V12[1]], [-V3[0], -V3[1]]]],
  C_swapb13: [[[0, 0], [-XC, YC], [XC, -YC]], [V3, V12, V12]],
  D_altT: [[[XC, -YC], [-XC, YC], [0, 0]], [V12, V12, V3]],
  E_xpos_ypos: [[[XC, YC], [-XC, -YC], [0, 0]], [V12, V12, V3]],
};
for (const key of Object.keys(cands)) {
  const [q0, v0] = cands[key];
  const periods = key === 'D_altT' ? 1 : 1;
  stats(key + ' T', q0, v0, T, 1e-5, periods);
}
// longer-horizon behaviour of best candidate (energy conservation + boundedness)
stats('A x 10 periods', cands.A_pos[0], cands.A_pos[1], T, 2e-5, 10);
stats('E x 10 periods', cands.E_xpos_ypos[0], cands.E_xpos_ypos[1], T, 2e-5, 10);
