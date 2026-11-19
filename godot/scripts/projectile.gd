extends Area2D

const TURN_RATE: float = 6.0  # radians/sec steering for homing
const EXPLOSION := preload("res://scripts/explosion.gd")
const HIT_SPARK := preload("res://scripts/hit_spark.gd")
const EXPLOSION_DAMAGE_FACTOR: float = 0.5
const WORLD_HALF: float = 1500.0  # world spans -1500..1500 (matches the boundary walls)
const WALL_MARGIN: float = 10.0   # reflect just outside the player's max reach (1484)

var direction: Vector2 = Vector2.RIGHT
var speed: float = 300.0
var damage: float = 30.0
var lifetime: float = 2.0
var homing: bool = false
var target: Node2D = null
var rotation_offset: float = 0.0
var explosion_radius: float = 0.0
var dies_on_wall: bool = false
var bounces_remaining: int = 0

## Configure from a WeaponDef. Call BEFORE add_child so _ready() sees final
## values (lifetime timer, etc.). $Sprite2D resolves on the instanced scene
## even before it enters the tree.
func setup(dir: Vector2, tgt: Node2D, weapon: WeaponDef) -> void:
	direction = dir.normalized()
	speed = weapon.projectile_speed
	damage = weapon.damage
	lifetime = weapon.lifetime
	homing = weapon.homing
	target = tgt
	rotation_offset = deg_to_rad(weapon.projectile_rotation_offset_deg)
	explosion_radius = weapon.explosion_radius
	dies_on_wall = weapon.dies_on_wall
	bounces_remaining = weapon.bounce_count
	if weapon.projectile_texture != null:
		$Sprite2D.texture = weapon.projectile_texture
	$Sprite2D.scale = Vector2(weapon.projectile_scale, weapon.projectile_scale)

func _ready() -> void:
	# Overlap the enemy Hitbox areas (sprite center), not the physics bodies.
	area_entered.connect(_on_hitbox_entered)
	# Finite-bounce wall projectiles die when their bounces run out, not by time.
	# Infinite-bounce ones (bounces_remaining < 0) keep a lifetime so they don't
	# accumulate on screen forever.
	if dies_on_wall and bounces_remaining >= 0:
		return
	await get_tree().create_timer(lifetime).timeout
	if is_instance_valid(self):
		queue_free()

func _physics_process(delta: float) -> void:
	if homing:
		if not is_instance_valid(target):
			target = Targeting.closest_enemy(get_tree(), global_position)
		if is_instance_valid(target):
			var desired := (target.global_position - global_position).normalized()
			direction = direction.lerp(desired, TURN_RATE * delta).normalized()
	global_position += direction * speed * delta
	if dies_on_wall and _handle_wall():
		return
	rotation = direction.angle() + rotation_offset

## Reflect off the world boundary; returns true if the projectile was freed.
func _handle_wall() -> bool:
	var limit := WORLD_HALF - WALL_MARGIN
	var bounced := false
	if global_position.x > limit:
		global_position.x = limit
		direction.x = -absf(direction.x)
		bounced = true
	elif global_position.x < -limit:
		global_position.x = -limit
		direction.x = absf(direction.x)
		bounced = true
	if global_position.y > limit:
		global_position.y = limit
		direction.y = -absf(direction.y)
		bounced = true
	elif global_position.y < -limit:
		global_position.y = -limit
		direction.y = absf(direction.y)
		bounced = true
	if bounced:
		if bounces_remaining < 0:
			pass  # infinite bounce: never expire on walls (despawns by lifetime)
		elif bounces_remaining > 0:
			bounces_remaining -= 1
		else:
			queue_free()
			return true
	return false

func _on_hitbox_entered(area: Area2D) -> void:
	var body := area.get_parent()
	if body.is_in_group("enemies"):
		if body.has_method("take_damage"):
			body.take_damage(damage, global_position)
		Sfx.play("enemy_hit", 0.0, 25)
		var spark := HIT_SPARK.new()
		get_parent().add_child(spark)
		spark.global_position = global_position
		if explosion_radius > 0.0:
			Sfx.play("explosion")
			var ex := EXPLOSION.new()
			get_parent().add_child(ex)
			ex.detonate(global_position, explosion_radius, damage * EXPLOSION_DAMAGE_FACTOR)
		queue_free()
