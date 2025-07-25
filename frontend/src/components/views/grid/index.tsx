import { useMediaQuery, useTheme } from '@mui/material';
import GridView from './GridView';
import MobileGridView from './MobileGridView';

interface GridViewWrapperProps {
  tableId: string;
  viewId: string;
}

// This wrapper component will render the appropriate grid view based on screen size
const GridViewWrapper = (props: GridViewWrapperProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return isMobile ? <MobileGridView {...props} /> : <GridView {...props} />;
};

export default GridViewWrapper;