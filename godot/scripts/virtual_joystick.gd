extends Control

## Floating on-screen joystick for touch devices. The first finger down anywhere
## on the screen drops the stick at that spot; dragging from there steers. Outputs
## a movement vector (magnitude 0..1) that player.gd reads via the "joystick"
## group. It listens for InputEventScreenTouch/Drag ONLY, so a desktop mouse never
## triggers it and the keyboard path stays the sole input on desktop.
##
## mouse_filter = IGNORE so it never eats taps meant for buttons (level-up cards,
## pause menu); those are consumed by the GUI before reaching _unhandled_input.

@export var max_travel: float = 110.0   # px the knob can travel from the origin
@export var deadzone: float = 0.18      # ignore tiny nudges near the centre

var _active: bool = false
var _finger: int = -1
var _origin: Vector2 = Vector2.ZERO
var _knob: Vector2 = Vector2.ZERO
var _vector: Vector2 = Vector2.ZERO

func _ready() -> void:
	add_to_group("joystick")
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## Current steering vector (0,0 when not touched). Read by player.gd.
func get_vector() -> Vector2:
	return _vector

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and not _active:
			_active = true
			_finger = event.index
			_origin = event.position
			_knob = event.position
			_recompute()
			queue_redraw()
		elif not event.pressed and event.index == _finger:
			_reset()
	elif event is InputEventScreenDrag and _active and event.index == _finger:
		_knob = event.position
		_recompute()
		queue_redraw()

func _reset() -> void:
	_active = false
	_finger = -1
	_vector = Vector2.ZERO
	queue_redraw()

func _recompute() -> void:
	var off := _knob - _origin
	if off.length() > max_travel:
		off = off.normalized() * max_travel
		_knob = _origin + off       # knob sticks to the rim
	var v := off / max_travel
	_vector = Vector2.ZERO if v.length() < deadzone else v

func _draw() -> void:
	if not _active:
		return
	draw_circle(_origin, max_travel, Color(1, 1, 1, 0.10))
	draw_arc(_origin, max_travel, 0.0, TAU, 48, Color(1, 1, 1, 0.30), 4.0, true)
	draw_circle(_knob, max_travel * 0.42, Color(1, 1, 1, 0.40))
	draw_arc(_knob, max_travel * 0.42, 0.0, TAU, 32, Color(1, 1, 1, 0.60), 3.0, true)
