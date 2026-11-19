extends Node

@export var start_interval: float = 1.0      # spawn cadence (sec) at level 1
@export var decay_per_level: float = 0.92    # per-level multiplier (tightens the cadence each level)
@export var min_spawn_distance: float = 600.0
@export var max_spawn_distance: float = 1000.0
@export var world_half_size: float = 1500.0

const NORMAL := preload("res://scenes/enemy.tscn")
const FAST := preload("res://scenes/enemy_fast.tscn")
const GIANT := preload("res://scenes/enemy_giant.tscn")

var player: Node2D
var enemies_container: Node2D
var _timer: float = 0.0
var spawn_interval: float = 1.0  # live cadence, recomputed each level by set_level()
var rate_scale: float = 1.0  # <1 spawns less often (boss fights throttle this)

func setup(p: Node2D, container: Node2D) -> void:
	player = p
	enemies_container = container
	set_level(1)

## Recompute the spawn cadence from the player's level: start_interval * decay^(lvl-1),
## floored at min_spawn_interval. Steady ramp from level 1 (no calmer-early curve).
func set_level(level: int) -> void:
	var lvl := maxi(1, level)
	# No floor: the cadence keeps tightening forever as the level climbs.
	spawn_interval = start_interval * pow(decay_per_level, lvl - 1)

## Temporarily scale how often enemies spawn (e.g. 0.2 = 20% while a boss is up).
func set_rate_scale(s: float) -> void:
	rate_scale = maxf(0.01, s)

func _process(delta: float) -> void:
	if not is_instance_valid(player) or enemies_container == null:
		return
	var effective: float = maxf(0.001, spawn_interval / rate_scale)  # epsilon guard only (avoids div/runaway), not a difficulty cap
	_timer += delta
	var n := 0
	while _timer >= effective and n < 30:  # cap spawns per frame so a tiny interval can't freeze the game
		_timer -= effective
		_spawn()
		n += 1
	if _timer > effective:
		_timer = effective  # drop backlog beyond the per-frame cap (can't out-spawn it anyway)

## 5% giant, 25% fast, 70% normal.
func _pick_scene() -> PackedScene:
	var r := randf()
	if r < 0.05:
		return GIANT
	if r < 0.30:
		return FAST
	return NORMAL

func _spawn() -> void:
	_spawn_scene(_pick_scene())

## Spawn `count` enemies of a specific scene right now (e.g. the opening rush).
func spawn_burst(count: int, scene: PackedScene = NORMAL) -> void:
	if not is_instance_valid(player) or enemies_container == null:
		return
	for _i in count:
		_spawn_scene(scene)

func _spawn_scene(scene: PackedScene) -> void:
	var angle := randf() * TAU
	var dist := randf_range(min_spawn_distance, max_spawn_distance)
	var pos := player.global_position + Vector2(cos(angle), sin(angle)) * dist
	var limit := world_half_size - 32.0
	pos = pos.clamp(Vector2(-limit, -limit), Vector2(limit, limit))
	var enemy := scene.instantiate()
	enemy.target = player
	# Position BEFORE adding to the tree so the enemy never registers at the
	# world origin (where the player starts) and hits the player on spawn.
	enemy.position = pos
	enemies_container.add_child(enemy)
