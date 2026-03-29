import { askGameMaster } from './game-master.js';
import { askWorldBuilder, type EntityParseResult } from './world-builder.js';
import { getWorldWithRegions, getAllNodes } from '../db/graph.js';
import { searchKnowledge } from '../db/vectors.js';
import type { AgentMode, World, Player } from '$lib/types.js';
import {
  rollMagicSystem,
  rollCharacter,
  rollFaction,
  rollDeity,
  rollQuest,
  rollDungeon,
  rollRandom,
  formatRollResults,
} from '../tables/adapter.js';

async function gatherWorldContext(): Promise<string> {
  const worlds = await getAllNodes<World>('World');
  if (worlds.length === 0) {
    return 'Noch keine Welt erstellt. Der Spieler muss zuerst eine Welt erschaffen.';
  }

  const world = worlds[0];
  const worldData = await getWorldWithRegions(world.id);
  if (!worldData) return `Welt: ${world.name} (keine weiteren Details)`;

  let context = `Welt: ${worldData.world.name}\nGenre: ${worldData.world.genre}\nMagiesystem: ${worldData.world.magicSystem}\nRegeln: ${worldData.world.rules}\n`;

  if (worldData.regions.length > 0) {
    context += `\nRegionen:\n`;
    for (const region of worldData.regions) {
      context += `- ${region.name}: ${region.description} (Klima: ${region.climate}, Gefahr: ${region.dangerLevel}/10)\n`;
    }
  }

  return context;
}

async function gatherPlayerContext(): Promise<string> {
  const players = await getAllNodes<Player>('Player');
  if (players.length === 0) return 'Keine Spielercharaktere erstellt.';

  return players.map(p =>
    `${p.name} (${p.class}, Level ${p.level}, HP: ${p.hp})`
  ).join('\n');
}

/**
 * Detect what the user wants to create and roll relevant random tables
 * to inject surprising seeds into the World Builder's context.
 */
function generateRandomSeeds(userMessage: string): string | null {
  const msg = userMessage.toLowerCase();

  // Magic system keywords
  if (msg.includes('magie') || msg.includes('magic') || msg.includes('zauber') || msg.includes('spell')) {
    return formatRollResults('Magiesystem', rollMagicSystem());
  }

  // NPC / character keywords
  if (msg.includes('npc') || msg.includes('charakter') || msg.includes('character') || msg.includes('person') || msg.includes('figur')) {
    return formatRollResults('Charakter', rollCharacter());
  }

  // Faction keywords
  if (msg.includes('fraktion') || msg.includes('faction') || msg.includes('gilde') || msg.includes('orden') || msg.includes('gruppe')) {
    return formatRollResults('Fraktion', rollFaction());
  }

  // Deity keywords
  if (msg.includes('gott') || msg.includes('götter') || msg.includes('deity') || msg.includes('gottheit') || msg.includes('pantheon')) {
    return formatRollResults('Gottheit', rollDeity());
  }

  // Quest keywords
  if (msg.includes('quest') || msg.includes('aufgabe') || msg.includes('mission') || msg.includes('auftrag')) {
    return formatRollResults('Quest', rollQuest());
  }

  // Dungeon keywords
  if (msg.includes('dungeon') || msg.includes('verlies') || msg.includes('höhle') || msg.includes('ruine')) {
    return formatRollResults('Dungeon', rollDungeon());
  }

  // Generic creation keywords — roll something random for inspiration
  if (msg.includes('erstell') || msg.includes('erschaff') || msg.includes('generier') || msg.includes('würfel') || msg.includes('zufall') || msg.includes('inspir')) {
    const random = rollRandom();
    return `Zufällige Inspiration:\n- ${random.category}/${random.table}: ${random.result}`;
  }

  return null;
}

export interface OrchestratorResponse {
  content: string;
  entities?: EntityParseResult[];
}

export async function handleMessage(
  mode: AgentMode,
  userMessage: string
): Promise<OrchestratorResponse> {
  const worldContext = await gatherWorldContext();

  if (mode === 'world-builder') {
    // Detect what the user is creating and inject random seeds for inspiration
    const randomSeeds = generateRandomSeeds(userMessage);
    const enrichedContext = randomSeeds
      ? `${worldContext}\n\n${randomSeeds}`
      : worldContext;

    const result = await askWorldBuilder(userMessage, enrichedContext);
    return { content: result.content, entities: result.entities };
  }

  const playerContext = await gatherPlayerContext();
  const content = await askGameMaster(userMessage, worldContext, playerContext);
  return { content };
}
