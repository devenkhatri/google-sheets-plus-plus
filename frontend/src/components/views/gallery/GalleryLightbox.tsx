import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Slide,
  Fade,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';
import { TransitionProps } from '@mui/material/transitions';

interface GalleryLightboxProps {
  open: boolean;
  onClose: () => void;
  images: Array<{
    recordId: string;
    url: string;
    thumbnailUrl?: string;
    filename?: string;
  }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  open,
  onClose,
  images,
  currentIndex,
  onNavigate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Reset loading state when image changes
  useEffect(() => {
    if (open) {
      setLoading(true);
      setImageError(false);
    }
  }, [currentIndex, open]);
  
  const handlePrevious = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      // Loop to the end
      onNavigate(images.length - 1);
    }
  };
  
  const handleNext = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      // Loop to the beginning
      onNavigate(0);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious(event as unknown as React.MouseEvent);
    } else if (event.key === 'ArrowRight') {
      handleNext(event as unknown as React.MouseEvent);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };
  
  const handleImageLoad = () => {
    setLoading(false);
  };
  
  const handleImageError = () => {
    setLoading(false);
    setImageError(true);
  };
  
  const handleDownload = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (images[currentIndex]) {
      const link = document.createElement('a');
      link.href = images[currentIndex].url;
      link.download = images[currentIndex].filename || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // If no images or invalid index, don't render
  if (!open || images.length === 0 || currentIndex < 0 || currentIndex >= images.length) {
    return null;
  }
  
  const currentImage = images[currentIndex];
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="xl"
      TransitionComponent={Transition}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: 'background.default',
          m: isMobile ? 0 : 2,
          width: '100%',
          height: isMobile ? '100%' : 'calc(100% - 64px)',
          maxWidth: 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 1,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="subtitle1" color="white" sx={{ p: 1 }}>
          {currentImage.filename || `Image ${currentIndex + 1} of ${images.length}`}
        </Typography>
        <Box>
          <IconButton color="inherit" onClick={handleDownload} size="large">
            <DownloadIcon sx={{ color: 'white' }} />
          </IconButton>
          <IconButton color="inherit" onClick={onClose} size="large">
            <CloseIcon sx={{ color: 'white' }} />
          </IconButton>
        </Box>
      </Box>
      
      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: theme.spacing(2),
                zIndex: 1,
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                },
              }}
              size="large"
            >
              <ArrowBackIcon />
            </IconButton>
            
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: theme.spacing(2),
                zIndex: 1,
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                },
              }}
              size="large"
            >
              <ArrowForwardIcon />
            </IconButton>
          </>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 0,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        {/* Error message */}
        {imageError && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <Typography variant="h6" color="error" gutterBottom>
              Failed to load image
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The image could not be loaded. It may be unavailable or the URL might be invalid.
            </Typography>
          </Box>
        )}
        
        {/* Image */}
        <Fade in={!loading && !imageError}>
          <Box
            component="img"
            src={currentImage.url}
            alt={currentImage.filename || 'Image'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: loading || imageError ? 'none' : 'block',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Fade>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryLightbox;