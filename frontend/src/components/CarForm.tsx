import { useState } from "react";
import { useCars } from "../hooks/useCars.js";

interface CarFormProps {
  onSubmit: (make: string, model: string, type: string) => void;
  submitting: boolean;
}

export function CarForm({ onSubmit, submitting }: CarFormProps) {
  const { data, loading, error } = useCars();
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedType, setSelectedType] = useState("");

  if (loading) {
    return <p>Loading cars...</p>;
  }

  if (error) {
    return <p style={{ color: "#ef4444" }}>Error: {error}</p>;
  }

  if (!data) {
    return null;
  }

  const makeEntry = data.cars.find((c) => c.make === selectedMake);
  const modelEntry = makeEntry?.models.find((m) => m.name === selectedModel);

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMake(e.target.value);
    setSelectedModel("");
    setSelectedType("");
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    setSelectedType("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMake && selectedModel && selectedType) {
      onSubmit(selectedMake, selectedModel, selectedType);
    }
  };

  const canSubmit =
    selectedMake && selectedModel && selectedType && !submitting;

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Generate Car Model</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Make
        </label>
        <select
          value={selectedMake}
          onChange={handleMakeChange}
          style={{ width: "100%", padding: 8, fontSize: 14 }}
        >
          <option value="">Select make...</option>
          {data.cars.map((c) => (
            <option key={c.make} value={c.make}>
              {c.make}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Model
        </label>
        <select
          value={selectedModel}
          onChange={handleModelChange}
          disabled={!selectedMake}
          style={{ width: "100%", padding: 8, fontSize: 14 }}
        >
          <option value="">Select model...</option>
          {makeEntry?.models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          disabled={!selectedModel}
          style={{ width: "100%", padding: 8, fontSize: 14 }}
        >
          <option value="">Select type...</option>
          {modelEntry?.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: "8px 24px",
          fontSize: 14,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "Submitting..." : "Submit Job"}
      </button>
    </form>
  );
}
