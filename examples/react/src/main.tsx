import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WelcomeView } from "./Welcome";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WelcomeView runtime="React 19" />
  </StrictMode>
);
