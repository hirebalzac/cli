---
name: balzac
description: Balzac is an AI content platform CLI — create workspaces, manage SEO keywords, generate article suggestions, write articles, publish content across integrations, and monitor Google Search Console performance. Supports workspaces, keywords, suggestions, briefings, articles, competitors, links, integrations, search console, settings, and tones of voice.
homepage: https://developer.hirebalzac.ai
metadata: {"clawdbot":{"emoji":"✍️","requires":{"bins":["balzac"],"env":["BALZAC_API_KEY"]}}}
---

## Install Balzac CLI if it doesn't exist

```bash
npm install -g balzac-cli
```

npm release: https://www.npmjs.com/package/balzac-cli
balzac cli github: https://github.com/hirebalzac/cli
api docs: https://developer.hirebalzac.ai
official website: https://hirebalzac.ai

---

| Property | Value |
|----------|-------|
| **name** | balzac |
| **description** | AI content platform CLI for managing workspaces, keywords, suggestions, articles, and Google Search Console data |
| **allowed-tools** | Bash(balzac:*) |

---

## Core Workflow

The fundamental pattern for using the Balzac CLI:

1. **Authenticate** — Set your API key
2. **Create workspace** — From a domain, Balzac auto-analyzes the site
3. **Manage keywords** — Add, enable/disable keywords
4. **Generate content** — Generate suggestions, accept them, or create briefings directly
5. **Manage articles** — List, export, rewrite, regenerate pictures, publish
6. **Monitor performance** — View Google Search Console data (clicks, impressions, CTR, position)

```bash
# 1. Authenticate
export BALZAC_API_KEY=bz_your_key_here
# Or: balzac auth login bz_your_key_here

# 2. Create workspace and wait
balzac workspaces create --domain https://myblog.com --wait
WORKSPACE_ID=$(balzac --json workspaces list | jq -r '.workspaces[0].id')
balzac config set workspace "$WORKSPACE_ID"

# 3. Manage keywords
balzac keywords list
balzac keywords create --name "content marketing"

# 4. Generate content
balzac suggestions generate
# Wait for suggestions to appear
sleep 30
balzac suggestions list --status proposed
balzac suggestions accept <suggestion-id>

# 5. Manage articles
balzac articles list
balzac articles export <article-id> --format markdown
```

---

## Essential Commands

### Setup

```bash
# Required: set API key (one of these methods)
export BALZAC_API_KEY=bz_your_key_here
balzac auth login bz_your_key_here

# Check the key: account, available credits, key name, role and admin flag
balzac auth status

# Optional: set default workspace
balzac config set workspace <workspace-id>

# Optional: custom API URL
export BALZAC_API_URL=https://custom-api.example.com/v1
```

### Workspaces

```bash
# List workspaces
balzac workspaces list
balzac workspaces list --status ready

# Create workspace (auto-setup from domain)
balzac workspaces create --domain https://myblog.com
balzac workspaces create --domain https://myblog.com --wait
balzac workspaces create --domain https://myblog.com --auto-accept-suggestions --language fr

# Get workspace details
balzac workspaces get <workspace-id>

# Update workspace
balzac workspaces update <id> --name "My Blog" --language en

# Delete workspace
balzac workspaces delete <id>
```

### Keywords

```bash
# List keywords (use -w to specify workspace, or set default)
balzac keywords list
balzac keywords list --status enabled

# Create keyword
balzac keywords create --name "content marketing"

# Get keyword details
balzac keywords get <keyword-id>

# Enable / disable
balzac keywords enable <keyword-id>
balzac keywords disable <keyword-id>

# Generate new keywords with AI (async)
balzac keywords generate

# Delete keyword
balzac keywords delete <keyword-id>
```

### Suggestions

```bash
# List suggestions
balzac suggestions list
balzac suggestions list --status proposed

# Get suggestion details
balzac suggestions get <suggestion-id>

# Generate 10 new suggestions (costs 1 credit, async)
balzac suggestions generate

# Accept suggestion — starts article writing (costs 5 credits)
balzac suggestions accept <suggestion-id>

# Reject suggestion
balzac suggestions reject <suggestion-id>
```

### Briefings

```bash
# List briefings
balzac briefings list

# Create briefing — immediately starts writing (costs 5 credits)
balzac briefings create --topic "How to use AI for content marketing"
balzac briefings create --topic "SEO tips" --type listicle --length long

# Create briefing — queue for later writing (respects articles-per-week schedule)
balzac briefings create --topic "Content strategy guide" --queue

# Get briefing details
balzac briefings get <briefing-id>

# Delete briefing
balzac briefings delete <briefing-id>
```

