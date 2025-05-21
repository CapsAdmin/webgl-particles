import { glsl } from "../other/WebGL";

export const templateExample = glsl`CONFIG {
  return {
    layout: {
      state: 1,
    },
    fps: undefined,
  }
}

COMPUTE {
  void init(vec2 fragPos) {
    setState(random(fragPos) > 0.5 ? 1.0 : 0.0);
  }

  void update(vec2 fragPos)
  {
    float sum = 
      getState(vec2(-1.0, -1.0)) +
      getState(vec2(-1.0,  0.0)) +
      getState(vec2(-1.0,  1.0)) +
      getState(vec2( 0.0, -1.0)) +
      getState(vec2( 0.0,  1.0)) +
      getState(vec2( 1.0, -1.0)) +
      getState(vec2( 1.0,  0.0)) +
      getState(vec2( 1.0,  1.0));

    setState(float((sum == 2.0 && getState() == 1.0) || sum == 3.0));
  }
}

RENDER {
vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
  float col = getState();
  return vec4(col);
}
}`;
