import React from 'react';
import { Tooltip, Avatar, Box, Badge, styled } from '@mui/material';
import { UserPresence } from '../types/collaboration';

interface UserPresenceIndicatorProps {
  users: UserPresence[];
  maxDisplayed?: number;
  size?: 'small' | 'medium' | 'large';
}

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  users,
  maxDisplayed = 3,
  size = 'medium',
}) => {
  const avatarSize = {
    small: 24,
    medium: 32,
    large: 40,
  }[size];

  const displayedUsers = users.slice(0, maxDisplayed);
  const remainingCount = Math.max(0, users.length - maxDisplayed);

  return (
    <Box display="flex" alignItems="center">
      {displayedUsers.map((user) => (
        <Box key={user.userId} sx={{ marginRight: -0.5 }}>
          <Tooltip
            title={`${user.userName} (${
              new Date().getTime() - new Date(user.lastSeen).getTime() < 60000
                ? 'Active now'
                : `Last seen ${new Date(user.lastSeen).toLocaleTimeString()}`
            })`}
          >
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
            >
              <Avatar
                alt={user.userName}
                src={user.avatarUrl}
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  border: `2px solid ${user.color || '#ffffff'}`,
                }}
              >
                {user.userName.charAt(0).toUpperCase()}
              </Avatar>
            </StyledBadge>
          </Tooltip>
        </Box>
      ))}

      {remainingCount > 0 && (
        <Tooltip title={`${remainingCount} more users`}>
          <Avatar
            sx={{
              width: avatarSize,
              height: avatarSize,
              fontSize: avatarSize * 0.5,
              bgcolor: 'primary.main',
            }}
          >
            +{remainingCount}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
};

export default UserPresenceIndicator;