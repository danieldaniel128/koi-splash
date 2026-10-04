// The ground around the pond: a soft moss lawn by moonlight. Large, gentle patches of lighter moss and a fine grain,
// all low in contrast so nothing competes with the board; the pond's light spilling onto the moss round its shore;
// a few fallen petals; a dark wet band where the ground meets the water, and a soft vignette toward the screen edges.
// It covers the whole screen (no letterbox bars on tall phones). Static: no simulation reads. common.glsl is prepended.

in vec2 vPosition;
out vec4 finalColor;

// the moss: its base, its lighter patches, and the water's light spilling onto it (colour, then strength and reach px)
uniform vec3 uGround;
uniform vec3 uMoss;
uniform vec3 uSpill;
uniform vec2 uSpillLook;
// fallen petals: two colours, then how many (share of spots that get one), their size (px) and their opacity
uniform vec3 uPetal;
uniform vec3 uLeaf;
uniform vec3 uPetals;
uniform float uWetBand;
// the vignette: the stage's centre (xy) and the size of its oval (zw: half the stage, stretched), then how much it
// darkens (x) between which distances from the centre (y, z), in those sizes
uniform vec4 uFrame;
uniform vec3 uVignette;

// Large soft patches of moss (0..1), from two octaves of slow noise.
float moss(vec2 p) {
    float n = noise(p / 140.0) * 0.65 + noise(p / 53.0 + 7.0) * 0.35;
    return smoothstep(0.3, 0.8, n);
}

// A fallen petal, if this spot of a loose grid has one: its cover (0..1) and which colour (0 petal, 1 leaf). Each
// spot is jittered and turned at random, so they never line up.
vec2 petal(vec2 p) {
    float spacing = 64.0;
    vec2 spot = floor(p / spacing);
    if (hash(spot + 3.1) > uPetals.x) return vec2(0.0);
    vec2 centre = (spot + 0.2 + 0.6 * vec2(hash(spot + 1.7), hash(spot + 5.3))) * spacing;
    float turn = hash(spot + 9.2) * 6.2831853;
    vec2 q = p - centre;
    q = vec2(cos(turn) * q.x + sin(turn) * q.y, cos(turn) * q.y - sin(turn) * q.x);
    float d = length(q / vec2(uPetals.y, uPetals.y * 0.55)) - 1.0; // a little ellipse
    return vec2(1.0 - smoothstep(-0.15, 0.15, d), step(0.6, hash(spot + 2.4)));
}

void main() {
    vec2 p = vPosition;
    float edge = pondEdge(p);
    vec3 color = mix(uGround, uMoss, moss(p));
    color *= 0.96 + 0.08 * hash(floor(p * 0.9)); // fine grain, barely there
    color += uSpill * uSpillLook.x * exp(-max(edge, 0.0) / uSpillLook.y); // the water's light on the moss
    vec2 fallen = petal(p);
    color = mix(color, mix(uPetal, uLeaf, fallen.y), fallen.x * uPetals.z);
    color *= mix(0.55, 1.0, smoothstep(0.0, uWetBand, edge)); // wet, shaded ground right at the water
    float fromCentre = length((p - uFrame.xy) / uFrame.zw);
    color *= 1.0 - uVignette.x * smoothstep(uVignette.y, uVignette.z, fromCentre);
    finalColor = vec4(color * paper(p), 1.0);
}
