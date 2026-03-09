const BASE_URL =
  process.env.OPENCLAW_URL || "http://openclaw-gateway:18789";

interface UserCredentials {
  provider: string;
  apiKey: string;
}

interface SubmitJobInput {
  make: string;
  model: string;
  type: string;
  credentials: UserCredentials;
}

interface SubmitJobResponse {
  id: string;
  [key: string]: unknown;
}

interface JobStatusResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

export async function submitJob(
  input: SubmitJobInput
): Promise<SubmitJobResponse> {
  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skill: "car-model",
      input: {
        make: input.make,
        model: input.model,
        type: input.type,
      },
      // Pass user's credentials so OpenClaw uses their key for the AI workload
      provider: input.credentials.provider,
      apiKey: input.credentials.apiKey,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenClaw submitJob failed: ${res.status} ${body}`
    );
  }

  return (await res.json()) as SubmitJobResponse;
}

export async function getJobStatus(
  jobId: string
): Promise<JobStatusResponse> {
  const encodedId = encodeURIComponent(jobId);
  const res = await fetch(`${BASE_URL}/api/jobs/${encodedId}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenClaw getJobStatus failed: ${res.status} ${body}`
    );
  }

  return (await res.json()) as JobStatusResponse;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
