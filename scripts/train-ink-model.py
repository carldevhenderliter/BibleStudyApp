import json
import math
import os
import sys
from pathlib import Path

import numpy as np

try:
    import tensorflow as tf
except Exception as exc:  # pragma: no cover - runtime guard
    raise SystemExit(
        "TensorFlow not installed. Run: python3 -m pip install tensorflow"
    ) from exc


DEFAULT_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
INPUT_SIZE = 28
PADDING = 2


def usage() -> None:
    print("Usage: python3 scripts/train-ink-model.py <samples.json> [output_dir]")


def draw_line(grid, x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy

    while True:
        if 0 <= y0 < INPUT_SIZE and 0 <= x0 < INPUT_SIZE:
            grid[y0, x0] = 1.0
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def rasterize_sample(sample):
    points = []
    for stroke in sample.get("strokes", []):
        for pt in stroke.get("points", []):
            points.append((pt["x"], pt["y"]))
    if not points:
        return None

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(1.0, max_x - min_x)
    height = max(1.0, max_y - min_y)
    scale = (INPUT_SIZE - PADDING * 2) / max(width, height)

    grid = np.zeros((INPUT_SIZE, INPUT_SIZE), dtype=np.float32)

    for stroke in sample.get("strokes", []):
        pts = stroke.get("points", [])
        for i in range(1, len(pts)):
            prev = pts[i - 1]
            curr = pts[i]
            x0 = int(round((prev["x"] - min_x) * scale + PADDING))
            y0 = int(round((prev["y"] - min_y) * scale + PADDING))
            x1 = int(round((curr["x"] - min_x) * scale + PADDING))
            y1 = int(round((curr["y"] - min_y) * scale + PADDING))
            draw_line(grid, x0, y0, x1, y1)
        if len(pts) == 1:
            pt = pts[0]
            x = int(round((pt["x"] - min_x) * scale + PADDING))
            y = int(round((pt["y"] - min_y) * scale + PADDING))
            if 0 <= y < INPUT_SIZE and 0 <= x < INPUT_SIZE:
                grid[y, x] = 1.0
    return grid


def main():
    if len(sys.argv) < 2:
        usage()
        return 1

    sample_path = Path(sys.argv[1])
    if not sample_path.exists():
        raise SystemExit(f"Samples file not found: {sample_path}")

    output_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "ink-model")
    data = json.loads(sample_path.read_text())

    label_to_index = {label: i for i, label in enumerate(DEFAULT_LABELS)}
    images = []
    labels = []

    for sample in data:
        label = sample.get("label")
        if label not in label_to_index:
            continue
        grid = rasterize_sample(sample)
        if grid is None:
            continue
        images.append(grid)
        labels.append(label_to_index[label])

    if not images:
        raise SystemExit("No usable samples found.")

    x = np.stack(images, axis=0)[..., np.newaxis]
    y = tf.keras.utils.to_categorical(labels, num_classes=len(DEFAULT_LABELS))

    model = tf.keras.Sequential(
        [
            tf.keras.layers.Conv2D(
                16, 3, activation="relu", input_shape=(INPUT_SIZE, INPUT_SIZE, 1)
            ),
            tf.keras.layers.MaxPooling2D(),
            tf.keras.layers.Conv2D(32, 3, activation="relu"),
            tf.keras.layers.MaxPooling2D(),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(128, activation="relu"),
            tf.keras.layers.Dense(len(DEFAULT_LABELS), activation="softmax"),
        ]
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    print(f"Training on {len(images)} samples...")
    model.fit(x, y, epochs=25, batch_size=32, shuffle=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    saved_model_dir = output_dir / "saved_model"
    model.export(saved_model_dir)
    print(f"Saved TensorFlow model to {saved_model_dir}")

    keras_path = output_dir / "ink-model.h5"
    model.save(keras_path)
    print(f"Saved Keras model to {keras_path}")

    # Optional: convert to TensorFlow.js format if the converter is available.
    try:
        import subprocess

        subprocess.run(
            [
                sys.executable,
                "-m",
                "tensorflowjs_converter",
                "--input_format",
                "keras",
                "--output_format",
                "tfjs_layers_model",
                str(keras_path),
                str(output_dir),
            ],
            check=True,
        )
        print(f"Saved TensorFlow.js model to {output_dir}")
    except Exception:
        print(
            "tensorflowjs_converter not found. "
            "Install with: python3 -m pip install tensorflowjs"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
