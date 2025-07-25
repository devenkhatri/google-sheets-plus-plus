import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  Divider, 
  IconButton, 
  useMediaQuery, 
  useTheme,
  SwipeableDrawer,
  Fab,
  Zoom
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useSwipeable } from 'react-swipeable';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setSidebarOpen } from '../store/slices/uiSlice';
import Sidebar from './Sidebar';
import Header from './Header';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import MobileBottomNavigation from './ui/MobileBottomNavigation';

const drawerWidth = 240;

const Layout = () => {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  
  // State for scroll-to-top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Handle drawer open/close
  const handleDrawerOpen = () => {
    dispatch(setSidebarOpen(true));
  };
  
  const handleDrawerClose = () => {
    dispatch(setSidebarOpen(false));
  };
  
  // Close drawer on location change for mobile
  useEffect(() => {
    if (isMobile) {
      handleDrawerClose();
    }
  }, [location, isMobile]);
  
  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      if (eventData.initial[0] < 50 && !sidebarOpen && isMobile) {
        handleDrawerOpen();
      }
    },
    onSwipedLeft: (eventData) => {
      if (sidebarOpen && isMobile) {
        handleDrawerClose();
      }
    },
    trackMouse: false,
    trackTouch: true
  });
  
  return (
    <Box sx={{ display: 'flex' }} {...swipeHandlers}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          ...(sidebarOpen && !isMobile && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) =>
              theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar sx={{ 
          minHeight: { xs: '56px', sm: '64px' },
          px: { xs: 1, sm: 2 }
        }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: { xs: 1, sm: 5 },
              ...(sidebarOpen && !isMobile && { display: 'none' }),
              // Increase touch target size for mobile
              padding: { xs: '12px', sm: '8px' }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Airtable Clone
          </Typography>
        </Toolbar>
      </AppBar>
      
      {isMobile ? (
        // Mobile drawer (swipeable)
        <SwipeableDrawer
          open={sidebarOpen}
          onClose={handleDrawerClose}
          onOpen={handleDrawerOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minHeight: { xs: '56px', sm: '64px' },
              px: [1],
            }}
          >
            <IconButton onClick={handleDrawerClose} sx={{ padding: '12px' }}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          <Sidebar />
        </SwipeableDrawer>
      ) : (
        // Desktop drawer (permanent)
        <Drawer
          variant="permanent"
          open={sidebarOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            display: { xs: 'none', sm: 'block' },
            ...(sidebarOpen && {
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                transition: (theme) =>
                  theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                overflowX: 'hidden',
              },
            }),
            ...(!sidebarOpen && {
              '& .MuiDrawer-paper': {
                transition: (theme) =>
                  theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                  }),
                overflowX: 'hidden',
                width: (theme) => theme.spacing(7),
                [theme.breakpoints.up('sm')]: {
                  width: (theme) => theme.spacing(9),
                },
              },
            }),
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              px: [1],
            }}
          >
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          <Sidebar />
        </Drawer>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          width: { 
            xs: '100%',
            sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${theme.spacing(9)})` 
          },
          overflow: 'hidden',
          // Add bottom padding on mobile for bottom navigation
          pb: { xs: '80px', sm: 2, md: 3 },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: '56px', sm: '64px' } }} />
        
        {/* Offline sync status */}
        <OfflineSyncStatus />
        
        <Outlet />
        
        {/* Scroll to top button */}
        <Zoom in={showScrollTop}>
          <Fab 
            color="primary" 
            size="small" 
            aria-label="scroll back to top"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, sm: 16 }, // Above bottom navigation on mobile
              right: 16,
              // Increase size for mobile
              width: { xs: 48, sm: 40 },
              height: { xs: 48, sm: 40 },
            }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Zoom>
      </Box>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </Box>
  );
};

export default Layout;