// Moonlit pond: a deep-to-shallow gradient, drifting caustic light on the bottom and expanding ripple rings.
// Every pixel is computed from its position and the time, so the water costs no textures.

in vec2 vPosition;
out vec4 finalColor;

const int MAX_RIPPLES = 8;

uniform float uTime;
uniform vec2 uSize;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uLight;
uniform float uCausticScale;
uniform float uCausticSpeed;
uniform float uCausticStrength;
uniform float uVignette;
// each ripple: xy = centre (pond pixels), z = start time (s), w = strength (0 = unused slot)
uniform vec4 uRipples[MAX_RIPPLES];
uniform float uRippleSpeed;
uniform float uRippleWidth;
uniform float uRippleLife;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// Cellular (Voronoi) pattern with moving feature points. Caustics are the bright web along cell borders, where
// the distance to the nearest point (f1) is close to the distance to the second nearest (f2).
float causticLayer(vec2 p, float t) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 point = 0.5 + 0.45 * sin(t + 6.2831 * hash2(cell + offset));
            float d = length(offset + point - local);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
        }
    }
    // soft falloff away from the border, so the light reads as glowing bands rather than hard cracks
    return pow(1.0 - smoothstep(0.0, 0.32, f2 - f1), 3.0);
}

// Sum of the ripple rings at this pixel: a thin band moving outward, fading with age. Returns (height, slope dir).
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

void main() {
    vec2 uv = vPosition / uSize;
    vec3 wave = ripples(vPosition);

    // ripples bend the light on the bottom: shift the caustic lookup along the ring's slope
    vec2 bent = vPosition + wave.yz * 6.0;
    float t = uTime * uCausticSpeed;
    vec2 p = bent / uCausticScale;
    float caustic = causticLayer(p, t) * 0.6 + causticLayer(p * 1.7 + 3.1, t * 1.3) * 0.4;
    // a slow, large-scale patchiness so the light isn't the same strength everywhere
    caustic *= 0.55 + 0.45 * sin(bent.x * 0.011 + uTime * 0.21) * sin(bent.y * 0.009 - uTime * 0.17);

    vec3 color = mix(uDeep, uShallow, smoothstep(0.0, 1.0, 1.0 - length(uv - vec2(0.5, 0.42)) * 1.25));
    color += uLight * caustic * uCausticStrength;
    color += uLight * wave.x * 0.5;

    float vignette = smoothstep(0.85, 0.2, length(uv - 0.5));
    color *= mix(1.0 - uVignette, 1.0, vignette);
    finalColor = vec4(color, 1.0);
}
