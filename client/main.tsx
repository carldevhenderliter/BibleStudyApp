import { createRoot } from "react-dom/client";
import App from "./src/App";
import "./client/index.css";

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
