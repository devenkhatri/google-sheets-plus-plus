import React, { useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

// Import view components
import { GridView, MobileGridView } from './grid';
import { KanbanView, MobileKanbanView } from './kanban';
import { CalendarView, MobileCalendarView } from './calendar';
import { GalleryView, MobileGalleryView } from './gallery';
import { isTouchDevice } from '../../utils/mobileOptimizations';

interface ResponsiveViewSelectorProps {
  viewType: 'grid' | 'kanban' | 'calendar' | 'gallery';
  tableId: string;
  viewId: string;
}

/**
 * Component that selects the appropriate view component based on the device size and capabilities
 */
const ResponsiveViewSelector: React.FC<ResponsiveViewSelectorProps> = ({ 
  viewType, 
  tableId, 
  viewId 
}) => {
  const theme = useTheme();
  // Check both screen size and touch capability for better mobile detection
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const hasTouchCapability = isTouchDevice();
  
  // Consider a device mobile if it has a small screen OR touch capability
  const isMobile = isSmallScreen || hasTouchCapability;
  
  // Add viewport meta tag for better mobile rendering if needed
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // If it doesn't exist, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set appropriate viewport settings for mobile
    if (isMobile) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    } else {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    
    return () => {
      // Reset viewport when component unmounts
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, [isMobile]);
  
  // Select the appropriate view component based on view type and device
  switch (viewType) {
    case 'grid':
      return isMobile 
        ? <MobileGridView tableId={tableId} viewId={viewId} /> 
        : <GridView tableId={tableId} viewId={viewId} />;
      
    case 'kanban':
      return isMobile 
        ? <MobileKanbanView tableId={tableId} viewId={viewId} /> 
        : <KanbanView tableId={tableId} viewId={viewId} />;
      
    case 'calendar':
      return isMobile 
        ? <MobileCalendarView tableId={tableId} viewId={viewId} /> 
        : <CalendarView tableId={tableId} viewId={viewId} />;
      
    case 'gallery':
      return isMobile 
        ? <MobileGalleryView tableId={tableId} viewId={viewId} /> 
        : <GalleryView tableId={tableId} viewId={viewId} />;
      
    default:
      // Default to grid view
      return isMobile 
        ? <MobileGridView tableId={tableId} viewId={viewId} /> 
        : <GridView tableId={tableId} viewId={viewId} />;
  }
};

export default ResponsiveViewSelector;