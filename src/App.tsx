import { useEffect, useRef, useState } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2");
    const gl2 = canvas2Ref.current?.getContext("webgl2");
    if (!gl || !gl2) return;

    const PARTICLE_COUNT = 20000;
    let particleSimulation = createParticleSimulation(gl, PARTICLE_COUNT);

    particleSimulation.renderDistanceFunction(gl2);

    return createParticleSimulationRenderer(gl, particleSimulation);
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "black",

        display: "flex",
        flexDirection: "column",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100vh" }} />

      <span>particle attraction function:</span>
      <canvas ref={canvas2Ref} style={{ width: 512, height: 512 }} />
      <span>blue attracts, red detracts</span>
    </div>
  );
}

export default App;
