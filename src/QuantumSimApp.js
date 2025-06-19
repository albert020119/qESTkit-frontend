import React, { useState, useEffect } from "react";
import "./Circuit.css";
import GateToolbox from "./components/GateToolbox/GateToolbox";
import CircuitBoard from "./components/Circuit/CircuitBoard";
import "./components/Circuit/CircuitBoard.css";
import "./components/GateToolbox/GateToolbox.css";
import { useDragDrop } from "./hooks/useDragDrop";

export default function QuantumSimApp() {
  const [code, setCode] = useState("// Example: H 0\nH 0\nCNOT 0 1\n");
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Circuit state for drag and drop
  const [numQubits, setNumQubits] = useState(2);
  const [circuit, setCircuit] = useState([]);
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
  
  // Generate code from circuit
  const generateCodeFromCircuit = () => {
    let generatedCode = "// Generated from circuit editor\n";
    circuit.forEach(gate => {
      generatedCode += `${gate.name} ${gate.qubits.join(" ")}\n`;
    });
    return generatedCode;
  };
  
  // Update code when circuit changes
  useEffect(() => {
    if (circuit.length > 0) {
      setCode(generateCodeFromCircuit());
    }
  }, [circuit]);
  
  // Handle drag and drop actions
  const handleDrop = (gate, position) => {
    const { qubit, column } = position;
    
    // Create a new gate with position information
    let newGate;
    
    if (gate.name === 'CNOT' && qubit + 1 < numQubits) {
      // For CNOT, we need two qubits (control and target)
      newGate = {
        ...gate,
        qubits: [qubit, qubit + 1],
        column
      };
    } else {
      // For single qubit gates
      newGate = {
        ...gate,
        qubits: [qubit],
        column
      };
    }
    
    // Add the gate to the circuit
    setCircuit(prev => {
      // Check if there's already a gate at this position
      const existingGateIndex = prev.findIndex(g => 
        g.column === column && g.qubits.includes(qubit)
      );
      
      if (existingGateIndex !== -1) {
        // Replace the existing gate
        const newCircuit = [...prev];
        newCircuit[existingGateIndex] = newGate;
        return newCircuit;
      } else {
        // Add a new gate
        return [...prev, newGate];
      }
    });
  };
  
  // Drag and drop hook
  const { handleDragStart, handleDragOver, handleDrop: onDrop } = useDragDrop((gate, position) => {
    handleDrop(gate, position);
  });
  
  // Handle adding a qubit
  const handleAddQubit = () => {
    setNumQubits(prev => prev + 1);
  };
  
  // Handle removing a qubit
  const handleRemoveQubit = () => {
    if (numQubits > 1) {
      setNumQubits(prev => prev - 1);
      
      // Remove any gates that were on the removed qubit
      setCircuit(prev => prev.filter(gate => {
        return !gate.qubits.includes(numQubits - 1);
      }));
    }
  };
  const handleSimulate = async () => {
    // Use the current circuit for simulation if available, otherwise parse from code
    const gates = circuit.length > 0 
      ? circuit.map(({ name, qubits }) => ({ name, qubits })) 
      : parseCodeToGates(code);
      
    if (!gates.length) return alert("No valid gates found.");

    const body = {
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
  return (
    <div className={`container ${darkMode ? "dark" : ""}`}>
      <h1>Quantum Circuit Simulator</h1>
      
      <div className="layout">
        <div className="toolbox-container">
          <GateToolbox onGateDragStart={handleDragStart} />
        </div>
        
        <div className="main-content">
          <div className="panel">
            <h2>Drag & Drop Circuit Editor</h2>
            <CircuitBoard 
              circuit={circuit}
              numQubits={numQubits}
              onAddQubit={handleAddQubit}
              onRemoveQubit={handleRemoveQubit}
              onDragOver={handleDragOver}
              onDrop={onDrop}
              darkMode={darkMode}
            />
            <div className="buttons">
              <button onClick={handleSimulate}>Simulate Circuit</button>
              <button
                onClick={() => setIsNoisy(!isNoisy)}
                className={isNoisy ? "noisy" : ""}
              >
                {isNoisy ? "Noisy Mode: ON" : "Noisy Mode: OFF"}
              </button>
              <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
            </div>
          </div>
          
          <div className="panel">
            <h2>Quantum Circuit Code</h2>
            <textarea
              rows={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <small>You can also directly edit the code above</small>
          </div>

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
      </div>
    </div>
  );
}
