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
import { createDataTexture, createFragmentProgram } from "./WebGLHelpers";

const PARTICLE_COUNT = 200;

function particleDistance(dx: number, dy: number) {
  let linear = Math.sqrt((dx * dx + dy * dy) / 8);

  //return Math.sin(-Math.pow(linear * 2, 0.4) * Math.PI);
  let attractionForce = Math.pow(linear, 0.2) - 1;
  let stiffness = 3000;
  const radius = 2;
  let repulsionForce = Math.pow(-linear + 1, (1 / radius) * 200);
  return attractionForce * 2.5 + repulsionForce * stiffness;
}

const createParticles = (gl: WebGL2RenderingContext, particleCount: number) => {
  gl.getExtension("EXT_color_buffer_float");

  const particles = new Float32Array(particleCount * (4 + 4 + 4));

  for (let i = 0; i < particleCount; i++) {
    let O = i * (4 + 4 + 4) - 1;

    if (i == 0) {
      particles[++O] = 0.7;
      particles[++O] = 0.5;
      particles[++O] = 0;
      particles[++O] = 0;
    } else if (i == 1) {
      particles[++O] = -0.7;
      particles[++O] = 0.5;
      particles[++O] = 0;
      particles[++O] = 0;
    } else if (i == 2) {
      particles[++O] = 1;
      particles[++O] = -1;
      particles[++O] = 0;
      particles[++O] = 0;
    } else {
      particles[++O] = Math.random() * 2 - 1;
      particles[++O] = Math.random() * 2 - 1;
      particles[++O] = 0;
      particles[++O] = 0;
    }

    if (i == 0) {
      particles[++O] = 1;
      particles[++O] = 0;
      particles[++O] = 0;
      particles[++O] = 1;
    } else if (i == 1) {
      particles[++O] = 0;
      particles[++O] = 1;
      particles[++O] = 0;
      particles[++O] = 1;
    } else if (i == 2) {
      particles[++O] = 0;
      particles[++O] = 0;
      particles[++O] = 1;
      particles[++O] = 1;
    } else {
      particles[++O] = Math.random();
      particles[++O] = Math.random();
      particles[++O] = Math.random();
      particles[++O] = 1;
    }

    particles[++O] = 0.00002;
    particles[++O] = 0.0001;
    particles[++O] = 0;
    particles[++O] = 0;
  }

  const textureA = createDataTexture(gl, particles);
  const textureB = createDataTexture(gl, particles);

  const program = createFragmentProgram(
    gl,
    `#version 300 es
        
      uniform sampler2D particles;
      uniform highp float pressed;
      uniform highp float mx;
      uniform highp float my;
      out highp vec4 fragColor;

      const highp int particleCount = ${PARTICLE_COUNT};


      highp vec4 getTransform(int index) {
        return texelFetch(particles, ivec2(index + 0, 0), 0);
      }
      highp vec4 getColor(int index) {
        return texelFetch(particles, ivec2(index + 1, 0), 0);
      }
      highp vec4 getProperties(int index) {
        return texelFetch(particles, ivec2(index + 2, 0), 0);
      }


      highp float particleDistance(highp float dx, highp float dy) {
        highp float linear = sqrt((dx * dx + dy * dy) / 8.0);
      
        highp float attractionForce = pow(linear, 0.2) - 1.0;
        highp float stiffness = 3000.0;
        const highp float radius = 2.0;
        highp float repulsionForce = pow(-linear + 1.0, (1.0 / radius) * 200.0);
        return attractionForce * 2.5 + repulsionForce * stiffness;
      }
      

      void updateTransform() {
        int INDEX = int(gl_FragCoord.x);

        highp float x = getTransform(INDEX).x;
        highp float y = getTransform(INDEX).y;
        highp float vx = getTransform(INDEX).z;
        highp float vy = getTransform(INDEX).w;

        highp float r = getColor(INDEX).r;
        highp float g = getColor(INDEX).g;
        highp float b = getColor(INDEX).b;

        highp float gravity = getProperties(INDEX).x;
        highp float radius = getProperties(INDEX).y;

        highp float friction = 0.96;
        highp float heat = 0.0001;

        const bool wrapAround = true;

        for (int i = 0; i < particleCount; i++) {
          highp float x2 = getTransform(i).x;
          highp float y2 = getTransform(i).y;

          highp float otherR = getColor(i).r;
          highp float otherG = getColor(i).g;
          highp float otherB = getColor(i).b;

          highp float dx = x - x2;
          highp float dy = y - y2;

          highp float d = particleDistance(dx, dy) * gravity;

          highp float colorDistance = sqrt(
            pow(r - otherR, 2.0) +
              pow(g - otherG, 2.0) +
              pow(b - otherB, 2.0)
          );

          colorDistance *= 2.0;

          vx += dx * d * colorDistance;
          vy += dy * d * colorDistance;
        }

        if (pressed != 0.0) {
          highp float  dx = x - mx;
          highp float dy = y - my;

          highp float d = particleDistance(dx, dy) * pressed * 0.01;

          highp float distance = sqrt(dx * dx + dy * dy);
          if (distance > 0.0) {
            dx /= distance;
            dy /= distance;
          }

          vx += dx * d;
          vy += dy * d;
        }

        vx *= friction;
        vy *= friction;

        //vx += (Math.random() * 2 - 1) * heat;
        //vy += (Math.random() * 2 - 1) * heat;

        x += vx;
        y += vy;

        // wall bounce
        if (wrapAround) {
          if (x > 1.0) {
            x = -1.0;
          } else if (x < -1.0) {
            x = 1.0;
          }

          if (y >= 1.0) {
            y = -1.0;
          } else if (y < -1.0) {
            y = 1.0;
          }
        } else {
          if (x > 1.0) {
            x = 1.0;
            vx *= -1.0;
          } else if (x < -1.0) {
            x = -1.0;
            vx *= -1.0;
          }

          if (y > 1.0) {
            y = 1.0;
            vy *= -1.0;
          } else if (y < -1.0) {
            y = -1.0;
            vy *= -1.0;
          }
        }

        int mode = int(gl_FragCoord.x)%3;

        fragColor = vec4(x, y, vx, vy);
      }

      void main() {
        int INDEX = int(gl_FragCoord.x);

        highp float x = getTransform(INDEX).x;
        highp float y = getTransform(INDEX).y;
        highp float vx = getTransform(INDEX).z;
        highp float vy = getTransform(INDEX).w;

        highp float r = getColor(INDEX).r;
        highp float g = getColor(INDEX).g;
        highp float b = getColor(INDEX).b;

        highp float gravity = getProperties(INDEX).x;
        highp float radius = getProperties(INDEX).y;

        int mode = int(gl_FragCoord.x)%3;

        if (mode == 0) {
          updateTransform();
        } else if (mode == 1) {
          fragColor = getTransform(INDEX);
        } else {
          fragColor = getTransform(INDEX);
        }
      }
    `
  );

  const samplerLocation = gl.getUniformLocation(program, "particles");

  const fb = gl.createFramebuffer();
  let i = 0;
  return {
    count: particleCount,
    texture: textureA,
    update(mx: number, my: number, pressed: number) {
      gl.useProgram(program);

      const writeTexture = i % 2 == 0 ? textureA : textureB;
      const readTexture = i % 2 == 0 ? textureB : textureA;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTexture);
      gl.uniform1i(samplerLocation, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        writeTexture,
        0
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      this.texture = writeTexture;

      i++;
      //console.log(JSON.stringify(this.getParticleState(190), null, 2));
    },
    getParticleState(index: number) {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture,
        0
      );
      const canRead =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!canRead) {
        throw new Error("Failed to read framebuffer");
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

      const pixels = new Float32Array(12);
      gl.readPixels(index * 3, 0, 3, 1, gl.RGBA, gl.FLOAT, pixels);
      let particle = {
        x: pixels[0],
        y: pixels[1],
        vx: pixels[2],
        vy: pixels[3],
        r: pixels[4],
        g: pixels[5],
        b: pixels[6],
        a: pixels[7],
        gravity: pixels[8],
        radius: pixels[9],
      };

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return particle;
    },
  };
};

