import { Command } from 'commander';
import { client } from '../client.js';
import { printTable, printRecord, printError, truncate } from '../output.js';

const FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
];

export function registerTonesCommands(program: Command) {
  const tn = program.command('tones').description('List available tones of voice');

  tn.command('list')
    .description('List all tones of voice')
    .action(async () => {
      try {
        const res = await client.get<{ tones_of_voice: Record<string, unknown>[] }>('/tones_of_voice');
        printTable(res.data.tones_of_voice, [
          { key: 'id', label: 'ID', format: (v) => String(v).slice(0, 8) + '…' },
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code' },
          { key: 'description', label: 'Description', format: (v) => truncate(v as string, 50) },
        ]);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });

  tn.command('get')
    .description('Get tone of voice details')
    .argument('<id>', 'Tone of voice ID')
    .action(async (id) => {
      try {
        const res = await client.get<{ tone_of_voice: Record<string, unknown> }>(`/tones_of_voice/${id}`);
        printRecord(res.data.tone_of_voice, FIELDS);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
}
