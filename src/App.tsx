import React, { useEffect, useRef, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { GPU } from "gpu.js";

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "webgl2" });

    const particleCount = 512;
    const width = 512;
    const height = 512;

    const createParticles = (particleCount: number) => {
      return gpu.createKernel(
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
      )();
    };

    let stepParticles = gpu.createKernel(
      function (particles: any, otherParticles: any, gravity: number) {
        const width = this.constants.width as number;
        const height = this.constants.height as number;
        const particleCount = this.constants.particleCount as number;

        let [x, y, vx, vy] = particles[this.thread.x];

        let fx = 0;
        let fy = 0;

        for (let i = 0; i < particleCount; i++) {
          let [x2, y2] = otherParticles[i];

          let dx = x - x2;
          let dy = y - y2;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0 && d < 80) {
            let f = (gravity * 1) / d;

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
      function (pixels: any, particles: any, r: number, g: number, b: number) {
        const width = this.constants.width as number;
        const height = this.constants.height as number;
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

        let baseIndex = (this.thread.x + width * this.thread.y) * 4;

        let prevR = pixels[baseIndex + 0] / 255;
        let prevG = pixels[baseIndex + 1] / 255;
        let prevB = pixels[baseIndex + 2] / 255;

        let cr = sum * r;
        let cg = sum * g;
        let cb = sum * b;

        cr = prevR + cr;
        cg = prevG + cg;
        cb = prevB + cb;

        this.color(cr, cg, cb, 0);
      },
      {
        output: [width, height],
        constants: { particleCount, width, height },
        graphical: true,
        tactic: "speed",
      }
    );

    let redParticles = createParticles(particleCount);
    let blueParticles = createParticles(particleCount);
    let destroyed = false;

    const tick = () => {
      if (destroyed) return;
      redParticles = stepParticles(redParticles, blueParticles, 0.7) as any;
      blueParticles = stepParticles(blueParticles, redParticles, -0.7) as any;
      let res = renderParticles(
        renderParticles.getPixels() as any,
        redParticles,
        1,
        0,
        0
      );
      renderParticles(renderParticles.getPixels(), blueParticles, 0, 0, 1);
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
