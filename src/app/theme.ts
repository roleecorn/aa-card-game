import '../styles/fonts.css';
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#fbfaf8', paper: '#ffffff' },
    primary: { main: '#4b93dc' },
    secondary: { main: '#ff7587' },
    success: { main: '#4db8a8' },
    warning: { main: '#f6bb4f' },
    text: { primary: '#303645', secondary: '#687083' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"AA Noto Sans TC", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
    h5: { fontWeight: 900 },
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 800 },
  },
  components: {
    MuiCard: { styleOverrides: { root: { border: '1px solid #e4e7ee' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});
