// The pond under the koi, as an ink print by moonlight:
// - deep indigo-teal water, lighter and glowing in the shallows by the shore, shaded right under the bank's lip
// - soft, wide bands of light drifting on the bottom (moonlight focused by the surface), brightest in the shallows
//   and fading out toward the board, so the pond feels alive without anything busy behind the koi
// - a faint moonlit sheen: broad, slow patches of light on the open water, so even the deep middle isn't flat
// - the simulated waves as soft relief: slopes facing the moon light up, crests catch a little light, troughs
//   darken, and only strong fronts get a clean bright rim
// - the moon's reflection, broken by the water into a loose column of twinkling glints over a soft glow
// The waves refract all of it. Outside the shore it's transparent (the bank shows through), antialiased.
// common.glsl and waves.glsl are prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
// where the shallows end and where the deep water starts (px from the shore)
uniform vec2 uDepth;
// shade under the bank's lip: strength and width (px)
uniform vec2 uLip;
uniform float uRefraction;
uniform vec2 uLightDir;
// the board rectangle (x, y, width, height): light and glints fade out over it
uniform vec4 uBoard;
uniform vec3 uGlow;
// light bands: strength, pattern size (px), softness, how far from the shore they reach (px)
uniform vec4 uGlowLook;
// how much of the light bands and the shallows' glow is left under the board
uniform float uGlowUnderBoard;
uniform float uSheen;
uniform vec3 uInk;
// relief: light and shade on the slopes, crest height at full light, crest light
uniform vec4 uRelief;
uniform float uTroughShade;
// rim on strong fronts: slope where it starts and where it's full, strength
uniform vec3 uRim;
uniform vec3 uMoon;
// moon reflection centre (x, y) and radius, stage px
uniform vec3 uMoonAt;

// Soft, wide bands of light on the bottom: two layers of slow noise, slowly warped and drifting, each glowing
// around where it crosses zero. The glow's width follows the noise (in pattern units, not screen px), so where the
// field is flat the light spreads into broad patches, and where two bands cross it pools brighter, like caustics.
float lightBands(vec2 p) {
    vec2 q = p / uGlowLook.y;
    q += (vec2(noise(q * 0.7 + vec2(uTime * 0.05, 0.0)), noise(q * 0.7 + vec2(5.0, -uTime * 0.04))) - 0.5) * 0.8;
    float a = gnoise(q + uTime * 0.03) / uGlowLook.z;
    float b = gnoise(q * 1.5 + vec2(7.3, -3.6) - uTime * 0.045) / (uGlowLook.z * 0.8);
    float bandA = exp(-a * a);
    float bandB = exp(-b * b);
    return bandA * 0.55 + bandB * 0.35 + bandA * bandB * 0.6;
}

// How much light the bottom gets at a point: most in the shallows (the shelf is wider in places), less toward the
// deep, and only a trace under the board. Brighter and dimmer stretches drift slowly along the shore, so the
// shallows glow in patches instead of as an even frame around the board.
float shallowLight(vec2 p, float fromShore) {
    float reach = uGlowLook.w * (0.6 + 0.8 * noise(p / 70.0 + 3.0));
    float shore = 1.0 - smoothstep(0.0, reach, fromShore);
    float underBoard = smoothstep(-2.0, -26.0, rectEdge(p, uBoard));
    float patches = 0.35 + 0.9 * noise(p / 120.0 + vec2(uTime * 0.03, -uTime * 0.02));
    return shore * shore * patches * mix(1.0, uGlowUnderBoard, underBoard);
}

