extends Node

## Run-scoped state that survives scene changes. The character-select screen sets
## `character_id`; main.gd / player.gd read current() to configure the run.
## Accessed via a preloaded const (e.g. `const RUN := preload(...)`), so no
## autoload registration / project reload is needed.

static var character_id: String = "rogue"

const CHARACTERS := {
	"rogue": {
		"id": "rogue",
		"name": "Mago",
		"blurb": "Equilibrado. Ágil, com flechas e um orbe teleguiado.",
		"max_health": 100.0,
		"speed": 160.0,
		"magnet_radius": 140.0,
		"sprite_scale": 0.18,
		"frames": "res://resources/player_frames.tres",
		"portrait": "res://assets/mage_portrait.png",
		"weapons": ["homing", "arrows"],  # auto-firing weapons at run start
		"saws": 0,                         # orbiting saws at run start
		"specials": [],                    # extra upgrade ids unlocked for this character
	},
	"knight": {
		"id": "knight",
		"name": "Cavaleiro",
		# Larger than the mage (0.18): the knight reads as the heavy character.
		"blurb": "Blindado e pesado. Começa com duas serras e orbes teleguiados.",
		"max_health": 150.0,
		"speed": 120.0,
		"magnet_radius": 200.0,
		"sprite_scale": 0.21,
		"frames": "res://resources/knight_frames.tres",
		"portrait": "res://assets/knight_portrait.png",
		"weapons": ["homing"],
		"saws": 2,
		"specials": ["flaming"],
		"knockback_on_hit": 200.0,  # Knight shoves all enemies back when hit
	},
}

static func current() -> Dictionary:
	return CHARACTERS.get(character_id, CHARACTERS["rogue"])
