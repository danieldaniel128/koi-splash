// One step of the water simulation (a height field driven by the wave equation). Each texel stores the surface
// height and its vertical speed, each packed into two 8-bit channels so the simulation runs on any phone GPU.
// Every step: speed moves toward the neighbours (a 9-point average, so rings stay round instead of octagonal), the
// height follows the speed, and the koi push the surface wherever they are (the "drops"). Near the shore and around
// stones and pads the waves are soaked up, like on a sloping bank, so a splash fades out instead of bouncing back
// across the board. common.glsl (waterEdge) is prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

const int MAX_DROPS = 32;

uniform sampler2D uState;
uniform vec2 uSimSize;
uniform vec4 uSimArea;
uniform float uDamping;
// motion kept per step right at the shore, and the width (px) of the band where waves are soaked up
uniform vec2 uShore;
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
    float edge = waterEdge(uSimArea.xy + cell / uSimSize * uSimArea.zw);
    if (edge > -1.0) {
        finalColor = vec4(pack(0.0), pack(0.0)); // the bank, a stone or a pad: always flat
        return;
    }
    vec4 here = texture(uState, cell / uSimSize);
    float height = unpack(here.rg);
    float speed = unpack(here.ba);

    float sides = heightAt(cell + vec2(1.0, 0.0)) + heightAt(cell - vec2(1.0, 0.0))
        + heightAt(cell + vec2(0.0, 1.0)) + heightAt(cell - vec2(0.0, 1.0));
    float corners = heightAt(cell + vec2(1.0, 1.0)) + heightAt(cell + vec2(-1.0, 1.0))
        + heightAt(cell + vec2(1.0, -1.0)) + heightAt(cell - vec2(1.0, 1.0));
    float laplacian = (4.0 * sides + corners - 20.0 * height) / 6.0;
    float damping = uDamping * mix(1.0, uShore.x, smoothstep(-uShore.y, 0.0, edge));
    speed = (speed + laplacian * 0.5) * damping;
    height = (height + speed) * mix(1.0, damping, 0.02);

    for (int i = 0; i < MAX_DROPS; i++) {
        vec4 drop = uDrops[i];
        if (drop.w == 0.0) continue;
        float d = length(cell - drop.xy) / drop.z;
        if (d < 1.0) height += drop.w * (cos(d * 3.14159) * 0.5 + 0.5);
    }
    finalColor = vec4(pack(height), pack(speed));
}
