extends Area2D

## A saw blade that orbits the player and damages enemies it overlaps. Deals
## damage + a number + flash every FEEDBACK_FRAMES frames (no knockback) for a
## steady stream of hit numbers.

const SPIN_SPEED: float = 12.0  # visual blade spin, rad/sec
const FEEDBACK_FRAMES: int = 2  # hit (damage + number + flash) every N frames

var orbit_radius: float = 70.0
var angle: float = 0.0
var orbit_speed: float = 3.0        # rad/sec around the player (sign = orbit direction)
var damage_per_sec: float = 50.0    # DPS to overlapping enemies

func configure(p_radius: float, p_angle: float, p_speed: float, p_dps: float) -> void:
	orbit_radius = p_radius
	angle = p_angle
	orbit_speed = p_speed
	damage_per_sec = p_dps
	position = Vector2.from_angle(angle) * orbit_radius

func _physics_process(delta: float) -> void:
	angle += orbit_speed * delta
	position = Vector2.from_angle(angle) * orbit_radius
	rotation += SPIN_SPEED * delta
	# Gate on the GLOBAL physics frame (not a per-saw counter) so every blade ticks
	# on the SAME frames. Then if two blades overlap one enemy they both land on this
	# tick and the damage stacks -> touching N saws deals N x the damage per tick.
	if Engine.get_physics_frames() % FEEDBACK_FRAMES != 0:
		return
	var dmg := damage_per_sec * delta * FEEDBACK_FRAMES
	# Overlap the enemy Hitbox areas (sprite center), not the physics bodies.
	# Large enemies keep their physics body at the feet for terrain collision.
	for a in get_overlapping_areas():
		var b := a.get_parent()
		if b.is_in_group("enemies") and b.has_method("take_damage"):
			# Vector2.INF -> no knockback; shows a damage number + flash each hit.
			b.take_damage(dmg, Vector2.INF)
			Sfx.play("saw_hit", 0.0, 120)  # self-throttled so the loop isn't a buzzsaw of audio
