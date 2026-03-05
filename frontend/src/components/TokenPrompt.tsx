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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 400,
          width: "100%",
          padding: 24,
          border: "1px solid #ccc",
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Car Model Skill</h2>
        <p>Enter your access token to continue.</p>
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Access token"
          style={{
            width: "100%",
            padding: 8,
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", margin: "0 0 12px" }}>{error}</p>
        )}
        <button
          type="submit"
          style={{
            padding: "8px 24px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Authenticate
        </button>
      </form>
    </div>
  );
}
