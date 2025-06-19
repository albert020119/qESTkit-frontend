import React, { useRef, useEffect } from "react";
import NET from "vanta/dist/vanta.net.min";
import * as THREE from "three";
import { useTheme } from "./theme/ThemeContext";
import QuantumSimApp from "./QuantumSimApp";
import { ThemeProvider } from "./theme/ThemeContext";

function VantaBackground() {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    vantaEffect.current = NET({
      el: vantaRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x3f4fff,
      backgroundColor: 0x100215,
      showDots: false
    });
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
        top: 0,
        left: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}

export default function App() {
  const { darkMode } = useTheme() || {};

  return (
    <>
      <ThemeProvider>
  <QuantumSimApp />
</ThemeProvider>
    </>
  );
}
