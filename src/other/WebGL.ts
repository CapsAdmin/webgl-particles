import * as twgl_ from "twgl.js";
export function glsl(
  literals: TemplateStringsArray,
  ...placeholders: Array<number | string>
) {
  let result = "";

  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }

  const res = result.replace(/^[\r\n]+/, "") + literals[literals.length - 1];

  return res
}

function glslDefaultHeaders(str: string) {
  let header = ""

  if (!str.includes("#version")) {
    header += "#version 300 es\n"
  }

  if (!str.includes("precision highp")) {
    header += "precision highp float;\n"
    header += "precision highp int;\n"
  }

  return header + str
}
export function createProgramInfo(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  return twgl.createProgramInfo(gl, [glslDefaultHeaders(vertex), glslDefaultHeaders(fragment)], {
    errorCallback: (err) => {
      throw err;
    },
  });
}

export const twgl = twgl_;
