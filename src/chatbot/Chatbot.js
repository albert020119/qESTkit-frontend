import React, { useState, useRef, useEffect } from "react";
import "../Circuit.css";

export default function Chatbot({ circuitText }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hello! How can I help you with quantum circuits?" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleAttachCode = () => {
    if (circuitText) {
      setInput(input + (input && !input.endsWith(" ") ? " " : "") + circuitText);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { from: "user", text: input }]);
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { from: "bot", text: "I'm just a demo bot. Ask me anything!" },
      ]);
    }, 500);
    setInput("");
  };

  return (
    <div>
      {!open && (
        <button
          className="chatbot-fab"
          onClick={() => setOpen(true)}
          title="Chat with Quantum Assistant"
        >
          <span role="img" aria-label="chat">
            💬
          </span>
        </button>
      )}
      {open && (
        <div className="chatbot-popup">
          <div className="chatbot-header">
            <span>Quantum Assistant</span>
            <button
              className="chatbot-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`msg ${msg.from}`}>
                {msg.text.split("\n").map((line, lineIdx) => (
                  <div key={lineIdx}>{line}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="chatbot-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              rows={1}
              className="chatbot-textarea"
            />
            <button
              className="attach-code-btn"
              onClick={handleAttachCode}
              title="Attach code"
              style={{marginLeft: 6}}
            >
              <span className="plus-sign">+</span>
            </button>
            <button
              className="send-btn"
              onClick={sendMessage}
              style={{marginLeft: 8}}
            >Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
