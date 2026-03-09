import type { CarsData, Credentials, Job } from "../types.js";

const PROVIDER_KEY = "car-model-provider";
const API_KEY = "car-model-apikey";

let authFailureHandler: (() => void) | null = null;

export function getCredentials(): Credentials | null {
  const provider = localStorage.getItem(PROVIDER_KEY);
  const apiKey = localStorage.getItem(API_KEY);
  if (provider && apiKey) {
    return { provider, apiKey };
  }
  return null;
}

export function setCredentials(provider: string, apiKey: string): void {
  localStorage.setItem(PROVIDER_KEY, provider);
  localStorage.setItem(API_KEY, apiKey);
}

export function clearCredentials(): void {
  localStorage.removeItem(PROVIDER_KEY);
  localStorage.removeItem(API_KEY);
}

export function setAuthFailureHandler(handler: () => void): void {
  authFailureHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const credentials = getCredentials();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (credentials) {
    headers["X-Provider"] = credentials.provider;
    headers["X-Api-Key"] = credentials.apiKey;
  }

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    clearCredentials();
    if (authFailureHandler) {
      authFailureHandler();
    }
    throw new Error("Authentication failed");
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getCars(): Promise<CarsData> {
    return request<CarsData>("/api/cars");
  },

  submitJob(make: string, model: string, type: string): Promise<Job> {
    return request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ make, model, type }),
    });
  },

  getJobStatus(id: string): Promise<Job> {
    return request<Job>(`/api/jobs/${id}`);
  },
};
