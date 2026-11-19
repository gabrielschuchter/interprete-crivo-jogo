extends Node2D

const GEM_SCENE := preload("res://scenes/xp_gem.tscn")
const BOSS_EXPLOSION := preload("res://scripts/boss_explosion.gd")
const RUN := preload("res://scripts/run_state.gd")

# Pool of level-up upgrades. Each level-up shows 3 random distinct ones.
const UPGRADES := [
	{"id": "missiles", "label": "Mais flechas", "desc": "Flechas disparam 15% mais rápido.", "needs_weapon": "arrows", "icon": "res://assets/images/img-1781615983941-0.png"},
	{"id": "homing", "label": "Mais orbes teleguiados", "desc": "Orbes teleguiados disparam 15% mais rápido.", "icon": "res://assets/images/img-1781615985513-0.png"},
	{"id": "speed", "label": "Velocidade", "desc": "Mova-se 20% mais rápido.", "icon": "res://assets/images/img-1781615986659-0.png"},
	{"id": "maxhp", "label": "+50 de vida máxima", "desc": "Aumenta a vida máxima em 50.", "icon": "res://assets/images/img-1781616016450-0.png"},
	{"id": "xprate", "label": "Surto de experiência", "desc": "Ganhe +1 de experiência por segundo, sem fazer nada.", "icon": "res://assets/images/img-1781616018039-0.png"},
	{"id": "regen", "label": "Regeneração", "desc": "Regenera +1,5 de vida por segundo.", "icon": "res://assets/images/img-1781616019151-0.png"},
	{"id": "explode", "label": "Flechas explosivas", "desc": "Flechas explodem no impacto.", "desc_next": "Raio de explosão maior.", "needs_weapon": "arrows", "icon": "res://assets/images/img-1781616020680-0.png"},
	{"id": "bounce", "label": "Flechas ricocheteantes", "desc": "Flechas ricocheteiam nas paredes.", "desc_next": "Flechas passam a ricochetear para sempre.", "max_stacks": 2, "needs_weapon": "arrows", "icon": "res://assets/images/img-1781616035254-0.png"},
	{"id": "saw", "label": "Serra giratória", "desc": "Uma serra orbita você e retalha os inimigos que toca.", "desc_next": "Acrescenta outra serra.", "icon": "res://assets/images/img-1781616037839-0.png"},
	{"id": "lightning", "label": "Chamado da tempestade", "desc": "Um raio atinge um inimigo a cada poucos segundos.", "desc_next": "Mais um raio ao mesmo tempo.", "icon": "res://assets/images/img-1781616038564-0.png"},
	# Knight-only unlock: turns ON the standard arrows weapon (flavored as flaming).
	# Once owned, the existing arrow upgrades above (More/Explosive/Bouncing) appear,
	# because they're gated on actually having the "arrows" weapon.
	{"id": "flaming", "label": "Flechas flamejantes", "desc": "Comece a disparar flechas flamejantes a cada segundo. Libera as melhorias de flecha.", "needs_special": "flaming", "max_stacks": 1, "icon": "res://assets/images/img-chama.png"},
]

@onready var player: CharacterBody2D = $Player
@onready var spawner: Node = $EnemySpawner
@onready var enemies: Node2D = $Enemies
@onready var projectiles: Node2D = $Projectiles
@onready var pickups: Node2D = $Pickups
@onready var weapon_system: Node = $Player/WeaponSystem
@onready var saw_system: Node = $Player/SawSystem
@onready var level_system: Node = $LevelSystem
@onready var lightning_system: Node = $LightningSystem
@onready var boss_system: Node = $BossSystem
@onready var boss_bar: ProgressBar = $UI/HUD/BossBar
@onready var boss_warning: Label = $UI/BossWarning
@onready var roar_sound: AudioStreamPlayer = $Sounds/RoarSound
@onready var camera: Camera2D = $Player/Camera2D

@onready var health_label: Label = $UI/HUD/HealthLabel
@onready var health_bar: ProgressBar = $UI/HUD/HealthBar
@onready var kills_label: Label = $UI/HUD/KillsLabel
@onready var time_label: Label = $UI/HUD/TimeLabel
@onready var level_label: Label = $UI/HUD/LevelLabel
@onready var xp_bar: ProgressBar = $UI/HUD/XPBar
@onready var game_over_panel: Control = $UI/GameOverPanel
@onready var result_label: Label = $UI/GameOverPanel/ResultLabel
@onready var restart_button: Button = $UI/GameOverPanel/Buttons/RestartButton
@onready var main_menu_button: Button = $UI/GameOverPanel/Buttons/MainMenuButton
@onready var level_up_panel: Control = $UI/LevelUpPanel
@onready var damage_flash: ColorRect = $UI/DamageFlash
@onready var xp_sound: AudioStreamPlayer = $Sounds/XPSound
@onready var level_sound: AudioStreamPlayer = $Sounds/LevelSound
@onready var upgrade_sound: AudioStreamPlayer = $Sounds/UpgradeSound
@onready var cards: Array = [
	$UI/LevelUpPanel/CardRow/Card0,
	$UI/LevelUpPanel/CardRow/Card1,
	$UI/LevelUpPanel/CardRow/Card2,
]

