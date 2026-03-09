import { useState } from "react";
import { useCars } from "../hooks/useCars.js";

const CAR_COLOR_PRESETS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "Red", hex: "#cc0000" },
  { name: "Blue", hex: "#003399" },
  { name: "Grey", hex: "#666666" },
  { name: "Green", hex: "#2d572c" },
  { name: "Pearl White", hex: "#f0ead6" },
  { name: "Midnight Blue", hex: "#191970" },
  { name: "Burgundy", hex: "#800020" },
];

interface CarFormProps {
  onSubmit: (make: string, model: string, year: number, type: string, subtype: string, color: string) => void;
  submitting: boolean;
}

export function CarForm({ onSubmit, submitting }: CarFormProps) {
  const { data, loading, error } = useCars();
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1a1a2e");

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading cars...
      </div>
    );
  }

  if (error) {
    return <div className="error-msg">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const makeEntry = data.cars.find((c) => c.make === selectedMake);
  const modelEntry = makeEntry?.models.find((m) => m.name === selectedModel);

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMake(e.target.value);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedType("");
    setSelectedSubtype("");
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    setSelectedYear("");
    setSelectedType("");
    setSelectedSubtype("");
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setSelectedType("");
    setSelectedSubtype("");
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setSelectedSubtype("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMake && selectedModel && selectedYear && selectedType && selectedSubtype) {
      onSubmit(selectedMake, selectedModel, parseInt(selectedYear, 10), selectedType, selectedSubtype, selectedColor);
    }
  };

  const canSubmit =
    selectedMake && selectedModel && selectedYear && selectedType && selectedSubtype && !submitting;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="form-group">
        <label>Make</label>
        <select value={selectedMake} onChange={handleMakeChange}>
          <option value="">Select make...</option>
          {data.cars.map((c) => (
            <option key={c.make} value={c.make}>{c.make}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Model</label>
        <select value={selectedModel} onChange={handleModelChange} disabled={!selectedMake}>
          <option value="">Select model...</option>
          {makeEntry?.models.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Year</label>
        <select value={selectedYear} onChange={handleYearChange} disabled={!selectedModel}>
          <option value="">Select year...</option>
          {modelEntry?.years
            .slice()
            .sort((a, b) => b - a)
            .map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
        </select>
      </div>

      <div className="form-group">
        <label>Type</label>
        <select value={selectedType} onChange={handleTypeChange} disabled={!selectedYear}>
          <option value="">Select type...</option>
          {modelEntry?.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Subtype / Trim</label>
        <select
          value={selectedSubtype}
          onChange={(e) => setSelectedSubtype(e.target.value)}
          disabled={!selectedType}
        >
          <option value="">Select subtype...</option>
          {modelEntry?.subtypes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group color-picker-group">
        <label>Color</label>
        <div className="color-swatches">
          {CAR_COLOR_PRESETS.map((c) => (
            <div key={c.hex} className="color-swatch-wrapper">
              <div
                className={`color-swatch${selectedColor === c.hex ? " selected" : ""}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => setSelectedColor(c.hex)}
                title={c.name}
              />
              <div className="color-swatch-label">{c.name}</div>
            </div>
          ))}
        </div>
        <div className="custom-color-row">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          />
          <span>{selectedColor}</span>
        </div>
      </div>

      <button type="submit" disabled={!canSubmit} className="btn btn-primary">
        {submitting ? (
          <>
            <div className="spinner" />
            Generating...
          </>
        ) : (
          "Generate Model"
        )}
      </button>
    </form>
  );
}
