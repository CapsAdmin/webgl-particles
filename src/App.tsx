import Editor from "@monaco-editor/react";
import {
  Box,
  Card,
  Container,
  createTheme,
  CssBaseline,
  Paper,
  Switch,
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
import { createParticleSimulation, defaultConfig } from "./Simulation";
const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  // fixed with fonts
  typography: {
    fontFamily: "Monospace",
  },
});

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState(defaultConfig);
  const [error, setError] = useState("");
  const [readParticleState, setReadParticleState] = useState(false);
  const [particleState, setParticleState] = useState<
    Array<[Float32Array, Float32Array, Float32Array]>
  >([]);

  const viewRef = useRef<MapView>(null);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    const gl2 = canvas2Ref.current?.getContext("webgl2");
    if (!gl || !gl2) return;

    try {
      let particleSimulation = createParticleSimulation(gl, config);

      particleSimulation.renderDistanceFunction(gl2);

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
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [config]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Container>
        <Typography variant="h1">Particle simulator</Typography>
        <Stack spacing={3} alignSelf="center" justifySelf={"center"} flex={1}>
          <Stack spacing={3} direction="row">
            <Card>
              <Stack padding={1} flex={1}>
                <CanvasMap
                  viewRef={viewRef}
                  canvasRef={canvasRef}
                  error={error}
                />
              </Stack>
            </Card>

            <Stack padding={3} spacing={2} flex={1}>
              <Typography variant="h3">behavior</Typography>

              <Box>
                <Typography variant="h5">count</Typography>
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
                  onChange={(num) => {
                    setConfig({ ...config, particleCount: Math.round(num) });
                  }}
                />
              </Box>

              <Card variant="outlined">
                <Typography variant="h5">properties</Typography>

                <CodeEditor
                  language="javascript"
                  code={config.buildParticles}
                  onChange={(code) => {
                    setConfig({ ...config, buildParticles: code });
                  }}
                />
              </Card>

              <Card variant="outlined" style={{ position: "relative" }}>
                <Typography variant="h5">attraction</Typography>

                <CodeEditor
                  language="glsl"
                  code={config.distanceFunction}
                  onChange={(code) => {
                    setConfig({ ...config, distanceFunction: code });
                  }}
                />
                <canvas
                  ref={canvas2Ref}
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 128,
                    height: 128,
                  }}
                />
              </Card>
            </Stack>
          </Stack>

          <Card>
            <Stack direction={"row"} alignItems="center">
              <Switch
                onChange={(e, checked) => {
                  setReadParticleState(checked);
                  if (checked) {
                    setConfig({
                      ...config,
                      onParticleState: (i, state) => {
                        (particleState as any)[i] = state;
                        setParticleState([...particleState]);
                      },
                    });
                  } else {
                    setConfig({
                      ...config,
                      onParticleState: undefined,
                    });
                  }
                }}
              />

              <Typography>read paritcle state</Typography>
            </Stack>

            <ParticleStateTable particleState={particleState} />
          </Card>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
