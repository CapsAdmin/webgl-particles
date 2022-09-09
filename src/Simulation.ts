import { createFragmentComputeShader } from "./GPUCompute";
import { glsl } from "./other/WebGL";

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
export const createParticleSimulation = (
  gl: WebGL2RenderingContext,
  code: string,
  onParticleState?: (i: number, state: Float32Array[]) => void,
) => {

  const computeCode = code.substring(...balancedMatch(code, "COMPUTE"))
  const renderCode = code.substring(...balancedMatch(code, "RENDER"))
  const jsonConfig = JSON.parse("{" + code.substring(...balancedMatch(code, "CONFIG")) + "}")

  const compute = createFragmentComputeShader(gl, jsonConfig.particleCount, glsl`
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
    jsonConfig,
    update(dt: number) {
      compute.update({
        worldScale: jsonConfig.worldScale,
        time: Date.now() / 1000,
        deltaTime: dt,
      })

      if (onParticleState) {
        for (let i = 0; i < jsonConfig.particleCount; i++) {
          onParticleState(i, compute.getState(i));
        }
      }
    },
  };
};
