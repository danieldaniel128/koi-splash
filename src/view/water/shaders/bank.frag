// The ground around the pond: a zen garden of raked gravel by moonlight. Round the pond the rake lines follow its
// shore (lines of equal distance to the water, read from the pond's distance field, so they hug any board shape);
// past a few rings they turn into straight rows, as in a dry garden. A hand-held wobble, gravel grain, a dark wet band
// where the ground meets the water, and a soft vignette toward the screen edges. It covers the whole screen (no
// letterbox bars on tall phones). Static: no simulation reads. common.glsl is prepended.

in vec2 vPosition;
out vec4 finalColor;

// the gravel's colour, its raked ridges (lit) and grooves (in shadow)
uniform vec3 uGround;
uniform vec3 uRidge;
uniform vec3 uGroove;
// the rake: px between lines, how many rings follow the shore before the straight rows, and how much the lines wobble
uniform vec3 uRake;
uniform float uWetBand;
// the vignette: the stage's centre (xy) and the size of its oval (zw: half the stage, stretched), then how much it
// darkens (x) between which distances from the centre (y, z), in those sizes
uniform vec4 uFrame;
uniform vec3 uVignette;

// One raked groove profile across a line's width (0 in the groove, 1 on the ridge), soft-edged so it never aliases.
float rakeProfile(float phase) {
    float across = abs(fract(phase) - 0.5) * 2.0;
    return smoothstep(0.15, 0.85, across);
}

// The raked pattern at p, `edge` px out from the water: rings round the shore, then straight rows; 0 groove, 1 ridge.
float raked(vec2 p, float edge) {
    float wobble = (noise(p / 37.0) - 0.5) * 2.0 * uRake.z;
    float rings = rakeProfile((edge + wobble) / uRake.x);
    float rows = rakeProfile((p.y + wobble * 1.5) / uRake.x);
    // where the rings end there is a clean border, then the rows, the way a dry garden is raked
    float ringsEnd = uRake.x * uRake.y;
    return mix(rings, rows, smoothstep(ringsEnd, ringsEnd + uRake.x * 0.6, edge));
}

void main() {
    vec2 p = vPosition;
    float edge = pondEdge(p);
    float ridge = raked(p, edge);
    vec3 color = mix(uGroove, uRidge, ridge);
    color = mix(uGround, color, 0.85);
    color *= 0.9 + 0.2 * hash(floor(p * 1.3)); // gravel grain
    color *= mix(0.45, 1.0, smoothstep(0.0, uWetBand, edge)); // wet, shaded ground right at the water
    float fromCentre = length((p - uFrame.xy) / uFrame.zw);
    color *= 1.0 - uVignette.x * smoothstep(uVignette.y, uVignette.z, fromCentre);
    finalColor = vec4(color * paper(p), 1.0);
}
