import React, { useState } from 'react';
import './GateToolbox.css';
import BlochSphere from '../../BlochSphere';

// Utility function to get consistent colors for vectors
const getVectorColor = (index) => {
  const colors = [
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', 
    '#00ff88', '#8888ff', '#ff5555', '#55ff55', '#5599ff'
  ];
  return colors[index % colors.length];
};

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

const GateToolbox = ({ onGateDragStart, qSphereVectors = [] }) => {
  const [isBlochExpanded, setIsBlochExpanded] = useState(false);
  const [activeCircuitView, setActiveCircuitView] = useState('bloch');
  
  // Define available quantum gates based on backend capabilities
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

  const toggleBlochExpansion = () => {
    setIsBlochExpanded(!isBlochExpanded);
  };

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
      
      <div className="bloch-sphere-container">
        <h3>Q-Sphere Visualization</h3>        <div 
          className="bloch-sphere-preview" 
          onClick={toggleBlochExpansion}
          title="Click to expand"
        >
          <BlochSphere basisVectors={qSphereVectors} size="compact" />
        </div>
        <div className="bloch-sphere-hint">
          Click to expand
        </div>
      </div>
      
      {isBlochExpanded && (
        <div className="bloch-sphere-modal-overlay" onClick={toggleBlochExpansion}>
          <div className="bloch-sphere-modal" onClick={e => e.stopPropagation()}>
            <div className="bloch-sphere-modal-header">
              <h3>Q-Sphere Visualization</h3>
              <button className="close-button" onClick={toggleBlochExpansion}>×</button>
            </div>            <div className="bloch-sphere-modal-content">
              <BlochSphere basisVectors={qSphereVectors} size="full" />
              
              <div className="bloch-sphere-modal-footer">
                <div className="tab-buttons">
                  <button 
                    className={`tab-button ${activeCircuitView === 'bloch' ? 'active' : ''}`}
                    onClick={() => setActiveCircuitView('bloch')}
                  >
                    Bloch Representation
                  </button>
                  <button 
                    className={`tab-button ${activeCircuitView === 'circuit' ? 'active' : ''}`}
                    onClick={() => setActiveCircuitView('circuit')}
                  >
                    Circuit Representation
                  </button>
                </div>
                
                <div className="tab-content">
                  {activeCircuitView === 'bloch' && (
                    <div className="bloch-details">
                      <h4>State Vectors</h4>
                      <div className="vector-list">
                        {qSphereVectors.length > 0 ? (
                          qSphereVectors.map((vector, index) => (
                            <div key={index} className="vector-item">
                              <div className="vector-color" style={{ backgroundColor: getVectorColor(index) }}></div>
                              <span>|{vector.state}⟩: {(vector.prob * 100).toFixed(1)}%</span>
                              <span className="vector-coords">
                                x: {vector.x.toFixed(2)}, 
                                y: {vector.y.toFixed(2)}, 
                                z: {vector.z.toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p>Run a simulation to see state vector details</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeCircuitView === 'circuit' && (
                    <div className="circuit-representation">
                      <h4>Mini Circuit Representation</h4>
                      <div className="mini-circuit">
                        {qSphereVectors.length > 0 ? (
                          <div className="circuit-diagram">
                            <div className="circuit-qubits">
                              {Array.from({ length: Math.min(4, Math.log2(Math.max(qSphereVectors.length, 2))) }, (_, i) => (
                                <div key={i} className="circuit-qubit-line">
                                  <div className="qubit-label">q{i}:</div>
                                  <div className="qubit-wire"></div>
                                </div>
                              ))}
                            </div>
                            <div className="circuit-probability-bars">
                              {qSphereVectors.map((vector, idx) => (
                                <div 
                                  key={idx} 
                                  className="probability-bar"
                                  style={{
                                    height: `${vector.prob * 100}%`,
                                    backgroundColor: getVectorColor(idx)
                                  }}
                                >
                                  <span className="bar-label">{vector.state}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p>Run a simulation to see the circuit representation</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateToolbox;
