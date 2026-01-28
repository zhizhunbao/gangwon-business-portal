/**
 * Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@shared/styles/index.css';
import i18n from '@shared/i18n';

// 禁用 React DevTools 提示和 react-quill 的 findDOMNode 警告
if (typeof window !== 'undefined') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (message && typeof message === 'string') {
      if (message.includes('Download the React DevTools') ||
          message.includes('findDOMNode is deprecated') ||
          message.includes('[tiptap warn]: Duplicate extension names')) {
        return;
      }
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Initialize application
function initializeApp() {
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  } catch (error) {
    console.error('[App] Failed to initialize:', error);

    const title = i18n.t('error.appInit.title', '응용 프로그램 초기화 실패');
    const message = i18n.t('error.appInit.message', '페이지를 새로 고치고 다시 시도하십시오.');

    document.getElementById('root').innerHTML = `
      <div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
        <h2>${title}</h2>
        <p>${message}</p>
        <p style="font-size: 12px; color: #666;">${error.message}</p>
      </div>
    `;
  }
}

initializeApp();
