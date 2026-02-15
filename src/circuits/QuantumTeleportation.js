// Quantum Teleportation example circuit
// Exports an object with a `name` and a `code` string in the project's plaintext gate format

const QuantumTeleportation = {
  name: 'Quantum Teleportation',
  code: `X 0
H 1
CNOT 1 2
CNOT 0 1
H 0
X 2
Z 2
`
};

export default QuantumTeleportation;
