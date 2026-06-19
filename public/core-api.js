// src/core/rng.ts
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const int = (maxExclusive) => Math.floor(next() * maxExclusive);
  const pick = (arr) => {
    if (arr.length === 0) throw new Error("pick() on empty array");
    return arr[int(arr.length)];
  };
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };
  return { next, int, pick, shuffle };
}
function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// src/core/sudoku.ts
var SPEC_4 = { N: 4, br: 2, bc: 2 };
var SPEC_6 = { N: 6, br: 2, bc: 3 };
function idx(N, r, c) {
  return r * N + c;
}
function rowOf(N, cell) {
  return Math.floor(cell / N);
}
function colOf(N, cell) {
  return cell % N;
}
function rowIndices(N, r) {
  const out = [];
  for (let c = 0; c < N; c++) out.push(idx(N, r, c));
  return out;
}
function colIndices(N, c) {
  const out = [];
  for (let r = 0; r < N; r++) out.push(idx(N, r, c));
  return out;
}
function regionIndices(spec, cell) {
  const { N, br, bc } = spec;
  const r = rowOf(N, cell);
  const c = colOf(N, cell);
  const r0 = Math.floor(r / br) * br;
  const c0 = Math.floor(c / bc) * bc;
  const out = [];
  for (let dr = 0; dr < br; dr++) {
    for (let dc = 0; dc < bc; dc++) {
      out.push(idx(N, r0 + dr, c0 + dc));
    }
  }
  return out;
}
function peers(spec, cell) {
  const { N } = spec;
  const set = /* @__PURE__ */ new Set();
  for (const p of rowIndices(N, rowOf(N, cell))) set.add(p);
  for (const p of colIndices(N, colOf(N, cell))) set.add(p);
  for (const p of regionIndices(spec, cell)) set.add(p);
  set.delete(cell);
  return [...set];
}
function isValidPlacement(spec, grid, cell, val) {
  if (val === 0) return true;
  for (const p of peers(spec, cell)) {
    if (grid[p] === val) return false;
  }
  return true;
}
function findConflicts(spec, grid) {
  const conflicts = /* @__PURE__ */ new Set();
  for (let cell = 0; cell < grid.length; cell++) {
    const val = grid[cell];
    if (!val) continue;
    for (const p of peers(spec, cell)) {
      if (grid[p] === val) {
        conflicts.add(cell);
        conflicts.add(p);
      }
    }
  }
  return conflicts;
}
function isComplete(spec, grid) {
  for (const v of grid) if (!v) return false;
  return findConflicts(spec, grid).size === 0;
}
function unitIsComplete(N, grid, cells) {
  const seen = /* @__PURE__ */ new Set();
  for (const cell of cells) {
    const v = grid[cell];
    if (!v) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === N;
}
function completedGroups(spec, grid) {
  const { N, br, bc } = spec;
  const rows = [];
  const cols = [];
  const regions = [];
  for (let r = 0; r < N; r++) {
    if (unitIsComplete(N, grid, rowIndices(N, r))) rows.push(r);
  }
  for (let c = 0; c < N; c++) {
    if (unitIsComplete(N, grid, colIndices(N, c))) cols.push(c);
  }
  let region = 0;
  for (let r0 = 0; r0 < N; r0 += br) {
    for (let c0 = 0; c0 < N; c0 += bc) {
      if (unitIsComplete(N, grid, regionIndices(spec, idx(N, r0, c0)))) regions.push(region);
      region++;
    }
  }
  return { rows, cols, regions };
}

// src/core/sudokuSolver.ts
function findBestCell(spec, grid) {
  const { N } = spec;
  let best = null;
  for (let cell = 0; cell < grid.length; cell++) {
    if (grid[cell]) continue;
    const candidates = [];
    for (let v = 1; v <= N; v++) {
      if (isValidPlacement(spec, grid, cell, v)) candidates.push(v);
    }
    if (candidates.length === 0) return { cell, candidates };
    if (!best || candidates.length < best.candidates.length) {
      best = { cell, candidates };
      if (candidates.length === 1) break;
    }
  }
  return best;
}
function solve(spec, grid) {
  const work = grid.slice();
  const recurse = () => {
    const best = findBestCell(spec, work);
    if (best === null) return true;
    if (best.candidates.length === 0) return false;
    for (const v of best.candidates) {
      work[best.cell] = v;
      if (recurse()) return true;
    }
    work[best.cell] = 0;
    return false;
  };
  return recurse() ? work : null;
}
function countSolutions(spec, grid, limit = 2) {
  const work = grid.slice();
  let count = 0;
  const recurse = () => {
    if (count >= limit) return;
    const best = findBestCell(spec, work);
    if (best === null) {
      count++;
      return;
    }
    if (best.candidates.length === 0) return;
    for (const v of best.candidates) {
      work[best.cell] = v;
      recurse();
      work[best.cell] = 0;
      if (count >= limit) return;
    }
  };
  recurse();
  return count;
}

// src/core/sudokuGenerator.ts
function clueTarget(spec, difficulty) {
  const total = spec.N * spec.N;
  const frac = {
    easy: 0.62,
    medium: 0.5,
    hard: 0.42,
    expert: 0.36
  };
  return Math.max(spec.N + 1, Math.round(total * frac[difficulty]));
}
function generateFullSolution(spec, rng) {
  const { N } = spec;
  const grid = new Array(N * N).fill(0);
  const values = Array.from({ length: N }, (_, i) => i + 1);
  const fill = (cell) => {
    if (cell === grid.length) return true;
    if (grid[cell]) return fill(cell + 1);
    for (const v of rng.shuffle(values)) {
      if (isValidPlacement(spec, grid, cell, v)) {
        grid[cell] = v;
        if (fill(cell + 1)) return true;
        grid[cell] = 0;
      }
    }
    return false;
  };
  fill(0);
  return grid;
}
function generateSudoku(spec, rng, difficulty) {
  const solution = generateFullSolution(spec, rng);
  const given = solution.slice();
  const target = clueTarget(spec, difficulty);
  let clues = given.length;
  const order = rng.shuffle(Array.from({ length: given.length }, (_, i) => i));
  for (const cell of order) {
    if (clues <= target) break;
    const saved = given[cell];
    if (saved === 0) continue;
    given[cell] = 0;
    if (countSolutions(spec, given, 2) === 1) {
      clues--;
    } else {
      given[cell] = saved;
    }
  }
  const seed = rng.int(2147483647);
  return {
    id: `sudoku-${spec.N}-${difficulty}-${seed}`,
    seed,
    spec,
    given,
    solution,
    difficulty
  };
}

// src/core/zip.ts
function zipIndex(N, r, c) {
  return r * N + c;
}
function zipRow(N, cell) {
  return Math.floor(cell / N);
}
function zipCol(N, cell) {
  return cell % N;
}
function zipNeighbors(N, cell) {
  const r = zipRow(N, cell);
  const c = zipCol(N, cell);
  const out = [];
  if (r > 0) out.push(zipIndex(N, r - 1, c));
  if (r < N - 1) out.push(zipIndex(N, r + 1, c));
  if (c > 0) out.push(zipIndex(N, r, c - 1));
  if (c < N - 1) out.push(zipIndex(N, r, c + 1));
  return out;
}
function wallKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
function hasWall(walls, a, b) {
  return walls.has(wallKey(a, b));
}
function passable(N, walls, a, b) {
  if (!zipNeighbors(N, a).includes(b)) return false;
  return !hasWall(walls, a, b);
}
function isPathValid(N, walls, path) {
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (seen.has(cell)) return false;
    seen.add(cell);
    if (i > 0 && !passable(N, walls, path[i - 1], cell)) return false;
  }
  return true;
}
function pathOrderOk(checkpoints, path) {
  let expected = 1;
  for (const cell of path) {
    const num = checkpoints[cell];
    if (num !== void 0) {
      if (num !== expected) return false;
      expected++;
    }
  }
  return true;
}
function expectedNext(checkpoints, path) {
  let expected = 1;
  for (const cell of path) {
    if (checkpoints[cell] === expected) expected++;
  }
  return expected;
}
function isSolved(puzzle, path) {
  const { N, walls, checkpoints } = puzzle;
  if (path.length !== N * N) return false;
  if (checkpoints[path[0]] !== 1) return false;
  if (!isPathValid(N, walls, path)) return false;
  return pathOrderOk(checkpoints, path);
}

