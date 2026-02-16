import React, { useState } from "react";
import "./QrispRunner.css";

const EXAMPLE_SNIPPETS = [
  {
    label: "Bell State",
    description: "Create a 2-qubit Bell state (|00⟩ + |11⟩)/√2",
    code: `import qrisp

qv = qrisp.QuantumVariable(2)
qrisp.h(qv[0])
qrisp.cx(qv[0], qv[1])
result = qv`,
  },
  {
    label: "GHZ State",
    description: "3-qubit GHZ entangled state",
    code: `import qrisp

qv = qrisp.QuantumVariable(3)
qrisp.h(qv[0])
qrisp.cx(qv[0], qv[1])
qrisp.cx(qv[0], qv[2])
result = qv`,
  },
  {
    label: "Superposition",
    description: "Equal superposition of all 3-qubit states",
    code: `import qrisp

qv = qrisp.QuantumVariable(3)
for i in range(3):
    qrisp.h(qv[i])
result = qv`,
  },
  {
    label: "Phase Kickback",
    description: "Demonstrate phase kickback with X and H gates",
    code: `import qrisp

qv = qrisp.QuantumVariable(2)
qrisp.x(qv[1])
qrisp.h(qv[0])
qrisp.h(qv[1])
qrisp.cx(qv[0], qv[1])
qrisp.h(qv[0])
result = qv`,
  },
];

export default function QrispRunner({ darkMode, onQrispCodeChange }) {
  const [code, setCode] = useState(EXAMPLE_SNIPPETS[0].code);
  const [shots, setShots] = useState(1000);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Notify parent of initial code on mount
  React.useEffect(() => {
    if (onQrispCodeChange) onQrispCodeChange(code);
    // eslint-disable-next-line
  }, []);

  const handleRun = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("http://localhost:8000/simulate-qrisp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, shots }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (onQrispCodeChange) onQrispCodeChange(newCode);
  };

  const loadExample = (snippet) => {
    setCode(snippet.code);
    if (onQrispCodeChange) onQrispCodeChange(snippet.code);
    setResults(null);
    setError(null);
    setShowExamples(false);
  };

  // Compute total shots for probability bars
  const totalCounts = results
    ? Object.values(results).reduce((a, b) => a + b, 0)
    : 0;

  // Sort results by bitstring
  const sortedResults = results
    ? Object.entries(results).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="qrisp-runner panel">
      <div className="qrisp-header">
        <div className="qrisp-title-row">
          <h2>
            <span className="qrisp-icon">⚛</span> Qrisp Integration
          </h2>
          <span className="qrisp-badge">Python</span>
        </div>
        <p className="qrisp-subtitle">
          Write Qrisp quantum programs and run them on the qESTkit simulator.
          Assign your output <code>QuantumVariable</code> to{" "}
          <code>result</code>.
        </p>
      </div>

      {/* Examples dropdown */}
      <div className="qrisp-examples-section">
        <button
          className="qrisp-examples-toggle"
          onClick={() => setShowExamples(!showExamples)}
        >
          {showExamples ? "▾" : "▸"} Example Snippets
        </button>
        {showExamples && (
          <div className="qrisp-examples-list">
            {EXAMPLE_SNIPPETS.map((snippet, idx) => (
              <button
                key={idx}
                className="qrisp-example-item"
                onClick={() => loadExample(snippet)}
              >
                <span className="qrisp-example-label">{snippet.label}</span>
                <span className="qrisp-example-desc">
                  {snippet.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Code editor */}
      <div className="qrisp-editor-wrapper">
        <div className="qrisp-editor-header">
          <span className="qrisp-file-tab">
            <span className="qrisp-file-icon">🐍</span> qrisp_program.py
          </span>
        </div>
        <textarea
          className="qrisp-code-editor"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder="# Write your Qrisp code here...&#10;import qrisp&#10;&#10;qv = qrisp.QuantumVariable(2)&#10;qrisp.h(qv[0])&#10;result = qv"
        />
      </div>

      {/* Controls */}
      <div className="qrisp-controls">
        <div className="qrisp-shots-control">
          <label htmlFor="qrisp-shots">Shots:</label>
          <input
            id="qrisp-shots"
            type="number"
            min={1}
            max={100000}
            value={shots}
            onChange={(e) =>
              setShots(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="qrisp-shots-input"
          />
        </div>
        <button
          className={`qrisp-run-btn ${loading ? "loading" : ""}`}
          onClick={handleRun}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <>
              <span className="qrisp-spinner"></span> Running…
            </>
          ) : (
            <>▶ Run on qESTkit</>
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="qrisp-error">
          <span className="qrisp-error-icon">⚠</span>
          <div>
            <strong>Execution Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Results display */}
      {results && (
        <div className="qrisp-results">
          <h3>Measurement Results</h3>
          <div className="qrisp-results-summary">
            <span>
              <strong>{sortedResults.length}</strong> unique states
            </span>
            <span>
              <strong>{totalCounts.toLocaleString()}</strong> total shots
            </span>
          </div>

          <div className="qrisp-probability-bars">
            {sortedResults.map(([state, count]) => {
              const prob = count / totalCounts;
              return (
                <div className="qrisp-prob-row" key={state}>
                  <span className="qrisp-state-label">|{state}⟩</span>
                  <div className="qrisp-bar-container">
                    <div
                      className="qrisp-bar-fill"
                      style={{ width: `${prob * 100}%` }}
                    />
                  </div>
                  <span className="qrisp-prob-value">
                    {(prob * 100).toFixed(1)}%
                  </span>
                  <span className="qrisp-count-value">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
