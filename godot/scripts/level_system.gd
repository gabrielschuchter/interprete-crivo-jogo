extends Node

## Tracks XP and level. Lives in the "level_system" group so XP gems can grant
## XP via call_group without a hard reference.

signal xp_changed(current: int, needed: int, level: int)
signal leveled_up(level: int)

var level: int = 1
var xp: int = 0
var xp_to_next: int = 5
var xp_per_sec: float = 0.0  # passive XP gain from upgrades
var _xp_accum: float = 0.0

func _ready() -> void:
	add_to_group("level_system")
	xp_changed.emit(xp, xp_to_next, level)

func _process(delta: float) -> void:
	if xp_per_sec <= 0.0:
		return
	_xp_accum += xp_per_sec * delta
	while _xp_accum >= 1.0:
		_xp_accum -= 1.0
		add_xp(1)

func add_xp_rate(amount: float) -> void:
	xp_per_sec += amount

## Debug: grant just enough XP to trigger one level-up.
func debug_level_up() -> void:
	add_xp(maxi(1, xp_to_next - xp))

func add_xp(amount: int) -> void:
	xp += amount
	while xp >= xp_to_next:
		xp -= xp_to_next
		level += 1
		xp_to_next = _needed_for(level)
		leveled_up.emit(level)
	xp_changed.emit(xp, xp_to_next, level)

func _needed_for(lv: int) -> int:
	return 5 + (lv - 1) * 3
