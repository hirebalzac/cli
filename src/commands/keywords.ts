import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, formatStatus, truncate, printInfo,
} from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'level', label: 'Level' },
  { key: 'status', label: 'Status' },
  { key: 'search_intent', label: 'Search Intent' },
  { key: 'search_volume', label: 'Search Volume' },
  { key: 'competition', label: 'Competition' },
  { key: 'competition_index', label: 'Competition Index' },
  { key: 'cpc', label: 'CPC' },
  { key: 'parent_id', label: 'Parent ID' },
  { key: 'long_tail_keywords_count', label: 'Long-tail Count' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_at', label: 'Created' },
];

export function registerKeywordsCommands(program: Command) {
  const kw = program.command('keywords').alias('kw').description('Manage keywords');

  kw.command('list')
    .description('List keywords')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--level <n>', 'Filter: 1=primary, 2=long-tail')
    .option('--status <s>', 'Filter: enabled/disabled')
    .option('--parent <id>', 'Filter long-tail by parent ID')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/keywords`, 'keywords',
          { level: opts.level, status: opts.status, parent_id: opts.parent, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID', format: (v) => String(v).slice(0, 8) + '…' },
          { key: 'name', label: 'Keyword', format: (v) => truncate(v as string, 40) },
          { key: 'level', label: 'Lvl' },
          { key: 'status', label: 'Status', format: (v) => formatStatus(v as string) },
          { key: 'search_volume', label: 'Volume' },
          { key: 'search_intent', label: 'Intent' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('get')
    .description('Get keyword details')
    .argument('<id>', 'Keyword ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ keyword: Record<string, unknown> }>(`/workspaces/${ws}/keywords/${id}`);
        printRecord(res.data.keyword, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('create')
    .description('Create a keyword')
    .requiredOption('--name <keyword>', 'Keyword text')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ keyword: Record<string, unknown> }>(
          `/workspaces/${ws}/keywords`, { keyword: { name: opts.name } }
        );
        printRecord(res.data.keyword, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('enable')
    .description('Enable a keyword')
    .argument('<id>', 'Keyword ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/keywords/${id}/enable`);
        printSuccess(`Keyword ${id} enabled.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('disable')
    .description('Disable a keyword')
    .argument('<id>', 'Keyword ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/keywords/${id}/disable`);
        printSuccess(`Keyword ${id} disabled.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('generate-long-tail')
    .description('Generate long-tail keyword variations')
    .argument('<id>', 'Keyword ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/keywords/${id}/generate_long_tail`);
        printInfo('Long-tail keyword generation started. Check back shortly.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  kw.command('delete')
    .description('Delete a keyword')
    .argument('<id>', 'Keyword ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/keywords/${id}`);
        printSuccess(`Keyword ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
