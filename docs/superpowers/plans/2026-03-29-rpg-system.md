# Remote RPG System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-first RPG web app with AI agents (Game Master, World Builder, Player Handler), backed by Neo4j + pgvector, powered by Claude Agent SDK.

**Architecture:** SvelteKit fullstack app with server-side agent orchestration. Neo4j stores the world graph (World → Region → Location, NPCs, Quests). pgvector stores freeform lore for semantic retrieval. Local Whisper handles German STT, local Piper handles TTS. All LLM calls go through `@anthropic-ai/claude-agent-sdk`.

**Tech Stack:** SvelteKit (Svelte 5), TypeScript, Neo4j, PostgreSQL + pgvector, Docker Compose, Claude Agent SDK, faster-whisper, Piper TTS

---

## File Structure

```
remote-rpg/
├── docker-compose.yml                    # Neo4j + PostgreSQL + Whisper + Piper
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── .env                                  # DB credentials, ports
├── db/
│   ├── init-neo4j.cypher                 # Graph schema constraints/indexes
│   └── init-postgres.sql                 # pgvector extension + world_knowledge table
├── src/
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── types.ts                      # Shared types (World, Region, NPC, etc.)
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── neo4j.ts              # Neo4j driver singleton
│   │   │   │   ├── postgres.ts           # PostgreSQL pool singleton
│   │   │   │   ├── graph.ts              # Graph CRUD (create/read/update/delete nodes + relationships)
│   │   │   │   └── vectors.ts            # Vector store/search operations
│   │   │   ├── agents/
│   │   │   │   ├── sdk.ts                # Claude Agent SDK wrapper
│   │   │   │   ├── orchestrator.ts       # Routes player input to correct agent
│   │   │   │   ├── game-master.ts        # Game Master agent
│   │   │   │   ├── world-builder.ts      # World Builder agent
│   │   │   │   ├── player-handler.ts     # Player Handler (balance advisor)
│   │   │   │   └── prompts.ts            # All system prompts
│   │   │   └── voice/
│   │   │       ├── whisper.ts            # Whisper STT HTTP client
│   │   │       └── piper.ts              # Piper TTS HTTP client
│   │   └── stores/
│   │       ├── chat.svelte.ts            # Chat messages state (Svelte 5 runes)
│   │       └── settings.svelte.ts        # Voice toggle, current mode
│   ├── routes/
│   │   ├── +layout.svelte                # App shell, nav
│   │   ├── +page.svelte                  # Main chat page
│   │   ├── api/
│   │   │   ├── chat/+server.ts           # POST: send message to Game Master
│   │   │   ├── world/+server.ts          # POST: send message to World Builder
│   │   │   ├── voice/
│   │   │   │   ├── stt/+server.ts        # POST: audio → text (Whisper)
│   │   │   │   └── tts/+server.ts        # POST: text → audio (Piper)
│   │   │   └── graph/+server.ts          # GET/POST: inspect/modify world graph
```

---

## Phase 1: Project Foundation

### Task 1: Initialize SvelteKit Project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`

- [ ] **Step 1: Scaffold SvelteKit**

```bash
cd "/c/proj/remote RPG"
npm create svelte@latest remote-rpg -- --template skeleton --types typescript
cd remote-rpg
npm install
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install neo4j-driver pg @anthropic-ai/claude-agent-sdk
npm install -D @types/pg
```

- [ ] **Step 3: Create `.env` file**

Create `.env`:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=remoterpg2026

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remoterpg
POSTGRES_USER=remoterpg
POSTGRES_PASSWORD=remoterpg2026

