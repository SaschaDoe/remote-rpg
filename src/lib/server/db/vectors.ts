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
