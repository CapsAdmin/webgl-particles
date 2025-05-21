import { Menu } from "@mui/icons-material";
import { IconButton, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { CanvasMap, MapView } from "./components/CanvasMap";
import { GithubLink } from "./components/GithubLink";
import { createSimulationRenderer } from "./Renderer";
import { createSimulation } from "./Simulation";
import { ConifgEditor, useSimulationCode } from "./SimulationEditor";

function App() {
  const [code, setCode] = useSimulationCode();
  let [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  useState<(i: number, state: Float32Array[]) => void>();

  const shaderError = error.includes("SHADER: ERROR") ? error : undefined;
  if (shaderError) {
    error = "";
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<[number, number, number, number]>([0, 0, 1, 1]);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    try {
      let simulation = createSimulation(gl, code);

      let destroy = createSimulationRenderer(gl, simulation, () => {
        let view = viewRef.current;
        if (!view) return [0, 0, 1, 1] as const;
        return view;
      });
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
  }, [code]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100%",
        width: "100%",
        display: "flex",
        backgroundColor: "black",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <CanvasMap
          worldSize={[1024, 1024]}
          viewRef={viewRef}
          canvasRef={canvasRef}
        />
      </div>

      {error ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            overflow: "auto",
          }}
        >
          {error.split("\n").map((line, i) => (
            <Typography
              align="left"
              style={{
                wordWrap: "break-word",
                backgroundColor: "black",
                zIndex: 100,
              }}
              color="error"
            >
              {line}
            </Typography>
          ))}
        </div>
      ) : null}

      <ConifgEditor
        code={code}
        setCode={setCode}
        onClose={() => setShowEditor(false)}
        show={showEditor}
        shaderError={shaderError}
      />

      <div
        style={{
          position: "absolute",
          bottom: 1,
          right: 1,
        }}
      >
        <GithubLink url="https://github.com/CapsAdmin/webgl-siumulation" />
      </div>

      {!showEditor ? (
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <IconButton
            onClick={() => {
              setShowEditor(!showEditor);
            }}
          >
            <Menu></Menu>
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}

export default App;
