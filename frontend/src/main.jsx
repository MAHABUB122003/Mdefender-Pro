import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import App from './App.jsx'

const _toParam = new URLSearchParams(window.location.search).get('to')
if (_toParam) {
  try {
    window.history.replaceState(null, '', decodeURIComponent(_toParam))
  } catch {
    window.history.replaceState(null, '', '/')
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