WHISPER_URL=http://localhost:8178
PIPER_URL=http://localhost:8179
```

- [ ] **Step 4: Create `.gitignore` additions**

Append to `.gitignore`:
```
.env
docker-data/
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: SvelteKit dev server starts on localhost:5173

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold SvelteKit project with dependencies"
```

---

### Task 2: Docker Compose Infrastructure

**Files:**
- Create: `docker-compose.yml`, `db/init-neo4j.cypher`, `db/init-postgres.sql`

- [ ] **Step 1: Create `docker-compose.yml`**

Create `docker-compose.yml`:
```yaml
services:
  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/remoterpg2026
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - ./docker-data/neo4j:/data

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: remoterpg
      POSTGRES_USER: remoterpg
      POSTGRES_PASSWORD: remoterpg2026
    volumes:
      - ./docker-data/postgres:/var/lib/postgresql/data
      - ./db/init-postgres.sql:/docker-entrypoint-initdb.d/init.sql
```

- [ ] **Step 2: Create `db/init-postgres.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS world_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_knowledge_entity
    ON world_knowledge(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_world_knowledge_embedding
    ON world_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

- [ ] **Step 3: Create `db/init-neo4j.cypher`**

This file is for reference/manual use since Neo4j doesn't auto-run init scripts:
```cypher
// Constraints
CREATE CONSTRAINT world_name IF NOT EXISTS FOR (w:World) REQUIRE w.id IS UNIQUE;
CREATE CONSTRAINT region_id IF NOT EXISTS FOR (r:Region) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT npc_id IF NOT EXISTS FOR (n:NPC) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT faction_id IF NOT EXISTS FOR (f:Faction) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT player_id IF NOT EXISTS FOR (p:Player) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT quest_id IF NOT EXISTS FOR (q:Quest) REQUIRE q.id IS UNIQUE;
CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;

// Indexes for common lookups
CREATE INDEX world_name_idx IF NOT EXISTS FOR (w:World) ON (w.name);
CREATE INDEX npc_name_idx IF NOT EXISTS FOR (n:NPC) ON (n.name);
CREATE INDEX location_name_idx IF NOT EXISTS FOR (l:Location) ON (l.name);
CREATE INDEX region_name_idx IF NOT EXISTS FOR (r:Region) ON (r.name);
```

- [ ] **Step 4: Start Docker services and verify**

```bash
docker compose up -d
# Wait for services to be ready
docker compose ps
```

Expected: Both `neo4j` and `postgres` containers running.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml db/
git commit -m "feat: add Docker Compose for Neo4j and PostgreSQL with pgvector"
```

---

### Task 3: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define all shared types**

Create `src/lib/types.ts`:
```typescript
// === Graph Entity Types ===

export interface World {
  id: string;
  name: string;
  genre: string;
  magicSystem: string;
  rules: string;
  description: string;
}

export interface Region {
  id: string;
  name: string;
  description: string;
  climate: string;
  dangerLevel: number; // 1-10
}

export interface Location {
  id: string;
  name: string;
  type: string; // "town", "dungeon", "forest", "tavern", etc.
  description: string;
}

export interface NPC {
  id: string;
  name: string;
  race: string;
  role: string;
  personality: string;
  status: string; // "alive", "dead", "missing", etc.
}

export interface Faction {
  id: string;
  name: string;
  goals: string;
  alignment: string;
}

export interface Player {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  status: string; // "active", "completed", "failed"
}

export interface Item {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  timestamp: string;
}

// === Chat Types ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent: 'game-master' | 'world-builder' | 'system';
  timestamp: number;
}

export type AgentMode = 'game-master' | 'world-builder';

// === Voice Types ===

