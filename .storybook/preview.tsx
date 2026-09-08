import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../src/app/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#fffdf8' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
