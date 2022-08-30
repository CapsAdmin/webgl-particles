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

const PARTICLE_COUNT = 1000;

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

    particles[++O] = Math.sin((i / particleCount) * Math.PI * 2) / 2;
    particles[++O] = Math.cos((i / particleCount) * Math.PI * 2) / 2;
    particles[++O] = 0;
    particles[++O] = 0;

    let [r, g, b] = chroma.hsv((i / particleCount) * 360, 0.9, 1).gl();

    particles[++O] = r;
    particles[++O] = g;
    particles[++O] = b;
    particles[++O] = 1;

    particles[++O] = 0.00001;
    particles[++O] = 666;
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

      highp vec4 fetchFromIndex(int index) {
        return texelFetch(particles, ivec2(index%textureSize, index/textureSize), 0);
      }

      highp vec4 getTransform(int index) {
        return fetchFromIndex(index * 3 + 0);
      }
      highp vec4 getColor(int index) {
        return fetchFromIndex(index * 3 + 1);
      }
      highp vec4 getProperties(int index) {
        return fetchFromIndex(index * 3 + 2);
      }

      highp float particleDistance(highp vec2 dir) {
        highp float linear = sqrt((dir.x * dir.x + dir.y * dir.y) / 8.0);
      
        highp float attractionForce = pow(linear, 0.2) - 1.0;
        highp float stiffness = 5000.0;
        const highp float radius = 1.0;
        highp float repulsionForce = pow(-linear + 1.0, (1.0 / radius) * 200.0);
        return attractionForce * 2.5 + repulsionForce * stiffness;
      }

      highp vec3 rgb2hsv(highp vec3 c)
      {
        highp vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        highp vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        highp vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

          highp float d = q.x - min(q.w, q.y);
          highp float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      

      void updateTransform(int INDEX) {
        highp vec2 pos = getTransform(INDEX).xy;
        highp vec2 vel = getTransform(INDEX).zw;

        highp vec3 color = getColor(INDEX).rgb;
        highp vec3 hsv = rgb2hsv(color);

        highp vec2 props = getProperties(INDEX).xy;
        highp float gravity = props.x;
        highp float radius = props.y;

        highp float friction = 0.9;
        highp float heat = 0.0001;

        const bool wrapAround = false;

        for (int i = 0; i < particleCount; i++) {
          highp vec2 otherPos = getTransform(i).xy;
          highp vec3 otherColor = getColor(i).rgb;
          highp vec2 direction = pos - otherPos;
          
          highp vec3 otherHsv = rgb2hsv(otherColor);
          highp float colorDistance = abs(hsv.x - otherHsv.x);

          highp float attraction = particleDistance(direction) * gravity;

          vel += direction * attraction * colorDistance;
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

        int x = int(gl_FragCoord.y);
        int y = int(gl_FragCoord.x);

        int indexRGBA = x * textureSize + y;
        int indexParticle = indexRGBA;
        int mode = indexRGBA%3;

        indexParticle = indexParticle / 3;

        if (indexParticle > particleCount) {
          discard;
        }

        if (mode == 0) {
          updateTransform(indexParticle);
          //fragColor = getTransform(indexParticle);
        } else if (mode == 1) {
          fragColor = getColor(indexParticle);
        } else {
          fragColor = getProperties(indexParticle);
        }
      }
    `
  );

  const samplerLocation = gl.getUniformLocation(program, "particles");
  const mouseLocation = gl.getUniformLocation(program, "mouse");

  const getParticleState = (index: number) => {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textureA,
      0
    );
    const canRead =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!canRead) {
      throw new Error("Failed to read framebuffer");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    const transform = new Float32Array(4);
    const color = new Float32Array(4);
    const properties = new Float32Array(4);

    const readFromIndex = (offset: number, output: Float32Array) => {
      let idx = index * 3 + offset;
      let x = Math.trunc(idx / textureSize);
      let y = Math.trunc(idx % textureSize);
      gl.readPixels(y, x, 1, 1, gl.RGBA, gl.FLOAT, output);
    };

    readFromIndex(0, transform);
    readFromIndex(1, color);
    readFromIndex(2, properties);

    let particle = {
      x: transform[0],
      y: transform[1],
      vx: transform[2],
      vy: transform[3],
      r: color[0],
      g: color[1],
      b: color[2],
      a: color[3],
      gravity: properties[0],
      radius: properties[1],
    };

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return particle;
  };
  //console.log(JSON.stringify(getParticleState(3), null, 2));

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
          highp vec2 pixelPos = vec2(float(gl_FragCoord.x - 0.5), float(gl_FragCoord.y - 0.5));

          for (int i = 0; i < particleCount; i++) {

            highp vec2 pos = getTransform(i).xy;
            pos = (pos * vec2(0.5) + vec2(0.5)) * vec2(width, height);

            highp float len = length(pos - pixelPos);
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
