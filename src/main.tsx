/** 文件说明：前端应用入口，负责挂载 React 应用并处理启动显示逻辑。 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const bootShell = document.getElementById('boot-shell');

async function revealWindowAndDismissBootShell() {
  let shouldShowWindow = true;

  try {
    const currentWindow = getCurrentWindow();

    if (currentWindow.label === 'main') {
      shouldShowWindow = await invoke<boolean>('should_show_window_on_boot');
    }
  } catch {
    // In non-Tauri contexts keep the page visible.
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(async () => {
      if (shouldShowWindow) {
        try {
          await getCurrentWindow().show();
        } catch {
          // Ignore show failures in browser-only runs.
        }
      }

      if (bootShell) {
        bootShell.dataset.hidden = 'true';

        window.setTimeout(() => {
          bootShell.remove();
        }, 220);
      }
    });
  });
}

void revealWindowAndDismissBootShell();

