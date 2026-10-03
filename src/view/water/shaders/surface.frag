// The water surface, drawn above the koi: moonlight glints on the wave facets, a wobbling reflection of the moon,
// a faint sky sheen on steep slopes and foam along the shore. Transparent everywhere else, so the koi show through.
// Waves and the pond shape come from waves.glsl, prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

uniform vec4 uPond;
uniform float uPondRadius;
uniform vec2 uMoonPos;
uniform vec3 uMoon;
uniform float uGlintStrength;
uniform float uGlintSharpness;
uniform float uMoonReflection;
uniform float uSkyReflection;
uniform float uFoam;

void main() {
    vec2 p = vPosition;
    float edge = roundedBox(p - (uPond.xy + uPond.zw * 0.5), uPond.zw * 0.5, uPondRadius);
    if (edge > 2.0) {
        finalColor = vec4(0.0);
        return;
    }
    float inside = 1.0 - smoothstep(-1.0, 1.0, edge);

    vec2 slope = waveSlope(p);
    vec3 normal = normalize(vec3(-slope, 1.0));

    // glints: facets tilted so the moon reflects straight up into the eye
    vec3 toMoon = normalize(vec3((uMoonPos - p) / 260.0, 1.0));
    vec3 halfway = normalize(toMoon + vec3(0.0, 0.0, 1.0));
    float glint = pow(max(dot(normal, halfway), 0.0), uGlintSharpness) * uGlintStrength;

    // the moon's own reflection: a soft bright patch near the moon, broken up by the waves
    float moonPatch = exp(-length(p + slope * 22.0 - uMoonPos) / 18.0) * uMoonReflection;

    // steeper slopes reflect more of the sky (a cheap Fresnel)
    float sheen = clamp(length(slope) * 1.5, 0.0, 1.0) * uSkyReflection;

    // foam: a broken band hugging the shore
    float foamBand = smoothstep(-9.0, -1.0, edge) * (1.0 - smoothstep(-1.0, 1.0, edge));
    float foam = foamBand * smoothstep(0.45, 0.8, noise(p * 0.25 + vec2(uTime * 0.6, -uTime * 0.4))) * uFoam;

    float alpha = clamp(glint + moonPatch + sheen + foam, 0.0, 1.0) * inside;
    vec3 color = mix(vec3(0.75, 0.88, 1.0), uMoon, clamp(glint + moonPatch, 0.0, 1.0));
    finalColor = vec4(color * alpha, alpha); // premultiplied alpha, as Pixi blends it
}
