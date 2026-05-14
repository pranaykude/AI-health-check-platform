import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const API_BASE = "http://localhost:5001";

fetch(API_BASE + "/api/v1/health")
  .then(res => res.json())
  .then(() => console.log("Backend reachable"))
  .catch(() => console.error("Backend not reachable"));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
