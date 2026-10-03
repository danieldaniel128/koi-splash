// One step of the water simulation (a height field driven by the wave equation). Each texel stores the surface
// height and its vertical speed, each packed into two 8-bit channels so the simulation runs on any phone GPU.
// Every step: speed moves toward the average of the four neighbours, the height follows the speed, and the koi push
// the surface wherever they are (the "drops"). Waves spread, bounce off the shore and slowly calm down.

in vec2 vPosition;
out vec4 finalColor;

const int MAX_DROPS = 32;

uniform sampler2D uState;
uniform vec2 uSimSize;
// pond corner radius, in simulation cells
uniform float uRadius;
uniform float uDamping;
// each drop: xy = centre (cells), z = radius (cells), w = push (negative = down)
uniform vec4 uDrops[MAX_DROPS];

float unpack(vec2 v) {
    return (v.x + v.y / 255.0) * 2.0 - 1.0;
}

vec2 pack(float value) {
    float x = clamp(value * 0.5 + 0.5, 0.0, 1.0) * 255.0;
    float high = min(floor(x), 254.0);
    return vec2(high / 255.0, x - high); // high byte, then the remainder at full 8-bit resolution
}

float heightAt(vec2 cell) {
    return unpack(texture(uState, cell / uSimSize).rg);
}

void main() {
    vec2 cell = vPosition;
    vec4 here = texture(uState, cell / uSimSize);
    float height = unpack(here.rg);
    float speed = unpack(here.ba);

    float neighbours = (heightAt(cell + vec2(1.0, 0.0)) + heightAt(cell - vec2(1.0, 0.0))
        + heightAt(cell + vec2(0.0, 1.0)) + heightAt(cell - vec2(0.0, 1.0))) * 0.25;
    speed = (speed + (neighbours - height) * 2.0) * uDamping;
    height += speed;

    for (int i = 0; i < MAX_DROPS; i++) {
        vec4 drop = uDrops[i];
        if (drop.w == 0.0) continue;
        float d = length(cell - drop.xy) / drop.z;
        if (d < 1.0) height += drop.w * (cos(d * 3.14159) * 0.5 + 0.5);
    }

    // the shore: outside the rounded pond the water is held flat, so waves reflect off the edge
    vec2 q = abs(cell - uSimSize * 0.5) - uSimSize * 0.5 + uRadius;
    float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    if (outside > -1.0) {
        height = 0.0;
        speed = 0.0;
    }
    finalColor = vec4(pack(height), pack(speed));
}
