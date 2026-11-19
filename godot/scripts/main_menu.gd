extends Control

# Menu principal do Interprete: preto, brasão, três botões (Novo jogo, Continuar jogo, Configurações).
# Substitui o menu do modelo (Play, Options, Quit) e mantém o fluxo dele: Novo jogo abre a seleção de
# personagem. Continuar jogo fica apagado: o modelo não guarda partida (ver docs/game/SURVIVORS.md).

@onready var options_panel: Control = $OptionsPanel
@onready var volume_slider: HSlider = $OptionsPanel/Center/Panel/Margin/VBox/VolumeRow/VolumeSlider
@onready var fullscreen_check: CheckButton = $OptionsPanel/Center/Panel/Margin/VBox/FullscreenRow/FullscreenCheck

func _ready() -> void:
	options_panel.visible = false
	Sfx.ensure_menu_music()  # continua entre o menu e a seleção de personagem
	for b in [$Coluna/Botoes/PlayButton, $Coluna/Botoes/ContinueButton, $Coluna/Botoes/OptionsButton,
			$OptionsPanel/Center/Panel/Margin/VBox/BackButton]:
		b.mouse_entered.connect(_on_hover.bind(b))
	var master_idx := AudioServer.get_bus_index("Master")
	volume_slider.value = db_to_linear(AudioServer.get_bus_volume_db(master_idx))
	fullscreen_check.button_pressed = (
		DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
	)
	$Coluna/Botoes/PlayButton.grab_focus()

func _on_hover(b: Button) -> void:
	if not b.disabled:
		Sfx.play("ui_hover")

func _on_play_pressed() -> void:
	Sfx.play("ui_click")
	get_tree().change_scene_to_file("res://scenes/character_select.tscn")

func _on_options_pressed() -> void:
	Sfx.play("ui_click")
	options_panel.visible = true
	$OptionsPanel/Center/Panel/Margin/VBox/BackButton.grab_focus()

func _on_back_pressed() -> void:
	Sfx.play("ui_click")
	options_panel.visible = false
	$Coluna/Botoes/OptionsButton.grab_focus()

func _on_volume_changed(value: float) -> void:
	var master_idx := AudioServer.get_bus_index("Master")
	AudioServer.set_bus_volume_db(master_idx, linear_to_db(value))

func _on_fullscreen_toggled(pressed: bool) -> void:
	DisplayServer.window_set_mode(
		DisplayServer.WINDOW_MODE_FULLSCREEN if pressed else DisplayServer.WINDOW_MODE_WINDOWED
	)
