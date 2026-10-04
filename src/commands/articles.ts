import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { client } from '../client.js';
import { resolveWorkspace, getDefaultWorkspace } from '../config.js';
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
  { key: 'rewrites_left', label: 'Rewrites Left' },
  { key: 'new_covers_left', label: 'New Covers Left' },
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
article has used its 2, the API returns 422 free_limit_reached.

Follow it with "balzac articles get <id>" until Rewriting is false, and stop after a
timeout. A rewrite that fails partway is retried and keeps Rewriting true, so new
rewrites of the article return 409 until it finishes. If it never finishes, write
to hello@hirebalzac.ai.`;

const PICTURE_HELP = `
Modes:
  title   The article title over a background in the brand color: an AI image, or
          a gradient of the brand color with --no-ai-images.
  stock   A stock photo (Unsplash). Without --no-ai-images, a photorealistic AI
          image when no photo matches.
  ai      An image in --style, or in the workspace's style.
Without --mode, the workspace's cover mode applies.

Styles (--style, the API's list): stock-photo, photorealistic, anime, comic-book,
cyber-punk, pixel-art, hand-drawn, line-art, isometric, origami, watercolor,
flat-illustration, 3d-clay. stock-photo is a stock photo; the others are AI images.

--instructions guides an AI image or a title background. For a stock photo, it is
the search query (e.g. "laptop on a desk").

--no-ai-images: no AI image at all. --mode title draws the title on a gradient of
the brand color (--instructions is not used), and --mode stock never falls back to
AI. --mode ai, or an AI --style outside title mode, is refused.

New covers are free: each article includes 2 on top of the cover written with it,
and a cover counts when it is generated ("balzac articles get" shows New Covers
Left). Only one runs at a time per article (409 conflict while one runs).

422 errors, which count nothing:
  free_limit_reached   The article has used its 2 new covers.
  validation_failed    An unknown --style (the message lists the valid ones), or
                       --mode ai or an AI --style with --no-ai-images.
  no_stock_photo       --no-ai-images and no stock photo matches: try a few search
                       words with --instructions, or --mode title.
A 503 stock_photo_unavailable means the stock photo search did not answer in time
(--no-ai-images): try again in a minute.`;

// The -w flag for a printed follow-up command, so it still works when pasted without
// a default workspace (or with another one).
function workspaceFlag(ws: string): string {
  return ws !== getDefaultWorkspace() ? ` -w ${ws}` : '';
}

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
        printInfo(
          `Run "balzac articles get ${id}${workspaceFlag(ws)}" to follow it: Rewriting goes back to false when ` +
          'it is done. Stop after a timeout: a rewrite that never finishes keeps the article blocked ' +
          '(write to hello@hirebalzac.ai).'
        );
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
    .option('--style <s>', 'Picture style override (see the styles below)')
    .option('--instructions <text>', 'Image instructions, or the search words for a stock photo')
    .option('--no-ai-images', 'No AI image: a title on a brand color gradient, or a stock photo with no AI fallback')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.mode) body.picture_mode = opts.mode;
        // Without a style, the API uses the workspace's, which can be an AI one.
        if (opts.style) body.pictures_style = opts.style;
        else if (opts.mode === 'stock') body.pictures_style = 'stock-photo';
        if (opts.instructions) body.additional_instructions = opts.instructions;
        if (opts.aiImages === false) body.ai_images = false;

        const res = await client.post<Row>(`/workspaces/${ws}/articles/${id}/regenerate_picture`, body);
        if (isJsonMode()) {
          printJson(res.data);
          return;
        }
        printSuccess('Picture regeneration started.');
        printInfo(`Run "balzac articles get ${id}${workspaceFlag(ws)}" to follow it: Picture URL changes when the new cover is ready.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  art.command('publish')
    .description('Publish an article now (prints the new publication, or the API\'s message when the article is already there; -q prints the publication ID)')
    .argument('<id>', 'Article ID')
    .requiredOption('--integration <id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ article: Row; publish?: Row }>(`/workspaces/${ws}/articles/${id}/publish`, {
          integration_id: opts.integration,
        });
        const article = res.data.article;
        // Already on that integration: no new publication, and the newest
        // one in the article is the old one. publish has result
        // already_published, its publication_id and the API's message, which
        // says when nothing was sent (the integration can't take updates).
        const already = res.data.publish;
        if (isJsonMode()) {
          printJson(already ? { ...article, publish: already } : article);
          return;
        }
        if (already) {
          if (isQuietMode()) {
            if (already.publication_id) console.log(already.publication_id);
            return;
          }
          printInfo(String(already.message ?? 'Already published on this integration.'));
          return;
        }
        const publication = newestPublication(article);
        if (isQuietMode()) {
          if (publication) console.log(publication.id);
          return;
        }
        printSuccess('Article publishing started. The post is sent in the background.');
        if (publication) printRecord(publication, PUBLISHED_FIELDS);
        printInfo(
          `Run "balzac articles get ${id}${workspaceFlag(ws)}" to follow it: Published turns true once the platform ` +
          'accepts the post, and the live URL appears when the platform reports it (drafts and some webhooks never do). ' +
          'Stop after a timeout: a failed send isn\'t reported, so if nothing changes, check the integration\'s ' +
          `status with "balzac integrations get ${opts.integration}${workspaceFlag(ws)}".`
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
          printInfo(`To cancel it: balzac articles cancel-schedule ${id} --publication ${publication.id}${workspaceFlag(ws)}`);
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
