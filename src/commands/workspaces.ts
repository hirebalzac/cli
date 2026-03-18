import { Command } from 'commander';
import { client } from '../client.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, printJson, isJsonMode, formatStatus, truncate, spinner,
} from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'domain', label: 'Domain' },
  { key: 'status', label: 'Status' },
  { key: 'language', label: 'Language' },
  { key: 'description', label: 'Description' },
  { key: 'target_audience', label: 'Target Audience' },
  { key: 'theme', label: 'Theme' },
  { key: 'pictures_style', label: 'Pictures Style' },
  { key: 'max_articles_per_period', label: 'Max Articles/Period' },
  { key: 'max_articles_period', label: 'Period' },
  { key: 'auto_accept_suggestions', label: 'Auto-accept Suggestions' },
  { key: 'setup_completed', label: 'Setup Completed' },
  { key: 'created_at', label: 'Created' },
];

export function registerWorkspacesCommands(program: Command) {
  const ws = program.command('workspaces').alias('ws').description('Manage workspaces');

  ws.command('list')
    .description('List all workspaces')
    .option('--status <status>', 'Filter by status')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '25')
    .action(async (opts) => {
      try {
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          '/workspaces', 'workspaces',
          { status: opts.status, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID', format: (v) => String(v).slice(0, 8) + '…' },
          { key: 'name', label: 'Name', format: (v) => truncate(v as string, 30) },
          { key: 'domain', label: 'Domain', format: (v) => truncate(v as string, 30) },
          { key: 'status', label: 'Status', format: (v) => formatStatus(v as string) },
          { key: 'language', label: 'Lang' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('get')
    .description('Get workspace details')
    .argument('<id>', 'Workspace ID')
    .action(async (id) => {
      try {
        const res = await client.get<{ workspace: Record<string, unknown> }>(`/workspaces/${id}`);
        printRecord(res.data.workspace, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('create')
    .description('Create a new workspace')
    .requiredOption('--domain <url>', 'Website domain')
    .option('--name <name>', 'Workspace name')
    .option('--description <desc>', 'Description')
    .option('--language <code>', 'Language code')
    .option('--auto-accept-keywords', 'Auto-accept discovered keywords', true)
    .option('--no-auto-accept-keywords', 'Require manual keyword review')
    .option('--auto-accept-suggestions', 'Auto-accept generated suggestions')
    .option('--pictures-style <style>', 'Image style')
    .option('--max-articles <n>', 'Max articles per period')
    .option('--period <p>', 'Article limit period (day/week/month)')
    .option('--wait', 'Wait for workspace setup to complete')
    .action(async (opts) => {
      try {
        const body: Record<string, unknown> = { domain: opts.domain };
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.language) body.language = opts.language;
        if (opts.autoAcceptKeywords !== undefined) body.auto_accept_keywords = opts.autoAcceptKeywords;
        if (opts.autoAcceptSuggestions) body.auto_accept_suggestions = true;
        if (opts.picturesStyle) body.pictures_style = opts.picturesStyle;
        if (opts.maxArticles) body.max_articles_per_period = Number(opts.maxArticles);
        if (opts.period) body.max_articles_period = opts.period;

        const res = await client.post<{ workspace: Record<string, unknown> }>('/workspaces', { workspace: body });
        const ws = res.data.workspace;

        if (opts.wait && ws.status !== 'ready' && ws.status !== 'imported') {
          const s = spinner('Setting up workspace…');
          s.start();
          let current = ws;
          while (current.status === 'new' || current.status === 'running') {
            await new Promise((r) => setTimeout(r, 5000));
            const poll = await client.get<{ workspace: Record<string, unknown> }>(`/workspaces/${current.id}`);
            current = poll.data.workspace;
            s.text = `Setting up workspace… (${current.current_creation_step || current.status})`;
          }
          s.succeed('Workspace ready');
          printRecord(current, FIELDS);
        } else {
          printRecord(ws, FIELDS);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('update')
    .description('Update a workspace')
    .argument('<id>', 'Workspace ID')
    .option('--name <name>', 'Name')
    .option('--description <desc>', 'Description')
    .option('--language <code>', 'Language')
    .option('--pictures-style <style>', 'Image style')
    .option('--max-articles <n>', 'Max articles per period')
    .option('--period <p>', 'Period')
    .action(async (id, opts) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.language) body.language = opts.language;
        if (opts.picturesStyle) body.pictures_style = opts.picturesStyle;
        if (opts.maxArticles) body.max_articles_per_period = Number(opts.maxArticles);
        if (opts.period) body.max_articles_period = opts.period;

        const res = await client.patch<{ workspace: Record<string, unknown> }>(`/workspaces/${id}`, { workspace: body });
        printRecord(res.data.workspace, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('delete')
    .description('Delete a workspace')
    .argument('<id>', 'Workspace ID')
    .action(async (id) => {
      try {
        await client.delete(`/workspaces/${id}`);
        printSuccess(`Workspace ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
