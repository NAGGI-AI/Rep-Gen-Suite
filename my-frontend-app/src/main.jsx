import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './index.css'
import App from './App.jsx' // This is the DAST Report page
import LandingPage from './LandingPage.jsx';
import MasaGenerator from './MasaGenerator.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dast',
    element: <App />,
  },
  {
    path: '/masa',
    element: <MasaGenerator />,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
