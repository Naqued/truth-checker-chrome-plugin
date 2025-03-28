import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import Popup from './Popup';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  }
}); 