### Articles

```bash
# List articles (Live URL column once published)
balzac articles list
balzac articles list --status done
balzac articles list --status done --published false

# Get article: details, live URL and publications (ID, status, URL, scheduled time)
# --json also includes the HTML content when done
balzac articles get <article-id>

# Update metadata
balzac articles update <id> --title "New Title" --slug "new-slug"

# Rewrite article (free, 2 per article; poll articles get until Rewriting is false)
balzac articles rewrite <id>
balzac articles rewrite <id> --length long --instructions "More technical depth"

# Regenerate picture (free, 2 per article; Picture URL changes when it is ready)
balzac articles regenerate-picture <id>
balzac articles regenerate-picture <id> --style watercolor

# Export content
balzac articles export <id> --format markdown
balzac articles export <id> --format html --output article.html

# Publish now: prints the new publication (-q prints only its ID)
balzac articles publish <id> --integration <integration-id>

# Schedule publication: prints the publication ID (-q prints only the ID)
balzac articles schedule <id> --integration <int-id> --at "2026-04-01T10:00:00Z"

# Cancel schedule (publication IDs are listed by articles get)
balzac articles cancel-schedule <id> --publication <publication-id>

# Delete article
balzac articles delete <id>
```

### Write (Shortcut)

```bash
# Create briefing + optionally wait for completion
balzac write "How to use AI for marketing"
balzac write "SEO tips for 2026" --wait
balzac write "AI comparison" --type listicle --length long --wait
```

### Competitors

```bash
balzac competitors list
balzac competitors add --name "Acme Corp" --domain https://acme.com
balzac competitors get <id>
balzac competitors remove <id>
```

### Links

```bash
balzac links list
balzac links add --url https://myblog.com/about
balzac links get <id>
balzac links remove <id>
```

### Integrations

```bash
# List integrations
balzac integrations list

# Get integration details
balzac integrations get <id>

# Create WordPress integration
balzac integrations create --service wordpress --name "My WP Blog" \
  --wordpress-url https://myblog.com --wordpress-username admin \
  --wordpress-password "app_pass_here"

# Create Webflow integration (discover resources first)
balzac integrations lookup webflow-sites --token "wf_token"
balzac integrations lookup webflow-collections --token "wf_token" --site-id "site_123"
balzac integrations lookup webflow-fields --token "wf_token" --collection-id "col_123"
balzac integrations create --service webflow --name "My Webflow Site" \
  --webflow-token "wf_token" --webflow-site-id "site_123" \
  --webflow-collection-id "col_123" --auto-publish

# Create Wix integration
balzac integrations lookup wix-sites --api-key "wix_key"
balzac integrations lookup wix-members --api-key "wix_key" --site-id "site_123"
balzac integrations create --service wix --name "My Wix Blog" \
  --wix-api-key "wix_key" --wix-site-id "site_123" --wix-member-id "member_123"

# Create GoHighLevel integration
balzac integrations lookup gohighlevel-resources --token "ghl_token" --location-id "loc_123"
balzac integrations create --service gohighlevel --name "My GHL Blog" \
  --ghl-token "ghl_token" --ghl-location-id "loc_123" \
  --ghl-blog-id "blog_123" --ghl-author-id "author_123" \
  --ghl-category-id "cat_123"

# Create Webhook integration
balzac integrations create --service webhook --name "My Webhook" \
  --webhook-url https://example.com/hook --webhook-token "optional_bearer"

# Update integration
balzac integrations update <id> --name "New Name" --auto-publish true

# Moving a URL needs its secret again in the same command: a WordPress URL on
# another site needs --wordpress-password, a new webhook URL needs --webhook-token
# (when the integration has one). Otherwise: 422 validation_failed.
balzac integrations update <id> --wordpress-url https://newblog.com \
  --wordpress-password "app_pass_here"

# Reconnect / test connection
balzac integrations reconnect <id>

# Delete integration
balzac integrations delete <id>
```

### Search Console (alias: `gsc`)

