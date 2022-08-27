import React, { useEffect, useRef } from "react";
import logo from "./logo.svg";
import "./App.css";
import { GPU } from "gpu.js";

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "gpu" });

    const dim = 512;

    let runSimulation = gpu.createKernel(
      function (m: any) {
        let s = 512;
        let sum = 0;
        let h = this.thread.x;
        let k = s - 1 - this.thread.y;
        let index = h * 4 + k * 4 * s;
        let status = m[index] != 0 ? 1 : 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            let x = (h + i + s) % s;
            let y = (k + j + s) % s;
            sum += m[x * 4 + y * 4 * s] != 0 ? 1 : 0;
          }
        }
        sum -= status;
        let val = 0;
        if (status == 1 && (sum == 3 || sum == 2)) val = 1;
        if (status == 1 && (sum < 2 || sum > 3)) val = 0;
        if (status == 0 && sum == 3) val = 1;
        this.color(val, val, val);
      },
      { output: [dim, dim], graphical: true }
    );

    let getInitialBuffer = gpu.createKernel(
      function () {
        let val = Math.trunc(Math.random() * 2);
        this.color(val, val, val);
      },
      { output: [dim, dim], graphical: true }
    );
    getInitialBuffer();
    let buffer = getInitialBuffer.getPixels();

    let destroyed = false;

    const tick = () => {
      if (destroyed) return;
      runSimulation(buffer);
      buffer = runSimulation.getPixels();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      gpu.destroy();
    };
  }, [canvas]);
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useGPU(canvasRef.current);
  return (
    <canvas
      ref={canvasRef}
      style={{
        flex: 1,
        backgroundColor: "red",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

export default App;
