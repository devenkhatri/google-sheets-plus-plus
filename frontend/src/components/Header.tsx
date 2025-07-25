import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  Avatar, 
  Tooltip,
  Box,
  Breadcrumbs,
  Link,
  Divider
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import GlobalSearch from './GlobalSearch';
import { NotificationPermissionDialog } from './ui/NotificationPermissionDialog';

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);
  const { bases } = useAppSelector((state) => state.bases);
  const { tables } = useAppSelector((state) => state.tables);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNotificationSettings = () => {
    setNotificationSettingsOpen(true);
    setNotificationAnchorEl(null);
  };
  
  const handleLogout = () => {
    dispatch(logout());
    handleClose();
  };
  
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  
  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    if (pathnames.length === 0) {
      return null;
    }
    
    const breadcrumbs = [];
    let currentPath = '';
    
    // Home
    breadcrumbs.push(
      <Link
        key="home"
        underline="hover"
        color="inherit"
        sx={{ display: 'flex', alignItems: 'center' }}
        onClick={() => navigate('/')}
      >
        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        Home
      </Link>
    );
    
    // Build breadcrumbs based on path
    for (let i = 0; i < pathnames.length; i++) {
      const pathname = pathnames[i];
      currentPath += `/${pathname}`;
      
      // Skip certain paths
      if (pathname === 'bases' && i === 0) continue;
      if (pathname === 'tables' && pathnames[i-1] === 'bases') continue;
      if (pathname === 'records' && pathnames[i-1] === 'tables') continue;
      
      let name = pathname;
      
      // Try to get actual names for bases and tables
      if (i === 1 && pathnames[i-1] === 'bases') {
        const base = bases.find(b => b.id === pathname);
        if (base) name = base.name;
      } else if (i === 3 && pathnames[i-3] === 'bases' && pathnames[i-1] === 'tables') {
        const table = tables.find(t => t.id === pathname);
        if (table) name = table.name;
      }
      
      const isLast = i === pathnames.length - 1;
      
      breadcrumbs.push(
        <Link
          key={currentPath}
          underline={isLast ? "none" : "hover"}
          color={isLast ? "text.primary" : "inherit"}
          onClick={() => !isLast && navigate(currentPath)}
          sx={{ cursor: isLast ? 'default' : 'pointer' }}
        >
          {name}
        </Link>
      );
    }
    
    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ display: { xs: 'none', md: 'flex' } }}
      >
        {breadcrumbs}
      </Breadcrumbs>
    );
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Left section: Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '25%' }}>
          {generateBreadcrumbs()}
        </Box>
        
        {/* Center section: Search */}
        <Box sx={{ width: '50%', display: 'flex', justifyContent: 'center' }}>
          <GlobalSearch />
        </Box>
        
        {/* Right section: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '25%' }}>
        
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            size="large"
            color="inherit"
            onClick={handleNotificationMenu}
          >
            <Badge badgeContent={unreadNotifications} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu
          id="notification-menu"
          anchorEl={notificationAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationClose}
        >
          <MenuItem onClick={handleNotificationSettings}>
            <NotificationsActiveIcon sx={{ mr: 1 }} />
            Notification Settings
          </MenuItem>
          <Divider />
          {notifications.length === 0 ? (
            <MenuItem onClick={handleNotificationClose}>No notifications</MenuItem>
          ) : (
            notifications.map((notification) => (
              <MenuItem key={notification.id} onClick={handleNotificationClose}>
                {notification.message}
              </MenuItem>
            ))
          )}
        </Menu>
        
        {/* Help */}
        <Tooltip title="Help">
          <IconButton size="large" color="inherit">
            <HelpIcon />
          </IconButton>
        </Tooltip>
        
        {/* Settings */}
        <Tooltip title="Settings">
          <IconButton size="large" color="inherit">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        
        {/* User menu */}
        <Tooltip title="Account">
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            {user?.name ? (
              <Avatar sx={{ width: 32, height: 32 }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircleIcon />
            )}
          </IconButton>
        </Tooltip>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>Profile</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
        </Box>
      </Toolbar>

      {/* Notification Settings Dialog */}
      <NotificationPermissionDialog
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
    </Box>
  );
};

export default Header;