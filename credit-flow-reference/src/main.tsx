import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initLocalDB } from './services/localStorage'
import './index.css'

// Initialiser IndexedDB au démarrage de l'application
initLocalDB().catch((error) => {
  console.error('Error initializing local database:', error)
})

createRoot(document.getElementById('root')!).render(<App />)
