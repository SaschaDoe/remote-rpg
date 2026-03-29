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
