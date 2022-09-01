export function glsl(
  literals: TemplateStringsArray,
  ...placeholders: Array<number | string>
) {
  let result = "";
  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }
  return result.replace(/^[\r\n]+/, "") + literals[literals.length - 1];
}

import * as twgl_ from "twgl.js";

export const twgl = twgl_;
