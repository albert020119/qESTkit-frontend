import React from 'react';

export default function ViewReportsModal({ isOpen, onClose, reports }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: "#1e293b",
        padding: "24px",
        borderRadius: "12px",
        width: "700px",
        maxWidth: "90vw",
        maxHeight: "80vh",
        overflow: "auto"
      }}>
        <h3 style={{ color: "white", marginTop: 0 }}>All Reports</h3>
        
        {reports.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No reports found.</p>
        ) : (
          <div style={{ marginBottom: "16px" }}>
            {reports.map((report, index) => (
              <div key={report.id || index} style={{
                backgroundColor: "#334155",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "12px"
              }}>
                <div style={{ marginBottom: "8px" }}>
                  <strong style={{ color: "white" }}>Message:</strong>
                  <p style={{ color: "#94a3b8", margin: "4px 0" }}>{report.message}</p>
                </div>
                <div>
                  <strong style={{ color: "white" }}>Code:</strong>
                  <pre style={{
                    backgroundColor: "#1e293b",
                    color: "#94a3b8",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    margin: "4px 0"
                  }}>{report.code}</pre>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
