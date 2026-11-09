"""
Generator Model 3D Format GLTF/GLB Biner untuk Kendaraan Offroad Godot 4 & Web 3D
Menghasilkan model 3D bodi Jeep Rubicon, Kabin, Bumper Bullbar, Ban Mud-Terrain, dan Spare Tire.
"""
import struct
import json
import os

def create_rubicon_glb(output_path):
    # Geometri dasar kubus & silinder untuk bodi Rubicon
    vertices = []
    indices = []

    def add_box(center, size):
        start_idx = len(vertices) // 3
        cx, cy, cz = center
        sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2

        corners = [
            (cx - sx, cy - sy, cz + sz),
            (cx + sx, cy - sy, cz + sz),
            (cx + sx, cy + sy, cz + sz),
            (cx - sx, cy + sy, cz + sz),
            (cx - sx, cy - sy, cz - sz),
            (cx + sx, cy - sy, cz - sz),
            (cx + sx, cy + sy, cz - sz),
            (cx - sx, cy + sy, cz - sz),
        ]
        for c in corners:
            vertices.extend(c)

        box_faces = [
            (0, 1, 2), (0, 2, 3), # Depan
            (1, 5, 6), (1, 6, 2), # Kanan
            (5, 4, 7), (5, 7, 6), # Belakang
            (4, 0, 3), (4, 3, 7), # Kiri
            (3, 2, 6), (3, 6, 7), # Atas
            (4, 5, 1), (4, 1, 0)  # Bawah
        ]
        for f in box_faces:
            indices.extend([start_idx + f[0], start_idx + f[1], start_idx + f[2]])

    # 1. Bodi Bawah (Tub)
    add_box((0, 0.45, 0), (1.85, 0.65, 3.8))
    # 2. Kabin Atas (Roof & Cabin)
    add_box((0, 1.05, -0.3), (1.68, 0.72, 2.3))
    # 3. Kap Mesin (Hood)
    add_box((0, 0.72, 1.15), (1.75, 0.45, 1.5))
    # 4. Bumper Depan Offroad (Bullbar)
    add_box((0, 0.28, 1.95), (1.95, 0.3, 0.35))
    # 5. Ban Serep Belakang
    add_box((0, 0.85, -2.05), (0.85, 0.85, 0.35))
    # 6. Fender Depan Kiri-Kanan
    add_box((-0.98, 0.52, 1.2), (0.24, 0.2, 1.2))
    add_box((0.98, 0.52, 1.2), (0.24, 0.2, 1.2))
    # 7. Fender Belakang Kiri-Kanan
    add_box((-0.98, 0.52, -1.2), (0.24, 0.2, 1.2))
    add_box((0.98, 0.52, -1.2), (0.24, 0.2, 1.2))

    # Convert to Binary
    vert_bytes = struct.pack(f"<{len(vertices)}f", *vertices)
    idx_bytes = struct.pack(f"<{len(indices)}H", *indices)

    # Padding ke kelipatan 4 byte
    while len(vert_bytes) % 4 != 0:
        vert_bytes += b'\x00'
    while len(idx_bytes) % 4 != 0:
        idx_bytes += b'\x00'

    bin_data = idx_bytes + vert_bytes
    idx_len = len(idx_bytes)
    vert_len = len(vert_bytes)

    min_x = min(vertices[0::3])
    max_x = max(vertices[0::3])
    min_y = min(vertices[1::3])
    max_y = max(vertices[1::3])
    min_z = min(vertices[2::3])
    max_z = max(vertices[2::3])

    gltf = {
        "asset": {"version": "2.0", "generator": "OffroadGLTFGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "RubiconBody", "mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0,
                "material": 0
            }]
        }],
        "materials": [{
            "name": "RubiconPaint",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.85, 0.42, 0.05, 1.0],
                "metallicFactor": 0.6,
                "roughnessFactor": 0.35
            }
        }],
        "buffers": [{
            "byteLength": len(bin_data)
        }],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": idx_len,
                "target": 34963 # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": idx_len,
                "byteLength": vert_len,
                "target": 34962 # ARRAY_BUFFER
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5123, # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR",
                "max": [max(indices)],
                "min": [min(indices)]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": len(vertices) // 3,
                "type": "VEC3",
                "max": [max_x, max_y, max_z],
                "min": [min_x, min_y, min_z]
            }
        ]
    }

    json_str = json.dumps(gltf, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    # Header GLB (12 byte) + Chunk 0 JSON + Chunk 1 BIN
    glb_header = struct.pack(
        "<4sII",
        b"glTF",
        2,
        12 + 8 + len(json_bytes) + 8 + len(bin_data)
    )
    chunk0_header = struct.pack("<II", len(json_bytes), 0x4E4F534A) # JSON
    chunk1_header = struct.pack("<II", len(bin_data), 0x004E4942)   # BIN

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(glb_header)
        f.write(chunk0_header)
        f.write(json_bytes)
        f.write(chunk1_header)
        f.write(bin_data)

    print(f"Berhasil membuat model 3D GLB: {output_path} ({len(vertices)//3} vertex)")

if __name__ == "__main__":
    create_rubicon_glb("godot_project/assets/models/jeep_rubicon.glb")
    create_rubicon_glb("public/models/jeep_rubicon.glb")
