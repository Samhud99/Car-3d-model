import { useEffect, useState, useRef } from "react";
import { api } from "../api/client.js";

interface LogViewerProps {
  jobId: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
}

export function LogViewer({ jobId }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getJobLogs(jobId);
        setLogs(data);
      } catch {
        // ignore
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <span className="log-title">OpenClaw Logs</span>
        <label className="auto-scroll-toggle">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      <div className="log-content">
        {logs.length === 0 && (
          <div className="log-empty">Waiting for logs...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`log-entry log-${log.level}`}>
            <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="log-level">{log.level}</span>
            <span className="log-msg">{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
