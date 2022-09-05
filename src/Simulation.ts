import chroma from "chroma-js";
import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { mouseEvents, renderLoop } from "./other/Events";
import { glsl, twgl } from "./other/WebGL";



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
  onParticleState: undefined as undefined | ((i: number, state: readonly [Float32Array, Float32Array, Float32Array]) => void),
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
const FLOAT = 0 as number
const ParticleStructure = {
  position: [FLOAT, FLOAT],
  velocity: [FLOAT, FLOAT],
  color: [FLOAT, FLOAT, FLOAT, FLOAT],
  gravity: FLOAT,
  size: FLOAT,
  friction: FLOAT,
} as const

let floatCount = 0;
let sharedShaderCode = ""
let writeShaderCode = ""

let particleIndexToOffset: Record<string, Record<string, { name: string, index?: number }>> = {}

for (const [key, val] of Object.entries(ParticleStructure)) {
  const textureIndex = Math.floor(floatCount / 4)
  const textureOffset = floatCount % 4
  let len = (typeof val == "number" ? 1 : val.length)

  let glslIndex = "xyzw"
  let types = ["float", "vec2", "vec3", "vec4"]

  particleIndexToOffset[textureIndex] = particleIndexToOffset[textureIndex] || {}

  for (let i = textureOffset; i < 4; i++) {
    particleIndexToOffset[textureIndex][i] = { name: key, index: len == 1 ? undefined : (textureOffset + i - textureOffset) % len }
  }

  sharedShaderCode +=
    `
  ${types[len - 1]} get${key.charAt(0).toUpperCase() + key.slice(1)}(int i) {
    return fetchFromIndex(dataTexture${textureIndex}, i).${glslIndex.substring(textureOffset, textureOffset + len)};
  }
`

  sharedShaderCode +=
    `
${types[len - 1]} get${key.charAt(0).toUpperCase() + key.slice(1)}() {
return fetchFromXY(dataTexture${textureIndex}).${glslIndex.substring(textureOffset, textureOffset + len)};
}
`

  writeShaderCode +=
    `
  void set${key.charAt(0).toUpperCase() + key.slice(1)}(${types[len - 1]} val) {
    dataTexture${textureIndex}Out.${glslIndex.substring(textureOffset, textureOffset + len)} = val;
  }
  `

  floatCount += len
}

const textureCount = Math.ceil(floatCount / 4)

let fragmentShaderHeader = ""
for (let i = 0; i < textureCount; i++) {
  fragmentShaderHeader += `uniform sampler2D dataTexture${i};
`
}

const fragmentShader = sharedShaderCode

let vertexShaderHeader = fragmentShaderHeader
for (let i = 0; i < textureCount; i++) {
  vertexShaderHeader += `layout(location=${i}) out vec4 dataTexture${i}Out;
`
}

