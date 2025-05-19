import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";

const PIXEL_COMPONENTS = 4;

const createDoubleBufferTexture = (
  size: number,
  gl: WebGL2RenderingContext
) => {
  const data = new Float32Array(size * size * PIXEL_COMPONENTS);

  let out = [];

  for (let i = 0; i < 2; i++) {
    out.push(
      twgl.createTexture(gl, {
        width: size,
        height: size,
        format: gl.RGBA,
        internalFormat: gl.RGBA32F,
        src: data,
        min: gl.NEAREST,
        mag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
      })
    );
  }

  return out;
};

type StructureType = Record<
  string,
  | number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
>;
export const createFragmentComputeShader = (
  gl: WebGL2RenderingContext,
  textureSize: number,
  shaderCode: string
) => {
  const FLOAT = 0 as number;

  const ItemStructure: StructureType = {
    position: [FLOAT, FLOAT],
    velocity: [FLOAT, FLOAT],
    color: [FLOAT, FLOAT, FLOAT, FLOAT],
    gravity: FLOAT,
    size: FLOAT,
    friction: FLOAT,
  };

  let floatCount = 0;
  let sharedShaderCode = "";
  let writeShaderCode = "";
  let renderShaderCode = "";

  let offsetData: Record<
    string,
    Record<string, { name: string; index?: number }>
  > = {};

  for (const [key, val] of Object.entries(ItemStructure)) {
    const textureIndex = Math.floor(floatCount / PIXEL_COMPONENTS);
    const textureOffset = floatCount % PIXEL_COMPONENTS;
    let len = typeof val == "number" ? 1 : val.length;

    let glslIndex = "xyzw";
    let types = ["float", "vec2", "vec3", "vec4"];

    offsetData[textureIndex] = offsetData[textureIndex] || {};

    for (let i = textureOffset; i < PIXEL_COMPONENTS; i++) {
      offsetData[textureIndex][i] = {
        name: key,
        index: len == 1 ? undefined : (textureOffset + i - textureOffset) % len,
      };
    }

    const camelCaseKey = key.charAt(0).toUpperCase() + key.slice(1);

    sharedShaderCode += `
        ${
          types[len - 1]
        } get${camelCaseKey}(vec2 offset) { return fetchFromXY(dataTexture${textureIndex}, offset).${glslIndex.substring(
      textureOffset,
      textureOffset + len
    )}; } `;

    sharedShaderCode += `
        ${
          types[len - 1]
        } get${camelCaseKey}() { return fetchFromXY(dataTexture${textureIndex}).${glslIndex.substring(
      textureOffset,
      textureOffset + len
    )}; }`;

    renderShaderCode += `
    ${
      types[len - 1]
    } get${camelCaseKey}() { return fetchFromXY(dataTexture${textureIndex}).${glslIndex.substring(
      textureOffset,
      textureOffset + len
    )}; }`;

    writeShaderCode += `
        void set${camelCaseKey}(${
      types[len - 1]
    } val) { dataTexture${textureIndex}Out.${glslIndex.substring(
      textureOffset,
      textureOffset + len
    )} = val; }`;

    floatCount += len;
  }

  const textureCount = Math.ceil(floatCount / PIXEL_COMPONENTS);

  let uniformDeclarations = "";
  for (let i = 0; i < textureCount; i++) {
    uniformDeclarations += `uniform sampler2D dataTexture${i};
    `;
  }

  let fragmendShaderOutput = uniformDeclarations;
  for (let i = 0; i < textureCount; i++) {
    fragmendShaderOutput += `layout(location=${i}) out vec4 dataTexture${i}Out;
        `;
  }

  let textureFetchFunctions = `
    vec4 fetchFromXY(sampler2D texture, vec2 offset) {
        return texelFetch(texture, ivec2(gl_FragCoord.x + offset.x, gl_FragCoord.y + offset.y), 0);
    }
    vec4 fetchFromXY(sampler2D texture) {
        return fetchFromXY(texture, vec2(0.0));
    }    
    `;

  const VERTEX = glsl`
        in vec2 pos;

        void main() {
            gl_Position = vec4(pos, 0, 1);
        }
    `;

  const FRAGMENT = glsl`    
    uniform int textureSize;
    uniform int frame;
    
    ${textureFetchFunctions}
    ${fragmendShaderOutput}
    ${sharedShaderCode}
    ${writeShaderCode}

    ${shaderCode}

    void main() {
        if (frame == 0) {
            init(gl_FragCoord.xy);
        } else {   
            update(gl_FragCoord.xy);
        }
    }
`;
  const dataTextures = [];

  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    dataTextures.push(createDoubleBufferTexture(textureSize, gl));
  }

  const program = createProgramInfo(gl, VERTEX, FRAGMENT);

  const quadBuffer = twgl.createBufferInfoFromArrays(gl, {
    pos: {
      numComponents: 2,
      data: [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
    },
  });

  let framebuffers: Array<FramebufferInfo> = [];

  for (let i = 0; i < 2; i++) {
    let attachments: AttachmentOptions[] = [];
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
      attachments.push({
        attachmentPoint: gl.COLOR_ATTACHMENT0 + textureIndex,
        attachment: dataTextures[textureIndex][i],
      });
    }
    framebuffers.push(twgl.createFramebufferInfo(gl, attachments));
  }

  const uniforms = {} as { [key: string]: any };

  const readTextures: WebGLTexture[] = [];
  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    readTextures.push(framebuffers[0].attachments[textureIndex]);
  }

  const writeTextures: WebGLTexture[] = [];
  for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
    writeTextures.push(framebuffers[1].attachments[textureIndex]);
  }

  uniforms.textureSize = textureSize;

  let frame = 0;

  return {
    textureSize: textureSize,
    dataTextures: readTextures,
    sharedShaderCode,
    renderShaderCode,
    uniformDeclarations,
    textureFetchFunctions,

    getState(index: number) {
      let state = [];
      for (const tex of this.dataTextures) {
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

        const output = new Float32Array(PIXEL_COMPONENTS);

        let idx = index;
        let x = Math.trunc(idx / textureSize);
        let y = Math.trunc(idx % textureSize);
        gl.readPixels(y, x, 1, 1, gl.RGBA, gl.FLOAT, output);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        state.push(output);
      }
      return state;
    },

    update(additionalUniforms: { [key: string]: any }) {
      gl.useProgram(program.program);

      twgl.bindFramebufferInfo(gl, framebuffers[1]);
      twgl.setBuffersAndAttributes(gl, program, quadBuffer);

      for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
        uniforms[`dataTexture${textureIndex}`] =
          framebuffers[0].attachments[textureIndex];
      }

      for (const key in additionalUniforms) {
        uniforms[key] = additionalUniforms[key];
      }

      uniforms.frame = frame;

      twgl.setUniforms(program, uniforms);

      twgl.drawBufferInfo(gl, quadBuffer);

      twgl.bindFramebufferInfo(gl);

      this.dataTextures = writeTextures;

      framebuffers.reverse();

      frame++;
    },
  };
};
