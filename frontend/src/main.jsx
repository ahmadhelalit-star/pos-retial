import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { RetailRuntime } from './runtime/RetailRuntime.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RetailRuntime />
    </BrowserRouter>
  </StrictMode>
);