Requires an active Google Search Console integration on the workspace (connected via the web app's OAuth flow). Data is synced daily from Google.

```bash
# Performance overview (30d default, with comparison to previous period)
balzac search-console overview
balzac gsc overview --start-date 2026-01-01 --end-date 2026-03-25

# Top search queries — ranked by impressions
balzac search-console queries
balzac gsc queries --start-date 2026-03-01 --per-page 50

# Top pages — ranked by clicks
balzac search-console pages
balzac gsc pages --page 2 --per-page 50

# Daily time series (for trends / charts)
balzac search-console daily
balzac gsc daily --start-date 2026-02-01 --end-date 2026-03-25
```

All Search Console commands accept:
- `-w, --workspace <id>` — Workspace ID (or set default)
- `--start-date <YYYY-MM-DD>` — Start of period (default: 30 days before end date)
- `--end-date <YYYY-MM-DD>` — End of period (default: today)

The `queries` and `pages` commands also support `--page` and `--per-page` for pagination.

Note: GSC data has a ~3-day delay from Google. The overview compares the selected period to the equivalent previous period and shows percentage changes. The queries endpoint only includes queries that Google discloses (anonymized low-volume queries are excluded by Google).

### Settings

```bash
balzac settings get
balzac settings update --language en --article-length long
balzac settings update --auto-accept-suggestions
balzac settings update --pictures-style watercolor
```

### Tones of Voice

```bash
balzac tones list
balzac tones get <id>
```

### Configuration

```bash
balzac config set workspace <id>
balzac config set api-key bz_abc123
balzac config get
balzac config reset
```

---

## Common Patterns

### Pattern 1: End-to-End Workspace Setup

```bash
#!/bin/bash
# Create workspace from domain, wait for setup, set as default
balzac workspaces create --domain https://myblog.com --wait
WORKSPACE_ID=$(balzac --json workspaces list | jq -r '.workspaces[0].id')
balzac config set workspace "$WORKSPACE_ID"
echo "Workspace $WORKSPACE_ID ready"
```

### Pattern 2: Generate and Accept Suggestions

```bash
#!/bin/bash
# Generate suggestions, wait, then accept the first one
balzac suggestions generate
echo "Waiting for suggestions..."
sleep 30

SUGGESTION_ID=$(balzac --json suggestions list --status proposed | jq -r '.suggestions[0].id')
if [ "$SUGGESTION_ID" != "null" ]; then
  balzac suggestions accept "$SUGGESTION_ID"
  echo "Accepted suggestion $SUGGESTION_ID — article writing started"
else
  echo "No suggestions yet, try again shortly"
fi
```

### Pattern 3: Direct Article Writing

```bash
# Simplest way to write an article — one command
balzac write "Best AI writing tools for 2026" --wait
```

### Pattern 4: Batch Accept All Proposed Suggestions

```bash
#!/bin/bash
balzac --json suggestions list --status proposed | \
  jq -r '.suggestions[].id' | \
  while read -r id; do
    echo "Accepting $id..."
    balzac suggestions accept "$id"
    sleep 1
  done
```

### Pattern 5: Export All Done Articles to Markdown

```bash
#!/bin/bash
mkdir -p exports
balzac --json articles list --status done | \
  jq -r '.articles[] | "\(.id) \(.slug)"' | \
  while read -r id slug; do
    echo "Exporting $slug..."
    balzac articles export "$id" --format markdown --output "exports/${slug}.md"
  done
```

### Pattern 6: Poll for Article Completion

```bash
#!/bin/bash
ARTICLE_ID="$1"
echo "Waiting for article $ARTICLE_ID to complete..."
while true; do
  STATUS=$(balzac --json articles get "$ARTICLE_ID" | jq -r '.article.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "done" ]; then
    echo "Article completed!"
    balzac articles get "$ARTICLE_ID"
    break
  fi
  sleep 10
done
```

### Pattern 7: Connect a WordPress Integration

```bash
#!/bin/bash
# Create a WordPress integration and wait for connection test
balzac integrations create --service wordpress --name "Production Blog" \
  --wordpress-url https://myblog.com \
  --wordpress-username admin \
  --wordpress-password "app_password_here" \
  --auto-publish

INTG_ID=$(balzac --json integrations list | jq -r '.integrations[0].id')
echo "Integration $INTG_ID created, testing connection..."
sleep 5

STATUS=$(balzac --json integrations get "$INTG_ID" | jq -r '.integration.status')
echo "Connection status: $STATUS"
```

### Pattern 8: Set Up a Webhook to Receive Articles

```bash
#!/bin/bash
# Create a webhook integration with auto-publish
# Balzac will POST article data to your URL whenever an article is completed
balzac integrations create --service webhook --name "My App Webhook" \
  --webhook-url "https://example.com/balzac-hook" \
  --webhook-token "my_secret_token" \
  --auto-publish

# Webhook payload sent to your URL:
# {
#   "title": "Article Title",
#   "content": "Full HTML content",
#   "slug": "article-slug",
#   "description": "Short excerpt",
#   "cover_image": "https://...",
#   "published_at": "2026-03-19T15:30:45Z"
# }
#
# Authorization header: Bearer my_secret_token
# Your endpoint should respond with 200 OK. Answer with JSON such as
# {"url": "https://example.com/blog/article-slug"} and Balzac records it as the
# article's live URL (shown by balzac articles get).
```

### Pattern 9: Monitor Search Performance

```bash
#!/bin/bash
# Check how your site is performing in Google Search
balzac gsc overview

# Find your best-performing queries
balzac gsc queries --per-page 10

# Find top pages and their clicks
balzac gsc pages --per-page 10

# Get daily data for a custom period (e.g. last quarter)
balzac --json gsc daily --start-date 2026-01-01 --end-date 2026-03-25
```

### Pattern 10: Find Underperforming Queries to Optimize

```bash
#!/bin/bash
# Find queries with high impressions but low CTR — optimization opportunities
balzac --json gsc queries --per-page 100 | \
  jq '[.queries[] | select(.impressions > 50 and .ctr < 2)] | sort_by(-.impressions) | .[:10]'
```

### Pattern 11: Error Handling and Retry

```bash
#!/bin/bash
MAX_RETRIES=3
TOPIC="AI content strategy"

for attempt in $(seq 1 $MAX_RETRIES); do
  if balzac write "$TOPIC" 2>/dev/null; then
    echo "Article creation started"
    break
  else
    echo "Attempt $attempt failed"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      DELAY=$((2 ** attempt))
      echo "Retrying in ${DELAY}s..."
      sleep "$DELAY"
    else
      echo "Failed after $MAX_RETRIES attempts"
      exit 1
    fi
  fi
done
```

---

## Technical Concepts

### Output Modes

- **Default** — Human-friendly colored tables and spinners
- `--json` — Raw JSON output for piping to `jq` or other tools
- `-q` / `--quiet` — IDs only, one per line

All examples in this doc use `--json` mode with `jq` for scriptability.

### Pagination

List commands return paginated results. Use `--page` and `--per-page`:

```bash
balzac articles list --page 2 --per-page 50
```

### Default Workspace

Set a default workspace to avoid passing `-w` on every command:

```bash
balzac config set workspace <workspace-id>
# Now all workspace-scoped commands use this workspace
balzac keywords list
# Same as: balzac keywords list -w <workspace-id>
```

### Credit Costs

| Action | Credits |
|--------|---------|
| Accept suggestion (starts article writing) | 5 |
| Create briefing (starts article writing) | 5 |
| Generate 10 new suggestions | 1 |
| Rewrite article | Free, 2 per article |
| Regenerate picture (new cover) | Free, 2 per article |

If credits are insufficient, article status will be `waiting_for_credits`. Check available credits with `balzac auth status`.

Rewrites and new covers cost no credits. Each article includes 2 rewrites and 2 new covers (the cover written with the article doesn't count), and one counts when it finishes. Only one rewrite and one new cover run at a time per article: starting another returns `409 conflict`. Once an article has used its 2, the API returns `422 free_limit_reached`.

### Async Operations

Several operations are asynchronous:
- **Workspace creation** (`--wait` flag polls until complete)
- **Keyword generation** (check `keywords list` after ~30s)
- **Suggestion generation** (check `suggestions list` after ~30s)
- **Article writing** (poll with `articles get` or use `write --wait`)
- **Article rewrite** (poll with `articles get`)
- **Picture regeneration** (poll with `articles get`)
- **Publishing** (poll with `articles get`: `Published` turns true once the platform accepts the post, and the live URL appears when the platform reports it; drafts and webhooks without a URL in their answer never report one)
- **Integration connection test** (poll with `integrations get` for status `up`/`down`)

---

## Common Gotchas

1. **API key not set** — Always `export BALZAC_API_KEY=key` or `balzac auth login` before using CLI
2. **No default workspace** — Run `balzac config set workspace <id>` or pass `-w <id>` to every command
3. **Workspace not ready** — After `workspaces create`, the workspace goes through `new` → `running` → `imported`. Use `--wait` or poll `workspaces get` until status is `imported` or `ready`
4. **Insufficient credits**: the API returns `402 Payment Required` with `type: insufficient_credits` when you don't have enough credits. Article writing costs 5 credits and generating suggestions 1 credit; rewrites and new covers are free (2 per article). The error includes `required` and `available` fields
5. **Async operations need polling** — Suggestion generation and article writing are asynchronous. Poll the relevant list/get endpoint
6. **JSON output for scripting** — Always use `--json` flag when piping to `jq` or other tools. Default output is human-formatted and not parseable
7. **Rate limiting** — API allows 100 requests/minute. CLI auto-retries on 429 with exponential backoff. Add `sleep 1` between batch operations
8. **Suggestion vs briefing** — Suggestions are AI-generated proposals you accept/reject. Briefings are direct write instructions that start immediately (unless `--queue` is used to defer writing to the workspace schedule)
9. **Article must be `done` for rewrite/publish** — Check status before calling rewrite, regenerate-picture, or publish
10. **ISO 8601 dates** — Schedule dates must use format `"2026-04-01T10:00:00Z"`
11. **Search Console requires web OAuth** — GSC integration is connected via the Balzac web app (OAuth with Google), not via the CLI. Once connected, data syncs daily and is available through `balzac gsc` commands
12. **GSC data has ~3 day delay** — Google Search Console data is typically 2-3 days behind. The most recent days will show zero
13. **GSC query data is privacy-filtered** — Google anonymizes low-volume queries. The sum of query-level data (`gsc queries`) will be lower than site-level totals (`gsc overview`). This is a Google limitation, not a bug
14. **Search Console returns 412 if not connected** — All `gsc` commands require an active Google Search Console integration. If none is connected, the API returns `412 Precondition Failed`
15. **Free rewrites and covers run out**: each article gets 2 rewrites and 2 new covers. A third returns `422 free_limit_reached`, and starting one while another runs returns `409 conflict`. Requests refused this way count nothing
16. **Moving an integration URL needs its secret**: `integrations update --wordpress-url` to another site needs `--wordpress-password` in the same command, and a new `--webhook-url` needs `--webhook-token` when the integration has one. Credentials are never returned by `integrations get`
17. **Workspace limit**: each workspace is a website. At the plan's limit, `workspaces create` returns `422 plan_limit_reached`. Workspaces whose import failed (`not_imported`) don't count

---

## Quick Reference

```bash
# Auth
balzac auth login                                           # Store API key
balzac auth status                                          # Account, credits, role

# Workspaces
balzac workspaces list                                      # List
balzac workspaces create --domain https://site.com --wait   # Create
balzac workspaces get <id>                                  # Details

# Keywords
balzac keywords list                                        # List
balzac keywords create --name "keyword"                     # Create
balzac keywords enable <id>                                 # Enable
balzac keywords generate                                    # AI generate

# Suggestions
balzac suggestions list --status proposed                   # Pending
balzac suggestions generate                                 # Generate (1 cr)
balzac suggestions accept <id>                              # Accept (5 cr)

# Briefings
balzac briefings create --topic "Topic"                     # Write (5 cr)
balzac briefings create --topic "Topic" --queue             # Queue (5 cr)

# Articles
balzac articles list --status done                          # Done articles
balzac articles get <id>                                    # Live URL, publications
balzac articles rewrite <id>                                # Rewrite (free, 2/article)
balzac articles regenerate-picture <id>                     # Picture (free, 2/article)
balzac articles export <id> --format markdown               # Export
balzac articles publish <id> --integration <int-id>         # Publish

# Integrations
balzac integrations list                                    # List
balzac integrations create --service wordpress --name "WP"  # Create
balzac integrations get <id>                                # Details
balzac integrations reconnect <id>                          # Re-test
balzac integrations lookup webflow-sites --token "tok"      # Discover
balzac integrations delete <id>                             # Delete

# Search Console (alias: gsc)
balzac gsc overview                                         # Performance overview
balzac gsc queries                                          # Top search queries
balzac gsc pages                                            # Top pages
balzac gsc daily                                            # Daily time series
balzac gsc overview --start-date 2026-01-01                 # Custom period

# Shortcut
balzac write "Topic" --wait                                 # Topic → article

# Config
balzac config set workspace <id>                            # Default WS
balzac config get                                           # Show config
balzac --json <command>                                     # JSON output
```