var kills: int = 0
var survival_time: float = 0.0
var is_game_over: bool = false
var _pending_levelups: int = 0
var _current_choices: Array = []
var _stacks: Dictionary = {}  # upgrade id -> times picked, drives stacked descriptions
var _shake_time: float = 0.0
var _shake_dur: float = 0.0
var _shake_mag: float = 0.0
var _pause_panel: Control  # ESC pause overlay, built in _build_pause_menu()
var _char: Dictionary = {}  # selected character config from RunState

func _ready() -> void:
	add_to_group("game")  # boss hazards reach shake() via call_group("game", ...)
	Sfx.stop_menu_music()  # gameplay has its own combat track
	game_over_panel.visible = false
	level_up_panel.visible = false
	spawner.setup(player, enemies)
	weapon_system.setup(projectiles)
	lightning_system.setup(self, player)
	boss_system.setup(player, enemies, level_system, spawner, boss_bar, boss_warning, roar_sound)
	# Configure the run for the selected character (stats, sprites, starting loadout).
	_char = RUN.current()
	player.apply_character(_char)
	weapon_system.set_loadout(_char.get("weapons", ["homing", "arrows"]))
	for _i in int(_char.get("saws", 0)):
		saw_system.add_saw()
	player.health_changed.connect(_on_player_health_changed)
	player.died.connect(_on_player_died)
	player.took_damage.connect(_on_player_took_damage)
	damage_flash.modulate.a = 0.0
	enemies.child_entered_tree.connect(_on_enemy_added)
	level_system.xp_changed.connect(_on_xp_changed)
	level_system.leveled_up.connect(_on_leveled_up)
	for i in cards.size():
		cards[i].selected.connect(_on_option_selected.bind(i))
		cards[i].hover_changed.connect(_on_card_hover)
	restart_button.pressed.connect(_on_restart_pressed)
	main_menu_button.pressed.connect(_on_main_menu_pressed)
	# XP gems trigger the pickup chime via this group (no hard reference needed).
	xp_sound.add_to_group("xp_sfx")
	_on_player_health_changed(player.max_health, player.max_health)
	kills_label.text = "ABATES 0"
	_update_time()
	_build_pause_menu()
	# Touch joystick overlay. Inert on desktop (it only listens for touch events),
	# so the keyboard path is unchanged; player.gd reads it via the "joystick" group.
	$UI.add_child(preload("res://scripts/virtual_joystick.gd").new())
	# Opening rush: 5 normal enemies one second after the run begins.
	get_tree().create_timer(1.0).timeout.connect(_opening_rush)

func _input(event: InputEvent) -> void:
	# Debug: press L to force a level-up (shows the reward cards).
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_L:
		if not is_game_over:
			level_system.debug_level_up()
	# Debug: press B to spawn a boss immediately.
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_B:
		if not is_game_over:
			boss_system.spawn_boss()
	# ESC toggles the pause menu during normal gameplay.
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		_toggle_pause()
		get_viewport().set_input_as_handled()

func _process(delta: float) -> void:
	if is_game_over:
		if Input.is_physical_key_pressed(KEY_R):
			get_tree().paused = false
			get_tree().reload_current_scene()
		return
	if get_tree().paused:
		return  # level-up menu open: freeze the timer too
	_update_shake(delta)
	survival_time += delta
	_update_time()

func _update_shake(delta: float) -> void:
	if _shake_time <= 0.0:
		return
	_shake_time -= delta
	if _shake_time <= 0.0:
		camera.offset = Vector2.ZERO
		return
	var k := _shake_time / _shake_dur
	camera.offset = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake_mag * k

## Kick off a decaying screen shake (used on the boss kill).
func shake(magnitude: float, duration: float) -> void:
	_shake_mag = magnitude
	_shake_dur = duration
	_shake_time = duration

## Opening rush: drop 5 normal enemies a second into the run.
func _opening_rush() -> void:
	if is_game_over:
		return
	if is_instance_valid(spawner) and spawner.has_method("spawn_burst"):
		spawner.spawn_burst(10)

func _on_enemy_added(node: Node) -> void:
	if node.has_signal("died"):
		node.died.connect(_on_enemy_died)

