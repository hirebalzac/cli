declare const PKG_VERSION: string;
import { Command } from 'commander';
import { setJsonMode, setQuietMode } from './output.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerWorkspacesCommands } from './commands/workspaces.js';
import { registerKeywordsCommands } from './commands/keywords.js';
import { registerSuggestionsCommands } from './commands/suggestions.js';
import { registerBriefingsCommands } from './commands/briefings.js';
import { registerArticlesCommands } from './commands/articles.js';
import { registerWriteCommand } from './commands/write.js';
import { registerCompetitorsCommands } from './commands/competitors.js';
import { registerLinksCommands } from './commands/links.js';
import { registerSettingsCommands } from './commands/settings.js';
import { registerTonesCommands } from './commands/tones.js';
import { registerIntegrationsCommands } from './commands/integrations.js';
import { registerConfigCommands } from './commands/config.js';

const program = new Command();

program
  .name('balzac')
  .description('CLI for the Balzac AI content platform')
  .version(PKG_VERSION)
  .option('--json', 'Output raw JSON')
  .option('-q, --quiet', 'Minimal output (IDs only)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) setJsonMode(true);
    if (opts.quiet) setQuietMode(true);
  });

registerAuthCommands(program);
registerWorkspacesCommands(program);
registerKeywordsCommands(program);
registerSuggestionsCommands(program);
registerBriefingsCommands(program);
registerArticlesCommands(program);
registerWriteCommand(program);
registerCompetitorsCommands(program);
registerLinksCommands(program);
registerSettingsCommands(program);
registerTonesCommands(program);
registerIntegrationsCommands(program);
registerConfigCommands(program);

program.parse();
