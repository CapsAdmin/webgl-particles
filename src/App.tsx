import { useEffect, useState } from "react";
import { createParticleSimulationRenderer } from "./Renderer";
import { createParticleSimulation } from "./Simulation";

const useSimulation = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const PARTICLE_COUNT = 20000;
    let particleSimulation = createParticleSimulation(gl, PARTICLE_COUNT);

    return createParticleSimulationRenderer(gl, particleSimulation);
  }, [canvas]);
};

function App() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  useSimulation(canvasElement);
  return (
    <canvas
      ref={(e) => {
        setCanvasElement(e);
      }}
      style={{
        backgroundColor: "black",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default App;
