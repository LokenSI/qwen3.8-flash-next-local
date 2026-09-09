// Verify candidate figure-eight ICs by integrating a full period and measuring return distance.
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

function report(label, q0, v0, T, dt, periods) {
  const total = T * (periods || 1);
  const st = integrate(q0, v0, total, dt);
  let d = 0; for (let i = 0; i < q0.length; i++) d += (st.q[i][0] - q0[i][0]) ** 2 + (st.q[i][1] - q0[i][1]) ** 2;
  let K = 0, p = [0, 0];
  for (let i = 0; i < q0.length; i++) { K += 0.5 * MM[i] * (st.v[i][0] ** 2 + st.v[i][1] ** 2); p[0] += MM[i] * st.v[i][0]; p[1] += MM[i] * st.v[i][1]; }
  console.log(label.padEnd(34), 'ret=' + Math.sqrt(d).toExponential(2), 'E=' + (K + st.U).toExponential(4),
    '|p|=' + Math.hypot(p[0], p[1]).toExponential(1));
}

// ---- Variant P1: mirror axis = x-axis; bodies 1&2 mirrored; body 3 on axis moving in y
//      unknowns: x1, y1, u3y   (v1 = (0,u1y), v2 = (0,-u1y), v3 = -2*(u1y) along y)
function P1resid(p, TH, dt) {
  const [x1, y1, u3y] = p;
  const u1y = -u3y / 2;
  const q0 = [[x1, y1], [x1, -y1], [0, 0]];
  const v0 = [[0, u1y], [0, -u1y], [0, u3y]];
  const st = integrate(q0, v0, TH, dt);
  return [st.q[0][1], st.v[0][0], st.v[2][0]];
}

// ---- Variant P2: same symmetry, but at t=TH bodies swap across the axis: q1(TH) = q2(0), v1(TH) = -v2(0)
function P2resid(p, TH, dt) {
  const [x1, y1, u3y] = p;
  const u1y = -u3y / 2;
  const q0 = [[x1, y1], [x1, -y1], [0, 0]];
  const v0 = [[0, u1y], [0, -u1y], [0, u3y]];
  const st = integrate(q0, v0, TH, dt);
  return [st.q[0][0] - q0[1][0], st.q[0][1] - q0[1][1], st.q[2][0] - q0[2][0]];
}

function solve3(res, p0, TH, dt) {
  let p = p0.slice();
  for (let iter = 0; iter < 40; iter++) {
    const f = res(p, TH, dt);
    const err = Math.max(...f.map(Math.abs));
    if (err < 1e-14) return { p, err };
    const J = [[], [], []];
    for (let k = 0; k < 3; k++) {
      const pp = p.slice(); pp[k] += 1e-6;
      const f2 = res(pp, TH, dt);
      for (let r = 0; r < f.length; r++) J[r][k] = (f2[r] - f[r]) / 1e-6;
    }
    const d = solve3lin(J, f.map(x => -x));
    if (!d) return { p, err };
    p[0] += d[0]; p[1] += d[1]; p[2] += d[2];
  }
  return { p, err: Math.max(...res(p, TH, dt).map(Math.abs)) };
}

function solve3lin(A, b) {
  const M = A.map((r, i) => [r[0], r[1], r[2], b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-15) return null;
    const t = M[c]; M[c] = M[piv]; M[piv] = t;
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

const dtFine = 3e-6;
for (const TH of [3.1629569513003345]) {
  for (const [name, res] of [['P1 axis-crossing', P1resid], ['P2 body-swap', P2resid]]) {
    const r = solve3(res, [0.97000436487, 0.24287268482, -0.93240737], TH, 1e-4);
    const [x1, y1, u3y] = r.p;
    const u1y = -u3y / 2;
    const q0 = [[x1, y1], [x1, -y1], [0, 0]];
    const v0 = [[0, u1y], [0, -u1y], [0, u3y]];
    console.log('\n' + name, 'residual=' + r.err.toExponential(2),
      '\n  x1=' + x1.toFixed(15), 'y1=' + y1.toFixed(15),
      '\n  v1=(' + v0[0][0].toFixed(15) + ',' + v0[0][1].toFixed(15) + ')',
      'v3=(' + v0[2][0].toFixed(15) + ',' + v0[2][1].toFixed(15) + ')');
    report(name + ' 1 period', q0, v0, 2 * TH, dtFine, 1);
    report(name + ' 8 periods', q0, v0, 2 * TH, 1e-5, 8);
    // min pair separation & radius span over one period
    let minSep = Infinity, rmax = 0;
    const st = integrate(q0, v0, 2 * TH, 1e-5);
    for (let s = 0; s < 400; s++) {
      const q = integrate(q0, v0, 2 * TH * s / 400, 1e-4).q;
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        const d = Math.hypot(q[j][0] - q[i][0], q[j][1] - q[i][1]); if (d < minSep) minSep = d;
      }
      for (let i = 0; i < 3; i++) rmax = Math.max(rmax, Math.hypot(q[i][0], q[i][1]));
    }
    console.log('  minPairSep=' + minSep.toFixed(5), ' rmax(com)=' + rmax.toFixed(5));
    // stability: perturb
    const vp = v0.map(r2 => [r2[0] + 1e-6, r2[1]]);
    report(name + ' perturbed 8 periods', q0, vp, 2 * TH, 1e-5, 8);
  }
}
