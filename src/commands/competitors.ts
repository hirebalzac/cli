import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import { printTable, printRecord, printPagination, printSuccess, printError, truncate } from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'domain', label: 'Domain' },
  { key: 'domain_without_scheme', label: 'Hostname' },
  { key: 'created_at', label: 'Created' },
];

export function registerCompetitorsCommands(program: Command) {
  const comp = program.command('competitors').alias('comp').description('Manage competitor domains');

  comp.command('list')
    .description('List competitors')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/competitors`, 'competitors',
          { page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'domain', label: 'Domain' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  comp.command('get')
    .description('Get competitor details')
    .argument('<id>', 'Competitor ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ competitor: Record<string, unknown> }>(`/workspaces/${ws}/competitors/${id}`);
        printRecord(res.data.competitor, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  comp.command('add')
    .description('Add a competitor')
    .requiredOption('--name <name>', 'Competitor name')
    .requiredOption('--domain <url>', 'Competitor domain URL')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ competitor: Record<string, unknown> }>(
          `/workspaces/${ws}/competitors`,
          { competitor: { name: opts.name, domain: opts.domain } }
        );
        printSuccess('Competitor added.');
        printRecord(res.data.competitor, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  comp.command('remove')
    .description('Remove a competitor')
    .argument('<id>', 'Competitor ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/competitors/${id}`);
        printSuccess(`Competitor ${id} removed.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
