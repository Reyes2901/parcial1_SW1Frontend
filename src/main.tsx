import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';
import '@xyflow/react/dist/style.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No #root element found');

createRoot(rootEl).render(<App />);