import React, { useState, useRef, useEffect } from "react";
import "../Circuit.css";

export default function Chatbot() {
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
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chatbot-input">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
