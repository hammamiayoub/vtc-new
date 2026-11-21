import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadPricingConfig, startPricingConfigRefresh } from './utils/pricingConfig';

void loadPricingConfig();
startPricingConfigRefresh();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
