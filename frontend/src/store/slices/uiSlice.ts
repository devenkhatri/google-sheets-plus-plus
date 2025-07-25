import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Types
interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  notifications: Notification[];
  activeUsers: ActiveUser[];
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
}

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  lastSeen: number;
}

// Initial state
const initialState: UIState = {
  sidebarOpen: true,
  darkMode: false,
  notifications: [],
  activeUsers: [],
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const id = Date.now().toString();
      state.notifications.unshift({
        ...action.payload,
        id,
        timestamp: Date.now(),
        read: false,
      });
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    updateActiveUsers: (state, action: PayloadAction<ActiveUser[]>) => {
      state.activeUsers = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleDarkMode,
  setDarkMode,
  addNotification,
  markNotificationAsRead,
  clearNotifications,
  updateActiveUsers,
} = uiSlice.actions;
export default uiSlice.reducer;