extends Node2D

## A purely visual AoE blast. detonate() applies damage to enemies in radius and
## plays a quick expanding/fading orange circle, then frees itself. It is a plain
## Node2D (not an Area2D), so it is safe to spawn during a physics collision flush.

var _radius: float = 0.0
var _alpha: float = 0.6

func detonate(pos: Vector2, radius: float, damage: float) -> void:
	global_position = pos
	_radius = radius
	for e in get_tree().get_nodes_in_group("enemies"):
		if is_instance_valid(e) and global_position.distance_to(e.global_position) <= radius:
			if e.has_method("take_damage"):
				e.take_damage(damage, global_position)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_method(_set_radius, radius * 0.3, radius, 0.15)
	tw.tween_method(_set_alpha, 0.6, 0.0, 0.35)
	tw.set_parallel(false)
	tw.tween_callback(queue_free)

func _set_radius(r: float) -> void:
	_radius = r
	queue_redraw()

func _set_alpha(a: float) -> void:
	_alpha = a
	queue_redraw()

func _draw() -> void:
	draw_circle(Vector2.ZERO, _radius, Color(1.0, 0.55, 0.1, _alpha))
