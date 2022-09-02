import chroma from "chroma-js";
import { FramebufferInfo } from "twgl.js";
import { mouseEvents, renderLoop } from "./Events";
import { glsl, twgl } from "./WebGL";

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

vec4 getTransform(int index) {
    return fetchFromIndex(transformTexture, index);
}
vec4 getColor(int index) {
    return fetchFromIndex(colorTexture, index);
}
vec4 getProperties(int index) {
    return fetchFromIndex(propertyTexture, index);
}

float particleDistance(vec2 dir) {
    float linear = sqrt((dir.x * dir.x + dir.y * dir.y) / 8.0);
    
    float attractionForce = pow(linear, 0.2) - 1.0;
    float stiffness = 100000.0;
    const float radius = 1.0;
    float repulsionForce = pow(-linear + 1.0, (1.0 / radius) * 200.0);
    return attractionForce * 2.5 + repulsionForce * stiffness;
}


vec4 updateTransform(int INDEX) {
    vec2 pos = getTransform(INDEX).xy;
    vec2 vel = getTransform(INDEX).zw;

    vec3 color = getColor(INDEX).rgb;

    vec2 props = getProperties(INDEX).xy;
    float gravity = props.x;
    float radius = props.y;

    float friction = 0.9;
    float heat = 0.0001;

    const bool wrapAround = false;

    for (int i = 0; i < particleCount; i++) {
        vec2 otherPos = getTransform(i).xy;
        vec3 otherColor = getColor(i).rgb;
        vec2 direction = pos - otherPos;
        
        float colorDistance = cos(length(otherColor.rgb - color.gbr - color.brg))*0.1;

        float attraction = particleDistance(direction) * gravity;

        vel += direction * attraction * colorDistance;
    }

    if (mouse.z != 0.0) {
        vec2 direction = pos - mouse.xy;
        float distance = length(direction);
        if (distance > 0.0) {
        direction /= distance;
        }

        float attraction = particleDistance(direction) * mouse.z * 0.01;

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

    return vec4(pos, vel);
}

void main() {
    int x = int(gl_FragCoord.y);
    int y = int(gl_FragCoord.x);

    int indexParticle = x * textureSize + y;
    if (indexParticle > particleCount) {
        discard;
    }

    transformOut = updateTransform(indexParticle);
    colorOut = getColor(indexParticle);
    propertyOut = getProperties(indexParticle);
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
        return [0.00001, 0, 0, 0];
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
