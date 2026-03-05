import type { Job } from "../types.js";

interface JobListProps {
  jobs: Job[];
}

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
  error: "#ef4444",
};

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div>
      <h2>Jobs</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #ddd" }}>
              Car
            </th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #ddd" }}>
              Status
            </th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #ddd" }}>
              ID
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                {job.make} {job.model} ({job.type})
              </td>
              <td
                style={{
                  padding: 8,
                  borderBottom: "1px solid #eee",
                  color: statusColors[job.status] || "#666",
                  fontWeight: 600,
                }}
              >
                {job.status}
              </td>
              <td
                style={{
                  padding: 8,
                  borderBottom: "1px solid #eee",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {job.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
