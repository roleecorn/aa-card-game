import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const abs = (...parts: string[]) => path.join(ROOT, ...parts);

const primitiveStories = {
  CharacterCard: ['Default', 'Compact', 'HighStress', 'WithActions'],
  CharacterSelectionCard: ['Full', 'Rail', 'Selected', 'CardBack'],
  HandCard: ['Support', 'Event', 'Tilted'],
  WorkCard: ['Default', 'BlueTone', 'AssigningDie'],
  DieToken: ['Design', 'Text', 'AA', 'Selected'],
} as const;

const primitives = Object.keys(primitiveStories) as Array<keyof typeof primitiveStories>;
const collections = ['CardHand', 'DiceTray', 'WorkBoard', 'TeamColumn'] as const;

describe('runtime UI object registry', () => {
  it('runs Storybook through the production theme foundation', async () => {
    const preview = await fs.readFile(abs('.storybook/preview.tsx'), 'utf8');
    expect(preview).toContain("import { theme } from '../src/app/theme'");
    expect(preview).toContain('<ThemeProvider theme={theme}>');
    expect(preview).toContain('<CssBaseline />');
  });

  it('keeps every registered visual primitive paired with its canonical Storybook states', async () => {
    for (const name of primitives) {
      const componentPath = abs('src/components', `${name}.tsx`);
      const storyPath = abs('src/components', `${name}.stories.tsx`);
      await expect(fs.stat(componentPath), `${name} production component`).resolves.toBeTruthy();
      await expect(fs.stat(storyPath), `${name} Storybook reference`).resolves.toBeTruthy();

      const story = await fs.readFile(storyPath, 'utf8');
      expect(story, `${name} story title`).toContain(`title: 'Game/${name}'`);
      expect(story, `${name} story component`).toContain(`component: ${name}`);
      for (const state of primitiveStories[name]) {
        expect(story, `${name} should preserve the ${state} reference state`).toMatch(
          new RegExp(`export\\s+const\\s+${state}\\s*:\\s*Story\\b`),
        );
      }
    }
  });

  it('keeps CharacterSelectionCard on the shared character data/component boundary', async () => {
    const source = await fs.readFile(abs('src/components/CharacterSelectionCard.tsx'), 'utf8');
    expect(source).toContain("type { CharacterDefinition } from '../game/schema'");
    expect(source).toContain("{ SKILLS } from '../content/catalog'");
    expect(source).toContain("{ CharacterAffinities } from './CharacterAffinities'");
    expect(source).not.toMatch(/interface\s+Character(?:Data|Model|Stats)\b/);
  });

  it('keeps collection components as compositions rather than duplicate registered primitives', async () => {
    for (const name of collections) {
      await expect(fs.stat(abs('src/components', `${name}.tsx`)), `${name} collection component`).resolves.toBeTruthy();
      expect(primitives).not.toContain(name as keyof typeof primitiveStories);
    }
  });
});
