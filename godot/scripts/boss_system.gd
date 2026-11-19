extends Node

## Schedules and tracks the boss. Spawns the first boss after `first_boss_time`,
## then one every `repeat_interval` (only ever one alive at a time). While a boss
## is alive it throttles normal enemy spawns and shows the boss health bar.
## The XP-burst reward on death is handled in main.gd (it owns the gem pool).

const BOSS_SCENE := preload("res://scenes/boss.tscn")

@export var first_boss_time: float = 120.0
@export var repeat_interval: float = 120.0
@export var base_hp: float = 500.0
@export var hp_per_level: float = 100.0
@export var base_stalk_speed: float = 60.0
@export var stalk_speed_per_level: float = 2.0  # boss moves slightly faster at higher levels
@export var base_move_cooldown: float = 2.0
@export var move_cooldown_decay: float = 0.99  # downtime between moves drops 1% per level
@export var spawn_distance: float = 750.0
@export var alive_spawn_scale: float = 0.2  # normal enemies spawn at 20% while boss is up
@export var world_half_size: float = 1500.0

var player: Node2D
var enemies: Node2D
var level_system: Node
var spawner: Node
var boss_bar: ProgressBar
var warning: Label
var roar: AudioStreamPlayer

var _boss: Node = null
var _elapsed: float = 0.0
var _next_time: float = 0.0

func setup(p: Node2D, e: Node2D, lvl: Node, spw: Node, bar: ProgressBar, warn: Label, roar_player: AudioStreamPlayer) -> void:
	player = p
	enemies = e
	level_system = lvl
	spawner = spw
	boss_bar = bar
	warning = warn
	roar = roar_player
	_next_time = first_boss_time
	if boss_bar != null:
		boss_bar.visible = false
	if warning != null:
		warning.visible = false

func _process(delta: float) -> void:
	if is_instance_valid(_boss):
		_update_bar()
		return
	_elapsed += delta
	if _elapsed >= _next_time:
		spawn_boss()

## Spawn a boss now (used by the scheduler and the debug key). No-op if one is alive.
func spawn_boss() -> void:
	if is_instance_valid(_boss) or not is_instance_valid(player):
		return
	var boss := BOSS_SCENE.instantiate()
	boss.target = player
	# Scale HP off the current player level. Set BEFORE add_child so the boss's
	# _ready() seeds health from the final max_health.
	boss.max_health = base_hp + hp_per_level * float(_current_level())
	# Boss stalks slightly faster the higher the player's level.
	boss.stalk_speed = base_stalk_speed + stalk_speed_per_level * float(_current_level())
	# Downtime between moves shrinks 1% per level (compounding).
	boss.move_cooldown = base_move_cooldown * pow(move_cooldown_decay, float(_current_level() - 1))
	# Live reference so the fireball barrage can scale with the player's CURRENT level.
	boss.level_system = level_system
	var angle := randf() * TAU
	var pos := player.global_position + Vector2(cos(angle), sin(angle)) * spawn_distance
	var limit := world_half_size - 80.0
	pos = pos.clamp(Vector2(-limit, -limit), Vector2(limit, limit))
	boss.position = pos
	enemies.add_child(boss)
	_boss = boss
	boss.died.connect(_on_boss_died)
	if spawner != null and spawner.has_method("set_rate_scale"):
		spawner.set_rate_scale(alive_spawn_scale)
	if boss_bar != null:
		boss_bar.visible = true
	_update_bar()
	_announce_boss()

## Roar + flashing "BOSS" banner that pulses then fades out.
func _announce_boss() -> void:
	get_tree().call_group("game", "shake", 16.0, 0.6)  # ground-shaking boss arrival
	if roar != null:
		roar.play()
	if warning == null:
		return
	warning.visible = true
	warning.modulate.a = 1.0
	warning.scale = Vector2(0.6, 0.6)
	warning.pivot_offset = warning.size / 2.0
	var tw := create_tween()
	tw.tween_property(warning, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	# Pulse a couple of times, then fade away.
	tw.tween_property(warning, "modulate:a", 0.25, 0.25)
	tw.tween_property(warning, "modulate:a", 1.0, 0.25)
	tw.tween_property(warning, "modulate:a", 0.25, 0.25)
	tw.tween_property(warning, "modulate:a", 1.0, 0.25)
	tw.tween_interval(0.4)
	tw.tween_property(warning, "modulate:a", 0.0, 0.4)
	tw.tween_callback(func(): warning.visible = false)

func _on_boss_died(_b) -> void:
	_boss = null
	_elapsed = 0.0
	_next_time = repeat_interval
	if spawner != null and spawner.has_method("set_rate_scale"):
		spawner.set_rate_scale(1.0)
	if boss_bar != null:
		boss_bar.visible = false

func _current_level() -> int:
	if is_instance_valid(level_system) and "level" in level_system:
		return int(level_system.level)
	return 1

func _update_bar() -> void:
	if boss_bar == null or not is_instance_valid(_boss):
		return
	boss_bar.max_value = _boss.max_health
	boss_bar.value = _boss.health
