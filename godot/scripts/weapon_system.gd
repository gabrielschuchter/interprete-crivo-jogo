extends Node

@export var weapons: Array[WeaponDef] = []
@export var projectile_scene: PackedScene

var projectiles_container: Node2D
var _cooldowns: Array[float] = []

const WEAPON_DEFS := {
	"homing": "res://resources/weapons/homing_missile.tres",
	"arrows": "res://resources/weapons/random_missile.tres",
}

func setup(container: Node2D) -> void:
	projectiles_container = container

## Replace the active weapon list with the given weapon ids (e.g. ["homing"]).
## Each def is duplicated so runtime upgrades never mutate the cached resource.
func set_loadout(ids: Array) -> void:
	weapons.clear()
	for wid in ids:
		var def := _load_def(wid)
		if def != null:
			weapons.append(def)
	_cooldowns.resize(weapons.size())
	for i in _cooldowns.size():
		_cooldowns[i] = 0.0

## Add a weapon by id at runtime (e.g. when "Flaming Arrows" is picked).
func add_weapon(wid: String) -> void:
	if has_weapon(wid):
		return
	var def := _load_def(wid)
	if def != null:
		weapons.append(def)
		_cooldowns.append(0.0)

## Load + duplicate a weapon def by id (duplicate so upgrades don't mutate cache).
func _load_def(wid: String) -> WeaponDef:
	var path: String = WEAPON_DEFS.get(wid, "")
	if path == "":
		return null
	var res := load(path) as WeaponDef
	if res == null:
		return null
	return res.duplicate() as WeaponDef

func has_weapon(wid: String) -> bool:
	for w in weapons:
		if w.id == wid:
			return true
	return false

func _ready() -> void:
	# Self-wire defaults so the system works without editor-set exports.
	if weapons.is_empty():
		weapons = [
			preload("res://resources/weapons/homing_missile.tres"),
			preload("res://resources/weapons/random_missile.tres"),
		]
	if projectile_scene == null:
		projectile_scene = preload("res://scenes/projectile.tscn")
	# Duplicate the WeaponDefs so runtime upgrades don't mutate the shared
	# (cached) .tres resources, which would otherwise persist across restarts.
	for i in weapons.size():
		weapons[i] = weapons[i].duplicate()
	_cooldowns.resize(weapons.size())
	for i in _cooldowns.size():
		_cooldowns[i] = 0.0

## Multiply the fire rate (lower interval = faster) of every weapon whose
## homing flag matches. Used by the level-up upgrades.
func scale_fire_rate(homing_flag: bool, factor: float) -> void:
	for w in weapons:
		if w.homing == homing_flag:
			w.fire_rate *= factor

## Enable/grow explosion radius on matching weapons. First call sets `base`,
## later calls add `increment`.
func add_explosion(homing_flag: bool, base: float, increment: float) -> void:
	for w in weapons:
		if w.homing == homing_flag:
			if w.explosion_radius <= 0.0:
				w.explosion_radius = base
			else:
				w.explosion_radius += increment

## Add wall bounces to matching weapons.
func increase_bounce(homing_flag: bool, amount: int) -> void:
	for w in weapons:
		if w.homing == homing_flag:
			w.bounce_count += amount

## Make matching weapons bounce forever. bounce_count < 0 means infinite; a
## lifetime is set so these projectiles still despawn by time, not pile up.
func set_infinite_bounce(homing_flag: bool) -> void:
	for w in weapons:
		if w.homing == homing_flag:
			w.bounce_count = -1
			w.lifetime = 30.0  # safety despawn only; normally the arrow hits an enemy first

func _process(delta: float) -> void:
	if projectiles_container == null:
		return
	for i in weapons.size():
		_cooldowns[i] -= delta
		if _cooldowns[i] <= 0.0:
			_cooldowns[i] = weapons[i].fire_rate
			_fire(weapons[i])

func _fire(weapon: WeaponDef) -> void:
	var origin: Vector2 = get_parent().global_position
	var dir := Vector2.RIGHT
	var target: Node2D = null
	match weapon.targeting_mode:
		WeaponDef.TargetingMode.CLOSEST_ENEMY:
			target = Targeting.closest_enemy(get_tree(), origin)
			if target == null:
				return  # no enemy to home onto; skip this shot
			dir = (target.global_position - origin).normalized()
		WeaponDef.TargetingMode.RANDOM_DIRECTION:
			# Aim toward a random live enemy with a little spread (not homing — the
			# direction is locked at launch). Spreads across the horde shot to shot.
			# Falls back to a fully random direction when nothing's around.
			var aim := _aim_at_random_enemy(origin)
			if aim == Vector2.ZERO:
				var a := randf() * TAU
				dir = Vector2(cos(a), sin(a))
			else:
				dir = aim.rotated(randf_range(-0.18, 0.18))  # ~+-10 deg spread
	var proj := projectile_scene.instantiate()
	proj.setup(dir, target, weapon)
	projectiles_container.add_child(proj)
	proj.global_position = origin
	Sfx.play("orb_cast" if weapon.homing else "arrow_shoot")

## Direction toward a random live enemy (for the arrow volley), or ZERO if none exist.
func _aim_at_random_enemy(origin: Vector2) -> Vector2:
	var valid: Array = []
	for e in get_tree().get_nodes_in_group("enemies"):
		if is_instance_valid(e):
			valid.append(e)
	if valid.is_empty():
		return Vector2.ZERO
	var e: Node2D = valid[randi() % valid.size()]
	return (e.global_position - origin).normalized()
