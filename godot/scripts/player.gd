extends CharacterBody2D

signal health_changed(current: float, maximum: float)
signal died
signal took_damage

@export var speed: float = 160.0
@export var max_health: float = 100.0
@export var world_half_size: float = 1500.0  # world spans -1500..1500 on each axis
@export var body_radius: float = 16.0
@export var base_regen: float = 2.0  # HP per second, always on
@export var contact_hit_damage: float = 30.0  # damage per contact instance
@export var invuln_time: float = 2.0  # i-frames after a hit

var health: float
var bonus_regen: float = 0.0  # added by level-up upgrades
var _invuln_timer: float = 0.0

@onready var hurtbox: Area2D = $Hurtbox
@onready var magnet: Area2D = $Magnet
@onready var anim: AnimatedSprite2D = $AnimatedSprite2D
@onready var dust: CPUParticles2D = $Dust

const STEP_INTERVAL := 0.30  # seconds between footstep sounds while moving
var _step_timer: float = 0.0
var _joystick: Node = null  # touch joystick (found lazily; absent/idle on desktop)

func _ready() -> void:
	health = max_health
	health_changed.emit(health, max_health)
	magnet.area_entered.connect(_on_magnet_area_entered)
	# Manual depth sort: ground y -> z band [2, 42] (below the effect layers at
	# 45+). Player, enemies and boulders all use this same mapping, so whoever
	# stands lower on screen draws in front.
	z_as_relative = false

## Apply a character config (from RunState): stats, XP magnet range, sprite set.
## Called by main right after the scene loads, before the HUD syncs.
func apply_character(cfg: Dictionary) -> void:
	max_health = float(cfg.get("max_health", max_health))
	health = max_health
	speed = float(cfg.get("speed", speed))
	if cfg.has("magnet_radius"):
		# Duplicate the shape so we don't mutate the shared scene sub-resource.
		var shp: CircleShape2D = magnet.get_node("CollisionShape2D").shape.duplicate()
		shp.radius = float(cfg["magnet_radius"])
		magnet.get_node("CollisionShape2D").shape = shp
	if cfg.has("frames"):
		var sf := load(cfg["frames"]) as SpriteFrames
		if sf != null:
			anim.sprite_frames = sf
			anim.play("idle")
	if cfg.has("sprite_scale"):
		anim.scale = Vector2.ONE * float(cfg["sprite_scale"])
	health_changed.emit(health, max_health)

func _on_magnet_area_entered(area: Area2D) -> void:
	if area.is_in_group("xp_gems"):
		area.attract_to(self)

func _physics_process(delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): dir.y -= 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): dir.y += 1.0
	if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT): dir.x -= 1.0
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): dir.x += 1.0
	# Touch joystick adds its steering vector on top of the keyboard (zero on desktop).
	if not is_instance_valid(_joystick):
		_joystick = get_tree().get_first_node_in_group("joystick")
	if is_instance_valid(_joystick):
		dir += _joystick.get_vector()
	# Pick a directional walk animation by dominant axis (idle when stopped).
	var desired_anim := "idle"
	if dir != Vector2.ZERO:
		if abs(dir.x) > abs(dir.y):
			desired_anim = "walk_right"
			anim.flip_h = dir.x < 0.0  # mirror the right set for leftward movement
		else:
			anim.flip_h = false
			desired_anim = "walk_down" if dir.y > 0.0 else "walk_up"
	else:
		anim.flip_h = false
	if anim.animation != desired_anim:
		anim.play(desired_anim)
	velocity = dir.normalized() * speed
	move_and_slide()
	# Subtle footsteps + kicked-up dust while actually moving.
	var moving := dir != Vector2.ZERO
	dust.emitting = moving
	if moving:
		_step_timer -= delta
		if _step_timer <= 0.0:
			_step_timer = STEP_INTERVAL
			Sfx.play("footstep")
	else:
		_step_timer = 0.0  # next step fires promptly when movement resumes
	# Belt-and-suspenders clamp in case the player slips past a wall.
	var limit := world_half_size - body_radius
	global_position = global_position.clamp(Vector2(-limit, -limit), Vector2(limit, limit))

func _process(delta: float) -> void:
	# Depth sort from the FEET (y +34, same as the body collider), not the
	# body center. The boulders measure depth at their ground contact point.
	z_index = 2 + int((clampf(global_position.y + 34.0, -1500.0, 1500.0) + 1500.0) / 75.0)
	if _invuln_timer > 0.0:
		# Invincible: blink the sprite and count down; no contact damage.
		_invuln_timer -= delta
		anim.modulate.a = 0.3 if fmod(_invuln_timer, 0.2) < 0.1 else 1.0
		if _invuln_timer <= 0.0:
			anim.modulate.a = 1.0
	elif health > 0.0:
		# Take one hit if any enemy is touching, then go invincible.
		# The hurtbox overlaps the enemy Hitbox areas (sprite center), not the
		# physics bodies (large enemies keep those at the feet).
		for a in hurtbox.get_overlapping_areas():
			var b := a.get_parent()
			# Skip enemies still growing in from spawn (they can't hurt you yet).
			if b.is_in_group("enemies") and not b.get("spawning") and not b.get("airborne"):
				# Each enemy carries its own contact_damage (giant hits harder).
				var dmg: float = b.contact_damage if "contact_damage" in b else contact_hit_damage
				apply_hit(dmg)
				break
	# Slow health regeneration (baseline + upgrades), only while alive.
	if health > 0.0 and health < max_health:
		health = min(max_health, health + (base_regen + bonus_regen) * delta)
		health_changed.emit(health, max_health)

## Single entry point for taking damage: respects i-frames and triggers them.
## Used by contact damage and by boss hazards (projectiles, shockwave, swing).
## Returns true if the hit actually landed.
func apply_hit(amount: float) -> bool:
	if health <= 0.0 or _invuln_timer > 0.0:
		return false
	take_damage(amount)
	took_damage.emit()
	_invuln_timer = invuln_time
	return true

func add_max_health(amount: float) -> void:
	max_health += amount
	health_changed.emit(health, max_health)

func add_regen(amount: float) -> void:
	bonus_regen += amount

func take_damage(amount: float) -> void:
	if health <= 0.0:
		return
	health = max(0.0, health - amount)
	health_changed.emit(health, max_health)
	if health <= 0.0:
		Sfx.play("player_death")
		died.emit()
	else:
		Sfx.play("player_hurt")
