import React from 'react';
import './CircuitBoard.css';

const CircuitBoard = ({ 
  circuit, 
  numQubits, 
  onAddGate, 
  onAddQubit, 
  onRemoveQubit,
  onDragOver, 
  onDrop,
  onCellClick,
  gatePrompt,
  removeModeActive,
  darkMode 
}) => {  // Generate a 2D grid representing the circuit
  const generateCircuitGrid = () => {
    const grid = [];
    const columns = 10; // Maximum columns for gates
    
    // Initialize the grid with empty cells
    for (let q = 0; q < numQubits; q++) {
      grid[q] = [];
      for (let c = 0; c < columns; c++) {
        grid[q].push({ isEmpty: true, column: c, qubit: q });
      }
    }
    
    // Place gates on the grid
    circuit.forEach(gate => {
      const { column, qubits } = gate;
      
      // For multi-qubit gates, mark intermediate cells
      if (qubits.length > 1) {
        const [minQubit, maxQubit] = [Math.min(...qubits), Math.max(...qubits)];
        
        // Fill all cells between control and target with wire info
        for (let q = minQubit; q <= maxQubit; q++) {
          if (q < numQubits && column < columns) {
            if (qubits.includes(q)) {
              grid[q][column] = { ...gate, isEmpty: false, qubit: q };
            } else {
              // This is a wire cell between control and target
              grid[q][column] = { 
                isEmpty: false, 
                isWire: true, 
                column, 
                qubit: q,
                name: gate.name,
                qubits: gate.qubits
              };
            }
          }
        }
      } else {
        // Single qubit gates
        qubits.forEach(qubit => {
          if (qubit < numQubits && column < columns) {
            grid[qubit][column] = { ...gate, isEmpty: false, qubit };
          }
        });
      }
    });
    
    return grid;
  };
  
  const grid = generateCircuitGrid();
  const renderGate = (cell) => {
    if (cell.isEmpty) return null;
    
    // Handle wire cells between control and target
    if (cell.isWire) {
      return (
        <div className="gate-cell gate-wire"></div>
      );
    }
    
    if ((cell.name === 'CNOT' || cell.name === 'SWAP') && cell.qubits.length === 2) {
      const [control, target] = cell.qubits;
      
      if (cell.qubit === control) {
        return (
          <div className={`gate-cell ${cell.name.toLowerCase()}-control`}>
            {cell.name === 'CNOT' ? '●' : '×'}
            <div className="connection-indicator" data-role="control" />
          </div>
        );
      } else if (cell.qubit === target) {
        return (
          <div className={`gate-cell ${cell.name.toLowerCase()}-target`}>
            {cell.name === 'CNOT' ? '⊕' : '×'}
            <div className="connection-indicator" data-role="target" />
          </div>
        );
      }
    }
    
    return (
      <div className="gate-cell">
        {cell.name}
      </div>
    );
  };  // Function to render connection line between control and target qubits
  const renderConnections = () => {
    return circuit
      .filter(gate => gate.qubits.length > 1)
      .map((gate, idx) => {
        const [controlQubit, targetQubit] = gate.qubits;
        
        // Ensure qubits are sorted so we always draw from top to bottom
        const [topQubit, bottomQubit] = [
          Math.min(controlQubit, targetQubit),
          Math.max(controlQubit, targetQubit)
        ];
        const distance = bottomQubit - topQubit;
        
        if (distance <= 1) return null; // Adjacent qubits don't need extra line
        
        // Create a vertical connection line
        return (
          <div 
            key={`connection-${idx}`}
            className="gate-connection"
            style={{
              left: `${60 * gate.column + 30}px`,
              top: `${60 * topQubit + 30}px`,
              height: `${60 * distance}px`,
              width: '2px'
            }}
          />
        );
      });
  };
  
  // Determine the cell class based on state
  const getCellClass = (cell, rowIdx, colIdx) => {
    let classes = `circuit-cell ${cell.isEmpty ? 'empty' : ''}`;
    
    // If we're in remove mode, add remove-mode class to non-empty cells
    if (removeModeActive && !cell.isEmpty) {
      classes += ' remove-mode';
    }
    
    // If we're selecting control qubit, add the control-select class
    if (gatePrompt && gatePrompt.step === 'select-control') {
      classes += ' control-select';
    }
    
    // If we're selecting target qubit, add the target-select class to cells that are not the control
    if (gatePrompt && gatePrompt.step === 'select-target' && rowIdx !== gatePrompt.controlQubit) {
      classes += ' target-select';
    }
    
    return classes;
  };

  return (
    <div className={`circuit-board ${darkMode ? 'dark' : ''}`}>
      {/* Gate selection prompt */}
      {gatePrompt && (
        <div className="gate-prompt">
          {gatePrompt.step === 'select-control' ? (
            <span>Select a control qubit for the {gatePrompt.gate.name} gate</span>
          ) : (
            <span>Select a target qubit for the {gatePrompt.gate.name} gate</span>
          )}
          <button onClick={() => onCellClick({ cancel: true })}>Cancel</button>
        </div>
      )}
      
      {/* Qubit control buttons */}
      <div className="qubit-controls">
        <button className="add-qubit-btn" onClick={onAddQubit}>
          + Add Qubit
        </button>
        {numQubits > 1 && (
          <button className="remove-qubit-btn" onClick={onRemoveQubit}>
            - Remove Qubit
          </button>
        )}
        <button 
          className={`remove-gate-btn ${removeModeActive ? 'active' : ''}`} 
          onClick={() => onCellClick({ toggleRemove: true })}
        >
          {removeModeActive ? 'Cancel Remove' : 'Remove Gate'}
        </button>
      </div>
      
      {/* Circuit grid */}
      <div className="circuit-grid">
        {/* Qubit labels */}
        <div className="qubit-labels">
          {Array.from({ length: numQubits }).map((_, q) => (
            <div key={`label-${q}`} className="qubit-label">
              q[{q}]
            </div>
          ))}
        </div>
          {/* Circuit cells */}
        <div className="circuit-cells">
          {/* Connection lines between control and target */}
          {renderConnections()}
          
          {grid.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="circuit-row">
              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={getCellClass(cell, rowIndex, colIndex)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, { qubit: rowIndex, column: colIndex })}
                  onClick={() => onCellClick({ qubit: rowIndex, column: colIndex })}
                >
                  {renderGate(cell)}
                  {!cell.isEmpty && removeModeActive && (
                    <div className="remove-gate-icon">×</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CircuitBoard;
