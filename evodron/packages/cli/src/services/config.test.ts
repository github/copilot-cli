import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { clearConfig, getApiUrl, loadConfig, saveConfig } from './config';

function createTempConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evodron-cli-config-'));
}

describe('CLI config service', () => {
  afterEach(() => {
    delete process.env['EVODRON_CONFIG_DIR'];
    delete process.env['EVODRON_API_URL'];
  });

  it('saves and loads credentials from the configured directory', () => {
    const dir = createTempConfigDir();
    process.env['EVODRON_CONFIG_DIR'] = dir;

    saveConfig({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      username: 'alice',
      userId: 'user-1',
    });

    expect(loadConfig()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      username: 'alice',
      userId: 'user-1',
    });
  });

  it('prefers the saved API URL over the environment fallback', () => {
    const dir = createTempConfigDir();
    process.env['EVODRON_CONFIG_DIR'] = dir;
    process.env['EVODRON_API_URL'] = 'http://env.example.test';

    saveConfig({ apiUrl: 'http://saved.example.test' });

    expect(getApiUrl()).toBe('http://saved.example.test');
  });

  it('clears the persisted config file', () => {
    const dir = createTempConfigDir();
    process.env['EVODRON_CONFIG_DIR'] = dir;

    saveConfig({ accessToken: 'token' });
    clearConfig();

    expect(loadConfig()).toEqual({});
  });
});
