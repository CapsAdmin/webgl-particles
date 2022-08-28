import { GPU, IGPUKernelSettings } from "gpu.js";
import { useEffect, useState } from "react";
import "./App.css";

type Pixels = Array<number>;
type Transforms = Array<[number, number, number, number]>;
type Colors = Array<[number, number, number, number]>;
type Properties = Array<[number, number]>;

const kernelSettings: IGPUKernelSettings = {
  dynamicOutput: false,
  dynamicArguments: false,
};

const createParticles = (
  gpu: GPU,
  width: number,
  height: number,
  particleCount: number
) => {
  const transforms = gpu.createKernel<[number, number], {}>(
    function (width, height) {
      let x = Math.random() * width;
      let y = Math.random() * height;

      return [x, y, 0, 0];
    },
    {
      output: [particleCount],
    }
  )(width, height);

  const colors = gpu.createKernel(
    function () {
      return [Math.random(), Math.random(), Math.random()];
    },
    { output: [particleCount], ...kernelSettings }
  )();

  const properties = gpu.createKernel(
    function () {
      return [-0.6, 50];
    },
    { output: [particleCount], ...kernelSettings }
  )();

  let stepParticles = gpu.createKernel<
    [Transforms, Colors, Properties, number],
    { width: number; height: number }
  >(
    function (transforms, colors, properties, particleCount) {
      const width = this.constants.width;
      const height = this.constants.height;

      let [x, y, vx, vy] = transforms[this.thread.x];
      let [r, g, b] = colors[this.thread.x];
      let [gravity, radius] = properties[this.thread.x];

      let fx = 0;
      let fy = 0;

      for (let i = 0; i < particleCount; i++) {
        let [x2, y2] = transforms[i];
        let [otherR, otherG, otherB] = colors[i];

        let colorDistance = Math.sqrt(
          Math.pow(r - otherR, 2) +
            Math.pow(g - otherG, 2) +
            Math.pow(b - otherB, 2)
        );

        colorDistance = colorDistance * 2 - 1;
        colorDistance *= 0.1;
        let dx = x - x2;
        let dy = y - y2;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0) {
          if (d < 10) {
            fx += -dx / d;
            fy += -dy / d;
          } else if (d < radius) {
            dx = dx * -colorDistance;
            dy = dy * -colorDistance;
            fx += dx / d;
            fy += dy / d;
          }
        }
      }

      vx = (vx + fx * gravity) * 0.88;
      vy = (vy + fy * gravity) * 0.88;

      x += vx;
      y += vy;

      x = x % width;
      y = y % height;

      return [x, y, vx, vy];
    },
    {
      output: [particleCount],
      constants: { width, height },
      constantTypes: {
        width: "Integer",
        height: "Integer",
      },
      argumentTypes: {
        transforms: "Array",
        colors: "Array",
        properties: "Array",
        particleCount: "Integer",
      },
      ...kernelSettings,
    }
  );

  let stepColors = gpu.createKernel<[Colors], {}>(
    function (colors) {
      let [r, g, b] = colors[this.thread.x];

      return [r, g, b];
    },
    {
      output: [particleCount],
      argumentTypes: {
        particleColors: "Array",
      },
      ...kernelSettings,
    }
  );

  return {
    count: particleCount,
    transforms: transforms,
    colors: colors,
    properties: properties,
    update() {
      this.transforms = stepParticles(
        this.transforms,
        this.colors,
        this.properties,
        this.count
      );
    },
  };
};

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "gpu" });

    const width = 512;
    const height = 512;

    let render = gpu.createKernel<
      [Pixels, Transforms, Colors, number],
      { width: number }
    >(
      function (pixels, transforms, colors, particleCount) {
        const width = this.constants.width;

        let sum = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let i = 0; i < particleCount; i++) {
          let [x, y] = transforms[i];

          let dx = x - this.thread.x;
          let dy = y - this.thread.y;

          let d = Math.pow(Math.sqrt(dx * dx + dy * dy), 1.5);

          sum += d;
          let [pr, pg, pb] = colors[i];
          r = r + pr / d;
          g = g + pg / d;
          b = b + pb / d;
        }

        sum *= 0.0001;
        sum /= particleCount;

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
        argumentTypes: {
          pixels: "Array",
          transforms: "Array",
          colors: "Array",
          particleCount: "Integer",
        },
        ...kernelSettings,
      }
    );

    let particles = createParticles(gpu, width, height, 1000);
    let destroyed = false;

    // prettier-ignore
    const tick = () => {
      if (destroyed) return;


      particles.update() 
      render(
        render.getPixels(),
        particles.transforms,
        particles.colors,
        particles.count
      );
      
      requestAnimationFrame(tick);
    };
    tick();

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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <canvas
        ref={(e) => {
          setCanvasElement(e);
        }}
        style={{
          flex: 1,
          minWidth: 512,
          minHeight: 512,
        }}
      />
    </div>
  );
}

export default App;
