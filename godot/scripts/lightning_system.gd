extends Node

## Periodic lightning storm. Once enabled (via the "Storm Caller" level-up),
## every `interval` seconds it zaps `bolt_count` random nearby enemies for
## LIGHTNING_DAMAGE each. Re-picking the upgrade adds another simultaneous bolt.
## The bolt visual is a placeholder — swap for Summer Studio art later.

const LIGHTNING_DAMAGE: float = 500.0  # normal enemies have 30 HP, so this one-shots
const BOLT := preload("res://scripts/lightning_bolt.gd")

@export var interval: float = 4.0
@export var strike_radius: float = 450.0  # bolts only hit enemies within this range of the player

var effects_parent: Node2D
var player: Node2D
var enabled: bool = false
var bolt_count: int = 1
var _timer: float = 0.0

func setup(parent: Node2D, player_node: Node2D) -> void:
	effects_parent = parent
	player = player_node

func enable() -> void:
	if not enabled:
		enabled = true
		_timer = interval  # first strike one full interval after enabling
	else:
		bolt_count += 1  # stacking picks add another simultaneous bolt

func _process(delta: float) -> void:
	if not enabled:
		return
	_timer -= delta
	if _timer <= 0.0:
		_timer += interval
		_strike()

func _strike() -> void:
	var all_enemies := get_tree().get_nodes_in_group("enemies")
	if all_enemies.is_empty():
		return
	# Prefer enemies within strike_radius of the player; only fall back to the
	# whole map if none are close, so Storm Caller feels like it guards the player.
	var pool: Array = all_enemies
	if is_instance_valid(player):
		var nearby := all_enemies.filter(func(e):
			return is_instance_valid(e) and e.global_position.distance_to(player.global_position) <= strike_radius)
		if not nearby.is_empty():
			pool = nearby
	Sfx.play("lightning")
	for _i in bolt_count:
		var target: Node = pool[randi() % pool.size()]
		if not is_instance_valid(target) or not target.has_method("take_damage"):
			continue  # may have just died to an earlier bolt this tick
		_spawn_bolt(target.global_position)
		target.take_damage(LIGHTNING_DAMAGE)

func _spawn_bolt(pos: Vector2) -> void:
	if effects_parent == null:
		return
	var bolt := BOLT.new()
	effects_parent.add_child(bolt)
	bolt.global_position = pos
	bolt.strike()
