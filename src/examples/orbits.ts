import { glsl } from "../other/WebGL";

export const orbitsExample = glsl`

CONFIG {
    "particleCount": 9,
    "worldScale": 15
}

COMPUTE {
    // not very accurate.. 
    // I got the solar system data from https://bl.ocks.org/vasturiano/54dd054d22be863da5afe2db02e033e2 
    // but I don't know what the gravitational constant of d3 is and it seems like earth's moon does not retain its orbit around the earth

    float scale(float s) {
        return pow(s, 0.6)*10.0;
    }

    void init(int index) {
        float i = float(index);
        float max = float(particleCount);
        float f = float(index) / float(particleCount) + 0.5;

        if (index == 0) {
            // sun
            setColor(vec4(1, 1, 0.3333333333333333, 1.0));
            setSize(scale(0.0025));
            setPosition(vec2(0, 0));
            setVelocity(vec2(0, 0));
            setGravity(1.0);
        } else if (index == 1) {
            // mercury
            setColor(vec4(0.8313725490196079, 0.8, 0.7725490196078432, 1.0));
            setSize(scale(0.00000851063829787234));
            setPosition(vec2(0.003620446016244984, -0.20741521335691096));
            setVelocity(vec2(0.032982937100626275, 0.0005757193086147483));
            setGravity(1.7e-7);
        } else if (index == 2) {
            // venus
            setColor(vec4(0.6, 0.8, 0.19607843137254902, 1.0));
            setSize(scale(0.000021276595744680852));
            setPosition(vec2(0.0067117499224233915, -0.3845158955308887));
            setVelocity(vec2(0.02422436945313721, 0.00042283794164964066));
            setGravity(0.00000245);
        } else if (index == 3) {
            // earth
            setColor(vec4(0, 0.4980392156862745, 1, 1.0));
            setSize(scale(0.000022872340425531915));
            setPosition(vec2(0.009283194913448676, -0.5318338804023358));
            setVelocity(vec2(0.020597837617471138, 0.0003595365929938413));
            setGravity(0.000003);
        } else if (index == 4) {
            // moon
            setColor(vec4(0.6588235294117647, 0.6588235294117647, 0.6588235294117647, 1.0));
            setSize(scale(0.000006382978723404255));
            setPosition(vec2(0.009307331220223642, -0.5332166484913818));
            setVelocity(vec2(0.021297511372090204, 0.0003717494438092869));
            setGravity(3.7e-8);
        } else if (index == 5) {
            // mars
            setColor(vec4(1, 0.4666666666666667, 0, 1.0));
            setSize(scale(0.000012234042553191489));
            setPosition(vec2(0.014147589048095783, -0.8105148337331597));
            setVelocity(vec2(0.016685112781379935, 0.00029123972693361985));
            setGravity(3.2e-7);
        } else if (index == 6) {
            // jupiter
            setColor(vec4(0.8509803921568627, 0.5294117647058824, 0.09803921568627451, 1.0));
            setSize(scale(0.00025372340425531913));
            setPosition(vec2(0.04830046313467346, -2.767131679733353));
            setVelocity(vec2(0.009030144857506509, 0.00015762176479898623));
            setGravity(0.000955);
        } else if (index == 7) {
            // saturn
            setColor(vec4(0.7098039215686275, 0.6509803921568628, 0.25882352941176473, 1.0));
            setSize(scale(0.00021382978723404254));
            setPosition(vec2(0.08855239627938692, -5.073163385157881));
            setVelocity(vec2(0.006669145702758643, 0.00011641037125739541));
            setGravity(0.000286);
        } else if (index == 8) {
            // uranus
            setColor(vec4(0.4392156862745098, 0.5764705882352941, 0.8588235294117647, 1.0));
            setSize(scale(0.00009042553191489363));
            setPosition(vec2(0.1780516784399456, -10.200573826116798));
            setVelocity(vec2(0.004703242034692482, 0.00008209539508867946));
            setGravity(0.000044);
        } else if (index == 9) {
            // neptune
            setColor(vec4(0.4392156862745098, 0.5764705882352941, 0.8588235294117647, 1.0));
            setSize(scale(0.00008776595744680849));
            setPosition(vec2(0.27905283909826717, -15.986926444894213));
            setVelocity(vec2(0.0037568784311044863, 0.00006557655694234902));
            setGravity(0.000052);
        }

        setFriction(1.0);
    }

    const float g = 0.0004;
    const float speed = 45.1;

    void update(int index) {
        vec2 pos = getPosition();
        vec2 vel = getVelocity();
        vec4 color = getColor();
        float gravity = getGravity();
        float size = getSize();
        float friction = getFriction();


        float mass = gravity;
        
        vec2 force = vec2(0);

        pos += vel * deltaTime*speed;

        for (int i = 0; i < particleCount; i++) {
            if (i == index) continue;

            vec2 otherPos = getPosition(i);
            vec2 otherVel = getVelocity(i);
            float otherSize = getSize(i);
            float otherGravity = getGravity(i);
            float otherMass = otherGravity;
            
            vec2 d = otherPos - pos;
            float distSq = d.x*d.x + d.y*d.y;

            force += d * (g * otherMass) / (distSq * sqrt(distSq + 0.15));
        }

        vel += force * deltaTime*speed;
        
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
    vec4 render(vec2 screenPos, vec2 viewPos, float zoom) {
        vec2 pos = viewPos + getPosition()* zoom;
        float size = (getSize()/2.0 ) * zoom;
        float alpha = max(-length(pos - screenPos)*(1.0/size)+1.0, 0.0);
        alpha = pow(alpha, 0.5);
        return vec4(getColor().rgb, alpha);
    }
}
`