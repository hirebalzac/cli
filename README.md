# Balzac CLI

**AI content platform CLI** — manage workspaces, keywords, suggestions, articles, and more from the command line.

The Balzac CLI provides a complete interface to the [Balzac API](https://developer.hirebalzac.ai), enabling developers and AI agents to automate content creation, manage SEO keywords, and publish articles across integrations programmatically.

---

## Installation

```bash
npm install -g balzac-cli
# or
pnpm install -g balzac-cli
# or
yarn global add balzac-cli
```

---

## Setup

**Required:** Set your Balzac API key

```bash
# Interactive login (stores key locally)
balzac auth login

# Or set via environment variable
export BALZAC_API_KEY=bz_your_api_key_here
```

**Optional:** Set a default workspace so you don't need `--workspace` on every command

```bash
balzac config set workspace <workspace-id>
```

**Optional:** Custom API endpoint

```bash
export BALZAC_API_URL=https://custom-api.example.com/v1
```

---

## Commands

### Authentication

```bash
# Store your API key
balzac auth login
balzac auth login bz_abc123...

# Remove stored key
balzac auth logout

# Check authentication status
balzac auth status
```

### Workspaces

```bash
# List all workspaces
balzac workspaces list
balzac workspaces list --status ready

# Create workspace from domain (auto-setup)
balzac workspaces create --domain https://myblog.com
balzac workspaces create --domain https://myblog.com --auto-accept-suggestions --language fr

# Create and wait for setup to complete
balzac workspaces create --domain https://myblog.com --wait

# Get workspace details
balzac workspaces get <workspace-id>

# Update workspace
balzac workspaces update <workspace-id> --name "My Blog" --language en

# Delete workspace
balzac workspaces delete <workspace-id>
```

### Keywords

```bash
# List keywords
balzac keywords list -w <workspace-id>
balzac keywords list --level 1 --status enabled

# Create a keyword
balzac keywords create --name "content marketing" -w <workspace-id>

# Get keyword details
balzac keywords get <keyword-id>

# Enable / disable
balzac keywords enable <keyword-id>
balzac keywords disable <keyword-id>

# Generate long-tail variations
balzac keywords generate-long-tail <keyword-id>

# Delete keyword
balzac keywords delete <keyword-id>
```

### Suggestions

AI-generated content proposals. Accept to start writing, reject to dismiss.

```bash
# List suggestions
balzac suggestions list -w <workspace-id>
balzac suggestions list --status proposed

# Get suggestion details
balzac suggestions get <suggestion-id>

# Generate new suggestions
balzac suggestions generate

# Accept a suggestion (starts article writing — costs 3 credits)
balzac suggestions accept <suggestion-id>

# Reject a suggestion
balzac suggestions reject <suggestion-id>
```

### Briefings

Direct write instructions. Creating a briefing immediately starts the article writing pipeline.

```bash
# List briefings
balzac briefings list

# Create a briefing (starts writing — costs 3 credits)
balzac briefings create --topic "How to use AI for content marketing in 2026"
balzac briefings create --topic "SEO tips" --type listicle --length long

# Get briefing details
balzac briefings get <briefing-id>

# Delete briefing
balzac briefings delete <briefing-id>
```

### Articles

```bash
# List articles
balzac articles list
balzac articles list --status done --published false

# Get article (includes HTML content when done)
balzac articles get <article-id>

# Update article metadata
balzac articles update <article-id> --title "New Title" --slug "new-slug"

# Rewrite article (costs 3 credits)
balzac articles rewrite <article-id>
balzac articles rewrite <article-id> --length long --instructions "More technical depth"

# Regenerate article picture (costs 1 credit)
balzac articles regenerate-picture <article-id>
balzac articles regenerate-picture <article-id> --style watercolor --instructions "Dark background"

# Publish
balzac articles publish <article-id> --integration <integration-id>

# Schedule publication
balzac articles schedule <article-id> --integration <id> --at "2026-04-01T10:00:00Z"

# Cancel scheduled publication
balzac articles cancel-schedule <article-id> --publication <publication-id>

# Export content
balzac articles export <article-id> --format markdown
balzac articles export <article-id> --format html --output article.html
```

### Write (Shortcut)

A convenience command that creates a briefing and optionally waits for the article to complete.

```bash
# Start writing an article
balzac write "How to use AI for marketing"

# Start writing and wait until done
balzac write "SEO tips for 2026" --wait

# With options
balzac write "AI tools comparison" --type listicle --length long --wait
```

### Competitors

```bash
# List competitors
balzac competitors list

# Add a competitor
balzac competitors add --name "Acme Corp" --domain https://acme.com

# Get competitor details
balzac competitors get <competitor-id>

# Remove competitor
balzac competitors remove <competitor-id>
```

### Links

```bash
# List reference links
balzac links list

# Add a link
balzac links add --url https://myblog.com/about

# Get link details
balzac links get <link-id>

# Remove link
balzac links remove <link-id>
```

### Settings

```bash
# View workspace settings
balzac settings get

# Update settings
balzac settings update --language en --article-length long
balzac settings update --auto-accept-suggestions
balzac settings update --pictures-style watercolor --period week --max-articles 10
```

### Tones of Voice

```bash
# List available tones
balzac tones list

# Get tone details
balzac tones get <tone-id>
```

### Configuration

```bash
# Set default workspace
balzac config set workspace <workspace-id>

# Set API key
balzac config set api-key bz_abc123...

# View all config
balzac config get

# View specific value
balzac config get workspace

# Reset config
balzac config reset
```

---

## Output Modes

**Default** — Human-friendly colored output with tables

```bash
balzac workspaces list
```

**JSON mode** — Raw JSON for scripting and piping

```bash
balzac --json workspaces list
balzac --json articles get <id> | jq '.title'
```

**Quiet mode** — IDs only

```bash
balzac -q workspaces list
```

---

## Common Workflows

### End-to-End: Domain to Published Article

```bash
#!/bin/bash

# 1. Create workspace from domain and wait for setup
balzac workspaces create --domain https://myblog.com --wait

# 2. Set it as default
WORKSPACE_ID=$(balzac --json workspaces list | jq -r '.workspaces[0].id')
balzac config set workspace "$WORKSPACE_ID"

# 3. Generate suggestions
balzac suggestions generate

# Wait a moment for suggestions to appear
sleep 30

# 4. Accept the first proposed suggestion
SUGGESTION_ID=$(balzac --json suggestions list --status proposed | jq -r '.suggestions[0].id')
balzac suggestions accept "$SUGGESTION_ID"

# 5. Wait for article to complete
echo "Article writing started. Polling..."
while true; do
  STATUS=$(balzac --json articles list --status done | jq -r '.articles | length')
  if [ "$STATUS" -gt "0" ]; then
    echo "Article done!"
    balzac articles list --status done
    break
  fi
  sleep 10
done
```

### Batch Accept All Proposed Suggestions

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

### Export All Done Articles to Markdown

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

### Quick Article from Keyword

```bash
# Write and wait for completion
balzac write "best AI writing tools 2026" --type listicle --length long --wait
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BALZAC_API_KEY` | Yes* | — | Your Balzac API key (alternative to `balzac auth login`) |
| `BALZAC_API_URL` | No | `https://api.hirebalzac.ai/v1` | Custom API endpoint |

\* Required unless stored via `balzac auth login`

---

## Credit Costs

| Action | Credits |
|--------|---------|
| Writing an article (accepting suggestion or creating briefing) | 5 |
| Rewriting an article | 5 |
| Regenerating a picture | 1 |

---

## Error Handling

The CLI provides clear error messages with colored output:

| Error | Solution |
|-------|----------|
| `No API key configured` | Run `balzac auth login` or set `BALZAC_API_KEY` |
| `No workspace specified` | Use `-w <id>` or `balzac config set workspace <id>` |
| `unauthorized` | API key is invalid or expired |
| `not_found` | Resource doesn't exist — check the ID |
| `conflict` | Action not allowed (e.g. accepting already accepted suggestion) |
| `validation_failed` | Invalid parameters — check the `details` in the error |
| `rate_limited` | Too many requests — CLI auto-retries with backoff |

Exit codes:
- **0** — Success
- **1** — Error

---

## API Endpoints

The CLI maps to these Balzac API endpoints:

| CLI Command | Method | API Endpoint |
|-------------|--------|-------------|
| `workspaces list` | GET | `/workspaces` |
| `workspaces create` | POST | `/workspaces` |
| `workspaces get` | GET | `/workspaces/{id}` |
| `workspaces update` | PATCH | `/workspaces/{id}` |
| `workspaces delete` | DELETE | `/workspaces/{id}` |
| `keywords list` | GET | `/workspaces/{id}/keywords` |
| `keywords create` | POST | `/workspaces/{id}/keywords` |
| `keywords enable` | POST | `/workspaces/{id}/keywords/{id}/enable` |
| `keywords disable` | POST | `/workspaces/{id}/keywords/{id}/disable` |
| `keywords generate-long-tail` | POST | `/workspaces/{id}/keywords/{id}/generate_long_tail` |
| `suggestions list` | GET | `/workspaces/{id}/suggestions` |
| `suggestions generate` | POST | `/workspaces/{id}/suggestions/generate` |
| `suggestions accept` | POST | `/workspaces/{id}/suggestions/{id}/accept` |
| `suggestions reject` | POST | `/workspaces/{id}/suggestions/{id}/reject` |
| `briefings list` | GET | `/workspaces/{id}/briefings` |
| `briefings create` | POST | `/workspaces/{id}/briefings` |
| `articles list` | GET | `/workspaces/{id}/articles` |
| `articles get` | GET | `/workspaces/{id}/articles/{id}` |
| `articles rewrite` | POST | `/workspaces/{id}/articles/{id}/rewrite` |
| `articles regenerate-picture` | POST | `/workspaces/{id}/articles/{id}/regenerate_picture` |
| `articles publish` | POST | `/workspaces/{id}/articles/{id}/publish` |
| `articles schedule` | POST | `/workspaces/{id}/articles/{id}/schedule` |
| `articles export` | GET | `/workspaces/{id}/articles/{id}/export` |
| `competitors list` | GET | `/workspaces/{id}/competitors` |
| `competitors add` | POST | `/workspaces/{id}/competitors` |
| `links list` | GET | `/workspaces/{id}/links` |
| `links add` | POST | `/workspaces/{id}/links` |
| `settings get` | GET | `/workspaces/{id}/settings` |
| `settings update` | PATCH | `/workspaces/{id}/settings` |
| `tones list` | GET | `/tones_of_voice` |

Full API documentation: [developer.hirebalzac.ai](https://developer.hirebalzac.ai)

---

## Project Structure

```
src/
├── index.ts              # CLI entry point with Commander
├── client.ts             # BalzacClient API class
├── config.ts             # Persistent config store
├── output.ts             # Tables, JSON mode, spinners, colors
└── commands/
    ├── auth.ts           # auth login/logout/status
    ├── workspaces.ts     # Workspace CRUD
    ├── keywords.ts       # Keyword management
    ├── suggestions.ts    # AI suggestion management
    ├── briefings.ts      # Briefing CRUD
    ├── articles.ts       # Article CRUD + actions
    ├── write.ts          # Shortcut: topic → article
    ├── competitors.ts    # Competitor management
    ├── links.ts          # Link management
    ├── settings.ts       # Workspace settings
    ├── tones.ts          # Tones of voice
    └── config.ts         # CLI config management
package.json
tsconfig.json
tsup.config.ts
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run locally
node dist/index.js --help
```

---

## Quick Reference

```bash
# Auth
balzac auth login                                           # Store API key
balzac auth status                                          # Check auth

# Workspaces
balzac workspaces list                                      # List workspaces
balzac workspaces create --domain https://site.com --wait   # Auto-setup
balzac workspaces get <id>                                  # Get details

# Keywords
balzac keywords list                                        # List keywords
balzac keywords create --name "keyword"                     # Add keyword
balzac keywords enable <id>                                 # Enable
balzac keywords generate-long-tail <id>                     # Generate variants

# Suggestions
balzac suggestions list --status proposed                   # Pending suggestions
balzac suggestions generate                                 # Generate new
balzac suggestions accept <id>                              # Accept (3 credits)

# Briefings
balzac briefings create --topic "My topic"                  # Write article (3 credits)

# Articles
balzac articles list --status done                          # Completed articles
balzac articles get <id>                                    # Full content
balzac articles rewrite <id>                                # Rewrite (3 credits)
balzac articles regenerate-picture <id>                     # New picture (1 credit)
balzac articles export <id> --format markdown               # Export
balzac articles publish <id> --integration <int-id>         # Publish

# Shortcut
balzac write "Topic here" --wait                            # Topic → article

# Config
balzac config set workspace <id>                            # Default workspace
balzac config get                                           # Show all config

# Output modes
balzac --json workspaces list                               # JSON output
balzac -q articles list                                     # IDs only
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in `src/`
4. Build: `npm run build`
5. Submit a pull request

---

## License

MIT

---

## Links

- **Website:** [hirebalzac.ai](https://hirebalzac.ai)
- **API Docs:** [developer.hirebalzac.ai](https://developer.hirebalzac.ai)
- **GitHub:** [vincenzor/balzac-cli](https://github.com/vincenzor/balzac-cli)
- **npm:** [balzac-cli](https://www.npmjs.com/package/balzac-cli)
- **Issues:** [Report bugs](https://github.com/vincenzor/balzac-cli/issues)