export interface VoiceSettings {
  ttsEnabled: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types for graph entities and chat"
```

---

## Phase 2: Database Layer

### Task 4: Neo4j Connection + Schema Init

**Files:**
- Create: `src/lib/server/db/neo4j.ts`

- [ ] **Step 1: Create Neo4j driver singleton**

Create `src/lib/server/db/neo4j.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/db/neo4j.ts
git commit -m "feat: add Neo4j driver singleton with schema initialization"
```

---

### Task 5: PostgreSQL + pgvector Connection

**Files:**
- Create: `src/lib/server/db/postgres.ts`

- [ ] **Step 1: Create PostgreSQL pool singleton**

Create `src/lib/server/db/postgres.ts`:
```typescript
import pg from 'pg';
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} from '$env/static/private';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: POSTGRES_HOST,
      port: parseInt(POSTGRES_PORT),
      database: POSTGRES_DB,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
    });
  }
  return pool;
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/db/postgres.ts
git commit -m "feat: add PostgreSQL pool singleton"
```

---

### Task 6: Graph CRUD Operations

**Files:**
- Create: `src/lib/server/db/graph.ts`

- [ ] **Step 1: Create graph data access layer**

Create `src/lib/server/db/graph.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/db/graph.ts
git commit -m "feat: add graph CRUD operations for Neo4j world data"
```

---

### Task 7: Vector Store + Search

**Files:**
- Create: `src/lib/server/db/vectors.ts`

- [ ] **Step 1: Create vector operations module**

Create `src/lib/server/db/vectors.ts`:
```typescript
import { getPool } from './postgres.js';

export interface KnowledgeEntry {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function storeKnowledge(
  entityType: string,
  entityId: string,
  content: string,
  embedding: number[]
): Promise<KnowledgeEntry> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO world_knowledge (entity_type, entity_id, content, embedding)
     VALUES ($1, $2, $3, $4)
     RETURNING id, entity_type as "entityType", entity_id as "entityId", content, created_at as "createdAt", updated_at as "updatedAt"`,
    [entityType, entityId, content, JSON.stringify(embedding)]
  );
  return result.rows[0];
}

export async function searchKnowledge(
  queryEmbedding: number[],
  limit: number = 5
): Promise<(KnowledgeEntry & { similarity: number })[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, entity_type as "entityType", entity_id as "entityId", content,
            created_at as "createdAt", updated_at as "updatedAt",
            1 - (embedding <=> $1::vector) as similarity
     FROM world_knowledge
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [JSON.stringify(queryEmbedding), limit]
  );
  return result.rows;
}

export async function getKnowledgeForEntity(
  entityType: string,
  entityId: string
): Promise<KnowledgeEntry[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, entity_type as "entityType", entity_id as "entityId", content,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM world_knowledge
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY updated_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
}

export async function deleteKnowledge(id: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM world_knowledge WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
```

Note: Embeddings will be generated by the agents using Claude's capabilities or a local embedding model. For now, the store/search interface is ready.

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/db/vectors.ts
git commit -m "feat: add pgvector knowledge store and semantic search"
```

---

## Phase 3: Agent System

### Task 8: Claude Agent SDK Wrapper

**Files:**
- Create: `src/lib/server/agents/sdk.ts`

- [ ] **Step 1: Create SDK wrapper**

Create `src/lib/server/agents/sdk.ts`:
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

export interface AgentRequest {
  systemPrompt: string;
  userMessage: string;
  maxTurns?: number;
}

export interface AgentResponse {
  content: string;
}

export async function callAgent(request: AgentRequest): Promise<AgentResponse> {
  let content = '';

  for await (const message of query({
    prompt: request.userMessage,
    options: {
      systemPrompt: request.systemPrompt,
      maxTurns: request.maxTurns ?? 1,
      allowedTools: [],
    },
  })) {
    if (message.type === 'assistant') {
      const textBlocks = message.message.content.filter(
        (block: any) => block.type === 'text'
      );
      content += textBlocks.map((block: any) => block.text).join('');
    } else if (message.type === 'result') {
      if (message.result) {
        content = message.result;
      }
    }
  }

  return { content };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/agents/sdk.ts
git commit -m "feat: add Claude Agent SDK wrapper"
```

---

### Task 9: Agent System Prompts

**Files:**
- Create: `src/lib/server/agents/prompts.ts`

- [ ] **Step 1: Define all agent system prompts**

Create `src/lib/server/agents/prompts.ts`:
```typescript
export function getGameMasterPrompt(worldContext: string, playerContext: string, balanceAdvice: string): string {
  return `Du bist der Spielleiter (Game Master) eines Pen-and-Paper-Rollenspiels. Du sprichst immer Deutsch.

## Deine Rolle
- Du erzählst die Geschichte, beschreibst Szenen, führst Dialoge mit NPCs
- Du würfelst für Aktionen und bestimmst die Ergebnisse
- Du bist fair aber fordernd — nicht zu freundlich, nicht zu hart
- Du reagierst auf Spieleraktionen und treibst die Geschichte voran

## Spielstil
- Beschreibe Szenen atmosphärisch aber nicht zu lang
- NPCs haben eigene Persönlichkeiten und Motivationen
- Konsequenzen sind logisch und fair
- Kämpfe sind spannend, Ergebnisse nicht vorhersehbar

## Aktuelle Weltinformationen
${worldContext}

## Spielerinformationen
${playerContext}

## Balance-Hinweise
${balanceAdvice}

Antworte immer auf Deutsch. Bleibe in deiner Rolle als Spielleiter.`;
}

export function getWorldBuilderPrompt(worldContext: string): string {
  return `Du bist der Weltenbauer eines Pen-and-Paper-Rollenspiels. Du sprichst immer Deutsch.

## Deine Rolle
- Du erschaffst und entwickelst die Spielwelt gemeinsam mit dem Benutzer
- Du entwirfst Regionen, Orte, NPCs, Fraktionen, Quests und Gegenstände
- Du denkst über Zusammenhänge, Geschichte und Logik der Welt nach
- Du schlägst Ideen vor und arbeitest sie auf Wunsch aus

## Arbeitsweise
- Wenn der Benutzer eine neue Region/NPC/etc. beschreibt, fasse zusammen was du erstellen wirst
- Strukturiere deine Antworten klar: Name, Beschreibung, Eigenschaften, Beziehungen
- Denke über Auswirkungen auf die bestehende Welt nach
- Schlage Verbindungen zu bestehenden Elementen vor

## Ausgabeformat für neue Entitäten
Wenn du eine neue Entität erstellst, gib sie in diesem Format aus:

\`\`\`entity
type: [World|Region|Location|NPC|Faction|Quest|Item]
name: [Name]
properties: [JSON der Eigenschaften]
relationships: [Liste der Beziehungen]
lore: [Freitext-Hintergrundgeschichte]
\`\`\`

## Aktuelle Welt
${worldContext}

Antworte immer auf Deutsch. Sei kreativ aber konsistent.`;
}

