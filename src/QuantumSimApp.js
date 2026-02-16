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
import QrispRunner from "./qrisp/QrispRunner";
import QuantumTeleportation from "./circuits/QuantumTeleportation";
import TeleportationBranch00 from "./circuits/TeleportationBranch00";
import TeleportationBranch01 from "./circuits/TeleportationBranch01";
import TeleportationBranch10 from "./circuits/TeleportationBranch10";
import TeleportationBranch11 from "./circuits/TeleportationBranch11";
import BellState from "./circuits/BellState";
import Deutsch from "./circuits/Deutsch";
import DeutschConstant from "./circuits/DeutschConstant";
import SuperdenseCoding from "./circuits/SuperdenseCoding";
import { GroverSearch } from "./circuits";

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
    const initializeVanta = () => {
      if (!vantaEffect.current) {
        vantaEffect.current = NET({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x1e293b,
          backgroundColor: 0x270485,
        });
      }
    };

    initializeVanta();

    const interval = setInterval(() => {
      if (!vantaEffect.current) {
        initializeVanta();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
        top: 0,
        left: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
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
          opacity: 0.96, // adjust this value for more/less opacity
          pointerEvents: "none",
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
  const [noiseProfile, setNoiseProfile] = useState('custom');

  // Reports state
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showViewReports, setShowViewReports] = useState(false);
  const [reports, setReports] = useState([]);
  
  // QASM Export state
  const [showQasmExport, setShowQasmExport] = useState(false);
  const [showCircuitLibrary, setShowCircuitLibrary] = useState(false);

  // DnD/circuit state:
  const [numQubits, setNumQubits] = useState(2);
  const [circuit, setCircuit] = useState([]);
  const [gatePrompt, setGatePrompt] = useState(null);
  const [removeModeActive, setRemoveModeActive] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);

  // ======= Qrisp code parser =======
  const parseQrispToGates = (qrispCode) => {
    if (!qrispCode || typeof qrispCode !== 'string') return [];

    const gates = [];

    // Gate name mapping: qrisp function name → circuit gate name
    const GATE_MAP = {
      'h': 'H', 'x': 'X', 'y': 'Y', 'z': 'Z',
      's': 'S', 't': 'T',
      'cx': 'CNOT', 'cz': 'CZ',
      'rx': 'RX', 'ry': 'RY', 'rz': 'RZ',
      'p': 'PH', 'ph': 'PH',
      'id': 'I', 'swap': 'SWAP',
    };
    const PARAM_GATES = new Set(['rx', 'ry', 'rz', 'p', 'ph']);
    const TWO_QUBIT_GATES = new Set(['cx', 'cz', 'swap']);

    // Expand simple for-loops: "for i in range(n):" followed by indented body
    const expandLoops = (code) => {
      const lines = code.split('\n');
      const expanded = [];
      let i = 0;
      while (i < lines.length) {
        const forMatch = lines[i].match(/^\s*for\s+(\w+)\s+in\s+range\((\d+)\)\s*:/);
        if (forMatch) {
          const varName = forMatch[1];
          const count = parseInt(forMatch[2]);
          // Collect indented body lines
          const body = [];
          i++;
          while (i < lines.length && (lines[i].match(/^\s{2,}/) || lines[i].match(/^\t/))) {
            body.push(lines[i]);
            i++;
          }
          // Expand the loop
          for (let val = 0; val < count; val++) {
            for (const bodyLine of body) {
              // Replace loop variable references like qv[i] with qv[val]
              const replaced = bodyLine.replace(
                new RegExp(`\\[\\s*${varName}\\s*\\]`, 'g'),
                `[${val}]`
              );
              expanded.push(replaced.trim());
            }
          }
        } else {
          expanded.push(lines[i]);
          i++;
        }
      }
      return expanded.join('\n');
    };

    const expandedCode = expandLoops(qrispCode);
    const lines = expandedCode.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('import') ||
          trimmed.startsWith('from') || trimmed.startsWith('result')) continue;

      // Match: qrisp.gate(param, qv[i], qv[j]) or qrisp.gate(qv[i], qv[j]) or qrisp.gate(qv[i])
      const gateMatch = trimmed.match(/qrisp\.(\w+)\((.+)\)/);
      if (!gateMatch) continue;

      const funcName = gateMatch[1].toLowerCase();
      const argsStr = gateMatch[2];

      // Skip QuantumVariable declarations
      if (funcName === 'quantumvariable') continue;

      const gateName = GATE_MAP[funcName];
      if (!gateName) continue;

      // Extract qubit indices from qv[n] patterns
      const qubitMatches = [...argsStr.matchAll(/\w+\[(\d+)\]/g)];
      const qubits = qubitMatches.map(m => parseInt(m[1]));

      if (qubits.length === 0) continue;

      if (PARAM_GATES.has(funcName)) {
        // Extract parameter (first argument before qv[...])
        const paramMatch = argsStr.match(/^\s*([\d.eE+\-*/()piPI]+)/);
        let paramValue = 0;
        if (paramMatch) {
          try {
            // Handle pi references
            const paramStr = paramMatch[1]
              .replace(/\bpi\b/gi, String(Math.PI))
              .replace(/\bnp\.pi\b/gi, String(Math.PI))
              .replace(/\bmath\.pi\b/gi, String(Math.PI));
            paramValue = Function('"use strict"; return (' + paramStr + ')')();
          } catch { paramValue = 0; }
        }
        gates.push({ name: gateName, qubits, param: paramValue, hasParam: true });
      } else if (TWO_QUBIT_GATES.has(funcName)) {
        if (qubits.length >= 2) {
          gates.push({ name: gateName, qubits: qubits.slice(0, 2) });
        }
      } else {
        gates.push({ name: gateName, qubits: [qubits[0]] });
      }
    }

    return gates;
  };

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
    setCircuit((prev) => {
      const existingGateIndex = prev.findIndex(
        (g) =>
          g.column === newGate.column &&
          g.qubits.some((q) => newGate.qubits.includes(q))
      );
      let newCircuit;
      if (existingGateIndex !== -1) {
        newCircuit = [...prev];
        newCircuit[existingGateIndex] = newGate;
      } else {
        newCircuit = [...prev, newGate];
      }
      setCode(generateCodeFromCircuit(newCircuit)); // Update the code state
      return newCircuit;
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
    setCircuit((prev) => {
      const newCircuit = prev.filter(
        (gate) => !(gate.column === column && gate.qubits.includes(qubit))
      );
      setCode(generateCodeFromCircuit(newCircuit)); // Update the code state
      return newCircuit;
    });
  };

  const toggleRemoveMode = () => {
    setRemoveModeActive(prev => !prev);
  };
  
  const handleExportToQasm = () => {
    setShowQasmExport(true);
  };

  const handleLoadLibraryCircuit = (circuitCode) => {
    if (!circuitCode) return;
    setIsManualEdit(true);
    setCode(circuitCode);
    const parsed = parseCodeToGates(circuitCode);
    const processed = parsed.map((g, i) => ({ ...g, column: i }));
    setCircuit(processed);
    // adjust numQubits based on parsed gates
    const allQ = parsed.flatMap(g => g.qubits);
    const maxQ = allQ.length ? Math.max(...allQ) + 1 : 1;
    setNumQubits(Math.max(numQubits, maxQ));
    setShowCircuitLibrary(false);
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
      ? circuit.map(({ name, qubits, param }) => ({ 
          name, 
          qubits, 
          ...(param !== undefined ? { param } : {})
        }))
      : parseCodeToGates(code);

    if (!gates.length) return alert("No valid gates found.");

    const allQubits = gates.flatMap((g) => g.qubits);
    const filteredQubits = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
    const simQubits = filteredQubits.length ? Math.max(...filteredQubits) + 1 : 1;

    const body = {
      num_qubits: simQubits,
      gates,
      num_simulations: 1000,
      ...(isNoisy && noiseProfile === 'custom' && {
        gate_error_prob: 0.05,
        measurement_error_prob: 0.1
      }),
      ...(isNoisy && noiseProfile === 'ibm_kyiv' && {
        gate_error_prob: 0.008,
        measurement_error_prob: 0.01
      }),
      ...(isNoisy && noiseProfile === 'ibm_brisbane' && {
        gate_error_prob: 0.012,
        measurement_error_prob: 0.02
      })
    };

    const endpoint = isNoisy ? "/simulate-noisy" : "/simulate";
    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

        {/* Circuit Library dropdown */}
        {showCircuitLibrary && (
          <div style={{ position: 'absolute', right: 24, top: 88, zIndex: 60 }}>
            <div style={{
              width: 280,
              maxHeight: 350,
              overflowY: 'auto',
              background: darkMode ? '#0b1220' : '#ffffff',
              color: darkMode ? '#e6eef8' : '#0b1220',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              padding: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 8px 12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <strong style={{ fontSize: '0.95em' }}>Circuit Library</strong>
                <button onClick={() => setShowCircuitLibrary(false)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
              </div>
              
              <div style={{ padding: '8px 0' }}>

                <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.9em', color: darkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Deutsch's Algorithm
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button style={{ textAlign: 'left', padding: '10px 24px', borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.95em' }} onMouseEnter={(e) => e.target.style.background = darkMode ? '#1e293b' : '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'transparent'} onClick={() => handleLoadLibraryCircuit(Deutsch.code)}>
                    Balanced Oracle
                  </button>
                  <button style={{ textAlign: 'left', padding: '10px 24px', borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.95em' }} onMouseEnter={(e) => e.target.style.background = darkMode ? '#1e293b' : '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'transparent'} onClick={() => handleLoadLibraryCircuit(DeutschConstant.code)}>
                  Constant Oracle
                  </button>
                </div>

                <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.9em', color: darkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Superdense Coding
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button style={{ textAlign: 'left', padding: '10px 24px', borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.95em' }} onMouseEnter={(e) => e.target.style.background = darkMode ? '#1e293b' : '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'transparent'} onClick={() => handleLoadLibraryCircuit(SuperdenseCoding.code)}>
                    Superdense Coding
                  </button>
                </div>

                <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.9em', color: darkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Grover's Search
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button style={{ textAlign: 'left', padding: '10px 24px', borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.95em' }} onMouseEnter={(e) => e.target.style.background = darkMode ? '#1e293b' : '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'transparent'} onClick={() => handleLoadLibraryCircuit(GroverSearch.code)}>
                    Grover's Search (Find 11)
                  </button>
                </div>

                <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.9em', color: darkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3-Qubit Entanglement
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button
                    style={{ textAlign: 'left', padding: '10px 24px', borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.95em' }}
                    onMouseEnter={(e) => e.target.style.background = darkMode ? '#1e293b' : '#f1f5f9'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    onClick={() => handleLoadLibraryCircuit(BellState.code)}
                  >
                    3-Qubit Entanglement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                onOpenLibrary={() => setShowCircuitLibrary(true)}
              />
              <div className="buttons">
                <button onClick={handleSimulate}>Simulate Circuit</button>
                <button
                  onClick={() => setIsNoisy(!isNoisy)}
                  className={isNoisy ? "noisy" : ""}
                >
                  {isNoisy ? `Noisy Mode: ON (${noiseProfile === 'custom' ? 'Custom' : noiseProfile})` : "Noisy Mode: OFF"}
                </button>
                {isNoisy && (
                  <select
                    value={noiseProfile}
                    onChange={(e) => setNoiseProfile(e.target.value)}
                    style={{
                      marginLeft: "12px",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      backgroundColor: darkMode ? "#1e293b" : "#fff",
                      color: darkMode ? "#e6eef8" : "#000",
                    }}
                  >
                    <option value="custom">Custom Lab Model</option>
                    <option value="ibm_kyiv">IBM Kyiv</option>
                    <option value="ibm_brisbane">IBM Brisbane</option>
                  </select>
                )}
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

            </div>
            {results && (
              <div className="panel">
                <h3>Simulation Results</h3>
                {Object.entries(results).map(([state, count]) => (
                  <div key={state}>
                    {state}: {count}
                  </div>
                ))}
                {/* Bell state entanglement message */}
                {(() => {
                  // Check if the loaded circuit is the Bell state
                  const bellStateCode = `H 0\nCNOT 0 1\nCNOT 0 2\n`;
                  if (code === bellStateCode) {
                    // Find the most frequent result
                    const entries = Object.entries(results);
                    if (entries.length > 0) {
                      const [maxState, maxCount] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
                      // For 3 qubits: 000, for 2 qubits: 00
                      if (maxState === "000" || maxState === "00") {
                        return (
                          <div style={{ marginTop: 12, color: '#22c55e', fontWeight: 600 }}>
                            Alice and Bob both measured 0 (state {maxState}): entanglement confirmed!
                          </div>
                        );
                      }
                    }
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Qrisp Integration Panel */}
            <QrispRunner
              darkMode={darkMode}
              onQrispCodeChange={(qrispCode) => {
                const parsedGates = parseQrispToGates(qrispCode);
                if (parsedGates.length > 0) {
                  const processedGates = parsedGates.map((gate, index) => ({
                    ...gate,
                    column: index,
                  }));
                  setCircuit(processedGates);
                  // Update the text code from parsed gates
                  let generatedCode = '';
                  processedGates.forEach((gate) => {
                    if (gate.hasParam && gate.param !== undefined) {
                      generatedCode += `${gate.name} ${gate.param} ${gate.qubits.join(' ')}\n`;
                    } else {
                      generatedCode += `${gate.name} ${gate.qubits.join(' ')}\n`;
                    }
                  });
                  setIsManualEdit(true);
                  setCode(generatedCode);
                  // Update numQubits based on parsed gates
                  const allQ = parsedGates.flatMap((g) => g.qubits);
                  const maxQ = allQ.length ? Math.max(...allQ) + 1 : 1;
                  setNumQubits((prev) => Math.max(prev, maxQ));
                } else {
                  // Clear circuit if no gates parsed
                  setCircuit([]);
                  setIsManualEdit(true);
                  setCode('');
                }
              }}
            />

            {/* Chatbot added at the end of the main content */}
            <Chatbot circuitText={code} />
          </div>
        </div>
      </div>
    </>
  );
}