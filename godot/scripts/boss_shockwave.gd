extends Node2D

## Expanding ring left by the boss's jump slam. Grows outward and deals one hit
## to the player as the ring sweeps past them (distance check, no physics body).
## Frees itself when it reaches max radius.

var radius: float = 0.0
var max_radius: float = 300.0
var speed: float = 950.0   # expansion speed px/s
var damage: float = 40.0
var player: Node2D
var _hit: bool = false

func _ready() -> void:
	z_index = 55

func setup(p: Node2D, dmg: float, maxr: float) -> void:
	player = p
	damage = dmg
	max_radius = maxr

func _process(delta: float) -> void:
	radius += speed * delta
	queue_redraw()
	if not _hit and is_instance_valid(player) \
			and player.global_position.distance_to(global_position) <= radius:
		_hit = true
		if player.has_method("apply_hit"):
			player.apply_hit(damage)
	if radius >= max_radius:
		queue_free()

func _draw() -> void:
	var t := clampf(radius / max_radius, 0.0, 1.0)
	var a := 1.0 - t
	draw_arc(Vector2.ZERO, radius, 0.0, TAU, 64, Color(1.0, 0.5, 0.15, a), 16.0 * (1.0 - 0.5 * t), true)
	draw_arc(Vector2.ZERO, radius * 0.9, 0.0, TAU, 64, Color(1.0, 0.9, 0.6, a * 0.7), 6.0, true)
