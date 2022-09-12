import { glsl } from "../other/WebGL";

export const hunar432ParticleLifeExample = `
// based on https://github.com/hunar4321/particle-life
// it's the main inspiration for this project!

// it's not a 100% direct port, but it's very similar
// 

CONFIG {
  const numberOfColors = 7
  let seed = 516612181188
  const atomsPerColor = 500
  // more settings in COMPUTE

  let colors = [
      [1.0, 0.0, 0.0], // red
      [0.0, 1.0, 0.0], // green
      [0.0, 0.0, 1.0], // teal / blue
      [0.0, 1.0, 1.0], // cyan
      [1.0, 0.0, 1.0], // magenta
      [1.0, 1.0, 0.0], // yellow
      [1.0, 1.0, 1.0], // lavender / white
  ]

  // increase brightness a bit
  colors = colors.map(color => color.map(c => Math.pow(c+0.25, 0.5)))

  colors.length = numberOfColors

  function mulberry32() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296.;
  }

  const rules = []
  for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
          rules.push(mulberry32() * 2 - 1);
      }
  }
  
  return {
    particleCount: atomsPerColor * numberOfColors,
    worldScale: 30,

    replacements: {
      rulesCode: \`
        const float[\${rules.length}] rules = float[\${rules.length}](\${rules.join(",\\n")});

        const vec3[\${colors.length}] colors = vec3[\${colors.length}](
          \${colors.map(c => \`vec3(\${c.join(", ")})\`).join(",\\n")}
        );

        // this is not very optimal, but I'm not sure how else to do it
        // while retaining the original code
        int colorToIndex(vec3 c) {
            for (int i = 0; i < \${colors.length}; i++) {
                if (colors[i] == c) {
                    return i;
                }
            }
            return 0;
        }

        float getRule(vec3 a, vec3 b) {
            return rules[colorToIndex(a) * \${colors.length} + colorToIndex(b)];
        }
      \`
    },
  }
}

COMPUTE {
  const float timeScale = 1.0;
  const float viscosity = 0.7;

  // this injects the code returned by CONFIG
  /*#replacements.rulesCode#*/
  
  void init(int index) {
    float f = float(index) / float(particleCount);
    
    float r1 = random(vec2(f-0.5))*2.0-1.0;
    float r2 = random(vec2(f+0.5))*2.0-1.0;

    setPosition(vec2(r1 * worldScale, r2 * worldScale));
    setSize(0.1);
    setFriction(viscosity);

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
        if (i == index) continue;
        
        vec2 otherPos = getPosition(i);
        vec4 otherColor = getColor(i);
       
        vec2 dir = pos - otherPos;
        float dist = length(dir);

        // not sure if this is correct, I believe 80 is in pixel units
        if (dist > 0.0 && dist <= 7.0) {
          vel += (getRule(color.rgb, otherColor.rgb) / dist) * dir;
        }
    }
    
    vel *= friction;
    pos += vel * deltaTime*timeScale;

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