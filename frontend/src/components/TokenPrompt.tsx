import { useState } from "react";
import { setToken } from "../api/client.js";

interface TokenPromptProps {
  onAuthenticated: () => void;
}

export function TokenPrompt({ onAuthenticated }: TokenPromptProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Token is required");
      return;
    }
    setToken(trimmed);
    onAuthenticated();
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2>Car Model Generator</h2>
        <p className="subtitle">Enter the shared access token to get started.</p>

        <div className="form-group">
          <label>Access Token</label>
          <input
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="Paste token here..."
            autoFocus
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" className="btn btn-primary">
          Connect
        </button>
      </form>
    </div>
  );
}
