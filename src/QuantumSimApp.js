import React, { useState } from "react";
import "./Circuit.css";
import BlochSphere from "./BlochSphere"; 

// Helper to compute theta/phi for any qubit from multi-qubit results
function getBlochAnglesFromResults(results, qubitIdx = 0) {
  console.log(results)
  if (!results) return { theta: Math.PI / 4, phi: 0 };
  let shots0 = 0, shots1 = 0, total = 0;
  for (const [state, count] of Object.entries(results)) {
    // state is a bitstring, e.g. "01" (q[0]=0, q[1]=1)
    const bit = state[state.length - 1 - qubitIdx]; // rightmost is q[0]
    if (bit === "0") shots0 += count;
    else if (bit === "1") shots1 += count;
    total += count;
  }
  if (total === 0) return { theta: Math.PI / 4, phi: 0 };
  const p0 = shots0 / total;
  const theta = Math.acos(2 * p0 - 1);
  return { theta, phi: 0 };
}

// Helper to compute Bloch vector (x, y, z) from simulation results
function getBlochVectorFromResults(results, qubitIdx = 0) {
  if (!results) return { x: 0, y: 0, z: 0 };
  let shots0 = 0, shots1 = 0, total = 0;
  for (const [state, count] of Object.entries(results)) {
    const bit = state[state.length - 1 - qubitIdx];
    if (bit === "0") shots0 += count;
    else if (bit === "1") shots1 += count;
    total += count;
  }
  if (total === 0) return { x: 0, y: 0, z: 0 };
  const p0 = shots0 / total;
  const p1 = shots1 / total;
  // Only Z component can be inferred from measurement
  const z = p0 - p1;
  return { x: 0, y: 0, z };
}

// Returns: Array of {x, y, z, prob, qubit, value} for all basis states for all qubits
function getAllBasisVectors(results, numQubits) {
  if (!results) return [];
  let total = 0;
  for (const count of Object.values(results)) total += count;
  const vectors = [];
  for (let q = 0; q < numQubits; ++q) {
    for (const [state, count] of Object.entries(results)) {
      const bit = state[state.length - 1 - q];
      const prob = count / total;
      // |0> = +Z, |1> = -Z
      const z = bit === "0" ? 1 : -1;
      vectors.push({
        x: 0,
        y: 0,
        z,
        prob,
        qubit: q,
        value: bit,
      });
    }
  }
  return vectors;
}

function getQSphereVectors(results, numQubits) {
  if (!results) return [];
  let total = 0;
  for (const count of Object.values(results)) total += count;
  const vectors = [];
  for (const [state, count] of Object.entries(results)) {
    // Remove '|' and '>' if present
    const cleanState = state.replace(/\|/g, '').replace(/\>/g, '');
    const padded = cleanState.padStart(numQubits, "0");
    const bits = padded.split("").map(Number);
    const hamming = bits.reduce((a, b) => a + b, 0);

    let theta, phi;
    if (numQubits === 2) {
      // Custom mapping for 2 qubits: |01> = +Y, |10> = –Y
      if (padded === "00")      { theta = 0;        phi = 0; }
      else if (padded === "01") { theta = Math.PI/2; phi = Math.PI/2; }
      else if (padded === "10") { theta = Math.PI/2; phi = 3*Math.PI/2; }
      else if (padded === "11") { theta = Math.PI;   phi = 0; }
    } else {
      theta = Math.PI * hamming / numQubits;
      phi = 2 * Math.PI * parseInt(padded, 2) / Math.pow(2, numQubits);
    }

    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    vectors.push({
      x, y, z,
      prob: count / total,
      state: padded
    });
  }
  return vectors;
}

