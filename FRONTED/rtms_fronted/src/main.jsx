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
import './index.css';

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
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/logout',
    element: < App/>,
  },
  {
    path: '/vehicle-management',
    element:<VehicleManagement />,
  },
  {
    path: '/reports',
    element: <VehicleReports />,
  

  },
  {
    path: '/alerts',
    element: <AlertPage />,
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);