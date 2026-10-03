// Reads the water simulation for the shaders that draw with it (water, surface, koi refraction), so all three show
// the same waves. Prepended after common.glsl. Positions are stage pixels; the simulation covers the pond.

uniform sampler2D uState;
// the simulated rectangle on the stage (x, y, width, height) and the simulation size in cells
uniform vec4 uSimArea;
uniform vec2 uSimSize;
uniform float uWaveScale;
uniform float uTime;
// device pixels per stage pixel, so lines keep their width on any screen
uniform float uPixelRatio;

float unpackHeight(vec4 texel) {
    return (texel.r + texel.g / 255.0) * 2.0 - 1.0;
}

float heightAt(vec2 uv) {
    return unpackHeight(texture(uState, uv));
}

// The water at a stage point: x = height, yz = slope (dh/dx, dh/dy, scaled by uWaveScale). Smoothly interpolated
// between cells by hand (the packed texels can't be filtered by the GPU); 8 reads give the height and a slope that
// is continuous across cells, so refraction and lines don't show the simulation grid.
vec3 waves(vec2 p) {
    vec2 cell = (p - uSimArea.xy) / uSimArea.zw * uSimSize - 0.5;
    vec2 base = floor(cell);
    vec2 f = cell - base;
    vec2 t = 1.0 / uSimSize;
    vec2 uv = (base + 0.5) * t;
    float h00 = heightAt(uv);
    float h10 = heightAt(uv + vec2(t.x, 0.0));
    float h20 = heightAt(uv + vec2(2.0 * t.x, 0.0));
    float h01 = heightAt(uv + vec2(0.0, t.y));
    float h11 = heightAt(uv + t);
    float h21 = heightAt(uv + vec2(2.0 * t.x, t.y));
    float h02 = heightAt(uv + vec2(0.0, 2.0 * t.y));
    float h12 = heightAt(uv + vec2(t.x, 2.0 * t.y));
    float h = mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
    float hx = mix(mix(h10, h20, f.x), mix(h11, h21, f.x), f.y);
    float hy = mix(mix(h01, h11, f.x), mix(h02, h12, f.x), f.y);
    return vec3(h, vec2(hx - h, hy - h) * uWaveScale);
}

// Thin ink lines on the ripples: one where the water passes its rest level between every crest and trough, so a
// ring shows as a few stacked thin circles and a wake as stacked arcs, `width` stage px wide whatever the wave's
// size. `gate`: the slope (height per px) where a line starts to show and where it's at full strength, so calm
// water draws nothing and a fading ring thins out and disappears.
float rippleLines(vec3 w, vec2 gate, float width) {
    float cellPx = uSimArea.z / uSimSize.x;
    float gradient = length(w.yz) / (uWaveScale * cellPx); // height change per stage px
    float strength = smoothstep(gate.x, gate.y, gradient);
    float dist = abs(w.x) / max(gradient, 1e-6); // stage px from the line
    return lineCover(dist * uPixelRatio, width * mix(0.5, 1.0, strength) * uPixelRatio) * strength;
}
