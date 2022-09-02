import * as twgl_ from "twgl.js";
export function glsl(
  literals: TemplateStringsArray,
  ...placeholders: Array<number | string>
) {
  let result = "#version 300 es\nprecision highp float;\n";
  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }
  return result.replace(/^[\r\n]+/, "") + literals[literals.length - 1];
}

export const twgl = twgl_;
