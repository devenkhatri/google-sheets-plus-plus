import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  CircularProgress,
  Chip,
  Tooltip,
  ClickAwayListener,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import TuneIcon from '@mui/icons-material/Tune';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  performSearch, 
  clearSearchResults, 
  createSavedSearch, 
  fetchSavedSearches,
  removeSavedSearch
} from '../store/slices/searchSlice';
import { SearchResult, SavedSearch } from '../services/searchService';

const GlobalSearch: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { 
    results, 
    loading, 
    total, 
    recentSearches, 
    savedSearches 
  } = useAppSelector((state) => state.search);
  const { bases } = useAppSelector((state) => state.bases);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Load saved searches on component mount
  useEffect(() => {
    dispatch(fetchSavedSearches());
  }, [dispatch]);
  
  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (query.trim().length > 2) {
      setAnchorEl(e.currentTarget);
      searchTimeout.current = setTimeout(() => {
        dispatch(performSearch({ 
          query,
          baseId: selectedBaseId || undefined,
          tableId: selectedTableId || undefined,
          fieldIds: selectedFieldIds.length > 0 ? selectedFieldIds : undefined
        }));
      }, 300);
    } else {
      setAnchorEl(null);
      dispatch(clearSearchResults());
    }
  };
  
  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      dispatch(performSearch({ 
        query: searchQuery,
        baseId: selectedBaseId || undefined,
        tableId: selectedTableId || undefined,
        fieldIds: selectedFieldIds.length > 0 ? selectedFieldIds : undefined
      }));
    }
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setAnchorEl(null);
    dispatch(clearSearchResults());
  };
  
  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setAnchorEl(null);
    
    // Navigate based on result type
    switch (result.type) {
      case 'base':
        navigate(`/bases/${result.baseId}`);
        break;
      case 'table':
        navigate(`/bases/${result.baseId}/tables/${result.tableId}`);
        break;
      case 'record':
        navigate(`/bases/${result.baseId}/tables/${result.tableId}/records/${result.recordId}`);
        break;
      default:
        break;
    }
  };
  
  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    dispatch(performSearch({ 
      query,
      baseId: selectedBaseId || undefined,
      tableId: selectedTableId || undefined,
      fieldIds: selectedFieldIds.length > 0 ? selectedFieldIds : undefined
    }));
  };
  
  // Handle saved search click
  const handleSavedSearchClick = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    setSelectedBaseId(savedSearch.baseId || '');
    setSelectedTableId(savedSearch.tableId || '');
    setSelectedFieldIds(savedSearch.fieldIds || []);
    
    dispatch(performSearch({
      query: savedSearch.query,
      baseId: savedSearch.baseId,
      tableId: savedSearch.tableId,
      fieldIds: savedSearch.fieldIds,
      savedSearchId: savedSearch.id
    }));
  };
  
  // Handle save search
  const handleSaveSearch = () => {
    if (savedSearchName.trim()) {
      dispatch(createSavedSearch({
        name: savedSearchName,
        query: searchQuery,
        baseId: selectedBaseId || undefined,
        tableId: selectedTableId || undefined,
        fieldIds: selectedFieldIds,
        notificationsEnabled
      }));
      setShowSaveSearchDialog(false);
      setSavedSearchName('');
      setNotificationsEnabled(false);
    }
  };
  
  // Handle delete saved search
  const handleDeleteSavedSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeSavedSearch(id));
  };
  
  // Handle click away
  const handleClickAway = () => {
    setAnchorEl(null);
  };
  
  // Get available tables for selected base
  const availableTables = selectedBaseId
    ? bases.find(base => base.id === selectedBaseId)?.tables || []
    : [];
  
  // Get available fields for selected table
  const availableFields = selectedTableId
    ? availableTables.find(table => table.id === selectedTableId)?.fields || []
    : [];
  
  const open = Boolean(anchorEl);
  const id = open ? 'search-popper' : undefined;
  
  // Highlight matched text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };
  
  return (
    <>
      <Box sx={{ position: 'relative', width: { xs: '100%', sm: 300, md: 400 } }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            inputRef={searchInputRef}
            placeholder="Search across all bases..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : searchQuery ? (
                    <>
                      <Tooltip title="Advanced search">
                        <IconButton
                          size="small"
                          onClick={() => setShowAdvancedSearch(true)}
                        >
                          <TuneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        edge="end"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  ) : null}
                </InputAdornment>
              ),
            }}
          />
        </form>
        
        <ClickAwayListener onClickAway={handleClickAway}>
          <Popper
            id={id}
            open={open}
            anchorEl={anchorEl}
            placement="bottom-start"
            transition
            style={{ width: searchInputRef.current?.offsetWidth, zIndex: 1300 }}
          >
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={350}>
                <Paper elevation={3} sx={{ maxHeight: 500, overflow: 'auto' }}>
                  {/* Search filters */}
                  {(selectedBaseId || selectedTableId || selectedFieldIds.length > 0) && (
                    <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedBaseId && (
                        <Chip
                          size="small"
                          label={`Base: ${bases.find(b => b.id === selectedBaseId)?.name || 'Unknown'}`}
                          onDelete={() => setSelectedBaseId('')}
                        />
                      )}
                      {selectedTableId && (
                        <Chip
                          size="small"
                          label={`Table: ${availableTables.find(t => t.id === selectedTableId)?.name || 'Unknown'}`}
                          onDelete={() => setSelectedTableId('')}
                        />
                      )}
                      {selectedFieldIds.map(fieldId => (
                        <Chip
                          key={fieldId}
                          size="small"
                          label={`Field: ${availableFields.find(f => f.id === fieldId)?.name || 'Unknown'}`}
                          onDelete={() => setSelectedFieldIds(prev => prev.filter(id => id !== fieldId))}
                        />
                      ))}
                    </Box>
                  )}
                  
                  {/* Search results */}
                  {loading ? (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : results.length > 0 ? (
                    <>
                      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {total} results
                        </Typography>
                        <Tooltip title="Save this search">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSavedSearchName(searchQuery);
                              setShowSaveSearchDialog(true);
                            }}
                          >
                            <BookmarkBorderIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Divider />
                      <List dense>
                        {results.map((result) => (
                          <ListItem
                            key={result.id}
                            button
                            onClick={() => handleResultClick(result)}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {result.type === 'base' && <StorageIcon fontSize="small" />}
                              {result.type === 'table' && <TableChartIcon fontSize="small" />}
                              {result.type === 'record' && <DescriptionIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={highlightMatch(result.title, searchQuery)}
                              secondary={
                                <>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.primary"
                                  >
                                    {result.type === 'record' ? `${result.tableName} • ` : ''}
                                    {result.baseName}
                                  </Typography>
                                  {result.context && (
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      {highlightMatch(result.context, searchQuery)}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : searchQuery.length > 2 ? (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No results found for "{searchQuery}"
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {/* Saved searches */}
                      {savedSearches.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ p: 1 }}>
                            <BookmarkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Saved Searches
                          </Typography>
                          <List dense>
                            {savedSearches.slice(0, 5).map((savedSearch) => (
                              <ListItem
                                key={savedSearch.id}
                                button
                                onClick={() => handleSavedSearchClick(savedSearch)}
                              >
                                <ListItemText
                                  primary={savedSearch.name}
                                  secondary={savedSearch.query}
                                />
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleDeleteSavedSearch(savedSearch.id, e)}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </ListItem>
                            ))}
                          </List>
                          <Divider />
                        </>
                      )}
                      
                      {/* Recent searches */}
                      {recentSearches.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ p: 1 }}>
                            <HistoryIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Recent Searches
                          </Typography>
                          <List dense>
                            {recentSearches.slice(0, 5).map((query, index) => (
                              <ListItem
                                key={index}
                                button
                                onClick={() => handleRecentSearchClick(query)}
                              >
                                <ListItemText primary={query} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </>
                  )}
                </Paper>
              </Fade>
            )}
          </Popper>
        </ClickAwayListener>
      </Box>
      
      {/* Advanced Search Dialog */}
      <Dialog
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Advanced Search</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Base</InputLabel>
              <Select
                value={selectedBaseId}
                onChange={(e) => {
                  setSelectedBaseId(e.target.value);
                  setSelectedTableId('');
                  setSelectedFieldIds([]);
                }}
                label="Base"
              >
                <MenuItem value="">
                  <em>All Bases</em>
                </MenuItem>
                {bases.map((base) => (
                  <MenuItem key={base.id} value={base.id}>
                    {base.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth disabled={!selectedBaseId}>
              <InputLabel>Table</InputLabel>
              <Select
                value={selectedTableId}
                onChange={(e) => {
                  setSelectedTableId(e.target.value);
                  setSelectedFieldIds([]);
                }}
                label="Table"
              >
                <MenuItem value="">
                  <em>All Tables</em>
                </MenuItem>
                {availableTables.map((table) => (
                  <MenuItem key={table.id} value={table.id}>
                    {table.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth disabled={!selectedTableId}>
              <InputLabel>Fields</InputLabel>
              <Select
                multiple
                value={selectedFieldIds}
                onChange={(e) => setSelectedFieldIds(e.target.value as string[])}
                input={<OutlinedInput label="Fields" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip 
                        key={value} 
                        label={availableFields.find(f => f.id === value)?.name || value} 
                        size="small" 
                      />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="">
                  <em>All Fields</em>
                </MenuItem>
                {availableFields.map((field) => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdvancedSearch(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setShowAdvancedSearch(false);
              if (searchQuery.trim().length > 0) {
                dispatch(performSearch({
                  query: searchQuery,
                  baseId: selectedBaseId || undefined,
                  tableId: selectedTableId || undefined,
                  fieldIds: selectedFieldIds.length > 0 ? selectedFieldIds : undefined
                }));
              }
            }}
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Save Search Dialog */}
      <Dialog
        open={showSaveSearchDialog}
        onClose={() => setShowSaveSearchDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Search</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Name"
            fullWidth
            variant="outlined"
            value={savedSearchName}
            onChange={(e) => setSavedSearchName(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
            }
            label="Notify me of new results"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveSearchDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveSearch} variant="contained" disabled={!savedSearchName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GlobalSearch;