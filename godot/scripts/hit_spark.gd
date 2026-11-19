extends CPUParticles2D

## Tiny one-shot impact spark when a projectile strikes an enemy. Position via
## global_position; emits once and frees itself. Cheap (few particles) since
## hits happen often.

func _ready() -> void:
	one_shot = true
	explosiveness = 1.0
	amount = 9
	lifetime = 0.28
	direction = Vector2(0, -1)
	spread = 180.0
	gravity = Vector2.ZERO
	initial_velocity_min = 130.0
	initial_velocity_max = 280.0
	damping_min = 120.0
	damping_max = 240.0
	scale_amount_min = 1.5
	scale_amount_max = 3.0
	# Hot white-yellow spark cooling to orange.
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1.0, 0.95, 0.6, 1.0))
	ramp.set_color(1, Color(1.0, 0.5, 0.15, 0.0))
	color_ramp = ramp
	z_index = 45
	finished.connect(queue_free)
	emitting = true
