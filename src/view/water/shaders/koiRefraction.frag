// Filter on the koi layer: shifts what's under each pixel by the wave slope there, so the koi (and their shadows)
// wobble as if seen through the moving surface, and ripples visibly pass over them. Also tints them toward the
// water colour. Waves come from waves.glsl, prepended to this file.

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform highp vec4 uInputSize;
uniform highp vec4 uInputClamp;

// where this filter's area starts on screen (x, y) and how the stage maps to the screen (offset x, y, scale)
uniform vec2 uAreaOrigin;
uniform vec3 uStageTransform;
uniform float uKoiRefraction;
uniform vec3 uWaterTint;

void main() {
    vec2 screen = vTextureCoord * uInputSize.xy + uAreaOrigin;
    vec2 stagePos = (screen - uStageTransform.xy) / uStageTransform.z;
    vec2 shift = waveSlope(stagePos) * uKoiRefraction * uStageTransform.z; // in screen pixels
    vec2 uv = clamp(vTextureCoord + shift * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, uv);
    color.rgb = mix(color.rgb, color.rgb * uWaterTint, 0.18 * color.a);
    finalColor = color;
}
