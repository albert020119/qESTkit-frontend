import React from "react";
import QuantumSimApp from "./QuantumSimApp";
import { ThemeProvider } from "./theme/ThemeContext";
import "./theme/themes.css"; 

export default function App() {
  return (
    <ThemeProvider>
      <QuantumSimApp />
    </ThemeProvider>
  );
}
