import React, { useState, useEffect, useRef } from "react";
import "./Circuit.css";
import NET from "vanta/dist/vanta.net.min";
import * as THREE from "three";

// Imports from both branches, deduped and ordered
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./theme/ThemeContext";
import GateToolbox from "./components/GateToolbox/GateToolbox";
import CircuitBoard from "./components/Circuit/CircuitBoard";
import { QasmExporter } from "./converter";
import "./components/Circuit/CircuitBoard.css";
import "./components/Circuit/CircuitBoardExtras.css";
import "./components/GateToolbox/GateToolbox.css";
import { useDragDrop } from "./hooks/useDragDrop";
import Chatbot from "./chatbot/Chatbot";
import { ReportsMenu, CreateReportModal, ViewReportsModal, createReport, getReports } from "./reports";

// ========= Helper functions =========
function getBlochAnglesFromResults(results, qubitIdx = 0) {
  if (!results) return { theta: Math.PI / 4, phi: 0 };
  let shots0 = 0, shots1 = 0, total = 0;
  for (const [state, count] of Object.entries(results)) {
    const bit = state[state.length - 1 - qubitIdx];
    if (bit === "0") shots0 += count;
    else if (bit === "1") shots1 += count;
    total += count;
  }
  if (total === 0) return { theta: Math.PI / 4, phi: 0 };
  const p0 = shots0 / total;
  const theta = Math.acos(2 * p0 - 1);
  return { theta, phi: 0 };
}

