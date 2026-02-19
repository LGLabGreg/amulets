import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import ora from 'ora';
import unzipper from 'unzipper';
import { ApiError, getAssetVersion } from '../lib/api.js';

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function unzipBuffer(buffer: Buffer, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const { Readable } = require('node:stream') as typeof import('stream');
    Readable.from(buffer)
      .pipe(unzipper.Extract({ path: outputDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}

export function registerPull(program: Command): void {
  program
    .command('pull <owner/name>')
    .description('Pull an asset from the registry')
    .option('--output <path>', 'Output file path (simple asset) or directory (package)')
    .option('--version <version>', 'Version to pull (defaults to latest)', 'latest')
    .action(async (ownerName: string, options: { output?: string; version: string }) => {
      const parts = ownerName.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error('Error: argument must be in <owner/name> format');
        process.exit(1);
      }
      const [owner, name] = parts;

      const spinner = ora(`Fetching ${ownerName}@${options.version}...`).start();

      try {
        const data = await getAssetVersion(owner, name, options.version);

        if (data.content !== undefined) {
          // Simple asset
          const outputPath = options.output ?? `${name}.md`;
          const resolvedOutput = path.resolve(outputPath);
          fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
          fs.writeFileSync(resolvedOutput, data.content, 'utf-8');
          spinner.succeed(`Pulled ${ownerName}@${data.version} → ${outputPath}`);
        } else if (data.download_url) {
          // Skill package
          const outputDir = options.output ?? name;
          const resolvedDir = path.resolve(outputDir);
          spinner.text = 'Downloading package...';
          const buffer = await downloadToBuffer(data.download_url);
          spinner.text = 'Extracting...';
          fs.mkdirSync(resolvedDir, { recursive: true });
          await unzipBuffer(buffer, resolvedDir);
          spinner.succeed(`Pulled ${ownerName}@${data.version} → ${outputDir}/`);
        } else {
          spinner.fail('Unexpected response from server');
          process.exit(1);
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err);
        spinner.fail(`Pull failed: ${message}`);
        process.exit(1);
      }
    });
}
