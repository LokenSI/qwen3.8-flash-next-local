// Verify candidate figure-eight ICs by integrating a full period and measuring return distance.
const G = 1, m = [1, 1, 1], eps2 = 0;

function accel(q) {
  const a = [[0, 0], [0, 0], [0, 0]];
  let U = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const dx = q[j][0] - q[i][0], dy = q[j][1] - q[i][1];
    const r2 = dx * dx + dy * dy + eps2; if (r2 < 1e-16) continue;
    const r = Math.sqrt(r2), inv = G / (r2 * r);
    a[i][0] += inv * m[j] * dx; a[i][1] += inv * m[j] * dy;
    a[j][0] -= inv * m[i] * dx; a[j][1] -= inv * m[i] * dy;
    U -= G * m[i] * m[j] / r;
  }
  return { a, U };
}

function run(label, q0, v0, T) {
  const dt = 1e-5, n = Math.round(T / dt);
  let q = q0.map(p => p.slice()), v = v0.map(p => p.slice());
  let A = accel(q), E0 = null, minSep = Infinity;
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * A.a[i][0]; v[i][1] += 0.5 * dt * A.a[i][1]; q[i][0] += dt * v[i][0]; q[i][1] += dt * v[i][1]; }
    A = accel(q);
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * A.a[i][0]; v[i][1] += 0.5 * dt * A.a[i][1]; }
    let K = 0; for (let i = 0; i < 3; i++) K += 0.5 * m[i] * (v[i][0] ** 2 + v[i][1] ** 2);
    if (E0 === null) E0 = K + A.U;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const d = Math.hypot(q[j][0] - q[i][0], q[j][1] - q[i][1]); if (d < minSep) minSep = d;
    }
  }
  let d = 0; for (let i = 0; i < 3; i++) d += (q[i][0] - q0[i][0]) ** 2 + (q[i][1] - q0[i][1]) ** 2;
  let p = [0, 0]; for (let i = 0; i < 3; i++) { p[0] += m[i] * v[i][0]; p[1] += m[i] * v[i][1]; }
  console.log(label.padEnd(30), 'ret=' + Math.sqrt(d).toExponential(2), 'minSep=' + minSep.toFixed(4),
    'E=' + E0.toFixed(6), 'p=(' + p[0].toExponential(1) + ',' + p[1].toExponential(1) + ')');
}

const XC = 0.97004355, YC = -0.24287268;
const V3X = -0.93240737, V3Y = -0.86473146;
const T = 6.325913902600669;
const q = [[XC, YC], [-XC, -YC], [0, 0]];

run('v1=-v3/2', q, [[-V3X / 2, -V3Y / 2], [-V3X / 2, -V3Y / 2], [V3X, V3Y]], T);
run('v1=(0.34786488,0.45582486)', q, [[0.34786488, 0.45582486], [0.34786488, 0.45582486], [V3X, V3Y]], T);
run('v1=-v3/2 (half T only)', q, [[-V3X / 2, -V3Y / 2], [-V3X / 2, -V3Y / 2], [V3X, V3Y]], T / 2);

// Refine (x, y, u, w) so the orbit closes after T/2 using half-period symmetry:
// at t=T/2 body1 must land where body3 started moving symmetrically: q1(T/2)=q2(0)? etc.
function closeErr(p, T, dt) {
  const [x, y, u, w] = p;
  const q0 = [[x, y], [-x, -y], [0, 0]];
  const v0 = [[u, w], [u, w], [-2 * u, -2 * w]];
  let qh = q0.map(r => r.slice()), vh = v0.map(r => r.slice());
  let A = accel(qh);
  const n = Math.round(T / 2 / dt);
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < 3; i++) { vh[i][0] += 0.5 * dt * A.a[i][0]; vh[i][1] += 0.5 * dt * A.a[i][1]; qh[i][0] += dt * vh[i][0]; qh[i][1] += dt * vh[i][1]; }
    A = accel(qh);
    for (let i = 0; i < 3; i++) { vh[i][0] += 0.5 * dt * A.a[i][0]; vh[i][1] += 0.5 * dt * A.a[i][1]; }
  }
  // expected body exchange at half period: q1(T/2) = -q1(0) ... body chases around the curve
  const out = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) out.push(qh[i][k] - q0[(i + 1) % 3][k]);
  return out;
}
