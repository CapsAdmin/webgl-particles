import { glsl } from "../other/WebGL";

export const templateExample = glsl`CONFIG {
  return {
    worldScale: 15
  }
}

COMPUTE {
  void init(vec2 fragPos) {
    setPosition(vec2(0.75, 1.0));
    setSize(0.5);

    /*
    setVelocity(vec2(0, 0));
    setGravity(-0.005);
    setFriction(1.0);
    setColor(vec4(hsv2rgb(vec3(f, 0.9, 1)), 1.0));*/
  }

  void update(vec2 fragPos) {
    vec2 pos = getPosition();
    float size = getSize();
    
    setPosition(pos);
    setSize(size);

    
    /*vec2 vel = getVelocity(x, y);
    vec4 color = getColor(x, y);
    float gravity = getGravity(x, y);
    float friction = getFriction(x, y);

    
    setVelocity(vel);
    setColor(color);
    setGravity(gravity);
    setFriction(friction);
    */
  }
}

RENDER {
  vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
    vec2 pos = getPosition();
    float size = getSize();
    return vec4(vec3(pos, size), 1.0);
  }
}`;
