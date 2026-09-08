import type { Meta, StoryObj } from '@storybook/react-vite';
import { CARDS } from '../content/catalog';
import { HandCard } from './HandCard';

const meta = {
  title: 'Game/HandCard',
  component: HandCard,
  args: {
    instance: { instanceId: 'storybook-card', cardId: 'soothe' },
    card: CARDS.soothe,
  },
} satisfies Meta<typeof HandCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Support: Story = {};

export const Event: Story = {
  args: {
    instance: { instanceId: 'storybook-event', cardId: 'overtime' },
    card: CARDS.overtime,
  },
};

export const Tilted: Story = {
  args: {
    rotation: -2,
  },
};
