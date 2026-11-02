import '@fontsource-variable/manrope'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppDataProvider } from './context/AppDataContext'
import { ToastProvider } from './context/ToastContext'
import { WalletProvider } from './context/WalletContext'
import { ZenithProvider } from './context/ZenithContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ZenithProvider>
        <WalletProvider>
          <AppDataProvider>
            <App />
          </AppDataProvider>
        </WalletProvider>
      </ZenithProvider>
    </ToastProvider>
  </StrictMode>,
)
