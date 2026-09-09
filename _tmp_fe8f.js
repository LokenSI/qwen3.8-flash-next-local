// ---- Variant P3 (zero-momentum, mirror-pair): q1=(x1,y1) q2=(x1,-y1) q3=(x3,0)
//      v1=(u,w) v2=(u,-w) v3=(-2u,0)   -> momentum 0, angular momentum 0 automatically
function state5(p) {
  const [x1, y1, x3, u, w] = p;
  return {
    q: [[x1, y1], [x1, -y1], [x3, 0]],
    v: [[u, w], [u, -w], [-2 * u, 0]]
  };
}
function P3resid(p, TH, dt) {
  const s = state5(p);
  const st = integrate(s.q, s.v, TH, dt);
  // fixed set of (mirror x + time reverse + swap 1<->2): y=0 for body1, vx=0 for body3
  return [st.q[0][1], st.v[0][0], st.v[2][0]];
}
function solveN(res, p0, TH, dt, tol) {
  let p = p0.slice();
  const N = p.length;
  for (let iter = 0; iter < 60; iter++) {
    const f = res(p, TH, dt);
    const err = Math.max(...f.map(Math.abs));
    if (err < (tol || 1e-13)) return { p, err };
    const h = 1e-6;
    const J = f.map(() => new Array(N).fill(0));
    for (let k = 0; k < N; k++) {
      const pp = p.slice(); pp[k] += h;
      const f2 = res(pp, TH, dt);
      for (let r = 0; r < f.length; r++) J[r][k] = (f2[r] - f[r]) / h;
    }
    // least squares via normal equations with tiny ridge
    const AtA = Array.from({ length: N }, () => new Array(N).fill(0));
    const Atb = new Array(N).fill(0);
    for (let r = 0; r < f.length; r++) {
      for (let i = 0; i < N; i++) {
        AtA[i][i] += 1e-10;
        for (let j = 0; j < N; j++) AtA[i][j] += J[r][i] * J[r][j];
        Atb[i] += -f[r] * J[r][i];
      }
    }
    const d = gauss(AtA, Atb);
    if (!d) return { p, err };
    for (let i = 0; i < N; i++) p[i] += d[i];
  }
  return { p, err: Math.max(...res(p, TH, dt).map(Math.abs)) };
}
function gauss(A, b) {
  const n = b.length;
  const M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) return null;
    const t = M[c]; M[c] = M[piv]; M[piv] = t;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const dtFine = 3e-6;
const TH = 3.1629569513003345; // half of published period 6.325913902600669
// 3-unknown mirror-pair solve
{
  const r = solveN(P1resid, [0.97000436487, 0.24287268482, -0.93240737], TH, 1e-4);
  const [x1, y1, u3y] = r.p, u1y = -u3y / 2;
  const q0 = [[x1, y1], [x1, -y1], [0, 0]], v0 = [[0, u1y], [0, -u1y], [0, u3y]];
  console.log('P1 residual=' + r.err.toExponential(2));
  report('P1 1 period', q0, v0, 2 * TH, dtFine, 1);
  report('P1 6 periods', q0, v0, 2 * TH, 1e-5, 6);
  scan('P1', q0, v0, 2 * TH);
}
{
  const r = solveN(P2resid, [0.97000436487, 0.24287268482, -0.93240737], TH, 1e-4);
  const [x1, y1, u3y] = r.p, u1y = -u3y / 2;
  const q0 = [[x1, y1], [x1, -y1], [0, 0]], v0 = [[0, u1y], [0, -u1y], [0, u3y]];
  console.log('\nP2 residual=' + r.err.toExponential(2));
  report('P2 1 period', q0, v0, 2 * TH, dtFine, 1);
  report('P2 6 periods', q0, v0, 2 * TH, 1e-5, 6);
  scan('P2', q0, v0, 2 * TH);
}
// 5-unknown zero-momentum solve over a range of half-periods
for (const th of [3.16, 3.1629569513, 3.1648, 3.17, 3.19, 3.22, 3.3]) {
  const r = solveN(P3resid, [0.97004, 0.24287, 0.0, -0.4662, 0.43236], th, 1e-4);
  const s = state5(r.p);
  console.log('\nP3 TH=' + th.toFixed(9), 'residual=' + r.err.toExponential(2));
  console.log('   q1=(' + r.p[0].toFixed(12) + ',' + r.p[1].toFixed(12) + ') q3=(' + r.p[2].toFixed(12) + ',0)',
    ' v1=(' + r.p[3].toFixed(12) + ',' + r.p[4].toFixed(12) + ') v3=(' + (-2 * r.p[3]).toFixed(12) + ',0)');
  report('P3 1 period', s.q, s.v, 2 * th, dtFine, 1);
  report('P3 6 periods', s.q, s.v, 2 * th, 1e-5, 6);
  scan('P3', s.q, s.v, 2 * th);
}

function scan(label, q0, v0, T) {
  let minSep = Infinity, rmax = 0, crossings = 0;
  const N = 600;
  let prev = null;
  for (let s = 0; s <= N; s++) {
    const q = integrate(q0, v0, T * s / N, 2e-5).q;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const d = Math.hypot(q[j][0] - q[i][0], q[j][1] - q[i][1]); if (d < minSep) minSep = d;
      }
      rmax = Math.max(rmax, Math.hypot(q[i][0], q[i][1]));
    }
    if (prev) { for (let i = 0; i < 3; i++) if ((q[i][1] > 0) !== (prev[i][1] > 0)) crossings++; }
    prev = q;
  }
  console.log('   minPairSep=' + minSep.toFixed(5), 'rmax=' + rmax.toFixed(5), 'y-sign changes=' + crossings);
}
