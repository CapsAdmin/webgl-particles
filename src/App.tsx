import { Menu } from "@mui/icons-material";
import { IconButton, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import "react-splitter-layout/lib/index.css";
import { CanvasMap, MapView } from "./components/CanvasMap";
import { GithubLink } from "./components/GithubLink";
import "./global.css";
import { ConifgEditor } from "./SimulationEditor";
import { createParticleSimulationRenderer } from "./Renderer";
import { createParticleSimulation } from "./Simulation";
import { useSimulationConfig } from "./useSimulationConfig";

function App() {
  const [config, setConfig] = useSimulationConfig();
  let [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);

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
        config={config}
        updateConfig={setConfig}
        onClose={() => setShowEditor(false)}
        show={showEditor}
        shaderError={shaderError}
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

      <div style={{ position: "fixed", top: 10, right: 10 }}>
        <IconButton
          onClick={() => {
            setShowEditor(!showEditor);
          }}
        >
          <Menu></Menu>
        </IconButton>
      </div>
    </>
  );
}

export default App;
