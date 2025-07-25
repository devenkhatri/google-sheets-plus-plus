import React, { useState } from 'react';
import { 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  Divider,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ViewColumn as ViewColumnIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface Field {
  id: string;
  name: string;
  type: string;
}

interface KanbanToolbarProps {
  tableId: string;
  viewId: string;
  fields: Field[];
  groupByField: string;
  displayFields: string[];
  onRefresh: () => void;
  onGroupByChange: (fieldId: string) => void;
  onDisplayFieldsChange: (fieldIds: string[]) => void;
  onAddRecord: () => void;
}

const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  fields,
  groupByField,
  displayFields,
  onRefresh,
  onGroupByChange,
  onDisplayFieldsChange,
  onAddRecord
}) => {
  // State for menus
  const [fieldMenuAnchor, setFieldMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get single select fields for grouping
  const singleSelectFields = fields.filter(field => field.type === 'singleSelect');

  // Handle group by field change
  const handleGroupByChange = (event: SelectChangeEvent) => {
    onGroupByChange(event.target.value);
  };

  // Handle display field toggle
  const handleDisplayFieldToggle = (fieldId: string) => {
    if (displayFields.includes(fieldId)) {
      onDisplayFieldsChange(displayFields.filter(id => id !== fieldId));
    } else {
      onDisplayFieldsChange([...displayFields, fieldId]);
    }
  };

  return (
    <Toolbar
      sx={{
        px: { sm: 2 },
        py: 1,
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* Left section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={onRefresh} size="small" sx={{ mr: 1 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          
          <FormControl size="small" sx={{ minWidth: 180, mr: 2 }}>
            <InputLabel id="group-by-label">Group by</InputLabel>
            <Select
              labelId="group-by-label"
              value={groupByField}
              label="Group by"
              onChange={handleGroupByChange}
            >
              {singleSelectFields.map((field) => (
                <MenuItem key={field.id} value={field.id}>
                  {field.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            size="small"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 200 }}
          />
        </Box>
        
        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Right section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            size="small" 
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{ mr: 1 }}
          >
            <FilterIcon fontSize="small" />
          </IconButton>
          
          <IconButton 
            size="small" 
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ mr: 1 }}
          >
            <SortIcon fontSize="small" />
          </IconButton>
          
          <IconButton 
            size="small" 
            onClick={(e) => setFieldMenuAnchor(e.currentTarget)}
            sx={{ mr: 1 }}
          >
            <ViewColumnIcon fontSize="small" />
          </IconButton>
          
          <IconButton size="small" sx={{ mr: 2 }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
          
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<AddIcon />}
            onClick={onAddRecord}
          >
            Add record
          </Button>
        </Box>
      </Box>
      
      {/* Field visibility menu */}
      <Menu
        anchorEl={fieldMenuAnchor}
        open={Boolean(fieldMenuAnchor)}
        onClose={() => setFieldMenuAnchor(null)}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Card fields
        </Typography>
        <Divider />
        {fields.map((field) => (
          <MenuItem 
            key={field.id}
            onClick={() => handleDisplayFieldToggle(field.id)}
            sx={{ 
              backgroundColor: displayFields.includes(field.id) 
                ? 'action.selected' 
                : 'transparent' 
            }}
          >
            <Typography variant="body2">
              {field.name}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
      
      {/* Filter menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Filter records
        </Typography>
        <Divider />
        <MenuItem>
          <Typography variant="body2">Add filter</Typography>
        </MenuItem>
      </Menu>
      
      {/* Sort menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Sort records
        </Typography>
        <Divider />
        <MenuItem>
          <Typography variant="body2">Add sort</Typography>
        </MenuItem>
      </Menu>
    </Toolbar>
  );
};

export default KanbanToolbar;