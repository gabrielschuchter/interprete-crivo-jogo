class_name Targeting
extends RefCounted

## Returns the nearest node in the "enemies" group to `from`, or null.
static func closest_enemy(tree: SceneTree, from: Vector2) -> Node2D:
	var best: Node2D = null
	var best_d := INF
	for e in tree.get_nodes_in_group("enemies"):
		if not is_instance_valid(e):
			continue
		var d: float = from.distance_squared_to(e.global_position)
		if d < best_d:
			best_d = d
			best = e
	return best