func _on_enemy_died(enemy) -> void:
	kills += 1
	kills_label.text = "ABATES %d" % kills
	if is_instance_valid(enemy):
		# Deferred: enemies die inside a physics collision callback, and adding
		# an Area2D (the gem) during the physics flush is not allowed.
		if enemy.is_in_group("boss"):
			_spawn_xp_burst.call_deferred(enemy.global_position)
			_boss_death_fx.call_deferred(enemy.global_position)
		else:
			_spawn_gem.call_deferred(enemy.global_position)

## Boss kill juice: a big fiery blast at the death spot + a screen shake.
func _boss_death_fx(pos: Vector2) -> void:
	var boom := BOSS_EXPLOSION.new()
	pickups.add_child(boom)
	boom.global_position = pos
	shake(22.0, 0.55)

func _spawn_gem(pos: Vector2) -> void:
	var gem := GEM_SCENE.instantiate()
	pickups.add_child(gem)
	gem.global_position = pos

## Boss reward: scatter a pile of XP gems on the ground around the death spot.
func _spawn_xp_burst(pos: Vector2) -> void:
	# Slightly bigger XP reward the higher the player's level.
	var lvl: int = int(level_system.level) if (is_instance_valid(level_system) and "level" in level_system) else 1
	var count := 50 + lvl * 3
	var limit := 1500.0 - 24.0
	for i in count:
		var gem := GEM_SCENE.instantiate()
		pickups.add_child(gem)
		var a := randf() * TAU
		var r := sqrt(randf()) * 250.0  # sqrt for even area spread, not center-clumped
		var p := pos + Vector2(cos(a), sin(a)) * r
		gem.global_position = p.clamp(Vector2(-limit, -limit), Vector2(limit, limit))

func _on_xp_changed(current: int, needed: int, lvl: int) -> void:
	level_label.text = "NV %d" % lvl
	xp_bar.max_value = needed
	xp_bar.value = current

func _on_leveled_up(lvl: int) -> void:
	level_sound.play()
	# Recompute spawn cadence from the new level: calmer in levels 1-5, converging
	# on the old pace by ~level 12.
	spawner.set_level(lvl)
	# Vacuum every XP gem on the map toward the player.
	get_tree().call_group("xp_gems", "attract_to", player)
	_pending_levelups += 1
	if not level_up_panel.visible:
		_show_levelup()

func _show_levelup() -> void:
	# Filter the pool: drop maxed-out upgrades, character-locked unlocks the run
	# can't access, and weapon upgrades for a weapon the player doesn't have yet
	# (e.g. the arrow upgrades stay hidden for the Knight until Flaming Arrows is taken).
	var specials: Array = _char.get("specials", [])
	var pool: Array = UPGRADES.filter(func(u):
		if u.has("max_stacks") and int(_stacks.get(u["id"], 0)) >= int(u["max_stacks"]):
			return false
		if u.has("needs_special") and not (u["needs_special"] in specials):
			return false
		if u.has("needs_weapon") and not weapon_system.has_weapon(u["needs_weapon"]):
			return false
		return true)
	pool.shuffle()
	_current_choices = pool.slice(0, 3)
	for i in cards.size():
		var upg: Dictionary = _current_choices[i]
		var tex: Texture2D = load(upg["icon"]) as Texture2D
		cards[i].setup(tex, upg["label"], _desc_for(upg))
		cards[i].modulate = Color(1, 1, 1)
		cards[i].scale = Vector2.ONE
	get_tree().paused = true
	level_up_panel.visible = true

func _on_card_hover(card: Control, hovered: bool) -> void:
	for c in cards:
		c.modulate = Color(0.6, 0.6, 0.6) if (hovered and c != card) else Color(1, 1, 1)

func _on_option_selected(index: int) -> void:
	upgrade_sound.play()
	_apply_upgrade(_current_choices[index]["id"])
	_resolve_choice()

## Description shown on a card: the base text the first time it's offered, then
## the stacked text ("desc_next") once the player already owns at least one.
func _desc_for(upg: Dictionary) -> String:
	if int(_stacks.get(upg["id"], 0)) > 0 and upg.has("desc_next"):
		return upg["desc_next"]
	return upg["desc"]

func _apply_upgrade(id: String) -> void:
	_stacks[id] = int(_stacks.get(id, 0)) + 1
	match id:
		"missiles":
			weapon_system.scale_fire_rate(false, 0.85)
		"homing":
			weapon_system.scale_fire_rate(true, 0.85)
		"speed":
			player.speed *= 1.20
		"maxhp":
			player.add_max_health(50.0)
		"xprate":
			level_system.add_xp_rate(1.0)
		"regen":
			player.add_regen(1.5)
		"explode":
			weapon_system.add_explosion(false, 60.0, 30.0)
		"bounce":
			# First pick: secretly bounce twice. Second pick: infinite bounce
			# (after which max_stacks removes it from the pool).
			if int(_stacks["bounce"]) >= 2:
				weapon_system.set_infinite_bounce(false)
			else:
				weapon_system.increase_bounce(false, 2)
		"saw":
			saw_system.add_saw()
		"lightning":
			lightning_system.enable()
		"flaming":
			# Turn on the standard arrows weapon — the existing arrow upgrades
			# (More/Explosive/Bouncing) then unlock via their needs_weapon gate.
			weapon_system.add_weapon("arrows")

