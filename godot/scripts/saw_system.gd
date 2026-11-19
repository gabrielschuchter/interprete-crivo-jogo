extends Node2D

## Holds the player's orbiting saws. Starts empty; add_saw() adds one and
## re-spaces them evenly, each at a slightly larger radius. Saws orbit at
## different (and overall slightly slower) speeds so they visibly desync, and a
## thin tether line links each saw back to the player. Where two saws happen to
## overlap the same enemy, the damage stacks (see saw.gd's global-frame gating).

const SAW_SCENE := preload("res://scenes/saw.tscn")

@export var base_radius: float = 70.0
@export var radius_step: float = 22.0
@export var radius_growth: float = 5.0  # extra spacing added per saw, so each new saw sits a bit farther out
@export var orbit_speed: float = 2.6  # base rad/sec; each saw's actual speed varies below
@export var damage_per_sec: float = 75.0

@export var tether_width: float = 2.0
@export var tether_color: Color = Color(0.55, 0.45, 0.3, 0.9)  # visible rope/chain tone

var _saws: Array = []
var _tethers: Array = []

func add_saw() -> void:
	var saw := SAW_SCENE.instantiate()
	saw.z_index = 44  # blade stays above the depth-sorted band (actors at z 2-42) and the tether rope
	add_child(saw)
	_saws.append(saw)
	# A rope/line that shows the saw is tethered to the player. z_index must be
	# >= 0: a negative z draws it BEHIND the ground sprites (z 0) and it vanishes.
	# At z 1 it sits above the ground but below the player sprite (z 2), so the rope
	# passes behind the player's body.
	var line := Line2D.new()
	line.width = tether_width
	line.default_color = tether_color
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	line.z_index = -1  # behind the player sprite (relative z 0), above the ground
	add_child(line)
	_tethers.append(line)
	_reconfigure()

func _reconfigure() -> void:
	var n := _saws.size()
	for i in n:
		# Radius grows a little MORE for each successive saw (quadratic term), so
		# outer saws spread out progressively rather than at a constant step.
		var radius := base_radius + i * radius_step + radius_growth * i * i
		var start_angle := float(i) / float(n) * TAU
		# Alternate the orbit direction: every second saw circles the player the
		# opposite way (sign of the speed flips the orbit).
		var dir := 1.0 if i % 2 == 0 else -1.0
		# Each successive saw is a bit slower, so no two share an orbit speed.
		var speed := orbit_speed * maxf(0.5, 1.0 - 0.12 * i) * dir
		_saws[i].configure(radius, start_angle, speed, damage_per_sec)

func _process(_delta: float) -> void:
	# Stretch each tether from the player (local origin) out to its saw.
	for i in _saws.size():
		_tethers[i].points = PackedVector2Array([Vector2.ZERO, _saws[i].position])
