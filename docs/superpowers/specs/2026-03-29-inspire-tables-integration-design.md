# Inspire Tables Integration — Design Spec

## Overview

Integrate the `inspire-tables-webapp` repo as a git submodule so the World Builder agent can roll on 500+ random tables and use 16 entity creators (magic systems, characters, factions, etc.) to seed its world-building with surprising combinations. Upgrades to the source repo flow in via `git submodule update --remote`.

## Architecture

### Integration Layer

```
inspire-tables/                    ← git submodule (full repo)
  src/lib/
    tables/                        ← 30+ categories, 500+ tables
    entities/                      ← creators for magic, characters, etc.
    utils/dice.ts                  ← dice roller

src/lib/server/tables/
  adapter.ts                       ← thin wrapper that imports from submodule
                                     exposes a clean API for agents
  registry.ts                      ← maps category names to table/creator classes
```

### Path Resolution

The submodule uses `$lib/` internally. Our project also uses `$lib/`. Solution:
- Add a Vite/TypeScript alias: `$tables` → `./inspire-tables/src/lib`
- The submodule's internal `$lib/` imports resolve because most tables use relative imports (`../table`, `../tableEntry`)
- For any that use `$lib/`, we configure a secondary resolution in vite.config.ts

### Adapter API

The adapter exposes a simple interface the agents can call:

```typescript
// Roll on a specific table
rollTable(tableName: string): string

// Roll on a category (picks random table from category)
rollCategory(category: string): Record<string, string>

// Generate a full entity using a Creator
generateEntity(type: string): Record<string, any>

// List available categories and tables
listCategories(): string[]
listTables(category: string): string[]
```

### Agent Integration

The World Builder prompt gets a new section explaining it can request random rolls. The orchestrator intercepts entity blocks with `roll: true` or the agent can explicitly ask for random generation.

More practically: before calling the World Builder agent, the orchestrator can pre-roll relevant tables based on what the user is asking about, and inject the random seeds into the world context. The agent then weaves them into coherent content.

## What Gets Integrated

### Tables (30+ categories)
magicTables, charTables, locationTables, townTables, factionTables, godTables, questTables, dungeonTables, spellTables, ritualTables, talentTables, nameTables, cultureTables, mythicTables, monsterTables, adventureTables, artefactTables, campaignTables, nationTables, celestialTables, illnessTables, genreTables, otherTables, and more.

### Creators (16+ entity generators)
MagicSystemCreator, CharacterCreator, FactionCreator, LocationCreator, TownCreator, DungeonCreator, QuestCreator, MonsterCreator, RitualCreator, TalentCreator, AdventureCreator, ArtefactCreator, VillainCreator, GalaxyCreator, PlanetCreator, SpellCreator.

### Key Classes
- `Table` — base class with `role()` and `roleWithCascade()` methods
- `TableEntry` — individual outcomes with cascading sub-table links
- `Creator<T>` — abstract base for entity generators
- `Dice` — random number generator
- `Entity` — base entity class (needs browser guard bypass for server use)

## Technical Concerns

1. **Entity.ts uses `$app/environment`** for `browser` check — needs a shim for server-side use
2. **Some tables import via `$lib/`** — most use relative imports, but a few may need the alias
3. **Entity ID persistence uses localStorage** — irrelevant on server, guarded by `if (browser)`
4. **No barrel exports** — adapter must import each table/creator individually

## Deployment

- `git submodule add https://github.com/SaschaDoe/inspire-tables-webapp inspire-tables`
- Submodule tracked in `.gitmodules`
- CI/deployment runs `git submodule update --init --recursive`
- Upgrades: `git submodule update --remote && git commit`
