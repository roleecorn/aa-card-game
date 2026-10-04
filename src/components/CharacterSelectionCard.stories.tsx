import type { Meta, StoryObj } from '@storybook/react-vite';
import { CHARACTERS } from '../content/catalog';
import { CharacterSelectionCard } from './CharacterSelectionCard';

const meta = {
  title: 'Game/CharacterSelectionCard',
  component: CharacterSelectionCard,
  args: {
    character: CHARACTERS.pintbox,
  },
} satisfies Meta<typeof CharacterSelectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Rail: Story = {
  args: {
    variant: 'rail',
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    selectedLabel: '已選取',
    interactive: true,
  },
};

export const CardBack: Story = {
  args: {
    revealed: false,
    dealIndex: 0,
  },
};
