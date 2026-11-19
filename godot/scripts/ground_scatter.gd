extends Node2D
# Scatters decorative props across the arena, driven by the same splat mask
# the ground shader uses: grass tufts favor grassy areas, boulders favor rocky
# areas. Deterministic: same seed -> same layout every run.
# Boulders get a StaticBody2D circle collider on layer 4 (same as the walls),
# so both the player and enemies path around them.

@export var scatter_seed: int = 4242
@export var tuft_count: int = 140
@export var boulder_count: int = 26
# Keep props out of the player's spawn area and off the walls.
@export var spawn_clear_radius: float = 260.0
@export var wall_margin: float = 120.0

const ARENA_MIN := Vector2(-1500.0, -1500.0)
const ARENA_SIZE := Vector2(3000.0, 3000.0)

var _tufts: Array[Texture2D] = []
var _boulders: Array[Texture2D] = []

func _ready() -> void:
	for i in 4:
		_tufts.append(load("res://assets/props/tuft_%d.png" % i))
		_boulders.append(load("res://assets/props/boulder_%d.png" % i))
	var mask_tex: Texture2D = get_node("../Ground").material.get_shader_parameter("splat_mask")
	var mask: Image = mask_tex.get_image()
	var rng := RandomNumberGenerator.new()
	rng.seed = scatter_seed
	var placed_tufts: int = 0
	var placed_boulders: int = 0
	var attempts: int = 0
	while (placed_tufts < tuft_count or placed_boulders < boulder_count) and attempts < 6000:
		attempts += 1
		var pos := Vector2(
			rng.randf_range(ARENA_MIN.x + wall_margin, ARENA_MIN.x + ARENA_SIZE.x - wall_margin),
			rng.randf_range(ARENA_MIN.y + wall_margin, ARENA_MIN.y + ARENA_SIZE.y - wall_margin))
		if pos.length() < spawn_clear_radius:
			continue
		var uv := (pos - ARENA_MIN) / ARENA_SIZE
		var px := mask.get_pixel(int(uv.x * mask.get_width()), int(uv.y * mask.get_height()))
		# px.r = grass weight, px.g = rock weight (see ground_splat_setup.gd).
		# Hard biome gate first: low weights must never spawn a prop, no matter
		# how many attempts run (a bare probability roll leaks props into the
		# wrong biome over thousands of attempts).
		if placed_tufts < tuft_count and px.r > 0.42 and rng.randf() < px.r:
			_place_tuft(pos, rng)
			placed_tufts += 1
		elif placed_boulders < boulder_count and rng.randf() < 0.5:
			# Boulders spawn in every biome: obstacles read best when they also
			# stand alone on sand/grass, not just camouflaged on rocky ground.
			_place_boulder(pos, rng)
			placed_boulders += 1

func _place_tuft(pos: Vector2, rng: RandomNumberGenerator) -> void:
	var s := Sprite2D.new()
	s.texture = _tufts[rng.randi_range(0, 3)]
	s.position = pos
	s.scale = Vector2.ONE * rng.randf_range(0.14, 0.26)
	s.flip_h = rng.randf() < 0.5
	add_child(s)

func _place_boulder(pos: Vector2, rng: RandomNumberGenerator) -> void:
	# Base-anchored: body.position is the boulder's ground-contact point.
	# The sprite is shifted UP so its bottom edge sits on that point, and the
	# collider circle is tangent to it from above — where you collide is
	# exactly where the rock visually meets the ground (3/4 perspective).
	var body := StaticBody2D.new()
	body.position = pos
	body.collision_layer = 4
	body.collision_mask = 0
	# Manual depth sort, same band as player.gd / enemy.gd: static, so set once.
	body.z_as_relative = false
	body.z_index = 2 + int((clampf(pos.y, -1500.0, 1500.0) + 1500.0) / 75.0)
	var s := Sprite2D.new()
	var tex: Texture2D = _boulders[rng.randi_range(0, 3)]
	var sc := rng.randf_range(0.16, 0.30)
	var half_h := tex.get_height() * sc * 0.5
	s.texture = tex
	s.scale = Vector2.ONE * sc
	s.flip_h = rng.randf() < 0.5
	s.position = Vector2(0.0, -half_h)
	body.add_child(s)
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = minf(tex.get_width() * sc * 0.30, half_h * 0.75)
	shape.shape = circle
	# Raise the circle a little: the drawn rock base sits some pixels above
	# the bottom edge of the image (contact-shadow rows).
	shape.position = Vector2(0.0, -circle.radius - half_h * 0.16)
	body.add_child(shape)
	add_child(body)
