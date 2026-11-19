extends Area2D

## An XP pickup. Sits still until the player's magnet calls attract_to(),
## then flies to the player and is collected.

@export var xp_value: int = 1
@export var fly_speed: float = 500.0
@export var spin_speed: float = 4.0  # coin-flip spin rate (rad/sec)

const COLLECT_DIST: float = 16.0

@onready var spr: Sprite2D = $Sprite2D

var _target: Node2D = null
var _base_sx: float = 1.0
var _t: float = 0.0

func _ready() -> void:
	add_to_group("xp_gems")
	_base_sx = spr.scale.x

func _process(delta: float) -> void:
	# Coin-flip spin around the vertical axis for a bit of life.
	_t += delta
	spr.scale.x = _base_sx * cos(_t * spin_speed)

func attract_to(p: Node2D) -> void:
	_target = p

func _physics_process(delta: float) -> void:
	if not is_instance_valid(_target):
		return
	global_position = global_position.move_toward(_target.global_position, fly_speed * delta)
	if global_position.distance_to(_target.global_position) <= COLLECT_DIST:
		get_tree().call_group("level_system", "add_xp", xp_value)
		get_tree().call_group("xp_sfx", "play")
		queue_free()
