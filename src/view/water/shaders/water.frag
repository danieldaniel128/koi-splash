// The pond seen from above, below the koi: a sandy, pebbly bottom refracted by the waves, with moving caustics
// (light focused by the waves), darker and bluer where the water is deep. Around it, a dark mossy bank.
// Waves, noise and the pond shape come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec2 uSize;
// pond rectangle (x, y, width, height) and corner radius, in stage pixels
uniform vec4 uPond;
uniform float uPondRadius;

uniform vec3 uBankDark;
uniform vec3 uBankMoss;
uniform vec3 uMoon;
uniform vec2 uMoonPos;
uniform vec3 uSand;
uniform vec3 uPebble;
uniform vec3 uShallowWater;
uniform vec3 uDeepWater;
uniform vec3 uCausticColor;
uniform float uCausticStrength;
uniform float uDepth;
uniform float uRefraction;

// Caustics: two layers of ridged noise drifting in different directions; where both ridges meet, the light piles
// up into the bright, irregular web seen on the bottom of real pools.
float causticAt(vec2 p) {
    float t = uTime;
    vec2 q = p * 0.05;
    float a = 1.0 - abs(noise(q + vec2(t * 0.30, t * 0.17)) * 2.0 - 1.0);
    float b = 1.0 - abs(noise(q * 1.4 + vec2(-t * 0.21, t * 0.26) + 5.2) * 2.0 - 1.0);
    return pow(a * b, 6.0) * 2.4 + pow(a, 14.0) * 0.6;
}

vec3 bottom(vec2 p) {
    float mottle = fbm(p * 0.045);
    vec3 color = mix(uSand * 0.7, uSand, mottle);
    // pebbles: cells of noise with soft dark gaps between them
    float pebbles = smoothstep(0.55, 0.75, noise(p * 0.16)) * smoothstep(0.3, 0.7, fbm(p * 0.02 + 3.0));
    color = mix(color, uPebble * (0.7 + noise(p * 0.5) * 0.5), pebbles * 0.65);
    // patches of dark silt
    return color * (0.6 + 0.4 * smoothstep(0.25, 0.7, fbm(p * 0.012 + 11.0)));
}

vec3 bank(vec2 p, float distanceOut) {
    vec3 color = mix(uBankDark, uBankMoss, fbm(p * 0.03) * 0.8 + noise(p * 0.4) * 0.2);
    color *= 1.0 - 0.5 * exp(-distanceOut / 10.0); // wet, darker earth right at the waterline
    color += uMoon * 0.12 * (1.0 - smoothstep(0.0, 220.0, length(p - uMoonPos)));
    return color * mix(1.0, 0.75, p.y / uSize.y);
}

vec3 pond(vec2 p, float edge) {
    // deeper toward the middle: more blue absorption, more refraction, softer caustics
    float depth = smoothstep(0.0, uDepth, -edge);
    vec2 slope = waveSlope(p);
    vec2 seen = p + slope * uRefraction * (0.4 + depth); // where the bottom appears to be through the surface

    vec3 color = bottom(seen);
    // caustics with a slight rainbow fringe: red, green and blue focus at slightly different spots
    vec2 bend = slope * 10.0;
    vec3 caustic = vec3(causticAt(seen + bend * 1.1), causticAt(seen + bend), causticAt(seen + bend * 0.9));
    color += uCausticColor * caustic * uCausticStrength * (0.6 + 0.4 * smoothstep(0.0, 0.35, depth)) * (1.0 - depth * 0.45);

    vec3 water = mix(uShallowWater, uDeepWater, depth);
    return mix(color * water * 2.2, water, 0.35 + depth * 0.4);
}

void main() {
    vec2 p = vPosition;
    float edge = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    float inside = 1.0 - smoothstep(-1.0, 1.0, edge);
    vec3 color = mix(bank(p, max(edge, 0.0)), pond(p, edge), inside);

    float vignette = smoothstep(min(uSize.x, uSize.y) * 0.4, max(uSize.x, uSize.y) * 0.85, length(p - uSize * 0.5));
    finalColor = vec4(mix(color, vec3(0.0, 0.01, 0.025), vignette * 0.65), 1.0);
}
