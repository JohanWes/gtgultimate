import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './hooks/useSettings'

// Initialize Vercel Analytics for web analytics tracking
inject()

// Initialize Vercel Speed Insights for performance monitoring
injectSpeedInsights()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
