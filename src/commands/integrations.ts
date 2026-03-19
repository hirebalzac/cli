import { Command } from 'commander';
import { client } from '../client.js';
import { resolveWorkspace } from '../config.js';
import { printTable, printRecord, printPagination, printSuccess, printError, truncate } from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'service', label: 'Service' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'auto_publish', label: 'Auto-publish' },
  { key: 'created_at', label: 'Created' },
];

function statusColor(v: unknown): string {
  const s = String(v);
  if (s === 'up') return '\x1b[32mup\x1b[0m';
  if (s === 'down') return '\x1b[31mdown\x1b[0m';
  return '\x1b[33mpending\x1b[0m';
}

export function registerIntegrationsCommands(program: Command) {
  const intg = program.command('integrations').alias('intg').description('Manage publishing integrations');

  // ── List ──────────────────────────────────────────────────
  intg.command('list')
    .description('List integrations')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--page <n>', 'Page', '1')
    .option('--per-page <n>', 'Per page', '25')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const { items, meta } = await client.paginate<Record<string, unknown>>(
          `/workspaces/${ws}/integrations`, 'integrations',
          { page: opts.page, per_page: opts.perPage }
        );
        printTable(items, [
          { key: 'id', label: 'ID', format: (v) => String(v).slice(0, 8) + '…' },
          { key: 'service', label: 'Service' },
          { key: 'name', label: 'Name', format: (v) => truncate(v as string, 25) },
          { key: 'status', label: 'Status', format: statusColor },
          { key: 'auto_publish', label: 'Auto-publish', format: (v) => v ? '✓' : '—' },
        ]);
        printPagination(meta);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Get ───────────────────────────────────────────────────
  intg.command('get')
    .description('Get integration details')
    .argument('<id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.get<{ integration: Record<string, unknown> }>(`/workspaces/${ws}/integrations/${id}`);
        printRecord(res.data.integration, FIELDS);

        const intgData = res.data.integration;
        const service = intgData.service as string;

        const serviceFields: { key: string; label: string }[] = [];
        if (service === 'wordpress') {
          serviceFields.push({ key: 'wordpress_url', label: 'WordPress URL' });
          serviceFields.push({ key: 'wordpress_username', label: 'Username' });
        } else if (service === 'webflow') {
          serviceFields.push({ key: 'webflow_site_id', label: 'Site ID' });
          serviceFields.push({ key: 'webflow_collection_id', label: 'Collection ID' });
          serviceFields.push({ key: 'webflow_publication_status', label: 'Pub. Status' });
        } else if (service === 'wix') {
          serviceFields.push({ key: 'wix_site_id', label: 'Site ID' });
          serviceFields.push({ key: 'wix_member_id', label: 'Member ID' });
        } else if (service === 'gohighlevel') {
          serviceFields.push({ key: 'gohighlevel_location_id', label: 'Location ID' });
          serviceFields.push({ key: 'gohighlevel_blog_id', label: 'Blog ID' });
          serviceFields.push({ key: 'gohighlevel_author_id', label: 'Author ID' });
          serviceFields.push({ key: 'gohighlevel_category_id', label: 'Category ID' });
          serviceFields.push({ key: 'gohighlevel_publication_status', label: 'Pub. Status' });
        } else if (service === 'webhook') {
          serviceFields.push({ key: 'webhook_url', label: 'Webhook URL' });
        }

        if (serviceFields.length > 0) {
          printRecord(intgData, serviceFields);
        }

        if (service === 'webflow' && Array.isArray(intgData.field_mappings)) {
          const mappings = intgData.field_mappings as Record<string, unknown>[];
          if (mappings.length > 0) {
            printTable(mappings, [
              { key: 'source_field', label: 'Webflow Field ID' },
              { key: 'destination_field', label: 'Balzac Field' },
            ]);
          }
        }
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Create ────────────────────────────────────────────────
  intg.command('create')
    .description('Create an integration')
    .requiredOption('--service <service>', 'Service: wordpress, webflow, wix, gohighlevel, webhook')
    .requiredOption('--name <name>', 'Integration name')
    .option('--auto-publish', 'Enable auto-publish', false)
    .option('--wordpress-url <url>', 'WordPress site URL')
    .option('--wordpress-username <user>', 'WordPress username')
    .option('--wordpress-password <pass>', 'WordPress application password')
    .option('--webflow-token <token>', 'Webflow API token')
    .option('--webflow-site-id <id>', 'Webflow site ID')
    .option('--webflow-collection-id <id>', 'Webflow collection ID')
    .option('--webflow-pub-status <status>', 'Webflow publication status: published|draft', 'published')
    .option('--wix-api-key <key>', 'Wix API key')
    .option('--wix-site-id <id>', 'Wix site ID')
    .option('--wix-member-id <id>', 'Wix member ID')
    .option('--ghl-token <token>', 'GoHighLevel API token')
    .option('--ghl-location-id <id>', 'GoHighLevel location ID')
    .option('--ghl-blog-id <id>', 'GoHighLevel blog ID')
    .option('--ghl-author-id <id>', 'GoHighLevel author ID')
    .option('--ghl-category-id <id>', 'GoHighLevel category ID')
    .option('--ghl-pub-status <status>', 'GoHighLevel publication status: PUBLISHED|DRAFT', 'PUBLISHED')
    .option('--webhook-url <url>', 'Webhook URL')
    .option('--webhook-token <token>', 'Webhook bearer token')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {
          service: opts.service,
          name: opts.name,
          auto_publish: opts.autoPublish,
        };

        if (opts.service === 'wordpress') {
          body.wordpress_url = opts.wordpressUrl;
          body.wordpress_username = opts.wordpressUsername;
          body.wordpress_application_password = opts.wordpressPassword;
        } else if (opts.service === 'webflow') {
          body.webflow_api_token = opts.webflowToken;
          body.webflow_site_id = opts.webflowSiteId;
          body.webflow_collection_id = opts.webflowCollectionId;
          body.webflow_publication_status = opts.webflowPubStatus;
        } else if (opts.service === 'wix') {
          body.wix_api_key = opts.wixApiKey;
          body.wix_site_id = opts.wixSiteId;
          body.wix_member_id = opts.wixMemberId;
        } else if (opts.service === 'gohighlevel') {
          body.gohighlevel_api_token = opts.ghlToken;
          body.gohighlevel_location_id = opts.ghlLocationId;
          body.gohighlevel_blog_id = opts.ghlBlogId;
          body.gohighlevel_author_id = opts.ghlAuthorId;
          body.gohighlevel_category_id = opts.ghlCategoryId;
          body.gohighlevel_publication_status = opts.ghlPubStatus;
        } else if (opts.service === 'webhook') {
          body.webhook_url = opts.webhookUrl;
          body.webhook_bearer_token = opts.webhookToken;
        }

        const res = await client.post<{ integration: Record<string, unknown> }>(
          `/workspaces/${ws}/integrations`,
          { integration: body }
        );
        printSuccess(`Integration created (status: pending — connection test running).`);
        printRecord(res.data.integration, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Update ────────────────────────────────────────────────
  intg.command('update')
    .description('Update an integration')
    .argument('<id>', 'Integration ID')
    .option('--name <name>', 'Integration name')
    .option('--auto-publish <bool>', 'Enable/disable auto-publish')
    .option('--wordpress-url <url>', 'WordPress site URL')
    .option('--wordpress-username <user>', 'WordPress username')
    .option('--wordpress-password <pass>', 'WordPress application password')
    .option('--webflow-token <token>', 'Webflow API token')
    .option('--webflow-site-id <id>', 'Webflow site ID')
    .option('--webflow-collection-id <id>', 'Webflow collection ID')
    .option('--webflow-pub-status <status>', 'Webflow publication status')
    .option('--wix-api-key <key>', 'Wix API key')
    .option('--wix-site-id <id>', 'Wix site ID')
    .option('--wix-member-id <id>', 'Wix member ID')
    .option('--ghl-token <token>', 'GoHighLevel API token')
    .option('--ghl-location-id <id>', 'GoHighLevel location ID')
    .option('--ghl-blog-id <id>', 'GoHighLevel blog ID')
    .option('--ghl-author-id <id>', 'GoHighLevel author ID')
    .option('--ghl-category-id <id>', 'GoHighLevel category ID')
    .option('--ghl-pub-status <status>', 'GoHighLevel publication status')
    .option('--webhook-url <url>', 'Webhook URL')
    .option('--webhook-token <token>', 'Webhook bearer token')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.autoPublish !== undefined) body.auto_publish = opts.autoPublish === 'true';
        if (opts.wordpressUrl) body.wordpress_url = opts.wordpressUrl;
        if (opts.wordpressUsername) body.wordpress_username = opts.wordpressUsername;
        if (opts.wordpressPassword) body.wordpress_application_password = opts.wordpressPassword;
        if (opts.webflowToken) body.webflow_api_token = opts.webflowToken;
        if (opts.webflowSiteId) body.webflow_site_id = opts.webflowSiteId;
        if (opts.webflowCollectionId) body.webflow_collection_id = opts.webflowCollectionId;
        if (opts.webflowPubStatus) body.webflow_publication_status = opts.webflowPubStatus;
        if (opts.wixApiKey) body.wix_api_key = opts.wixApiKey;
        if (opts.wixSiteId) body.wix_site_id = opts.wixSiteId;
        if (opts.wixMemberId) body.wix_member_id = opts.wixMemberId;
        if (opts.ghlToken) body.gohighlevel_api_token = opts.ghlToken;
        if (opts.ghlLocationId) body.gohighlevel_location_id = opts.ghlLocationId;
        if (opts.ghlBlogId) body.gohighlevel_blog_id = opts.ghlBlogId;
        if (opts.ghlAuthorId) body.gohighlevel_author_id = opts.ghlAuthorId;
        if (opts.ghlCategoryId) body.gohighlevel_category_id = opts.ghlCategoryId;
        if (opts.ghlPubStatus) body.gohighlevel_publication_status = opts.ghlPubStatus;
        if (opts.webhookUrl) body.webhook_url = opts.webhookUrl;
        if (opts.webhookToken) body.webhook_bearer_token = opts.webhookToken;

        const res = await client.patch<{ integration: Record<string, unknown> }>(
          `/workspaces/${ws}/integrations/${id}`,
          { integration: body }
        );
        printSuccess('Integration updated (connection test running).');
        printRecord(res.data.integration, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Delete ────────────────────────────────────────────────
  intg.command('delete')
    .description('Delete an integration')
    .argument('<id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        await client.delete(`/workspaces/${ws}/integrations/${id}`);
        printSuccess(`Integration ${id} deleted.`);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Reconnect ─────────────────────────────────────────────
  intg.command('reconnect')
    .description('Reconnect / test an integration')
    .argument('<id>', 'Integration ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (id, opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ integration: Record<string, unknown> }>(
          `/workspaces/${ws}/integrations/${id}/reconnect`, {}
        );
        printSuccess('Reconnection test queued.');
        printRecord(res.data.integration, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  // ── Lookup sub-commands ───────────────────────────────────
  const lookup = intg.command('lookup').description('Discover remote resources for integration setup');

  lookup.command('webflow-sites')
    .description('Discover Webflow sites')
    .requiredOption('--token <token>', 'Webflow API token')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ sites: Record<string, unknown>[] }>(
          `/workspaces/${ws}/integrations/lookup_webflow_sites`,
          { token: opts.token }
        );
        printTable(res.data.sites || [], [
          { key: 'id', label: 'Site ID' },
          { key: 'displayName', label: 'Name' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  lookup.command('webflow-collections')
    .description('Discover Webflow collections for a site')
    .requiredOption('--token <token>', 'Webflow API token')
    .requiredOption('--site-id <id>', 'Webflow site ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ collections: Record<string, unknown>[] }>(
          `/workspaces/${ws}/integrations/lookup_webflow_collections`,
          { token: opts.token, site_id: opts.siteId }
        );
        printTable(res.data.collections || [], [
          { key: 'id', label: 'Collection ID' },
          { key: 'displayName', label: 'Name' },
          { key: 'slug', label: 'Slug' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  lookup.command('webflow-fields')
    .description('Discover fields in a Webflow collection')
    .requiredOption('--token <token>', 'Webflow API token')
    .requiredOption('--collection-id <id>', 'Webflow collection ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ fields: Record<string, unknown>[] }>(
          `/workspaces/${ws}/integrations/lookup_webflow_fields`,
          { token: opts.token, collection_id: opts.collectionId }
        );
        printTable(res.data.fields || [], [
          { key: 'id', label: 'Field ID' },
          { key: 'displayName', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'slug', label: 'Slug' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  lookup.command('wix-sites')
    .description('Discover Wix sites')
    .requiredOption('--api-key <key>', 'Wix API key')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ sites: Record<string, unknown>[] }>(
          `/workspaces/${ws}/integrations/lookup_wix_sites`,
          { api_key: opts.apiKey }
        );
        printTable(res.data.sites || [], [
          { key: 'id', label: 'Site ID' },
          { key: 'displayName', label: 'Name' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  lookup.command('wix-members')
    .description('Discover Wix members for a site')
    .requiredOption('--api-key <key>', 'Wix API key')
    .requiredOption('--site-id <id>', 'Wix site ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{ members: Record<string, unknown>[] }>(
          `/workspaces/${ws}/integrations/lookup_wix_members`,
          { api_key: opts.apiKey, site_id: opts.siteId }
        );
        printTable(res.data.members || [], [
          { key: 'id', label: 'Member ID' },
          { key: 'loginEmail', label: 'Email' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  lookup.command('gohighlevel-resources')
    .description('Discover GoHighLevel blogs, categories, and authors')
    .requiredOption('--token <token>', 'GoHighLevel API token')
    .requiredOption('--location-id <id>', 'GoHighLevel location ID')
    .option('-w, --workspace <id>', 'Workspace ID')
    .action(async (opts) => {
      try {
        const ws = resolveWorkspace(opts.workspace);
        const res = await client.post<{
          blogs: Record<string, unknown>[];
          categories: Record<string, unknown>[];
          authors: Record<string, unknown>[];
        }>(
          `/workspaces/${ws}/integrations/lookup_gohighlevel_resources`,
          { token: opts.token, location_id: opts.locationId }
        );

        console.log('\nBlogs:');
        printTable(res.data.blogs || [], [
          { key: '_id', label: 'Blog ID' },
          { key: 'name', label: 'Name' },
        ]);

        console.log('\nCategories:');
        printTable(res.data.categories || [], [
          { key: '_id', label: 'Category ID' },
          { key: 'name', label: 'Name' },
        ]);

        console.log('\nAuthors:');
        printTable(res.data.authors || [], [
          { key: '_id', label: 'Author ID' },
          { key: 'name', label: 'Name' },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
