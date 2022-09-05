import chroma from "chroma-js";
import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { createFragmentComputeShader } from "./GPUCompute";
import { mouseEvents, renderLoop } from "./other/Events";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";



export const defaultConfig = {
  particleCount: 6000,
  worldScale: 8,
  buildParticles:
    `
p.position = [
  Math.random()*2-1, 
  Math.random()*2-1, 
]
p.velocity = [0, 0]
p.gravity = -0.00001
p.size = 0.05 + Math.random()*0.07
p.friction = 0.9
p.color = chroma.hsv((i / max) * 360, 0.9, 1).gl()
`,
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

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, s, -s, c);
  return m * v;
}

void update(int index) {

  vec2 pos = getPosition();
  vec2 vel = getVelocity();
  vec4 color = getColor();
  float gravity = getGravity();
  float size = getSize();
  float friction = getFriction();
  vec3 hsv = rgb2hsv(color.rgb);

  for (int i = 0; i < particleCount; i++) {
      if (i == index) continue;
  
      vec2 otherPos = getPosition(i);
      vec2 otherVel = getVelocity(i);
      vec4 otherColor = getColor(i);
      
      vec2 direction = pos-otherPos;
      float len = length(direction);

      if (len <= 0.0) continue;
        vec3 otherHSV = rgb2hsv(otherColor.rgb);

      if (len < size) {
        // collision

        vec2 normal = normalize(direction);
        vec2 velDiff = otherVel - vel;
        vel += normal * max(dot(normal, velDiff) * 1.0, 0.0);

        // transfer color for some reason
        hsv.x = hsv.x + otherHSV.x/len/100000.0;
        color.rgb = hsv2rgb(hsv);
      } else if (len < size * 1.5) {
        // keep some distance
          
        vel -= direction * gravity / ((len*len + 0.000001) * len);

      } else {
        // attraction

        // influence direction with color by rotating it
        float hueDiff = otherHSV.x-hsv.x;
        direction = rotate(direction, hueDiff);
        direction = direction+ (direction*hueDiff*-5.0);

        vel += direction * gravity / ((len*len + 0.000001) * len);
      }
  }
  vel *= friction;
  pos += vel;
  
  
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
