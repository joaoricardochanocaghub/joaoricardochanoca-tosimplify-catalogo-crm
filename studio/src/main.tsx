import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StoreProvider } from "./store/StoreProvider";
import { UIProvider } from "./ui/UIProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </UIProvider>
  </StrictMode>,
);
