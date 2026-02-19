import type { Command } from 'commander';
import ora from 'ora';
import { ApiError, getAssetVersions } from '../lib/api.js';

export function registerVersions(program: Command): void {
  program
    .command('versions <owner/name>')
    .description('List all versions of an asset')
    .action(async (ownerName: string) => {
      const parts = ownerName.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error('Error: argument must be in <owner/name> format');
        process.exit(1);
      }
      const [owner, name] = parts;

      const spinner = ora(`Fetching versions for ${ownerName}...`).start();

      try {
        const { versions } = await getAssetVersions(owner, name);
        spinner.stop();

        if (versions.length === 0) {
          console.log('No versions found.');
          return;
        }

        const versionWidth = Math.max(7, ...versions.map((v) => v.version.length));
        const header = `${'VERSION'.padEnd(versionWidth)}  ${'DATE'.padEnd(20)}  MESSAGE`;
        console.log(header);
        console.log('─'.repeat(header.length));

        for (const v of versions) {
          const date = new Date(v.created_at).toISOString().slice(0, 10);
          const msg = v.message ?? '—';
          console.log(`${v.version.padEnd(versionWidth)}  ${date.padEnd(20)}  ${msg}`);
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err);
        spinner.fail(`Failed to list versions: ${message}`);
        process.exit(1);
      }
    });
}
