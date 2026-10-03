import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, printInfo, formatStatus, truncate,
} from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'topic', label: 'Topic' },
  { key: 'title', label: 'Title' },
  { key: 'type_of', label: 'Type' },
  { key: 'length', label: 'Length' },
  { key: 'language', label: 'Language' },
  { key: 'focus_keywords', label: 'Focus Keywords' },
  { key: 'description', label: 'Description' },
  { key: 'gsc_derived', label: 'GSC Insight' },
  { key: 'accepted_at', label: 'Accepted At' },
  { key: 'rejected_at', label: 'Rejected At' },
  { key: 'created_at', label: 'Created' },
];

export function registerSuggestionsCommands(program: Command) {
  const sg = program.command('suggestions').alias('sg').description('Manage AI suggestions');

  sg.command('list')
    .description('List suggestions')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--status <s>', 'Filter: proposed/accepted/rejected (default: proposed)')
    .option('--all', 'Show all suggestions including rejected')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const status = opts.all ? undefined : (opts.status || 'proposed');
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/suggestions`, 'suggestions',
          { status, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID' },
          { key: 'topic', label: 'Topic' },
          { key: 'type_of', label: 'Type' },
          { key: 'status', label: 'Status', format: (v) => formatStatus(v as string) },
          { key: 'language', label: 'Lang' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  sg.command('get')
    .description('Get suggestion details')
    .argument('<id>', 'Suggestion ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ suggestion: Record<string, unknown> }>(`/workspaces/${ws}/suggestions/${id}`);
        printRecord(res.data.suggestion, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  sg.command('generate')
    .description('Generate 10 new AI suggestions (costs 1 credit)')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/suggestions/generate`);
        printInfo('Generating 10 new suggestions. They will appear shortly.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  sg.command('accept')
    .description('Accept a suggestion (starts article writing, costs 5 credits)')
    .argument('<id>', 'Suggestion ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ suggestion: Record<string, unknown> }>(`/workspaces/${ws}/suggestions/${id}/accept`);
        printSuccess('Suggestion accepted, article writing started.');
        if (res.status !== 204 && res.data.suggestion) {
          printRecord(res.data.suggestion, FIELDS);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  sg.command('reject')
    .description('Reject a suggestion')
    .argument('<id>', 'Suggestion ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ suggestion: Record<string, unknown> }>(`/workspaces/${ws}/suggestions/${id}/reject`);
        printSuccess('Suggestion rejected.');
        if (res.status !== 204 && res.data.suggestion) {
          printRecord(res.data.suggestion, FIELDS);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
