import { glsl } from "../other/WebGL";

export const hunar432ParticleLifeExample = glsl`
CONFIG {
    "particleCount": 1800,
    "worldScale": 15
  }
  
  COMPUTE {
  
    const vec3 RED = vec3(1.0, 0.0, 0.0);
    const vec3 GREEN = vec3(0.0, 1.0, 0.0);
    const vec3 BLUE = vec3(0.0, 0.0, 1.0); // teal
    const vec3 CYAN = vec3(0.0, 1.0, 1.0);
    const vec3 MAGENTA = vec3(1.0, 0.0, 1.0);
    const vec3 YELLOW = vec3(1.0, 1.0, 0.0);
    const vec3 WHITE = vec3(1.0, 1.0, 1.0); // lavender
  
    const vec3 colors[7]=vec3[7](   
      RED,
      GREEN,
      BLUE,
      CYAN,
      MAGENTA,
      YELLOW,
      WHITE
    );
  
    float rule(vec3 a, vec3 b, vec3 c, vec3 d) {
      if (a == c && b == d) {
        return 1.0;
      }
      return 0.0;
    }
  
    float getRule(vec3 a, vec3 b) {
      return 
        rule(a, b, GREEN, GREEN) * -0.32 +
        rule(a, b, GREEN, RED) * -0.17 +
        rule(a, b, GREEN, BLUE) * 0.34 +
        rule(a, b, RED, RED) * -0.1 +
        rule(a, b, RED, GREEN) * -0.34 +
        rule(a, b, BLUE, BLUE) * 0.15 +
        rule(a, b, BLUE, GREEN) * -0.2 +
        0.0;
    }
  
    void init(int index) {
      float f = float(index) / float(particleCount);
  
      setPosition(vec2(sin(f*3.14*2.0), cos(f*3.14*2.0)) * 1.0);
      setSize(0.1);
      setFriction(0.5);
  
      setColor(vec4(colors[int(f * 7.0)], 1.0));
    }
  
    void update(int index) {
      float gravity = getGravity();
      float size = getSize();
  
      vec2 pos = getPosition();
      vec2 vel = getVelocity();
      vec4 color = getColor();
      float friction = getFriction();
  
      for (int i = 0; i < particleCount; i++) {
          vec2 otherPos = getPosition(i);
          vec4 otherColor = getColor(i);
         
          vec2 dir = pos - otherPos;
          float dist = length(dir);
  
          if (dist > 0.0 && dist <= 80.0) {
            vel += (getRule(color.rgb, otherColor.rgb) / dist) * dir;
          }
      }
      
      vel *= friction;
      pos += vel * deltaTime;
  
      if (pos.x < -worldScale) {
        pos.x = -worldScale;
        vel.x *= -1.0;
      }
  
      if (pos.x > worldScale) {
        pos.x = worldScale;
        vel.x *= -1.0;
      }
    
      if (pos.y < -worldScale) {
        pos.y = -worldScale;
        vel.y *= -1.0;
      }
  
      if (pos.y > worldScale) {
        pos.y = worldScale;
        vel.y *= -1.0;
      }
  
      setPosition(pos);
      setVelocity(vel);
      setColor(color);
      setGravity(gravity);
      setSize(size);
      setFriction(friction);
    }
  }
  
  RENDER {
    vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
      vec2 pos = viewPos + getPosition()* zoom;
      float size = (getSize()/2.0 + 0.01) * zoom;
      float alpha = max(-length(pos - screenPos)*(1.0/size)+1.0, 0.0);
      alpha = pow(alpha, 0.5);
      return vec4(getColor().rgb, alpha);
    }
  }
`