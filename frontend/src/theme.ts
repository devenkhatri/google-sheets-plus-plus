import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create base theme
let theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          // Increase touch target size for mobile
          '@media (max-width:600px)': {
            minHeight: '48px',
            padding: '12px 16px',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          // Increase input size on mobile for better touch targets
          '@media (max-width:600px)': {
            '& .MuiInputBase-root': {
              minHeight: '48px',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          // Increase checkbox size on mobile
          '@media (max-width:600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          // Increase radio button size on mobile
          '@media (max-width:600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          // Increase switch size on mobile
          '@media (max-width:600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // Increase icon button size on mobile
          '@media (max-width:600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          // Increase list item height on mobile
          '@media (max-width:600px)': {
            paddingTop: '12px',
            paddingBottom: '12px',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          // Adjust tabs for mobile
          '@media (max-width:600px)': {
            '& .MuiTab-root': {
              minHeight: '48px',
              padding: '12px 16px',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          // Ensure drawer takes full width on mobile
          '@media (max-width:600px)': {
            width: '100%',
            maxWidth: '100%',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          // Adjust dialog for mobile
          '@media (max-width:600px)': {
            margin: '16px',
            width: 'calc(100% - 32px)',
            maxWidth: 'calc(100% - 32px)',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          // Increase tooltip size on mobile
          '@media (max-width:600px)': {
            fontSize: '0.875rem',
            padding: '8px 12px',
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// Apply responsive font sizes
theme = responsiveFontSizes(theme);

export { theme };