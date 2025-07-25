import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Skeleton,
  Chip,
  styled,
} from '@mui/material';
import { format } from 'date-fns';

interface GalleryCardProps {
  record: any;
  fields: any[];
  imageField: string;
  titleField: string;
  displayFields: string[];
  onClick: () => void;
}

// Styled component for image with lazy loading
const LazyImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.3s ease-in-out',
});

const GalleryCard: React.FC<GalleryCardProps> = ({
  record,
  fields,
  imageField,
  titleField,
  displayFields,
  onClick,
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // Get image URL from attachment field
  const getImageUrl = () => {
    const attachments = record.fields[imageField];
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return null;
    }
    
    // Use thumbnail if available, otherwise use full URL
    return attachments[0].thumbnailUrl || attachments[0].url;
  };
  
  // Get title from title field
  const getTitle = () => {
    const value = record.fields[titleField];
    if (value === undefined || value === null) {
      return 'Untitled';
    }
    return String(value);
  };
  
  // Format field value based on field type
  const formatFieldValue = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return 'Unknown field';
    
    const value = record.fields[fieldId];
    if (value === undefined || value === null) return '';
    
    switch (field.type) {
      case 'date':
        try {
          return format(new Date(value), 'MMM d, yyyy');
        } catch (e) {
          return value;
        }
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'singleSelect':
        return value;
      case 'multiSelect':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;
      case 'attachment':
        if (Array.isArray(value)) {
          return `${value.length} file(s)`;
        }
        return 'No files';
      default:
        return String(value);
    }
  };
  
  // Get field name by ID
  const getFieldName = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.name : 'Unknown Field';
  };
  
  const imageUrl = getImageUrl();
  const title = getTitle();
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Consider it "loaded" to remove skeleton
  };
  
  return (
    <Card 
      elevation={1} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Image section */}
        <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
          {!imageLoaded && (
            <Skeleton 
              variant="rectangular" 
              animation="wave"
              sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }} 
            />
          )}
          
          {imageUrl && !imageError ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <LazyImage
                src={imageUrl}
                alt={title}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                sx={{
                  opacity: imageLoaded ? 1 : 0,
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.disabledBackground',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">No image</Typography>
            </Box>
          )}
        </Box>
        
        {/* Content section */}
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="div" noWrap sx={{ mb: 1 }}>
            {title}
          </Typography>
          
          <Box sx={{ mt: 1 }}>
            {displayFields
              .filter(fieldId => fieldId !== titleField) // Don't repeat the title
              .map(fieldId => (
                <Box key={fieldId} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {getFieldName(fieldId)}
                  </Typography>
                  <Typography variant="body2" component="div">
                    {formatFieldValue(fieldId)}
                  </Typography>
                </Box>
              ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default GalleryCard;