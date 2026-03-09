import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "../types.js";
import { api } from "../api/client.js";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  );

  const startPolling = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const updated = await api.getJobStatus(jobId);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? updated : j))
        );
        if (
          updated.status === "completed" ||
          updated.status === "failed" ||
          updated.status === "error"
        ) {
          clearInterval(interval);
          intervalsRef.current.delete(jobId);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    intervalsRef.current.set(jobId, interval);
  }, []);

  const submitJob = useCallback(
    async (make: string, model: string, year: number, type: string, subtype: string, color: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const job = await api.submitJob(make, model, year, type, subtype, color);
        setJobs((prev) => [job, ...prev]);
        startPolling(job.id);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to submit job");
      } finally {
        setSubmitting(false);
      }
    },
    [startPolling]
  );

  useEffect(() => {
    return () => {
      for (const interval of intervalsRef.current.values()) {
        clearInterval(interval);
      }
      intervalsRef.current.clear();
    };
  }, []);

  return { jobs, submitting, error, submitJob };
}
