import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper,
  useTheme,
  useMediaQuery,
  Badge
} from '@mui/material';
import {
  Home,
  ViewModule,
  Search,
  Notifications,
  AccountCircle
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';

const MobileBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { notifications } = useAppSelector((state) => state.ui);
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  
  // Don't show on desktop
  if (!isMobile) {
    return null;
  }
  
  // Get current tab based on pathname
  const getCurrentTab = () => {
    const pathname = location.pathname;
    
    if (pathname === '/' || pathname === '/dashboard') {
      return 0;
    } else if (pathname.includes('/bases')) {
      return 1;
    } else if (pathname.includes('/search')) {
      return 2;
    } else if (pathname.includes('/notifications')) {
      return 3;
    } else if (pathname.includes('/profile')) {
      return 4;
    }
    
    return 0;
  };
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/bases');
        break;
      case 2:
        navigate('/search');
        break;
      case 3:
        navigate('/notifications');
        break;
      case 4:
        navigate('/profile');
        break;
    }
  };
  
  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${theme.palette.divider}`,
        // Add safe area padding for devices with home indicator
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} 
      elevation={8}
    >
      <BottomNavigation
        value={getCurrentTab()}
        onChange={handleChange}
        showLabels
        role="navigation"
        aria-label="Main navigation"
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 12px 8px',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            '&.Mui-selected': {
              fontSize: '0.75rem',
            },
          },
        }}
      >
        <BottomNavigationAction 
          label="Home" 
          icon={<Home />}
          aria-label="Navigate to home"
        />
        <BottomNavigationAction 
          label="Bases" 
          icon={<ViewModule />}
          aria-label="Navigate to bases"
        />
        <BottomNavigationAction 
          label="Search" 
          icon={<Search />}
          aria-label="Navigate to search"
        />
        <BottomNavigationAction 
          label="Alerts" 
          icon={
            <Badge badgeContent={unreadNotifications} color="error">
              <Notifications />
            </Badge>
          }
          aria-label={`Navigate to notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
        />
        <BottomNavigationAction 
          label="Profile" 
          icon={<AccountCircle />}
          aria-label="Navigate to profile"
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNavigation;