import { glsl } from "../other/WebGL"

export const defaultExample = glsl`CONFIG {
  "particleCount": 15000,
  "worldScale": 15
}

COMPUTE {
  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, s, -s, c);
    return m * v;
  }

  void init(int index) {
    setPosition(vec2(random(vec2(float(index), float(index)))*2.0-1.0, random(vec2(float(index), float(index))*-1.0)*2.0-1.0));
    setVelocity(vec2(0, 0));
    setGravity(-0.00001);
    setSize(0.05 + random(vec2(gl_FragCoord))*0.07);
    setFriction(0.9);
    setColor(vec4(hsv2rgb(vec3(float(index) / float(particleCount), 0.9, 1)), 1.0));
  }

  void update(int index) {
    vec2 pos = getPosition();
    vec2 vel = getVelocity();
    vec4 color = getColor();
    float gravity = getGravity();
    float size = getSize();
    float friction = getFriction();
    vec3 hsv = rgb2hsv(color.rgb);

    // being red is less energetic
    float attraction = -pow(-(gravity * hsv.r * 2.0), 0.8);

    // only update 500 random particles every frame
    float baseSeed = fract(time/1000000.0) + float(index);
    float maxIterations = 500.0;
      
    for (float i = 0.0; i < maxIterations; i++) {
        float seed = (i/maxIterations) + baseSeed;
        int particleIndex = int(random(vec2(seed, seed)) * float(particleCount));

        vec2 otherPos = getPosition(particleIndex);
        vec2 otherVel = getVelocity(particleIndex);
        vec4 otherColor = getColor(particleIndex);
        
        vec2 direction = pos-otherPos;
        float len = length(direction);

        if (len <= 0.0) continue;
              
        vec3 otherHSV = rgb2hsv(otherColor.rgb);

        if (len < size) {
          // collision

          vec2 normal = normalize(direction);
          vec2 velDiff = otherVel - vel;
          vel += normal * max(dot(normal, velDiff) * 1.0, 0.0) ;

          // transfer color for some reason
          hsv.x = hsv.x + otherHSV.x/len/10000.0;
          color.rgb = hsv2rgb(hsv);
        } else if (len < size * 1.5) {
          // keep some distance
            
          vel -= direction * attraction / ((len*len + 0.000001) * len) ;

        } else {
          // attraction

          // influence direction with color by rotating it
          float hueDiff = otherHSV.x-hsv.x;
          direction = rotate(direction, hueDiff);
          direction = direction+ (direction*hueDiff*3.5);

          vel += direction * attraction / ((len*len + 0.000001) * len) ;
        }
    }
    
    vel *= friction;
    pos += vel * deltaTime * 100.0;
      
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
    float alpha = max(-length(pos - screenPos)*(1.0/size)+1.0, 0.0);
    alpha = pow(alpha, 0.5);
    return vec4(getColor().rgb, alpha);
  }
}`