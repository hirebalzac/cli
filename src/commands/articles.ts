import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, printInfo, printJson, isJsonMode, isQuietMode, formatStatus,
} from '../output.js';

type Row = Record<string, unknown>;

const LIST_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status', format: (v: unknown) => formatStatus(v as string) },
  { key: 'type_of', label: 'Type' },
  { key: 'language', label: 'Lang' },
  { key: 'published', label: 'Published', format: (v: unknown) => v ? '✓' : '' },
  { key: 'live_url', label: 'Live URL', format: (v: unknown) => v ? String(v) : '' },
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
  { key: 'live_url', label: 'Live URL' },
  { key: 'rewriting', label: 'Rewriting' },
  { key: 'done_at', label: 'Done At' },
  { key: 'main_picture_url', label: 'Picture URL' },
  { key: 'created_at', label: 'Created' },
];

const PUBLICATION_COLS = [
  { key: 'id', label: 'Publication ID' },
  { key: 'status', label: 'Status', format: (v: unknown) => formatStatus(v as string) },
  { key: 'url', label: 'URL' },
  { key: 'scheduled_for', label: 'Scheduled For' },
];

const PUBLISHED_FIELDS = [
  { key: 'id', label: 'Publication ID' },
  { key: 'status', label: 'Status' },
  { key: 'integration_id', label: 'Integration ID' },
  { key: 'url', label: 'URL' },
];

const SCHEDULED_FIELDS = [
  { key: 'id', label: 'Publication ID' },
  { key: 'status', label: 'Status' },
  { key: 'integration_id', label: 'Integration ID' },
  { key: 'scheduled_for', label: 'Scheduled For' },
];

const REWRITE_HELP = `
Rewrites are free: each article includes 2, and a rewrite counts when it finishes.
Only one rewrite runs at a time per article (409 conflict while one runs). Once the
article has used its 2, the API returns 422 free_limit_reached.`;

const PICTURE_HELP = `
New covers are free: each article includes 2 on top of the cover written with it,
and a cover counts when it is generated. Only one runs at a time per article (409
conflict while one runs). Once the article has used its 2, the API returns 422
free_limit_reached.`;

function publicationsOf(article: Row): Row[] {
  return Array.isArray(article.publications) ? (article.publications as Row[]) : [];
}

// The publication a publish or schedule call just created: the newest one.
function newestPublication(article: Row, status?: string): Row | undefined {
  return publicationsOf(article)
    .filter((p) => !status || p.status === status)
    .reduce<Row | undefined>(
      (newest, p) => (!newest || String(p.created_at) > String(newest.created_at) ? p : newest),
      undefined
    );
}

function printArticle(article: Row) {
  printRecord(article, FIELDS);
  if (isJsonMode() || isQuietMode()) return;

  const pubs = publicationsOf(article);
  console.log('');
  if (pubs.length === 0) {
    console.log(chalk.bold('Publications:') + ' ' + chalk.dim('none'));
    return;
  }
  console.log(chalk.bold('Publications:'));
  printTable(pubs, PUBLICATION_COLS);
}

export function registerArticlesCommands(program: Command) {
  const art = program.command('articles').alias('art').description('Manage articles');

  art.command('list')
    .description('List articles (with their live URL once published)')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--status <s>', 'Filter: waiting/waiting_for_credits/in_progress/done')
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
    .description('Get article details, live URL and publications (--json includes the HTML content when done)')
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ article: Row }>(`/workspaces/${ws}/articles/${id}`);
        printArticle(res.data.article);
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
    .description('Rewrite an article (free, 2 per article)')
    .addHelpText('after', REWRITE_HELP)
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

        const res = await client.post<{ article: Row }>(`/workspaces/${ws}/articles/${id}/rewrite`, body);
        if (isJsonMode()) {
          printJson(res.data.article);
          return;
        }
        printSuccess('Article rewrite started.');
        printInfo(`Run "balzac articles get ${id}" to follow it: Rewriting goes back to false when it is done.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('regenerate-picture')
    .description('Regenerate article picture (free, 2 per article)')
    .addHelpText('after', PICTURE_HELP)
    .argument('<id>', 'Article ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--mode <mode>', 'Picture mode: title (title overlay), stock (stock photo), ai (AI generated)')
    .option('--style <s>', 'Picture style override (for ai mode)')
    .option('--instructions <text>', 'Generation instructions (for ai mode)')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.mode) body.picture_mode = opts.mode;
        if (opts.style) body.pictures_style = opts.style;
        if (opts.instructions) body.additional_instructions = opts.instructions;

        const res = await client.post<Row>(`/workspaces/${ws}/articles/${id}/regenerate_picture`, body);
        if (isJsonMode()) {
          printJson(res.data);
          return;
        }
        printSuccess('Picture regeneration started.');
        printInfo(`Run "balzac articles get ${id}" to follow it: Picture URL changes when the new cover is ready.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('publish')
    .description('Publish an article now (prints the new publication; -q prints its ID)')
    .argument('<id>', 'Article ID')
    .requiredOption('--integration <id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ article: Row }>(`/workspaces/${ws}/articles/${id}/publish`, {
          integration_id: opts.integration,
        });
        const article = res.data.article;
        const publication = newestPublication(article);
        if (isJsonMode()) {
          printJson(article);
          return;
        }
        if (isQuietMode()) {
          if (publication) console.log(publication.id);
          return;
        }
        printSuccess('Article publishing started. The post is sent in the background.');
        if (publication) printRecord(publication, PUBLISHED_FIELDS);
        printInfo(
          `Run "balzac articles get ${id}" to follow it: Published turns true once the platform ` +
          'accepts the post, and the live URL appears when the platform reports it (drafts and some webhooks never do).'
        );
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('schedule')
    .description('Schedule article publication (prints the new publication; -q prints its ID)')
    .argument('<id>', 'Article ID')
    .requiredOption('--integration <id>', 'Integration ID')
    .requiredOption('--at <datetime>', 'ISO 8601 datetime (e.g. 2026-04-01T10:00:00Z)')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ article: Row }>(`/workspaces/${ws}/articles/${id}/schedule`, {
          integration_id: opts.integration,
          scheduled_for: opts.at,
        });
        const article = res.data.article;
        const publication = newestPublication(article, 'scheduled');
        if (isJsonMode()) {
          printJson(article);
          return;
        }
        if (isQuietMode()) {
          if (publication) console.log(publication.id);
          return;
        }
        printSuccess(`Article scheduled for ${publication?.scheduled_for ?? opts.at}.`);
        if (publication) {
          printRecord(publication, SCHEDULED_FIELDS);
          printInfo(`To cancel it: balzac articles cancel-schedule ${id} --publication ${publication.id}`);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('cancel-schedule')
    .description('Cancel a scheduled publication')
    .argument('<id>', 'Article ID')
    .requiredOption('--publication <id>', 'Publication ID (listed by "balzac articles get")')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.delete<{ article: Row }>(`/workspaces/${ws}/articles/${id}/cancel_schedule`, {
          publication_id: opts.publication,
        });
        if (isJsonMode()) {
          printJson(res.data.article);
          return;
        }
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
