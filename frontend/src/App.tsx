import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { checkAuth } from './store/slices/authSlice';
import { performanceMonitor } from './utils/performanceMonitoring';

// Import core components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Lazy load components for code splitting
const Layout = lazy(() => {
  const startTime = performance.now();
  return import('./components/Layout').then(module => {
    performanceMonitor.recordRenderTime('Layout', performance.now() - startTime);
    return module;
  });
});
const Dashboard = lazy(() => {
  const startTime = performance.now();
  return import('./pages/Dashboard').then(module => {
    performanceMonitor.recordRenderTime('Dashboard', performance.now() - startTime);
    return module;
  });
});
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading your account..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public route component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading your account..." />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullScreen message="Loading application..." />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Suspense fallback={<LoadingSpinner fullScreen message="Loading login..." />}>
                <Login />
              </Suspense>
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Suspense fallback={<LoadingSpinner fullScreen message="Loading registration..." />}>
                <Register />
              </Suspense>
            </PublicRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner fullScreen message="Loading dashboard..." />}>
                <Layout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index element={
              <Suspense fallback={<LoadingSpinner message="Loading dashboard..." />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="profile" element={
              <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
                <Profile />
              </Suspense>
            } />
            <Route path="bases/:baseId" element={<div>Base Detail</div>} />
            <Route path="bases/:baseId/tables/:tableId" element={<div>Table Detail</div>} />
          </Route>
          
          {/* Not found route */}
          <Route path="*" element={
            <Suspense fallback={<LoadingSpinner message="Page not found..." />}>
              <NotFound />
            </Suspense>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;