/**
 * Adapter that exposes inspire-tables to our agents.
 * Provides a clean API for rolling on tables and generating random seeds.
 */

import { Dice } from '$tables/utils/dice.js';
import { tableRegistry, type TableCategory } from './registry.js';

const dice = new Dice();

/**
 * Roll on a specific table within a category.
 * @returns The rolled result text
 */
export function rollTable(category: string, tableName: string): string {
  const cat = tableRegistry[category];
  if (!cat) return `Unbekannte Kategorie: ${category}`;

  const tableFactory = cat.tables[tableName];
  if (!tableFactory) return `Unbekannte Tabelle: ${tableName}`;

  const table = tableFactory();
  const result = table.roleWithCascade(dice);
  return result.text;
}

/**
 * Roll on ALL tables in a category, returning a map of results.
 * Useful for generating a complete entity seed.
 */
export function rollCategory(category: string): Record<string, string> {
  const cat = tableRegistry[category];
  if (!cat) return {};

  const results: Record<string, string> = {};
  for (const [name, factory] of Object.entries(cat.tables)) {
    const table = factory();
    results[name] = table.roleWithCascade(dice).text;
  }
  return results;
}

/**
 * Roll on a random table from a random category.
 * Returns a surprising seed for creative inspiration.
 */
export function rollRandom(): { category: string; table: string; result: string } {
  const categories = Object.keys(tableRegistry);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const cat = tableRegistry[category];
  const tableNames = Object.keys(cat.tables);
  const tableName = tableNames[Math.floor(Math.random() * tableNames.length)];
  const result = rollTable(category, tableName);
  return { category, table: tableName, result };
}

/**
 * Generate a magic system seed by rolling on all magic tables.
 */
export function rollMagicSystem(): Record<string, string> {
  return rollCategory('magic');
}

/**
 * Generate an NPC seed by rolling on character tables.
 */
export function rollCharacter(): Record<string, string> {
  const results = rollCategory('character');
  // Add a name
  results.firstName = rollTable('name', 'firstName');
  results.lastName = rollTable('name', 'lastName');
  return results;
}

/**
 * Generate a faction seed.
 */
export function rollFaction(): Record<string, string> {
  return rollCategory('faction');
}

/**
 * Generate a deity seed.
 */
export function rollDeity(): Record<string, string> {
  const results = rollCategory('god');
  results.alignment = rollTable('character', 'alignment');
  return results;
}

/**
 * Generate a quest seed.
 */
export function rollQuest(): Record<string, string> {
  return rollCategory('quest');
}

/**
 * Generate a dungeon seed.
 */
export function rollDungeon(): Record<string, string> {
  const results = rollCategory('dungeon');
  results.monster = rollTable('monster', 'type');
  results.artefact = rollTable('artefact', 'type');
  return results;
}

/**
 * List all available categories with their descriptions.
 */
export function listCategories(): { id: string; name: string; description: string }[] {
  return Object.entries(tableRegistry).map(([id, cat]) => ({
    id,
    name: cat.name,
    description: cat.description,
  }));
}

/**
 * List all tables in a category.
 */
export function listTables(category: string): string[] {
  const cat = tableRegistry[category];
  if (!cat) return [];
  return Object.keys(cat.tables);
}

/**
 * Format rolled results as a readable German text block for agent context.
 */
export function formatRollResults(
  entityType: string,
  results: Record<string, string>
): string {
  const lines = [`Zufällige Inspiration für ${entityType}:`];
  for (const [key, value] of Object.entries(results)) {
    lines.push(`- ${key}: ${value}`);
  }
  return lines.join('\n');
}
