import type { Meta, StoryObj } from '@storybook/react-vite';
import { CHARACTERS } from '../content/catalog';
import type { CharacterState } from '../game/types';
import { CharacterCard } from './CharacterCard';

const definition = CHARACTERS.pintbox;

const makeState = (stress: number): CharacterState => ({
  defId: definition.id,
  stress,
  permanentStats: { ...definition.stats },
  timedStatModifiers: [],
  skillUsage: {},
  statuses: {},
});

const meta = {
  title: 'Game/CharacterCard',
  component: CharacterCard,
  args: {
    definition,
    stats: definition.stats,
    state: makeState(2),
  },
} satisfies Meta<typeof CharacterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const HighStress: Story = {
  args: {
    state: makeState(4),
  },
};

export const WithActions: Story = {
  args: {
    showActions: true,
    action: 'work',
    onActionChange: () => undefined,
  },
};
