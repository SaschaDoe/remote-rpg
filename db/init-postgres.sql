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