// src/core/zipGenerator.ts
function zipParams(difficulty) {
  switch (difficulty) {
    case "easy":
      return { N: 5, checkpoints: 5, walls: 2 };
    case "medium":
      return { N: 6, checkpoints: 6, walls: 5 };
    case "hard":
      return { N: 7, checkpoints: 7, walls: 9 };
    case "expert":
      return { N: 8, checkpoints: 8, walls: 14 };
  }
}
function snakePath(N) {
  const path = [];
  for (let r = 0; r < N; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < N; c++) path.push(r * N + c);
    } else {
      for (let c = N - 1; c >= 0; c--) path.push(r * N + c);
    }
  }
  return path;
}
function reverseInPlace(arr, i, j) {
  while (i < j) {
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
    i++;
    j--;
  }
}
function backbite(N, path, rng) {
  const n = path.length;
  if (rng.int(2) === 0) {
    const end = path[n - 1];
    const w = rng.pick(zipNeighbors(N, end));
    const j = path.indexOf(w);
    if (j < n - 2) reverseInPlace(path, j + 1, n - 1);
  } else {
    const end = path[0];
    const w = rng.pick(zipNeighbors(N, end));
    const j = path.indexOf(w);
    if (j > 1) reverseInPlace(path, 0, j - 1);
  }
}
function generateHamiltonianPath(N, rng) {
  const path = snakePath(N);
  const moves = N * N * 12;
  for (let i = 0; i < moves; i++) backbite(N, path, rng);
  return path;
}
function checkpointPositions(n, k, rng) {
  const positions = /* @__PURE__ */ new Set([0, n - 1]);
  for (let i = 1; i < k - 1 && positions.size < k; i++) {
    const base = Math.round(i * (n - 1) / (k - 1));
    const jitter = rng.int(3) - 1;
    let pos = Math.min(n - 2, Math.max(1, base + jitter));
    while (positions.has(pos) && pos < n - 2) pos++;
    while (positions.has(pos) && pos > 1) pos--;
    positions.add(pos);
  }
  let fill = 1;
  while (positions.size < k && fill < n - 1) {
    if (!positions.has(fill)) positions.add(fill);
    fill++;
  }
  return [...positions].sort((a, b) => a - b);
}
function generateZip(rng, difficulty) {
  const { N, checkpoints: k, walls: wallTarget } = zipParams(difficulty);
  const solution = generateHamiltonianPath(N, rng);
  const positions = checkpointPositions(solution.length, k, rng);
  const checkpoints = {};
  positions.forEach((pos, i) => {
    checkpoints[solution[pos]] = i + 1;
  });
  const consecutive = /* @__PURE__ */ new Set();
  for (let i = 1; i < solution.length; i++) {
    consecutive.add(wallKey(solution[i - 1], solution[i]));
  }
  const candidates = /* @__PURE__ */ new Set();
  for (let cell = 0; cell < N * N; cell++) {
    for (const nb of zipNeighbors(N, cell)) {
      const key = wallKey(cell, nb);
      if (!consecutive.has(key)) candidates.add(key);
    }
  }
  const walls = new Set(rng.shuffle([...candidates]).slice(0, wallTarget));
  const seed = rng.int(2147483647);
  return {
    id: `zip-${N}-${difficulty}-${seed}`,
    seed,
    N,
    checkpoints,
    solution,
    walls,
    difficulty
  };
}

