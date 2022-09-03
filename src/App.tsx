import { useEffect, useRef, useState } from "react";
import { createParticleSimulationRenderer } from "./Renderer";
import { createParticleSimulation } from "./Simulation";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    const gl2 = canvas2Ref.current?.getContext("webgl2");
    if (!gl || !gl2) return;

    const PARTICLE_COUNT = 20000;
    let particleSimulation = createParticleSimulation(gl, PARTICLE_COUNT);

    particleSimulation.renderDistanceFunction(gl2);

    return createParticleSimulationRenderer(gl, particleSimulation);
  });

  const particleDistanceSize = 256;

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
      <canvas
        ref={canvas2Ref}
        style={{
          width: particleDistanceSize,
          height: particleDistanceSize,
          minWidth: particleDistanceSize,
          maxWidth: particleDistanceSize,
          minHeight: particleDistanceSize,
          maxHeight: particleDistanceSize,
        }}
      />
      <span>blue attracts, red detracts</span>
    </div>
  );
}

export default App;
