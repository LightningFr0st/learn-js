import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const tasks = window.__INITIAL_DATA__ || [];

createRoot(document.getElementById("root")).render(<App />);
