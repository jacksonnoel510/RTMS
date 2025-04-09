// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import VehicleManagement from './pages/vehicleManagement';
import AlertPage from './pages/alert';
import VehicleReports from './pages/report';
import ProtectedRoute from '../src/pages/ ProtectedRoute';
import './index.css';
import { ErrorBoundary } from 'react-error-boundary';
import PenaltyManagement from '../src/pages/PenaltyManagement';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/vehicle-management',
        element: <VehicleManagement />,
      },
      {
        path: '/reports',
        element: <VehicleReports />,
      },
      {
        path: '/alerts',
        element: <AlertPage />,
        
      },
      {
        path:"/penalties", 
        element:<PenaltyManagement />
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="error-boundary">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Wrap your routes with ErrorBoundary
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Routes>
    <Route path="/vehicle-management" element={<VehicleManagement />} />
    {/* other routes */}
  </Routes>
</ErrorBoundary>