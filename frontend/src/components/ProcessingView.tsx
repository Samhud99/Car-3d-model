import { useState } from "react";
import type { Job } from "../types.js";
import { LogViewer } from "./LogViewer.js";

interface ProcessingViewProps {
  job: Job;
}

export function ProcessingView({ job }: ProcessingViewProps) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="processing-view">
      <div className="assembly-line">
        {/* Factory background */}
        <div className="factory-bg">
          <div className="factory-beam beam-1"></div>
          <div className="factory-beam beam-2"></div>
          <div className="factory-beam beam-3"></div>
          <div className="factory-beam beam-4"></div>
          <div className="factory-beam beam-5"></div>
          <div className="factory-girder girder-top"></div>
          <div className="factory-girder girder-mid"></div>
        </div>

        {/* Station indicator lights */}
        <div className="station-light light-1"></div>
        <div className="station-light light-2"></div>
        <div className="station-light light-3"></div>
        <div className="station-light light-4"></div>
        <div className="station-light light-5"></div>

        {/* Conveyor belt with rollers */}
        <div className="conveyor">
          <div className="conveyor-surface"></div>
          <div className="conveyor-rollers">
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
            <div className="roller"></div>
          </div>
          <div className="conveyor-belt-track">
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
            <div className="belt-seg"></div>
          </div>
        </div>

        {/* Car assembly group - slides in, assembles, drives off */}
        <div className="car-assembly">
          {/* Bare chassis/frame */}
          <div className="chassis"></div>

          {/* Engine block - drops from above */}
          <div className="engine-block"></div>
          <div className="engine-crane">
            <div className="crane-cable"></div>
          </div>

          {/* Body panels - slide from sides */}
          <div className="body-panel panel-left"></div>
          <div className="body-panel panel-right"></div>

          {/* Roof - lowers from above */}
          <div className="car-roof"></div>

          {/* Windshield and rear window */}
          <div className="car-windshield"></div>
          <div className="car-rear-window"></div>

          {/* Doors */}
          <div className="car-door door-left"></div>
          <div className="car-door door-right"></div>

          {/* Headlights and taillights */}
          <div className="headlight headlight-l"></div>
          <div className="headlight headlight-r"></div>
          <div className="taillight taillight-l"></div>
          <div className="taillight taillight-r"></div>

          {/* Wheels */}
          <div className="wheel wheel-fl"></div>
          <div className="wheel wheel-fr"></div>
          <div className="wheel wheel-rl"></div>
          <div className="wheel wheel-rr"></div>

          {/* Paint spray overlay */}
          <div className="paint-spray"></div>
        </div>

        {/* Robot arm 1 - Welder (left station) */}
        <div className="robot-arm arm-1">
          <div className="arm-base"></div>
          <div className="arm-upper"></div>
          <div className="arm-lower"></div>
          <div className="arm-tool tool-welder"></div>
          <div className="sparks">
            <div className="spark"></div>
            <div className="spark"></div>
            <div className="spark"></div>
            <div className="spark"></div>
            <div className="spark"></div>
          </div>
          <div className="smoke-puff puff-1"></div>
          <div className="smoke-puff puff-2"></div>
        </div>

        {/* Robot arm 2 - Bolter */}
        <div className="robot-arm arm-2">
          <div className="arm-base"></div>
          <div className="arm-upper"></div>
          <div className="arm-lower"></div>
          <div className="arm-tool tool-bolter"></div>
          <div className="sparks">
            <div className="spark"></div>
            <div className="spark"></div>
            <div className="spark"></div>
          </div>
        </div>

        {/* Robot arm 3 - Painter (center) */}
        <div className="robot-arm arm-3">
          <div className="arm-base"></div>
          <div className="arm-upper"></div>
          <div className="arm-lower"></div>
          <div className="arm-tool tool-painter"></div>
          <div className="paint-mist"></div>
        </div>

        {/* Robot arm 4 - Assembly (right) */}
        <div className="robot-arm arm-4">
          <div className="arm-base"></div>
          <div className="arm-upper"></div>
          <div className="arm-lower"></div>
          <div className="arm-tool tool-gripper"></div>
        </div>

        {/* Robot arm 5 - Inspector (far right) */}
        <div className="robot-arm arm-5">
          <div className="arm-base"></div>
          <div className="arm-upper"></div>
          <div className="arm-lower"></div>
          <div className="arm-tool tool-scanner"></div>
          <div className="scan-beam"></div>
        </div>
      </div>

      <div className="processing-info">
        <h2>Building your {job.year} {job.make} {job.model}</h2>
        <p className="processing-subtext">{job.type} — {job.subtype}</p>
        <div className="processing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        <button
          className="toggle-logs-btn"
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? "Hide Logs" : "View OpenClaw Logs"}
        </button>
      </div>

      {showLogs && <LogViewer jobId={job.id} />}
    </div>
  );
}
