import chroma from "chroma-js";
import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { createFragmentComputeShader } from "./GPUCompute";
import { mouseEvents, renderLoop } from "./other/Events";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";



export const defaultConfig = {
  particleCount: 15000,
  worldScale: 15,
  buildParticles:
    `p.position = [
  Math.sin((i / max) * Math.PI * 2) / 2, 
  Math.cos((i / max) * Math.PI * 2) / 2
]
p.velocity = [0, 0]
p.gravity = 0.001
p.size = 0.1
p.friction = 0.99
p.color = chroma.hsv((i / max) * 360, 0.9, 1).gl()`,
  onParticleState: undefined as undefined | ((i: number, state: Float32Array[]) => void),
  distanceFunction:
    `float particleDistance(vec2 dir, float size) {
  float dist = length(dir);
  if (dist == 0.0) {
    return 0.0;
  }
  
  float len = -(dist / sqrt(2.0)) + 1.0;

  // repulsion
  if (dist < size) {
    return len;
  }

  // attraction
  return min(-len, 0.0);
}
  `,
};

export type SimulationConfig = typeof defaultConfig;

export const createParticleSimulation = (
  gl: WebGL2RenderingContext,
  configOverride?: SimulationConfig,
) => {
  const config = { ...defaultConfig, ...configOverride };

  const buildParticle = eval("(i, max) => { const p = {}\n " + config.buildParticles + "\n return p }") as (i: number, max: number) => any

  const particles: Array<any> = []
  globalThis.chroma = chroma
  for (let i = 0; i < config.particleCount; i++) {
    particles.push(buildParticle(i, config.particleCount))
  }


  const compute = createFragmentComputeShader(gl, particles, glsl`
    uniform vec3 mouse;
    uniform float worldScale;

    ${config.distanceFunction}

    void update(int index) {
      vec2 pos = getPosition();
      vec2 vel = getVelocity();
      vec3 color = getColor().rgb;
      float gravity = getGravity();
      float size = getSize();
      float friction = getFriction();

      float heat = 0.0001;

      const bool wrapAround = true;

      for (int i = 0; i < particleCount; i++) {
          vec2 otherPos = getPosition(i);
          vec3 otherColor = getColor(i).rgb;
          vec2 direction = pos - otherPos;
          
          //float colorDistance = cos(length(otherColor.rgb - color.gbr - color.brg));
          float attraction = particleDistance(direction, size);

          float colorDistance = cos(length(color.rgb + otherColor.rgb + attraction)*0.05)*0.5;
          attraction *= colorDistance;

          vel += direction * attraction * gravity;
      }

      pos += vel;
      vel *= friction;

      if (mouse.z != 0.0) {
        vec2 direction = pos - mouse.xy;
        float distance = length(direction);
        if (distance > 0.0) {
          direction /= distance;
        }

        vel += direction * distance * -0.001;
      }

      float bounds = worldScale;

      // wall bounce
      if (wrapAround) {
          if (pos.x > bounds) {
          pos.x = -bounds;
          } else if (pos.x < -bounds) {
          pos.x = bounds;
          }

          if (pos.y >= bounds) {
          pos.y = -bounds;
          } else if (pos.y < -bounds) {
          pos.y = bounds;
          }
      } else {
          if (pos.x > bounds) {
          pos.x = bounds;
          vel.x *= -bounds;
          } else if (pos.x < -bounds) {
          pos.x = -bounds;
          vel.x *= -bounds;
          }

          if (pos.y > bounds) {
          pos.y = bounds;
          vel.y *= -bounds;
          } else if (pos.y < -bounds) {
          pos.y = -bounds;
          vel.y *= -bounds;
          }
      }

      setPosition(pos);
      setVelocity(vel);
      
      setColor(getColor());
      setGravity(getGravity());
      setSize(getSize());
      setFriction(getFriction());
    }
  `)

  return {
    compute,
    renderDistanceFunction(gl: WebGL2RenderingContext) {
      const VERTEX = glsl`
        in vec2 pos;
        
        void main() {
          gl_Position = vec4(pos, 0, 1);
        }
        `;
      const programInfo = createProgramInfo(gl, VERTEX, glsl`
        out vec4 fragColor;
        uniform vec2 screenSize;

        ${config.distanceFunction}

        void main() {
          vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;

          float dist = particleDistance(screenPos, 0.1);
          fragColor = vec4(-dist, 0.0, dist, 1.0);
        }
      `);

      const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
        pos: {
          numComponents: 2,
          data: [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
        },
      });
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(programInfo.program);

      twgl.setUniforms(programInfo, {
        screenSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      });

      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

      twgl.drawBufferInfo(gl, bufferInfo);
    },
    update(mx: number, my: number, pressed: number) {
      compute.update({
        worldScale: config.worldScale,
        mouse: [0, 0, 0]
      })

      if (config.onParticleState) {
        for (let i = 0; i < config.particleCount; i++) {
          config.onParticleState(i, compute.getState(i));
        }
      }
    },
  };
};
