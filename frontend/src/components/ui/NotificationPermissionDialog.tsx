import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { pushNotificationService } from '../../services/pushNotificationService';
import { useAppDispatch } from '../../store/hooks';
import { addNotification } from '../../store/slices/uiSlice';

interface NotificationPermissionDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
  open,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      checkNotificationStatus();
    }
  }, [open]);

  const checkNotificationStatus = () => {
    setIsSupported(pushNotificationService.isSupported());
    setHasPermission(pushNotificationService.hasPermission());
    setIsSubscribed(pushNotificationService.isSubscribed());
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const subscription = await pushNotificationService.subscribe();
      if (subscription) {
        setHasPermission(true);
        setIsSubscribed(true);
        dispatch(addNotification({
          type: 'success',
          message: 'Push notifications enabled successfully!'
        }));
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to enable push notifications'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribe();
      if (success) {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to disable push notifications'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.showTestNotification();
      dispatch(addNotification({
        type: 'success',
        message: 'Test notification sent!'
      }));
    } catch (error) {
      console.error('Error sending test notification:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to send test notification'
      }));
    }
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationsOffIcon />
            Push Notifications Not Supported
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Push notifications are not supported in your current browser. 
            Please use a modern browser like Chrome, Firefox, or Safari to enable this feature.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <NotificationsIcon />
          Push Notification Settings
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body1" gutterBottom>
            Stay updated with real-time notifications about your bases, comments, and collaborations.
          </Typography>
        </Box>

        <Box mb={3}>
          <FormControlLabel
            control={
              <Switch
                checked={hasPermission && isSubscribed}
                onChange={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
                disabled={isLoading}
              />
            }
            label="Enable Push Notifications"
          />
        </Box>

        {hasPermission && isSubscribed && (
          <Box mb={2}>
            <Button
              variant="outlined"
              onClick={handleTestNotification}
              startIcon={<InfoIcon />}
              size="small"
            >
              Send Test Notification
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          You'll receive notifications for:
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <CommentIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Comments and Mentions"
              secondary="When someone comments on your records or mentions you"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ShareIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Base Sharing"
              secondary="When someone shares a base with you or changes your permissions"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Important Updates"
              secondary="System notifications and security alerts"
            />
          </ListItem>
        </List>

        {!hasPermission && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              You'll need to grant notification permission in your browser to receive push notifications.
            </Typography>
          </Alert>
        )}

        {hasPermission && !isSubscribed && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Notifications are permitted but not active. Enable them above to start receiving updates.
            </Typography>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};