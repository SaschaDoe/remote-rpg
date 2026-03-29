/**
 * Registry of all available random tables from inspire-tables.
 * Maps category names to table classes for easy lookup by the agent adapter.
 */

// Magic tables
import { MagicSourceTable } from '$tables/tables/magicTables/magicSourceTable.js';
import { MagicCostTable } from '$tables/tables/magicTables/magicCostTable.js';
import { MagicChannelTable } from '$tables/tables/magicTables/magicChannelTable.js';
import { MagicAbilityTable } from '$tables/tables/magicTables/magicAbilityTable.js';
import { MagicRuleTable } from '$tables/tables/magicTables/magicRuleTable.js';
import { MagicWeaknessTable } from '$tables/tables/magicTables/magicWeaknessTable.js';
import { MagicVisualTable } from '$tables/tables/magicTables/magicVisualTable.js';
import { MagicSensesTable } from '$tables/tables/magicTables/magicSensesTable.js';
import { MagicPreparationTable } from '$tables/tables/magicTables/magicPreparationTable.js';
import { MagicOriginTable } from '$tables/tables/magicTables/magicOriginTable.js';
import { MagicFailConsequenceTable } from '$tables/tables/magicTables/magicFailConsequenceTable.js';
import { CastingMethodTable } from '$tables/tables/magicTables/castingMethodTable.js';

// Character tables
import { AlignmentTable } from '$tables/tables/charTables/alignmentTable.js';
import { RaceTable } from '$tables/tables/charTables/raceTable.js';
import { ProfessionTable } from '$tables/tables/charTables/professionTable.js';
import { AttributeTable } from '$tables/tables/charTables/attributeTable.js';
import { MotivationTable } from '$tables/tables/charTables/motivationTable.js';
import { AnimalTable } from '$tables/tables/charTables/animalTable.js';

// Location tables
import { BuildingTable } from '$tables/tables/locationTables/buildingTable.js';
import { LandscapeTable } from '$tables/tables/locationTables/landscapeTable.js';
import { BuildingAdjectiveTable } from '$tables/tables/locationTables/buildingAdjectiveTable.js';
import { TerrainFeatureTable } from '$tables/tables/locationTables/terrainFeatureTable.js';

// Faction tables
import { FactionBeginningMotivationTable } from '$tables/tables/factionTables/factionBeginningMotivationTable.js';
import { FactionFirstNameTable } from '$tables/tables/factionTables/factionFirstNameTable.js';
import { FactionSecondNameTable } from '$tables/tables/factionTables/factionSecondNameTable.js';
import { FactionQuoteTable } from '$tables/tables/factionTables/factionQuoteTable.js';

// God tables
import { GodDomainTable } from '$tables/tables/godTables/godDomainTable.js';
import { GodBynameTable } from '$tables/tables/godTables/godBynameTable.js';
import { GodStatusTable } from '$tables/tables/godTables/godStatusTable.js';

// Quest tables
import { QuestTypeTable } from '$tables/tables/questTables/questTypeTable.js';
import { QuestDifficultyTable } from '$tables/tables/questTables/questDifficultyTable.js';
import { QuestRewardTable } from '$tables/tables/questTables/questRewardTable.js';

// Name tables
import { GermanFemaleNameTable } from '$tables/tables/nameTables/germanFemaleNameTable.js';
import { GermanMaleNameTable } from '$tables/tables/nameTables/germanMaleNameTable.js';
import { BarbaricMaleNameTable } from '$tables/tables/nameTables/barbaricMaleNameTable.js';
import { BarbaricFemaleNameTable } from '$tables/tables/nameTables/barbaricFemaleNameTable.js';
import { ElfenMaleNameTable } from '$tables/tables/nameTables/elfenMaleNameTable.js';
import { ElfenFemaleNameTable } from '$tables/tables/nameTables/elfenFemaleNameTable.js';

// Spell tables
import { SpellLoreTable } from '$tables/tables/spellTables/spellLoreTable.js';
import { SpellAreaOfEffectTable } from '$tables/tables/spellTables/spellAreaOfEffectTable.js';
import { SpellCooldownTable } from '$tables/tables/spellTables/spellCooldownTable.js';

// Ritual tables
import { RitualActionTable } from '$tables/tables/ritualTables/ritualActionTable.js';
import { RitualOfferingTable } from '$tables/tables/ritualTables/ritualOfferingTable.js';
import { RitualLocationTable } from '$tables/tables/ritualTables/ritualLocationTable.js';
import { RitualTimeTable } from '$tables/tables/ritualTables/ritualTimeTable.js';

// Dungeon tables
import { DungeonTypeTable } from '$tables/tables/dungeonTables/dungeonTypeTable.js';
import { DungeonPurposeTable } from '$tables/tables/dungeonTables/dungeonPurposeTable.js';
import { TrapTable } from '$tables/tables/dungeonTables/trapTable.js';
import { DungeonAdjectiveTable } from '$tables/tables/dungeonTables/dungeonAdjectiveTable.js';

// Monster tables
import { MonsterTable } from '$tables/tables/monsterTables/monsterTable.js';
import { MonsterAdjectiveTable } from '$tables/tables/monsterTables/monsterAdjectiveTable.js';
import { MythicalCreatureTable } from '$tables/tables/monsterTables/mythicalCreatureTable.js';

// Artefact tables
import { ArtefactTable } from '$tables/tables/artefactTables/artefactTable.js';
import { MagicalArtefactTable } from '$tables/tables/artefactTables/magicalArtefactTable.js';
import { WeaponTable } from '$tables/tables/artefactTables/weaponTable.js';
import { GemstoneTable } from '$tables/tables/artefactTables/gemstoneTable.js';

