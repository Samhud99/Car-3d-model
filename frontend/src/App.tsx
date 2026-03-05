import { useEffect, useState } from "react";
import { getToken, setAuthFailureHandler } from "./api/client.js";
import { TokenPrompt } from "./components/TokenPrompt.js";
import { CarForm } from "./components/CarForm.js";
import { JobList } from "./components/JobList.js";
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

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <CarForm onSubmit={submitJob} submitting={submitting} />
      {error && (
        <p style={{ color: "#ef4444", marginBottom: 16 }}>Error: {error}</p>
      )}
      <JobList jobs={jobs} />
    </div>
  );
}
