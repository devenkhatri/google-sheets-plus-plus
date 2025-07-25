import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCollaborators,
  shareBase,
  updateCollaborator,
  removeCollaborator,
} from '../../store/slices/baseSlice';
import { Collaborator } from '../../services/baseService';

interface ShareBaseDialogProps {
  open: boolean;
  onClose: () => void;
  baseId: string;
}

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  permissionLevel: Yup.string().required('Permission level is required'),
});

const ShareBaseDialog: React.FC<ShareBaseDialogProps> = ({ open, onClose, baseId }) => {
  const dispatch = useAppDispatch();
  const { collaborators, loading, error } = useAppSelector((state) => state.bases);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  useEffect(() => {
    if (open && baseId) {
      dispatch(fetchCollaborators(baseId));
    }
  }, [dispatch, open, baseId]);

  const formik = useFormik({
    initialValues: {
      email: '',
      permissionLevel: 'viewer',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      await dispatch(
        shareBase({
          baseId,
          data: {
            email: values.email,
            permissionLevel: values.permissionLevel,
          },
        })
      );
      resetForm();
    },
  });

  const handlePermissionChange = async (collaboratorId: string, permissionLevel: string) => {
    await dispatch(
      updateCollaborator({
        baseId,
        collaboratorId,
        data: {
          permissionLevel,
        },
      })
    );
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (window.confirm('Are you sure you want to remove this collaborator?')) {
      await dispatch(
        removeCollaborator({
          baseId,
          collaboratorId,
        })
      );
    }
  };

  const getPermissionColor = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'viewer':
        return 'info.main';
      case 'commenter':
        return 'success.main';
      case 'editor':
        return 'warning.main';
      case 'owner':
        return 'error.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Share Base</DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          Invite People
        </Typography>
        <form onSubmit={formik.handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              disabled={loading}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel id="permission-level-label">Permission</InputLabel>
              <Select
                labelId="permission-level-label"
                id="permissionLevel"
                name="permissionLevel"
                value={formik.values.permissionLevel}
                onChange={formik.handleChange}
                label="Permission"
                disabled={loading}
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="commenter">Commenter</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              startIcon={<PersonAddIcon />}
              disabled={loading || !formik.isValid}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Invite'}
            </Button>
          </Box>
        </form>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Collaborators
        </Typography>

        {loading && !collaborators.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : collaborators.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 4 }}>
            No collaborators yet. Invite people to collaborate on this base.
          </Typography>
        ) : (
          <List>
            {collaborators.map((collaborator) => (
              <ListItem key={collaborator.id} divider>
                <ListItemAvatar>
                  <Avatar src={collaborator.avatar_url}>
                    {collaborator.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={collaborator.name}
                  secondary={collaborator.email}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: getPermissionColor(collaborator.permission_level) }}
                  >
                    {collaborator.permission_level.charAt(0).toUpperCase() +
                      collaborator.permission_level.slice(1)}
                  </Typography>
                  {collaborator.permission_level !== 'owner' && (
                    <>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={collaborator.permission_level}
                          onChange={(e) =>
                            handlePermissionChange(collaborator.id, e.target.value as string)
                          }
                          size="small"
                          disabled={loading}
                        >
                          <MenuItem value="viewer">Viewer</MenuItem>
                          <MenuItem value="commenter">Commenter</MenuItem>
                          <MenuItem value="editor">Editor</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        disabled={loading}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareBaseDialog;