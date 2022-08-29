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
import chroma from "chroma-js";

const PARTICLE_COUNT = 1365;

const createParticles = (gl: WebGL2RenderingContext, particleCount: number) => {
  gl.getExtension("EXT_color_buffer_float");

  const colorChannels = 4;
  const dataRows = 3;

  let textureSize = 2;
  while (textureSize * textureSize < particleCount * dataRows) {
    textureSize *= 2;
  }

  const particles = new Float32Array(textureSize * textureSize * colorChannels);

  for (let i = 0; i < particleCount; i++) {
    let O = i * (dataRows * colorChannels) - 1;

    particles[++O] = Math.random() * 2 - 1;
    particles[++O] = Math.random() * 2 - 1;
    particles[++O] = 0;
    particles[++O] = 0;

    let [r, g, b] = chroma.hsv((i / particleCount) * 360, 1, 1).gl();
    particles[++O] = r;
    particles[++O] = g;
    particles[++O] = b;
    particles[++O] = 1;

    particles[++O] = 0.00002;
    particles[++O] = 0.0001;
    particles[++O] = 0;
    particles[++O] = 0;
  }

  const textureA = createDataTexture(gl, particles, textureSize, textureSize);
  const textureB = createDataTexture(gl, particles, textureSize, textureSize);

  const program = createFragmentProgram(
    gl,
    `#version 300 es
        
      uniform sampler2D particles;
      uniform highp vec3 mouse;
      out highp vec4 fragColor;

      const highp int particleCount = ${PARTICLE_COUNT};

      const int textureSize = ${textureSize};

      highp vec4 getTransform(int index) {
        int idx = index * 3 + 0;
        return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
      }
      highp vec4 getColor(int index) {
        int idx = index * 3 + 1;
        return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
      }
      highp vec4 getProperties(int index) {
        int idx = index * 3 + 2;
        return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
      }

      highp float particleDistance(highp vec2 dir) {
        highp float linear = sqrt((dir.x * dir.x + dir.y * dir.y) / 8.0);
      
        highp float attractionForce = pow(linear, 0.2) - 1.0;
        highp float stiffness = 5000.0;
        const highp float radius = 1.0;
        highp float repulsionForce = pow(-linear + 1.0, (1.0 / radius) * 200.0);
        return attractionForce * 2.5 + repulsionForce * stiffness;
      }
      

      void updateTransform(int INDEX) {
        highp vec2 pos = getTransform(INDEX).xy;
        highp vec2 vel = getTransform(INDEX).zw;

        highp vec3 color = getColor(INDEX).rgb;

        highp float gravity = getProperties(INDEX).x;
        highp float radius = getProperties(INDEX).y;

        highp float friction = 0.9;
        highp float heat = 0.0001;

        const bool wrapAround = false;

        for (int i = 0; i < particleCount; i++) {
          highp vec2 otherPos = getTransform(i).xy;
          highp vec3 otherColor = getColor(i).rgb;
          highp vec2 direction = pos - otherPos;

          highp float colorDistance = (length(color - otherColor) / 3.0) * 0.5 + 0.5;
          highp float attraction = particleDistance(direction) * gravity;

          vel += direction * attraction * colorDistance * 3.0;
        }

        if (mouse.z != 0.0) {
          highp vec2 direction = pos - mouse.xy;
          highp float distance = length(direction);
          if (distance > 0.0) {
            direction /= distance;
          }

          highp float attraction = particleDistance(direction) * mouse.z * 0.01;

          vel += direction * attraction;
        }

        vel *= friction;

        //vx += (Math.random() * 2 - 1) * heat;
        //vy += (Math.random() * 2 - 1) * heat;

        pos += vel;

        // wall bounce
        if (wrapAround) {
          if (pos.x > 1.0) {
            pos.x = -1.0;
          } else if (pos.x < -1.0) {
            pos.x = 1.0;
          }

          if (pos.y >= 1.0) {
            pos.y = -1.0;
          } else if (pos.y < -1.0) {
            pos.y = 1.0;
          }
        } else {
          if (pos.x > 1.0) {
            pos.x = 1.0;
            vel.x *= -1.0;
          } else if (pos.x < -1.0) {
            pos.x = -1.0;
            vel.x *= -1.0;
          }

          if (pos.y > 1.0) {
            pos.y = 1.0;
            vel.y *= -1.0;
          } else if (pos.y < -1.0) {
            pos.y = -1.0;
            vel.y *= -1.0;
          }
        }

        fragColor = vec4(pos, vel);
      }

      void main() {
        int INDEX2 = int(gl_FragCoord.x) * textureSize + int(gl_FragCoord.y);
        int INDEX = INDEX2 / 3;

        if (INDEX > particleCount) {
          //discard;
        }

        int mode = INDEX2%3;

        if (mode == 0) {
          updateTransform(INDEX);
        } else if (mode == 1) {
          fragColor = getColor(INDEX);
        } else {
          fragColor = getProperties(INDEX);
        }
      }
    `
  );

  const samplerLocation = gl.getUniformLocation(program, "particles");
  const mouseLocation = gl.getUniformLocation(program, "mouse");

  const fb = gl.createFramebuffer();
  let i = 0;
  return {
    count: particleCount,
    textureSize: textureSize,
    texture: textureA,
    update(mx: number, my: number, pressed: number) {
      gl.useProgram(program);

      const writeTexture = i % 2 == 0 ? textureA : textureB;
      const readTexture = i % 2 == 0 ? textureB : textureA;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTexture);
      gl.uniform1i(samplerLocation, 0);

      gl.uniform3f(mouseLocation, mx, my, pressed);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        writeTexture,
        0
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);

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
      let idx = index * 3 + 0;
      gl.readPixels(
        idx % textureSize,
        idx / textureSize,
        3,
        1,
        gl.RGBA,
        gl.FLOAT,
        pixels
      );
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

    const width = 1024;
    const height = 1024;
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

        const int textureSize = ${particles.textureSize};

        highp vec4 getTransform(int index) {
          int idx = index * 3 + 0;
          return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
        }
        highp vec4 getColor(int index) {
          int idx = index * 3 + 1;
          return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
        }
        highp vec4 getProperties(int index) {
          int idx = index * 3 + 2;
          return texelFetch(particles, ivec2(idx%textureSize, idx/textureSize), 0);
        }

        const highp int particleCount = ${PARTICLE_COUNT};
        const highp float width = ${width}.0;
        const highp float height = ${height}.0;

        void main() {
          highp vec3 sum = vec3(0.0, 0.0, 0.0);

          for (int i = 0; i < particleCount; i++) {

            highp vec2 pos = getTransform(i).xy;

            pos = (pos * vec2(0.5) + vec2(0.5)) * vec2(width, height);

            highp vec2 direction = pos - vec2(float(gl_FragCoord.x), float(gl_FragCoord.y));

            highp float len = length(direction);
            if (len > 0.0 && len < 3.0) {
              sum += getColor(i).rgb / pow(len, 3.0);
            }
         }

          fragColor = vec4(sum, 1.0);
        }
      `
    );

    const samplerLocation = gl.getUniformLocation(program, "particles");

    const tick = () => {
      if (destroyed) return;

      particles.update(mx, my, pressed);
      particles.update(mx, my, pressed);

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

function particleDistance(dx: number, dy: number) {
  let linear = Math.sqrt((dx * dx + dy * dy) / 8);

  //return Math.sin(-Math.pow(linear * 2, 0.4) * Math.PI);
  let attractionForce = Math.pow(linear, 0.2) - 1;
  let stiffness = 3000;
  const radius = 2;
  let repulsionForce = Math.pow(-linear + 1, (1 / radius) * 200);
  return attractionForce * 2.5 + repulsionForce * stiffness;
}

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
      <canvas
        ref={(e) => {
          setCanvasElement(e);
        }}
        style={{
          backgroundColor: "purple",
        }}
      />

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
    </div>
  );
}

export default App;
