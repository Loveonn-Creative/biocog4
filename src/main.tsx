// Must run first: records what an email link put in the address bar.
import "./lib/authLinkSnapshot";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
