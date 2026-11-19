extends CPUParticles2D

## Juicy one-shot blood-gore splat for enemy death. Position via global_position;
## emits once and frees itself. Chunks fly out in all directions, spin, and arc
## down under gravity for a weighty "splat", fading from bright crimson to dark.

func _ready() -> void:
	one_shot = true
	explosiveness = 1.0
	amount = 28
	lifetime = 0.6
	direction = Vector2(0, -1)
	spread = 110.0                    # bias the spray upward instead of all directions
	gravity = Vector2(0, 520)         # chunks arc and fall -> weighty splat
	initial_velocity_min = 220.0      # stronger initial pop so blood erupts upward
	initial_velocity_max = 560.0
	damping_min = 80.0
	damping_max = 200.0
	angular_velocity_min = -500.0
	angular_velocity_max = 500.0
	scale_amount_min = 2.0
	scale_amount_max = 7.0
	# Bright crimson gore deepening to dark maroon as it settles, then fades out.
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1.0, 0.4, 0.35, 1.0))
	ramp.set_color(1, Color(0.38, 0.03, 0.05, 0.0))
	ramp.add_point(0.45, Color(0.82, 0.11, 0.12, 1.0))
	color_ramp = ramp
	z_index = 50
	finished.connect(queue_free)
	emitting = true
