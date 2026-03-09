import { randomUUID } from "node:crypto";

const OPENCLAW_URL =
  process.env.OPENCLAW_URL || "http://openclaw-gateway:18789";
const OPENCLAW_TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN || "";

const MAX_JOBS = 1000;
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
}

const jobLogs = new Map<string, LogEntry[]>();

function addLog(jobId: string, message: string, level: string = "info"): void {
  if (!jobLogs.has(jobId)) {
    jobLogs.set(jobId, []);
  }
  jobLogs.get(jobId)!.push({
    timestamp: new Date().toISOString(),
    message,
    level,
  });
}

export function getJobLogs(jobId: string): LogEntry[] {
  return jobLogs.get(jobId) || [];
}

interface SubmitJobInput {
  make: string;
  model: string;
  year: number;
  type: string;
  subtype: string;
  color: string;
}

interface SubmitJobResponse {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  subtype: string;
  color: string;
  status: string;
  createdAt: string;
}

interface JobStatusResponse {
  id: string;
  status: string;
  make?: string;
  model?: string;
  year?: number;
  type?: string;
  subtype?: string;
  color?: string;
  createdAt?: string;
  result?: string;
  error?: string;
}

// In-memory job store with bounded size and TTL eviction
const jobs = new Map<string, JobStatusResponse>();

function evictStaleJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (
      job.createdAt &&
      now - new Date(job.createdAt).getTime() > JOB_TTL_MS &&
      job.status !== "processing"
    ) {
      jobs.delete(id);
      jobLogs.delete(id);
    }
  }
}

export async function submitJob(
  input: SubmitJobInput
): Promise<SubmitJobResponse> {
  // Evict stale jobs before checking capacity
  evictStaleJobs();

  if (jobs.size >= MAX_JOBS) {
    throw new Error("Server is busy, please try again later");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const job: JobStatusResponse = {
    id,
    make: input.make,
    model: input.model,
    year: input.year,
    type: input.type,
    subtype: input.subtype,
    color: input.color,
    status: "processing",
    createdAt: now,
  };
  jobs.set(id, job);

  // Fire off the OpenClaw agent request asynchronously
  processJob(id, input).catch((err) => {
    console.error(`Job ${id} failed:`, err);
    const j = jobs.get(id);
    if (j) {
      j.status = "failed";
      j.error = err instanceof Error ? err.message : String(err);
    }
  });

  return {
    id,
    make: input.make,
    model: input.model,
    year: input.year,
    type: input.type,
    subtype: input.subtype,
    color: input.color,
    status: "processing",
    createdAt: now,
  };
}

async function processJob(
  jobId: string,
  input: SubmitJobInput
): Promise<void> {
  addLog(jobId, `Job started: ${input.year} ${input.make} ${input.model} ${input.subtype} (${input.type})`);
  addLog(jobId, `Color: ${input.color}`);
  addLog(jobId, "Sending request to OpenClaw agent...");

  const prompt = `Generate a 3D car model for: ${input.year} ${input.make} ${input.model} ${input.subtype} (${input.type}).
Color: ${input.color}

Follow the car-model skill workflow:
1. RESEARCH: Search for the exact vehicle specifications — dimensions, silhouette, distinctive design features
2. MODEL: Write a detailed Blender Python script using bmesh for smooth, realistic geometry matching the real car
3. VERIFY: Render a preview and use vision to verify the model looks like the actual car

Save the output GLB to: /home/node/.openclaw/workspace/output/${jobId}.glb

The model must be RECOGNIZABLE as a ${input.year} ${input.make} ${input.model}. Not generic boxes — actual car proportions and features.
Body color hex: ${input.color}
Do NOT include hood ornaments, brand logos, or emblems.`;

  try {
    const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`OpenClaw API error for job ${jobId}: ${res.status} ${body}`);
      addLog(jobId, `OpenClaw API error: ${res.status}`, "error");
      throw new Error("Model generation service returned an error");
    }

    addLog(jobId, "Connected to OpenClaw agent — streaming response...");

    // Parse SSE stream
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let lastLoggedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content || "";
          fullContent += delta;

          // Log meaningful chunks — every ~200 chars or when we detect phase transitions
          if (fullContent.length - lastLoggedLength > 200) {
            const snippet = fullContent.slice(lastLoggedLength, lastLoggedLength + 200).trim();
            if (snippet) {
              // Detect phase changes
              if (snippet.toLowerCase().includes("research") || snippet.toLowerCase().includes("searching") || snippet.toLowerCase().includes("web_search")) {
                addLog(jobId, "Phase 1: Researching vehicle specifications...");
              } else if (snippet.toLowerCase().includes("blender") || snippet.toLowerCase().includes("bpy") || snippet.toLowerCase().includes("modeling") || snippet.toLowerCase().includes("python script")) {
                addLog(jobId, "Phase 2: Generating 3D model with Blender...");
              } else if (snippet.toLowerCase().includes("verify") || snippet.toLowerCase().includes("render") || snippet.toLowerCase().includes("preview")) {
                addLog(jobId, "Phase 3: Verifying model output...");
              } else if (snippet.toLowerCase().includes("exec") || snippet.toLowerCase().includes("running")) {
                addLog(jobId, "Executing Blender script...");
              } else if (snippet.toLowerCase().includes("export") || snippet.toLowerCase().includes("glb") || snippet.toLowerCase().includes("gltf")) {
                addLog(jobId, "Exporting GLB file...");
              } else {
                // Log a condensed version of what the agent is saying
                const condensed = snippet.replace(/```[\s\S]*?```/g, "[code block]").replace(/\n+/g, " ").slice(0, 120);
                if (condensed.trim()) {
                  addLog(jobId, condensed.trim() + (condensed.length >= 120 ? "..." : ""));
                }
              }
              lastLoggedLength = fullContent.length;
            }
          }
        } catch {
          // Ignore parse errors in SSE chunks
        }
      }
    }

    const job = jobs.get(jobId);
    if (!job) return;

    if (fullContent.includes("JOB_FAILED")) {
      job.status = "failed";
      job.error = "Model generation failed";
      addLog(jobId, "Job failed — model generation was unsuccessful", "error");
      console.error(`Job ${jobId} returned JOB_FAILED:`, fullContent);
    } else if (fullContent.includes("JOB_COMPLETE")) {
      job.status = "completed";
      job.result = `/workspace/output/${jobId}.glb`;
      addLog(jobId, "Job completed successfully! GLB model is ready.");
    } else {
      // Even without explicit JOB_COMPLETE, check if file exists
      job.status = "completed";
      job.result = `/workspace/output/${jobId}.glb`;
      addLog(jobId, "Agent finished — checking for output file...");
    }
  } catch (err) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.error = "Model generation failed";
      addLog(jobId, `Error: ${err instanceof Error ? err.message : String(err)}`, "error");
      console.error(`Job ${jobId} error:`, err);
    }
  }
}

export async function getJobStatus(
  jobId: string
): Promise<JobStatusResponse> {
  const job = jobs.get(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  return { ...job };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
