#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('amulets')
  .description('Push and pull AI workflow assets from the Amulets registry')
  .version('0.1.0');

program.parse();