export function getPlayerHandlerPrompt(playerContext: string, situation: string): string {
  return `Du bist der Spielerführer — ein interner Berater für den Spielleiter. Du sprichst Deutsch.

## Deine Rolle
- Du berätst den Spielleiter über Balance und Fairness
- Du sorgst dafür, dass das Spiel weder zu leicht noch zu schwer ist
- Du bewertest Spieleraktionen und schlägst angemessene Konsequenzen vor
- Du achtest auf Spieleragentschaft — Spieler sollen echte Entscheidungen treffen

## Richtlinien
- Zu leicht: Spieler gewinnen immer → mehr Herausforderungen, härtere Konsequenzen
- Zu schwer: Spieler scheitern ständig → Hilfestellungen einbauen, NPCs assistieren lassen
- Balance: Erfolge fühlen sich verdient an, Misserfolge sind lehrreich aber nicht frustrierend
- Würfe: Nicht jede Aktion braucht einen Wurf, nur bei unsicherem Ausgang

## Aktuelle Situation
${situation}

## Spielerinformationen
${playerContext}

Gib kurze, konkrete Ratschläge. Nicht mehr als 2-3 Sätze.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/agents/prompts.ts
git commit -m "feat: add German system prompts for all RPG agents"
```

---

### Task 10: Individual Agent Modules

**Files:**
- Create: `src/lib/server/agents/game-master.ts`, `src/lib/server/agents/world-builder.ts`, `src/lib/server/agents/player-handler.ts`

- [ ] **Step 1: Create Game Master agent**

Create `src/lib/server/agents/game-master.ts`:
```typescript
import { callAgent } from './sdk.js';
import { getGameMasterPrompt } from './prompts.js';
import { getPlayerHandlerAdvice } from './player-handler.js';

export async function askGameMaster(
  userMessage: string,
  worldContext: string,
  playerContext: string
): Promise<string> {
  const balanceAdvice = await getPlayerHandlerAdvice(playerContext, userMessage);

  const response = await callAgent({
    systemPrompt: getGameMasterPrompt(worldContext, playerContext, balanceAdvice),
    userMessage,
  });

  return response.content;
}
```

- [ ] **Step 2: Create World Builder agent**

Create `src/lib/server/agents/world-builder.ts`:
```typescript
import { callAgent } from './sdk.js';
import { getWorldBuilderPrompt } from './prompts.js';

export interface EntityParseResult {
  type: string;
  name: string;
  properties: Record<string, any>;
  relationships: string[];
  lore: string;
}

export async function askWorldBuilder(
  userMessage: string,
  worldContext: string
): Promise<{ content: string; entities: EntityParseResult[] }> {
  const response = await callAgent({
    systemPrompt: getWorldBuilderPrompt(worldContext),
    userMessage,
  });

  const entities = parseEntities(response.content);

  return { content: response.content, entities };
}

function parseEntities(content: string): EntityParseResult[] {
  const entityRegex = /```entity\n([\s\S]*?)```/g;
  const entities: EntityParseResult[] = [];
  let match;

  while ((match = entityRegex.exec(content)) !== null) {
    const block = match[1];
    const typeMatch = block.match(/type:\s*(.+)/);
    const nameMatch = block.match(/name:\s*(.+)/);
    const propsMatch = block.match(/properties:\s*(.+)/);
    const relsMatch = block.match(/relationships:\s*(.+)/);
    const loreMatch = block.match(/lore:\s*([\s\S]*?)$/);

    if (typeMatch && nameMatch) {
      let properties = {};
      try {
        properties = propsMatch ? JSON.parse(propsMatch[1]) : {};
      } catch {
        properties = { raw: propsMatch?.[1] ?? '' };
      }

      entities.push({
        type: typeMatch[1].trim(),
        name: nameMatch[1].trim(),
        properties,
        relationships: relsMatch ? relsMatch[1].split(',').map(r => r.trim()) : [],
        lore: loreMatch ? loreMatch[1].trim() : '',
      });
    }
  }

  return entities;
}
```

- [ ] **Step 3: Create Player Handler agent**

Create `src/lib/server/agents/player-handler.ts`:
```typescript
import { callAgent } from './sdk.js';
import { getPlayerHandlerPrompt } from './prompts.js';

export async function getPlayerHandlerAdvice(
  playerContext: string,
  situation: string
): Promise<string> {
  const response = await callAgent({
    systemPrompt: getPlayerHandlerPrompt(playerContext, situation),
    userMessage: `Bewerte diese Spieleraktion und gib kurze Balance-Hinweise: ${situation}`,
  });

  return response.content;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/agents/game-master.ts src/lib/server/agents/world-builder.ts src/lib/server/agents/player-handler.ts
git commit -m "feat: add Game Master, World Builder, and Player Handler agents"
```

---

### Task 11: Agent Orchestrator

**Files:**
- Create: `src/lib/server/agents/orchestrator.ts`

- [ ] **Step 1: Create orchestrator**

Create `src/lib/server/agents/orchestrator.ts`:
```typescript
import { askGameMaster } from './game-master.js';
import { askWorldBuilder, type EntityParseResult } from './world-builder.js';
import { getWorldWithRegions, getLocationContext, getAllNodes } from '../db/graph.js';
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/agents/orchestrator.ts
git commit -m "feat: add agent orchestrator with world context gathering"
```

---

## Phase 4: API Routes + Chat UI

### Task 12: API Endpoints

**Files:**
- Create: `src/routes/api/chat/+server.ts`, `src/routes/api/world/+server.ts`

- [ ] **Step 1: Create chat API endpoint**

Create `src/routes/api/chat/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { handleMessage } from '$lib/server/agents/orchestrator.js';

export const POST: RequestHandler = async ({ request }) => {
  const { message, mode } = await request.json();

  if (!message || typeof message !== 'string') {
    return json({ error: 'Nachricht erforderlich' }, { status: 400 });
  }

  const agentMode = mode === 'world-builder' ? 'world-builder' : 'game-master';

  try {
    const response = await handleMessage(agentMode, message);
    return json(response);
  } catch (error) {
    console.error('Agent error:', error);
    return json({ error: 'Fehler bei der Verarbeitung' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Create world builder API endpoint**

Create `src/routes/api/world/+server.ts`:
```typescript
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
        // Embedding placeholder — will be generated when embedding model is configured
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
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/
git commit -m "feat: add chat and world API endpoints"
```

---

### Task 13: Svelte Stores (Svelte 5 Runes)

**Files:**
- Create: `src/lib/stores/chat.svelte.ts`, `src/lib/stores/settings.svelte.ts`

- [ ] **Step 1: Create chat store**

Create `src/lib/stores/chat.svelte.ts`:
```typescript
import type { ChatMessage, AgentMode } from '$lib/types.js';

function createChatStore() {
  let messages = $state<ChatMessage[]>([]);
  let loading = $state(false);
  let mode = $state<AgentMode>('game-master');

  return {
    get messages() { return messages; },
    get loading() { return loading; },
    get mode() { return mode; },

    setMode(newMode: AgentMode) {
      mode = newMode;
    },

    async sendMessage(content: string) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        agent: mode,
        timestamp: Date.now(),
      };
      messages = [...messages, userMsg];
      loading = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, mode }),
        });

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content ?? data.error ?? 'Keine Antwort',
          agent: mode,
          timestamp: Date.now(),
        };
        messages = [...messages, assistantMsg];

        return assistantMsg;
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Verbindungsfehler. Bitte versuche es erneut.',
          agent: 'system',
          timestamp: Date.now(),
        };
        messages = [...messages, errorMsg];
        return errorMsg;
      } finally {
        loading = false;
      }
    },

    clear() {
      messages = [];
    },
  };
}

