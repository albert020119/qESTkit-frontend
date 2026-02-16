import React, { useRef, useEffect, useState } from "react";
import "./NoiseHeatmap.css";

/**
 * NoiseChannelHeatmap
 *
 * Runs the current circuit with multiple noise configurations,
 * then displays a heatmap comparing final-state probabilities
 * across noise channels.
 *
 * Rows   = noise models (Ideal, Custom, IBM Kyiv, IBM Brisbane, ...)
 * Columns = basis states  (|00⟩, |01⟩, |10⟩, |11⟩, …)
 * Cell colour = probability  (dark blue → 0, bright red → 1)
 */

const NOISE_CHANNELS = [
  { label: "Ideal (no noise)", key: "ideal", gate: 0, meas: 0, preset: true },
  { label: "Custom", key: "custom", gate: null, meas: null, preset: false },
  { label: "IBM Kyiv", key: "ibm_kyiv", gate: 0.008, meas: 0.01, preset: true },
  { label: "IBM Brisbane", key: "ibm_brisbane", gate: 0.012, meas: 0.02, preset: true },
  { label: "Heavy Noise", key: "heavy", gate: 0.15, meas: 0.20, preset: true },
];

// Viridis-inspired color scale for probabilities 0..1
function probToColor(p) {
  // From deep blue (0) through teal/green to bright yellow (1)
  const stops = [
    [0.0, [13, 8, 135]],
    [0.15, [68, 1, 170]],
    [0.3, [122, 4, 167]],
    [0.45, [164, 44, 130]],
    [0.6, [207, 85, 83]],
    [0.75, [237, 131, 36]],
    [0.9, [251, 192, 11]],
    [1.0, [252, 253, 75]],
  ];
  // clamp
  const v = Math.max(0, Math.min(1, p));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (v - lo[0]) / (hi[0] - lo[0]);
  const r = Math.round(lo[1][0] + t * (hi[1][0] - lo[1][0]));
  const g = Math.round(lo[1][1] + t * (hi[1][1] - lo[1][1]));
  const b = Math.round(lo[1][2] + t * (hi[1][2] - lo[1][2]));
  return `rgb(${r},${g},${b})`;
}

function textColorForBg(p) {
  return p > 0.55 ? "#000" : "#fff";
}

