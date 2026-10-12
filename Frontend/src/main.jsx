import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startKeepAlive } from './shared/api/keepAlive.js'

// Pre-warm the Render free-tier backend so users don't hit a 30–60 s cold start.
startKeepAlive()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
