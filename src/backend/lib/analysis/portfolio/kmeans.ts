const MAX_ITER = 25;
const MAX_K = 4;
const MIN_K = 2;

function hashSeed(data: number[][]): number {
  let h = 2166136261;
  for (const vec of data) {
    for (const v of vec) {
      h = Math.imul(h ^ Math.floor(v * 1000), 16777619);
    }
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function minMaxNormalize(vectors: number[][]): number[][] {
  if (vectors.length === 0) {
    return [];
  }
  const dims = vectors[0]!.length;
  const mins = new Array(dims).fill(Infinity);
  const maxs = new Array(dims).fill(-Infinity);
  for (const vec of vectors) {
    for (let d = 0; d < dims; d += 1) {
      mins[d] = Math.min(mins[d]!, vec[d]!);
      maxs[d] = Math.max(maxs[d]!, vec[d]!);
    }
  }
  return vectors.map((vec) =>
    vec.map((v, d) => {
      const span = maxs[d]! - mins[d]!;
      if (span === 0) {
        return 0;
      }
      return (v - mins[d]!) / span;
    }),
  );
}

function assignClusters(
  data: number[][],
  centroids: number[][],
): number[] {
  return data.map((point) => {
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < centroids.length; c += 1) {
      const dist = euclidean(point, centroids[c]!);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best;
  });
}

function updateCentroids(
  data: number[][],
  clusters: number[],
  k: number,
  random: () => number,
): number[][] {
  const dims = data[0]!.length;
  const centroids: number[][] = [];
  for (let c = 0; c < k; c += 1) {
    const points = data.filter((_, i) => clusters[i] === c);
    if (points.length === 0) {
      centroids.push([...data[Math.floor(random() * data.length)]!]);
      continue;
    }
    const mean = new Array(dims).fill(0);
    for (const p of points) {
      for (let d = 0; d < dims; d += 1) {
        mean[d] += p[d]!;
      }
    }
    centroids.push(mean.map((v) => v / points.length));
  }
  return centroids;
}

function runKmeansOnce(
  data: number[][],
  k: number,
  seed: number,
): { clusters: number[]; centroids: number[][] } {
  const random = mulberry32(seed + k);
  const indices = data.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  let centroids = indices.slice(0, k).map((i) => [...data[i]!]);
  let clusters = assignClusters(data, centroids);

  for (let iter = 0; iter < MAX_ITER; iter += 1) {
    const newCentroids = updateCentroids(data, clusters, k, random);
    const newClusters = assignClusters(data, newCentroids);
    const converged = newClusters.every((c, i) => c === clusters[i]);
    centroids = newCentroids;
    clusters = newClusters;
    if (converged) {
      break;
    }
  }

  return { clusters, centroids };
}

function silhouetteScore(
  data: number[][],
  clusters: number[],
  centroids: number[][],
): number {
  if (centroids.length < 2 || data.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < data.length; i += 1) {
    const own = clusters[i]!;
    const a = euclidean(data[i]!, centroids[own]!);
    let b = Infinity;
    for (let c = 0; c < centroids.length; c += 1) {
      if (c === own) {
        continue;
      }
      b = Math.min(b, euclidean(data[i]!, centroids[c]!));
    }
    const denom = Math.max(a, b);
    total += denom === 0 ? 0 : (b - a) / denom;
  }
  return total / data.length;
}

export type KmeansAssignment = {
  bestK: number;
  clusters: number[];
  centroids: number[][];
};

export function runPortfolioKmeans(vectors: number[][]): KmeansAssignment | null {
  const n = vectors.length;
  if (n < 3) {
    return null;
  }

  const normalized = minMaxNormalize(vectors);
  const seed = hashSeed(normalized);
  const maxK = Math.min(MAX_K, n - 1);
  let best: KmeansAssignment | null = null;
  let bestScore = -Infinity;

  for (let k = MIN_K; k <= maxK; k += 1) {
    const { clusters, centroids } = runKmeansOnce(normalized, k, seed);
    const score = silhouetteScore(normalized, clusters, centroids);
    if (score > bestScore) {
      bestScore = score;
      best = { bestK: k, clusters, centroids };
    }
  }

  return best;
}
