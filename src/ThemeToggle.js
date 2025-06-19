import React from "react";
import { useTheme } from "./theme/ThemeContext";

export default function ThemeToggle() {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <button onClick={() => setDarkMode(!darkMode)}>
      {darkMode ? "Dark Mode: ON" : "Light Mode: ON"}
    </button>
  );
}
