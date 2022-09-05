import chroma from "chroma-js";
import { AttachmentOptions, FramebufferInfo } from "twgl.js";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";


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


type StructureType = Record<string, number | [number, number] | [number, number, number] | [number, number, number, number]>
export const createFragmentComputeShader = (
    gl: WebGL2RenderingContext,
    items: StructureType[],
    shaderCode: string,
) => {
    const particleCount = items.length
    const FLOAT = 0 as number

    const ItemStructure: StructureType = {
        position: [FLOAT, FLOAT],
        velocity: [FLOAT, FLOAT],
        color: [FLOAT, FLOAT, FLOAT, FLOAT],
        gravity: FLOAT,
        size: FLOAT,
        friction: FLOAT,
    }

    type Item = typeof ItemStructure

    let floatCount = 0;
    let sharedShaderCode = ""
    let writeShaderCode = ""

    let offsetData: Record<string, Record<string, { name: string, index?: number }>> = {}

    for (const [key, val] of Object.entries(ItemStructure)) {
        const textureIndex = Math.floor(floatCount / 4)
        const textureOffset = floatCount % 4
        let len = (typeof val == "number" ? 1 : val.length)

        let glslIndex = "xyzw"
        let types = ["float", "vec2", "vec3", "vec4"]

        offsetData[textureIndex] = offsetData[textureIndex] || {}

        for (let i = textureOffset; i < 4; i++) {
            offsetData[textureIndex][i] = { name: key, index: len == 1 ? undefined : (textureOffset + i - textureOffset) % len }
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

    let vertexShaderHeader = fragmentShaderHeader
    for (let i = 0; i < textureCount; i++) {
        vertexShaderHeader += `layout(location=${i}) out vec4 dataTexture${i}Out;
        `
    }

    const VERTEX = glsl`
        in vec2 pos;

        void main() {
            gl_Position = vec4(pos, 0, 1);
        }
    `;

    const FRAGMENT = glsl`    
    uniform int particleCount;
    uniform int textureSize;

    vec4 fetchFromIndex(sampler2D texture, int index) {
        return texelFetch(texture, ivec2(index%textureSize, index/textureSize), 0);
    }
    
    vec4 fetchFromXY(sampler2D texture) {
        return texelFetch(texture, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0);
    }
    
    ${vertexShaderHeader}
    ${sharedShaderCode}
    ${writeShaderCode}

    ${shaderCode}

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
    while (textureSize * textureSize < particleCount) {
        textureSize *= 2;
    }


    const dataTextures = []
    console.log(items)
    const getValue = (particleIndex: number, textureIndex: number, offset: number) => {
        const lookup = offsetData[textureIndex]
        const data = lookup[offset]
        const key = data.name as keyof typeof items[number]
        const val = items[particleIndex][key]

        if (typeof data.index === "number") {
            return (val as any)[data.index]
        }
        return val
    }

    for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
        dataTextures.push(createDoubleBufferTexture(
            textureSize,
            (particleIndex) => {
                if (particleIndex < particleCount) {
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

    const program = createProgramInfo(gl, VERTEX, FRAGMENT);

    const quadBuffer = twgl.createBufferInfoFromArrays(gl, {
        pos: {
            numComponents: 2,
            data: [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
        },
    });

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
    uniforms.particleCount = particleCount

    return {
        count: particleCount,
        textureSize: textureSize,
        dataTextures: readTextures,

        getState(index: number) {
            let state = []
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

                const output = new Float32Array(4);

                let idx = index;
                let x = Math.trunc(idx / textureSize);
                let y = Math.trunc(idx % textureSize);
                gl.readPixels(y, x, 1, 1, gl.RGBA, gl.FLOAT, output);

                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                state.push(output)
            }
            return state
        },

        update(additionalUniforms: { [key: string]: any }) {
            gl.useProgram(program.program);

            twgl.bindFramebufferInfo(gl, framebuffers[1]);
            twgl.setBuffersAndAttributes(gl, program, quadBuffer);

            for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
                uniforms[`dataTexture${textureIndex}`] = framebuffers[0].attachments[textureIndex]
            }

            for (const key in additionalUniforms) {
                uniforms[key] = additionalUniforms[key]
            }

            twgl.setUniforms(program, uniforms);

            twgl.drawBufferInfo(gl, quadBuffer);

            twgl.bindFramebufferInfo(gl);

            this.dataTextures = writeTextures

            framebuffers.reverse();
        },
    };
};
