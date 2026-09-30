import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { registerServiceWorker } from './registerServiceWorker';
import './index.css';

try {
  registerServiceWorker();
} catch (err) {
  console.warn('[UnifyHub] Service worker initialization non-fatal error:', err);
}

const container = document.getElementById('root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
