import { renderLoop } from "./other/Events";
import { createProgramInfo, glsl, twgl } from "./other/WebGL";
import { createSimulation } from "./Simulation";

export const createSimulationRenderer = (
  gl: WebGL2RenderingContext,
  simulation: ReturnType<typeof createSimulation>,
  getView?: () => readonly [number, number, number, number]
) => {
  if (!getView) {
    getView = () => [0, 0, 1, 1];
  }
  const VERTEX = glsl`
    in vec2 pos;
    
    void main() {
      gl_Position = vec4(pos, 0, 1);
    }
    `;

  const FRAGMENT = glsl`
    out vec4 fragColor;

    uniform vec2 screenSize;
    uniform vec4 view;

    ${simulation.compute.textureFetchFunctions}
    ${simulation.compute.uniformDeclarations}
    ${simulation.compute.renderShaderCode}

    //CUSTOM_RENDER_CODE_START
    ${simulation.renderCode}

    void main() {
        vec2 screenPos = (gl_FragCoord.xy/screenSize)*2.0-1.0;
        fragColor = render(screenPos, view.xy, view.z);
    }
    `;

  twgl.addExtensionsToContext(gl);

  const programInfo = createProgramInfo(gl, VERTEX, FRAGMENT);

  const quadBuffer = twgl.createBufferInfoFromArrays(gl, {
    pos: {
      numComponents: 2,
      data: [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
    },
  });

  const renderSimulation = () => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programInfo.program);

    twgl.setBuffersAndAttributes(gl, programInfo, quadBuffer);

    const dataTextures: Record<string, WebGLTexture> = {};

    let i = 0;
    for (const texture of simulation.compute.dataTextures) {
      dataTextures["dataTexture" + i] = texture;
      i++;
    }

    twgl.setUniforms(programInfo, {
      view: getView!(),
      textureSize: simulation.compute.textureSize,
      screenSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      ...dataTextures,
    });

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    twgl.drawBufferInfo(gl, quadBuffer);

    gl.disable(gl.BLEND);
  };

  const stopRendering = renderLoop((dt) => {
    simulation.update(dt);
    renderSimulation();
  });

  return () => {
    stopRendering();
  };
};