// src/core/serialize.ts
function serializeSudoku(p) {
  return JSON.stringify(p);
}
function deserializeSudoku(json) {
  return JSON.parse(json);
}
function zipToWire(p) {
  return {
    id: p.id,
    seed: p.seed,
    N: p.N,
    checkpoints: p.checkpoints,
    solution: p.solution,
    walls: [...p.walls].sort(),
    difficulty: p.difficulty
  };
}
function zipFromWire(w) {
  return {
    id: w.id,
    seed: w.seed,
    N: w.N,
    checkpoints: w.checkpoints,
    solution: w.solution,
    walls: new Set(w.walls),
    difficulty: w.difficulty
  };
}
function serializeZip(p) {
  return JSON.stringify(zipToWire(p));
}
function deserializeZip(json) {
  return zipFromWire(JSON.parse(json));
}

// src/core/factory.ts
function buildSudoku(size, difficulty, seed) {
  const spec = size === 4 ? SPEC_4 : SPEC_6;
  const p = generateSudoku(spec, makeRng(seed), difficulty);
  return { ...p, seed, id: `sudoku-${size}-${difficulty}-${seed}` };
}
function buildZip(difficulty, seed) {
  const p = generateZip(makeRng(seed), difficulty);
  return { ...p, seed, id: `zip-${difficulty}-${seed}` };
}
function buildPuzzle(ref) {
  if (ref.type === "sudoku") {
    return { kind: "sudoku", ...buildSudoku(ref.size, ref.difficulty, ref.seed) };
  }
  return { kind: "zip", ...buildZip(ref.difficulty, ref.seed) };
}