// Town tables
import { TownSizeTable } from '$tables/tables/townTables/townSizeTable.js';
import { TownEventTable } from '$tables/tables/townTables/townEventTable.js';
import { TownFameTable } from '$tables/tables/townTables/townFameTable.js';

// Talent tables
import { TalentTable } from '$tables/tables/talentTables/talentTable.js';

import { Table } from '$tables/tables/table.js';

export interface TableCategory {
  name: string;
  description: string;
  tables: Record<string, () => Table>;
}

export const tableRegistry: Record<string, TableCategory> = {
  magic: {
    name: 'Magie',
    description: 'Magiesysteme, Quellen, Kosten, Regeln, Kanäle, Schwächen',
    tables: {
      source: () => new MagicSourceTable(),
      cost: () => new MagicCostTable(),
      channel: () => new MagicChannelTable(),
      ability: () => new MagicAbilityTable(),
      rule: () => new MagicRuleTable(),
      weakness: () => new MagicWeaknessTable(),
      visual: () => new MagicVisualTable(),
      senses: () => new MagicSensesTable(),
      preparation: () => new MagicPreparationTable(),
      origin: () => new MagicOriginTable(),
      failConsequence: () => new MagicFailConsequenceTable(),
      castingMethod: () => new CastingMethodTable(),
    },
  },
  character: {
    name: 'Charakter',
    description: 'Rassen, Berufe, Persönlichkeit, Motivation',
    tables: {
      alignment: () => new AlignmentTable(),
      race: () => new RaceTable(),
      profession: () => new ProfessionTable(),
      attribute: () => new AttributeTable(),
      motivation: () => new MotivationTable(),
      animal: () => new AnimalTable(),
    },
  },
  location: {
    name: 'Ort',
    description: 'Gebäude, Landschaften, Gelände',
    tables: {
      building: () => new BuildingTable(),
      landscape: () => new LandscapeTable(),
      buildingAdjective: () => new BuildingAdjectiveTable(),
      terrainFeature: () => new TerrainFeatureTable(),
    },
  },
  faction: {
    name: 'Fraktion',
    description: 'Motivation, Namen, Leitsprüche',
    tables: {
      motivation: () => new FactionBeginningMotivationTable(),
      firstName: () => new FactionFirstNameTable(),
      secondName: () => new FactionSecondNameTable(),
      quote: () => new FactionQuoteTable(),
    },
  },
  god: {
    name: 'Gottheit',
    description: 'Domänen, Beinamen, Status',
    tables: {
      domain: () => new GodDomainTable(),
      byname: () => new GodBynameTable(),
      status: () => new GodStatusTable(),
    },
  },
  quest: {
    name: 'Quest',
    description: 'Questtypen, Schwierigkeit, Belohnungen',
    tables: {
      type: () => new QuestTypeTable(),
      difficulty: () => new QuestDifficultyTable(),
      reward: () => new QuestRewardTable(),
    },
  },
  name: {
    name: 'Name',
    description: 'Deutsche, barbarische, elfische Namen',
    tables: {
      germanFemale: () => new GermanFemaleNameTable(),
      germanMale: () => new GermanMaleNameTable(),
      barbaricMale: () => new BarbaricMaleNameTable(),
      barbaricFemale: () => new BarbaricFemaleNameTable(),
      elfenMale: () => new ElfenMaleNameTable(),
      elfenFemale: () => new ElfenFemaleNameTable(),
    },
  },
  spell: {
    name: 'Zauber',
    description: 'Zaubergeschichte, Wirkungsbereich, Abklingzeit',
    tables: {
      lore: () => new SpellLoreTable(),
      areaOfEffect: () => new SpellAreaOfEffectTable(),
      cooldown: () => new SpellCooldownTable(),
    },
  },
  ritual: {
    name: 'Ritual',
    description: 'Ritualhandlungen, Opfergaben, Orte, Zeiten',
    tables: {
      action: () => new RitualActionTable(),
      offering: () => new RitualOfferingTable(),
      location: () => new RitualLocationTable(),
      time: () => new RitualTimeTable(),
    },
  },
  dungeon: {
    name: 'Dungeon',
    description: 'Typen, Zweck, Fallen, Beschreibungen',
    tables: {
      type: () => new DungeonTypeTable(),
      purpose: () => new DungeonPurposeTable(),
      trap: () => new TrapTable(),
      adjective: () => new DungeonAdjectiveTable(),
    },
  },
  monster: {
    name: 'Monster',
    description: 'Monster, mythische Kreaturen, Beschreibungen',
    tables: {
      monster: () => new MonsterTable(),
      adjective: () => new MonsterAdjectiveTable(),
      mythicalCreature: () => new MythicalCreatureTable(),
    },
  },
  artefact: {
    name: 'Artefakt',
    description: 'Artefakte, magische Gegenstände, Waffen, Edelsteine',
    tables: {
      artefact: () => new ArtefactTable(),
      magical: () => new MagicalArtefactTable(),
      weapon: () => new WeaponTable(),
      gemstone: () => new GemstoneTable(),
    },
  },
  town: {
    name: 'Stadt',
    description: 'Stadtgröße, Ereignisse, Bekanntheit',
    tables: {
      size: () => new TownSizeTable(),
      event: () => new TownEventTable(),
      fame: () => new TownFameTable(),
    },
  },
  talent: {
    name: 'Talent',
    description: 'Talente und Fähigkeiten',
    tables: {
      talent: () => new TalentTable(),
    },
  },
};
