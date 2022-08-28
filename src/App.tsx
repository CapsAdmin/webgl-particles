import { GPU, IGPUKernelSettings } from "gpu.js";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

type Pixels = Array<number>;
type Transforms = Array<[number, number, number, number]>;
type Colors = Array<[number, number, number]>;
type Properties = Array<[number, number]>;

const kernelSettings: IGPUKernelSettings = {
  dynamicOutput: false,
  dynamicArguments: false,
};

function particleDistance(dx: number, dy: number) {
  let linear = Math.sqrt((dx * dx + dy * dy) / 8);

  //return Math.sin(-Math.pow(linear * 2, 0.4) * Math.PI);
  let attractionForce = Math.pow(linear, 0.2) - 1;

  let repulsionForce = Math.pow(-linear + 1, 20);
  return (attractionForce + repulsionForce) * 3.5;
}

const createParticles = (gpu: GPU, particleCount: number) => {
  const transforms = gpu.createKernel(
    function () {
      if (this.thread.x === 0) {
        return [0.7, 0.5, 0, 0];
      } else if (this.thread.x === 1) {
        return [-0.7, 0.5, 0, 0];
      } else if (this.thread.x === 2) {
        return [1, -1, 0, 0];
      }

      return [Math.random(), Math.random(), 0, 0]; // x, y, vx, vy
    },
    {
      output: [particleCount],
    }
  )();

  const colors = gpu.createKernel(
    function () {
      if (this.thread.x === 0) {
        return [1, 0, 0];
      } else if (this.thread.x === 1) {
        return [0, 1, 0];
      } else if (this.thread.x === 2) {
        return [0, 0, 1];
      }

      return [Math.random(), Math.random(), Math.random()]; // r, g, b
    },
    { output: [particleCount], ...kernelSettings }
  )();

  const properties = gpu.createKernel(
    function () {
      return [0.01, 0.0001]; // attractiveness, radius
    },
    { output: [particleCount], ...kernelSettings }
  )();

  let stepParticles = gpu.createKernel<
    [Transforms, Colors, Properties, number, number, number, number],
    {}
  >(
    function (transforms, colors, properties, particleCount, mx, my, pressed) {
      let [x, y, vx, vy] = transforms[this.thread.x];
      let [r, g, b] = colors[this.thread.x];
      let [gravity, radius] = properties[this.thread.x];
      let friction = 0.99;
      let heat = 0.0;

      const wrapAround = false;

      for (let i = 0; i < particleCount; i++) {
        if (this.thread.x !== i) {
          let [x2, y2] = transforms[i];
          let [otherR, otherG, otherB] = colors[i];

          let dx = x - x2;
          let dy = y - y2;

          let d = particleDistance(dx, dy) * gravity;

          vx += dx * d;
          vy += dy * d;
        }
      }

      if (pressed != 0) {
        let dx = x - mx;
        let dy = y - my;

        let d = particleDistance(dx, dy) * pressed * 0.1;

        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          dx /= distance;
          dy /= distance;
        }

        vx += dx * d;
        vy += dy * d;
      }

      vx *= friction;
      vy *= friction;

      vx += (Math.random() * 2 - 1) * heat;
      vy += (Math.random() * 2 - 1) * heat;

      x += vx;
      y += vy;

      // wall bounce
      if (wrapAround) {
        if (x > 1) {
          x = -1;
        } else if (x < -1) {
          x = 1;
        }

        if (y >= 1) {
          y = -1;
        } else if (y < -1) {
          y = 1;
        }
      } else {
        if (x > 1) {
          x = 1;
          vx *= -1;
        } else if (x < -1) {
          x = -1;
          vx *= -1;
        }

        if (y > 1) {
          y = 1;
          vy *= -1;
        } else if (y < -1) {
          y = -1;
          vy *= -1;
        }
      }

      // wrap around

      return [x, y, vx, vy];
    },
    {
      output: [particleCount],
      argumentTypes: {
        transforms: "Array",
        colors: "Array",
        properties: "Array",
        particleCount: "Integer",
        mx: "Float",
        my: "Float",
        pressed: "Float",
      },
      ...kernelSettings,
    }
  );

  stepParticles.addFunction(particleDistance);

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
    update(mx: number, my: number, pressed: number) {
      this.transforms = stepParticles(
        this.transforms,
        this.colors,
        this.properties,
        this.count,
        mx,
        my,
        pressed
      );
    },
  };
};

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gpu = new GPU({ canvas: canvas, mode: "gpu" });

    const width = 64;
    const height = 64;

    let render = gpu.createKernel<
      [Transforms, Colors, number],
      { width: number; height: number }
    >(
      function (transforms, colors, particleCount) {
        const width = this.constants.width;
        const height = this.constants.height;

        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (let i = 0; i < particleCount; i++) {
          let [x, y] = transforms[i];
          let [pr, pg, pb] = colors[i];

          x = x * 0.5 + 0.5;
          y = y * 0.5 + 0.5;

          x *= width;
          y *= height;

          let dx = x - this.thread.x;
          let dy = y - this.thread.y;

          let sum = 1 / Math.sqrt(dx * dx + dy * dy);

          sumR += pr * sum;
          sumG += pg * sum;
          sumB += pb * sum;
        }

        this.color(sumR, sumG, sumB, 1);
      },
      {
        output: [width, height],
        constants: { width, height },
        graphical: true,
        argumentTypes: {
          transforms: "Array",
          colors: "Array",
          particleCount: "Integer",
        },
        ...kernelSettings,
      }
    );

    let mx = 0;
    let my = 0;
    let pressed = 0;
    const mouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
      mx = mx / rect.width;
      my = my / rect.height;
      mx = mx * 2 - 1;
      my = my * 2 - 1;

      mx = mx;
      my = -my;
    };
    window.addEventListener("mousemove", mouseMove);

    const mouseDown = (e: MouseEvent) => {
      pressed = e.buttons == 4 ? -1 : 1;
    };
    window.addEventListener("mousedown", mouseDown);

    const mouseUp = (e: MouseEvent) => {
      pressed = 0;
    };
    window.addEventListener("mouseup", mouseUp);

    let particles = createParticles(gpu, 3);
    let destroyed = false;

    // prettier-ignore
    const tick = () => {
      if (destroyed) return;


      particles.update(mx, my, pressed) 
      render(
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
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [canvas]);
};

const chartData: Array<{
  name: string;
  amt: number;
  force: number;
}> = [];

for (let dist = 1; dist >= 0; dist -= 0.01) {
  let x1 = -dist;
  let y1 = -dist;

  let x2 = dist;
  let y2 = dist;

  let dx = x2 - x1;
  let dy = y2 - y1;

  let distance = particleDistance(dx, dy);
  chartData.push({
    name: (Math.round(dist * 100) / 100).toString(),
    force: distance,
    amt: dist,
  });
}

function App() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  useGPU(canvasElement);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ width: 500, height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart width={500} height={500} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[-2, 2]} />
            <Tooltip />
            <Legend />

            <Line type="monotone" dataKey="force" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