func _resolve_choice() -> void:
	_pending_levelups -= 1
	if _pending_levelups > 0:
		return  # keep the panel up for the next queued level-up
	level_up_panel.visible = false
	get_tree().paused = false

func _on_player_took_damage() -> void:
	shake(9.0, 0.22)  # quick jolt when the player is hit
	damage_flash.modulate.a = 0.5
	var tw := create_tween()
	tw.tween_property(damage_flash, "modulate:a", 0.0, 0.3)
	# Knight perk: getting hit shoves all enemies back a little.
	var kb: float = float(_char.get("knockback_on_hit", 0.0))
	if kb > 0.0:
		for e in enemies.get_children():
			if e.has_method("knockback_from"):
				e.knockback_from(player.global_position, kb)

func _on_player_health_changed(current: float, maximum: float) -> void:
	health_label.text = "VIDA %d / %d" % [int(ceil(current)), int(maximum)]
	health_bar.max_value = maximum
	health_bar.value = current

func _on_player_died() -> void:
	is_game_over = true
	$Sounds/Music.stop()   # cut the gameplay battle track...
	# Let the killing blow read before cutting away: the world keeps moving
	# for a beat so the player can see what got them.
	await get_tree().create_timer(0.6).timeout
	_play_death_music()    # ...and swap in the retired, somber gothic title theme
	result_label.text = ("SOBREVIVEU %.1f s  ·  %d " % [survival_time, kills]).replace(".", ",") + ("ABATE" if kills == 1 else "ABATES")
	game_over_panel.visible = true
	get_tree().paused = true

## Death-screen music: the old "too boring" gothic title theme (death_music.mp3),
## looped. process_mode = ALWAYS so it keeps playing while the tree is paused.
## The epic one-shot death SFX is separate (player.gd -> Sfx.play("player_death")).
func _play_death_music() -> void:
	var dm := AudioStreamPlayer.new()
	dm.stream = load("res://assets/sounds/death_music.mp3")
	dm.volume_db = -8.0
	dm.process_mode = Node.PROCESS_MODE_ALWAYS
	dm.finished.connect(dm.play)  # loop
	add_child(dm)
	dm.play()

func _on_restart_pressed() -> void:
	Sfx.play("ui_click")
	# Death pauses the tree; clear it before reloading.
	get_tree().paused = false
	get_tree().reload_current_scene()

func _on_main_menu_pressed() -> void:
	Sfx.play("ui_click")
	# Death pauses the tree; clear it so the menu scene runs normally.
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

## Build the ESC pause overlay in code (process_mode ALWAYS so its buttons work
## while the tree is paused). Resume / Main Menu / Quit.
func _build_pause_menu() -> void:
	_pause_panel = Control.new()
	_pause_panel.name = "PausePanel"
	_pause_panel.theme = load("res://resources/menu_theme.tres")  # reuse the main-menu button styling
	_pause_panel.process_mode = Node.PROCESS_MODE_ALWAYS
	_pause_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_pause_panel.visible = false
	$UI.add_child(_pause_panel)

	var dim := ColorRect.new()
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0, 0, 0, 0.6)
	_pause_panel.add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_pause_panel.add_child(center)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 18)
	center.add_child(vbox)

	var title := Label.new()
	title.text = "PAUSADO"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 56)
	title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 1))
	title.add_theme_constant_override("outline_size", 10)
	vbox.add_child(title)

	vbox.add_child(_make_pause_button("RETOMAR", _resume))
	vbox.add_child(_make_pause_button("MENU PRINCIPAL", _on_main_menu_pressed))

func _make_pause_button(label: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(320, 0)  # width consistent; themed texture supplies the height
	b.pressed.connect(cb)
	return b

## Toggle pause, but never over the level-up panel or the game-over screen.
func _toggle_pause() -> void:
	if is_game_over or level_up_panel.visible:
		return
	if _pause_panel.visible:
		_resume()
	else:
		Sfx.play("ui_click")
		get_tree().paused = true
		_pause_panel.visible = true

func _resume() -> void:
	Sfx.play("ui_click")
	_pause_panel.visible = false
	get_tree().paused = false

func _update_time() -> void:
	time_label.text = ("TEMPO %.1f s" % survival_time).replace(".", ",")
