import React, { useState } from 'react';
import {
  Box,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ImageIcon from '@mui/icons-material/Image';
import TitleIcon from '@mui/icons-material/Title';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloseIcon from '@mui/icons-material/Close';

interface GalleryToolbarProps {
  tableId: string;
  viewId: string;
  fields: any[];
  attachmentFields: any[];
  imageField: string;
  titleField: string;
  displayFields: string[];
  cardSize: 'small' | 'medium' | 'large';
  searchTerm: string;
  onRefresh: () => void;
  onImageFieldChange: (fieldId: string) => void;
  onTitleFieldChange: (fieldId: string) => void;
  onDisplayFieldsChange: (fieldIds: string[]) => void;
  onCardSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onSearch: (term: string) => void;
}

const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  tableId,
  viewId,
  fields,
  attachmentFields,
  imageField,
  titleField,
  displayFields,
  cardSize,
  searchTerm,
  onRefresh,
  onImageFieldChange,
  onTitleFieldChange,
  onDisplayFieldsChange,
  onCardSizeChange,
  onSearch,
}) => {
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [sizeAnchorEl, setSizeAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };
  
  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };
  
  const handleSizeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSizeAnchorEl(event.currentTarget);
  };
  
  const handleSizeClose = () => {
    setSizeAnchorEl(null);
  };
  
  const handleSizeSelect = (size: 'small' | 'medium' | 'large') => {
    onCardSizeChange(size);
    handleSizeClose();
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };
  
  const handleClearSearch = () => {
    onSearch('');
  };
  
  const handleDisplayFieldsChange = (event: any) => {
    const value = event.target.value;
    onDisplayFieldsChange(value);
  };
  
  // Get field name by ID
  const getFieldName = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.name : 'Unknown Field';
  };
  
  return (
    <Toolbar
      sx={{
        px: { sm: 2 },
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {/* Left section */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        <Typography variant="h6" component="div" sx={{ mr: 2 }}>
          Gallery View
        </Typography>
        
        <TextField
          placeholder="Search records..."
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: { xs: '100%', sm: 250 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                  aria-label="clear search"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>
      
      {/* Right section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Card size selector */}
        <Tooltip title="Card size">
          <IconButton onClick={handleSizeClick} size="small">
            <ViewModuleIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={sizeAnchorEl}
          open={Boolean(sizeAnchorEl)}
          onClose={handleSizeClose}
        >
          <MenuItem onClick={() => handleSizeSelect('small')}>
            <ListItemIcon>
              <ViewCompactIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Small</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleSizeSelect('medium')}>
            <ListItemIcon>
              <ViewModuleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Medium</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleSizeSelect('large')}>
            <ListItemIcon>
              <ViewComfyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Large</ListItemText>
          </MenuItem>
        </Menu>
        
        {/* Settings menu */}
        <Tooltip title="Gallery settings">
          <IconButton onClick={handleSettingsClick} size="small">
            <TuneIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={settingsAnchorEl}
          open={Boolean(settingsAnchorEl)}
          onClose={handleSettingsClose}
          PaperProps={{
            sx: { width: 320, maxHeight: '80vh' },
          }}
        >
          {/* Image field selector */}
          <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <ImageIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Image Field
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={imageField}
                onChange={(e) => onImageFieldChange(e.target.value)}
                displayEmpty
                fullWidth
              >
                {attachmentFields.length === 0 ? (
                  <MenuItem disabled>No attachment fields available</MenuItem>
                ) : (
                  attachmentFields.map((field) => (
                    <MenuItem key={field.id} value={field.id}>
                      {field.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </MenuItem>
          
          <Divider />
          
          {/* Title field selector */}
          <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <TitleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Title Field
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={titleField}
                onChange={(e) => onTitleFieldChange(e.target.value)}
                displayEmpty
                fullWidth
              >
                {fields.map((field) => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MenuItem>
          
          <Divider />
          
          {/* Display fields selector */}
          <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <ViewListIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Display Fields
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={displayFields}
                onChange={handleDisplayFieldsChange}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={getFieldName(value)} size="small" />
                    ))}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                    },
                  },
                }}
              >
                {fields.map((field) => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MenuItem>
        </Menu>
        
        {/* Refresh button */}
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Toolbar>
  );
};

export default GalleryToolbar;