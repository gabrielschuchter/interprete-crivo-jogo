extends Node2D

## Directional telegraph for the boss charge: a pulsing orange tapering beam from
## the boss along the locked dash direction, so the player can sidestep. Added as
## a child of the boss (drawn from local origin) and freed when the dash starts.

var dir: Vector2 = Vector2.RIGHT
var length: float = 270.0
var _t: float = 0.0

func _ready() -> void:
	z_index = 1

func setup(d: Vector2, l: float) -> void:
	dir = d.normalized()
	length = l

func _process(delta: float) -> void:
	_t += delta
	queue_redraw()

func _draw() -> void:
	var pulse := 0.5 + 0.5 * sin(_t * 12.0)
	var col := Color(1.0, 0.4, 0.1, 0.22 + 0.3 * pulse)
	var perp := dir.orthogonal()
	var base_w := 30.0
	var tip_w := 6.0
	var tip := dir * length
	# Trapezoid: wide at the boss, tapering to a point along the dash line.
	var pts := PackedVector2Array([
		perp * base_w,
		tip + perp * tip_w,
		tip - perp * tip_w,
		-perp * base_w,
	])
	draw_colored_polygon(pts, col)
