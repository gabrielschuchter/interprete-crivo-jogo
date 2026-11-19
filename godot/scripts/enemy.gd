extends CharacterBody2D

signal died(enemy)

const DAMAGE_NUMBER := preload("res://scripts/damage_number.gd")
const DEATH_BURST := preload("res://scripts/death_burst.gd")
const KNOCK_STRENGTH: float = 260.0
const KNOCK_DECAY: float = 900.0  # how fast the jut fades (units/sec)

@export var speed: float = 80.0
@export var max_health: float = 30.0
@export var contact_damage: float = 30.0  # damage dealt to the player on contact
@export var rotates: bool = true  # true: face movement (bats); false: stay upright + walk anim (giant)
@export var spawn_grow_time: float = 1.0  # grows in over this long; deals no contact damage until grown
# Distance from the node center down to the drawn feet, in px. Large sprites
# (giant, boss) set this. It moves the depth sort to the ground contact point.
# The scene must also move its CollisionShape2D down by the same value.
@export var foot_offset: float = 0.0

@onready var visual: CanvasItem = $Visual

var health: float
var spawning: bool = true  # true while growing in from spawn; player ignores its contact damage
var target: Node2D
var _knockback: Vector2 = Vector2.ZERO

func _ready() -> void:
	health = max_health
	add_to_group("enemies")
	# Own copy of the flash material so each enemy flashes independently.
	if visual.material != null:
		visual.material = visual.material.duplicate()
	# Grow in from ~nothing; harmless to the player (spawning flag) until full size.
	# Start at a tiny non-zero scale so the collision shape never has zero radius.
	scale = Vector2(0.01, 0.01)
	var grow := create_tween()
	grow.tween_property(self, "scale", Vector2.ONE, spawn_grow_time).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	grow.tween_callback(func(): spawning = false)
	# Manual depth sort, same band as player.gd / ground_scatter.gd.
	z_as_relative = false

func _process(_delta: float) -> void:
	z_index = 2 + int((clampf(global_position.y + foot_offset, -1500.0, 1500.0) + 1500.0) / 75.0)

func _physics_process(delta: float) -> void:
	if not is_instance_valid(target):
		return
	var dir := (target.global_position - global_position).normalized()
	if rotates:
		# Face the player (bat sprite points up, so +90 deg).
		rotation = dir.angle() + PI / 2.0
	velocity = dir * speed + _knockback
	move_and_slide()
	_knockback = _knockback.move_toward(Vector2.ZERO, KNOCK_DECAY * delta)

func take_damage(amount: float, from_pos: Vector2 = Vector2.INF) -> void:
	if health <= 0.0:
		return
	health -= amount
	_spawn_damage_number(amount)
	_flash()
	if from_pos != Vector2.INF:
		var away := global_position - from_pos
		if away.length() > 0.01:
			_knockback = away.normalized() * KNOCK_STRENGTH
	if health <= 0.0:
		Sfx.play("enemy_death", 0.0, 40)
		_spawn_death_burst()
		died.emit(self)
		queue_free()

## Shove this enemy away from a point without dealing damage (Knight's on-hit
## pushback). Reuses the same _knockback the damage path uses.
func knockback_from(pos: Vector2, strength: float) -> void:
	var away := global_position - pos
	if away.length() > 0.01:
		_knockback = away.normalized() * strength

func _flash() -> void:
	if visual.material == null:
		return
	visual.material.set_shader_parameter("flash", 1.0)
	var tw := create_tween()
	tw.tween_method(_set_flash, 1.0, 0.0, 0.12)

func _set_flash(v: float) -> void:
	if visual.material != null:
		visual.material.set_shader_parameter("flash", v)

func _spawn_damage_number(amount: float) -> void:
	var num := DAMAGE_NUMBER.new()
	get_parent().add_child(num)
	num.global_position = global_position
	num.show_damage(int(round(amount)))

func _spawn_death_burst() -> void:
	var burst := DEATH_BURST.new()
	get_parent().add_child(burst)
	burst.global_position = global_position
