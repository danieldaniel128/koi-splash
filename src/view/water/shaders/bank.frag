// The bank around the pond, as an ink print: deep indigo with a faint seigaiha (overlapping waves) pattern, washi
// paper grain, a dark wet band where it meets the water, and a soft vignette toward the screen edges. It covers the
// whole screen (no letterbox bars on tall phones). Static: no simulation reads. common.glsl is prepended.

in vec2 vPosition;
out vec4 finalColor;

uniform vec3 uBank;
uniform vec3 uBankPattern;
uniform float uPatternSize;
uniform float uWetBand;
// the stage's centre and half size, for the vignette
uniform vec4 uFrame;

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
            return smoothstep(0.16, 0.0, min(fract(v), 1.0 - fract(v)));
        }
    }
    return 0.0;
}

void main() {
    vec2 p = vPosition;
    float edge = pondEdge(p);
    vec3 color = mix(uBank, uBankPattern, seigaiha(p, uPatternSize) * 0.5);
    color *= mix(0.4, 1.0, smoothstep(0.0, uWetBand, edge)); // wet, shaded ground right at the water
    float fromCentre = length((p - uFrame.xy) / uFrame.zw);
    color *= 1.0 - 0.4 * smoothstep(0.7, 1.5, fromCentre);
    finalColor = vec4(color * paper(p), 1.0);
}
