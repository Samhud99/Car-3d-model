import type { CarsData, Job } from "../types.js";

const TOKEN_KEY = "car-model-token";

let authFailureHandler: (() => void) | null = null;

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function setAuthFailureHandler(handler: () => void): void {
  authFailureHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    clearToken();
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

  submitJob(make: string, model: string, year: number, type: string, subtype: string, color: string): Promise<Job> {
    return request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ make, model, year, type, subtype, color }),
    });
  },

  getJobStatus(id: string): Promise<Job> {
    return request<Job>(`/api/jobs/${id}`);
  },

  getJobLogs(id: string): Promise<Array<{ timestamp: string; message: string; level: string }>> {
    return request<Array<{ timestamp: string; message: string; level: string }>>(`/api/jobs/${id}/logs`);
  },
};
