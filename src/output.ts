import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { type Ora } from 'ora';

let jsonMode = false;
let quietMode = false;

export function setJsonMode(enabled: boolean) {
  jsonMode = enabled;
}
export function setQuietMode(enabled: boolean) {
  quietMode = enabled;
}
export function isJsonMode() {
  return jsonMode;
}

export function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

export function printSuccess(msg: string) {
  if (jsonMode || quietMode) return;
  console.log(chalk.green('✓') + ' ' + msg);
}

export function printInfo(msg: string) {
  if (jsonMode || quietMode) return;
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

export function printWarning(msg: string) {
  if (jsonMode || quietMode) return;
  console.log(chalk.yellow('⚠') + ' ' + msg);
}

export function printError(err: unknown) {
  if (err instanceof Error) {
    const apiErr = err as Error & { type?: string; status?: number; details?: string[] };
    if (jsonMode) {
      printJson({
        error: {
          type: apiErr.type || 'error',
          message: apiErr.message,
          details: apiErr.details,
        },
      });
      return;
    }
    console.error(
      chalk.red('✗') +
        ' ' +
        (apiErr.type ? chalk.dim(`[${apiErr.type}] `) : '') +
        apiErr.message
    );
    if (apiErr.details?.length) {
      for (const d of apiErr.details) {
        console.error('  ' + chalk.dim('•') + ' ' + d);
      }
    }
  } else {
    console.error(chalk.red('✗') + ' ' + String(err));
  }
}

export function printId(id: string) {
  if (quietMode) {
    console.log(id);
    return;
  }
  if (!jsonMode) {
    console.log(chalk.dim('ID: ') + id);
  }
}

interface Column {
  key: string;
  label: string;
  format?: (val: unknown) => string;
}

export function printTable(rows: Record<string, unknown>[], columns: Column[]) {
  if (jsonMode) {
    printJson(rows);
    return;
  }
  if (quietMode) {
    for (const row of rows) console.log(row['id'] || '');
    return;
  }
  if (rows.length === 0) {
    console.log(chalk.dim('No results.'));
    return;
  }

  const table = new Table({
    head: columns.map((c) => chalk.bold(c.label)),
    style: { head: [], border: [] },
    chars: {
      top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
      bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      left: '', 'left-mid': '', mid: '', 'mid-mid': '',
      right: '', 'right-mid': '', middle: '  ',
    },
  });

  for (const row of rows) {
    table.push(
      columns.map((col) => {
        const val = row[col.key];
        return col.format ? col.format(val) : (val === null || val === undefined ? chalk.dim('—') : String(val));
      })
    );
  }
  console.log(table.toString());
}

export function printDetail(label: string, value: unknown) {
  if (jsonMode) return;
  const display =
    value === null || value === undefined ? chalk.dim('—') : String(value);
  console.log(chalk.bold(label + ':') + ' ' + display);
}

export function printRecord(data: Record<string, unknown>, fields: { key: string; label: string }[]) {
  if (jsonMode) {
    printJson(data);
    return;
  }
  if (quietMode) {
    console.log(data['id'] || '');
    return;
  }
  for (const f of fields) {
    printDetail(f.label, data[f.key]);
  }
}

export function printPagination(meta: { total: number; page: number; total_pages: number; per_page: number }) {
  if (jsonMode || quietMode) return;
  if (meta.total_pages > 1) {
    console.log(
      chalk.dim(`\nPage ${meta.page}/${meta.total_pages} (${meta.total} total)`)
    );
  }
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}

export function formatStatus(status: string): string {
  const map: Record<string, (s: string) => string> = {
    done: chalk.green,
    ready: chalk.green,
    imported: chalk.green,
    enabled: chalk.green,
    proposed: chalk.yellow,
    waiting: chalk.yellow,
    waiting_for_credits: chalk.yellow,
    in_progress: chalk.blue,
    running: chalk.blue,
    new: chalk.blue,
    accepted: chalk.cyan,
    rejected: chalk.dim,
    disabled: chalk.dim,
    not_imported: chalk.red,
  };
  const fn = map[status] || chalk.white;
  return fn(status);
}

export function truncate(str: string | null | undefined, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}
