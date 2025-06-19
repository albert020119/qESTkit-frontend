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
  darkMode 
}) => {
  // Generate a 2D grid representing the circuit
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
      
      qubits.forEach(qubit => {
        if (qubit < numQubits && column < columns) {
          grid[qubit][column] = { ...gate, isEmpty: false };
        }
      });
    });
    
    return grid;
  };
  
  const grid = generateCircuitGrid();
  
  const renderGate = (cell) => {
    if (cell.isEmpty) return null;
    
    if (cell.name === 'CNOT' && cell.qubits.length === 2) {
      const [control, target] = cell.qubits;
      
      if (cell.qubit === control) {
        return (
          <div className="gate-cell cnot-control">
            ●
          </div>
        );
      } else if (cell.qubit === target) {
        return (
          <div className="gate-cell cnot-target">
            ⊕
          </div>
        );
      } else {
        return (
          <div className="gate-cell cnot-wire"></div>
        );
      }
    }
    
    return (
      <div className="gate-cell">
        {cell.name}
      </div>
    );
  };

  return (
    <div className={`circuit-board ${darkMode ? 'dark' : ''}`}>
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
          {grid.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="circuit-row">
              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`circuit-cell ${cell.isEmpty ? 'empty' : ''}`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, { qubit: rowIndex, column: colIndex })}
                >
                  {renderGate(cell)}
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
