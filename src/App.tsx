import React, { useEffect, useRef, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { GPU } from "gpu.js";
import { render } from "@testing-library/react";

const defaultConfig = {
  green: {
    number: 1000,
    greenXgreen: 180,
    greenXred: 180,
    greenXwhite: 180,
    greenXblue: 180,
    gXg: 80,
    gXr: 80,
    gXw: 80,
    gXb: 80,
  },
  red: {
    number: 1000,
    redXred: 180,
    redXgreen: 180,
    redXwhite: 180,
    redXblue: 180,
    rXg: 80,
    rXr: 80,
    rXw: 80,
    rXb: 80,
  },
  white: {
    number: 1000,
    whiteXwhite: 180,
    whiteXred: 180,
    whiteXgreen: 180,
    whiteXblue: 180,
    wXg: 80,
    wXr: 80,
    wXw: 80,
    wXb: 80,
  },
  blue: {
    number: 1000,
    blueXblue: 180,
    blueXwhite: 180,
    blueXred: 180,
    blueXgreen: 180,
    bXg: 80,
    bXr: 80,
    bXw: 80,
    bXb: 80,
  },
};

const useGPU = (
  canvas: HTMLCanvasElement | null,
  config: typeof defaultConfig
) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "gpu" });

    const width = 256;
    const height = 256;

    let renderParticles = gpu.createKernel(
      function (
        pixels: any,
        particles: any,
        particleCount: number,
        r: number,
        g: number,
        b: number
      ) {
        const width = this.constants.width as number;

        let sum = 0;
        for (let i = 0; i < particleCount; i++) {
          let [x, y, vx, vy] = particles[i];

          let dx = x - this.thread.x;
          let dy = y - this.thread.y;

          let d = Math.pow(Math.sqrt(dx * dx + dy * dy), 1.5);
          let v = 2; //Math.max(Math.sqrt(vx * vx + vy * vy), 1);

          sum += v / d;
        }

        sum *= 0.01;

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

        this.color(cr, cg, cb, 1);
      },
      {
        output: [width, height],
        constants: { width, height },
        graphical: true,
        tactic: "speed",
      }
    );

    const createParticles = (particleCount: number) => {
      const buffer = gpu.createKernel(
        function () {
          const width = this.constants.width as number;
          const height = this.constants.height as number;

          let x = Math.random() * width;
          let y = Math.random() * height;

          return [x, y, 0, 0];
        },
        { output: [particleCount], constants: { width, height } }
      )();

      let stepParticles = gpu.createKernel(
        function (
          particles: any,
          otherParticles: any,
          otherParticleCount: number,
          gravity: number,
          radius: number
        ) {
          const width = this.constants.width as number;
          const height = this.constants.height as number;

          let g = gravity * -0.00001;

          let [x, y, vx, vy] = particles[this.thread.x];

          let fx = 0;
          let fy = 0;

          for (let i = 0; i < otherParticleCount; i++) {
            let [x2, y2] = otherParticles[i];

            let dx = x - x2;
            let dy = y - y2;
            let d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0 && d < radius) {
              fx += dx / d;
              fy += dy / d;
            }
          }

          vx = (vx + fx * g) * 0.999;
          vy = (vy + fy * g) * 0.999;

          x += vx;
          y += vy;

          if (x > width) x = 0;
          if (x < 0) x = width;
          if (y > height) y = 0;
          if (y < 0) y = height;

          return [x, y, vx, vy];
        },
        {
          argumentTypes: {
            particles: "Array",
            otherParticles: "Array",
            otherParticleCount: "Integer",
            gravity: "Float",
            radius: "Float",
          },
          output: [particleCount],
          constants: { width, height },
        }
      );

      return {
        count: particleCount,
        buffer: buffer,
        step(
          otherParticles: { buffer: any; count: number },
          gravity: number,
          radius: number
        ) {
          this.buffer = stepParticles(
            this.buffer,
            otherParticles.buffer,
            otherParticles.count,
            gravity,
            radius
          );
        },

        render(r: number, g: number, b: number) {
          renderParticles(
            renderParticles.getPixels(),
            this.buffer,
            particleCount,
            r,
            g,
            b
          );
        },
      };
    };

    let redParticles = createParticles(config.red.number);
    let greenParticles = createParticles(config.green.number);
    let blueParticles = createParticles(config.blue.number);
    let whiteParticles = createParticles(config.white.number);
    let destroyed = false;

    // prettier-ignore
    const tick = () => {
      if (destroyed) return;


      greenParticles.step(greenParticles, config.green.greenXgreen, config.green.gXg) 
      greenParticles.step(redParticles, config.green.greenXred, config.green.gXr) 
      greenParticles.step(whiteParticles, config.green.greenXwhite, config.green.gXw) 
      greenParticles.step(blueParticles, config.green.greenXblue, config.green.gXb) 

      redParticles.step(redParticles, config.red.redXred, config.red.rXr) 
      redParticles.step(greenParticles, config.red.redXgreen, config.red.rXg) 
      redParticles.step(whiteParticles, config.red.redXwhite, config.red.rXw) 
      redParticles.step(blueParticles, config.red.redXblue, config.red.rXb) 

      whiteParticles.step(whiteParticles, config.white.whiteXwhite, config.white.wXw) 
      whiteParticles.step(greenParticles, config.white.whiteXgreen, config.white.wXg) 
      whiteParticles.step(redParticles, config.white.whiteXred, config.white.wXr) 
      whiteParticles.step(blueParticles, config.white.whiteXblue, config.white.wXb) 
      
      blueParticles.step(blueParticles, config.blue.blueXblue, config.blue.bXb) 
      blueParticles.step(greenParticles, config.blue.blueXgreen, config.blue.bXg) 
      blueParticles.step(redParticles, config.blue.blueXred, config.blue.bXr) 
      blueParticles.step(whiteParticles, config.blue.blueXwhite, config.blue.bXw) 

      redParticles.render(1, 0, 0);
      blueParticles.render(0, 0, 1);
      greenParticles.render(0, 1, 0);
      whiteParticles.render(1, 1, 1);
      
      requestAnimationFrame(tick);
    };
    tick();

    return () => {
      destroyed = true;
      gpu.destroy();
    };
  }, [canvas, config]);
};

const Slider = (props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ maxWidth: 10 }}>{props.label}</span>
      <input
        style={{ width: 350 }}
        type="range"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
      />
      <span>{props.value}</span>
    </div>
  );
};

function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  useGPU(canvasElement, config);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <canvas
        ref={(e) => {
          setCanvasElement(e);
        }}
        style={{
          flex: 1,
        }}
      />

      {Object.entries(config).map(([type, cfg]) => {
        return (
          <div key={type}>
            <h2>{type}</h2>
            {Object.entries(cfg).map(([key, value]) => {
              let min = 0;
              let max = 100;

              if (key === "number") {
                min = 0;
                max = 3000;
              } else {
                if (key.length == 3) {
                  min = -100;
                  max = 100;
                } else {
                  min = 10;
                  max = 500;
                }
              }

              return (
                <Slider
                  key={key}
                  label={key}
                  value={value}
                  min={min}
                  max={max}
                  step={0.1}
                  onChange={(value) => {
                    setConfig((config) => {
                      return {
                        ...config,
                        [type]: {
                          ...config[type as keyof typeof config],
                          [key]: value,
                        },
                      };
                    });
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default App;
