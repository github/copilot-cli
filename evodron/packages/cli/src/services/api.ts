import { loadConfig, getApiUrl, saveConfig } from './config';

interface ApiOptions {
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiOptions = {},
): Promise<T> {
  const { auth = false, ...fetchOptions } = options;
  const url = `${getApiUrl()}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (auth) {
    const config = loadConfig();
    if (!config.accessToken) {
      throw new Error('Not logged in. Run: evodron auth login');
    }
    headers['Authorization'] = 'Bearer ' + config.accessToken!;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  // Handle 401 — try to refresh token
  if (res.status === 401 && auth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const config = loadConfig();
      headers['Authorization'] = 'Bearer ' + config.accessToken!;
      const retry = await fetch(url, { ...fetchOptions, headers });
      return retry.json() as Promise<T>;
    } else {
      throw new Error('Session expired. Please login again: evodron auth login');
    }
  }

  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const config = loadConfig();
  if (!config.refreshToken) return false;

  try {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: config.refreshToken }),
    });
    const data = (await res.json()) as {
      success: boolean;
      data?: { accessToken: string; refreshToken: string };
    };

    if (data.success && data.data) {
      saveConfig({
        ...config,
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
