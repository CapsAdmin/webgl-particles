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
    uniform sampler2D textureTransform;
    uniform sampler2D textureColor;
    uniform sampler2D textureProperties;
    uniform int textureSize;
    
    out vec4 outColor;
    out vec4 outProperties;
    out vec4 outTransform;
    
    void main() {
        int index = gl_VertexID / 6;
        int y =  index % textureSize;
        int x = index / textureSize;

        outTransform = texelFetch(textureTransform, ivec2(y, x), 0);
        outColor = texelFetch(textureColor, ivec2(y, x), 0);
        outProperties = texelFetch(textureProperties, ivec2(y, x), 0);
        
        float size = (outProperties.y/2.0 + 0.01) * view.z;
        gl_Position = vec4((((pos) * size) + (outTransform.xy * view.z) + view.xy), 0, 1);
    }
    `;

    const FRAGMENT = glsl`
    out vec4 fragColor;
    
    uniform vec2 screenSize;
    
    uniform vec4 view;

    in vec4 outColor;
    in vec4 outProperties;
    in vec4 outTransform;
    
    void main() {
        float size = (outProperties.y/2.0 + 0.01) * view.z;
        vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;
        vec2 pos = outTransform.xy * view.z;
        pos += view.xy;
        float alpha = -length(pos - screenPos)*(1.0/size)+1.0;
    
        alpha = pow(alpha, 0.8);
    
        fragColor = vec4(outColor.rgb, alpha);
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

        twgl.setUniforms(programInfo, {
            view: getView!(),
            textureSize: particleSimulation.compute.textureSize,
            textureTransform: particleSimulation.compute.dataTextures[0],
            textureColor: particleSimulation.compute.dataTextures[1],
            textureProperties: particleSimulation.compute.dataTextures[2],
            screenSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
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
