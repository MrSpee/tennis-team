import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 App starting in development mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode deaktiviert für bessere Performance beim Entwickeln
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
