import { glsl } from "../other/WebGL"

export const templateExample = glsl`CONFIG {
    "particleCount": 40,
    "worldScale": 15
  }
  
  COMPUTE {
    void init(int index) {
      float f = float(index) / float(particleCount);
  
      setPosition(vec2(sin(f*3.14*2.0), cos(f*3.14*2.0)) * 5.0);
      setVelocity(vec2(0, 0));
      setGravity(-0.005);
      setSize(random(vec2(f, f)));
      setFriction(0.99);
      setColor(vec4(hsv2rgb(vec3(f, 0.9, 1)), 1.0));
    }
  
    void update(int index) {
      vec2 pos = getPosition();
      vec2 vel = getVelocity();
      vec4 color = getColor();
      float gravity = getGravity();
      float size = getSize();
      float friction = getFriction();
      vec3 hsv = rgb2hsv(color.rgb);
  
      for (int i = 0; i < particleCount; i++) {
  
        if (index == i) continue;
  
          vec2 otherPos = getPosition(i);
          vec2 otherVel = getVelocity(i);
          float otherSize = getSize(i);
          
          vec2 direction = pos-otherPos;
          float len = length(direction);
  
          if (len <= 0.0) continue;
  
          if (len < size*0.9) {
            vec2 normal = normalize(direction);
            vec2 velDiff = otherVel-vel;
            vel += normal * pow(max(dot(normal, velDiff*0.5) * size, 0.0), 0.5);
          } else if (len < otherSize*0.9) {
            vec2 normal = normalize(direction);
            vec2 velDiff = otherVel-vel;
            vel += normal * pow(max(dot(normal, velDiff*0.5) * otherSize, 0.0), 0.5);
          } else {
            vel += direction * gravity / ((len*len + 0.000001));
          }
      }
      
      vel *= friction;
      pos += vel * deltaTime * 10.0;
        
      if (pos.x > worldScale) {
        pos.x = -worldScale;
      } else if (pos.x < -worldScale) {
        pos.x = worldScale;
      }
      
      if (pos.y >= worldScale) {
        pos.y = -worldScale;
      } else if (pos.y < -worldScale) {
        pos.y = worldScale;
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
      float alpha = -length(pos - screenPos)*(1.0/size)+1.0;
      return vec4(getColor().rgb, alpha);
    }
  }`