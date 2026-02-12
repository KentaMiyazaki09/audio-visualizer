import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

import { App } from "./App";
import "./styles/app.css";

/* テーマカラー 10段階 */
const brand = [
  "#EEF2FF",
  "#E0E7FF",
  "#C7D2FE",
  "#A5B4FC",
  "#818CF8",
  "#6366F1",
  "#4F46E5",
  "#4338CA",
  "#3730A3",
  "#312E81",
] as const;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      theme={{
        colors: { brand },
        primaryColor: "brand",
        primaryShade: 5, // "#6366F1",
        defaultRadius: "md",
      }}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>
);