export const chatStore = createChatStore();
```

- [ ] **Step 2: Create settings store**

Create `src/lib/stores/settings.svelte.ts`:
```typescript
function createSettingsStore() {
  let ttsEnabled = $state(false);
  let recording = $state(false);

  return {
    get ttsEnabled() { return ttsEnabled; },
    get recording() { return recording; },

    toggleTTS() {
      ttsEnabled = !ttsEnabled;
    },

    setRecording(value: boolean) {
      recording = value;
    },
  };
}

export const settingsStore = createSettingsStore();
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/
git commit -m "feat: add Svelte 5 rune stores for chat and settings"
```

---

### Task 14: Main Chat UI

**Files:**
- Create: `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/app.css`

- [ ] **Step 1: Create app layout**

Create `src/routes/+layout.svelte`:
```svelte
<script lang="ts">
  import '../app.css';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  let { children } = $props();
</script>

<div class="app">
  <header>
    <h1>Remote RPG</h1>
    <nav>
      <button
        class:active={chatStore.mode === 'game-master'}
        onclick={() => chatStore.setMode('game-master')}
      >
        Spielleiter
      </button>
      <button
        class:active={chatStore.mode === 'world-builder'}
        onclick={() => chatStore.setMode('world-builder')}
      >
        Weltenbauer
      </button>
      <label class="tts-toggle">
        <input
          type="checkbox"
          checked={settingsStore.ttsEnabled}
          onchange={() => settingsStore.toggleTTS()}
        />
        Sprachausgabe
      </label>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    max-width: 800px;
    margin: 0 auto;
  }

  header {
    padding: 1rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  nav button {
    padding: 0.4rem 0.8rem;
    border: 1px solid #555;
    background: #222;
    color: #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  nav button.active {
    background: #4a6;
    color: #fff;
    border-color: #4a6;
  }

  .tts-toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #aaa;
    cursor: pointer;
  }

  main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