export default function QuantumSimApp() {
  const [code, setCode] = useState("H 0\nCNOT 0 1\n");
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedQubit, setSelectedQubit] = useState(0);

  const parseCodeToGates = (rawCode) => {
    const lines = rawCode.split("\n");
    const gates = [];
    for (const line of lines) {
      const parts = line.trim().split(" ");
      if (parts.length < 2) continue;
      const name = parts[0].toUpperCase();
      const qubits = parts.slice(1).map(Number).filter((q) => Number.isInteger(q) && q >= 0);
      if (qubits.length > 0) gates.push({ name, qubits });
    }
    return gates;
  };

  const handleSimulate = async () => {
    const gates = parseCodeToGates(code);
    const allQubits = gates.flatMap((g) => g.qubits);
    const filtered = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
    const numQubits = filtered.length ? Math.max(...filtered) + 1 : 1;
    if (!gates.length) return alert("No valid gates found.");

    const body = {
      num_qubits: numQubits,
      gates,
      num_simulations: 100,
    };

    const endpoint = isNoisy ? "/simulate-noisy" : "/simulate";

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNoisy
            ? { ...body, gate_error_prob: 0.05, measurement_error_prob: 0.1 }
            : body
        ),
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      alert("Simulation failed: " + err.message);
    }
  };

  const renderCircuit = () => {
    const gates = parseCodeToGates(code);
    const allQubits = gates.flatMap((g) => g.qubits);
    const filtered = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
    const numQubits = filtered.length ? Math.max(...filtered) + 1 : 1;

    // Build timeline: alternate gate and line columns
    const timeline = [];

    gates.forEach((gate, i) => {
      const gateCol = Array(numQubits).fill(null);
      gate.qubits.forEach((q) => {
        gateCol[q] = { type: "GATE", gate };
      });
      timeline.push(gateCol);

      // Add connector column (line) after each gate column except the last
      if (i < gates.length - 1) {
        const lineCol = Array(numQubits).fill(null);
        for (let q = 0; q < numQubits; q++) {
          const current = gate.qubits.includes(q);
          const nextGate = gates[i + 1]?.qubits.includes(q);
          if (current && nextGate) {
            lineCol[q] = { type: "LINE" };
          }
        }
        timeline.push(lineCol);
      }
    });

    return (
      <div className={`circuit ${darkMode ? "dark" : ""}`}>
        {Array.from({ length: numQubits }).map((_, qIdx) => (
          <div className="circuit-row" key={`qrow-${qIdx}`}>
            <span className="qubit-label">q[{qIdx}]</span>
            <div className="circuit-track">
              {timeline.map((col, colIdx) => {
                const slot = col[qIdx];
                const key = `c${colIdx}-q${qIdx}`;

                if (!slot) return <div key={key} className="spacer" />;

                if (slot.type === "LINE") {
                  return <div key={key} className="line-segment" />;
                }

                if (slot.type === "GATE") {
                  const gate = slot.gate;
                  if (gate.name === "CNOT" && gate.qubits.length === 2) {
                    const [control, target] = gate.qubits;
                    if (qIdx === control) {
                      return (
                        <div className="gate cnot-control" key={key}>
                          ●
                          <div className="cnot-line" />
                        </div>
                      );
                    } else if (qIdx === target) {
                      return (
                        <div className="gate cnot-target" key={key}>
                          ⊕
                          <div className="cnot-line" />
                        </div>
                      );
                    } else if (
                      qIdx > Math.min(control, target) &&
                      qIdx < Math.max(control, target)
                    ) {
                      return <div key={key} className="cnot-bridge" />;
                    } else {
                      return <div key={key} className="spacer" />;
                    }
                  }

                  return (
                    <div key={key} className="gate">
                      {gate.name}
                    </div>
                  );
                }

                return <div key={key} className="line-segment faded" />;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Find number of qubits from code
  const gates = parseCodeToGates(code);
  const allQubits = gates.flatMap((g) => g.qubits);
  const filtered = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
  const numQubits = filtered.length ? Math.max(...filtered) + 1 : 1;

  // Compute Bloch angles for selected qubit
  const blochAngles = getBlochAnglesFromResults(results, selectedQubit);

  // Compute Bloch angles for all qubits (only if results exist)
  const allBlochAngles = results
    ? Array.from({ length: numQubits }, (_, i) =>
        getBlochAnglesFromResults(results, i)
      )
    : [];

  const allBasisVectors = results ? getAllBasisVectors(results, numQubits) : [];

  const qSphereVectors = results ? getQSphereVectors(results, numQubits) : [];

  return (
    <div className={`container ${darkMode ? "dark" : ""}`}>
      <h1>Quantum Circuit Simulator</h1>

      <div className="panel">
        <h2>Quantum Circuit Code</h2>
        <textarea
          rows={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="buttons">
          <button onClick={handleSimulate}>Simulate</button>
          <button
            onClick={() => setIsNoisy(!isNoisy)}
            className={isNoisy ? "noisy" : ""}
          >
            {isNoisy ? "Noisy Mode: ON" : "Noisy Mode: OFF"}
          </button>
          <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
        </div>
      </div>

      <h2>Circuit Visualization</h2>
      {renderCircuit()}

      {results && (
        <div className="panel">
          <h3>Simulation Results</h3>
          {Object.entries(results).map(([state, count]) => (
            <div key={state}>
              {state}: {count}
            </div>
          ))}
        </div>
      )}

      <div>
        <h2>Bloch Sphere (All Qubits)</h2>
        <BlochSphere basisVectors={qSphereVectors} />
        {results && (
          <div style={{ color: "#fff", marginTop: 8 }}>
            {allBlochAngles.map((_, i) => (
              <span key={i} style={{ marginRight: 16, color: "#fff" }}>
                <span style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  background: [
                    "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#00ff88", "#8888ff", "#fff"
                  ][i % 7],
                  borderRadius: "50%",
                  marginRight: 4,
                  verticalAlign: "middle"
                }}></span>
                Qubit {i}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
