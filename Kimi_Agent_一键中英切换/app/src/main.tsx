import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TRPCProvider } from './providers/trpc'
import { LangProvider } from './i18n/lang'

createRoot(document.getElementById('root')!).render(
  <TRPCProvider>
    <LangProvider>
      <App />
    </LangProvider>
  </TRPCProvider>,
)
