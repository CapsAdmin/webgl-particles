import { Menu } from "@mui/icons-material";
import { IconButton, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { CanvasMap, MapView } from "./components/CanvasMap";
import { GithubLink } from "./components/GithubLink";
import { createParticleSimulationRenderer } from "./Renderer";
import { createParticleSimulation } from "./Simulation";
import { ConifgEditor, useSimulationCode } from "./SimulationEditor";

function App() {
  const [code, setCode] = useSimulationCode();
  let [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [particleStateFunction, setParticleStateFunction] =
    useState<(i: number, state: Float32Array[]) => void>();
  const [worldScale, setWorldScale] = useState(15);
  const [particleCount, setParticleCount] = useState(1);

  const shaderError = error.includes("SHADER: ERROR") ? error : undefined;
  if (shaderError) {
    error = "";
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<MapView>(null);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    try {
      let particleSimulation = createParticleSimulation(
        gl,
        code,
        particleStateFunction
      );

      setWorldScale(particleSimulation.jsonConfig.worldScale);
      setParticleCount(particleSimulation.jsonConfig.particleCount);

      if (particleSimulation.compute.count > 30) {
        setParticleStateFunction(undefined);
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
  }, [code]);

  return (
    <>
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
          worldScale={worldScale}
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
        particleCount={particleCount}
        setParticleStateFunction={setParticleStateFunction}
      />

      <div
        style={{
          position: "fixed",
          bottom: 1,
          right: 1,
        }}
      >
        <GithubLink url="https://github.com/CapsAdmin/webgl-particles" />
      </div>

      {!showEditor ? (
        <div style={{ position: "fixed", top: 10, left: 10 }}>
          <IconButton
            onClick={() => {
              setShowEditor(!showEditor);
            }}
          >
            <Menu></Menu>
          </IconButton>
        </div>
      ) : null}
    </>
  );
}

export default App;
