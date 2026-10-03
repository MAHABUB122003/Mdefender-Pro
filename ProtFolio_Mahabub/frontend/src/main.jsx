import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initWaf } from 'mdefender-pro/client'

initWaf({
  apiKey: import.meta.env.VITE_MDEFENDER_API_KEY || 'qRk5Mk5v3SA5hWU22rVk_hZuQ735ps9D1AjBFuAC6C8hD8rRdxhAhe5SEml125L1',
  apiEndpoint: import.meta.env.VITE_MDEFENDER_API_ENDPOINT || 'http://217.15.170.82:8000',
  domain: 'mahabubur.vercel.app'
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)