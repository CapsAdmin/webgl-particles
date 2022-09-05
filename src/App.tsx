import { Menu } from "@mui/icons-material";
import { TabList, TabPanel } from "@mui/lab";
import TabContext from "@mui/lab/TabContext";
import {
  Box,
  Button,
  Card,
  createTheme,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  Link,
  Slider,
  Switch,
  Tab,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useEffect, useRef, useState } from "react";
import "react-splitter-layout/lib/index.css";
import { CanvasMap, MapView } from "./components/CanvasMap";
import { CodeEditor } from "./components/CodeEditor";
import { ExponentialSlider } from "./components/ExponentialSlider";
import { ParticleStateTable } from "./components/ParticleStateTable";
import "./global.css";
import { createParticleSimulationRenderer } from "./Renderer";
import {
  createParticleSimulation,
  defaultConfig,
  SimulationConfig,
} from "./Simulation";

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

let initialConfig = defaultConfig;
if (localStorage.getItem("config")) {
  try {
    const str = localStorage.getItem("config");
    if (!str) throw new Error("no config");
    const test = JSON.parse(str);
    if (test) {
      initialConfig = test;
    }
  } catch (err) {
    console.error(err);
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState(initialConfig);
  const [error, setError] = useState("");
  const [particleState, setParticleState] = useState<number[][][]>([]);

  const viewRef = useRef<MapView>(null);
  const updateConfig = (newConfig: Partial<SimulationConfig>) => {
    const temp = { ...config, ...newConfig };
    setConfig(temp);

    localStorage.setItem("config", JSON.stringify(temp));
  };

  const [tab, setTab] = useState("1");
  const [showEditor, setShowEditor] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    try {
      let particleSimulation = createParticleSimulation(gl, config);

      if (config.particleCount > 30) {
        config.onParticleState = undefined;
      }

      let destroy = createParticleSimulationRenderer(
        gl,
        particleSimulation,
        () => {
          let view = viewRef.current;
          if (!view) return [0, 0, 1, 1] as const;
          return view.get();
        }
      );
      setError("");
      return destroy;
    } catch (err: any) {
      console.error(err);
      if (typeof err == "string") {
        setError(err);
      } else if (err.message) {
        setError(err.message);
      }
    }
  }, [config]);

  return (
    <>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          <CanvasMap
            viewSize={window.innerWidth}
            worldScale={config.worldScale}
            viewRef={viewRef}
            canvasRef={canvasRef}
            error={error}
          />
        </div>

        <Drawer
          anchor={"right"}
          open={showEditor}
          onClose={() => {
            setShowEditor(false);
          }}
        >
          <Card variant="outlined" style={{ flex: 1, minWidth: "40vw" }}>
            <TabContext value={tab}>
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <TabList
                  textColor="primary"
                  indicatorColor="primary"
                  onChange={(e, v) => {
                    setTab(v);
                  }}
                >
                  <Tab color="red" label="init" value="1" />
                  <Tab color="red" label="simulation" value="2" />
                  <Tab color="red" label="settings" value="3" />
                  {config.particleCount < 30 ? (
                    <Tab color="red" label="state" value="4" />
                  ) : null}
                </TabList>
              </Box>

              <TabPanel value="1" style={{ height: "100%" }}>
                <CodeEditor
                  language="javascript"
                  code={config.buildParticles}
                  onChange={(code) => {
                    updateConfig({ buildParticles: code });
                  }}
                />
              </TabPanel>

              <TabPanel value="2" style={{ height: "100%" }}>
                <CodeEditor
                  language="glsl"
                  code={config.simulationCode}
                  onChange={(code) => {
                    updateConfig({ simulationCode: code });
                  }}
                />
              </TabPanel>

              <TabPanel value="3" style={{ display: "flex" }}>
                <Stack padding={3} spacing={2} style={{ flex: 1 }}>
                  <Box>
                    <Typography variant="body1">particle count</Typography>
                    <ExponentialSlider
                      steps={[
                        { value: 1, label: "1" },
                        { value: 2, label: "2" },
                        { value: 3, label: "3" },
                        { value: 4, label: "4" },
                        { value: 8, label: "8" },
                        { value: 32, label: "32" },
                        { value: 1000, label: "1k" },
                        { value: 10000, label: "10k" },
                        { value: 20000, label: "20k" },
                        { value: 30000, label: "30k" },
                      ]}
                      value={config.particleCount}
                      onChange={(num) => {
                        updateConfig({
                          particleCount: Math.round(num),
                        });
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body1">world scale</Typography>
                    <Slider
                      min={1}
                      max={50}
                      valueLabelDisplay="auto"
                      value={config.worldScale}
                      onChange={(e, num) => {
                        updateConfig({
                          worldScale: Math.round(num as number),
                        });
                      }}
                    />
                  </Box>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(config, null, 2)
                      );
                    }}
                    variant="contained"
                  >
                    copy settings to clipboard
                  </Button>

                  <Button
                    onClick={async () => {
                      setShowPasteDialog(true);
                    }}
                    variant="contained"
                  >
                    paste settings from clipboard
                  </Button>

                  <Button
                    onClick={() => {
                      setShowResetDialog(true);
                    }}
                    variant="text"
                  >
                    reset settings
                  </Button>
                </Stack>
              </TabPanel>

              <TabPanel value="4" style={{ display: "flex" }}>
                {config.particleCount < 30 ? (
                  <Card>
                    <Stack direction={"row"} alignItems="center">
                      <Switch
                        onChange={(e, checked) => {
                          if (checked) {
                            updateConfig({
                              onParticleState: (i, state) => {
                                (particleState as any)[i] = state;
                                setParticleState([...particleState]);
                              },
                            });
                          } else {
                            updateConfig({
                              onParticleState: undefined,
                            });
                          }
                        }}
                      />

                      <Typography>read paritcle state</Typography>
                    </Stack>

                    <ParticleStateTable particleState={particleState} />
                  </Card>
                ) : null}
              </TabPanel>
            </TabContext>
          </Card>
        </Drawer>

        <div
          style={{
            position: "fixed",
            bottom: 1,
            right: 1,
          }}
        >
          <Stack spacing={1} direction="row" alignItems={"baseline"}>
            <Link
              style={{ fontSize: 10 }}
              noWrap
              href="https://github.com/CapsAdmin/webgl-particles"
            >
              {"github.com/CapsAdmin/webgl-particles"}
            </Link>
          </Stack>
        </div>

        <div style={{ position: "fixed", top: 10, right: 10 }}>
          <IconButton
            onClick={() => {
              setShowEditor(!showEditor);
            }}
          >
            <Menu></Menu>
          </IconButton>
        </div>

        <Dialog
          open={showResetDialog}
          onClose={() => setShowResetDialog(false)}
        >
          <DialogTitle>reset settings</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              do you want to reset your settings?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResetDialog(false)}>cancel</Button>
            <Button
              onClick={() => {
                updateConfig({ ...defaultConfig });
                setShowResetDialog(false);
              }}
              autoFocus
            >
              reset
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showPasteDialog}
          onClose={() => setShowPasteDialog(false)}
        >
          <DialogTitle>load settings</DialogTitle>
          <DialogContent>
            <DialogContentText>
              paste json settings from clipboard
            </DialogContentText>

            <TextField
              autoFocus
              style={{ maxHeight: 200 }}
              onChange={(e) => {
                setPasteText(e.target.value);
              }}
              fullWidth
              multiline
            ></TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPasteDialog(false)}>cancel</Button>
            <Button
              onClick={() => {
                const data = JSON.parse(pasteText);
                if (data) {
                  updateConfig(data);
                }
                setShowPasteDialog(false);
                setPasteText("");
              }}
              autoFocus
            >
              load
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    </>
  );
}

export default App;
