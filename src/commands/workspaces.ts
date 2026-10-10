import { Command } from 'commander';
import { client } from '../client.js';
import {
  printTable, printRecord, printPagination, printSuccess,
  printError, printJson, isJsonMode, formatStatus, truncate, spinner,
} from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'domain', label: 'Domain' },
  { key: 'status', label: 'Status' },
  { key: 'language', label: 'Language' },
  { key: 'description', label: 'Description' },
  { key: 'target_audience', label: 'Target Audience' },
  { key: 'theme', label: 'Theme' },
  { key: 'pictures_style', label: 'Pictures Style' },
  { key: 'title_based_featured_image', label: 'Title Overlay' },
  { key: 'brand_color', label: 'Brand Color' },
  { key: 'title_font', label: 'Title Font' },
  { key: 'max_articles_per_period', label: 'Max Articles/Period' },
  { key: 'max_articles_period', label: 'Period' },
  { key: 'auto_accept_suggestions', label: 'Auto-accept Suggestions' },
  { key: 'keywords_used', label: 'Keywords Used' },
  { key: 'keywords_max', label: 'Keywords Max' },
  { key: 'keywords_remaining', label: 'Keywords Remaining' },
  { key: 'setup_completed', label: 'Setup Completed' },
  { key: 'created_at', label: 'Created' },
];

function flattenKeywordsLimit(ws: Record<string, unknown>): Record<string, unknown> {
  const limit = ws.keywords_limit as Record<string, unknown> | undefined;
  if (limit) {
    ws.keywords_used = limit.used;
    ws.keywords_max = limit.max;
    ws.keywords_remaining = limit.remaining;
  }
  return ws;
}

export function registerWorkspacesCommands(program: Command) {
  const ws = program.command('workspaces').alias('ws').description('Manage workspaces');

  ws.command('list')
    .description('List all workspaces')
    .option('--status <status>', 'Filter by status')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '25')
    .action(async (opts) => {
      try {
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          '/workspaces', 'workspaces',
          { status: opts.status, page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'domain', label: 'Domain' },
          { key: 'status', label: 'Status', format: (v) => formatStatus(v as string) },
          { key: 'language', label: 'Lang' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('get')
    .description('Get workspace details')
    .argument('<id>', 'Workspace ID')
    .action(async (id) => {
      try {
        const res = await client.get<{ workspace: Record<string, unknown> }>(`/workspaces/${id}`);
        printRecord(flattenKeywordsLimit(res.data.workspace), FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('create')
    .description('Create a new workspace')
    .requiredOption('--domain <url>', 'Website domain')
    .option('--name <name>', 'Workspace name')
    .option('--description <desc>', 'Description')
    .option('--language <code>', 'Language code')
    .option('--auto-accept-keywords', 'Auto-accept discovered keywords', true)
    .option('--no-auto-accept-keywords', 'Require manual keyword review')
    .option('--auto-accept-suggestions', 'Auto-accept generated suggestions')
    .option('--pictures-style <style>', 'Image style')
    .option('--title-based-image', 'Enable title overlay mode for cover images')
    .option('--brand-color <hex>', 'Brand color hex code (e.g. #FF5500)')
    .option('--title-font <font>', 'Title font (montserrat/playfair/poppins/lora/oswald)')
    .option('--max-articles <n>', 'Max articles per period')
    .option('--period <p>', 'Article limit period (day/week/month)')
    .option('--wait', 'Wait for workspace setup to complete')
    .action(async (opts) => {
      try {
        const body: Record<string, unknown> = { domain: opts.domain };
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.language) body.language = opts.language;
        if (opts.autoAcceptKeywords !== undefined) body.auto_accept_keywords = opts.autoAcceptKeywords;
        if (opts.autoAcceptSuggestions) body.auto_accept_suggestions = true;
        if (opts.picturesStyle) body.pictures_style = opts.picturesStyle;
        if (opts.titleBasedImage) body.title_based_featured_image = true;
        if (opts.brandColor) body.brand_color = opts.brandColor;
        if (opts.titleFont) body.title_font = opts.titleFont;
        if (opts.maxArticles) body.max_articles_per_period = Number(opts.maxArticles);
        if (opts.period) body.max_articles_period = opts.period;

        const res = await client.post<{ workspace: Record<string, unknown> }>('/workspaces', { workspace: body });
        const ws = res.data.workspace;

        if (opts.wait && ws.status !== 'ready' && ws.status !== 'imported') {
          const s = spinner('Setting up workspace…');
          s.start();
          let current = ws;
          while (current.status === 'new' || current.status === 'running') {
            await new Promise((r) => setTimeout(r, 5000));
            const poll = await client.get<{ workspace: Record<string, unknown> }>(`/workspaces/${current.id}`);
            current = poll.data.workspace;
            s.text = `Setting up workspace… (${current.current_creation_step || current.status})`;
          }
          s.succeed('Workspace ready');
          printRecord(flattenKeywordsLimit(current), FIELDS);
        } else {
          printRecord(flattenKeywordsLimit(ws), FIELDS);
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('update')
    .description('Update a workspace')
    .argument('<id>', 'Workspace ID')
    .option('--name <name>', 'Name')
    .option('--description <desc>', 'Description')
    .option('--target-audience <text>', 'Who the articles are for')
    .option('--pain-points <text>', 'Problems the audience has, one per line')
    .option('--features-benefits <text>', 'Features and benefits to mention, one per line')
    .option('--usage <text>', 'How customers use the product or site')
    .option('--theme <text>', 'The site theme or niche')
    .option('--language <code>', 'Language')
    .option('--pictures-style <style>', 'Image style')
    .option('--title-based-image', 'Enable title overlay mode for cover images')
    .option('--no-title-based-image', 'Disable title overlay mode')
    .option('--brand-color <hex>', 'Brand color hex code (e.g. #FF5500)')
    .option('--title-font <font>', 'Title font (montserrat/playfair/poppins/lora/oswald)')
    .option('--max-articles <n>', 'Max articles per period')
    .option('--period <p>', 'Period')
    .action(async (id, opts) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.targetAudience) body.target_audience = opts.targetAudience;
        if (opts.painPoints) body.pain_points = opts.painPoints;
        if (opts.featuresBenefits) body.features_benefits = opts.featuresBenefits;
        if (opts.usage) body.usage = opts.usage;
        if (opts.theme) body.theme = opts.theme;
        if (opts.language) body.language = opts.language;
        if (opts.picturesStyle) body.pictures_style = opts.picturesStyle;
        if (opts.titleBasedImage !== undefined) body.title_based_featured_image = opts.titleBasedImage;
        if (opts.brandColor) body.brand_color = opts.brandColor;
        if (opts.titleFont) body.title_font = opts.titleFont;
        if (opts.maxArticles) body.max_articles_per_period = Number(opts.maxArticles);
        if (opts.period) body.max_articles_period = opts.period;

        const res = await client.patch<{ workspace: Record<string, unknown> }>(`/workspaces/${id}`, { workspace: body });
        printRecord(flattenKeywordsLimit(res.data.workspace), FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  ws.command('delete')
    .description('Delete a workspace')
    .argument('<id>', 'Workspace ID')
    .action(async (id) => {
      try {
        await client.delete(`/workspaces/${id}`);
        printSuccess(`Workspace ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