const useGPU = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const width = 512;
    const height = 512;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

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

    let particles = createParticles(gl, PARTICLE_COUNT);
    let destroyed = false;

    const program = createFragmentProgram(
      gl,
      `#version 300 es
        uniform sampler2D particles;
        out highp vec4 fragColor;

        highp vec4 getTransform(int index) {
          return texelFetch(particles, ivec2(index + 0, 0), 0);
        }
        highp vec4 getColor(int index) {
          return texelFetch(particles, ivec2(index + 1, 0), 0);
        }
        highp vec4 getProperties(int index) {
          return texelFetch(particles, ivec2(index + 2, 0), 0);
        }

        void main() {
          const highp int particleCount = ${PARTICLE_COUNT};
          const highp float width = ${width}.0;
          const highp float height = ${height}.0;

          highp float sumR = 0.0;
          highp float sumG = 0.0;
          highp float sumB = 0.0;

          for (int i = 0; i < particleCount; i++) {
            highp float x = getTransform(i).x;
            highp float y = getTransform(i).y;

            highp float r = getColor(i).r;
            highp float g = getColor(i).g;
            highp float b = getColor(i).b;

            x = x * 0.5 + 0.5;
            y = y * 0.5 + 0.5;

            x *= width;
            y *= height;

            highp float dx = x - float(gl_FragCoord.x);
            highp float dy = y - float(gl_FragCoord.y);

            highp float d = sqrt(dx * dx + dy * dy);
            if (d > 0.0) {
              d = pow(d, 2.0);
              sumR += r / d;
              sumG += g / d;
              sumB += b / d;
            }
          }

          fragColor = vec4(sumR, sumG, sumB, 1.0);
        }
      `
    );

    const samplerLocation = gl.getUniformLocation(program, "particles");

    // prettier-ignore
    const tick = () => {
      if (destroyed) return;
      
      particles.update(mx, my, pressed)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, particles.texture);
      gl.uniform1i(samplerLocation, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(tick);
    };
    tick();

    return () => {
      destroyed = true;
      // gpu.destroy();
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
            <YAxis />
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
          backgroundColor: "purple",
          width: 512,
          height: 512,
        }}
      />
    </div>
  );
}

export default App;
