extends CPUParticles2D

## Big one-shot fiery blast for the boss death. Position via global_position;
## emits once and frees itself.

func _ready() -> void:
	one_shot = true
	explosiveness = 1.0
	amount = 90
	lifetime = 0.9
	direction = Vector2(0, -1)
	spread = 180.0
	gravity = Vector2.ZERO
	initial_velocity_min = 220.0
	initial_velocity_max = 620.0
	scale_amount_min = 4.0
	scale_amount_max = 10.0
	# Fade from bright yellow-white through orange to dark red as embers cool.
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1.0, 0.95, 0.6, 1.0))
	ramp.set_color(1, Color(0.7, 0.12, 0.05, 0.0))
	color_ramp = ramp
	z_index = 60
	finished.connect(queue_free)
	emitting = true
