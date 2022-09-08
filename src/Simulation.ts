import chroma from "chroma-js";
import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { createFragmentComputeShader } from "./GPUCompute";
import { mouseEvents, renderLoop } from "./other/Events";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";

export const balancedMatch = (str: string, pre: string) => {
  for (let i = 0; i < str.length; i++) {
    if (str.substring(i, i + pre.length) === pre) {

      i += pre.length;

      while (str[i] === " " || str[i] === "\t") {
        i++;
      }

      if (str[i] === "{") {
        let depth = 1;
        for (let j = i + 1; j < str.length; j++) {
          if (str[j] === "{") {
            depth++;
          } else if (str[j] === "}") {
            depth--;
          }
          if (depth === 0) {
            return [i + 1, j] as const
          }
        }
      }
    }
  }

  throw new Error("No matching code found for " + pre);
}

export const defaultConfig = {
  particleCount: 6000,
  worldScale: 15,
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
  shaderCode:
    glsl`

COMPUTE {
  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, s, -s, c);
    return m * v;
  }

  void init(int index) {
    setPosition(vec2(random(vec2(float(index), float(index)))*2.0-1.0, random(vec2(float(index), float(index))*-1.0)*2.0-1.0));
    setVelocity(vec2(0, 0));
    setGravity(-0.00001);
    setSize(0.05 + random(vec2(gl_FragCoord))*0.07);
    setFriction(0.9);
    setColor(vec4(hsv2rgb(vec3(float(index) / float(particleCount), 0.9, 1)), 1.0));
  }

  void update(int index) {
    vec2 pos = getPosition();
    vec2 vel = getVelocity();
    vec4 color = getColor();
    float gravity = getGravity();
    float size = getSize();
    float friction = getFriction();
    vec3 hsv = rgb2hsv(color.rgb);

    // being red is less energetic
    float attraction = -pow(-(gravity * hsv.r * 2.0), 0.8);

    // only update 500 random particles every frame
    float baseSeed = fract(time/1000000.0) + float(index);
    float maxIterations = 500.0;
      
    for (float i = 0.0; i < maxIterations; i++) {
        float seed = (i/maxIterations) + baseSeed;
        int particleIndex = int(random(vec2(seed, seed)) * float(particleCount));

        vec2 otherPos = getPosition(particleIndex);
        vec2 otherVel = getVelocity(particleIndex);
        vec4 otherColor = getColor(particleIndex);
        
        vec2 direction = pos-otherPos;
        float len = length(direction);

        if (len <= 0.0) continue;
              
        vec3 otherHSV = rgb2hsv(otherColor.rgb);

        if (len < size) {
          // collision

          vec2 normal = normalize(direction);
          vec2 velDiff = otherVel - vel;
          vel += normal * max(dot(normal, velDiff) * 1.0, 0.0) ;

          // transfer color for some reason
          hsv.x = hsv.x + otherHSV.x/len/10000.0;
          color.rgb = hsv2rgb(hsv);
        } else if (len < size * 1.5) {
          // keep some distance
            
          vel -= direction * attraction / ((len*len + 0.000001) * len) ;

        } else {
          // attraction

          // influence direction with color by rotating it
          float hueDiff = otherHSV.x-hsv.x;
          direction = rotate(direction, hueDiff);
          direction = direction+ (direction*hueDiff*3.5);

          vel += direction * attraction / ((len*len + 0.000001) * len) ;
        }
    }
    
    vel *= friction;
    pos += vel * deltaTime * 100.0;
      
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
}

RENDER {
  vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
    vec2 pos = viewPos + getPosition()* zoom;
    float size = (getSize()/2.0 + 0.01) * zoom;
    float alpha = -length(pos - screenPos)*(1.0/size)+1.0;
    alpha = pow(alpha, 0.8);
    return vec4(getColor().rgb, alpha);
  }
}
`,
};

export type SimulationConfig = typeof defaultConfig;

export const createParticleSimulation = (
  gl: WebGL2RenderingContext,
  configOverride?: SimulationConfig,
) => {
  const config = { ...defaultConfig, ...configOverride };

  const computeCode = config.shaderCode.substring(...balancedMatch(config.shaderCode, "COMPUTE"))
  const renderCode = config.shaderCode.substring(...balancedMatch(config.shaderCode, "RENDER"))

  const compute = createFragmentComputeShader(gl, config.particleCount, glsl`
    uniform vec3 mouse;
    uniform float time;
    uniform float worldScale;
    uniform float deltaTime;

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
  
    float random(vec2 co)
    {
        float a = 12.9898;
        float b = 78.233;
        float c = 43758.5453;
        float dt = dot(co.xy, vec2(a,b));
        float sn = mod(dt, 3.14);
  
        return fract(sin(sn) * c);
    }

    //CUSTOM_COMPUTE_CODE_START
    ${computeCode}
    
  `)

  return {
    compute,
    renderCode,
    update(dt: number) {
      compute.update({
        worldScale: config.worldScale,
        time: Date.now() / 1000,
        deltaTime: dt,
      })

      if (config.onParticleState) {
        for (let i = 0; i < config.particleCount; i++) {
          config.onParticleState(i, compute.getState(i));
        }
      }
    },
  };
};
