import { glsl } from "../other/WebGL";

export const collisionExample = glsl`CONFIG {
    return {
        particleCount: 2, 
        worldScale: 15
    }
}

COMPUTE {

float scale(float s) {
    return pow(s, 0.6)*10.0;
}

void init(int index) {
    float f = float(index) / float(particleCount);

    if (index == 0) {
        setPosition(vec2(1.0, 0.5));    
        setVelocity(vec2(0.0, 0));
    } else if (index == 1) {
        setPosition(vec2(0, 0));
        setVelocity(vec2(0, 0));
    } else {
        setPosition(vec2(mod(float(index), 2.0) * 1.0, float(index/2)) * 2.0);    
    }

    

    float size = random(vec2(f, f))*0.2 + 0.1;
    setGravity(size*1.0);
    setSize(size);
    setFriction(1.0);
    setColor(vec4(hsv2rgb(vec3(f, 0.9, 1)), 1.0));
}

vec2 computeCollision(vec2 pos, vec2 otherPos, float size, vec2 vel, vec2 otherVel) {

    vec2 n = pos - otherPos;
    float dist = length(n);

    if (dist <= 0.0) return vec2(0);      

    // this will be a value from 0 to 1 and back to 0
    // center is 1
    float a = -dist + size; 

    if (a > 1.0) {
        a = 1.0;
    } else if (a < 0.0) {
        a = 0.0;
    }

    // make it activate much faster
    a = pow(a, 0.0001);

    vec2 force = vel; 

          // Find unit normal vector
          vec2 un = n * (1.0/dist);

          // Find unit tangent vector
          vec2 ut = vec2(un.x, un.y); 

          // Project velocities onto the unit normal and unit tangent vectors
          float v1n = dot(un, vel);
          float v1t = dot(ut, vel);

          float v2n = dot(un, otherVel);
          float v2t = dot(ut, otherVel);

          vec2 v1nTag = un * v2n;
          vec2 v1tTag = ut * v1t;

          vec2 v2nTag = un * v1n;
          vec2 v2tTag = ut * v2t;

          // Update velocities

        force = (v1nTag - v1tTag);   
          force *= 1.0 - 0.018;// collision loss
            




    return force * a;
}


const float g = 0.08;
const float speed = 0.5;

void update(int index) {
    vec2 pos = getPosition();
    vec2 vel = getVelocity();
    vec4 color = getColor();
    float gravity = getGravity();
    float size = getSize();
    float friction = getFriction();


    float mass = gravity;
    
    vec2 force = vec2(0);
        pos += vel * speed;


    for (int i = 0; i < particleCount; i++) {
        if (i == index) continue;

        vec2 otherPos = getPosition(i);
        vec2 otherVel = getVelocity(i);
        float otherSize = getSize(i);
        float otherGravity = getGravity(i);
        float otherMass = otherGravity;
        
        vel += computeCollision(pos, otherPos, size, vel, otherVel);
        vel -= computeCollision(otherPos, pos, otherSize, otherVel, vel);
        

        //vel += computeCollision(pos, otherPos, otherSize, otherVel, vel);

        vec2 d = otherPos - pos;
            
        // prevents energy from increasing when going inside
        if (length(d) > size) {
            float distSq = d.x*d.x + d.y*d.y;

            force += d * (g * otherMass) / (distSq * sqrt(distSq + 0.15));
        } else {
                    vec2 n = otherPos - pos;

                    float dist = length(n);
                      vec2 mtd = n * ((size - dist) / dist);

                      pos -= mtd*0.5;
                      force *= 0.0;

        }


    }

    vel += force*speed;

    vel *= friction;
    
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
    float size = (getSize()/2.0 ) * zoom;
    float alpha = max(-length(pos - screenPos)*(1.0/size)+1.0, 0.0);
    alpha = pow(alpha, 0.5);
    return vec4(getColor().rgb, alpha);
}`