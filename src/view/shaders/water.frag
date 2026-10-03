// Moonlit koi pond. Outside: a night bank with a moon glow. Inside a rounded pond: a blue radial gradient, faint
// round sockets under the cells, a net of soft oval caustic loops (two drifting copies make the water shimmer) and
// expanding ripple rings. Every pixel is computed from its position and the time: no textures.

in vec2 vPosition;
out vec4 finalColor;

const int MAX_RIPPLES = 8;

uniform float uTime;
uniform vec2 uSize;
// pond rectangle (x, y, width, height) and corner radius, in stage pixels
uniform vec4 uPond;
uniform float uPondRadius;
// board grid: x, y of the top-left cell corner, cell size, columns; and rows
uniform vec4 uGrid;
uniform float uRows;

uniform vec3 uBankTop;
uniform vec3 uBankBottom;
uniform vec3 uMoon;
uniform vec2 uMoonPos;
uniform vec3 uPondIn;
uniform vec3 uPondOut;
uniform vec3 uEdgeGlow;
uniform vec3 uCaustic;
uniform float uCausticSpacing;
uniform float uCausticAlpha;

// each ripple: xy = centre (stage pixels), z = start time (s), w = strength (0 = unused slot)
uniform vec4 uRipples[MAX_RIPPLES];
uniform float uRippleSpeed;
uniform float uRippleWidth;
uniform float uRippleLife;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Signed distance to a rounded rectangle centred on the origin: negative inside.
float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// One copy of the caustic net: on a grid of `spacing`, each cell holds one loose oval loop of light with its own
// offset, size, tilt and line width. Returns how much light reaches this pixel.
float causticNet(vec2 pos, float spacing) {
    vec2 cell = floor(pos / spacing);
    float light = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 id = cell + vec2(float(x), float(y));
            vec2 centre = (id + 0.5 + vec2(hash(id) - 0.5, hash(id + 17.3) - 0.5)) * spacing;
            vec2 radii = spacing * vec2(0.4 + hash(id + 41.9) * 0.3, 0.3 + hash(id + 73.1) * 0.3);
            float angle = hash(id + 5.7) * 3.0;
            vec2 q = pos - centre;
            q = vec2(cos(angle) * q.x + sin(angle) * q.y, -sin(angle) * q.x + cos(angle) * q.y);
            float edge = abs((length(q / radii) - 1.0) * min(radii.x, radii.y)); // ~ distance to the loop
            float halfWidth = 0.4 + hash(id + 91.3) * 0.8;
            light += smoothstep(halfWidth + 0.9, halfWidth * 0.3, edge) + exp(-edge / 3.0) * 0.35; // line + glow
        }
    }
    return light;
}

// Sum of the ripple rings at this pixel: x = brightness, yz = direction away from the ring centre (to bend light).
vec3 ripples(vec2 pos) {
    vec3 total = vec3(0.0);
    for (int i = 0; i < MAX_RIPPLES; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > uRippleLife) continue;
        vec2 delta = pos - r.xy;
        float dist = length(delta);
        float band = (dist - age * uRippleSpeed) / uRippleWidth;
        float ring = exp(-band * band) * (1.0 - age / uRippleLife) * r.w;
        total += vec3(ring, ring * delta / max(dist, 1.0));
    }
    return total;
}

vec3 bank(vec2 pos) {
    vec3 color = mix(uBankTop, uBankBottom, pos.y / uSize.y);
    return color + uMoon * 0.2 * (1.0 - smoothstep(0.0, 200.0, length(pos - uMoonPos)));
}

vec3 pondWater(vec2 pos) {
    vec2 centre = uPond.xy + uPond.zw * 0.5;
    float reach = max(uPond.z, uPond.w) * 0.62;
    vec3 color = mix(uPondIn, uPondOut, clamp(length(pos - centre + vec2(0.0, uPond.w * 0.1)) / reach, 0.0, 1.0));

    // faint sockets under the cells, alternating lighter and darker, instead of hard grid lines
    vec2 g = (pos - uGrid.xy) / uGrid.z;
    vec2 cell = floor(g);
    if (cell.x >= 0.0 && cell.y >= 0.0 && cell.x < uGrid.w && cell.y < uRows) {
        float socket = 1.0 - smoothstep(0.42, 0.46, length(fract(g) - 0.5));
        bool lighter = mod(cell.x + cell.y, 2.0) > 0.5;
        color = lighter ? color + socket * 0.04 : mix(color, vec3(0.0, 0.07, 0.14), socket * 0.14);
    }

    vec3 wave = ripples(pos);
    vec2 bent = pos + wave.yz * 6.0; // a passing ring bends the light on the bottom
    float t = uTime;
    vec2 drift1 = vec2(sin(t * 0.21) * 16.0, cos(t * 0.17) * 12.0);
    vec2 drift2 = vec2(cos(t * 0.13 + 1.0) * 20.0 - 17.0, sin(t * 0.19 + 2.0) * 16.0 + 13.0);
    float caustic = causticNet(bent - drift1, uCausticSpacing) * 0.55 + causticNet(bent - drift2, uCausticSpacing) * 0.35;
    color += uCaustic * caustic * uCausticAlpha;
    return color + uCaustic * wave.x * 0.45;
}

void main() {
    vec2 pos = vPosition;
    float edge = roundedBox(pos - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    float inside = 1.0 - smoothstep(-1.0, 1.0, edge);

    vec3 color = bank(pos);
    color += uEdgeGlow * 0.35 * exp(-max(edge, 0.0) / 12.0) * (1.0 - inside); // soft lit rim around the pond
    color = mix(color, pondWater(pos), inside);

    vec2 fromCentre = pos - uSize * 0.5;
    float vignette = smoothstep(min(uSize.x, uSize.y) * 0.35, max(uSize.x, uSize.y) * 0.8, length(fromCentre));
    color = mix(color, vec3(0.0, 0.016, 0.04), vignette * 0.6);
    finalColor = vec4(color, 1.0);
}
