import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./marketing-fixes.css";
import { installMutationIdempotency } from "./idempotency";

installMutationIdempotency();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
