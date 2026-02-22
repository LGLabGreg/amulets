# Amulets

Your private AI skills library — push, version, and sync prompts, skills, and rules across every project.

```bash
# Push a skill from anywhere
amulets push AGENTS.md -n agents

# Pull it into any project
amulets pull agents

# Pin to a specific version
amulets pull agents -v 1.2.0
```

Everything stays private. Only you can access your assets.

## Install

```bash
npm install -g amulets-cli
```

## CLI

```bash
amulets login                     # GitHub OAuth via browser
amulets push <file-or-folder>     # push a file or skill/bundle folder
amulets pull <name>               # pull by name (or owner/name)
amulets list                      # list your assets
amulets versions <name>           # list versions of an asset
amulets delete <slug>             # delete an asset and all its versions
amulets whoami                    # show current user
amulets logout                    # remove stored credentials
```

### Push options

```
-n, --name <name>         Asset name (prompted if omitted)
-v, --version <ver>       Semver version [default: 1.0.0]
-m, --message <msg>       Version message
-t, --tags <tags>         Comma-separated tags
-d, --description <desc>  Short description
```

### Pull options

```
-o, --output <path>       Output file or directory
-v, --version <ver>       Version to pull [default: latest]
```

## Asset formats

Amulet handles three formats, auto-detected on push:

| Format     | Detection                 |
| ---------- | ------------------------- |
| **file**   | Single file               |
| **skill**  | Directory with `SKILL.md` |
| **bundle** | Any other directory       |
