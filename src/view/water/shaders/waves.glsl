// Reads the water simulation for the shaders that draw with it (pond bottom, surface, koi refraction), so all three
// show the same waves. Positions are stage pixels; the simulation covers the pond rectangle.

uniform sampler2D uState;
// pond rectangle on the stage (x, y, width, height) and the simulation size in cells
uniform vec4 uSimArea;
uniform vec2 uSimSize;
uniform float uWaveScale;
uniform float uTime;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth value noise in 0..1.
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float unpackHeight(vec4 texel) {
    return (texel.r + texel.g / 255.0) * 2.0 - 1.0;
}

// Height at a stage point, smoothly interpolated between simulation cells (the packed texels can't be filtered by
// the GPU, so the bilinear blend is done here).
float waterHeight(vec2 stagePos) {
    vec2 cell = (stagePos - uSimArea.xy) / uSimArea.zw * uSimSize - 0.5;
    vec2 base = floor(cell);
    vec2 f = cell - base;
    vec2 texel = 1.0 / uSimSize;
    vec2 uv = (base + 0.5) * texel;
    float a = unpackHeight(texture(uState, uv));
    float b = unpackHeight(texture(uState, uv + vec2(texel.x, 0.0)));
    float c = unpackHeight(texture(uState, uv + vec2(0.0, texel.y)));
    float d = unpackHeight(texture(uState, uv + texel));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Surface slope (dh/dx, dh/dy) at a stage point, scaled by uWaveScale.
vec2 waveSlope(vec2 p) {
    float step = uSimArea.z / uSimSize.x; // one simulation cell, in stage pixels
    float h = waterHeight(p);
    return vec2(waterHeight(p + vec2(step, 0.0)) - h, waterHeight(p + vec2(0.0, step)) - h) * uWaveScale;
}

// Signed distance to a rounded rectangle centred on the origin: negative inside.
float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}
