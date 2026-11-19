extends Area2D

## A boss fireball. Flies straight, hits the player once (via apply_hit, which
## respects i-frames), and despawns on hit / lifetime / leaving the arena. Not in
## the "enemies" group, so the player's own weapons ignore it.

const RADIUS: float = 16.0
const WORLD_HALF: float = 1500.0

var velocity: Vector2 = Vector2.ZERO
var damage: float = 30.0
var _pulse: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func setup(dir: Vector2, speed: float, dmg: float) -> void:
	velocity = dir.normalized() * speed
	damage = dmg

func _physics_process(delta: float) -> void:
	position += velocity * delta
	_pulse += delta * 18.0
	queue_redraw()
	# No lifetime: a fireball flies until it reaches the arena wall (or hits the player).
	if absf(position.x) > WORLD_HALF or absf(position.y) > WORLD_HALF:
		queue_free()

func _on_body_entered(body: Node) -> void:
	if body.has_method("apply_hit"):
		body.apply_hit(damage)
		queue_free()

func _draw() -> void:
	var flick := 1.0 + 0.12 * sin(_pulse)
	draw_circle(Vector2.ZERO, RADIUS * 1.35 * flick, Color(0.9, 0.25, 0.05, 0.35))  # outer glow
	draw_circle(Vector2.ZERO, RADIUS * flick, Color(1.0, 0.5, 0.1, 0.95))            # body
	draw_circle(Vector2.ZERO, RADIUS * 0.55 * flick, Color(1.0, 0.95, 0.65, 1.0))    # hot core
