import { Circuit, Gate } from "../components/Circuit";

const GroverSearch = {
  name: "Grover's Search (Find 11)",
  code: `H 0
H 1
CZ 0 1
H 0
H 1
X 0
X 1
CZ 0 1
X 0
X 1
H 0
H 1
`
};

export default GroverSearch;