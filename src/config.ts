import Conf from 'conf';

const config = new Conf({
  projectName: 'balzac-cli',
  schema: {
    apiKey: { type: 'string', default: '' },
    defaultWorkspace: { type: 'string', default: '' },
    apiUrl: { type: 'string', default: 'https://api.hirebalzac.ai/v1' },
  },
});

export function getApiKey(): string {
  return process.env.BALZAC_API_KEY || (config.get('apiKey') as string) || '';
}

export function setApiKey(key: string): void {
  config.set('apiKey', key);
}

export function clearApiKey(): void {
  config.delete('apiKey');
}

export function getDefaultWorkspace(): string {
  return (config.get('defaultWorkspace') as string) || '';
}

export function setDefaultWorkspace(id: string): void {
  config.set('defaultWorkspace', id);
}

export function getApiUrl(): string {
  return process.env.BALZAC_API_URL || (config.get('apiUrl') as string);
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function resetConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

export function resolveWorkspace(cliFlag: string | undefined): string {
  const ws = cliFlag || getDefaultWorkspace();
  if (!ws) {
    throw new Error(
      'No workspace specified. Use --workspace <id> or set a default with: balzac config set workspace <id>'
    );
  }
  return ws;
}
