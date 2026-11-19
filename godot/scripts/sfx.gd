extends Node
## Global one-shot sound effects. Autoloaded as "Sfx" (see project.godot).
##
## Usage:
##   Sfx.play("arrow_shoot")
##   Sfx.play("enemy_hit", 0.0, 30)   # +0 dB, but ignore repeats within 30 ms
##
## A small pool of AudioStreamPlayers is round-robined so overlapping one-shots
## don't cut each other off. process_mode = ALWAYS so UI sounds (button clicks)
## still play while the gameplay tree is paused.

const POOL_SIZE := 16

# key -> [res path, default volume_db, pitch_variation (+/-)]
const SOUNDS := {
	"arrow_shoot":  ["res://assets/sounds/orb_cast.mp3",     -20.0, 0.12],
	"orb_cast":     ["res://assets/sounds/arrow_shoot.mp3",  -18.0, 0.12],
	"enemy_hit":    ["res://assets/sounds/enemy_hit.mp3",     -6.0, 0.18],
	"enemy_death":  ["res://assets/sounds/enemy_death.mp3",  -17.0, 0.15],
	"explosion":    ["res://assets/sounds/explosion.mp3",     -5.0, 0.10],
	"saw_hit":      ["res://assets/sounds/saw_hit.mp3",      -17.0, 0.20],
	"lightning":    ["res://assets/sounds/lightning.mp3",     -4.0, 0.10],
	"player_hurt":  ["res://assets/sounds/player_hurt.mp3",   -3.0, 0.08],
	"player_death": ["res://assets/sounds/player_death.mp3",   0.0, 0.0],
	"ui_click":     ["res://assets/sounds/ui_click.mp3",      -6.0, 0.0],
	"ui_hover":     ["res://assets/sounds/ui_hover.mp3",     -12.0, 0.05],
	"footstep":     ["res://assets/sounds/footstep.mp3",     -16.0, 0.18],
	"boss_charge":  ["res://assets/sounds/boss_charge.mp3",   -7.0, 0.08],
	"boss_jump":    ["res://assets/sounds/boss_jump.mp3",     -8.0, 0.08],
	"boss_land":    ["res://assets/sounds/boss_slam.mp3",      0.0, 0.08],
	"boss_fireball":["res://assets/sounds/boss_fireball.mp3", -9.0, 0.10],
}

var _streams: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _next: int = 0
var _last_played: Dictionary = {}  # key -> ticks_msec, for throttling
var _menu_music: AudioStreamPlayer  # persistent menu / character-select track

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for key in SOUNDS:
		var stream = load(SOUNDS[key][0])
		if stream != null:
			_streams[key] = stream
	for _i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	# Persistent menu music: it lives on this autoload, so it survives scene
	# changes (main menu <-> character select <-> settings) without restarting.
	_menu_music = AudioStreamPlayer.new()
	_menu_music.stream = load("res://assets/sounds/menu_music.mp3")
	_menu_music.volume_db = -12.0
	_menu_music.process_mode = Node.PROCESS_MODE_ALWAYS
	_menu_music.finished.connect(_menu_music.play)  # loop
	add_child(_menu_music)

## Play a registered sound. `extra_db` is added to the default volume.
## `min_gap_ms` > 0 drops repeat calls of the SAME sound within that window
## (used to tame very high-frequency hits like the saw or mass deaths).
func play(key: String, extra_db: float = 0.0, min_gap_ms: int = 0) -> void:
	if not _streams.has(key):
		return
	if min_gap_ms > 0:
		var now := Time.get_ticks_msec()
		if now - int(_last_played.get(key, -1000000)) < min_gap_ms:
			return
		_last_played[key] = now
	var cfg: Array = SOUNDS[key]
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = _streams[key]
	p.volume_db = float(cfg[1]) + extra_db
	var pv: float = float(cfg[2])
	p.pitch_scale = (1.0 + randf_range(-pv, pv)) if pv > 0.0 else 1.0
	p.play()

## Start the menu music if it isn't already playing. Idempotent — calling it
## from every menu scene's _ready keeps the track seamless across scene swaps.
func ensure_menu_music() -> void:
	if _menu_music != null and not _menu_music.playing:
		_menu_music.play()

## Stop the menu music (call when gameplay starts).
func stop_menu_music() -> void:
	if _menu_music != null:
		_menu_music.stop()