```

- [ ] **Step 2: Create main chat page**

Create `src/routes/+page.svelte`:
```svelte
<script lang="ts">
  import { chatStore } from '$lib/stores/chat.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { tick } from 'svelte';

  let inputText = $state('');
  let chatContainer: HTMLDivElement;
  let mediaRecorder: MediaRecorder | null = $state(null);

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || chatStore.loading) return;

    inputText = '';
    const response = await chatStore.sendMessage(text);
    await scrollToBottom();

    if (settingsStore.ttsEnabled && response.role === 'assistant') {
      await speakText(response.content);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function toggleRecording() {
    if (settingsStore.recording) {
      mediaRecorder?.stop();
      settingsStore.setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/voice/stt', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.text) {
            inputText = data.text;
          }
        } catch (err) {
          console.error('STT error:', err);
        }
      };

      recorder.start();
      mediaRecorder = recorder;
      settingsStore.setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }

  async function speakText(text: string) {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    }
  }

  $effect(() => {
    if (chatStore.messages.length > 0) {
      scrollToBottom();
    }
  });
</script>

<div class="chat-container" bind:this={chatContainer}>
  {#if chatStore.messages.length === 0}
    <div class="empty-state">
      {#if chatStore.mode === 'game-master'}
        <p>Willkommen, Abenteurer! Sprich mit dem Spielleiter.</p>
      {:else}
        <p>Willkommen beim Weltenbauer. Erschaffe deine Welt!</p>
      {/if}
    </div>
  {/if}

  {#each chatStore.messages as msg (msg.id)}
    <div class="message {msg.role}">
      <div class="message-header">
        {#if msg.role === 'user'}Du
        {:else if msg.agent === 'game-master'}Spielleiter
        {:else if msg.agent === 'world-builder'}Weltenbauer
        {:else}System{/if}
      </div>
      <div class="message-content">{msg.content}</div>
    </div>
  {/each}

  {#if chatStore.loading}
    <div class="message assistant loading">
      <div class="message-header">
        {chatStore.mode === 'game-master' ? 'Spielleiter' : 'Weltenbauer'}
      </div>
      <div class="message-content">Denkt nach...</div>
    </div>
  {/if}
</div>

<div class="input-bar">
  <button
    class="mic-btn"
    class:recording={settingsStore.recording}
    onclick={toggleRecording}
    title={settingsStore.recording ? 'Aufnahme stoppen' : 'Sprechen'}
  >
    {settingsStore.recording ? '⏹' : '🎤'}
  </button>
  <textarea
    bind:value={inputText}
    onkeydown={handleKeydown}
    placeholder={chatStore.mode === 'game-master'
      ? 'Was möchtest du tun?'
      : 'Beschreibe deine Welt...'}
    rows="1"
    disabled={chatStore.loading}
  ></textarea>
  <button
    class="send-btn"
    onclick={sendMessage}
    disabled={chatStore.loading || !inputText.trim()}
  >
    Senden
  </button>
</div>

<style>
  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    font-style: italic;
  }

  .message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    max-width: 85%;
  }

  .message.user {
    align-self: flex-end;
    background: #2a4a2a;
    color: #ddd;
  }

  .message.assistant {
    align-self: flex-start;
    background: #2a2a3a;
    color: #ddd;
  }

  .message.system {
    align-self: center;
    background: #3a2a2a;
    color: #c88;
    font-size: 0.85rem;
  }

  .message-header {
    font-size: 0.75rem;
    color: #888;
    margin-bottom: 0.25rem;
  }

  .message-content {
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .loading .message-content {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .input-bar {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #333;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 0.6rem;
    border: 1px solid #444;
    background: #1a1a1a;
    color: #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #4a6;
  }

  .mic-btn, .send-btn {
    padding: 0.6rem 1rem;
    border: 1px solid #444;
    background: #222;
    color: #ccc;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .mic-btn.recording {
    background: #a44;
    border-color: #a44;
    animation: pulse 1s infinite;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .send-btn:not(:disabled):hover,
  .mic-btn:hover {
    background: #333;
  }
</style>
```

- [ ] **Step 3: Create global styles**

Create `src/app.css`:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #111;
  color: #ddd;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/ src/app.css
git commit -m "feat: add main chat UI with mode switching and voice controls"
```

---

## Phase 5: Voice Pipeline

### Task 15: Voice API Endpoints

**Files:**
- Create: `src/lib/server/voice/whisper.ts`, `src/lib/server/voice/piper.ts`, `src/routes/api/voice/stt/+server.ts`, `src/routes/api/voice/tts/+server.ts`

- [ ] **Step 1: Create Whisper STT client**

Create `src/lib/server/voice/whisper.ts`:
```typescript
import { WHISPER_URL } from '$env/static/private';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('audio_file', new Blob([audioBuffer]), 'audio.webm');
  formData.append('language', 'de');

  const response = await fetch(`${WHISPER_URL}/asr?output=json&language=de`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper STT error: ${response.status}`);
  }

  const data = await response.json();
  return data.text ?? '';
}
```

- [ ] **Step 2: Create Piper TTS client**

Create `src/lib/server/voice/piper.ts`:
```typescript
import { PIPER_URL } from '$env/static/private';

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const response = await fetch(`${PIPER_URL}/api/tts?text=${encodeURIComponent(text)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Piper TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 3: Create STT API route**

Create `src/routes/api/voice/stt/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { transcribeAudio } from '$lib/server/voice/whisper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return json({ error: 'Keine Audiodatei' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const text = await transcribeAudio(buffer);

    return json({ text });
  } catch (error) {
    console.error('STT error:', error);
    return json({ error: 'Spracherkennung fehlgeschlagen' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Create TTS API route**

Create `src/routes/api/voice/tts/+server.ts`:
```typescript
import type { RequestHandler } from './$types.js';
import { synthesizeSpeech } from '$lib/server/voice/piper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response('Text erforderlich', { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response('Sprachsynthese fehlgeschlagen', { status: 500 });
  }
};
```

- [ ] **Step 5: Add Whisper + Piper to Docker Compose**

Append to `docker-compose.yml`:
```yaml
  whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest
    ports:
      - "8178:9000"
    environment:
      ASR_MODEL: medium
      ASR_ENGINE: faster_whisper

  piper:
    image: rhasspy/wyoming-piper:latest
    ports:
      - "8179:10200"
    command: --voice de_DE-thorsten-high
    volumes:
      - ./docker-data/piper:/data
```

Note: The Piper Docker image uses the Wyoming protocol. If the HTTP API differs, we'll adjust the client. An alternative is running Piper natively.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/voice/ src/routes/api/voice/ docker-compose.yml
git commit -m "feat: add Whisper STT and Piper TTS voice pipeline"
```

---

### Task 16: Server Initialization Hook

**Files:**
- Create: `src/hooks.server.ts`

- [ ] **Step 1: Create server hooks for DB initialization**

Create `src/hooks.server.ts`:
```typescript
import { initNeo4jSchema } from '$lib/server/db/neo4j.js';

let initialized = false;

export async function handle({ event, resolve }) {
  if (!initialized) {
    try {
      await initNeo4jSchema();
      console.log('Database schema initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
    initialized = true;
  }

  return resolve(event);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks.server.ts
git commit -m "feat: add server hook for Neo4j schema initialization on startup"
```

---

## Summary

**Phase 1** (Tasks 1-3): SvelteKit project + Docker + types — produces a running dev server with databases
**Phase 2** (Tasks 4-7): Database layer — Neo4j graph CRUD + pgvector search, testable independently
**Phase 3** (Tasks 8-11): Agent system — Claude Agent SDK integration, all three agents + orchestrator
**Phase 4** (Tasks 12-14): API routes + chat UI — playable web interface
**Phase 5** (Tasks 15-16): Voice pipeline — Whisper STT + Piper TTS integration

After all phases: you can speak German to the app, switch between Game Master and World Builder mode, and the agents use the graph database for world knowledge.
