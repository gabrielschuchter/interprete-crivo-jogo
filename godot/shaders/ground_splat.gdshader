shader_type canvas_item;

// 3-way splat ground: grass / rock / sand blended by a noise mask.
// Height-aware blending: each texture's own light-dark structure decides
// where the transition happens (sand seeps between stones and grass blades),
// giving gradual organic borders instead of a crossfade line.
//
// The height term is CENTERED per material (its luminance minus the texture's
// own average, read from the top mip) — without this, a globally brighter
// material like sand wins everywhere and every border collapses to one line.

uniform sampler2D tex_grass : source_color, repeat_enable, filter_linear_mipmap;
uniform sampler2D tex_rock : source_color, repeat_enable, filter_linear_mipmap;
uniform sampler2D tex_sand : source_color, repeat_enable, filter_linear_mipmap;
// Splat mask, sampled once across the whole arena: R=grass G=rock B=sand.
uniform sampler2D splat_mask : filter_linear;

uniform vec2 arena_min = vec2(-1500.0, -1500.0);
uniform vec2 arena_size = vec2(3000.0, 3000.0);
// World pixels covered by one repeat of each texture.
uniform float grass_tile_px = 256.0;
uniform float rock_tile_px = 320.0;
uniform float sand_tile_px = 512.0;
// How strongly texture structure steers the blend (0 = plain crossfade).
uniform float height_influence = 0.8;
// Width of the crossfade band; larger = softer.
uniform float blend_sharpness = 0.12;
// Out-of-bounds: force rock, then fade to pure black over oob_fade_px — the
// arena reads as the floor of a pit, with darkness (not distant ground)
// past the walls. No tiling is visible once fully black.
uniform float oob_fade_px = 300.0;

varying vec2 world_pos;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

float lum(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

void fragment() {
	vec3 g = texture(tex_grass, world_pos / grass_tile_px).rgb;
	vec3 r = texture(tex_rock, world_pos / rock_tile_px).rgb;
	vec3 s = texture(tex_sand, world_pos / sand_tile_px).rgb;
	vec3 w = texture(splat_mask, (world_pos - arena_min) / arena_size).rgb;

	// signed distance to the arena walls: negative inside, positive outside
	vec2 over = max(arena_min - world_pos, world_pos - (arena_min + arena_size));
	float wall_d = max(over.x, over.y);
	float outside = max(wall_d, 0.0);
	w = mix(w, vec3(0.0, 1.0, 0.0), clamp(outside / 80.0, 0.0, 1.0));

	// per-material average luminance from the smallest mip (~1x1)
	vec3 means = vec3(
		lum(textureLod(tex_grass, vec2(0.5), 12.0).rgb),
		lum(textureLod(tex_rock, vec2(0.5), 12.0).rgb),
		lum(textureLod(tex_sand, vec2(0.5), 12.0).rgb));
	vec3 heights = vec3(lum(g), lum(r), lum(s)) - means;

	vec3 hb = heights * height_influence + w;
	float ma = max(hb.x, max(hb.y, hb.z));
	vec3 b = max(hb - ma + blend_sharpness, vec3(0.0));
	vec3 col = (g * b.x + r * b.y + s * b.z) / (b.x + b.y + b.z);
	// Readable arena edge: a crisp dark line just INSIDE the wall, then a
	// brightness step and a quick fade to solid black outside (pit walls).
	if (wall_d > 0.0) {
		col *= mix(0.55, 0.0, smoothstep(0.0, oob_fade_px, wall_d));
	} else {
		float edge_line = 1.0 - smoothstep(4.0, 16.0, -wall_d);
		col *= mix(1.0, 0.5, edge_line);
	}
	COLOR = vec4(col, 1.0);
}
