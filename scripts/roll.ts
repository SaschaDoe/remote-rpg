/**
 * CLI script for rolling on inspire-tables.
 * Usage:
 *   npx tsx scripts/roll.ts magic           → roll all magic tables
 *   npx tsx scripts/roll.ts magic source    → roll specific table
 *   npx tsx scripts/roll.ts character       → roll all character tables
 *   npx tsx scripts/roll.ts random          → roll a random table
 *   npx tsx scripts/roll.ts list            → list all categories
 *   npx tsx scripts/roll.ts list magic      → list tables in a category
 */

// Register path alias for $tables
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// We need to resolve $tables imports manually since we're outside Vite
const tablesRoot = path.resolve(import.meta.dirname, '..', 'inspire-tables', 'src', 'lib');

// Dynamic imports with resolved paths
async function importTable(modulePath: string) {
  const fullPath = path.join(tablesRoot, modulePath);
  return import(pathToFileURL(fullPath).href);
}

// Import the Dice class
const { Dice } = await importTable('utils/dice.ts');
const dice = new Dice();

// Import Table base for type checking
const { Table } = await importTable('tables/table.ts');

// Table registry — maps categories to their table modules
const registry: Record<string, Record<string, string>> = {
  magic: {
    source: 'tables/magicTables/magicSourceTable.ts',
    cost: 'tables/magicTables/magicCostTable.ts',
    channel: 'tables/magicTables/magicChannelTable.ts',
    ability: 'tables/magicTables/magicAbilityTable.ts',
    rule: 'tables/magicTables/magicRuleTable.ts',
    weakness: 'tables/magicTables/magicWeaknessTable.ts',
    visual: 'tables/magicTables/magicVisualTable.ts',
    senses: 'tables/magicTables/magicSensesTable.ts',
    preparation: 'tables/magicTables/magicPreparationTable.ts',
    origin: 'tables/magicTables/magicOriginTable.ts',
    failConsequence: 'tables/magicTables/magicFailConsequenceTable.ts',
    castingMethod: 'tables/magicTables/castingMethodTable.ts',
  },
  character: {
    alignment: 'tables/charTables/alignmentTable.ts',
    race: 'tables/charTables/raceTable.ts',
    profession: 'tables/charTables/professionTable.ts',
    attribute: 'tables/charTables/attributeTable.ts',
    motivation: 'tables/charTables/motivationTable.ts',
    animal: 'tables/charTables/animalTable.ts',
  },
  location: {
    building: 'tables/locationTables/buildingTable.ts',
    landscape: 'tables/locationTables/landscapeTable.ts',
    buildingAdjective: 'tables/locationTables/buildingAdjectiveTable.ts',
    terrainFeature: 'tables/locationTables/terrainFeatureTable.ts',
  },
  faction: {
    motivation: 'tables/factionTables/factionBeginningMotivationTable.ts',
    firstName: 'tables/factionTables/factionFirstNameTable.ts',
    secondName: 'tables/factionTables/factionSecondNameTable.ts',
    quote: 'tables/factionTables/factionQuoteTable.ts',
  },
  god: {
    domain: 'tables/godTables/godDomainTable.ts',
    byname: 'tables/godTables/godBynameTable.ts',
    status: 'tables/godTables/godStatusTable.ts',
  },
  quest: {
    type: 'tables/questTables/questTypeTable.ts',
    difficulty: 'tables/questTables/questDifficultyTable.ts',
    reward: 'tables/questTables/questRewardTable.ts',
  },
  name: {
    germanFemale: 'tables/nameTables/germanFemaleNameTable.ts',
    germanMale: 'tables/nameTables/germanMaleNameTable.ts',
    barbaricMale: 'tables/nameTables/barbaricMaleNameTable.ts',
    barbaricFemale: 'tables/nameTables/barbaricFemaleNameTable.ts',
    elfenMale: 'tables/nameTables/elfenMaleNameTable.ts',
    elfenFemale: 'tables/nameTables/elfenFemaleNameTable.ts',
  },
  spell: {
    lore: 'tables/spellTables/spellLoreTable.ts',
    areaOfEffect: 'tables/spellTables/spellAreaOfEffectTable.ts',
    cooldown: 'tables/spellTables/spellCooldownTable.ts',
  },
  ritual: {
    action: 'tables/ritualTables/ritualActionTable.ts',
    offering: 'tables/ritualTables/ritualOfferingTable.ts',
    location: 'tables/ritualTables/ritualLocationTable.ts',
    time: 'tables/ritualTables/ritualTimeTable.ts',
  },
  dungeon: {
    type: 'tables/dungeonTables/dungeonTypeTable.ts',
    purpose: 'tables/dungeonTables/dungeonPurposeTable.ts',
    trap: 'tables/dungeonTables/trapTable.ts',
    adjective: 'tables/dungeonTables/dungeonAdjectiveTable.ts',
  },
  monster: {
    monster: 'tables/monsterTables/monsterTable.ts',
    adjective: 'tables/monsterTables/monsterAdjectiveTable.ts',
    mythicalCreature: 'tables/monsterTables/mythicalCreatureTable.ts',
  },
  artefact: {
    artefact: 'tables/artefactTables/artefactTable.ts',
    magical: 'tables/artefactTables/magicalArtefactTable.ts',
    weapon: 'tables/artefactTables/weaponTable.ts',
    gemstone: 'tables/artefactTables/gemstoneTable.ts',
  },
  town: {
    size: 'tables/townTables/townSizeTable.ts',
    event: 'tables/townTables/townEventTable.ts',
    fame: 'tables/townTables/townFameTable.ts',
  },
  talent: {
    talent: 'tables/talentTables/talentTable.ts',
  },
};

