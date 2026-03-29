# Remote RPG System — Design Spec

## Overview

A SvelteKit web app for running tabletop RPGs with AI agents. Voice-first interaction in German, local speech processing, Claude Code SDK as the LLM backend, Neo4j + pgvector for world knowledge.

Personal project, runs on the developer's machine. Solo or small group real-time play.

## Architecture

### Frontend (SvelteKit, responsive/mobile-friendly)

- Chat interface showing conversation with the Game Master
- Voice input button (always available, uses local Whisper for STT)
- Voice output toggle checkbox (uses local Piper TTS when enabled)
- All UI and responses in German
- Session management for solo or small group play

### Backend (SvelteKit server / Node.js)

- Agent Orchestrator routes player input to the right agent
- Local Whisper server for speech-to-text (German)
- Local Piper server for text-to-speech (German, toggleable)
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for all LLM calls

### Agents

Four specialized agents, all powered by Claude Code SDK:

1. **Game Master (Spielleiter)** — Player-facing narrator. Describes scenes, handles actions, runs combat, tells the story. The agent players "talk to."

2. **World Builder (Weltenbauer)** — Background agent for creating and evolving the world. The user can talk to it directly to design regions, NPCs, factions, lore. Writes to the graph database.

3. **Player Handler (Spielerführer)** — Advises the Game Master on RPG balance. Ensures fair difficulty — not too kind, not too harsh. Manages consequences, challenge scaling, and player agency.

4. **Brain (Weltwissen)** — Not an agent but the knowledge layer. Neo4j for structured relationships, pgvector for semantic retrieval of freeform lore. All agents read from it, World Builder writes to it.

### Agent Flow

```
Player speaks (German)
  → Whisper STT
  → Agent Orchestrator
  → Game Master (consults Player Handler for balance)
  → Game Master queries Brain (Neo4j + pgvector) for world context
  → Claude Code SDK generates response
  → Response displayed as text
  → If voice toggle on: Piper TTS speaks response
```

World Builder runs separately — user switches to a "world building" mode to talk to it directly.

## Data Model

### Neo4j Graph — structured core

```
(:World {name, genre, magicSystem, rules, description})
    -[:HAS_REGION]-> (:Region {name, description, climate, dangerLevel})

(:Region)
    -[:CONTAINS]-> (:Location {name, type, description})

(:Location)
    -[:CONNECTS_TO]-> (:Location)

(:NPC {name, race, role, personality, status})
    -[:RESIDES_IN]-> (:Location)
    -[:BELONGS_TO]-> (:Faction {name, goals, alignment})
    -[:KNOWS]-> (:NPC)
    -[:HOSTILE_TO]-> (:NPC)
    -[:OWNS]-> (:Item {name, type, description})

(:Player {name, class, level, hp})
    -[:LOCATED_AT]-> (:Location)
    -[:HAS_QUEST]-> (:Quest {name, description, status})
    -[:CARRIES]-> (:Item)

(:Quest)
    -[:GIVEN_BY]-> (:NPC)
    -[:OBJECTIVE_AT]-> (:Location)

(:Event {name, description, timestamp})
    -[:OCCURRED_AT]-> (:Location)
    -[:INVOLVED]-> (:NPC)
```

### pgvector — freeform knowledge

Table: `world_knowledge`
- `id` (uuid)
- `entity_type` (string — maps to Neo4j node label)
- `entity_id` (string — maps to Neo4j node id)
- `content` (text — lore, backstory, session notes, rich descriptions)
- `embedding` (vector — for semantic search)

Agents query pgvector semantically ("what do I know about the dark forest?") and follow Neo4j graph relationships for structured facts.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | SvelteKit (Svelte 5) |
| Backend | SvelteKit server (Node.js) |
| LLM | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) |
| Graph DB | Neo4j Community Edition (local Docker) |
| Vector DB | PostgreSQL + pgvector (local Docker) |
| STT | Whisper (faster-whisper, local) |
| TTS | Piper TTS (local) |
| Language | TypeScript throughout |

## Voice Pipeline

### Speech-to-Text (Whisper)
- Run `faster-whisper` as a local HTTP server
- SvelteKit backend sends recorded audio, gets German text back
- Model: `large-v3` for best German accuracy (or `medium` if too slow)

### Text-to-Speech (Piper)
- Run Piper as a local HTTP server
- German voice model (e.g., `thorsten` — high quality German male voice)
- Only activated when user toggles the voice output checkbox
- Returns audio that the frontend plays

## Multiplayer

- Solo play is the default
- For group play: players connect to the host's local network (same WiFi or VPN)
- A simple game room system — host creates a session, players join by URL
- All players share the same Game Master and world state
- Player turns can be free-form (no strict turn order) — the Game Master handles who's addressed

## Deployment

- Everything runs locally on the developer's machine
- Neo4j and PostgreSQL via Docker Compose
- Whisper and Piper as local services (Docker or native)
- SvelteKit dev server for the web app
- Accessible on local network for mobile/friend access
