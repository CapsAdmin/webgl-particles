import { renderLoop } from "./other/Events";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";
import { createParticleSimulation } from "./Simulation";

export const createParticleSimulationRenderer = (
    gl: WebGL2RenderingContext,
    particleSimulation: ReturnType<typeof createParticleSimulation>,
    getView?: () => readonly [number, number, number, number]
) => {
    if (!getView) {
        getView = (() => [0, 0, 1, 1]);
    }
    const VERTEX = glsl`
    
    in uint index;
    
    uniform vec4 view;
    uniform uint textureSize;

    ${particleSimulation.compute.vertexShaderHeader}

    const vec2 quad[3] = vec2[3](
        vec2(-1, -1),
        vec2(1, -1),
        vec2(-1, 1)
        
    );

    void main() {


        vec2 pos = quad[gl_VertexID];

        uint y = uint(gl_InstanceID) % textureSize;
        uint x = uint(gl_InstanceID) / textureSize;

        dataTexture0Out = texelFetch(dataTexture0, ivec2(y, x), 0);
        dataTexture1Out = texelFetch(dataTexture1, ivec2(y, x), 0);
        dataTexture2Out = texelFetch(dataTexture2, ivec2(y, x), 0);
        
        float size = (dataTexture2Out.y/2.0 + 0.01) * view.z;
        gl_Position = vec4((((pos*2.0+vec2(1.0, 1.0)) * size) + (dataTexture0Out.xy * view.z) + view.xy), 0, 1);
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

    const quadBuffer = twgl.createBufferInfoFromArrays(gl, {
        index: {
            numComponents: 1,
            data: new Uint32Array(3),
            divisor: 1,
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
        twgl.drawBufferInfo(gl, quadBuffer, gl.TRIANGLES, quadBuffer.numElements, 0, particleSimulation.compute.count);
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
