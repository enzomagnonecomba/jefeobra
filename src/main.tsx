import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ObraProvider } from './context/ObraContext';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ObraProvider>
              <App />
            </ObraProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
);
