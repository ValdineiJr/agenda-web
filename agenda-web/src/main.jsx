import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext' // <-- 1. IMPORTE AQUI

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. ENVOLOPE O APP AQUI */}
      <AuthProvider> 
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)