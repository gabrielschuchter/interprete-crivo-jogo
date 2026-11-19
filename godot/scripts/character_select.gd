extends Control

## Character-select screen. Populates the two cards from RunState.CHARACTERS,
## stores the pick in RunState, then starts the run.

const RUN := preload("res://scripts/run_state.gd")

@onready var _cards := {
	"rogue": {
		"portrait": $Center/Cards/RogueCard/VBox/Portrait,
		"name": $Center/Cards/RogueCard/VBox/Name,
		"blurb": $Center/Cards/RogueCard/VBox/Blurb,
		"button": $Center/Cards/RogueCard/VBox/SelectButton,
	},
	"knight": {
		"portrait": $Center/Cards/KnightCard/VBox/Portrait,
		"name": $Center/Cards/KnightCard/VBox/Name,
		"blurb": $Center/Cards/KnightCard/VBox/Blurb,
		"button": $Center/Cards/KnightCard/VBox/SelectButton,
	},
}

func _ready() -> void:
	Sfx.ensure_menu_music()  # keep the menu track going (no restart on scene swap)
	for id in _cards.keys():
		var cfg: Dictionary = RUN.CHARACTERS[id]
		var c: Dictionary = _cards[id]
		c["name"].text = cfg["name"]
		c["blurb"].text = cfg["blurb"]
		var tex: Texture2D = null
		if ResourceLoader.exists(cfg["portrait"]):
			tex = load(cfg["portrait"]) as Texture2D
		if tex == null:  # art not generated yet — show a placeholder so the card isn't blank
			tex = load("res://assets/player.png") as Texture2D
		c["portrait"].texture = tex
		c["button"].pressed.connect(_choose.bind(id))
		c["button"].mouse_entered.connect(func(): Sfx.play("ui_hover"))
	$BackButton.pressed.connect(_back)
	$BackButton.mouse_entered.connect(func(): Sfx.play("ui_hover"))

func _choose(id: String) -> void:
	Sfx.play("ui_click")
	RUN.character_id = id
	get_tree().change_scene_to_file("res://main.tscn")

func _back() -> void:
	Sfx.play("ui_click")
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
