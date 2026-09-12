import type { Meta, StoryObj } from '@storybook/react-vite';
import type { WorkState } from '../game/types';
import { WorkCard } from './WorkCard';

const work: WorkState = {
  id: 'storybook-work',
  ownerId: 'pintbox',
  title: '放學後的圖書室',
  type: '情',
  length: 5,
  slots: [
    { design: 4, text: 3, aa: 2 },
    { design: 5, text: 4, aa: 3 },
    { design: 3, text: 2, aa: 4 },
    { design: 4 },
    {},
  ],
};

const meta = {
  title: 'Game/WorkCard',
  component: WorkCard,
  args: {
    work,
    index: 0,
    score: 3,
  },
} satisfies Meta<typeof WorkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BlueTone: Story = {
  args: {
    toneIndex: 1,
  },
};

export const AssigningDie: Story = {
  args: {
    selectedDie: {
      id: 'selected-die',
      ownerId: 'pintbox',
      skill: 'text',
      value: 5,
      round: 1,
      origin: 'storybook',
    },
    onSlotClick: () => undefined,
  },
};
