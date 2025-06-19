import React, { useState } from "react";
import "./Circuit.css";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./theme/ThemeContext";

export default function QuantumSimApp() {
  const { darkMode } = useTheme(); 
  const [code, setCode] = useState("// Example: H 0\nH 0\nCNOT 0 1\n");
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);

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
      num_simulations: 1000,
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

    const timeline = [];

    gates.forEach((gate, i) => {
      const gateCol = Array(numQubits).fill(null);
      gate.qubits.forEach((q) => {
        gateCol[q] = { type: "GATE", gate };
      });
      timeline.push(gateCol);

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
      <div className="circuit">
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

  return (
    <div className="container">

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
  <a
    href="/documentation.html"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "8px 16px",
      borderRadius: "6px",
      textDecoration: "none",
      fontWeight: "bold"
    }}
  >
    Documentation
  </a>
</div>


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
          <ThemeToggle />
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
    </div>
  );
}
