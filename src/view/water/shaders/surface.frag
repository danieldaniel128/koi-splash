// The water surface, drawn above the koi. Kept sparse so the koi always read clearly:
// - the waterline around every koi: a thin broken foam line hugging its head and back where they break the surface,
//   moved by the waves with the koi, pushed out by rising water and swelling where the water is stirred
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
// where the koi touch the water (KoiContact): cover in alpha; per koi in red (at the surface), green (head and back,
// where the foam goes) and blue (stirring the water), all premultiplied. uMaskArea is the stage rectangle it covers.
uniform sampler2D uKoiMask;
uniform vec4 uMaskArea;
// koi foam: line width (px), strength, how far a rising wave pushes it out, size of its breaks (px)
uniform vec4 uContact;
// how far the waves shift the koi (px per unit of slope): the foam moves with them
uniform float uKoiShift;

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

// The waterline around the koi: the line where the koi mask `k` crosses one half (just outside the koi's ink
// outline), a constant width on screen (`rate` is how much the mask changes per pixel). It breaks into strokes that
// drift along it, tapers off toward the tail (which is under the water), rides out on rising water and swells where
// the koi or a passing wave stirs the water.
float koiFoam(vec2 p, vec3 w, vec4 k, float rate) {
    float cover = max(k.a, 0.02);
    float level = 0.5 - clamp(w.x * uContact.z, -0.06, 0.06); // small, or the line folds into several
    float dist = abs(k.a - level) / max(rate, 1e-4); // device px from the waterline
    float stir = min(k.b / cover + length(w.yz) * 4.0, 1.0);
    float breaks = smoothstep(0.32, 0.6, noise(p / uContact.w + vec2(uTime * 0.35, -uTime * 0.25)) + stir * 0.25);
    float width = uContact.x * (0.5 + 0.7 * breaks) * (1.0 + stir * 0.7) * uPixelRatio;
    float atSurface = clamp(k.r / cover, 0.0, 1.0);
    float head = clamp(k.g / cover, 0.0, 1.0);
    return lineCover(dist, width) * breaks * head * atSurface * uContact.y;
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
    // the koi mask, where the waves have shifted the koi to, and its rate of change are read before any pixel leaves:
    // a derivative is only defined while every pixel of its 2x2 block is still running
    vec3 w = waves(p);
    vec4 koi = texture(uKoiMask, (p + w.yz * uKoiShift - uMaskArea.xy) / uMaskArea.zw);
    float koiRate = fwidth(koi.a);
    float edge = waterEdge(p); // foam outlines the shore and every stone and pad
    if (edge > 0.0) {
        finalColor = vec4(0.0);
        return;
    }
    float rim = moonOnWaves(w, uLightDir, uRim.xy).y * uRim.z;
    float foam = max(shoreFoam(p, edge, w.x), koiFoam(p, w, koi, koiRate));
    float open = smoothstep(2.0, 8.0, rectEdge(p, uBoard)); // 1 on the open water past the board
    float gold = goldLeaf(p) * open * uGoldLook.x;

    float white = clamp(max(rim, foam), 0.0, 1.0);
    float alpha = max(white, gold);
    vec3 color = (uInk * white + uGold * gold * (1.0 - white)) / max(alpha, 1e-4);
    finalColor = vec4(color * alpha, alpha); // premultiplied alpha, as Pixi blends it
}
