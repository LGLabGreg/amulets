#!/usr/bin/env node
import { Command } from 'commander'
import pkg from '../package.json'
import { registerList } from './commands/list.js'
import { registerLogin } from './commands/login.js'
import { registerLogout } from './commands/logout.js'
import { registerPull } from './commands/pull.js'
import { registerPush } from './commands/push.js'
import { registerUpdate } from './commands/update.js'
import { registerVersions } from './commands/versions.js'
import { registerWhoami } from './commands/whoami.js'
import { formatUpdateNotice, startUpdateCheck } from './lib/update-check.js'

const { version } = pkg

const program = new Command()

program
  .name('amulets')
  .description('Manage your private AI skills — push, pull, and sync')
  .version(version, '-V, --version', 'output the version number')

registerLogin(program)
registerLogout(program)
registerWhoami(program)
registerPush(program)
registerPull(program)
registerList(program)
registerVersions(program)
registerUpdate(program, version)

void (async () => {
  const updatePromise = startUpdateCheck(version)

  await program.parseAsync()

  const latest = await Promise.race([
    updatePromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
  ])

  if (latest && process.argv[2] !== 'update') {
    process.stderr.write(formatUpdateNotice(version, latest))
  }
})()
