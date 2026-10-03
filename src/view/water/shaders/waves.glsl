// Shared by the pond bottom, the water surface and the koi refraction, so all three see the same waves.
// Positions are stage pixels. The including shader declares MAX_RIPPLES before this chunk.

uniform float uTime;
// each ripple: xy = centre (stage pixels), z = start time (s), w = strength (0 = unused slot)
uniform vec4 uRipples[MAX_RIPPLES];
uniform float uRippleSpeed;
uniform float uRippleLife;
uniform float uWaveScale;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth value noise in 0..1.
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        sum += noise(p) * amp;
        p = p * 2.03 + vec2(17.1, 9.2);
        amp *= 0.5;
    }
    return sum;
}

// Ripple rings: a short train of wavelets travelling outward from each drop point, fading with age.
float rippleHeight(vec2 p) {
    float h = 0.0;
    for (int i = 0; i < MAX_RIPPLES; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > uRippleLife) continue;
        float behindFront = length(p - r.xy) - age * uRippleSpeed;
        float envelope = exp(-behindFront * behindFront / 400.0);
        float fade = 1.0 - age / uRippleLife;
        h += sin(behindFront * 0.32) * envelope * fade * fade * r.w;
    }
    return h;
}

// Water surface height: slow wind swell from a few directions, a drifting noise chop, plus the ripples.
float waveHeight(vec2 p) {
    float t = uTime;
    float h = sin(dot(p, vec2(0.031, 0.012)) + t * 1.1) * 0.35;
    h += sin(dot(p, vec2(-0.017, 0.029)) + t * 0.9) * 0.3;
    h += sin(dot(p, vec2(0.045, -0.038)) + t * 1.6) * 0.15;
    h += (noise(p * 0.035 + vec2(t * 0.25, -t * 0.2)) - 0.5) * 0.8;
    h += (noise(p * 0.09 - vec2(t * 0.4, t * 0.3)) - 0.5) * 0.35;
    return h + rippleHeight(p) * 1.6;
}

// Surface slope (dh/dx, dh/dy), scaled by uWaveScale. Drives refraction, caustics and glints.
vec2 waveSlope(vec2 p) {
    const float e = 1.5;
    float h = waveHeight(p);
    return vec2(waveHeight(p + vec2(e, 0.0)) - h, waveHeight(p + vec2(0.0, e)) - h) / e * uWaveScale;
}

// Signed distance to a rounded rectangle centred on the origin: negative inside.
float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}
