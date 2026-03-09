import { useState } from "react";
import { setCredentials } from "../api/client.js";

interface ProviderPromptProps {
  onAuthenticated: () => void;
}

const PROVIDERS = [
  { value: "zai", label: "Z.ai (GLM-5)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

export function ProviderPrompt({ onAuthenticated }: ProviderPromptProps) {
  const [provider, setProvider] = useState(PROVIDERS[0].value);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError("API key is required");
      return;
    }
    setCredentials(provider, trimmedKey);
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
        <p>Select your AI provider and enter your API key.</p>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setError(null);
          }}
          style={{
            width: "100%",
            padding: 8,
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError(null);
          }}
          placeholder="API key"
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
          Connect
        </button>
      </form>
    </div>
  );
}
