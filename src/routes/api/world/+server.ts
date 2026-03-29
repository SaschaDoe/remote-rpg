import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createNode, createRelationship, getAllNodes } from '$lib/server/db/graph.js';
import { storeKnowledge } from '$lib/server/db/vectors.js';
import type { World, Region, Location, NPC, Faction } from '$lib/types.js';

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type');
  if (!type) {
    return json({ error: 'type parameter required' }, { status: 400 });
  }

  const validTypes = ['World', 'Region', 'Location', 'NPC', 'Faction', 'Quest', 'Item'] as const;
  if (!validTypes.includes(type as any)) {
    return json({ error: `Invalid type. Valid: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const nodes = await getAllNodes(type as any);
  return json(nodes);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { action, entityType, data, relationship } = body;

  try {
    if (action === 'create') {
      const node = await createNode(entityType, data);

      // Store lore as vector knowledge if provided
      if (data.lore) {
        await storeKnowledge(entityType, node.id, data.lore, []);
      }

      return json(node, { status: 201 });
    }

    if (action === 'relate') {
      const { fromLabel, fromId, relType, toLabel, toId } = relationship;
      const success = await createRelationship(fromLabel, fromId, relType, toLabel, toId);
      return json({ success });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('World API error:', error);
    return json({ error: 'Fehler bei der Verarbeitung' }, { status: 500 });
  }
};
