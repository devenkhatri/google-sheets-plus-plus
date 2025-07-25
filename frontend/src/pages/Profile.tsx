import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateProfile } from '../store/slices/authSlice';
import { authService } from '../services/authService';

// Profile validation schema
const profileValidationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  avatar_url: Yup.string()
    .url('Must be a valid URL')
    .nullable(),
});

// Password validation schema
const passwordValidationSchema = Yup.object({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm password is required'),
});

// API key validation schema
const apiKeyValidationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(1, 'Name is required'),
  description: Yup.string(),
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Profile = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [apiKeySuccess, setApiKeySuccess] = useState<string | null>(null);
  const [openApiKeyDialog, setOpenApiKeyDialog] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<string | null>(null);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Load API keys when switching to API keys tab
    if (newValue === 2 && apiKeys.length === 0) {
      loadApiKeys();
    }
  };
  
  // Load API keys
  const loadApiKeys = async () => {
    try {
      setApiKeysLoading(true);
      const keys = await authService.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      setApiKeyError('Failed to load API keys');
    } finally {
      setApiKeysLoading(false);
    }
  };
  
  // Profile form
  const profileFormik = useFormik({
    initialValues: {
      name: user?.name || '',
      avatar_url: user?.avatar_url || '',
    },
    validationSchema: profileValidationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await dispatch(updateProfile(values));
    },
  });
  
  // Password form
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: passwordValidationSchema,
    onSubmit: async (values) => {
      try {
        setPasswordError(null);
        await authService.changePassword(values.currentPassword, values.newPassword);
        setPasswordSuccess('Password changed successfully');
        passwordFormik.resetForm();
      } catch (error: any) {
        setPasswordError(error.response?.data?.message || 'Failed to change password');
      }
    },
  });
  
  // API key form
  const apiKeyFormik = useFormik({
    initialValues: {
      name: '',
      description: '',
    },
    validationSchema: apiKeyValidationSchema,
    onSubmit: async (values) => {
      try {
        setApiKeyError(null);
        await authService.generateApiKey(values.name, values.description);
        setApiKeySuccess('API key generated successfully');
        apiKeyFormik.resetForm();
        setOpenApiKeyDialog(false);
        loadApiKeys();
      } catch (error: any) {
        setApiKeyError(error.response?.data?.message || 'Failed to generate API key');
      }
    },
  });
  
  // Handle API key revocation
  const handleRevokeApiKey = async (keyId: string) => {
    try {
      setApiKeyError(null);
      await authService.revokeApiKey(keyId);
      setApiKeySuccess('API key revoked successfully');
      loadApiKeys();
    } catch (error: any) {
      setApiKeyError(error.response?.data?.message || 'Failed to revoke API key');
    }
  };
  
  // Handle API key deletion
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      setApiKeyError(null);
      await authService.deleteApiKey(keyId);
      setApiKeySuccess('API key deleted successfully');
      loadApiKeys();
      setSelectedApiKey(null);
    } catch (error: any) {
      setApiKeyError(error.response?.data?.message || 'Failed to delete API key');
    }
  };
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your account settings and preferences
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Profile" />
          <Tab label="Password" />
          <Tab label="API Keys" />
        </Tabs>
        
        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={profileFormik.handleSubmit} sx={{ p: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  src={profileFormik.values.avatar_url || undefined}
                  alt={user?.name}
                  sx={{ width: 120, height: 120, mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" align="center">
                  Profile Picture
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Full Name"
                  variant="outlined"
                  margin="normal"
                  value={profileFormik.values.name}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  error={profileFormik.touched.name && Boolean(profileFormik.errors.name)}
                  helperText={profileFormik.touched.name && profileFormik.errors.name}
                  disabled={loading}
                />
                
                <TextField
                  fullWidth
                  id="avatar_url"
                  name="avatar_url"
                  label="Avatar URL"
                  variant="outlined"
                  margin="normal"
                  value={profileFormik.values.avatar_url}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  error={profileFormik.touched.avatar_url && Boolean(profileFormik.errors.avatar_url)}
                  helperText={profileFormik.touched.avatar_url && profileFormik.errors.avatar_url}
                  disabled={loading}
                />
                
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  variant="outlined"
                  margin="normal"
                  value={user?.email || ''}
                  disabled
                  helperText="Email cannot be changed"
                />
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Password Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={passwordFormik.handleSubmit} sx={{ p: 2 }}>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPasswordSuccess(null)}>
                {passwordSuccess}
              </Alert>
            )}
            
            <TextField
              fullWidth
              id="currentPassword"
              name="currentPassword"
              label="Current Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={passwordFormik.values.currentPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
              helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
            />
            
            <TextField
              fullWidth
              id="newPassword"
              name="newPassword"
              label="New Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={passwordFormik.values.newPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
              helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
            />
            
            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={passwordFormik.values.confirmPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
              helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={passwordFormik.isSubmitting}
              >
                {passwordFormik.isSubmitting ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </Box>
          </Box>
        </TabPanel>
        
        {/* API Keys Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            {apiKeyError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiKeyError(null)}>
                {apiKeyError}
              </Alert>
            )}
            
            {apiKeySuccess && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setApiKeySuccess(null)}>
                {apiKeySuccess}
              </Alert>
            )}
            
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">API Keys</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenApiKeyDialog(true)}
              >
                Generate New API Key
              </Button>
            </Box>
            
            {apiKeysLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : apiKeys.length === 0 ? (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ my: 4 }}>
                No API keys found. Generate a new API key to get started.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {apiKeys.map((apiKey) => (
                  <Grid item xs={12} key={apiKey.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="h6">{apiKey.name}</Typography>
                            {apiKey.description && (
                              <Typography variant="body2" color="text.secondary">
                                {apiKey.description}
                              </Typography>
                            )}
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Created: {new Date(apiKey.created_at).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Last used: {apiKey.last_used ? new Date(apiKey.last_used).toLocaleDateString() : 'Never'}
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton
                              color="primary"
                              onClick={() => handleRevokeApiKey(apiKey.id)}
                              disabled={!apiKey.active}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => setSelectedApiKey(apiKey.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                            {apiKey.key}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="caption"
                            color={apiKey.active ? 'success.main' : 'error.main'}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {apiKey.active ? 'ACTIVE' : 'REVOKED'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Paper>
      
      {/* API Key Dialog */}
      <Dialog open={openApiKeyDialog} onClose={() => setOpenApiKeyDialog(false)}>
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={apiKeyFormik.handleSubmit} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              id="name"
              name="name"
              label="API Key Name"
              variant="outlined"
              margin="normal"
              value={apiKeyFormik.values.name}
              onChange={apiKeyFormik.handleChange}
              onBlur={apiKeyFormik.handleBlur}
              error={apiKeyFormik.touched.name && Boolean(apiKeyFormik.errors.name)}
              helperText={apiKeyFormik.touched.name && apiKeyFormik.errors.name}
            />
            
            <TextField
              fullWidth
              id="description"
              name="description"
              label="Description (Optional)"
              variant="outlined"
              margin="normal"
              value={apiKeyFormik.values.description}
              onChange={apiKeyFormik.handleChange}
              onBlur={apiKeyFormik.handleBlur}
              error={apiKeyFormik.touched.description && Boolean(apiKeyFormik.errors.description)}
              helperText={apiKeyFormik.touched.description && apiKeyFormik.errors.description}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApiKeyDialog(false)}>Cancel</Button>
          <Button
            onClick={() => apiKeyFormik.handleSubmit()}
            variant="contained"
            disabled={apiKeyFormik.isSubmitting}
          >
            {apiKeyFormik.isSubmitting ? <CircularProgress size={24} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete API Key Dialog */}
      <Dialog open={!!selectedApiKey} onClose={() => setSelectedApiKey(null)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this API key? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedApiKey(null)}>Cancel</Button>
          <Button
            onClick={() => selectedApiKey && handleDeleteApiKey(selectedApiKey)}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;