#!/usr/bin/env node
import { Command } from 'commander'
import { registerList } from './commands/list.js'
import { registerLogin } from './commands/login.js'
import { registerLogout } from './commands/logout.js'
import { registerPull } from './commands/pull.js'
import { registerPush } from './commands/push.js'
import { registerSearch } from './commands/search.js'
import { registerVersions } from './commands/versions.js'
import { registerWhoami } from './commands/whoami.js'

const program = new Command()

program
  .name('amulets')
  .description('Push and pull AI workflow assets from the Amulets registry')
  .version('0.1.0')

registerLogin(program)
registerLogout(program)
registerWhoami(program)
registerPush(program)
registerPull(program)
registerList(program)
registerSearch(program)
registerVersions(program)

program.parse()
