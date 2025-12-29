import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as tf from "@tensorflow/tfjs-node";

const DEFAULT_LABELS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."abcdefghijklmnopqrstuvwxyz",
];

const INPUT_SIZE = 28;
const PADDING = 2;

const usage = () => {
  console.log("Usage: node scripts/train-ink-model.mjs <samples.json> [outputDir]");
};

const samplePath = process.argv[2];
if (!samplePath) {
  usage();
  process.exit(1);
}

const outputDir = process.argv[3] || "ink-model";
const raw = fs.readFileSync(samplePath, "utf-8");
const samples = JSON.parse(raw);

if (!Array.isArray(samples) || samples.length === 0) {
  console.error("No samples found.");
  process.exit(1);
}

const labelToIndex = new Map(DEFAULT_LABELS.map((label, i) => [label, i]));
const labelsUsed = new Set();

const drawLine = (grid, x0, y0, x1, y1) => {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    if (grid[y0] && grid[y0][x0] !== undefined) {
      grid[y0][x0] = 1;
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
};

const normalizeSample = (sample) => {
  const points = [];
  for (const stroke of sample.strokes || []) {
    for (const pt of stroke.points || []) {
      points.push({ x: pt.x, y: pt.y });
    }
  }
  if (points.length === 0) return null;

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = (INPUT_SIZE - PADDING * 2) / Math.max(width, height);

  const grid = Array.from({ length: INPUT_SIZE }, () =>
    Array.from({ length: INPUT_SIZE }, () => 0)
  );

  for (const stroke of sample.strokes || []) {
    const pts = stroke.points || [];
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const x0 = Math.round((prev.x - minX) * scale + PADDING);
      const y0 = Math.round((prev.y - minY) * scale + PADDING);
      const x1 = Math.round((curr.x - minX) * scale + PADDING);
      const y1 = Math.round((curr.y - minY) * scale + PADDING);
      drawLine(grid, x0, y0, x1, y1);
    }
    if (pts.length === 1) {
      const pt = pts[0];
      const x = Math.round((pt.x - minX) * scale + PADDING);
      const y = Math.round((pt.y - minY) * scale + PADDING);
      if (grid[y] && grid[y][x] !== undefined) grid[y][x] = 1;
    }
  }

  return grid;
};

const images = [];
const labels = [];

for (const sample of samples) {
  const label = sample.label;
  if (!labelToIndex.has(label)) continue;
  const grid = normalizeSample(sample);
  if (!grid) continue;
  images.push(grid);
  labels.push(labelToIndex.get(label));
  labelsUsed.add(label);
}

if (images.length === 0) {
  console.error("No usable samples for expected labels.");
  process.exit(1);
}

const xs = tf.tensor(images, [images.length, INPUT_SIZE, INPUT_SIZE, 1], "float32");
const ysOneHot = tf.tensor2d(
  labels.map((idx) => {
    const row = Array(DEFAULT_LABELS.length).fill(0);
    row[idx] = 1;
    return row;
  }),
  [labels.length, DEFAULT_LABELS.length]
);

const model = tf.sequential();
model.add(
  tf.layers.conv2d({
    inputShape: [INPUT_SIZE, INPUT_SIZE, 1],
    filters: 16,
    kernelSize: 3,
    activation: "relu",
  })
);
model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
model.add(
  tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    activation: "relu",
  })
);
model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
model.add(tf.layers.flatten());
model.add(tf.layers.dense({ units: 128, activation: "relu" }));
model.add(tf.layers.dense({ units: DEFAULT_LABELS.length, activation: "softmax" }));

model.compile({
  optimizer: tf.train.adam(1e-3),
  loss: "categoricalCrossentropy",
  metrics: ["accuracy"],
});

console.log(`Training on ${images.length} samples...`);
console.log(`Labels seen: ${[...labelsUsed].join(", ")}`);

await model.fit(xs, ysOneHot, {
  epochs: 25,
  batchSize: 32,
  shuffle: true,
});

const outPath = path.resolve(process.cwd(), outputDir);
await model.save(`file://${outPath}`);
console.log(`Saved model to ${outPath}`);
