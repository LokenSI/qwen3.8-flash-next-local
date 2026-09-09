// Numerically derive exact Chenciner-Montgomery figure-eight initial conditions.
// Symmetric ansatz (G=1, m=1):
//   q1=(x,-x/4-δ?) -> use q1=(x, y), q2=(-x,-y), q3=(0,0)
//   v1=v2=(u,w), v3=(-2u,-2w)   (zero total momentum)
// Periodicity conditions reduced by symmetry to:
//   F1 = q1(T).x , F2 = q1(T).y   (body 1 crosses x-axis at T/2 -> require y(T)=0)
//   F3 = q3(T).x                  (body 3 at origin at half period)
// We solve for (x, u, w) with y fixed by the classic ratio, then verify full return.
const eps2 = 0;

function accelAll(q) {
  const a = [[0, 0], [0, 0], [0, 0]];
  const m = [1, 1, 1];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const dx = q[j][0] - q[i][0], dy = q[j][1] - q[i][1];
    const r2 = dx * dx + dy * dy + eps2; if (r2 < 1e-14) continue;
    const r = Math.sqrt(r2), inv = 1 / (r2 * r);
    a[i][0] += inv * dx; a[i][1] += inv * dy;
    a[j][0] -= inv * dx; a[j][1] -= inv * dy;
  }
  return a;
}

// integrate half period T/2; returns final state
function integrate(p0, v0, T, dt) {
  let q = p0.map(p => p.slice()), v = v0.map(p => p.slice());
  let a = accelAll(q);
  const n = Math.round(T / dt);
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * a[i][0]; v[i][1] += 0.5 * dt * a[i][1]; q[i][0] += dt * v[i][0]; q[i][1] += dt * v[i][1]; }
    a = accelAll(q);
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * a[i][0]; v[i][1] += 0.5 * dt * a[i][1]; }
  }
  return { q, v };
}

function residuals(p, T, dt) {
  const x = p[0], u = p[1], w = p[2];
  const y = -0.25 * x; // classic ratio ~ -0.2428/0.9700
  const q = [[x, y], [-x, -y], [0, 0]];
  const v = [[u, w], [u, w], [-2 * u, -2 * w]];
  const half = integrate(q, v, T / 2, dt);
  // at T/2 expect: body3 back to origin, body1 on x-axis (y=0)
  return [half.q[0][1], half.q[2][0], half.q[1][0] * 0 + half.q[2][1]];
}

// Newton solve on (x,u,w) for fixed T
function solveForT(T, p0) {
  const dt = 1e-4;
  let p = p0.slice();
  for (let iter = 0; iter < 60; iter++) {
    const f = residuals(p, T, dt);
    const err = Math.max(...f.map(Math.abs));
    if (err < 1e-13) break;
    const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const h = 1e-6;
    for (let k = 0; k < 3; k++) {
      const pp = p.slice(); pp[k] += h;
      const f2 = residuals(pp, T, dt);
      for (let r = 0; r < 3; r++) J[r][k] = (f2[r] - f[r]) / h;
    }
    // solve J d = -f
    const d = solve3(J, [-f[0], -f[1], -f[2]]);
    if (!d) break;
    p[0] += d[0]; p[1] += d[1]; p[2] += d[2];
  }
  return p;
}

function solve3(J, b) {
  const A = J.map((r, i) => [r[0], r[1], r[2], b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-14) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 3; r++) {
      const f = A[r][c] / A[c][c]; if (r === c) continue;
      for (let k = c; k < 4; k++) A[r][k] -= f * A[c][k];
    }
  }
  return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
}

// Scan candidate periods: for the classic orbit the half-period is ~3.1629 (T=6.3259)
for (const T of [6.3259139, 6.2, 6.4, 6.33, 6.28]) {
  const p = solveForT(T, [0.9700043649, 0.34786488, 0.45582404]);
  const [x, u, w] = p;
  const y = -0.25 * x;
  const q = [[x, y], [-x, -y], [0, 0]];
  const v = [[u, w], [u, w], [-2 * u, -2 * w]];
  const full = integrate(q, v, T, 2e-5);
  let d = 0; for (let i = 0; i < 3; i++) d += (full.q[i][0] - q[i][0]) ** 2 + (full.q[i][1] - q[i][1]) ** 2;
  console.log('T=' + T.toFixed(7), 'x=' + x.toFixed(12), 'y=' + y.toFixed(12), 'u=' + u.toFixed(12), 'w=' + w.toFixed(12), 'v3=(' + (-2 * u).toFixed(12) + ',' + (-2 * w).toFixed(12) + ')', 'return=' + Math.sqrt(d).toExponential(3));
}
