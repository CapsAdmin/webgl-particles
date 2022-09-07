import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import "react-splitter-layout/lib/index.css";
import "./global.css";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4db898",
    },
  },
  // fixed with fonts
  typography: {
    fontFamily: "Monospace",
  },
  spacing: 4,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0,0,0,0.4)",
          backgroundImage: "none",
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
