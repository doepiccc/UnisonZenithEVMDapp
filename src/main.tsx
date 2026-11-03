import '@fontsource-variable/manrope'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppDataProvider } from './context/AppDataContext'
import { CantonRecipientsProvider } from './context/CantonRecipientsContext'
import { ToastProvider } from './context/ToastContext'
import { WalletProvider } from './context/WalletContext'
import { ZenithProvider } from './context/ZenithContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ZenithProvider>
        <WalletProvider>
          <CantonRecipientsProvider>
            <AppDataProvider>
              <App />
            </AppDataProvider>
          </CantonRecipientsProvider>
        </WalletProvider>
      </ZenithProvider>
    </ToastProvider>
  </StrictMode>,
)
