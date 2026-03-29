import neo4j, { type Driver } from 'neo4j-driver';
import { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } from '$env/static/private';

let driver: Driver;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driver;
}

export async function initNeo4jSchema(): Promise<void> {
  const session = getDriver().session();
  try {
    const constraints = [
      'CREATE CONSTRAINT world_id IF NOT EXISTS FOR (w:World) REQUIRE w.id IS UNIQUE',
      'CREATE CONSTRAINT region_id IF NOT EXISTS FOR (r:Region) REQUIRE r.id IS UNIQUE',
      'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE',
      'CREATE CONSTRAINT npc_id IF NOT EXISTS FOR (n:NPC) REQUIRE n.id IS UNIQUE',
      'CREATE CONSTRAINT faction_id IF NOT EXISTS FOR (f:Faction) REQUIRE f.id IS UNIQUE',
      'CREATE CONSTRAINT player_id IF NOT EXISTS FOR (p:Player) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT quest_id IF NOT EXISTS FOR (q:Quest) REQUIRE q.id IS UNIQUE',
      'CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT magicsystem_id IF NOT EXISTS FOR (m:MagicSystem) REQUIRE m.id IS UNIQUE',
      'CREATE CONSTRAINT deity_id IF NOT EXISTS FOR (d:Deity) REQUIRE d.id IS UNIQUE',
    ];
    for (const constraint of constraints) {
      await session.run(constraint);
    }
    console.log('Neo4j schema initialized');
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
  }
}
