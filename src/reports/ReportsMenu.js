import React, { useState, useEffect } from 'react';

export default function ReportsMenu({ onCreateReport, onViewReports }) {
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
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

  return (
    <div className="reports-menu" style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "8px 16px",
          borderRadius: "6px",
          border: "none",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        Reports ▼
      </button>
      {showMenu && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "6px",
          minWidth: "150px",
          zIndex: 1000,
          marginTop: "4px"
        }}>
          <button
            onClick={() => {
              onCreateReport();
              setShowMenu(false);
            }}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
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
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              borderRadius: "0 0 6px 6px"
            }}
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
