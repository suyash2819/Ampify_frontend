import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PlaybackQueueProvider } from './context/PlaybackQueueContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlaybackQueueProvider>
      <App />
    </PlaybackQueueProvider>
  </StrictMode>,
)