// src/core/daily.ts
function dailySeed(dateISO) {
  return hashStringToSeed(`daily:${dateISO}`);
}
var SUDOKU_DIFFS = ["easy", "medium", "hard", "expert"];
var ZIP_DIFFS = ["easy", "medium", "hard", "expert"];
function dailyConfig(dateISO) {
  const seed = dailySeed(dateISO);
  const r = makeRng(seed);
  const isSudoku = r.int(2) === 0;
  if (isSudoku) {
    const size = r.int(2) === 0 ? 4 : 6;
    return {
      type: "sudoku",
      size,
      difficulty: r.pick(SUDOKU_DIFFS),
      seed
    };
  }
  return {
    type: "zip",
    difficulty: r.pick(ZIP_DIFFS),
    seed
  };
}
function todayISO(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// src/core/validate.ts
var MIN_SEC_PER_CELL = 0.15;
var MAX_SEC = 24 * 60 * 60;
function metricsOk(r, cells) {
  if (!Number.isFinite(r.timeSec) || r.timeSec < cells * MIN_SEC_PER_CELL) {
    return { valid: false, reason: "time too short" };
  }
  if (r.timeSec > MAX_SEC) return { valid: false, reason: "time too long" };
  if (!Number.isInteger(r.errors) || r.errors < 0) {
    return { valid: false, reason: "invalid error count" };
  }
  if (!Number.isInteger(r.hints) || r.hints < 0) {
    return { valid: false, reason: "invalid hint count" };
  }
  return { valid: true };
}
function validateResult(r) {
  if (r.ref.type === "sudoku") {
    const puzzle2 = buildSudoku(r.ref.size, r.ref.difficulty, r.ref.seed);
    const spec = r.ref.size === 4 ? SPEC_4 : SPEC_6;
    const grid = r.grid;
    if (!grid || grid.length !== spec.N * spec.N) {
      return { valid: false, reason: "missing or malformed grid" };
    }
    const m2 = metricsOk(r, spec.N * spec.N);
    if (!m2.valid) return m2;
    if (!isComplete(spec, grid)) return { valid: false, reason: "grid not complete" };
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== puzzle2.solution[i]) {
        return { valid: false, reason: "grid does not match solution" };
      }
    }
    return { valid: true };
  }
  const puzzle = buildZip(r.ref.difficulty, r.ref.seed);
  const m = metricsOk(r, puzzle.N * puzzle.N);
  if (!m.valid) return m;
  if (!r.path || !isSolved(puzzle, r.path)) {
    return { valid: false, reason: "path does not solve puzzle" };
  }
  return { valid: true };
}
export {
  SPEC_4,
  SPEC_6,
  buildPuzzle,
  buildSudoku,
  buildZip,
  clueTarget,
  colIndices,
  colOf,
  completedGroups,
  countSolutions,
  dailyConfig,
  dailySeed,
  deserializeSudoku,
  deserializeZip,
  expectedNext,
  findConflicts,
  generateFullSolution,
  generateHamiltonianPath,
  generateSudoku,
  generateZip,
  hasWall,
  hashStringToSeed,
  idx,
  isComplete,
  isPathValid,
  isSolved,
  isValidPlacement,
  makeRng,
  passable,
  pathOrderOk,
  peers,
  regionIndices,
  rowIndices,
  rowOf,
  serializeSudoku,
  serializeZip,
  solve,
  todayISO,
  validateResult,
  wallKey,
  zipCol,
  zipFromWire,
  zipIndex,
  zipNeighbors,
  zipParams,
  zipRow,
  zipToWire
};
