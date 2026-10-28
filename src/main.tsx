import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LinkPage } from './components/LinkPage';
import { LINK_PAGE_PREFIX } from './lib/qrPayloads';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.hash.startsWith(LINK_PAGE_PREFIX) ? <LinkPage hash={window.location.hash} /> : <App />}
  </StrictMode>
);
