import React from "react";
import QuantumSimApp from "./QuantumSimApp";
import { ThemeProvider } from "./theme/ThemeContext";
import "./theme/themes.css"; // ✅ make sure this line is here

export default function App() {
  return (
    <ThemeProvider>
      <QuantumSimApp />
    </ThemeProvider>
  );
}
