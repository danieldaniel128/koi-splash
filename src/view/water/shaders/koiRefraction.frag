// Filter on the koi layer:
// - shifts what's under each pixel by the wave slope there, so the koi (and their shadows) bend under the moving
//   surface and every ripple visibly passes over them
// - tints them slightly toward the water colour
// - draws a broken white foam outline just outside each koi, like objects touching toon water; it wobbles with time
// Waves come from waves.glsl, prepended to this file.

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
uniform float uOutline;
uniform float uOutlineWidth;

vec4 sampleAt(vec2 uv) {
    return texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw));
}

void main() {
    vec2 screen = vTextureCoord * uInputSize.xy + uAreaOrigin;
    vec2 stagePos = (screen - uStageTransform.xy) / uStageTransform.z;
    vec2 shift = waveSlope(stagePos) * uKoiRefraction * uStageTransform.z; // in screen pixels
    vec2 uv = vTextureCoord + shift * uInputSize.zw;
    vec4 color = sampleAt(uv);
    color.rgb = mix(color.rgb, color.rgb * uWaterTint * 1.6, 0.15 * color.a);

    // foam outline: this pixel is (mostly) water, but a koi body is within reach. The shadows are faint (low
    // alpha), so only the koi themselves get an outline.
    float reach = uOutlineWidth * uStageTransform.z;
    float body = 0.0;
    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 0.7854 + uTime * 0.8;
        vec2 offset = vec2(cos(angle), sin(angle)) * reach * uInputSize.zw;
        body = max(body, smoothstep(0.55, 0.75, sampleAt(uv + offset).a));
    }
    float outside = 1.0 - smoothstep(0.45, 0.65, color.a);
    float broken = smoothstep(0.45, 0.6, noise(stagePos * 0.2 + vec2(uTime * 0.9, -uTime * 0.6)));
    float foam = body * outside * broken * uOutline;

    finalColor = color * (1.0 - foam) + vec4(foam); // premultiplied: white foam over what's there
}
