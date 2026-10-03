// The pond under the koi, stylized: clean depth bands (bright shore, mid, deep), a few big soft stones, a net of
// soft oval light loops, crisp white ripple rings and a wobbling foam line at the shore. The waves refract all of
// it. Around the pond, an indigo bank with a faint seigaiha (overlapping waves) pattern.
// Waves and the pond shape come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec2 uSize;
// pond rectangle (x, y, width, height) and corner radius, in stage pixels
uniform vec4 uPond;
uniform float uPondRadius;

uniform vec3 uBank;
uniform vec3 uBankPattern;
uniform float uPatternSize;
uniform vec3 uMoon;
uniform vec2 uMoonPos;

uniform vec3 uShore;
uniform vec3 uMid;
uniform vec3 uDeep;
// where the bands change, in px from the shore: shore -> mid, mid -> deep
uniform vec2 uBands;
uniform vec3 uStone;
uniform vec3 uLight;
uniform float uLightStrength;
uniform float uLightSpacing;
uniform float uRefraction;
uniform float uRingWidth;

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

// The prototype's light net: one soft oval loop per grid cell, each with its own offset, size and tilt.
float lightLoops(vec2 pos, float spacing) {
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
            float edge = abs((length(q / radii) - 1.0) * min(radii.x, radii.y));
            light = max(light, smoothstep(1.6, 0.6, edge)); // clean line, no glow: stylized
        }
    }
    return light;
}

// A few big, flat, soft-edged stones on the bottom (at most one per 90 px cell).
float stones(vec2 p) {
    vec2 cell = floor(p / 90.0);
    if (hash(cell + 3.3) > 0.45) return 0.0;
    vec2 centre = (cell + 0.3 + vec2(hash(cell), hash(cell + 8.1)) * 0.4) * 90.0;
    vec2 radii = vec2(14.0 + hash(cell + 2.2) * 12.0, 10.0 + hash(cell + 4.4) * 8.0);
    float d = length((p - centre) / radii);
    return smoothstep(1.0, 0.85, d);
}

// Crisp white rings at each ripple's front.
float rippleRings(vec2 p) {
    float rings = 0.0;
    for (int i = 0; i < MAX_RIPPLES; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > uRippleLife) continue;
        float fromFront = abs(length(p - r.xy) - age * uRippleSpeed);
        float fade = 1.0 - age / uRippleLife;
        rings += smoothstep(uRingWidth, uRingWidth * 0.4, fromFront) * fade * min(r.w, 1.0);
    }
    return min(rings, 1.0);
}

vec3 bank(vec2 p) {
    vec3 color = mix(uBank, uBankPattern, seigaiha(p, uPatternSize) * 0.55);
    color += uMoon * 0.1 * (1.0 - smoothstep(0.0, 220.0, length(p - uMoonPos)));
    return color * mix(1.05, 0.7, p.y / uSize.y);
}

vec3 pond(vec2 p, float edge) {
    vec2 slope = waveSlope(p);
    vec2 seen = p + slope * uRefraction; // where the bottom appears through the moving surface

    // depth bands with clean, slightly wobbling borders
    float fromShore = -edge + (noise(seen * 0.04 + uTime * 0.15) - 0.5) * 6.0;
    vec3 color = mix(uShore, uMid, smoothstep(uBands.x - 1.5, uBands.x + 1.5, fromShore));
    color = mix(color, uDeep, smoothstep(uBands.y - 1.5, uBands.y + 1.5, fromShore));

    color = mix(color, color * uStone, stones(seen) * 0.6);
    color += uLight * lightLoops(seen + slope * 6.0, uLightSpacing) * uLightStrength;
    color = mix(color, vec3(1.0), rippleRings(p) * 0.75);

    // foam: a clean white line just inside the shore, wobbling with the waves
    float foamEdge = edge + (noise(p * 0.08 + vec2(uTime * 0.4, -uTime * 0.3)) - 0.5) * 2.5;
    float foam = smoothstep(-5.5, -4.5, foamEdge) * (1.0 - smoothstep(-2.5, -1.5, foamEdge));
    return mix(color, vec3(0.95, 1.0, 1.0), foam * 0.85);
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
