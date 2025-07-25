import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Box,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchBases } from '../store/slices/baseSlice';

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bases, loading } = useAppSelector((state) => state.bases);
  
  useEffect(() => {
    dispatch(fetchBases());
  }, [dispatch]);
  
  const handleBaseClick = (baseId: string) => {
    navigate(`/bases/${baseId}`);
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your Airtable Clone. Create or select a base to get started.
        </Typography>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create New Base
        </Button>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {bases.map((base) => (
            <Grid item xs={12} sm={6} md={4} key={base.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {base.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {base.description || 'No description'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleBaseClick(base.id)}>
                    Open
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {bases.length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No bases found. Create your first base to get started.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;