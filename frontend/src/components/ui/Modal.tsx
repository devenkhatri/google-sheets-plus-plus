import React, { useEffect, useRef, useId } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Slide,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import { FocusManager, getDialogAccessibility } from '../../utils/accessibility';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  description?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  description,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  
  const effectiveLabelledBy = ariaLabelledBy || (title ? titleId : undefined);
  const effectiveDescribedBy = ariaDescribedBy || (description ? descriptionId : undefined);

  useEffect(() => {
    if (open && dialogRef.current) {
      // Trap focus within the modal
      const cleanup = FocusManager.trapFocus(dialogRef.current);
      
      // Announce modal opening
      FocusManager.announce(
        title ? `${title} dialog opened` : 'Dialog opened',
        'assertive'
      );
      
      return cleanup;
    }
  }, [open, title]);

  const handleClose = (event: {}, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && disableBackdropClick) return;
    if (reason === 'escapeKeyDown' && disableEscapeKeyDown) return;
    
    // Announce modal closing
    FocusManager.announce('Dialog closed');
    onClose();
  };

  const accessibilityProps = getDialogAccessibility(
    title || 'Dialog',
    {
      describedBy: effectiveDescribedBy,
      modal: true,
    }
  );

  return (
    <Dialog
      {...accessibilityProps}
      ref={dialogRef}
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isMobile}
      TransitionComponent={Transition}
      aria-labelledby={effectiveLabelledBy}
      aria-describedby={effectiveDescribedBy}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: isMobile ? 0 : theme.spacing(2),
        },
      }}
    >
      {title && (
        <DialogTitle
          id={titleId}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <IconButton
            aria-label={`Close ${title || 'dialog'}`}
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent dividers={!!title}>
        {description && (
          <Typography id={descriptionId} variant="body2" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {children}
      </DialogContent>
      {actions && (
        <DialogActions sx={{ p: 2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default Modal;