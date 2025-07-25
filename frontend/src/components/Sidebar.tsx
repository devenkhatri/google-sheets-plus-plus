import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Button, Box, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddIcon from '@mui/icons-material/Add';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchBases } from '../store/slices/baseSlice';

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { bases } = useAppSelector((state) => state.bases);
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  
  useEffect(() => {
    dispatch(fetchBases());
  }, [dispatch]);
  
  return (
    <>
      <List>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              justifyContent: sidebarOpen ? 'initial' : 'center',
              px: 2.5,
            }}
            selected={location.pathname === '/'}
            onClick={() => navigate('/')}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: sidebarOpen ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" sx={{ opacity: sidebarOpen ? 1 : 0 }} />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <Box sx={{ p: sidebarOpen ? 2 : 1 }}>
        {sidebarOpen && <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Bases</Typography>}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          fullWidth={sidebarOpen}
          size="small"
          sx={{ mb: 1 }}
        >
          {sidebarOpen ? 'New Base' : <AddIcon />}
        </Button>
      </Box>
      <List>
        {bases.map((base) => (
          <ListItem key={base.id} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              sx={{
                minHeight: 48,
                justifyContent: sidebarOpen ? 'initial' : 'center',
                px: 2.5,
              }}
              selected={location.pathname === `/bases/${base.id}`}
              onClick={() => navigate(`/bases/${base.id}`)}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                <TableChartIcon />
              </ListItemIcon>
              <ListItemText primary={base.name} sx={{ opacity: sidebarOpen ? 1 : 0 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
};

export default Sidebar;