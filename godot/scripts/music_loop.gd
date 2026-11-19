extends AudioStreamPlayer

## Loops gameplay music by restarting it whenever it finishes, so it keeps
## playing regardless of whether the imported stream has its own loop flag set.
func _ready() -> void:
	finished.connect(play)
