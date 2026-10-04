// Filter on the koi layer: the koi swim just under the surface, so
// - what's under each pixel shifts with the wave slope there, and every ripple visibly passes over the koi (and
//   their shadows on the bottom)
// - they take on a little of the water colour, so they sit in the water instead of on top of it
// No foam here: the foam around each koi is drawn above them by surface.frag (koiFoam), from the KoiContact mask.
// common.glsl and waves.glsl are prepended to this file.

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
uniform float uTint;

void main() {
    vec2 screen = vTextureCoord * uInputSize.xy + uAreaOrigin;
    vec2 stagePos = (screen - uStageTransform.xy) / uStageTransform.z;
    vec2 shift = waves(stagePos).yz * uKoiRefraction * uStageTransform.z; // in screen pixels
    vec2 uv = clamp(vTextureCoord + shift * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, uv);
    color.rgb = mix(color.rgb, uWaterTint * color.a, uTint); // premultiplied
    finalColor = color;
}
