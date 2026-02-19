import type { Command } from 'commander';
import { clearConfig, readConfig } from '../lib/config.js';

export function registerLogout(program: Command): void {
  program
    .command('logout')
    .description('Log out and remove stored credentials')
    .action(() => {
      const config = readConfig();
      if (!config?.token) {
        console.log('Not logged in.');
        return;
      }
      clearConfig();
      console.log('Logged out.');
    });
}
