import chroma from "chroma-js";
import { FramebufferInfo } from "twgl.js";
import { mouseEvents, renderLoop } from "./other/Events";
import { glsl, twgl } from "./other/WebGL";



export const defaultConfig = {
  particleCount: 2,
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

uniform sampler2D transformTexture;
uniform sampler2D colorTexture;
uniform sampler2D propertyTexture;
  
layout(location=0) out vec4 transformOut;
layout(location=1) out vec4 colorOut;
layout(location=2) out vec4 propertyOut;

uniform int particleCount;
uniform int textureSize;

vec4 fetchFromIndex(sampler2D texture, int index) {
return texelFetch(texture, ivec2(index%textureSize, index/textureSize), 0);
}

vec4 fetchFromXY(sampler2D texture) {
return texelFetch(texture, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0);
}

vec4 getTransform(int index) {
return fetchFromIndex(transformTexture, index);
}
vec4 getColor(int index) {
return fetchFromIndex(colorTexture, index);
}
vec4 getProperties(int index) {
return fetchFromIndex(propertyTexture, index);
}

vec4 getTransform() {
return fetchFromXY(transformTexture);
}
vec4 getColor() {
return fetchFromXY(colorTexture);
}
vec4 getProperties() {
return fetchFromXY(propertyTexture);
}


${config.distanceFunction}


vec4 updateTransform() {
  vec2 pos = getTransform().xy;
  vec2 vel = getTransform().zw;
  vec3 color = getColor().rgb;
  vec4 props = getProperties();
  
  float gravity = props.x;
  float size = props.y;
  float friction = props.z;

  float heat = 0.0001;

  const bool wrapAround = true;

 

  for (int i = 0; i < particleCount; i++) {
      vec2 otherPos = getTransform(i).xy;
      vec3 otherColor = getColor(i).rgb;
      vec2 direction = pos - otherPos;
      
      //float colorDistance = cos(length(otherColor.rgb - color.gbr - color.brg));
      float attraction = particleDistance(direction, size);

      float colorDistance = sin(length(color.rgb + otherColor.rgb + attraction)*0.005)*0.5;
      //attraction *= colorDistance;

      vel += direction * attraction * gravity;
  }


  //vx += (Math.random() * 2 - 1) * heat;
  //vy += (Math.random() * 2 - 1) * heat;

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

float bounds = 10.0;

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

  return vec4(pos, vel);
}

void main() {
  int x = int(gl_FragCoord.y);
  int y = int(gl_FragCoord.x);

  int indexParticle = x * textureSize + y;
  if (indexParticle > particleCount) {
      discard;
  }

  transformOut = updateTransform();
  colorOut = getColor();
  propertyOut = getProperties();
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


  type Particle = {
    position: [number, number],
    velocity: [number, number],
    gravity: number,
    size: number,
    friction: number,
    color: [number, number, number, number]
  }
  const buildParticle = eval("(i, max) => { const p = {}\n " + config.buildParticles + "\n return p }") as (i: number, max: number) => Particle

  const particles: Particle[] = []

  globalThis.chroma = chroma

  for (let i = 0; i < config.particleCount; i++) {
    particles.push(buildParticle(i, config.particleCount))
  }

  const transformTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < config.particleCount) {
        return [
          particles[i].position[0],
          particles[i].position[1],
          particles[i].velocity[0],
          particles[i].velocity[1],
        ];
      }
    },
    gl
  );

  const colorTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < config.particleCount) {
        return particles[i].color;
      }
    },
    gl
  );

  const propertyTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < config.particleCount) {
        return [
          particles[i].gravity,
          particles[i].size,
          particles[i].friction,
          0,
        ];
      }
    },
    gl
  );

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

  let index = gl.COLOR_ATTACHMENT0;
  let framebuffers: Array<FramebufferInfo> = [];
  for (let i = 0; i < 2; i++) {
    framebuffers.push(
      twgl.createFramebufferInfo(gl, [
        {
          format: gl.RGBA32F,
          attachmentPoint: index + 0,
          attachment: transformTexture[i],
        },
        {
          format: gl.RGBA32F,
          attachmentPoint: index + 1,
          attachment: colorTexture[i],
        },
        {
          format: gl.RGBA32F,
          attachmentPoint: index + 2,
          attachment: propertyTexture[i],
        },
      ])
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

  return {
    count: config.particleCount,
    textureSize: textureSize,

    textureTransform: framebuffers[0].attachments[0],
    textureColor: framebuffers[0].attachments[1],
    textureProperties: framebuffers[0].attachments[2],

    getState(index: number) {
      return [getState(index, this.textureTransform), getState(index, this.textureColor), getState(index, this.textureProperties)] as const
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
      twgl.setUniforms(programInfo, {
        mouse: [0, 0, 0],
        transformTexture: framebuffers[0].attachments[0],
        colorTexture: framebuffers[0].attachments[1],
        propertyTexture: framebuffers[0].attachments[2],
        textureSize: textureSize,
        particleCount: config.particleCount,
      });

      twgl.drawBufferInfo(gl, bufferInfo);

      twgl.bindFramebufferInfo(gl);

      this.textureTransform = framebuffers[1].attachments[0];
      this.textureColor = framebuffers[1].attachments[1];
      this.textureProperties = framebuffers[1].attachments[2];

      framebuffers.reverse();

      if (config.onParticleState) {
        console.log("read state")
        for (let i = 0; i < config.particleCount; i++) {
          config.onParticleState(i, this.getState(i));
        }
      }
    },
  };
};
