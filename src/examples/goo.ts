import { glsl } from "../other/WebGL";

export const gooExample = glsl`
CONFIG {
  return {
    layout: {
      state: 1,
    },
    fps: undefined,
  }
}

COMPUTE {
  void init(vec2 fragPos) {
    setState(random(fragPos));
  }

const float TEMPERATURE = 2.0;
const float RADIUS = 1.33;


const float PI = 3.14159265358979323846264338327950288419716939937510582097494459230781640;


  float get_average(vec2 uv, float size)
{
    const float points = 14.0;
    const float Start = 2.0 / points;
    vec2 scale = (RADIUS * 5.0 / vec2(1024.0)) + size;

    float res = getState(uv);

    for (float point = 0.0; point < points; point++)
    {
        float r = (PI * 2.0 * (1.0 / points)) * (point + Start);
        res += getState(uv + vec2(sin(r), cos(r)) * scale);
    }

    res /= points;

    return res;
}

  void update(vec2 fragPos)
  {

    float val = getState(vec2(0));
    float avg = get_average(vec2(0), 2.5);
    setState(sin(avg * (2.3 + TEMPERATURE)) + sin(val));
  }
}

RENDER {
vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {

    float v = getState();
    v *= 0.5;
    v = v * 0.5 + 0.5;
    v = clamp(v, 0.0, 1.0);
    
    vec4 fragColor = vec4(0);
    
    fragColor.r = v*1.25;
    fragColor.g = sin(v*0.1)*5.0+v;
    fragColor.b = pow(v*5.0, 0.5)*0.26;
    fragColor.a = 1.0;
  return fragColor;
}
}`;
