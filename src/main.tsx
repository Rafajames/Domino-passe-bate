import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import { App } from './App';
import { installBackHandler } from './state/navigation';
import { registerServiceWorker } from './services/pwa';

installBackHandler();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
