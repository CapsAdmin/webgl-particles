import { glsl } from "../other/WebGL";

export const templateExample = glsl`CONFIG {
  return {
    worldScale: 15,
    layout: {
      color: [0, 0, 0, 0],
      lol: 0,
    }
  }
}

COMPUTE {
  void init(vec2 fragPos) {
    vec4 col = vec4(random(fragPos), random(fragPos*2.0), random(fragPos*3.0), 1.0);
    setColor(col);
    setLol(0.00001);
  }

  void update(vec2 fragPos) {
    vec4 col = getColor();
    float lol = getLol();
    setColor(col);
    setLol(lol+0.01);
  }
}

RENDER {
  vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
    vec4 col = getColor();
    return col;
  }
}`;
