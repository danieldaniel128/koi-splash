// Small helpers shared by every pond shader: hashing, smooth noise, the pond's outline and constant-width lines.
// Positions are stage pixels.

// the pond's base rectangle (x, y, width, height) and its shape: corner radius, how far the shore wanders in and
// out (px) and how long one bend of the shore is (px)
uniform vec4 uPond;
uniform vec3 uPondShape;

// stones and lily pads in the water, as rotated ellipses: centre (x, y) and half size, and rotation (radians).
// Unused slots have a zero size.
const int MAX_PROPS = 8;
uniform vec4 uProps[MAX_PROPS];
uniform float uPropTurns[MAX_PROPS];

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

// Smooth gradient noise, about -0.7..0.7. Its zero crossings are long winding lines that close into loops.
float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash(i) * 6.2831853;
    float b = hash(i + vec2(1.0, 0.0)) * 6.2831853;
    float c = hash(i + vec2(0.0, 1.0)) * 6.2831853;
    float d = hash(i + vec2(1.0, 1.0)) * 6.2831853;
    float va = dot(vec2(cos(a), sin(a)), f);
    float vb = dot(vec2(cos(b), sin(b)), f - vec2(1.0, 0.0));
    float vc = dot(vec2(cos(c), sin(c)), f - vec2(0.0, 1.0));
    float vd = dot(vec2(cos(d), sin(d)), f - vec2(1.0, 1.0));
    return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
}

// Signed distance to a rounded rectangle centred on the origin: negative inside.
float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// Distance (px) to the shore: negative in the water. A rounded rectangle whose edge wanders in long, slow bends,
// so the pond reads as dug ground, not a tray. The simulation and every drawing pass share it.
float pondEdge(vec2 p) {
    float box = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondShape.x);
    float bend = noise(p / uPondShape.z) * 0.7 + noise(p / (uPondShape.z * 0.35) + 17.0) * 0.3;
    return box + (bend - 0.5) * 2.0 * uPondShape.y;
}

// Distance (px) to the nearest stone or lily pad: negative inside one.
float propEdge(vec2 p) {
    float d = 1e5;
    for (int i = 0; i < MAX_PROPS; i++) {
        vec4 prop = uProps[i];
        if (prop.z <= 0.0) continue;
        float c = cos(uPropTurns[i]);
        float s = sin(uPropTurns[i]);
        vec2 q = p - prop.xy;
        q = vec2(c * q.x + s * q.y, c * q.y - s * q.x); // into the prop's own frame
        d = min(d, (length(q / prop.zw) - 1.0) * min(prop.z, prop.w));
    }
    return d;
}

// Distance (px) to where the open water ends: the shore, or a stone or pad in it. Negative on the water.
float waterEdge(vec2 p) {
    return max(pondEdge(p), -propEdge(p));
}

// Coverage (0..1) of a line `width` device px wide, for a pixel `dist` device px from its centre line. Antialiased
// over one pixel; lines thinner than a pixel fade instead of breaking up, so tapered strokes end softly.
float lineCover(float dist, float width) {
    return clamp(0.5 + max(width, 1.0) * 0.5 - dist, 0.0, 1.0) * clamp(width, 0.0, 1.0);
}