function getAllBasisVectors(results, numQubits) {
  if (!results) return [];
  let total = 0;
  for (const count of Object.values(results)) total += count;
  const vectors = [];
  for (let q = 0; q < numQubits; ++q) {
    for (const [state, count] of Object.entries(results)) {
      const bit = state[state.length - 1 - q];
      const prob = count / total;
      const z = bit === "0" ? 1 : -1;
      vectors.push({
        x: 0, y: 0, z, prob, qubit: q, value: bit,
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
    const cleanState = state.replace(/\|/g, '').replace(/\>/g, '');
    const padded = cleanState.padStart(numQubits, "0");
    const bits = padded.split("").map(Number);
    const hamming = bits.reduce((a, b) => a + b, 0);

    let theta, phi;
    if (numQubits === 2) {
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

function VantaBackground() {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    vantaEffect.current = NET({
      el: vantaRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x1e293b,
      backgroundColor: 0x270485
    });
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "fixed", width: "100vw", height: "100vh", top: 0, left: 0, zIndex: -1, pointerEvents: "none" }}>
      <div ref={vantaRef} style={{ width: "100%", height: "100%" }} />
      {/* Overlay for opacity */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          background: "#1e293b", // or transparent
          opacity: 0.96,       // adjust this value for more/less opacity
          pointerEvents: "none"
        }}
      />
    </div>
  );
}

// ========== Main Component ==========
export default function QuantumSimApp() {
  // Theme context
  const { darkMode } = useTheme();

  // State
  const [code, setCode] = useState("H 0\nCNOT 0 1\n");
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);
  const [selectedQubit, setSelectedQubit] = useState(0);

  // Reports state
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showViewReports, setShowViewReports] = useState(false);
  const [reports, setReports] = useState([]);
  
  // QASM Export state
  const [showQasmExport, setShowQasmExport] = useState(false);

  // DnD/circuit state:
  const [numQubits, setNumQubits] = useState(2);
  const [circuit, setCircuit] = useState([]);
  const [gatePrompt, setGatePrompt] = useState(null);
  const [removeModeActive, setRemoveModeActive] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);

  // ======= Parsing and circuit helpers =======
  const parseCodeToGates = (rawCode) => {
    if (!rawCode || typeof rawCode !== 'string') return [];
    const lines = rawCode.split("\n");
    const gates = [];
    const paramGates = ['Ph', 'Rx', 'Ry', 'Rz'];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//")) continue;
      const parts = trimmedLine.split(" ").filter(part => part.trim() !== "");
      if (parts.length < 1) continue;
      const name = parts[0].toUpperCase();
      if (!name) continue;
      if (paramGates.includes(name)) {
        if (parts.length < 3) continue;
        const param = parseFloat(parts[1]);
        if (isNaN(param)) continue;
        const qubits = parts.slice(2).map(Number).filter((q) => Number.isInteger(q) && q >= 0);
        if (qubits.length > 0) {
          gates.push({ name, qubits, param, hasParam: true });
        }
      } else {
        if (parts.length < 2) continue;
        const qubits = parts.slice(1).map(Number).filter((q) => Number.isInteger(q) && q >= 0);
        if (qubits.length > 0) {
          gates.push({ name, qubits });
        }
      }
    }
    return gates;
  };

  const generateCodeFromCircuit = () => {
    let generatedCode = "";
    circuit.forEach(gate => {
      if (gate.hasParam && gate.param !== undefined) {
        generatedCode += `${gate.name} ${gate.param} ${gate.qubits.join(" ")}\n`;
      } else {
        generatedCode += `${gate.name} ${gate.qubits.join(" ")}\n`;
      }
    });
    return generatedCode;
  };

  // ======= Drag-and-drop logic =======
  useEffect(() => {
    const parsedGates = parseCodeToGates(code);
    const processedGates = parsedGates.map((gate, index) => ({
      ...gate,
      column: index
    }));
    setCircuit(processedGates);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (circuit.length > 0 && !isManualEdit) {
      setCode(generateCodeFromCircuit());
    }
    // eslint-disable-next-line
  }, [circuit]);

  const handleDrop = (gate, position) => {
    const { qubit, column } = position;
    if (gate.hasParam) {
      const param = prompt(`Enter ${gate.paramName || 'parameter'} value for ${gate.name} gate:`, '0');
      if (param === null) return;
      const paramValue = parseFloat(param);
      if (isNaN(paramValue)) {
        alert("Please enter a valid number for the parameter");
        return;
      }
      const newGate = {
        ...gate,
        param: paramValue,
        qubits: [qubit],
        column
      };
      addGateToCircuit(newGate);
      return;
    }
    if ((gate.controlQubits && gate.targetQubits) || gate.name === 'CNOT' || gate.name === 'CZ') {
      setGatePrompt({
        gate,
        position,
        step: 'select-control'
      });
      return;
    }
    const newGate = {
      ...gate,
      qubits: [qubit],
      column
    };
    addGateToCircuit(newGate);
  };

  const addGateToCircuit = (newGate) => {
    setCircuit(prev => {
      const existingGateIndex = prev.findIndex(g =>
        g.column === newGate.column && g.qubits.some(q => newGate.qubits.includes(q))
      );
      if (existingGateIndex !== -1) {
        const newCircuit = [...prev];
        newCircuit[existingGateIndex] = newGate;
        return newCircuit;
      } else {
        return [...prev, newGate];
      }
    });
  };

  const handleCellClick = (position) => {
    const { qubit, column } = position;
    if (gatePrompt) {
      if (gatePrompt.step === 'select-control') {
        setGatePrompt({
          ...gatePrompt,
          controlQubit: qubit,
          step: 'select-target'
        });
      } else if (gatePrompt.step === 'select-target') {
        if (qubit === gatePrompt.controlQubit) {
          alert("Control and target qubits must be different");
          return;
        }
        const newGate = {
          ...gatePrompt.gate,
          qubits: [gatePrompt.controlQubit, qubit],
          column: gatePrompt.position.column
        };
        addGateToCircuit(newGate);
        setGatePrompt(null);
      }
    } else if (removeModeActive) {
      removeGateAtPosition(position);
    }
  };

  const removeGateAtPosition = (position) => {
    const { qubit, column } = position;
    setCircuit(prev => {
      return prev.filter(gate => !(gate.column === column && gate.qubits.includes(qubit)));
    });
  };

  const toggleRemoveMode = () => {
    setRemoveModeActive(prev => !prev);
  };
  
  const handleExportToQasm = () => {
    setShowQasmExport(true);
  };

  const { handleDragStart, handleDragOver, handleDrop: onDrop } = useDragDrop((gate, position) => {
    handleDrop(gate, position);
  });

  const handleAddQubit = () => {
    setNumQubits(prev => prev + 1);
  };

  const handleRemoveQubit = () => {
    if (numQubits > 1) {
      setNumQubits(prev => prev - 1);
      setCircuit(prev => prev.filter(gate => {
        return !gate.qubits.includes(numQubits - 1);
      }));
    }
  };

  // ======= Simulation & Bloch Sphere logic =======
  const handleSimulate = async () => {
    const gates = circuit.length > 0
      ? circuit.map(({ name, qubits }) => ({ name, qubits }))
      : parseCodeToGates(code);

    if (!gates.length) return alert("No valid gates found.");

    const allQubits = gates.flatMap((g) => g.qubits);
    const filteredQubits = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
    const simQubits = filteredQubits.length ? Math.max(...filteredQubits) + 1 : 1;

    const body = {
      num_qubits: simQubits,
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

  // For Bloch visualization
  const gates = parseCodeToGates(code);
  const allQubits = gates.flatMap((g) => g.qubits);
  const filtered = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
  const numQubitsForBloch = filtered.length ? Math.max(...filtered) + 1 : 1;

  // Prepare Q-sphere vectors for visualization
  const qSphereVectors = results ? getQSphereVectors(results, numQubitsForBloch) : [];
  
  const blochAngles = getBlochAnglesFromResults(results, selectedQubit);
  // Removed allBlochAngles since we no longer need it
  const allBasisVectors = results ? getAllBasisVectors(results, numQubitsForBloch) : [];

  // Reports functions
  const handleCreateReport = async (code, message) => {
    try {
      await createReport(code, message);
      alert("Report created successfully!");
    } catch (error) {
      alert("Error creating report: " + error.message);
      throw error; // Re-throw so the modal can handle loading state
    }
  };

  const handleViewReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
      setShowViewReports(true);
    } catch (error) {
      alert("Error fetching reports: " + error.message);
    }
  };

  // ===== Render =====
  return (
    <>
      {darkMode && <VantaBackground />}
      <div className={`container ${darkMode ? "dark" : ""}`}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", gap: "12px" }}>
          {/* Reports Menu */}
          <ReportsMenu 
            onCreateReport={() => setShowCreateReport(true)}
            onViewReports={handleViewReports}
          />

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

        {/* Create Report Modal */}
        <CreateReportModal 
          isOpen={showCreateReport}
          onClose={() => setShowCreateReport(false)}
          circuitCode={code}
          onSubmit={handleCreateReport}
        />

        {/* View Reports Modal */}
        <ViewReportsModal 
          isOpen={showViewReports}
          onClose={() => setShowViewReports(false)}
          reports={reports}
        />
        
        {/* QASM Export Modal */}
        <QasmExporter
          isOpen={showQasmExport}
          onClose={() => setShowQasmExport(false)}
          circuit={circuit}
          numQubits={numQubits}
        />

        <h1>Quantum Circuit Simulator</h1>
        <div className="layout">
          <div className="toolbox-container">
            <GateToolbox 
              onGateDragStart={handleDragStart}
              qSphereVectors={qSphereVectors}
            />
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
                onExportQasm={handleExportToQasm}
                onCellClick={(params) => {
                  if (params.cancel) {
                    setGatePrompt(null);
                    return;
                  }
                  if (params.toggleRemove) {
                    toggleRemoveMode();
                    return;
                  }
                  handleCellClick(params);
                }}
                gatePrompt={gatePrompt}
                removeModeActive={removeModeActive}
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
                <ThemeToggle />
              </div>
            </div>

            <div className="panel">
              <h2>Quantum Circuit Code</h2>
              <textarea
                rows={6}
                value={code}
                onChange={(e) => {
                  const newCode = e.target.value;
                  setIsManualEdit(true);
                  setCode(newCode);
                  if (newCode.trim()) {
                    try {
                      const parsedGates = parseCodeToGates(newCode);
                      if (parsedGates.length > 0) {
                        const processedGates = parsedGates.map((gate, index) => ({
                          ...gate,
                          column: index
                        }));
                        setCircuit(processedGates);
                      }
                    } catch (err) {
                      // ignore parse errors
                    }
                  }
                }}
              />
              <small>You can also directly edit the code above</small>
            </div>            {results && (
              <div className="panel">
                <h3>Simulation Results</h3>
                {Object.entries(results).map(([state, count]) => (
                  <div key={state}>
                    {state}: {count}
                  </div>
                ))}
              </div>
            )}

            {/* Chatbot added at the end of the main content */}
            <Chatbot circuitText={code} />
          </div>
        </div>
      </div>
    </>
  );
}