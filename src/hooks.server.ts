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
