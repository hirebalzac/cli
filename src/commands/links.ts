import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import { printTable, printRecord, printPagination, printSuccess, printError, truncate } from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'url', label: 'URL' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'scrapped', label: 'Scraped' },
  { key: 'created_at', label: 'Created' },
];

export function registerLinksCommands(program: Command) {
  const ln = program.command('links').alias('ln').description('Manage reference links');

  ln.command('list')
    .description('List links')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/links`, 'links',
          { page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID' },
          { key: 'url', label: 'URL' },
          { key: 'title', label: 'Title' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ln.command('get')
    .description('Get link details')
    .argument('<id>', 'Link ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ link: Record<string, unknown> }>(`/workspaces/${ws}/links/${id}`);
        printRecord(res.data.link, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ln.command('add')
    .description('Add a reference link')
    .requiredOption('--url <url>', 'Link URL')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ link: Record<string, unknown> }>(
          `/workspaces/${ws}/links`, { link: { url: opts.url } }
        );
        printSuccess('Link added.');
        printRecord(res.data.link, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ln.command('remove')
    .description('Remove a link')
    .argument('<id>', 'Link ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/links/${id}`);
        printSuccess(`Link ${id} removed.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
