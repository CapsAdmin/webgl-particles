import { glsl } from "../other/WebGL";

export const PseudoPhysics = glsl`CONFIG {
    return {
        particleCount: 2242, 
        worldScale: 15
    }
}

COMPUTE {
void init(int index) {
    float i = float(index);
    float max = float(particleCount);
    float f = float(index) / float(particleCount) + 0.5;

    if (index == 0) {
        setColor(vec4(1,1,1,1));
        setPosition(vec2(0.0, -1.0));
        setVelocity(vec2(0.5, 5.0));
    } else if (particleCount == 2) {
        setPosition(vec2(0.5, 0.0));
        setColor(vec4(hsv2rgb(vec3(f, 0.9, 1)), 1.0));
    } else {
        float rows = 60.0;
        setPosition(vec2(mod(i, rows) - rows/2.0, floor(i / rows)) * 0.25 );
        setColor(vec4(hsv2rgb(vec3(f, 0.9, 1)), 1.0));
    }

    setSize(random(vec2(f))*0.05 + 0.15);
    setFriction(1.0);
    setGravity(-0.001);
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
        if (i == index) continue;

        vec2 otherPos = getPosition(i);
        vec2 otherVel = getVelocity(i);
        float otherSize = getSize(i);
        
        vec2 n = pos - otherPos;
        float dist = length(n);

        if (dist <= 0.0) continue;      

        float activationSelf = max(-dist + otherSize, 0.0);
        float activationOther = max(-dist + size, 0.0);

        vel += activationSelf * n * (size) * 500.0;
        vel += activationOther * n * (size) * 500.0;

        //vel += n * gravity / ((dist*dist + 0.000001) * dist) ;
    }
    
    vel *= friction;
    pos += vel * deltaTime * 0.5;
    
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

    vec3 hsv2rgb(vec3 c)
    {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
    vec2 pos = viewPos + getPosition()* zoom;
    float size = (getSize()/2.0 + 0.01) * zoom;
    float alpha = max(-length(pos - screenPos)*(1.0/size)+1.0, 0.0);
    alpha = pow(alpha, 0.5);
    return vec4(getColor().rgb * length(getVelocity())*2.0+0.25, alpha);
}
}`