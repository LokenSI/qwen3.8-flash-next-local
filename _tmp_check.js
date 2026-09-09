// Temporary verification of figure-eight initial conditions (velocity Verlet, Plummer-softened).
const eps = 1e-4;

function accel(q, G) {
  const a = [[0, 0], [0, 0], [0, 0]];
  const m = [1, 1, 1];
  let U = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx = q[j][0] - q[i][0], dy = q[j][1] - q[i][1];
      const r2 = dx * dx + dy * dy + eps * eps;
      const r = Math.sqrt(r2);
      const inv = G / (r2 * r);
      a[i][0] += inv * m[j] * dx; a[i][1] += inv * m[j] * dy;
      a[j][0] -= inv * m[i] * dx; a[j][1] -= inv * m[i] * dy;
      U -= G * m[i] * m[j] / r;
    }
  }
  return { a, U };
}

function run(label, q0, v0, T) {
  const G = 1;
  const dt = 2e-5;
  const n = Math.round(T / dt);
  let q = q0.map(p => p.slice()), v = v0.map(p => p.slice());
  let acc = accel(q, G);
  let E0 = null, mind = Infinity;
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * acc.a[i][0]; v[i][1] += 0.5 * dt * acc.a[i][1]; q[i][0] += dt * v[i][0]; q[i][1] += dt * v[i][1]; }
    acc = accel(q, G);
    for (let i = 0; i < 3; i++) { v[i][0] += 0.5 * dt * acc.a[i][0]; v[i][1] += 0.5 * dt * acc.a[i][1]; }
    let T3 = 0; for (let i = 0; i < 3; i++) T3 += 0.5 * (v[i][0] ** 2 + v[i][1] ** 2);
    const E = T3 + acc.U;
    if (E0 === null) E0 = E;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const d = Math.hypot(q[j][0] - q[i][0], q[j][1] - q[i][1]);
      if (d < mind) mind = d;
    }
  }
  let dE = 0; for (let i = 0; i < 3; i++) dE += (q[i][0] - q0[i][0]) ** 2 + (q[i][1] - q0[i][1]) ** 2;
  let p = [0, 0]; for (let i = 0; i < 3; i++) { p[0] += v[i][0]; p[1] += v[i][1]; }
  console.log(label,
    '| returnDist=' + Math.sqrt(dE).toExponential(3),
    '| minPairSep=' + mind.toFixed(5),
    '| E0=' + E0.toFixed(6),
    '| p=(' + p[0].toExponential(2) + ',' + p[1].toExponential(2) + ')');
}

const X = 0.9700043648717847, Y = -0.2428726848196809;
const V1X = 0.34786488, V1Y = 0.45582486;
const pos = [[X, Y], [-X, -Y], [0, 0]];

// Variant A: frequently quoted v3
run('A quoted  v3=(-0.93240737,-0.86473146)', pos, [[V1X, V1Y], [V1X, V1Y], [-0.93240737, -0.86473146]], 6.32591398);
// Variant B: exact zero-momentum v3 = -2*v1
run('B -2*v1                               ', pos, [[V1X, V1Y], [V1X, V1Y], [-2 * V1X, -2 * V1Y]], 6.32591398);
// Variant C: quoted v3 but with COM velocity removed (Galilean boost)
{
  const v = [[V1X, V1Y], [V1X, V1Y], [-0.93240737, -0.86473146]];
  const vc = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3];
  const vv = v.map(u => [u[0] - vc[0], u[1] - vc[1]]);
  run('C boosted                               ', pos, vv, 6.32591398);
}
