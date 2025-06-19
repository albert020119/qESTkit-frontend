import React, { useState, useEffect } from 'react';
import { convertToQasm } from './QasmConverter';
import './QasmExporter.css';

/**
 * QasmExporter component - Shows a modal with the QASM code
 * 
 * @param {Object} props
 * @param {Array} props.circuit - Array of gate objects 
 * @param {Number} props.numQubits - Number of qubits in circuit
 * @param {Boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 */
const QasmExporter = ({ circuit, numQubits, isOpen, onClose }) => {
  const [qasmCode, setQasmCode] = useState('');
  
  useEffect(() => {
    if (isOpen && circuit) {
      const code = convertToQasm(circuit, numQubits);
      setQasmCode(code);
    }
  }, [isOpen, circuit, numQubits]);

  if (!isOpen) return null;

  return (
    <div className="qasm-exporter-modal">
      <div className="qasm-exporter-content">
        <div className="qasm-exporter-header">
          <h2>OpenQASM 2.0 Export</h2>
          <button className="qasm-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="qasm-exporter-body">
          <pre className="qasm-code">{qasmCode}</pre>
        </div>
        <div className="qasm-exporter-footer">
          <button
            className="qasm-copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(qasmCode);
              alert('QASM code copied to clipboard!');
            }}
          >
            Copy to Clipboard
          </button>
          <button className="qasm-close-btn-footer" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default QasmExporter;
