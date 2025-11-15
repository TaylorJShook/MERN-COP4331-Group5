import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { APP_NAME } from "./config";
import { ThemeProvider } from "./context/ThemeContext";

// Set document title dynamically
document.title = APP_NAME;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
