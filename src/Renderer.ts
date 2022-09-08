import { FramebufferInfo } from "twgl.js";
import { mouseEvents, renderLoop } from "./other/Events";
import { createParticleSimulation } from "./Simulation";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";

export const createParticleSimulationRenderer = (
    gl: WebGL2RenderingContext,
    particleSimulation: ReturnType<typeof createParticleSimulation>,
    getView?: () => readonly [number, number, number, number]
) => {
    if (!getView) {
        getView = (() => [0, 0, 1, 1]);
    }
    const VERTEX = glsl`
    
    in vec2 pos;
    
    uniform vec4 view;
    uniform int textureSize;

    ${particleSimulation.compute.vertexShaderHeader}
    
    void main() {
        int index = gl_VertexID / 6;
        int y = index % textureSize;
        int x = index / textureSize;

        dataTexture0Out = texelFetch(dataTexture0, ivec2(y, x), 0);
        dataTexture1Out = texelFetch(dataTexture1, ivec2(y, x), 0);
        dataTexture2Out = texelFetch(dataTexture2, ivec2(y, x), 0);
        
        float size = (dataTexture2Out.y/2.0 + 0.01) * view.z;
        gl_Position = vec4((((pos) * size) + (dataTexture0Out.xy * view.z) + view.xy), 0, 1);
    }
    `;

    const FRAGMENT = glsl`
    
    out vec4 fragColor;

    uniform vec2 screenSize;
    uniform vec4 view;

    ${particleSimulation.compute.vertexToFragmentHeader}
    ${particleSimulation.compute.renderShaderCode}

    //CUSTOM_RENDER_CODE_START
    ${particleSimulation.renderCode}

    void main() {
        vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;
        fragColor = render(screenPos, view.xy, view.z);
    }
    `;

    twgl.addExtensionsToContext(gl);

    const programInfo = createProgramInfo(gl, VERTEX, FRAGMENT);

    const particleQuads = new Float32Array(particleSimulation.compute.count * 12);

    for (let i = 0; i < particleSimulation.compute.count; i++) {
        const idx = i * 12;

        particleQuads[idx + 0] = -1.0;
        particleQuads[idx + 1] = -1.0;
        particleQuads[idx + 2] = 1.0;
        particleQuads[idx + 3] = -1.0;
        particleQuads[idx + 4] = -1.0;
        particleQuads[idx + 5] = 1.0;
        particleQuads[idx + 6] = -1.0;
        particleQuads[idx + 7] = 1.0;
        particleQuads[idx + 8] = 1.0;
        particleQuads[idx + 9] = -1.0;
        particleQuads[idx + 10] = 1.0;
        particleQuads[idx + 11] = 1.0;
    }

    const quadBuffer = twgl.createBufferInfoFromArrays(gl, {
        pos: {
            numComponents: 2,
            data: particleQuads,
        },
    });

    const renderSimulation = () => {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(programInfo.program);

        const dataTextures: Record<string, WebGLTexture> = {}

        let i = 0
        for (const texture of particleSimulation.compute.dataTextures) {
            dataTextures["dataTexture" + i] = texture
            i++
        }

        twgl.setUniforms(programInfo, {
            view: getView!(),
            textureSize: particleSimulation.compute.textureSize,
            screenSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
            ...dataTextures
        });

        twgl.setBuffersAndAttributes(gl, programInfo, quadBuffer);

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        twgl.drawBufferInfo(gl, quadBuffer);
        gl.disable(gl.BLEND);
    }


    const stopRendering = renderLoop((dt) => {
        particleSimulation.update(dt);
        renderSimulation()


    });

    return () => {
        stopRendering();
    };
};
