import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, printInfo, formatStatus, truncate, spinner,
} from '../output.js';

const LIST_COLS = [
  { key: 'id', label: 'ID', format: (v: unknown) => String(v).slice(0, 8) + '…' },
  { key: 'title', label: 'Title', format: (v: unknown) => truncate(v as string, 45) },
  { key: 'status', label: 'Status', format: (v: unknown) => formatStatus(v as string) },
  { key: 'type_of', label: 'Type' },
  { key: 'language', label: 'Lang' },
  { key: 'published', label: 'Published', format: (v: unknown) => v ? '✓' : '' },
];

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'slug', label: 'Slug' },
  { key: 'status', label: 'Status' },
  { key: 'type_of', label: 'Type' },
  { key: 'length', label: 'Length' },
  { key: 'language', label: 'Language' },
  { key: 'topic', label: 'Topic' },
  { key: 'focus_keywords', label: 'Focus Keywords' },
  { key: 'description', label: 'Description' },
  { key: 'creation_source', label: 'Source' },
  { key: 'published', label: 'Published' },
  { key: 'published_at', label: 'Published At' },
  { key: 'rewriting', label: 'Rewriting' },
  { key: 'done_at', label: 'Done At' },
  { key: 'main_picture_url', label: 'Picture URL' },
  { key: 'created_at', label: 'Created' },
];

export function registerArticlesCommands(program: Command) {
  const art = program.command('articles').alias('art').description('Manage articles');

  art.command('list')
    .description('List articles')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--status <s>', 'Filter: waiting/in_progress/done')
    .option('--published <bool>', 'Filter: true/false')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/articles`, 'articles',
          { status: opts.status, published: opts.published, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, LIST_COLS);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('get')
    .description('Get article details (includes HTML content when done)')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ article: Record<string, unknown> }>(`/workspaces/${ws}/articles/${id}`);
        printRecord(res.data.article, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('update')
    .description('Update an article')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--title <title>', 'Title')
    .option('--slug <slug>', 'Slug')
    .option('--description <desc>', 'Description')
    .option('--language <code>', 'Language')
    .option('--tone <id>', 'Tone of voice ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.title) body.title = opts.title;
        if (opts.slug) body.slug = opts.slug;
        if (opts.description) body.description = opts.description;
        if (opts.language) body.language = opts.language;
        if (opts.tone) body.tone_of_voice_id = opts.tone;

        const res = await client.patch<{ article: Record<string, unknown> }>(
          `/workspaces/${ws}/articles/${id}`, { article: body }
        );
        printRecord(res.data.article, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('delete')
    .description('Delete an article')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/articles/${id}`);
        printSuccess(`Article ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('rewrite')
    .description('Rewrite an article (costs 3 credits)')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--length <l>', 'Length (short/normal/long/extra_long)')
    .option('--language <code>', 'Language')
    .option('--tone <id>', 'Tone of voice ID')
    .option('--instructions <text>', 'Rewrite instructions')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.length) body.length = opts.length;
        if (opts.language) body.language = opts.language;
        if (opts.tone) body.tone_of_voice_id = opts.tone;
        if (opts.instructions) body.additional_instructions = opts.instructions;

        await client.post(`/workspaces/${ws}/articles/${id}/rewrite`, body);
        printSuccess('Article rewrite started.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('regenerate-picture')
    .description('Regenerate article picture (costs 1 credit)')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--style <s>', 'Picture style override')
    .option('--instructions <text>', 'Generation instructions')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.style) body.pictures_style = opts.style;
        if (opts.instructions) body.additional_instructions = opts.instructions;

        await client.post(`/workspaces/${ws}/articles/${id}/regenerate_picture`, body);
        printSuccess('Picture regeneration started.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('publish')
    .description('Publish an article')
    .argument('<id>', 'Article ID')
    .requiredOption('--integration <id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/articles/${id}/publish`, {
          integration_id: opts.integration,
        });
        printSuccess('Article publishing started.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('schedule')
    .description('Schedule article publication')
    .argument('<id>', 'Article ID')
    .requiredOption('--integration <id>', 'Integration ID')
    .requiredOption('--at <datetime>', 'ISO 8601 datetime (e.g. 2026-04-01T10:00:00Z)')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.post(`/workspaces/${ws}/articles/${id}/schedule`, {
          integration_id: opts.integration,
          scheduled_for: opts.at,
        });
        printSuccess(`Article scheduled for ${opts.at}.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('cancel-schedule')
    .description('Cancel a scheduled publication')
    .argument('<id>', 'Article ID')
    .requiredOption('--publication <id>', 'Publication ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/articles/${id}/cancel_schedule`, {
          publication_id: opts.publication,
        });
        printSuccess('Scheduled publication cancelled.');
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('export')
    .description('Export article content')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--format <f>', 'Export format: html/markdown/xml', 'html')
    .option('--output <file>', 'Write to file instead of stdout')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ content: string; format: string; article_id: string }>(
          `/workspaces/${ws}/articles/${id}/export`,
          { export_format: opts.format }
        );
        if (opts.output) {
          writeFileSync(opts.output, res.data.content, 'utf-8');
          printSuccess(`Exported to ${opts.output}`);
        } else {
          console.log(res.data.content);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
