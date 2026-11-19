extends Sprite2D
# Bakes the ground splat mask (grass/rock/sand weights) with domain-warped
# fractal noise and assigns the splat shader material. Deterministic: same
# seed -> same world every run.
#
# The biome ramps are CENTERED on their threshold (weight 0.5 exactly on the
# isoline) — one-sided ramps silently hand the whole map to one material when
# the band widens. Fine fractal "detail" noise is added into the weights so
# borders wander and interpenetrate instead of tracing a smooth curve.

@export var noise_seed: int = 1337
@export var mask_size: int = 384
# World px per noise feature; bigger = larger terrain patches.
@export var feature_scale: float = 900.0
# Width of the grass<->sand and rock ramps, in noise units.
@export var grass_band: float = 0.40
@export var rock_band: float = 0.35
# Fine border-wander noise: feature size (world px) and strength.
@export var detail_scale: float = 110.0
@export var detail_amp: float = 0.12
# Rocky rim near the arena walls so the boundary reads as natural terrain.
@export var edge_rock_strength: float = 0.55
@export var edge_rock_start: float = 1050.0
@export var edge_rock_width: float = 450.0

const ARENA_MIN := Vector2(-1500.0, -1500.0)
const ARENA_SIZE := Vector2(3000.0, 3000.0)

func _ready() -> void:
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/ground_splat.gdshader")
	mat.set_shader_parameter("tex_grass", load("res://assets/ground_grass.png"))
	mat.set_shader_parameter("tex_rock", load("res://assets/ground_rock.png"))
	mat.set_shader_parameter("tex_sand", load("res://assets/ground_sand.png"))
	mat.set_shader_parameter("splat_mask", _bake_mask())
	mat.set_shader_parameter("arena_min", ARENA_MIN)
	mat.set_shader_parameter("arena_size", ARENA_SIZE)
	material = mat

func _make_noise(seed_offset: int, freq_mul: float, warped: bool) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.seed = noise_seed + seed_offset
	n.noise_type = FastNoiseLite.TYPE_VALUE
	n.fractal_type = FastNoiseLite.FRACTAL_FBM
	n.fractal_octaves = 5
	n.frequency = freq_mul / feature_scale
	if warped:
		n.domain_warp_enabled = true
		n.domain_warp_type = FastNoiseLite.DOMAIN_WARP_SIMPLEX
		n.domain_warp_amplitude = feature_scale * 1.4
		n.domain_warp_fractal_type = FastNoiseLite.DOMAIN_WARP_FRACTAL_INDEPENDENT
		n.domain_warp_frequency = 1.0 / feature_scale
	return n

func _bake_mask() -> ImageTexture:
	var moisture := _make_noise(0, 1.0, true)
	var rockiness := _make_noise(5000, 1.7, true)
	var det_g := _make_noise(11000, feature_scale / detail_scale, false)
	var det_r := _make_noise(14000, feature_scale / detail_scale, false)
	var det_s := _make_noise(17000, feature_scale / detail_scale, false)
	var img := Image.create(mask_size, mask_size, false, Image.FORMAT_RGB8)
	for y in mask_size:
		for x in mask_size:
			var wp := ARENA_MIN + ARENA_SIZE * Vector2((x + 0.5) / mask_size, (y + 0.5) / mask_size)
			var m := moisture.get_noise_2d(wp.x, wp.y) * 0.5 + 0.5
			var r := rockiness.get_noise_2d(wp.x, wp.y) * 0.5 + 0.5
			var d := maxf(absf(wp.x), absf(wp.y))
			var rim := clampf((d - edge_rock_start) / edge_rock_width, 0.0, 1.0)
			r += edge_rock_strength * rim * rim
			var rock_w := clampf(0.5 + (r - 0.64) / rock_band, 0.0, 1.0)
			var grass_vs_sand := clampf(0.5 + (m - 0.55) / grass_band, 0.0, 1.0)
			var grass_w := (1.0 - rock_w) * grass_vs_sand
			var sand_w := (1.0 - rock_w) * (1.0 - grass_vs_sand)
			grass_w += detail_amp * det_g.get_noise_2d(wp.x, wp.y)
			rock_w += detail_amp * det_r.get_noise_2d(wp.x, wp.y)
			sand_w += detail_amp * det_s.get_noise_2d(wp.x, wp.y)
			img.set_pixel(x, y, Color(clampf(grass_w, 0.0, 1.0), clampf(rock_w, 0.0, 1.0), clampf(sand_w, 0.0, 1.0)))
	return ImageTexture.create_from_image(img)
