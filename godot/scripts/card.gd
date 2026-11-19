extends Control

## A level-up reward card: icon + title + description, with hover pop.
## Emits `selected` when clicked.

signal selected
signal hover_changed(card: Control, hovered: bool)

@onready var icon: TextureRect = $Icon
@onready var title_label: Label = $Title
@onready var desc_label: Label = $Desc

func setup(icon_tex: Texture2D, title_text: String, desc_text: String) -> void:
	if icon_tex != null:
		icon.texture = icon_tex
	title_label.text = title_text
	desc_label.text = desc_text

func _ready() -> void:
	scale = Vector2.ONE
	mouse_entered.connect(_on_enter)
	mouse_exited.connect(_on_exit)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		selected.emit()

func _on_enter() -> void:
	pivot_offset = size / 2.0
	_tween_scale(1.1)
	Sfx.play("ui_hover")
	hover_changed.emit(self, true)

func _on_exit() -> void:
	pivot_offset = size / 2.0
	_tween_scale(1.0)
	hover_changed.emit(self, false)

func _tween_scale(s: float) -> void:
	var tw := create_tween()
	tw.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "scale", Vector2(s, s), 0.12)
