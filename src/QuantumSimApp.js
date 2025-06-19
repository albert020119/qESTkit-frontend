import React, { useState, useEffect } from "react";
import "./Circuit.css";
import GateToolbox from "./components/GateToolbox/GateToolbox";
import CircuitBoard from "./components/Circuit/CircuitBoard";
import "./components/Circuit/CircuitBoard.css";
import "./components/Circuit/CircuitBoardExtras.css";
import "./components/GateToolbox/GateToolbox.css";
import { useDragDrop } from "./hooks/useDragDrop";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./theme/ThemeContext";

export default function QuantumSimApp() {
  const [code, setCode] = useState("H 0\nCNOT 0 1\n");
  const [results, setResults] = useState(null);
  const [isNoisy, setIsNoisy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Circuit state for drag and drop
  const [numQubits, setNumQubits] = useState(2);
  const [circuit, setCircuit] = useState([]);
  
  // State for gate selection prompts
  const [gatePrompt, setGatePrompt] = useState(null);
  // State to track if we're in "remove gate" mode
  const [removeModeActive, setRemoveModeActive] = useState(false);  const parseCodeToGates = (rawCode) => {
    if (!rawCode || typeof rawCode !== 'string') return [];
    


    const lines = rawCode.split("\n");
    const gates = [];
    
    // Gates that have parameters
    const paramGates = ['Ph', 'Rx', 'Ry', 'Rz'];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//")) continue; // Skip empty lines and comments
      
      const parts = trimmedLine.split(" ").filter(part => part.trim() !== "");
      if (parts.length < 1) continue;
      
      const name = parts[0].toUpperCase();
      if (!name) continue;
      
      // Special handling for gates with parameters
      if (paramGates.includes(name)) {
        if (parts.length < 3) continue; // Need at least gate name, param, and one qubit
        
        const param = parseFloat(parts[1]);
        if (isNaN(param)) continue; // Invalid parameter
        
        const qubits = parts.slice(2).map(Number).filter((q) => Number.isInteger(q) && q >= 0);
        if (qubits.length > 0) {
          gates.push({ 
            name, 
            qubits,
            param,
            hasParam: true
          });
        }
      } else {
        // Standard gates without parameters
        if (parts.length < 2) continue; // Need at least gate name and one qubit
        
        const qubits = parts.slice(1).map(Number).filter((q) => Number.isInteger(q) && q >= 0);
        if (qubits.length > 0) {
          gates.push({ name, qubits });
        }
      }
    }
    return gates;
  };
  // Generate code from circuit
  const generateCodeFromCircuit = () => {
    // Start with an empty string, no marker
    let generatedCode = "";
    circuit.forEach(gate => {
      // Include parameter for gates that have them
      if (gate.hasParam && gate.param !== undefined) {
        generatedCode += `${gate.name} ${gate.param} ${gate.qubits.join(" ")}\n`;
      } else {
        generatedCode += `${gate.name} ${gate.qubits.join(" ")}\n`;
      }
    });
    return generatedCode;
  };
  // Flag to track whether changes are coming from manual edits
  const [isManualEdit, setIsManualEdit] = useState(false);

  // Initialize circuit from code on component mount
  useEffect(() => {
    // Parse the initial code to set up circuit
    const parsedGates = parseCodeToGates(code);
    const processedGates = parsedGates.map((gate, index) => ({
      ...gate,
      column: index
    }));
    setCircuit(processedGates);
  }, []);  // Empty dependency array means this runs once on mount
  // Update code when circuit changes (but only if not from manual edit)
  useEffect(() => {
    if (circuit.length > 0 && !isManualEdit) {
      setCode(generateCodeFromCircuit());
    }
    // We don't reset isManualEdit here anymore
  }, [circuit]);
  // Remove duplicate useEffect
  // Handle drag and drop actions
  const handleDrop = (gate, position) => {
    const { qubit, column } = position;
    
    // For gates with parameters, prompt for parameter value
    if (gate.hasParam) {
      const param = prompt(`Enter ${gate.paramName || 'parameter'} value for ${gate.name} gate:`, '0');
      if (param === null) return; // User cancelled
      
      const paramValue = parseFloat(param);
      if (isNaN(paramValue)) {
        alert("Please enter a valid number for the parameter");
        return;
      }
      
      // Create gate with parameter
      const newGate = {
        ...gate,
        param: paramValue,
        qubits: [qubit],
        column
      };
      
      addGateToCircuit(newGate);
      return;
    }
    
    // If this is a multi-qubit gate that requires selection of control/target qubits
    if ((gate.controlQubits && gate.targetQubits) || gate.name === 'CNOT' || gate.name === 'CZ') {
      // Save the current gate and position for later processing
      setGatePrompt({
        gate,
        position,
        step: 'select-control'
      });
      return;
    }
    
    // For single qubit gates
    const newGate = {
      ...gate,
      qubits: [qubit],
      column
    };
    
    addGateToCircuit(newGate);
  };
  
  // Function to add gate to circuit
  const addGateToCircuit = (newGate) => {
    setCircuit(prev => {
      // Check if there's already a gate at this position
      const existingGateIndex = prev.findIndex(g => 
        g.column === newGate.column && g.qubits.some(q => newGate.qubits.includes(q))
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
  
  // Handle cell click - for selecting control/target qubits or removing gates
  const handleCellClick = (position) => {
    const { qubit, column } = position;
    
    // If we're in gate prompt mode (selecting control/target qubits)
    if (gatePrompt) {
      if (gatePrompt.step === 'select-control') {
        // Update prompt to select target qubit
        setGatePrompt({
          ...gatePrompt,
          controlQubit: qubit,
          step: 'select-target'
        });
      } else if (gatePrompt.step === 'select-target') {
        // Don't allow selecting the same qubit for control and target
        if (qubit === gatePrompt.controlQubit) {
          alert("Control and target qubits must be different");
          return;
        }
        
        // Create the new multi-qubit gate
        const newGate = {
          ...gatePrompt.gate,
          qubits: [gatePrompt.controlQubit, qubit],
          column: gatePrompt.position.column
        };
        
        // Add the new gate
        addGateToCircuit(newGate);
        
        // Clear the prompt
        setGatePrompt(null);
      }
    }
    // If we're in remove mode, remove the gate at this position
    else if (removeModeActive) {
      removeGateAtPosition(position);
    }
  };
  
  // Function to remove gate at a position
  const removeGateAtPosition = (position) => {
    const { qubit, column } = position;
    
    setCircuit(prev => {
      return prev.filter(gate => {
        // Remove gates that have the same column and include this qubit
        return !(gate.column === column && gate.qubits.includes(qubit));
      });
    });
  };
  
  // Toggle remove gate mode
  const toggleRemoveMode = () => {
    setRemoveModeActive(prev => !prev);
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

  // Determine the number of qubits based on the circuit or code
  const allQubits = gates.flatMap((g) => g.qubits);
  const filteredQubits = allQubits.filter((q) => Number.isInteger(q) && q >= 0);
  const numQubits = filteredQubits.length ? Math.max(...filteredQubits) + 1 : 1;

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
              
              // First set the manual edit flag
              setIsManualEdit(true);
              
              // Then update the code
              setCode(newCode);
              
              // Only try to parse valid gate instructions
              if (newCode.trim()) {
                // Process code changes to update the circuit
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
                  // Just ignore parsing errors for incomplete inputs
                  console.log("Parsing in progress...");
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
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
