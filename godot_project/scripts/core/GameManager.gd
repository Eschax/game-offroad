extends Node

# Singleton GameManager: Mengelola Data Save, Koin, Mobil, dan Setting Kontrol
const SAVE_PATH = "user://offroad_save_v1.json"

var is_first_launch: bool = true
var control_mode: String = "touch" # "touch", "steer", "gyro"
var coins: int = 500
var selected_vehicle_id: String = "rubicon"
var unlocked_vehicles: Array = ["rubicon"]
var completed_maps: Array = []
var unlocked_achievements: Array = []

var vehicle_specs: Dictionary = {
	"rubicon": {
		"name": "Jeep Rubicon",
		"class": "Rock Crawler",
		"mass": 1900.0,
		"engine_force": 3800.0,
		"brake_force": 60.0,
		"wheelbase": 2.45,
		"base_height": 0.28,
		"suspension_travel": 0.35,
		"stiffness": 40.0,
		"damping": 4.5,
		"price": 0
	},
	"dmax": {
		"name": "Isuzu D-Max",
		"class": "Agile Utility Pickup",
		"mass": 1850.0,
		"engine_force": 3500.0,
		"brake_force": 65.0,
		"wheelbase": 2.85,
		"base_height": 0.24,
		"suspension_travel": 0.26,
		"stiffness": 48.0,
		"damping": 5.0,
		"price": 2500
	},
	"patrol": {
		"name": "Nissan Patrol",
		"class": "Overland Expedition",
		"mass": 2400.0,
		"engine_force": 4600.0,
		"brake_force": 75.0,
		"wheelbase": 2.95,
		"base_height": 0.26,
		"suspension_travel": 0.30,
		"stiffness": 50.0,
		"damping": 5.5,
		"price": 5000
	},
	"ram": {
		"name": "RAM Heavy Duty",
		"class": "Mud Monster Truck",
		"mass": 2700.0,
		"engine_force": 5800.0,
		"brake_force": 85.0,
		"wheelbase": 3.40,
		"base_height": 0.32,
		"suspension_travel": 0.38,
		"stiffness": 55.0,
		"damping": 6.0,
		"price": 8500
	}
}

func _ready():
	load_game()

func save_game():
	var save_dict = {
		"is_first_launch": is_first_launch,
		"control_mode": control_mode,
		"coins": coins,
		"selected_vehicle_id": selected_vehicle_id,
		"unlocked_vehicles": unlocked_vehicles,
		"completed_maps": completed_maps,
		"unlocked_achievements": unlocked_achievements
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(save_dict))

func load_game():
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var content = file.get_as_text()
		var json = JSON.new()
		if json.parse(content) == OK:
			var data = json.get_data()
			is_first_launch = data.get("is_first_launch", true)
			control_mode = data.get("control_mode", "touch")
			coins = data.get("coins", 500)
			selected_vehicle_id = data.get("selected_vehicle_id", "rubicon")
			unlocked_vehicles = data.get("unlocked_vehicles", ["rubicon"])
			completed_maps = data.get("completed_maps", [])
			unlocked_achievements = data.get("unlocked_achievements", [])

func add_coins(amount: int):
	coins += amount
	save_game()

func unlock_vehicle(v_id: String) -> bool:
	if v_id in unlocked_vehicles:
		return true
	var price = vehicle_specs[v_id]["price"]
	if coins >= price:
		coins -= price
		unlocked_vehicles.append(v_id)
		save_game()
		return true
	return false

