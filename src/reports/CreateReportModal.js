import React, { useState } from 'react';

export default function CreateReportModal({ isOpen, onClose, circuitCode, onSubmit }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(circuitCode, message);
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

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
        width: "500px",
        maxWidth: "90vw"
      }}>
        <h3 style={{ color: "white", marginTop: 0 }}>Create Report</h3>
        
        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "white", display: "block", marginBottom: "8px" }}>
            Current Circuit Code:
          </label>
          <textarea
            value={circuitCode}
            readOnly
            style={{
              width: "100%",
              height: "100px",
              backgroundColor: "#334155",
              color: "#94a3b8",
              border: "1px solid #475569",
              borderRadius: "6px",
              padding: "8px",
              fontFamily: "monospace",
              resize: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "white", display: "block", marginBottom: "8px" }}>
            Your Message:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your report message..."
            style={{
              width: "100%",
              height: "80px",
              backgroundColor: "#334155",
              color: "white",
              border: "1px solid #475569",
              borderRadius: "6px",
              padding: "8px",
              resize: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={handleClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            style={{
              padding: "8px 16px",
              backgroundColor: isSubmitting ? "#6b7280" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isSubmitting ? "not-allowed" : "pointer"
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