export const createParticleSimulation = (
  gl: WebGL2RenderingContext,
  configOverride?: SimulationConfig,
) => {
  const config = { ...defaultConfig, ...configOverride };

  const VERTEX = glsl`
in vec2 pos;

void main() {
  gl_Position = vec4(pos, 0, 1);
}
`;
  const FRAGMENT = glsl`    
uniform vec3 mouse;
uniform int particleCount;
uniform int textureSize;
uniform float worldScale;

vec4 fetchFromIndex(sampler2D texture, int index) {
  return texelFetch(texture, ivec2(index%textureSize, index/textureSize), 0);
}
  
vec4 fetchFromXY(sampler2D texture) {
  return texelFetch(texture, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0);
}
  
${vertexShaderHeader}
${sharedShaderCode}
${writeShaderCode}
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

void main() {
  int x = int(gl_FragCoord.y);
  int y = int(gl_FragCoord.x);

  int indexParticle = x * textureSize + y;
  if (indexParticle > particleCount) {
      discard;
  }

  update(indexParticle);
}
`;

  let textureSize = 2;
  while (textureSize * textureSize < config.particleCount) {
    textureSize *= 2;
  }

  const createDoubleBufferTexture = (
    size: number,
    init: (i: number) => [number, number, number, number] | undefined,
    gl: WebGL2RenderingContext
  ) => {
    const data = new Float32Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const arr = init(i);
      if (!arr) {
        break;
      }
      let O = i * 4 - 1;

      data[++O] = arr[0];
      data[++O] = arr[1];
      data[++O] = arr[2];
      data[++O] = arr[3];
    }

    let out = [];

    for (let i = 0; i < 2; i++) {
      out.push(
        twgl.createTexture(gl, {
          width: size,
          height: size,
          format: gl.RGBA,
          internalFormat: gl.RGBA32F,
          type: gl.FLOAT,
          src: data,
          min: gl.NEAREST,
          mag: gl.NEAREST,
          wrap: gl.CLAMP_TO_EDGE,
        })
      );
    }

    return out;
  };

  type Particle = typeof ParticleStructure

  const buildParticle = eval("(i, max) => { const p = {}\n " + config.buildParticles + "\n return p }") as (i: number, max: number) => Particle

  const particles: Array<Particle> = []

  globalThis.chroma = chroma

  for (let i = 0; i < config.particleCount; i++) {
    particles.push(buildParticle(i, config.particleCount))
  }
  const dataTextures = []
  const getValue = (particleIndex: number, textureIndex: number, offset: number) => {
    const lookup = particleIndexToOffset[textureIndex]
    const data = lookup[offset]
    const key = data.name as keyof typeof particles[number]
    const val = particles[particleIndex][key]
    if (typeof data.index === "number") {
      return (val as any)[data.index]
    }
    return val
  }

  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    dataTextures.push(createDoubleBufferTexture(
      textureSize,
      (particleIndex) => {
        if (particleIndex < config.particleCount) {
          return [
            getValue(particleIndex, textureIndex, 0),
            getValue(particleIndex, textureIndex, 1),
            getValue(particleIndex, textureIndex, 2),
            getValue(particleIndex, textureIndex, 3),
          ];
        }
      },
      gl
    ))
  }

  const programInfo = twgl.createProgramInfo(gl, [VERTEX, FRAGMENT], {
    errorCallback: (err) => {
      throw err;
    },
  });

  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    pos: {
      numComponents: 2,
      data: [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
    },
  });

  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);


  let framebuffers: Array<FramebufferInfo> = [];

  for (let i = 0; i < 2; i++) {
    let attachments: AttachmentOptions[] = []
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
      attachments.push({
        attachmentPoint: gl.COLOR_ATTACHMENT0 + textureIndex,
        attachment: dataTextures[textureIndex][i],
      })
    }
    framebuffers.push(
      twgl.createFramebufferInfo(gl, attachments)
    );
  }

  const getState = (index: number, tex: WebGLTexture) => {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0
    );
    const canRead =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!canRead) {
      throw new Error("Failed to read framebuffer");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    const output = new Float32Array(4);

    let idx = index;
    let x = Math.trunc(idx / textureSize);
    let y = Math.trunc(idx % textureSize);
    gl.readPixels(y, x, 1, 1, gl.RGBA, gl.FLOAT, output);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return output;
  };

  const uniforms = {} as { [key: string]: any }
  const readTextures: WebGLTexture[] = []
  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    readTextures.push(framebuffers[0].attachments[textureIndex])
  }

  const writeTextures: WebGLTexture[] = []
  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    writeTextures.push(framebuffers[1].attachments[textureIndex])
  }

  uniforms.textureSize = textureSize
  uniforms.particleCount = config.particleCount
  uniforms.worldScale = config.worldScale

  return {
    count: config.particleCount,
    textureSize: textureSize,
    dataTextures: readTextures,

    getState(index: number) {
      return [getState(index, this.dataTextures[0]), getState(index, this.dataTextures[1]), getState(index, this.dataTextures[2])] as const
    },

    renderDistanceFunction(gl: WebGL2RenderingContext) {

      const programInfo = twgl.createProgramInfo(gl, [VERTEX, glsl`
        out vec4 fragColor;
        uniform vec2 screenSize;

        ${config.distanceFunction}


        void main() {
          vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;

          float dist = particleDistance(screenPos, 0.1);
          fragColor = vec4(-dist, 0.0, dist, 1.0);
        }
      `], {
        errorCallback: (err) => {
          throw err;
        },
      });

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
      gl.useProgram(programInfo.program);

      twgl.bindFramebufferInfo(gl, framebuffers[1]);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      uniforms.mouse = [0, 0, 0]

      for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
        uniforms[`dataTexture${textureIndex}`] = framebuffers[0].attachments[textureIndex]
      }

      twgl.setUniforms(programInfo, uniforms);

      twgl.drawBufferInfo(gl, bufferInfo);

      twgl.bindFramebufferInfo(gl);

      this.dataTextures = writeTextures

      framebuffers.reverse();

      if (config.onParticleState) {
        for (let i = 0; i < config.particleCount; i++) {
          config.onParticleState(i, this.getState(i));
        }
      }
    },
  };
};
