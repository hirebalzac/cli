import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import {
  printRecord, printSuccess, printError, spinner, isJsonMode, printJson,
} from '../output.js';

const ARTICLE_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'slug', label: 'Slug' },
  { key: 'status', label: 'Status' },
  { key: 'topic', label: 'Topic' },
  { key: 'done_at', label: 'Done At' },
  { key: 'main_picture_url', label: 'Picture URL' },
];

export function registerWriteCommand(program: Command) {
  program
    .command('write')
    .description('Write an article from a topic (shortcut: creates briefing + optionally waits)')
    .argument('<topic>', 'Article topic')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--type <type>', 'Article type')
    .option('--length <length>', 'Article length')
    .option('--language <code>', 'Language')
    .option('--wait', 'Wait for the article to be completed')
    .action(async (topic, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = { topic };
        if (opts.type) body.type_of = opts.type;
        if (opts.length) body.length = opts.length;
        if (opts.language) body.language = opts.language;

        const res = await client.post<{ briefing: Record<string, unknown> }>(
          `/workspaces/${ws}/briefings`, { briefing: body }
        );
        const briefing = res.data.briefing;
        printSuccess('Briefing created — article writing started.');

        if (!opts.wait) {
          printRecord(briefing, [
            { key: 'id', label: 'Briefing ID' },
            { key: 'topic', label: 'Topic' },
            { key: 'status', label: 'Status' },
          ]);
          return;
        }

        const s = spinner('Writing article…');
        s.start();

        // Poll for the latest article in the workspace that matches this briefing's topic
        let article: Record<string, unknown> | null = null;
        let attempts = 0;
        const maxAttempts = 360; // ~30 minutes at 5s intervals

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));
          attempts++;

          try {
            const articlesRes = await client.paginate<Record<string, unknown>>(
              `/workspaces/${ws}/articles`, 'articles',
              { per_page: 5 }
            );
            // Find the article for this briefing (most recent, matching topic)
            const match = articlesRes.items.find(
              (a) => a.topic === topic || a.status === 'done'
            );
            if (match && match.status === 'done') {
              article = match;
              break;
            }
            const inProgress = articlesRes.items.find(
              (a) => a.status === 'in_progress' || a.status === 'waiting'
            );
            if (inProgress) {
              s.text = `Writing article… (${inProgress.status})`;
            }
          } catch {
            // Ignore polling errors, keep trying
          }
        }

        if (article) {
          s.succeed('Article completed!');
          if (isJsonMode()) {
            printJson(article);
          } else {
            printRecord(article, ARTICLE_FIELDS);
          }
        } else {
          s.warn('Article is still being written. Check back with: balzac articles list');
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
