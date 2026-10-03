// The water surface, drawn above the koi: a few small four-point sparkles that twinkle on the water. Transparent
// everywhere else, so the koi show through. Over the board they're dimmer, so they never hide a piece.
// Waves and the pond shape come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec4 uPond;
uniform float uPondRadius;
// the board rectangle (x, y, width, height): sparkles over it are scaled by uBoardGlare
uniform vec4 uBoard;
uniform float uBoardGlare;
uniform float uSparkleSpacing;
uniform float uSparkleChance;
uniform float uSparkleSize;

// A four-point star: two thin crossed streaks and a bright dot, sized by `size` (px).
float star(vec2 d, float size) {
    vec2 a = abs(d) / size;
    float streaks = max(smoothstep(0.12, 0.0, a.y) * smoothstep(1.0, 0.0, a.x),
                        smoothstep(0.12, 0.0, a.x) * smoothstep(1.0, 0.0, a.y));
    return max(streaks, smoothstep(0.3, 0.0, length(a)));
}

void main() {
    vec2 p = vPosition;
    float edge = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    vec2 cell = floor(p / uSparkleSpacing);
    // outside the water, or a cell without a sparkle: nothing to draw
    if (edge > -2.0 || hash(cell + 9.1) > uSparkleChance) {
        finalColor = vec4(0.0);
        return;
    }

    vec2 centre = (cell + 0.2 + vec2(hash(cell), hash(cell + 3.7)) * 0.6) * uSparkleSpacing;
    float twinkle = pow(max(sin(uTime * (1.2 + hash(cell + 1.3) * 1.6) + hash(cell + 7.7) * 6.28), 0.0), 6.0);
    float size = uSparkleSize * (0.6 + 0.4 * twinkle);

    vec2 fromBoard = abs(p - (uBoard.xy + uBoard.zw * 0.5)) - uBoard.zw * 0.5;
    float overBoard = 1.0 - smoothstep(-12.0, 12.0, max(fromBoard.x, fromBoard.y));
    float alpha = star(p - centre, size) * twinkle * mix(1.0, uBoardGlare, overBoard);
    finalColor = vec4(vec3(1.0, 0.98, 0.9) * alpha, alpha); // premultiplied alpha, as Pixi blends it
}
