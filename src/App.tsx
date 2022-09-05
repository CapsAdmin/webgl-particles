import Editor from "@monaco-editor/react";
import {
  Box,
  Button,
  Card,
  Container,
  createTheme,
  CssBaseline,
  Paper,
  Slider,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useEffect, useRef, useState } from "react";
import { CanvasMap, MapView } from "./components/CanvasMap";
import { CodeEditor } from "./components/CodeEditor";
import { ExponentialSlider } from "./components/ExponentialSlider";
import { ParticleStateTable } from "./components/ParticleStateTable";
import { createParticleSimulationRenderer } from "./Renderer";
import TabContext from "@mui/lab/TabContext";
import {
  createParticleSimulation,
  defaultConfig,
  SimulationConfig,
} from "./Simulation";
import { TabList, TabPanel } from "@mui/lab";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#505050FF",
    },
  },
  // fixed with fonts
  typography: {
    fontFamily: "Monospace",
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
          if (!view) return [0, 0, 1] as const;
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Container maxWidth="xl" sx={{ marginTop: 4 }}>
        <Stack spacing={3} alignSelf="center" justifySelf={"center"} flex={1}>
          <Typography align="center" variant="h2">
            particle playground
          </Typography>
          <Stack
            spacing={3}
            direction={{
              md: "column",
              lg: "row",
            }}
          >
            <Stack padding={3} spacing={2} flex={1}>
              <Card variant="outlined">
                <Stack alignItems={"center"}>
                  <CanvasMap
                    viewSize={700}
                    worldScale={config.worldScale}
                    viewRef={viewRef}
                    canvasRef={canvasRef}
                    error={error}
                  />
                </Stack>
              </Card>

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

              <Box>
                <Typography variant="body1">count</Typography>
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
                    updateConfig({ particleCount: Math.round(num) });
                  }}
                />
              </Box>

              <Button
                onClick={() => {
                  updateConfig({ ...defaultConfig });
                }}
                variant="contained"
              >
                reset
              </Button>
            </Stack>

            <Stack padding={3} spacing={2} flex={1}>
              <Card variant="outlined">
                <TabContext value={tab}>
                  <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <TabList
                      onChange={(e, v) => {
                        setTab(v);
                      }}
                    >
                      <Tab label="init" value="1" />
                      <Tab label="simulation" value="2" />
                    </TabList>
                  </Box>

                  <TabPanel value="1">
                    <div style={{ margin: -25 }}>
                      <CodeEditor
                        language="javascript"
                        code={config.buildParticles}
                        onChange={(code) => {
                          updateConfig({ buildParticles: code });
                        }}
                      />
                    </div>
                  </TabPanel>

                  <TabPanel value="2">
                    <div style={{ margin: -25 }}>
                      <CodeEditor
                        language="glsl"
                        code={config.simulationCode}
                        onChange={(code) => {
                          updateConfig({ simulationCode: code });
                        }}
                      />
                    </div>
                  </TabPanel>
                </TabContext>
              </Card>
            </Stack>
          </Stack>

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
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
