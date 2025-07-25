import React, { forwardRef } from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FocusManager } from '../../utils/accessibility';

interface ButtonProps extends Omit<MuiButtonProps, 'size'> {
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loadingText?: string;
  'aria-describedby'?: string;
}

const StyledButton = styled(MuiButton)<ButtonProps>(({ theme, size = 'medium' }) => ({
  textTransform: 'none',
  fontWeight: 500,
  borderRadius: theme.spacing(1),
  position: 'relative',
  ...(size === 'small' && {
    padding: theme.spacing(0.5, 1.5),
    fontSize: '0.875rem',
  }),
  ...(size === 'medium' && {
    padding: theme.spacing(1, 2),
    fontSize: '0.875rem',
  }),
  ...(size === 'large' && {
    padding: theme.spacing(1.5, 3),
    fontSize: '1rem',
  }),
}));

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  loading = false, 
  disabled, 
  size = 'medium',
  loadingText = 'Loading...',
  onClick,
  'aria-describedby': ariaDescribedBy,
  ...props 
}, ref) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    
    // Announce action to screen readers
    if (typeof children === 'string') {
      FocusManager.announce(`${children} activated`);
    }
    
    onClick?.(event);
  };

  const accessibilityProps = {
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    'aria-describedby': ariaDescribedBy,
    'aria-label': loading ? loadingText : undefined,
  };

  return (
    <StyledButton
      {...props}
      {...accessibilityProps}
      ref={ref}
      size={size}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading && (
        <CircularProgress
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: size === 'small' ? '-8px' : size === 'large' ? '-12px' : '-10px',
            marginTop: size === 'small' ? '-8px' : size === 'large' ? '-12px' : '-10px',
          }}
          aria-hidden="true"
        />
      )}
      <span style={{ visibility: loading ? 'hidden' : 'visible' }}>
        {children}
      </span>
      {loading && (
        <span className="sr-only" aria-live="polite">
          {loadingText}
        </span>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;