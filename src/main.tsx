import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Suppress benign ResizeObserver errors thrown by Monaco Editor
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop limit exceeded' ||
    e.message === 'ResizeObserver loop completed with undelivered notifications.'
  ) {
    e.stopImmediatePropagation();
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