export default function NoiseHeatmap({
  circuit,
  numQubits,
  parseCodeToGates,
  code,
  gateError: parentGateError,
  measError: parentMeasError,
  darkMode,
}) {
  const [heatmapData, setHeatmapData] = useState(null); // { channels: [...], states: [...], matrix: [[...]] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  // Normalise gate names for backend compatibility
  const normalizeGateName = (name) => {
    const map = {
      'H': 'H', 'X': 'X', 'Y': 'Y', 'Z': 'Z', 'S': 'S', 'T': 'T',
      'CNOT': 'CNOT', 'CZ': 'CZ', 'SWAP': 'SWAP',
      'I': 'I', 'IDENTITY': 'Identity', 'Identity': 'Identity',
      'RX': 'Rx', 'Rx': 'Rx', 'RY': 'Ry', 'Ry': 'Ry', 'RZ': 'Rz', 'Rz': 'Rz',
      'PH': 'Ph', 'Ph': 'Ph', 'PHASE': 'Ph',
    };
    return map[name] || name;
  };

  // ---- Run comparison across all noise models ----
  const runComparison = async () => {
    setLoading(true);
    setError(null);
    setHeatmapData(null);

    const gates =
      circuit.length > 0
        ? circuit.map(({ name, qubits, param }) => ({
            name: normalizeGateName(name),
            qubits,
            ...(param !== undefined ? { param } : {}),
          }))
        : parseCodeToGates
        ? parseCodeToGates(code)
        : [];

    if (!gates.length) {
      setError("No gates in the circuit to compare.");
      setLoading(false);
      return;
    }

    const allQubits = gates.flatMap((g) => g.qubits);
    const filteredQubits = allQubits.filter(
      (q) => Number.isInteger(q) && q >= 0
    );
    const simQubits = filteredQubits.length
      ? Math.max(...filteredQubits) + 1
      : 1;

    // Build requests for each noise channel
    const channels = NOISE_CHANNELS.map((ch) => ({
      ...ch,
      gate: ch.key === "custom" ? parentGateError : ch.gate,
      meas: ch.key === "custom" ? parentMeasError : ch.meas,
    }));

    try {
      const promises = channels.map((ch) => {
        const isNoisy = ch.gate > 0 || ch.meas > 0;
        const endpoint = isNoisy ? "/simulate-noisy" : "/simulate";
        const body = {
          num_qubits: simQubits,
          gates,
          num_simulations: 1000,
          ...(isNoisy && {
            gate_error_prob: ch.gate,
            measurement_error_prob: ch.meas,
          }),
        };
        return fetch(`http://localhost:8000${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
      });

      const resultsArr = await Promise.all(promises);

      // Collect all states
      const statesSet = new Set();
      resultsArr.forEach((r) =>
        Object.keys(r).forEach((s) => statesSet.add(s))
      );
      const states = [...statesSet].sort();

      // Build probability matrix
      const matrix = resultsArr.map((r) => {
        const total = Object.values(r).reduce((a, b) => a + b, 0);
        return states.map((s) => (r[s] || 0) / (total || 1));
      });

      setHeatmapData({ channels, states, matrix });
    } catch (err) {
      setError("Comparison failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Canvas rendering ----
  useEffect(() => {
    if (!heatmapData || !canvasRef.current) return;
    const { channels, states, matrix } = heatmapData;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const labelWidth = 140;
    const cellW = Math.max(54, Math.min(80, (canvas.width - labelWidth - 40) / states.length));
    const cellH = 38;
    const headerH = 60;
    const legendW = 24;
    const legendGap = 16;

    const totalW = labelWidth + states.length * cellW + legendGap + legendW + 60;
    const totalH = headerH + channels.length * cellH + 20;
    canvas.width = totalW * 2; // retina
    canvas.height = totalH * 2;
    canvas.style.width = totalW + "px";
    canvas.style.height = totalH + "px";
    ctx.scale(2, 2);

    // Clear
    ctx.fillStyle = darkMode ? "#0f172a" : "#f8fafc";
    ctx.fillRect(0, 0, totalW, totalH);

    // Column headers (states)
    ctx.font = "bold 11px 'Roboto Mono', monospace";
    ctx.fillStyle = darkMode ? "#94a3b8" : "#475569";
    ctx.textAlign = "center";
    states.forEach((s, i) => {
      const x = labelWidth + i * cellW + cellW / 2;
      ctx.save();
      ctx.translate(x, headerH - 8);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(`|${s}⟩`, 0, 0);
      ctx.restore();
    });

    // Rows
    channels.forEach((ch, row) => {
      const y = headerH + row * cellH;

      // Row label
      ctx.font = "600 11px sans-serif";
      ctx.fillStyle = darkMode ? "#e2e8f0" : "#1e293b";
      ctx.textAlign = "right";
      ctx.fillText(ch.label, labelWidth - 10, y + cellH / 2 + 4);

      // Cells
      states.forEach((_, col) => {
        const prob = matrix[row][col];
        const x = labelWidth + col * cellW;
        ctx.fillStyle = probToColor(prob);
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        // probability text
        ctx.fillStyle = textColorForBg(prob);
        ctx.font = "bold 11px 'Roboto Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          (prob * 100).toFixed(1) + "%",
          x + cellW / 2,
          y + cellH / 2 + 4
        );
      });
    });

    // Color legend
    const legendX = labelWidth + states.length * cellW + legendGap;
    const legendTop = headerH;
    const legendHeight = channels.length * cellH;
    for (let py = 0; py < legendHeight; py++) {
      const p = 1 - py / legendHeight;
      ctx.fillStyle = probToColor(p);
      ctx.fillRect(legendX, legendTop + py, legendW, 1);
    }
    ctx.strokeStyle = darkMode ? "#475569" : "#94a3b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendTop, legendW, legendHeight);

    // Legend labels
    ctx.font = "10px sans-serif";
    ctx.fillStyle = darkMode ? "#94a3b8" : "#475569";
    ctx.textAlign = "left";
    ctx.fillText("100%", legendX + legendW + 4, legendTop + 10);
    ctx.fillText("50%", legendX + legendW + 4, legendTop + legendHeight / 2 + 4);
    ctx.fillText("0%", legendX + legendW + 4, legendTop + legendHeight - 2);
  }, [heatmapData, darkMode]);

  return (
    <div className="noise-heatmap-panel">
      <div className="noise-heatmap-header">
        <h3>
          <span className="noise-heatmap-icon">🔬</span> Noise Channel
          Comparison
        </h3>
        <p className="noise-heatmap-subtitle">
          Compare final-state probabilities across different noise models for
          the current circuit.
        </p>
      </div>

      <div className="noise-heatmap-controls">
        <button
          className={`noise-heatmap-run-btn ${loading ? "loading" : ""}`}
          onClick={runComparison}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="noise-spinner" /> Comparing…
            </>
          ) : (
            <>▶ Run Comparison</>
          )}
        </button>
        <span className="noise-heatmap-info">
          Custom: gate {((parentGateError || 0) * 100).toFixed(1)}% / meas{" "}
          {((parentMeasError || 0) * 100).toFixed(1)}%
        </span>
      </div>

      {error && (
        <div className="noise-heatmap-error">
          <span>⚠</span> {error}
        </div>
      )}

      {heatmapData && (
        <div className="noise-heatmap-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}
