import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Design system structure per 04_UI_UX.md §DESIGN SYSTEM:
//   tokens/ globals/ layouts/ components/  (+ site/ for the public marketing pages)
// Import order is load-bearing: tokens define the custom properties every later
// file consumes.
import './styles/tokens/index.css';
import './styles/globals/index.css';
import './styles/layouts/index.css';
import './styles/components/index.css';
import './styles/site/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
