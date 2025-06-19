import React from 'react';
import './GateToolbox.css';

const GateItem = ({ gate, onDragStart }) => {
  // For gates with parameters, display differently
  const hasParam = gate.hasParam;
  
  return (
    <div 
      className={`gate-item ${hasParam ? 'gate-with-param' : ''}`}
      draggable
      onDragStart={() => onDragStart(gate)}
    >
      {gate.name}
      {hasParam && <div className="param-indicator">(θ)</div>}
    </div>
  );
};

const GateToolbox = ({ onGateDragStart }) => {  // Define available quantum gates based on backend capabilities
  const gates = [
    { name: 'H', description: 'Hadamard Gate' },
    { name: 'X', description: 'Pauli-X Gate (NOT)' },
    { name: 'Y', description: 'Pauli-Y Gate' },
    { name: 'Z', description: 'Pauli-Z Gate' },
    { name: 'S', description: 'Phase Gate (π/2)' },
    { name: 'T', description: 'T Gate (π/4)' },
    { name: 'CNOT', description: 'Controlled NOT Gate', controlQubits: 1, targetQubits: 1 },
    { name: 'CZ', description: 'Controlled Z Gate', controlQubits: 1, targetQubits: 1 },
    { name: 'Identity', description: 'Identity Gate (I)' },
    { name: 'Ph', description: 'Phase Gate', hasParam: true, paramName: 'angle' },
    { name: 'Rx', description: 'X-Rotation', hasParam: true, paramName: 'angle' },
    { name: 'Ry', description: 'Y-Rotation', hasParam: true, paramName: 'angle' },
    { name: 'Rz', description: 'Z-Rotation', hasParam: true, paramName: 'angle' },
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
