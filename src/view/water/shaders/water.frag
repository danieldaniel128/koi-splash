// The pond under the koi, toon style: a saturated blue that lightens toward the shore, soft lighter patches that
// drift on the water body, and crisp two-tone light where the simulated waves focus it. The waves refract all of
// it. Around the pond, an indigo bank with a faint seigaiha (overlapping waves) pattern.
// Waves come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec2 uSize;
uniform vec4 uPond;
uniform float uPondRadius;
uniform vec3 uBank;
uniform vec3 uBankPattern;
uniform float uPatternSize;
uniform vec3 uMoon;
uniform vec2 uMoonPos;
uniform vec3 uShore;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uDepth;
uniform float uShoreBand;
uniform vec3 uCaustic;
uniform float uCausticStrength;
uniform float uRefraction;

// Seigaiha: rows of overlapping circles, each row in front of the one above, every circle drawn as rings.
float seigaiha(vec2 p, float size) {
    vec2 g = p / size;
    float firstRow = floor(g.y * 2.0) + 1.0;
    for (int k = 0; k < 3; k++) {
        float row = firstRow - float(k);
        float offset = mod(row, 2.0) * 0.5;
        vec2 centre = vec2(floor(g.x - offset + 0.5) + offset, row * 0.5);
        float dist = length(g - centre);
        if (dist < 0.5) {
            float v = dist * 8.0;
            return smoothstep(0.18, 0.0, min(fract(v), 1.0 - fract(v)));
        }
    }
    return 0.0;
}

// Soft cellular patches (distance to the nearest drifting point), for the gentle light/dark mottling of toon water.
float patches(vec2 p) {
    vec2 cell = floor(p);
    float nearest = 2.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 id = cell + vec2(float(x), float(y));
            vec2 point = id + 0.5 + 0.4 * sin(uTime * 0.35 + 6.2831 * vec2(hash(id), hash(id + 7.1)));
            nearest = min(nearest, length(p - point));
        }
    }
    return nearest;
}

vec3 bank(vec2 p) {
    vec3 color = mix(uBank, uBankPattern, seigaiha(p, uPatternSize) * 0.55);
    color += uMoon * 0.1 * (1.0 - smoothstep(0.0, 220.0, length(p - uMoonPos)));
    return color * mix(1.05, 0.7, p.y / uSize.y);
}

vec3 pond(vec2 p, float edge) {
    vec2 slope = waveSlope(p);
    vec2 seen = p + slope * uRefraction; // the water body seen through the moving surface

    float fromShore = -edge;
    vec3 color = mix(uShallow, uDeep, smoothstep(0.0, uDepth, fromShore));
    color = mix(uShore, color, smoothstep(uShoreBand - 2.0, uShoreBand + 2.0, fromShore)); // light shore band
    color *= 0.93 + 0.14 * smoothstep(0.15, 0.6, patches(seen / 70.0));

    // light gathered under wave crests, posterized to two tones
    float step = uSimArea.z / uSimSize.x;
    float h = waterHeight(p);
    float curvature = waterHeight(p + vec2(step, 0.0)) + waterHeight(p - vec2(step, 0.0))
        + waterHeight(p + vec2(0.0, step)) + waterHeight(p - vec2(0.0, step)) - 4.0 * h;
    float caustic = -curvature * uCausticStrength;
    color = mix(color, uCaustic, smoothstep(0.45, 0.55, caustic) * 0.35 + smoothstep(0.15, 0.25, caustic) * 0.12);
    return color;
}

void main() {
    vec2 p = vPosition;
    float edge = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    float inside = 1.0 - smoothstep(-1.0, 1.0, edge);
    vec3 color = mix(bank(p), pond(p, edge), inside);
    // dark rim right outside the water, so the pond reads as a clean shape
    color *= 1.0 - (1.0 - inside) * 0.45 * exp(-max(edge, 0.0) / 5.0);
    finalColor = vec4(color, 1.0);
}
