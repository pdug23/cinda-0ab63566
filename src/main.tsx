import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// iOS viewport height fix - addresses the vh bug on Safari/PWA
const setAppHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};

window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
setAppHeight();

createRoot(document.getElementById("root")!).render(<App />);
