import React, { useEffect, useRef, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { GPU } from "gpu.js";

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "webgl2" });

    const particleCount = 50;
    const width = 512;
    const height = 512;

    let particles = gpu.createKernel(
      function () {
        const width = this.constants.width as number;
        const height = this.constants.height as number;

        let x = Math.random() * width;
        let y = Math.random() * height;

        let vx = Math.random() * 2 - 1;
        let vy = Math.random() * 2 - 1;

        return [x, y, vx * 2, vy * 2];
      },
      { output: [particleCount], constants: { width, height } }
    );

    let stepParticles = gpu.createKernel(
      function (particles: any) {
        const width = this.constants.width as number;
        const height = this.constants.height as number;
        const particleCount = this.constants.particleCount as number;
        const g = 1;

        let [x, y, vx, vy] = particles[this.thread.x];

        let fx = 0;
        let fy = 0;

        for (let i = 0; i < particleCount; i++) {
          let [x2, y2, vx2, vy2] = particles[i];

          let dx = x - x2;
          let dy = y - y2;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0 && d < 80) {
            let f = (g * 1) / d;

            fx += f * dx * 0.5;
            fy += f * dy * 0.5;
          }
        }

        x += fx;
        y += fy;

        x = x % width;
        y = y % height;

        return [x, y, vx, vy];
      },
      { output: [particleCount], constants: { width, height, particleCount } }
    );

    let renderParticles = gpu.createKernel(
      function (particles: any) {
        const particleCount = this.constants.particleCount as number;

        let sum = 0;
        for (let i = 0; i < particleCount; i++) {
          let [x, y, vx, vy] = particles[i];

          let dx = x - this.thread.x;
          let dy = y - this.thread.y;

          let d = Math.pow(Math.sqrt(dx * dx + dy * dy), 2);
          let v = 2; //Math.max(Math.sqrt(vx * vx + vy * vy), 1);

          sum += v / d;
        }

        sum *= 0.1;

        this.color(sum, sum, sum, 1);
      },
      { output: [width, height], constants: { particleCount }, graphical: true }
    );

    let buffer = particles();
    let destroyed = false;

    const tick = () => {
      if (destroyed) return;
      buffer = stepParticles(buffer) as any;
      renderParticles(buffer);
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
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  useGPU(canvasElement);
  return (
    <canvas
      ref={(e) => {
        setCanvasElement(e);
      }}
      style={{
        flex: 1,
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

export default App;
