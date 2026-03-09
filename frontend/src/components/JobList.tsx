import { useState } from "react";
import type { Job } from "../types.js";
import { ModelViewer } from "./ModelViewer.js";

interface JobListProps {
  jobs: Job[];
}

function statusClass(status: string): string {
  switch (status) {
    case "pending":
      return "status-badge status-pending";
    case "processing":
      return "status-badge status-processing";
    case "completed":
      return "status-badge status-completed";
    case "failed":
    case "error":
      return "status-badge status-failed";
    default:
      return "status-badge";
  }
}

export function JobList({ jobs }: JobListProps) {
  const [viewingModel, setViewingModel] = useState<Job | null>(null);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="jobs-section">
      <h2>Jobs</h2>
      {jobs.map((job) => (
        <div key={job.id} className="job-card">
          <div className="job-car">
            {job.year} {job.make} {job.model}{" "}
            <span className="job-type">{job.type} — {job.subtype}</span>
          </div>
          <div className="job-meta">
            <span className="job-id">{job.id.slice(0, 8)}</span>
            <span className={statusClass(job.status)}>{job.status}</span>
            {job.status === "completed" && (
              <button
                className="view-model-btn"
                onClick={() => setViewingModel(job)}
              >
                View 3D Model
              </button>
            )}
          </div>
        </div>
      ))}

      {viewingModel && (
        <ModelViewer
          jobId={viewingModel.id}
          carName={`${viewingModel.year} ${viewingModel.make} ${viewingModel.model}`}
          onClose={() => setViewingModel(null)}
        />
      )}
    </div>
  );
}
