import chroma from "chroma-js";
import { FramebufferInfo } from "twgl.js";
import { mouseEvents, renderLoop } from "./Events";
import { glsl, twgl } from "./WebGL";

const distanceFunction = `

float normalizedLength(vec2 v) {
  float len = v.x*v.x + v.y*v.y;
  if (len > 0.0) {
    return len / 8.0;
  }
  return len;
}

float normalizedLength(vec3 v) {
  float len = v.x*v.x + v.y*v.y + v.z*v.z;
  if (len > 0.0) {
    return len / 12.0;
  }
  return len;
}

float particleDistance(vec2 dir, float test) {
  float size = pow(test*2.0, 2.0)*3.0;

  float outterRadius = -normalizedLength(dir) + 1.0;
  outterRadius = pow(outterRadius, 160.0);

  float innerRadius = -normalizedLength(dir) + 1.0;
  innerRadius = pow(innerRadius + tan(size), 5.0 * (1.0 / size));
  
  return (innerRadius - outterRadius);
}


`

const vec1 = [-1, -1, -1];
const vec2 = [1, 1, 1];

const length = (vec: number[]) => {
  return (vec.reduce((acc, v) => acc + v * v, 0));
}
const sub = (vec1: number[], vec2: number[]) => {
  return vec1.map((v, i) => v - vec2[i]);
}

console.log(length(sub(vec1, vec2)));


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


${distanceFunction}


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
        float colorDistance = sin(length(otherColor.rgb + color.rgb + otherColor.brg + color.brg));
        float attraction = particleDistance(direction, size);

        vel += direction * attraction * gravity * colorDistance * 0.05;
    }

  

    vel *= friction;
    if (mouse.z != 0.0) {
      vec2 direction = pos - mouse.xy;
      float distance = length(direction);
      if (distance > 0.0) {
        direction /= distance;
      }

      float attraction = particleDistance(direction, size) * mouse.z;

      vel += direction * attraction * 10000000.0;
  }
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

export const createParticleSimulation = (
  gl: WebGL2RenderingContext,
  particleCount: number
) => {
  let textureSize = 2;
  while (textureSize * textureSize < particleCount) {
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

  const transformTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < particleCount) {
        return [
          Math.sin((i / particleCount) * Math.PI * 2) / 2,
          Math.cos((i / particleCount) * Math.PI * 2) / 2,
          0,
          0,
        ];
      }
    },
    gl
  );

  const colorTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < particleCount) {
        let [r, g, b] = chroma.hsv((i / particleCount) * 360, 0.9, 1).gl();
        return [r, g, b, 1];
      }
    },
    gl
  );

  const propertyTexture = createDoubleBufferTexture(
    textureSize,
    (i) => {
      if (i < particleCount) {
        return [0.002, 0.01, 0.8, 0];
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

  const getParticleState = (index: number, tex: WebGLTexture) => {
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
    count: particleCount,
    textureSize: textureSize,

    textureTransform: framebuffers[0].attachments[0],
    textureColor: framebuffers[0].attachments[1],
    textureProperties: framebuffers[0].attachments[2],

    renderDistanceFunction(gl: WebGL2RenderingContext) {

      const programInfo = twgl.createProgramInfo(gl, [VERTEX, glsl`
        out vec4 fragColor;
        uniform vec2 screenSize;

        ${distanceFunction}


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
        mouse: [mx, my, pressed],
        transformTexture: framebuffers[0].attachments[0],
        colorTexture: framebuffers[0].attachments[1],
        propertyTexture: framebuffers[0].attachments[2],
        textureSize: textureSize,
        particleCount: particleCount,
      });

      twgl.drawBufferInfo(gl, bufferInfo);

      twgl.bindFramebufferInfo(gl);

      this.textureTransform = framebuffers[1].attachments[0];
      this.textureColor = framebuffers[1].attachments[1];
      this.textureProperties = framebuffers[1].attachments[2];

      framebuffers.reverse();
    },
  };
};
