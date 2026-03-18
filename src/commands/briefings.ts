import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, formatStatus, truncate,
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
  { key: 'briefing', label: 'Instructions' },
  { key: 'creation_source', label: 'Source' },
  { key: 'accepted_at', label: 'Accepted At' },
  { key: 'created_at', label: 'Created' },
];

export function registerBriefingsCommands(program: Command) {
  const br = program.command('briefings').alias('br').description('Manage briefings (direct write instructions)');

  br.command('list')
    .description('List briefings')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--status <s>', 'Filter: proposed/accepted/rejected')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/briefings`, 'briefings',
          { status: opts.status, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID', format: (v) => String(v).slice(0, 8) + '…' },
          { key: 'topic', label: 'Topic', format: (v) => truncate(v as string, 50) },
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

  br.command('get')
    .description('Get briefing details')
    .argument('<id>', 'Briefing ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ briefing: Record<string, unknown> }>(`/workspaces/${ws}/briefings/${id}`);
        printRecord(res.data.briefing, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  br.command('create')
    .description('Create a briefing and start writing (costs 5 credits)')
    .requiredOption('--topic <topic>', 'Article topic')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--title <title>', 'Article title')
    .option('--type <type>', 'Article type (ai_recommended, listicle, how-to-guide, etc.)')
    .option('--length <length>', 'Article length (short/normal/long/extra_long)')
    .option('--language <code>', 'Language override')
    .option('--focus-keywords <kw>', 'Focus keywords')
    .option('--instructions <text>', 'Writing instructions')
    .option('--keyword <id>', 'Primary keyword ID')
    .option('--secondary-keyword <id>', 'Secondary keyword ID')
    .option('--tone <id>', 'Tone of voice ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = { topic: opts.topic };
        if (opts.title) body.title = opts.title;
        if (opts.type) body.type_of = opts.type;
        if (opts.length) body.length = opts.length;
        if (opts.language) body.language = opts.language;
        if (opts.focusKeywords) body.focus_keywords = opts.focusKeywords;
        if (opts.instructions) body.briefing = opts.instructions;
        if (opts.keyword) body.primary_keyword_id = opts.keyword;
        if (opts.secondaryKeyword) body.secondary_keyword_id = opts.secondaryKeyword;
        if (opts.tone) body.tone_of_voice_id = opts.tone;

        const res = await client.post<{ briefing: Record<string, unknown> }>(
          `/workspaces/${ws}/briefings`, { briefing: body }
        );
        printSuccess('Briefing created — article writing started.');
        printRecord(res.data.briefing, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  br.command('delete')
    .description('Delete a briefing')
    .argument('<id>', 'Briefing ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/briefings/${id}`);
        printSuccess(`Briefing ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
