import { getApiKey, getApiUrl } from './config.js';

export interface ApiError {
  error: { type: string; message: string; details?: string[] };
}

export interface PaginationMeta {
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Headers;
}

class BalzacClient {
  private maxRetries = 3;

  private get baseUrl(): string {
    return getApiUrl();
  }

  private get token(): string {
    const key = getApiKey();
    if (!key) {
      throw new Error(
        'No API key configured. Run `balzac auth login` or set BALZAC_API_KEY environment variable.'
      );
    }
    return key;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
    attempt = 1
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429 && attempt <= this.maxRetries) {
      const retryAfter = Number(res.headers.get('Retry-After') || 2);
      const delay = retryAfter * 1000 * attempt;
      await new Promise((r) => setTimeout(r, delay));
      return this.request<T>(method, path, body, query, attempt + 1);
    }

    if (res.status === 204) {
      return { status: 204, data: {} as T, headers: res.headers };
    }

    const data = (await res.json()) as T;

    if (!res.ok) {
      const err = data as unknown as ApiError;
      const msg = err?.error?.message || `HTTP ${res.status}`;
      const type = err?.error?.type || 'unknown';
      const details = err?.error?.details;
      const error = new Error(msg) as Error & { type: string; status: number; details?: string[] };
      error.type = type;
      error.status = res.status;
      if (details) error.details = details;
      throw error;
    }

    return { status: res.status, data, headers: res.headers };
  }

  async get<T = unknown>(path: string, query?: Record<string, string | number | undefined>) {
    return this.request<T>('GET', path, undefined, query);
  }

  async post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T = unknown>(path: string, query?: Record<string, string | number | undefined>) {
    return this.request<T>('DELETE', path, undefined, query);
  }

  async paginate<T = unknown>(
    path: string,
    key: string,
    query?: Record<string, string | number | undefined>
  ): Promise<{ items: T[]; meta: PaginationMeta }> {
    const res = await this.get<Record<string, unknown>>(path, query);
    const items = (res.data[key] || []) as T[];
    const meta = (res.data.meta || {
      total: items.length,
      total_pages: 1,
      page: 1,
      per_page: 25,
    }) as PaginationMeta;
    return { items, meta };
  }
}

export const client = new BalzacClient();