async function rollSingleTable(modulePath: string): Promise<string> {
  const mod = await importTable(modulePath);
  // Find the exported class (first export that is a constructor for Table)
  const TableClass = Object.values(mod).find(
    (v: any) => typeof v === 'function' && v.prototype instanceof Table
  ) as any;
  if (!TableClass) {
    // Try the default-ish pattern: class name matches file
    const classes = Object.values(mod).filter((v: any) => typeof v === 'function') as any[];
    if (classes.length > 0) {
      try {
        const instance = new classes[0]();
        if (instance.roleWithCascade) {
          return instance.roleWithCascade(dice).text;
        }
      } catch { /* skip */ }
    }
    return '(konnte nicht würfeln)';
  }
  const instance = new TableClass();
  return instance.roleWithCascade(dice).text;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    console.log(`
Inspire Tables — Zufallstabellen-Würfler

Verwendung:
  npx tsx scripts/roll.ts <kategorie>              Würfelt alle Tabellen einer Kategorie
  npx tsx scripts/roll.ts <kategorie> <tabelle>    Würfelt eine bestimmte Tabelle
  npx tsx scripts/roll.ts random                   Würfelt eine zufällige Tabelle
  npx tsx scripts/roll.ts list                     Zeigt alle Kategorien
  npx tsx scripts/roll.ts list <kategorie>         Zeigt Tabellen einer Kategorie

Kategorien: ${Object.keys(registry).join(', ')}
    `);
    return;
  }

  if (args[0] === 'list') {
    if (args[1]) {
      const cat = registry[args[1]];
      if (!cat) {
        console.log(`Unbekannte Kategorie: ${args[1]}`);
        return;
      }
      console.log(`\nTabellen in "${args[1]}":`);
      for (const name of Object.keys(cat)) {
        console.log(`  - ${name}`);
      }
    } else {
      console.log('\nVerfügbare Kategorien:');
      for (const [id, tables] of Object.entries(registry)) {
        console.log(`  - ${id} (${Object.keys(tables).length} Tabellen)`);
      }
    }
    return;
  }

  if (args[0] === 'random') {
    const categories = Object.keys(registry);
    const catId = categories[Math.floor(Math.random() * categories.length)];
    const cat = registry[catId];
    const tableNames = Object.keys(cat);
    const tableName = tableNames[Math.floor(Math.random() * tableNames.length)];
    const result = await rollSingleTable(cat[tableName]);
    console.log(`\n[${catId}/${tableName}]: ${result}`);
    return;
  }

  const catId = args[0];
  const cat = registry[catId];
  if (!cat) {
    console.log(`Unbekannte Kategorie: ${catId}`);
    console.log(`Verfügbar: ${Object.keys(registry).join(', ')}`);
    return;
  }

  if (args[1]) {
    const modulePath = cat[args[1]];
    if (!modulePath) {
      console.log(`Unbekannte Tabelle: ${args[1]}`);
      console.log(`Verfügbar in ${catId}: ${Object.keys(cat).join(', ')}`);
      return;
    }
    const result = await rollSingleTable(modulePath);
    console.log(`\n[${catId}/${args[1]}]: ${result}`);
  } else {
    console.log(`\n${catId}:`);
    for (const [name, modulePath] of Object.entries(cat)) {
      const result = await rollSingleTable(modulePath);
      console.log(`  ${name}: ${result}`);
    }
  }
}

main().catch(console.error);
