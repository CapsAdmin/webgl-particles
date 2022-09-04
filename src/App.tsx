import {
  Box,
  Card,
  Container,
  createTheme,
  CssBaseline,
  Slider,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useEffect, useRef, useState } from "react";
import { Editor } from "./Editor";
import { createParticleSimulationRenderer } from "./Renderer";
import { createParticleSimulation, defaultConfig } from "./Simulation";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const ExpressionTextField = (props: {
  label: string;
  value: (i: number, max: number) => number;
  onChange: (func: (i: number, max: number) => number) => void;
}) => {
  const match = props.value.toString().match(/\=\>(.*)/);
  let initialValue = "";
  if (match && match[1]) {
    initialValue = match[1].trim();
  }

  const [error, setError] = useState("");
  const [strValue, setStrValue] = useState(initialValue);

  return (
    <TextField
      label={props.label}
      variant="outlined"
      error={error !== ""}
      helperText={error}
      value={strValue}
      onChange={(event) => {
        setStrValue(event.target.value);
        try {
          const func = eval("(i, max) => " + event.target.value) as (
            i: number,
            max: number
          ) => number;

          if (typeof func === "function") {
            func(0, 1);
            props.onChange(func);
            setError("");
          }
        } catch (e) {
          if (e instanceof Error) {
            setError(e.message);
          }
        }
      }}
    />
  );
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  const [config, setConfig] = useState(defaultConfig);
  const [error, setError] = useState("");
  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    const gl2 = canvas2Ref.current?.getContext("webgl2");
    if (!gl || !gl2) return;

    try {
      let particleSimulation = createParticleSimulation(gl, config);

      particleSimulation.renderDistanceFunction(gl2);

      return createParticleSimulationRenderer(gl, particleSimulation);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [config]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Container>
        <Stack spacing={3} direction="row">
          <Card>
            <Stack padding={1} flex={1}>
              {error ? (
                <Typography color="error">{error}</Typography>
              ) : (
                <canvas
                  width={512}
                  height={512}
                  ref={canvasRef}
                  style={{
                    backgroundColor: "black",
                  }}
                />
              )}
            </Stack>
          </Card>

          <Card>
            <Stack
              justifyContent="center"
              alignContent="center"
              padding={3}
              spacing={2}
            >
              <Stack>
                <Typography>particle count</Typography>
                <Slider
                  marks={[
                    { value: 1, label: "1" },
                    { value: 30000, label: "30000" },
                  ]}
                  valueLabelDisplay="auto"
                  min={1}
                  max={300}
                  onChange={(event, num) => {
                    setConfig({ ...config, particleCount: num as number });
                  }}
                ></Slider>
              </Stack>
              <ExpressionTextField
                label="size"
                value={config.getSize}
                onChange={(func) => {
                  setConfig({ ...config, getSize: func });
                }}
              />
              <ExpressionTextField
                label="gravity"
                value={config.getGravity}
                onChange={(func) => {
                  setConfig({ ...config, getGravity: func });
                }}
              />

              <ExpressionTextField
                label="friction"
                value={config.getFriction}
                onChange={(func) => {
                  setConfig({ ...config, getFriction: func });
                }}
              />
            </Stack>
          </Card>

          <Card>
            <Stack
              justifyContent="center"
              alignContent="center"
              padding={3}
              spacing={2}
            >
              <canvas
                ref={canvas2Ref}
                style={{
                  width: 128,
                  height: 128,
                }}
              />
              <Box sx={{ height: 520, width: 512, position: "relative" }}>
                <Editor
                  value={config.distanceFunction}
                  onChange={(str) => {
                    setConfig({ ...config, distanceFunction: str });
                  }}
                />
              </Box>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
