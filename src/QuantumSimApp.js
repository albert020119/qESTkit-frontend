import React, { useState } from "react";
import "./Circuit.css";

export default function QuantumSimApp() {
  const [code, setCode] = useState(
    "// Write your quantum circuit\n// Example: H 0\n//          CNOT 0 1\n"
  );
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);

  const parseCodeToGates = (rawCode) => {
    const lines = rawCode.split("\n");
    const gates = [];
    for (const line of lines) {
      const parts = line.trim().split(" ");
      if (parts.length < 2) continue;

      const name = parts[0].toUpperCase();
      const qubits = parts
        .slice(1)
        .map(Number)
        .filter((q) => Number.isInteger(q) && q >= 0);

      if (qubits.length > 0) {
        gates.push({ name, qubits });
      }
    }
    return gates;
  };

  const handleSimulate = async () => {
    const gates = parseCodeToGates(code);
    const allQubits = gates.flatMap((g) => g.qubits);
    const filtered = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
    const numQubits = filtered.length ? Math.max(...filtered) + 1 : 1;

    if (!gates.length) {
      alert("No valid gates found. Please check your input.");
      return;
    }

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
            ? {
                ...body,
                gate_error_prob: 0.05,
                measurement_error_prob: 0.1,
              }
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

    return (
      <div className="circuit">
        {Array.from({ length: numQubits }).map((_, qIdx) => (
          <div className="circuit-row" key={qIdx}>
            <span className="qubit-label">q[{qIdx}]</span>
            <div className="circuit-track">
              {gates.map((gate, gIdx) => {
                const key = `g${gIdx}-q${qIdx}`;
                const [control, target] = gate.qubits;

                if (gate.name === "CNOT" && gate.qubits.length === 2) {
                  const isControl = qIdx === control;
                  const isTarget = qIdx === target;
                  const between =
                    qIdx > Math.min(control, target) &&
                    qIdx < Math.max(control, target);

                  if (isControl) {
                    return (
                      <div className="gate cnot-control" key={key}>
                        ●
                        <div className="cnot-line" />
                      </div>
                    );
                  } else if (isTarget) {
                    return (
                      <div className="gate cnot-target" key={key}>
                        ⊕
                        <div className="cnot-line" />
                      </div>
                    );
                  } else if (between) {
                    return <div key={key} className="cnot-bridge" />;
                  } else {
                    return <div key={key} className="spacer" />;
                  }
                }

                if (gate.qubits.includes(qIdx)) {
                  return (
                    <div key={key} className="gate">
                      {gate.name}
                    </div>
                  );
                } else {
                  return <div key={key} className="spacer" />;
                }
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Quantum Circuit Simulator
      </h1>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontWeight: "600", marginBottom: 8 }}>Quantum Circuit Code</h2>
        <textarea
          rows={8}
          style={{
            width: "100%",
            borderRadius: 8,
            border: "1px solid #ccc",
            padding: 12,
            fontFamily: "monospace",
            resize: "vertical",
          }}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button onClick={handleSimulate} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Simulate
          </button>
          <button
            onClick={() => setIsNoisy(!isNoisy)}
            style={{
              padding: "8px 16px",
              backgroundColor: isNoisy ? "orange" : "gray",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {isNoisy ? "Noisy Mode: ON" : "Noisy Mode: OFF"}
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        Circuit Visualization
      </h2>
      {renderCircuit()}

      {results && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            marginTop: 24,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ fontWeight: "600", marginBottom: 8 }}>Simulation Results</h3>
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
