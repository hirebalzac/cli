import { Command } from 'commander';
import chalk from 'chalk';
import { getApiKey, setApiKey, clearApiKey, getConfigPath, getApiUrl } from '../config.js';
import { client } from '../client.js';
import { printSuccess, printError, printInfo, isJsonMode, printJson } from '../output.js';
import { createInterface } from 'readline';

// GET /me: the account, its credits and the credentials making the request.
interface Me {
  company?: { id: string; name: string; available_credits: number };
  user?: { id: string; name: string; email: string; role: string } | null;
  auth?: { type: string; name?: string; client_name?: string | null; admin?: boolean };
}

function line(label: string, value: string) {
  console.log(chalk.dim(`  ${(label + ':').padEnd(9)}`) + value);
}

function printMe(me: Me, masked: string) {
  printSuccess('Authenticated');
  if (me.company) {
    line('Account', me.company.name);
    line('Credits', `${me.company.available_credits} available`);
  }
  const auth = me.auth;
  if (auth?.type === 'oauth') {
    line('Auth', 'OAuth token' + (auth.client_name ? ` (${auth.client_name})` : ''));
  } else if (auth) {
    line('Auth', 'API key' + (auth.name ? ` "${auth.name}"` : ''));
  }
  if (me.user) {
    line('User', `${me.user.name} <${me.user.email}>`);
    line('Role', me.user.role === 'admin' ? 'admin' : 'member');
  } else if (auth?.type === 'api_key') {
    line('Role', 'admin (API keys count as admin)');
  }
  if (auth) {
    line('Admin', auth.admin ? 'yes' : 'no (can\'t manage integrations or delete workspaces)');
  }
  line('Key', masked);
  line('API', getApiUrl());
}

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
        } catch (e: unknown) {
          const err = e as Error & { status?: number; type?: string };
          if (err.status === 401 || err.type === 'unauthorized') {
            clearApiKey();
            console.log('');
            printError(new Error('Invalid API key. Please check your key and try again.'));
          } else {
            clearApiKey();
            console.log('');
            printError(new Error(
              'Could not verify API key: ' + (err.message || 'unknown error') +
              '\n  API URL: ' + getApiUrl() +
              '\n  Check your network connection and API URL, then try again.'
            ));
          }
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
    .description('Show authentication status: account, credits, key name, role and admin flag')
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
          let me: Me = {};
          try {
            me = (await client.get<Me>('/me')).data;
          } catch (e: unknown) {
            // An API without GET /me: check the key the old way.
            if ((e as { status?: number }).status !== 404) throw e;
            await client.get('/workspaces', { per_page: 1 });
          }
          if (isJsonMode()) {
            printJson({ authenticated: true, key: masked, api_url: getApiUrl(), ...me });
          } else {
            printMe(me, masked);
          }
        } catch (e: unknown) {
          const err = e as Error & { status?: number; type?: string };
          if (err.status === 401 || err.type === 'unauthorized') {
            if (isJsonMode()) {
              printJson({ authenticated: false, key: masked, api_url: getApiUrl(), error: 'Invalid or expired API key' });
            } else {
              printError(new Error('API key is invalid or expired (' + masked + ')'));
            }
          } else {
            if (isJsonMode()) {
              printJson({ authenticated: false, key: masked, api_url: getApiUrl(), error: err.message || 'Connection failed' });
            } else {
              printError(new Error(
                'Could not reach API: ' + (err.message || 'unknown error') +
                '\n  API URL: ' + getApiUrl()
              ));
            }
          }
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
