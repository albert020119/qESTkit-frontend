import React, { useState, useEffect } from 'react';

export default function ReportsMenu({ onCreateReport, onViewReports }) {
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.reports-menu')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // A common style for both menu buttons to keep code DRY
  const menuButtonStyle = {
    width: "100%",
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "block"
  };

  return (
    <div className="reports-menu" style={{ position: "relative", display: "inline-block" }}>      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "10px 20px",
          borderRadius: "6px",
          border: "none",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        Reports ▼
      </button>
      {showMenu && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "6px",
          minWidth: "150px",
          zIndex: 1000,
          marginTop: "4px",
          overflow: "hidden" // Keep this from the previous fix
        }}>
          <button
            onClick={() => {
              onCreateReport();
              setShowMenu(false);
            }}
            style={menuButtonStyle}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#334155"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            Create Report
          </button>
          <button
            onClick={() => {
              onViewReports();
              setShowMenu(false);
            }}
            style={menuButtonStyle}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#334155"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            See Reports
          </button>
        </div>
      )}
    </div>
  );
}