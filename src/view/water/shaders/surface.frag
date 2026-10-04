// The water surface, drawn above the koi. Kept sparse so the koi always read clearly:
// - the bright rim of strong wave fronts again, but faint, so a ring passes over a koi instead of stopping at it
// - shore foam: a calligraphic stroke just inside the shore (and around every stone and pad) that swells, tapers
//   and breaks, with a fainter second stroke further out; waves arriving push it out and back
// - a few flecks of gold leaf glinting on the open water, each fading in and out; never over the board
// Transparent everywhere else. common.glsl and waves.glsl are prepended to this file.

in vec2 vPosition;
out vec4 finalColor;

// the board rectangle (x, y, width, height)
uniform vec4 uBoard;
uniform vec3 uInk;
uniform vec2 uLightDir;
// rim on strong fronts: slope where it starts and where it's full, strength over the koi
uniform vec3 uRim;
// shore foam width (px), strength, how far waves push it (px per unit of height)
uniform vec3 uFoam;
uniform vec3 uGold;
// gold strength, grid size (px)
uniform vec2 uGoldLook;

float shoreFoam(vec2 p, float edge, float height) {
    float push = clamp(height * uFoam.z, -3.0, 3.0);
    float n1 = noise(p / 22.0 + vec2(uTime * 0.03, 0.0));
    float n2 = noise(p / 15.0 + vec2(11.0, -uTime * 0.025));
    float width1 = uFoam.x * smoothstep(0.42, 0.72, n1); // swells, tapers and breaks along the shore
    float width2 = uFoam.x * 0.55 * smoothstep(0.5, 0.78, n2);
    float main = lineCover(abs(edge + 3.5 + push) * uPixelRatio, width1 * uPixelRatio);
    float outer = lineCover(abs(edge + 8.5 + push * 1.5) * uPixelRatio, width2 * uPixelRatio) * 0.5;
    return max(main, outer) * uFoam.y;
}

// A fleck of gold leaf in some cells of a grid: a thin pointed sliver that fades in, glints and fades out.
float goldLeaf(vec2 p) {
    vec2 cell = floor(p / uGoldLook.y);
    if (hash(cell + 3.3) > 0.4) return 0.0;
    float life = fract(uTime / (4.0 + 4.0 * hash(cell + 1.7)) + hash(cell + 8.1));
    float shown = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.22, 0.4, life));
    vec2 centre = (cell + 0.2 + 0.6 * vec2(hash(cell + 2.0), hash(cell + 5.0))) * uGoldLook.y;
    float angle = (hash(cell + 9.0) - 0.5) * 0.7;
    vec2 d = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (p - centre);
    float sliver = length(d / vec2(4.6, 1.0));
    return (1.0 - smoothstep(0.6, 1.0, sliver)) * shown;
}

void main() {
    vec2 p = vPosition;
    float edge = waterEdge(p); // foam outlines the shore and every stone and pad
    if (edge > 0.0) {
        finalColor = vec4(0.0);
        return;
    }
    vec3 w = waves(p);
    float rim = moonOnWaves(w, uLightDir, uRim.xy).y * uRim.z;
    float foam = shoreFoam(p, edge, w.x);
    float open = smoothstep(2.0, 8.0, rectEdge(p, uBoard)); // 1 on the open water past the board
    float gold = goldLeaf(p) * open * uGoldLook.x;

    float white = clamp(max(rim, foam), 0.0, 1.0);
    float alpha = max(white, gold);
    vec3 color = (uInk * white + uGold * gold * (1.0 - white)) / max(alpha, 1e-4);
    finalColor = vec4(color * alpha, alpha); // premultiplied alpha, as Pixi blends it
}
