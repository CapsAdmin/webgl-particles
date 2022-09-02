import { mouseEvents, renderLoop } from "./Events";
import { createParticleSimulation } from "./Simulation";
import { glsl, twgl } from "./WebGL";

const VERTEX = glsl`
in vec2 indexPos;
in vec2 pos;

uniform sampler2D textureTransform;
uniform sampler2D textureColor;
uniform sampler2D textureProperties;

out vec4 outColor;
out vec4 outProperties;
out vec4 outTransform;

const float SIZE = 0.005;
    
void main() {
    vec4 transform = texelFetch(textureTransform, ivec2(indexPos.y, indexPos.x), 0);
    outTransform = transform;
    outColor = texelFetch(textureColor, ivec2(indexPos.y, indexPos.x), 0);
    outProperties = texelFetch(textureProperties, ivec2(indexPos.y, indexPos.x), 0);

    gl_Position = vec4(pos * SIZE + transform.xy , 0, 1);
}
`;

const FRAGMENT = glsl`
out vec4 fragColor;

const float SIZE = 0.005;
uniform vec2 screenSize;

in vec4 outColor;
in vec4 outProperties;
in vec4 outTransform;

void main() {
    vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;
    float alpha = -length(outTransform.xy - screenPos)*(1.0/SIZE)+1.0;

    alpha = pow(alpha, 3.0);
    alpha += sin(outTransform.w);

    fragColor = vec4(outColor.rgb, alpha * outColor.a);
}
`;
export const createParticleSimulationRenderer = (gl: WebGL2RenderingContext, particleSimulation: ReturnType<typeof createParticleSimulation>) => {
    twgl.addExtensionsToContext(gl);

    const programInfo = twgl.createProgramInfo(gl, [VERTEX, FRAGMENT], {
        errorCallback: (err) => {
            throw err;
        },
    });

    const particleIndices = new Float32Array(particleSimulation.count * 12);

    for (let x = 0; x < particleSimulation.textureSize; x++) {
        for (let y = 0; y < particleSimulation.textureSize; y++) {
            const idx = (x * particleSimulation.textureSize + y) * 12;
            particleIndices[idx + 0] = x;
            particleIndices[idx + 1] = y;
            particleIndices[idx + 2] = x;
            particleIndices[idx + 3] = y;
            particleIndices[idx + 4] = x;
            particleIndices[idx + 5] = y;
            particleIndices[idx + 6] = x;
            particleIndices[idx + 7] = y;
            particleIndices[idx + 8] = x;
            particleIndices[idx + 9] = y;
            particleIndices[idx + 10] = x;
            particleIndices[idx + 11] = y;
        }
    }

    const indexInfo = twgl.createBufferInfoFromArrays(gl, {
        indexPos: {
            numComponents: 2,
            data: particleIndices,
        },
    });

    const particleQuads = new Float32Array(particleSimulation.count * 12);

    for (let i = 0; i < particleSimulation.count; i++) {
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

    const posInfo = twgl.createBufferInfoFromArrays(gl, {
        pos: {
            numComponents: 2,
            data: particleQuads,
        },
    });

    const [readMouseState, removeMouseEvents] = mouseEvents(gl.canvas);


    const stopRendering = renderLoop(() => {
        particleSimulation.update(...readMouseState());

        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.useProgram(programInfo.program);

        twgl.setUniforms(programInfo, {
            textureTransform: particleSimulation.textureTransform,
            textureColor: particleSimulation.textureColor,
            textureProperties: particleSimulation.textureProperties,
            screenSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        });

        twgl.setBuffersAndAttributes(gl, programInfo, indexInfo);
        twgl.setBuffersAndAttributes(gl, programInfo, posInfo);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        twgl.drawBufferInfo(gl, indexInfo);

        gl.disable(gl.BLEND);
    });

    return () => {
        stopRendering();
        removeMouseEvents();
    };
};
