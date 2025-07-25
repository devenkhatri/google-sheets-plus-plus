import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { registerSW } from 'virtual:pwa-register';

import App from './App';
import { store } from './store';
import { theme } from './theme';
import QueryProvider from './providers/QueryProvider';
import { pushNotificationService } from './services/pushNotificationService';
import { UndoRedoProvider } from './components/UndoRedoProvider';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    // Initialize push notifications after service worker is ready
    pushNotificationService.initialize();
    
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('background-sync');
      }).catch((error) => {
        console.log('Background sync registration failed:', error);
      });
    }
  },
  onRegistered(registration) {
    console.log('Service worker registered:', registration);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryProvider>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <UndoRedoProvider>
              <App />
            </UndoRedoProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryProvider>
    </Provider>
  </React.StrictMode>
);