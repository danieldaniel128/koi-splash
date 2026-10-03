// The pond under the koi, as an ink print by moonlight:
// - deep indigo-teal water, lighter in the shallows by the shore and shaded right under the bank's lip
// - a faint, slowly drifting net of light loops on the bottom (caustics), so still water still reads as water
// - soft light and shade on the slopes of the simulated waves, and the moon's reflection on the open water
// - thin pale ink lines on the front of every ripple and wake (never filled foam)
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
uniform float uRelief;
uniform vec2 uLightDir;
uniform vec3 uLightNet;
// light net strength, loop size (px), line width (px)
uniform vec3 uNetLook;
uniform vec3 uInk;
// ripple lines: slope where they start and reach full strength, width (px), strength
uniform vec4 uRipple;
uniform vec3 uMoon;
// moon reflection centre (x, y) and radius, stage px
uniform vec3 uMoonAt;

// A soft line of light along the zero crossings of a noise field: a crisp core `uNetLook.z` px wide and a faint
// glow around it. Constant width on screen, however the field is stretched.
float loopLine(float n) {
    float dist = abs(n) / max(fwidth(n), 1e-5); // device px from the line
    return lineCover(dist, uNetLook.z * uPixelRatio) * 0.7 + exp(-dist / (3.0 * uPixelRatio)) * 0.3;
}

// The light net: moonlight focused by the gently moving surface into thin, winding loops on the bottom. Two
// layers of noise, slowly warped and drifting, so the loops re-form and never show a pattern.
float lightNet(vec2 p) {
    vec2 q = p / uNetLook.y;
    q += (vec2(noise(q * 0.7 + vec2(uTime * 0.05, 0.0)), noise(q * 0.7 + vec2(5.0, -uTime * 0.04))) - 0.5) * 0.6;
    float a = gnoise(q + uTime * 0.025);
    float b = gnoise(q * 1.6 + vec2(7.3, -3.6) - uTime * 0.04);
    return max(loopLine(a), loopLine(b) * 0.6);
}

// The moon's reflection: a soft pale disc and halo with a slow shimmer, broken into strips by thin dark gaps (the
// way ink prints draw a moon on water), and bent by every ripple that passes over it.
vec3 moonReflection(vec3 color, vec2 seen) {
    seen.x += sin(seen.y * 0.7 + uTime * 1.6) * 0.8;
    vec2 d = seen - uMoonAt.xy;
    float r = length(d) / uMoonAt.z;
    float disc = 1.0 - smoothstep(0.86, 1.0, r);
    float strips = smoothstep(0.15, 0.45, abs(fract(d.y / uMoonAt.z * 2.2 + 0.25 + uTime * 0.05) - 0.5) * 2.0);
    disc *= mix(1.0, strips, smoothstep(-0.2, 0.6, d.y / uMoonAt.z)); // whole on top, in strips below
    float glow = (1.0 - r * 0.35) * disc;
    float halo = exp(-max(r - 0.9, 0.0) * 1.4) * 0.16;
    return mix(color + uMoon * halo, uMoon, clamp(glow, 0.0, 1.0) * 0.75);
}

vec3 water(vec2 p, float edge, vec3 w) {
    vec2 seen = p + w.yz * uRefraction; // the bottom seen through the moving surface
    float fromShore = -edge;
    vec3 color = mix(uShallow, uMid, smoothstep(0.0, uDepth.x, fromShore));
    color = mix(color, uDeep, smoothstep(uDepth.x, uDepth.y, fromShore));
    color *= 1.0 - uLip.x * (1.0 - smoothstep(0.0, uLip.y, fromShore));
    color += uLightNet * lightNet(seen) * uNetLook.x;
    color *= 1.0 - dot(w.yz, uLightDir) * uRelief;
    color = moonReflection(color, seen);
    return mix(color, uInk, rippleLines(w, uRipple.xy, uRipple.z) * uRipple.w);
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
    finalColor = vec4(color * inside, inside); // premultiplied alpha, as Pixi blends it
}
