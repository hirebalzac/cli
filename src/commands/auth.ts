import { Command } from 'commander';
import chalk from 'chalk';
import { getApiKey, setApiKey, clearApiKey, getConfigPath, getApiUrl } from '../config.js';
import { client } from '../client.js';
import { printSuccess, printError, printInfo, isJsonMode, printJson } from '../output.js';
import { createInterface } from 'readline';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Manage API authentication');

  auth
    .command('login')
    .description('Store your Balzac API key')
    .argument('[key]', 'API key (omit to be prompted)')
    .action(async (key?: string) => {
      try {
        if (!key) {
          console.log('');
          console.log(chalk.bold('  Welcome to Balzac CLI'));
          console.log(chalk.dim('  Generate an API key from Settings → API Keys in the Balzac app.'));
          console.log('');
        }
        const apiKey = key || (await prompt('  Enter your API key: '));
        if (!apiKey) {
          printError(new Error('No API key provided.'));
          process.exit(1);
        }

        setApiKey(apiKey);

        try {
          const res = await client.get<{ workspaces: { name: string }[] }>('/workspaces', { per_page: 1 });
          const count = res.data.workspaces?.length || 0;
          console.log('');
          printSuccess('Authenticated successfully.');
          console.log(chalk.dim('  Key saved to ') + getConfigPath());
          if (count > 0) {
            console.log(chalk.dim('  Run ') + chalk.bold('balzac workspaces list') + chalk.dim(' to get started.'));
          }
          console.log('');
        } catch {
          clearApiKey();
          console.log('');
          printError(new Error('Invalid API key. Please check your key and try again.'));
          process.exit(1);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  auth
    .command('logout')
    .description('Remove stored API key')
    .action(() => {
      clearApiKey();
      printSuccess('API key removed.');
    });

  auth
    .command('status')
    .description('Show authentication status')
    .action(async () => {
      try {
        const key = getApiKey();
        if (!key) {
          if (isJsonMode()) {
            printJson({ authenticated: false });
          } else {
            printInfo('Not authenticated. Run ' + chalk.bold('balzac auth login') + ' to set your API key.');
          }
          return;
        }

        const masked = key.slice(0, 6) + '…' + key.slice(-4);
        try {
          await client.get('/workspaces', { per_page: 1 });
          if (isJsonMode()) {
            printJson({ authenticated: true, key: masked, api_url: getApiUrl() });
          } else {
            printSuccess('Authenticated');
            console.log(chalk.dim('  Key: ') + masked);
            console.log(chalk.dim('  API: ') + getApiUrl());
          }
        } catch {
          if (isJsonMode()) {
            printJson({ authenticated: false, key: masked, error: 'Invalid API key' });
          } else {
            printError(new Error('API key is invalid or expired (' + masked + ')'));
          }
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
