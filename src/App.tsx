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
import { Map } from "leaflet";
import "leaflet/dist/leaflet.css";
import { RefObject, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { ExponentialSlider } from "./ExponentialSlider";
import { registerGLSL } from "./GLSLLanguage";
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

const formatPoint = (value: number) => {
  if (value < 0) {
    return value.toFixed(3);
  }
  return "+" + value.toFixed(3);
};

const formatProperty = (value: number) => {
  return value.toFixed(3);
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState(defaultConfig);
  const [error, setError] = useState("");
  const [readParticleState, setReadParticleState] = useState(false);
  const [particleState, setParticleState] = useState<
    Array<[Float32Array, Float32Array, Float32Array]>
  >([]);

  const mapRef = useRef<Map | null>(null);

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
          let map = mapRef.current;
          if (map) {
            const div = map._proxy as HTMLDivElement;
            if (!div) return [0, 0, 1] as const;

            const matrix = window.getComputedStyle(div).transform;
            if (!matrix) return [0, 0, 1] as const;
            const match = matrix.match(/matrix\(.*,(.*)\)/);
            if (!match) return [0, 0, 1] as const;
            const val = parseFloat(match[1]);

            let mapZoom = (val * (1 / 0.6359804005193673)) / 52756500; // map.getZoom()

            let zoom = mapZoom;
            let x = -map.getCenter().lng * 800 * Math.pow(zoom, 1);
            let y = -map.getCenter().lat * 800 * Math.pow(zoom, 1);
            return [x, y, zoom] as const;
          }

          return [0, 0, 1] as const;
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
                <div style={{ position: "relative" }}>
                  <MapContainer
                    ref={mapRef}
                    center={[0, 0]}
                    zoom={112}
                    scrollWheelZoom={true}
                    style={{ height: 512, width: 512 }}
                  >
                    <TileLayer
                      zIndex={-1}
                      opacity={0}
                      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <canvas
                      width={512}
                      height={512}
                      ref={canvasRef}
                      style={{
                        backgroundColor: "black",
                        position: "absolute",
                        zIndex: 10,
                      }}
                    />
                  </MapContainer>
                  <Typography
                    align="left"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      backgroundColor: "black",
                    }}
                    color="error"
                  >
                    {error}
                  </Typography>
                </div>
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

                <Editor
                  options={{
                    minimap: {
                      enabled: false,
                    },
                  }}
                  height={256}
                  language="javascript"
                  defaultValue={config.buildParticles}
                  onChange={(value) => {
                    if (value) {
                      setConfig({ ...config, buildParticles: value });
                    }
                  }}
                />
              </Card>

              <Card variant="outlined" style={{ position: "relative" }}>
                <Typography variant="h5">attraction</Typography>

                <Editor
                  options={{
                    minimap: {
                      enabled: false,
                    },
                  }}
                  onMount={(editor, monaco) => {
                    registerGLSL(monaco);
                  }}
                  theme="vs-dark"
                  height={256}
                  language="glsl"
                  value={config.distanceFunction}
                  onChange={(str) => {
                    if (str) {
                      setConfig({ ...config, distanceFunction: str });
                    }
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
            <TableContainer component={Paper}>
              <Table
                sx={{ minWidth: 650 }}
                size="small"
                aria-label="a dense table"
              >
                <TableHead>
                  <TableRow>
                    <TableCell>pos</TableCell>
                    <TableCell>velocity</TableCell>
                    <TableCell>color</TableCell>
                    <TableCell>gravity</TableCell>
                    <TableCell>size</TableCell>
                    <TableCell>friction</TableCell>
                    <TableCell>unused</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {particleState.map((state, i) => (
                    <TableRow key={i}>
                      {state.map((row, i) => {
                        const cells = [];
                        if (i === 0) {
                          cells.push(
                            <TableCell>
                              <Stack direction="column">
                                <Typography>{formatPoint(row[0])}</Typography>
                                <Typography>{formatPoint(row[1])}</Typography>
                              </Stack>
                            </TableCell>
                          );
                          cells.push(
                            <TableCell>
                              <Stack direction="column">
                                <Typography>{formatPoint(row[2])}</Typography>
                                <Typography>{formatPoint(row[3])}</Typography>
                              </Stack>
                            </TableCell>
                          );
                        } else if (i === 1) {
                          cells.push(
                            <TableCell>
                              <Stack direction="row" alignItems="center">
                                <Tooltip
                                  title={
                                    formatProperty(row[0]) +
                                    " " +
                                    formatProperty(row[1]) +
                                    " " +
                                    formatProperty(row[2]) +
                                    " " +
                                    formatProperty(row[3])
                                  }
                                >
                                  <div
                                    style={{
                                      marginLeft: "0.5em",
                                      width: 10,
                                      height: 10,
                                      backgroundColor: `rgba(${row[0] * 255},${
                                        row[1] * 255
                                      },${row[2] * 255},${row[3]})`,
                                    }}
                                  ></div>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          );
                        } else if (i === 2) {
                          cells.push(
                            <TableCell>{formatProperty(row[0])}</TableCell>
                          );
                          cells.push(
                            <TableCell>{formatProperty(row[1])}</TableCell>
                          );
                          cells.push(
                            <TableCell>{formatProperty(row[2])}</TableCell>
                          );
                          cells.push(
                            <TableCell>{formatProperty(row[3])}</TableCell>
                          );
                        }
                        return cells;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
