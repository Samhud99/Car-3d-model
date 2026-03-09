import { useEffect, useState } from "react";
import { getToken, setAuthFailureHandler } from "./api/client.js";
import { TokenPrompt } from "./components/TokenPrompt.js";
import { CarForm } from "./components/CarForm.js";
import { JobList } from "./components/JobList.js";
import { ProcessingView } from "./components/ProcessingView.js";
import { useJobs } from "./hooks/useJobs.js";

export function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const { jobs, submitting, error, submitJob } = useJobs();

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAuthenticated(false);
    });
  }, []);

  if (!authenticated) {
    return <TokenPrompt onAuthenticated={() => setAuthenticated(true)} />;
  }

  const processingJob = jobs.find((j) => j.status === "processing");

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Car Model Generator</h1>
        <p>Select a car and generate a 3D model</p>
      </div>
      {processingJob ? (
        <ProcessingView job={processingJob} />
      ) : (
        <CarForm onSubmit={(make, model, year, type, subtype, color) => submitJob(make, model, year, type, subtype, color)} submitting={submitting} />
      )}
      {error && <div className="error-msg">{error}</div>}
      <JobList jobs={jobs} />
    </div>
  );
}
