// Small helpers shared by every pond shader: the water state's packing, hashing, smooth noise, the pond's outline
// and constant-width lines. Positions are stage pixels.

// the pond's shape, as a distance field baked once from its traced shore (see bakeDistanceField): red holds the
// distance out to 128 px in 1 px steps, green out to 16 px in 1/8 px steps (FIELD_REACH). uShoreArea is where the
// field lies on the stage (x, y, width, height); uShoreBend is how far the shore wanders in and out (px) and how
// long one bend of it is (px)
uniform sampler2D uShoreField;
uniform vec4 uShoreArea;
uniform vec2 uShoreBend;

// stones and lily pads in the water, as rotated ellipses: centre (x, y) and half size, and the cosine and sine of
// the rotation; and how much of each is still on the water (1, falling to 0 as a pad leaves it), which the water's
// depth fades with. Unused slots have a zero size.
const int MAX_PROPS = 16;
uniform vec4 uProps[MAX_PROPS];
uniform vec2 uPropAxes[MAX_PROPS];
uniform float uPropAfloat[MAX_PROPS];

// The water's state: a value in -WATER_RANGE..WATER_RANGE (WATER.stateRange, set by withCommon) packed into two
// 8-bit channels, a high byte and the remainder at full 8-bit resolution, so the simulation runs on any phone GPU
// (waterCodec.ts mirrors these two).
vec2 packWater(float value) {
    float x = clamp(value / WATER_RANGE * 0.5 + 0.5, 0.0, 1.0) * 255.0;
    float high = min(floor(x), 254.0);
    return vec2(high / 255.0, x - high);
}

float unpackWater(vec2 channels) {
    return ((channels.x + channels.y / 255.0) * 2.0 - 1.0) * WATER_RANGE;
}

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

// Distance (px) to the shore: negative in the water. Read from the baked field (fine near the shore, coarse
// further out, and growing on past the field's edge), with the edge wandering in long, slow bends so the pond
// reads as dug ground. Any board shape, one texture read. The simulation and every drawing pass share it.
float pondEdge(vec2 p) {
    vec2 field = texture(uShoreField, (p - uShoreArea.xy) / uShoreArea.zw).rg;
    float coarse = (field.r * 2.0 - 1.0) * 128.0;
    float fine = (field.g * 2.0 - 1.0) * 16.0;
    float d = mix(fine, coarse, smoothstep(12.0, 15.0, abs(coarse)));
    vec2 beyond = max(abs(p - (uShoreArea.xy + uShoreArea.zw * 0.5)) - uShoreArea.zw * 0.5, 0.0);
    d += length(beyond);
    float bend = noise(p / uShoreBend.y) * 0.7 + noise(p / (uShoreBend.y * 0.35) + 17.0) * 0.3;
    return d + (bend - 0.5) * 2.0 * uShoreBend.x;
}

// Distance (px) to the edge of stone or pad `i` (a slot in use): negative inside it.
float propDistance(int i, vec2 p) {
    vec4 prop = uProps[i];
    vec2 axis = uPropAxes[i];
    vec2 q = p - prop.xy;
    q = vec2(axis.x * q.x + axis.y * q.y, axis.x * q.y - axis.y * q.x); // into the prop's own frame
    return (length(q / prop.zw) - 1.0) * min(prop.z, prop.w);
}

// Distance (px) to the nearest stone or lily pad: negative inside one.
float propEdge(vec2 p) {
    float d = 1e5;
    for (int i = 0; i < MAX_PROPS; i++) {
        if (uProps[i].z <= 0.0) continue;
        d = min(d, propDistance(i, p));
    }
    return d;
}

// Distance (px) to where the open water ends: the shore, or a stone or pad in it. Negative on the water.
float waterEdge(vec2 p) {
    return max(pondEdge(p), -propEdge(p));
}

// Distance (px) to the edge of a rectangle (x, y, width, height): negative inside. Used to keep light and glints
// off the board, so nothing busy sits behind the koi.
float rectEdge(vec2 p, vec4 rect) {
    vec2 d = abs(p - (rect.xy + rect.zw * 0.5)) - rect.zw * 0.5;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Washi paper: a soft mottle plus long faint fibres, as a brightness factor around 1. Fixed to the stage, like
// the print itself, so the whole scene reads as one sheet.
float paper(vec2 p) {
    float mottle = noise(p * 0.11) * 0.6 + noise(p * 0.37 + 5.0) * 0.4;
    float fibres = smoothstep(0.78, 0.95, noise(vec2(p.x * 0.05 + p.y * 0.02, p.y * 0.7)));
    return 0.95 + mottle * 0.08 + fibres * 0.05;
}

// Coverage (0..1) of a line `width` device px wide, for a pixel `dist` device px from its centre line. Antialiased
// over one pixel; lines thinner than a pixel fade instead of breaking up, so tapered strokes end softly.
float lineCover(float dist, float width) {
    return clamp(0.5 + max(width, 1.0) * 0.5 - dist, 0.0, 1.0) * clamp(width, 0.0, 1.0);
}
