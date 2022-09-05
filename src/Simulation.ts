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
  simulationCode:
    glsl`
float particleDistance(vec2 dir, float size) {
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

void update(int index) {

  vec2 pos = getPosition();
  vec2 vel = getVelocity();
  vec4 color = getColor();
  float gravity = getGravity();
  float size = getSize();
  float friction = getFriction();
  
  for (int i = 0; i < particleCount; i++) {
      if (i == index) continue;
  
      vec2 otherPos = getPosition(i);
      vec4 otherColor = getColor(i);
      vec2 direction = pos - otherPos;
      
      float attraction = particleDistance(direction, size);
      float colorDistance = cos(length(color.rgb + otherColor.rgb + attraction)*0.05)*0.5;
      attraction *= colorDistance;
      vel += direction * attraction * gravity;
  }
  
  pos += vel;
  vel *= friction;
  
  if (pos.x > worldScale) {
    pos.x = -worldScale;
  } else if (pos.x < -worldScale) {
    pos.x = worldScale;
  }
  
  if (pos.y >= worldScale) {
    pos.y = -worldScale;
  } else if (pos.y < -worldScale) {
    pos.y = worldScale;
  }
  
  setPosition(pos);
  setVelocity(vel);
  setColor(color);
  setGravity(gravity);
  setSize(size);
  setFriction(friction);
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

    ${config.simulationCode}
    
  `)

  return {
    compute,
    update(mx: number, my: number, pressed: number) {
      compute.update({
        worldScale: config.worldScale,
        //mouse: [mx, my, pressed]
      })

      if (config.onParticleState) {
        for (let i = 0; i < config.particleCount; i++) {
          config.onParticleState(i, compute.getState(i));
        }
      }
    },
  };
};
