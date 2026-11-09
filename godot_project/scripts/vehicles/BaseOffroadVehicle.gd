extends VehicleBody3D
class_name BaseOffroadVehicle

# Status Kendaraan & Input
@export var vehicle_id: String = "rubicon"
var throttle_input: float = 0.0
var steering_input: float = 0.0
var handbrake_input: bool = false

# Offroad Systems khas Roblox Low Range 4x4
enum GearMode { GEAR_2H, GEAR_4H, GEAR_4L }
var current_gear: GearMode = GearMode.GEAR_4H
var diff_locked: bool = false
var air_down: bool = false
var fuel: float = 100.0
var max_fuel: float = 100.0

# Suspensi Interaktif Real-time
enum RideHeight { LOW, NORMAL, HIGH }
var current_height: RideHeight = RideHeight.NORMAL
var is_stiff: bool = false

# Node Referensi Roda (VehicleWheel3D)
@onready var wheel_fl: VehicleWheel3D = $Wheel_FL
@onready var wheel_fr: VehicleWheel3D = $Wheel_FR
@onready var wheel_rl: VehicleWheel3D = $Wheel_RL
@onready var wheel_rr: VehicleWheel3D = $Wheel_RR

var wheels: Array[VehicleWheel3D] = []

func _ready():
	wheels = [wheel_fl, wheel_fr, wheel_rl, wheel_rr]
	apply_vehicle_specs()
	set_ride_height(RideHeight.NORMAL)

func apply_vehicle_specs():
	if GameManager and GameManager.vehicle_specs.has(vehicle_id):
		var spec = GameManager.vehicle_specs[vehicle_id]
		mass = spec["mass"]
		for w in wheels:
			w.suspension_stiffness = spec["stiffness"]
			w.damping_compression = spec["damping"]
			w.damping_relaxation = spec["damping"] * 1.2
			w.wheel_friction_slip = 2.2

func _physics_process(delta: float):
	process_drive(delta)
	process_steering(delta)
	process_fuel(delta)

func process_drive(delta: float):
	var base_force = 3500.0
	if GameManager and GameManager.vehicle_specs.has(vehicle_id):
		base_force = GameManager.vehicle_specs[vehicle_id]["engine_force"]
	
	# Torque Multiplier berdasarkan Gear
	var torque_multiplier = 1.0
	if current_gear == GearMode.GEAR_4L:
		torque_multiplier = 2.8 # Sangat kuat untuk memanjat batu terjal
	
	var applied_force = throttle_input * base_force * torque_multiplier
	var applied_brake = 40.0 if handbrake_input else (5.0 if throttle_input == 0.0 else 0.0)
	
	if current_gear == GearMode.GEAR_2H:
		# Rear Wheel Drive
		wheel_fl.engine_force = 0.0
		wheel_fr.engine_force = 0.0
		wheel_rl.engine_force = applied_force * 0.5
		wheel_rr.engine_force = applied_force * 0.5
	else:
		# 4WD (4H / 4L)
		for w in wheels:
			w.engine_force = applied_force * 0.25
			w.brake = applied_brake

func process_steering(delta: float):
	var max_steer_angle = deg_to_rad(30.0)
	var target_steer = steering_input * max_steer_angle
	wheel_fl.steering = lerp(wheel_fl.steering, target_steer, delta * 8.0)
	wheel_fr.steering = lerp(wheel_fr.steering, target_steer, delta * 8.0)

func process_fuel(delta: float):
	if abs(throttle_input) > 0.1 and fuel > 0.0:
		var burn_rate = 1.8 if current_gear == GearMode.GEAR_4L else 1.0
		fuel = max(0.0, fuel - delta * 0.4 * burn_rate)

# FUNGSI INTERAKTIF SUSPENSI (NAIK-TURUN & EMPUK/KERAS)
func set_ride_height(height_level: RideHeight):
	current_height = height_level
	var target_rest_length = 0.35
	match height_level:
		RideHeight.LOW:
			target_rest_length = 0.18 # Stabil di jalan cepat/gravel
		RideHeight.NORMAL:
			target_rest_length = 0.35
		RideHeight.HIGH:
			target_rest_length = 0.58 # Ground clearance tinggi untuk rock crawling
	
	for w in wheels:
		w.suspension_rest_length = target_rest_length

func toggle_stiffness():
	is_stiff = not is_stiff
	var base_stiff = 45.0
	if GameManager and GameManager.vehicle_specs.has(vehicle_id):
		base_stiff = GameManager.vehicle_specs[vehicle_id]["stiffness"]
	
	for w in wheels:
		w.suspension_stiffness = base_stiff * (1.5 if is_stiff else 0.75)

func toggle_air_down():
	air_down = not air_down
	var friction = 3.2 if air_down else 2.2
	for w in wheels:
		w.wheel_friction_slip = friction

func cycle_gear():
	match current_gear:
		GearMode.GEAR_2H:
			current_gear = GearMode.GEAR_4H
		GearMode.GEAR_4H:
			current_gear = GearMode.GEAR_4L
		GearMode.GEAR_4L:
			current_gear = GearMode.GEAR_2H

func toggle_diff_lock():
	diff_locked = not diff_locked

