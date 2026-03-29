import { askGameMaster } from './game-master.js';
import { askWorldBuilder, type EntityParseResult } from './world-builder.js';
import { getWorldWithRegions, getAllNodes } from '../db/graph.js';
import { searchKnowledge } from '../db/vectors.js';
import type { AgentMode, World, Player } from '$lib/types.js';

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
    const result = await askWorldBuilder(userMessage, worldContext);
    return { content: result.content, entities: result.entities };
  }

  const playerContext = await gatherPlayerContext();
  const content = await askGameMaster(userMessage, worldContext, playerContext);
  return { content };
}
