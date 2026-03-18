import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import { printRecord, printSuccess, printError } from '../output.js';

const FIELDS = [
  { key: 'workspace_id', label: 'Workspace ID' },
  { key: 'description', label: 'Description' },
  { key: 'target_audience', label: 'Target Audience' },
  { key: 'pain_points', label: 'Pain Points' },
  { key: 'features_benefits', label: 'Features & Benefits' },
  { key: 'usage', label: 'Usage' },
  { key: 'theme', label: 'Theme' },
  { key: 'pictures_style', label: 'Pictures Style' },
  { key: 'language', label: 'Language' },
  { key: 'article_length', label: 'Article Length' },
  { key: 'max_articles_per_period', label: 'Max Articles/Period' },
  { key: 'max_articles_period', label: 'Period' },
  { key: 'creates_blog_posts', label: 'Creates Blog Posts' },
  { key: 'auto_accept_suggestions', label: 'Auto-accept Suggestions' },
  { key: 'use_title_cases_in_headings', label: 'Title Case Headings' },
  { key: 'prefer_active_voice', label: 'Prefer Active Voice' },
  { key: 'dont_use_semicolons', label: 'No Semicolons' },
  { key: 'dont_use_exclamation_marks', label: 'No Exclamation Marks' },
  { key: 'insert_screenshots', label: 'Insert Screenshots' },
  { key: 'insert_title_as_h1_heading', label: 'Title as H1' },
  { key: 'write_in_first_person', label: 'First Person' },
];

export function registerSettingsCommands(program: Command) {
  const st = program.command('settings').description('Manage workspace settings');

  st.command('get')
    .description('Get workspace settings')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ settings: Record<string, unknown> }>(`/workspaces/${ws}/settings`);
        printRecord(res.data.settings, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  st.command('update')
    .description('Update workspace settings')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--language <code>', 'Language')
    .option('--article-length <l>', 'Article length')
    .option('--pictures-style <s>', 'Pictures style')
    .option('--max-articles <n>', 'Max articles per period')
    .option('--period <p>', 'Period (day/week/month)')
    .option('--tone <id>', 'Preferred tone of voice ID')
    .option('--auto-accept-suggestions', 'Enable auto-accept suggestions')
    .option('--no-auto-accept-suggestions', 'Disable auto-accept suggestions')
    .option('--title-case-headings', 'Use title case in headings')
    .option('--no-title-case-headings', 'Disable title case')
    .option('--active-voice', 'Prefer active voice')
    .option('--no-active-voice', 'Disable active voice preference')
    .option('--first-person', 'Write in first person')
    .option('--no-first-person', 'Disable first person')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.language) body.language = opts.language;
        if (opts.articleLength) body.article_length = opts.articleLength;
        if (opts.picturesStyle) body.pictures_style = opts.picturesStyle;
        if (opts.maxArticles) body.max_articles_per_period = Number(opts.maxArticles);
        if (opts.period) body.max_articles_period = opts.period;
        if (opts.tone) body.prefered_tone_of_voice_id = opts.tone;
        if (opts.autoAcceptSuggestions !== undefined) body.auto_accept_suggestions = opts.autoAcceptSuggestions;
        if (opts.titleCaseHeadings !== undefined) body.use_title_cases_in_headings = opts.titleCaseHeadings;
        if (opts.activeVoice !== undefined) body.prefer_active_voice = opts.activeVoice;
        if (opts.firstPerson !== undefined) body.write_in_first_person = opts.firstPerson;

        const res = await client.patch<{ settings: Record<string, unknown> }>(
          `/workspaces/${ws}/settings`, { settings: body }
        );
        printSuccess('Settings updated.');
        printRecord(res.data.settings, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
