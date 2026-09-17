import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './theme';
import { InstrumentProvider } from './audio/instrument';
import './index.css';

// Tighter spacing when the visible height is short — a phone browser with its
// toolbars showing, or a small phone. innerHeight is the visible area, unlike
// vh. Nothing changes on a taller screen, including the installed app.
const SHORT_SCREEN_PX = 800;
const markShortScreen = () =>
  document.documentElement.classList.toggle('short-screen', window.innerHeight < SHORT_SCREEN_PX);
markShortScreen();
window.addEventListener('resize', markShortScreen);
window.addEventListener('orientationchange', markShortScreen);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <InstrumentProvider>
        <App />
      </InstrumentProvider>
    </ThemeProvider>
  </StrictMode>,
);
