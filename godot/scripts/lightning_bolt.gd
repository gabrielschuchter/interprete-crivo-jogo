extends Node2D

## Placeholder lightning-bolt VFX: a jagged glowing line that drops onto the
## target and quickly fades out, then frees itself. Replace with Studio art.

func strike() -> void:
	var pts := PackedVector2Array()
	var y := -440.0
	pts.append(Vector2(randf_range(-30.0, 30.0), y))
	while y < 0.0:
		y += randf_range(28.0, 52.0)
		pts.append(Vector2(randf_range(-26.0, 26.0), min(y, 0.0)))
	pts.append(Vector2.ZERO)

	var glow := Line2D.new()
	glow.points = pts
	glow.width = 9.0
	glow.default_color = Color(0.45, 0.75, 1.0, 0.5)
	glow.joint_mode = Line2D.LINE_JOINT_ROUND
	glow.begin_cap_mode = Line2D.LINE_CAP_ROUND
	glow.end_cap_mode = Line2D.LINE_CAP_ROUND
	add_child(glow)

	var core := Line2D.new()
	core.points = pts
	core.width = 3.0
	core.default_color = Color(1, 1, 1, 1)
	core.joint_mode = Line2D.LINE_JOINT_ROUND
	add_child(core)

	z_index = 50
	var tw := create_tween()
	tw.tween_interval(0.06)
	tw.tween_property(self, "modulate:a", 0.0, 0.22)
	tw.tween_callback(queue_free)
