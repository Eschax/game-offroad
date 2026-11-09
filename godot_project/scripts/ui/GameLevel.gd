extends Node3D

@onready var vehicle: BaseOffroadVehicle = $JeepRubicon
@onready var camera_pivot: Node3D = $CameraPivot
@onready var hud: CanvasLayer = $HUD

# Kamera Spring Arm Follow
var camera_offset = Vector3(0, 3.5, 6.8)

func _ready():
	connect_hud_signals()

func _physics_process(delta: float):
	if vehicle:
		# Smooth camera follow
		var target_pos = vehicle.global_position + camera_offset
		camera_pivot.global_position = camera_pivot.global_position.lerp(target_pos, delta * 5.0)
		$CameraPivot/Camera3D.look_at(vehicle.global_position + Vector3(0, 1.0, 0))
		
		# Update HUD
		update_hud_display()

func connect_hud_signals():
	# Hubungkan tombol HUD ke fungsi kontrol mobil
	var gas_btn = hud.get_node_or_null("Control/Pedals/GasBtn")
	if gas_btn:
		gas_btn.button_down.connect(func(): vehicle.throttle_input = 1.0)
		gas_btn.button_up.connect(func(): vehicle.throttle_input = 0.0)

	var brake_btn = hud.get_node_or_null("Control/Pedals/BrakeBtn")
	if brake_btn:
		brake_btn.button_down.connect(func(): vehicle.throttle_input = -0.7)
		brake_btn.button_up.connect(func(): vehicle.throttle_input = 0.0)

	var left_btn = hud.get_node_or_null("Control/Steer/LeftBtn")
	if left_btn:
		left_btn.button_down.connect(func(): vehicle.steering_input = 1.0)
		left_btn.button_up.connect(func(): vehicle.steering_input = 0.0)

	var right_btn = hud.get_node_or_null("Control/Steer/RightBtn")
	if right_btn:
		right_btn.button_down.connect(func(): vehicle.steering_input = -1.0)
		right_btn.button_up.connect(func(): vehicle.steering_input = 0.0)

	# Tombol Offroad
	var gear_btn = hud.get_node_or_null("Control/OffroadTools/GearBtn")
	if gear_btn:
		gear_btn.pressed.connect(func(): 
			vehicle.cycle_gear()
			gear_btn.text = ["2H", "4H", "4L"][vehicle.current_gear]
		)

	var diff_btn = hud.get_node_or_null("Control/OffroadTools/DiffBtn")
	if diff_btn:
		diff_btn.pressed.connect(func(): 
			vehicle.toggle_diff_lock()
			diff_btn.modulate = Color.GREEN if vehicle.diff_locked else Color.WHITE
		)

	var psi_btn = hud.get_node_or_null("Control/OffroadTools/PsiBtn")
	if psi_btn:
		psi_btn.pressed.connect(func(): 
			vehicle.toggle_air_down()
			psi_btn.text = "PSI: LOW" if vehicle.air_down else "PSI: NORM"
		)

	# Tombol Suspensi
	var height_high = hud.get_node_or_null("Control/Suspension/HeightHigh")
	if height_high:
		height_high.pressed.connect(func(): vehicle.set_ride_height(vehicle.RideHeight.HIGH))

	var height_norm = hud.get_node_or_null("Control/Suspension/HeightNorm")
	if height_norm:
		height_norm.pressed.connect(func(): vehicle.set_ride_height(vehicle.RideHeight.NORMAL))

	var height_low = hud.get_node_or_null("Control/Suspension/HeightLow")
	if height_low:
		height_low.pressed.connect(func(): vehicle.set_ride_height(vehicle.RideHeight.LOW))

	var stiff_btn = hud.get_node_or_null("Control/Suspension/StiffBtn")
	if stiff_btn:
		stiff_btn.pressed.connect(func(): 
			vehicle.toggle_stiffness()
			stiff_btn.text = "STIFF" if vehicle.is_stiff else "SOFT"
		)

func update_hud_display():
	var speed_label = hud.get_node_or_null("Control/TopBar/SpeedLabel")
	if speed_label and vehicle:
		var speed_kmh = round(vehicle.linear_velocity.length() * 3.6)
		speed_label.text = str(speed_kmh) + " KM/H"

	var fuel_label = hud.get_node_or_null("Control/TopBar/FuelLabel")
	if fuel_label and vehicle:
		fuel_label.text = "BBM: " + str(round(vehicle.fuel)) + "%"
