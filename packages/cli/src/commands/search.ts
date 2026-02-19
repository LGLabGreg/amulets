import type { Command } from 'commander';
import ora from 'ora';
import { ApiError, searchAssets } from '../lib/api.js';

export function registerSearch(program: Command): void {
  program
    .command('search <query>')
    .description('Search the public registry')
    .option('--type <type>', 'Filter by type: skill | prompt | cursorrules | agentsmd | config')
    .option('--format <format>', 'Filter by format: file | package')
    .option('--tags <tags>', 'Filter by comma-separated tags')
    .action(async (query: string, options: { type?: string; format?: string; tags?: string }) => {
      const spinner = ora(`Searching for "${query}"...`).start();
      const tags = options.tags
        ? options.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      try {
        const { assets } = await searchAssets(query, {
          type: options.type,
          format: options.format,
          tags,
        });
        spinner.stop();

        if (assets.length === 0) {
          console.log('No results found.');
          return;
        }

        const rows = assets.map((a) => ({
          owner: (a.users as { username: string } | undefined)?.username ?? '?',
          name: a.slug,
          format: a.asset_format === 'package' ? 'pkg' : 'file',
          type: a.type ?? '—',
          desc: a.description ?? '',
        }));

        const ownerWidth = Math.max(5, ...rows.map((r) => r.owner.length));
        const nameWidth = Math.max(4, ...rows.map((r) => r.name.length));
        const typeWidth = Math.max(4, ...rows.map((r) => r.type.length));

        const header = `${'OWNER'.padEnd(ownerWidth)}  ${'NAME'.padEnd(nameWidth)}  ${'FMT'.padEnd(4)}  ${'TYPE'.padEnd(typeWidth)}  DESCRIPTION`;
        console.log(header);
        console.log('─'.repeat(Math.min(header.length + 30, 100)));

        for (const r of rows) {
          const desc = r.desc.length > 50 ? `${r.desc.slice(0, 47)}...` : r.desc;
          console.log(
            `${r.owner.padEnd(ownerWidth)}  ${r.name.padEnd(nameWidth)}  ${r.format.padEnd(4)}  ${r.type.padEnd(typeWidth)}  ${desc}`,
          );
        }

        console.log(`\n${assets.length} result${assets.length === 1 ? '' : 's'}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err);
        spinner.fail(`Search failed: ${message}`);
        process.exit(1);
      }
    });
}
