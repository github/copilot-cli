import fs from 'fs';
import path from 'path';
import os from 'os';

interface Config {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  username?: string;
  apiUrl?: string;
}

function configDir(): string {
  return process.env['EVODRON_CONFIG_DIR'] ?? path.join(os.homedir(), '.evodron');
}

function configFile(): string {
  return path.join(configDir(), 'config.json');
}

export function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(configFile(), 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  const dir = configDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(configFile(), JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getApiUrl(): string {
  const config = loadConfig();
  return config.apiUrl ?? process.env['EVODRON_API_URL'] ?? 'http://localhost:3000';
}

export function clearConfig(): void {
  try {
    fs.unlinkSync(configFile());
  } catch {
    // ignore
  }
}