// Glints of moonlight in a grid of `cell` px cells: in each cell maybe one short horizontal dash, longer near the
// column's middle, that twinkles on its own beat. `density` (0..1) is how many cells show one here.
float moonGlints(vec2 seen, vec2 cell, float density, float seed) {
    vec2 g = seen / cell;
    g.x += sin(floor(g.y) * 1.7 + uTime * 0.8 + seed) * 0.35; // each row sways on its own
    vec2 id = floor(g) + seed;
    vec2 f = fract(g) - 0.5 - (vec2(hash(id + 1.3), hash(id + 4.1)) - 0.5) * 0.3;
    float size = 0.25 + 0.25 * hash(id + 7.7);
    float dash = 1.0 - smoothstep(size * 0.35, size, length(f * vec2(1.0, 2.6)));
    float twinkle = 0.35 + 0.65 * smoothstep(-0.2, 1.0, sin(uTime * (1.2 + 2.0 * hash(id + 2.9)) + hash(id) * 6.28));
    return dash * twinkle * step(hash(id + 9.4), density);
}

// The moon on the water, broken by the ripples: a soft glow under a loose column of glints, big broken dashes in
// the middle and small ones further out, all twinkling and swaying. Taller than wide, as moonlight on water runs
// toward the viewer; no disc and no regular bars.
vec3 moonlight(vec3 color, vec2 seen, float open) {
    vec2 d = (seen - uMoonAt.xy) / uMoonAt.z; // in moon radii
    float column = dot(d / vec2(1.2, 1.9), d / vec2(1.2, 1.9));
    color += uMoon * (exp(-column * 1.6) * 0.38 + exp(-length(d) * 0.6) * 0.08) * open;
    if (column > 3.0) return color;
    float core = exp(-column * 2.2);
    float big = moonGlints(seen, vec2(15.0, 5.0), core * 1.1, 0.0);
    float small = moonGlints(seen, vec2(7.0, 3.0), exp(-column * 0.9) * 0.75, 31.0);
    return mix(color, uMoon, clamp(big + small * 0.8, 0.0, 1.0) * open * 0.92);
}

// The waves as soft relief: light and shade on the slopes, a little light on the crests, darker troughs, and a
// clean bright rim only along strong fronts.
vec3 relief(vec3 color, vec3 w) {
    vec2 light = moonOnWaves(w, uLightDir, uRim.xy);
    color += uInk * (max(light.x, 0.0) * uRelief.x + smoothstep(0.0, uRelief.z, w.x) * uRelief.w);
    float shade = min(max(-light.x, 0.0) * uRelief.y, 0.4) + smoothstep(0.0, uRelief.z, -w.x) * uTroughShade;
    color *= 1.0 - shade;
    return mix(color, uInk, light.y * uRim.z);
}

vec3 water(vec2 p, float edge, vec3 w) {
    vec2 seen = p + w.yz * uRefraction; // the bottom seen through the moving surface
    float fromShore = -edge;
    float shallows = uDepth.x * (0.55 + 0.9 * noise(p / 90.0)); // the shelf by the shore is wider in places
    float deep = smoothstep(uDepth.x, uDepth.y, fromShore);
    vec3 color = mix(uShallow, uMid, smoothstep(0.0, shallows, fromShore));
    color = mix(color, uDeep, deep);
    float light = shallowLight(p, fromShore);
    if (light > 0.002) color += uGlow * light * (0.08 + lightBands(seen) * uGlowLook.x); // most of the pond skips it
    float sheen = noise(seen / 170.0 + vec2(uTime * 0.012, uTime * 0.008));
    color += uInk * smoothstep(0.3, 0.95, sheen) * uSheen;
    color *= 1.0 - uLip.x * (1.0 - smoothstep(0.0, uLip.y, fromShore));
    color = relief(color, w);
    return moonlight(color, seen, smoothstep(0.0, 14.0, rectEdge(p, uBoard)));
}

void main() {
    vec2 p = vPosition;
    float edge = pondEdge(p);
    float inside = clamp(0.5 - edge * uPixelRatio, 0.0, 1.0);
    if (inside <= 0.0) {
        finalColor = vec4(0.0);
        return;
    }
    vec3 color = water(p, max(edge, -propEdge(p)), waves(p)); // lighter shallows by the shore and around stones
    color *= mix(1.0, paper(p), 0.6); // the same washi grain as the bank, a little softer under the water
    finalColor = vec4(color * inside, inside); // premultiplied alpha, as Pixi blends it
}
