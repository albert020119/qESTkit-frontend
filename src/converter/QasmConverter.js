/**
 * QasmConverter.js
 * 
 * Utility to convert circuit gates to OpenQASM format
 */

/**
 * Converts a quantum circuit to OpenQASM 2.0 format
 * @param {Array} circuit - Array of gate objects 
 * @param {Number} numQubits - Number of qubits in the circuit
 * @returns {String} - OpenQASM 2.0 representation of the circuit
 */
export const convertToQasm = (circuit, numQubits) => {
  // Start with QASM header
  let qasmCode = 'OPENQASM 2.0;\n';
  qasmCode += 'include "qelib1.inc";\n\n';
  
  // Declare quantum register
  qasmCode += `qreg q[${numQubits}];\n`;
  
  // Add classical register for measurement (if needed)
  qasmCode += `creg c[${numQubits}];\n\n`;
  
  // Sort gates by column to maintain order
  const sortedCircuit = [...circuit].sort((a, b) => a.column - b.column);
  
  // Convert each gate
  sortedCircuit.forEach(gate => {
    const { name, qubits, param, hasParam } = gate;
    
    // Handle different gate types
    switch (name.toUpperCase()) {
      case 'H':
        qasmCode += `h q[${qubits[0]}];\n`;
        break;
      case 'X':
        qasmCode += `x q[${qubits[0]}];\n`;
        break;
      case 'Y':
        qasmCode += `y q[${qubits[0]}];\n`;
        break;
      case 'Z':
        qasmCode += `z q[${qubits[0]}];\n`;
        break;
      case 'S':
        qasmCode += `s q[${qubits[0]}];\n`;
        break;
      case 'SDAG':
        qasmCode += `sdg q[${qubits[0]}];\n`;
        break;
      case 'T':
        qasmCode += `t q[${qubits[0]}];\n`;
        break;
      case 'TDAG':
        qasmCode += `tdg q[${qubits[0]}];\n`;
        break;
      case 'CNOT':
        if (qubits.length === 2) {
          qasmCode += `cx q[${qubits[0]}], q[${qubits[1]}];\n`;
        }
        break;
      case 'CZ':
        if (qubits.length === 2) {
          qasmCode += `cz q[${qubits[0]}], q[${qubits[1]}];\n`;
        }
        break;
      case 'SWAP':
        if (qubits.length === 2) {
          qasmCode += `swap q[${qubits[0]}], q[${qubits[1]}];\n`;
        }
        break;
      case 'CSWAP':
        if (qubits.length === 3) {
          qasmCode += `cswap q[${qubits[0]}], q[${qubits[1]}], q[${qubits[2]}];\n`;
        }
        break;
      case 'CCNOT':
      case 'TOFFOLI':
        if (qubits.length === 3) {
          qasmCode += `ccx q[${qubits[0]}], q[${qubits[1]}], q[${qubits[2]}];\n`;
        }
        break;
      case 'RX':
        if (hasParam !== undefined && param !== undefined) {
          qasmCode += `rx(${param}) q[${qubits[0]}];\n`;
        }
        break;
      case 'RY':
        if (hasParam !== undefined && param !== undefined) {
          qasmCode += `ry(${param}) q[${qubits[0]}];\n`;
        }
        break;
      case 'RZ':
        if (hasParam !== undefined && param !== undefined) {
          qasmCode += `rz(${param}) q[${qubits[0]}];\n`;
        }
        break;
      case 'PH':
      case 'PHASE':
        if (hasParam !== undefined && param !== undefined) {
          // Phase gate in QASM is called p
          qasmCode += `p(${param}) q[${qubits[0]}];\n`;
        }
        break;
      default:
        // Unknown gate - add as a comment
        qasmCode += `// Unsupported gate: ${name} ${qubits.join(' ')}\n`;
        break;
    }
  });
  
  // Add measurement operations for all qubits
  qasmCode += '\n// Add measurements if needed\n';
  qasmCode += '// Example: measure all qubits\n';
  
  for (let i = 0; i < numQubits; i++) {
    qasmCode += `// measure q[${i}] -> c[${i}];\n`;
  }
  
  return qasmCode;
};
