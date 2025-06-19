import React from 'react';
import './GateToolbox.css';

const GateItem = ({ gate, onDragStart }) => {
  return (
    <div 
      className="gate-item"
      draggable
      onDragStart={() => onDragStart(gate)}
    >
      {gate.name}
    </div>
  );
};

const GateToolbox = ({ onGateDragStart }) => {
  // Define available quantum gates
  const gates = [
    { name: 'H', description: 'Hadamard Gate' },
    { name: 'X', description: 'Pauli-X Gate (NOT)' },
    { name: 'Y', description: 'Pauli-Y Gate' },
    { name: 'Z', description: 'Pauli-Z Gate' },
    { name: 'CNOT', description: 'Controlled NOT Gate', controlQubits: 1, targetQubits: 1 },
    { name: 'T', description: 'T Gate' },
    { name: 'S', description: 'S Gate' },
    { name: 'SWAP', description: 'Swap Gate', controlQubits: 1, targetQubits: 1 },
  ];

  return (
    <div className="gate-toolbox">
      <h3>Quantum Gates</h3>
      <div className="gate-list">
        {gates.map((gate, index) => (
          <GateItem 
            key={index} 
            gate={gate} 
            onDragStart={onGateDragStart} 
          />
        ))}
      </div>
      <div className="toolbox-instructions">
        <p>Drag gates to the circuit</p>
      </div>
    </div>
  );
};

export default GateToolbox;
