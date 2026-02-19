import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface Config {
  token: string;
  apiUrl?: string;
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'amulets', 'config.json');
}

export function readConfig(): Config | null {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return null;
  }
}

export function writeConfig(config: Config): void {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function clearConfig(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

export function getApiUrl(): string {
  const config = readConfig();
  return process.env.AMULETS_API_URL ?? config?.apiUrl ?? 'https://amulets.dev';
}

export function requireToken(): string {
  const config = readConfig();
  if (!config?.token) {
    console.error('Not logged in. Run `amulets login` first.');
    process.exit(1);
  }
  return config.token;
}
