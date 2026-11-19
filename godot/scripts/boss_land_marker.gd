extends Node2D

## Ground telegraph for the boss jump slam: a pulsing red target ring drawn at
## the locked landing spot during the wind-up + air time, so the player can walk
## out of the danger zone. The boss frees it on landing; it also self-frees after
## a safety timeout in case the boss dies mid-jump.

var radius: float = 230.0
var _t: float = 0.0
var _life: float = 2.5

func _ready() -> void:
	z_index = 1  # above the ground, below the boss body

func setup(r: float) -> void:
	radius = r

func _process(delta: float) -> void:
	_t += delta
	_life -= delta
	queue_redraw()
	if _life <= 0.0:
		queue_free()

func _draw() -> void:
	var pulse := 0.5 + 0.5 * sin(_t * 9.0)
	var line := Color(1.0, 0.2, 0.15, 0.45 + 0.35 * pulse)
	draw_circle(Vector2.ZERO, radius, Color(1.0, 0.15, 0.1, 0.12))            # fill hint
	draw_arc(Vector2.ZERO, radius, 0.0, TAU, 56, line, 6.0, true)            # ring
	draw_line(Vector2(-radius, 0), Vector2(radius, 0), line, 3.0)            # crosshair
	draw_line(Vector2(0, -radius), Vector2(0, radius), line, 3.0)
