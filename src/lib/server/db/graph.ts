import { getDriver } from './neo4j.js';
import { randomUUID } from 'crypto';
import type { World, Region, Location, NPC, Faction, Quest, Item, GameEvent, Player } from '$lib/types.js';

type NodeLabel = 'World' | 'Region' | 'Location' | 'NPC' | 'Faction' | 'Quest' | 'Item' | 'Event' | 'Player';

// === Generic CRUD ===

export async function createNode<T extends { id: string }>(
  label: NodeLabel,
  data: Omit<T, 'id'>
): Promise<T> {
  const session = getDriver().session();
  try {
    const id = randomUUID();
    const props = { id, ...data };
    const result = await session.run(
      `CREATE (n:${label} $props) RETURN n`,
      { props }
    );
    return result.records[0].get('n').properties as T;
  } finally {
    await session.close();
  }
}

export async function getNode<T>(label: NodeLabel, id: string): Promise<T | null> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (n:${label} {id: $id}) RETURN n`,
      { id }
    );
    if (result.records.length === 0) return null;
    return result.records[0].get('n').properties as T;
  } finally {
    await session.close();
  }
}

export async function updateNode<T>(
  label: NodeLabel,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (n:${label} {id: $id}) SET n += $props RETURN n`,
      { id, props: data }
    );
    if (result.records.length === 0) return null;
    return result.records[0].get('n').properties as T;
  } finally {
    await session.close();
  }
}

export async function deleteNode(label: NodeLabel, id: string): Promise<boolean> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (n:${label} {id: $id}) DETACH DELETE n RETURN count(n) as deleted`,
      { id }
    );
    return result.records[0].get('deleted').toNumber() > 0;
  } finally {
    await session.close();
  }
}

export async function getAllNodes<T>(label: NodeLabel): Promise<T[]> {
  const session = getDriver().session();
  try {
    const result = await session.run(`MATCH (n:${label}) RETURN n`);
    return result.records.map(r => r.get('n').properties as T);
  } finally {
    await session.close();
  }
}

// === Relationships ===

export async function createRelationship(
  fromLabel: NodeLabel,
  fromId: string,
  relType: string,
  toLabel: NodeLabel,
  toId: string
): Promise<boolean> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (a:${fromLabel} {id: $fromId}), (b:${toLabel} {id: $toId})
       MERGE (a)-[:${relType}]->(b)
       RETURN a, b`,
      { fromId, toId }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}

export async function removeRelationship(
  fromLabel: NodeLabel,
  fromId: string,
  relType: string,
  toLabel: NodeLabel,
  toId: string
): Promise<boolean> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (a:${fromLabel} {id: $fromId})-[r:${relType}]->(b:${toLabel} {id: $toId})
       DELETE r
       RETURN count(r) as deleted`,
      { fromId, toId }
    );
    return result.records[0].get('deleted').toNumber() > 0;
  } finally {
    await session.close();
  }
}

// === World-Specific Queries ===

export async function getWorldWithRegions(worldId: string): Promise<{ world: World; regions: Region[] } | null> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (w:World {id: $worldId})
       OPTIONAL MATCH (w)-[:HAS_REGION]->(r:Region)
       RETURN w, collect(r) as regions`,
      { worldId }
    );
    if (result.records.length === 0) return null;
    const record = result.records[0];
    return {
      world: record.get('w').properties as World,
      regions: record.get('regions').map((r: any) => r.properties) as Region[],
    };
  } finally {
    await session.close();
  }
}

export async function getLocationContext(locationId: string): Promise<{
  location: Location;
  npcs: NPC[];
  connectedLocations: Location[];
  region: Region | null;
} | null> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (l:Location {id: $locationId})
       OPTIONAL MATCH (n:NPC)-[:RESIDES_IN]->(l)
       OPTIONAL MATCH (l)-[:CONNECTS_TO]-(connected:Location)
       OPTIONAL MATCH (r:Region)-[:CONTAINS]->(l)
       RETURN l,
              collect(DISTINCT n) as npcs,
              collect(DISTINCT connected) as connected,
              r`,
      { locationId }
    );
    if (result.records.length === 0) return null;
    const record = result.records[0];
    return {
      location: record.get('l').properties as Location,
      npcs: record.get('npcs').filter((n: any) => n).map((n: any) => n.properties) as NPC[],
      connectedLocations: record.get('connected').filter((c: any) => c).map((c: any) => c.properties) as Location[],
      region: record.get('r') ? record.get('r').properties as Region : null,
    };
  } finally {
    await session.close();
  }
}

export async function getNPCContext(npcId: string): Promise<{
  npc: NPC;
  location: Location | null;
  faction: Faction | null;
  knownNPCs: NPC[];
  items: Item[];
} | null> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (n:NPC {id: $npcId})
       OPTIONAL MATCH (n)-[:RESIDES_IN]->(l:Location)
       OPTIONAL MATCH (n)-[:BELONGS_TO]->(f:Faction)
       OPTIONAL MATCH (n)-[:KNOWS]->(known:NPC)
       OPTIONAL MATCH (n)-[:OWNS]->(i:Item)
       RETURN n, l, f,
              collect(DISTINCT known) as known,
              collect(DISTINCT i) as items`,
      { npcId }
    );
    if (result.records.length === 0) return null;
    const record = result.records[0];
    return {
      npc: record.get('n').properties as NPC,
      location: record.get('l') ? record.get('l').properties as Location : null,
      faction: record.get('f') ? record.get('f').properties as Faction : null,
      knownNPCs: record.get('known').filter((k: any) => k).map((k: any) => k.properties) as NPC[],
      items: record.get('items').filter((i: any) => i).map((i: any) => i.properties) as Item[],
    };
  } finally {
    await session.close();
  }
}
