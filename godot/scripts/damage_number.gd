extends Node2D

## Floating damage number: rises and fades, then frees. Position it via
## global_position, then call show_damage().

func show_damage(amount: int) -> void:
	var label := Label.new()
	label.text = str(amount)
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", Color(1.0, 0.95, 0.3))
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	label.add_theme_constant_override("outline_size", 4)
	label.position = Vector2(-12, -28)  # sit just above the enemy, roughly centered
	add_child(label)
	z_index = 100
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "position", position + Vector2(0, -40), 0.6)
	tw.tween_property(self, "modulate:a", 0.0, 0.6)
	tw.set_parallel(false)
	tw.tween_callback(queue_free)
