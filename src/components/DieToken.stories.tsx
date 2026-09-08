import type { Meta, StoryObj } from '@storybook/react-vite';
import { DieToken } from './DieToken';

const meta = {
  title: 'Game/DieToken',
  component: DieToken,
  args: {
    die: {
      id: 'storybook-die',
      ownerId: 'pintbox',
      skill: 'design',
      value: 4,
      round: 1,
      origin: 'storybook',
    },
  },
} satisfies Meta<typeof DieToken>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Design: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Text: Story = {
  args: {
    die: {
      id: 'storybook-text-die',
      ownerId: 'user79',
      skill: 'text',
      value: 6,
      round: 1,
      origin: 'storybook',
    },
  },
};

export const AA: Story = {
  args: {
    die: {
      id: 'storybook-aa-die',
      ownerId: 'mashiro',
      skill: 'aa',
      value: 3,
      round: 1,
      origin: 'storybook',
    },
  },
};
