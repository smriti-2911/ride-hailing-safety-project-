import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Import styles
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

// Render the app without StrictMode for now to eliminate potential double-mounting issues
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
