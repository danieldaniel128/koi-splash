// The water surface, drawn above the koi, toon style:
// - crisp white foam lines on the crests of the simulated waves (wakes, tail flicks, splashes)
// - short white glint dashes that come and go on the gently moving water
// - a broken white foam line just inside the shore
// - a few twinkling four-point sparkles
// Transparent everywhere else. Over the board everything is scaled down so it never hides a koi.
// Waves come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec4 uPond;
uniform float uPondRadius;
// the board rectangle (x, y, width, height)
uniform vec4 uBoard;
uniform float uBoardGlare;
uniform float uCrest;
uniform float uFoamLines;
uniform float uGlints;
uniform float uShoreFoam;
uniform float uSparkles;

// A four-point star: two thin crossed streaks and a bright dot, sized by `size` (px).
float star(vec2 d, float size) {
    vec2 a = abs(d) / size;
    float streaks = max(smoothstep(0.12, 0.0, a.y) * smoothstep(1.0, 0.0, a.x),
                        smoothstep(0.12, 0.0, a.x) * smoothstep(1.0, 0.0, a.y));
    return max(streaks, smoothstep(0.3, 0.0, length(a)));
}

float sparkle(vec2 p) {
    vec2 cell = floor(p / 52.0);
    if (hash(cell + 9.1) > 0.3) return 0.0;
    vec2 centre = (cell + 0.2 + vec2(hash(cell), hash(cell + 3.7)) * 0.6) * 52.0;
    float twinkle = pow(max(sin(uTime * (1.2 + hash(cell + 1.3) * 1.6) + hash(cell + 7.7) * 6.28), 0.0), 6.0);
    return star(p - centre, 7.0 * (0.6 + 0.4 * twinkle)) * twinkle;
}

// Short horizontal dashes of light: noise stretched sideways, cut off sharply, drifting and changing over time.
float glints(vec2 p, vec2 slope) {
    vec2 q = vec2(p.x * 0.06, p.y * 0.38) + slope * 2.0;
    float n = noise(q + vec2(uTime * 0.5, uTime * 0.17)) * noise(q * 1.7 - vec2(uTime * 0.3, -uTime * 0.21) + 4.0);
    return smoothstep(0.6, 0.64, n);
}

void main() {
    vec2 p = vPosition;
    float edge = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    if (edge > -1.0) {
        finalColor = vec4(0.0);
        return;
    }

    vec2 slope = waveSlope(p);
    float height = waterHeight(p);
    // the crest of every simulated wave becomes a clean white line
    float crest = smoothstep(uCrest, uCrest + 0.012, height) * uFoamLines;

    // shore foam: a white line a few px inside the edge, broken into pieces that slowly change
    float along = noise(p * 0.07 + vec2(uTime * 0.2, 0.0));
    float shoreLine = smoothstep(-7.5, -6.5, edge) * (1.0 - smoothstep(-4.5, -3.5, edge));
    float shore = shoreLine * smoothstep(0.38, 0.42, along) * uShoreFoam;

    vec2 fromBoard = abs(p - (uBoard.xy + uBoard.zw * 0.5)) - uBoard.zw * 0.5;
    float overBoard = 1.0 - smoothstep(-12.0, 12.0, max(fromBoard.x, fromBoard.y));
    float glare = mix(1.0, uBoardGlare, overBoard);
    float light = (glints(p, slope) * uGlints + sparkle(p) * uSparkles) * glare;

    float alpha = clamp(max(max(crest * mix(1.0, 0.75, overBoard), shore), light), 0.0, 1.0);
    finalColor = vec4(vec3(1.0) * alpha, alpha); // premultiplied alpha, as Pixi blends it
}
