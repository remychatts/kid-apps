"""Split a baked Blender scene animation into named glTF clips sharing one mesh.

The split_clips API crops frame-sampled curves and rebuilds their buffer views.
"""

import copy
import json
import struct


def read_glb(path):
    """Read the JSON and binary chunks of a self-contained GLB."""
    blob = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", blob)
    assert magic == b"glTF" and version == 2 and length == len(blob)
    size = struct.unpack_from("<I", blob, 12)[0]
    document = json.loads(blob[20 : 20 + size])
    return document, blob[28 + size :]


def write_glb(path, document, binary):
    """Write aligned JSON and binary chunks as a standard GLB 2 file."""
    document["buffers"] = [{"byteLength": len(binary)}]
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=True).encode()
    encoded += b" " * (-len(encoded) % 4)
    binary += b"\0" * (-len(binary) % 4)
    path.write_bytes(
        struct.pack("<4sII", b"glTF", 2, 28 + len(encoded) + len(binary))
        + struct.pack("<I4s", len(encoded), b"JSON")
        + encoded
        + struct.pack("<I4s", len(binary), b"BIN\0")
        + binary
    )


def split_clips(source, destination, clips, fps):
    """Crop LINEAR sampled curves to local times, then discard unused timeline data."""
    document, binary = read_glb(source)
    animation = document["animations"][0]
    old_views = document["bufferViews"]
    old_accessors = document["accessors"]
    views, accessors, payload = [], [], bytearray()
    view_map, accessor_map = {}, {}

    def append_view(data, metadata=None):
        """Append an aligned binary view without changing its target/stride metadata."""
        payload.extend(b"\0" * (-len(payload) % 4))
        view = dict(metadata or {})
        view.update(buffer=0, byteOffset=len(payload), byteLength=len(data))
        views.append(view)
        payload.extend(data)
        return len(views) - 1

    def retain_view(index):
        """Copy a geometry buffer view once, preserving sparse morph data."""
        if index not in view_map:
            view = old_views[index]
            offset = view.get("byteOffset", 0)
            view_map[index] = append_view(
                binary[offset : offset + view["byteLength"]], view
            )
        return view_map[index]

    def retain_accessor(index):
        """Keep and remap only accessors used by meshes and skin bind matrices."""
        if index not in accessor_map:
            item = copy.deepcopy(old_accessors[index])
            if "bufferView" in item:
                item["bufferView"] = retain_view(item["bufferView"])
            if "sparse" in item:
                for kind in ("indices", "values"):
                    part = item["sparse"][kind]
                    part["bufferView"] = retain_view(part["bufferView"])
            accessor_map[index] = len(accessors)
            accessors.append(item)
        return accessor_map[index]

    for mesh in document["meshes"]:
        for primitive in mesh["primitives"]:
            primitive["indices"] = retain_accessor(primitive["indices"])
            for attributes in [primitive["attributes"], *primitive.get("targets", [])]:
                for name, index in attributes.items():
                    attributes[name] = retain_accessor(index)
    for skin in document["skins"]:
        skin["inverseBindMatrices"] = retain_accessor(skin["inverseBindMatrices"])

    def data_for(index):
        """Read a dense animation accessor exported by Blender."""
        item = old_accessors[index]
        assert item["componentType"] == 5126 and "sparse" not in item
        view = old_views[item["bufferView"]]
        assert "byteStride" not in view
        width = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[item["type"]]
        offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        return item, binary[offset : offset + item["count"] * width * 4]

    def new_accessor(data, kind, count, limits=None):
        """Create a dense animation accessor with optional time bounds."""
        accessors.append(
            {
                "bufferView": append_view(data),
                "componentType": 5126,
                "type": kind,
                "count": count,
                **(limits or {}),
            }
        )
        return len(accessors) - 1

    animations = []
    for clip in clips:
        start, end = clip["startFrame"] / fps, clip["endFrame"] / fps
        result = {
            "name": clip["id"],
            "channels": [],
            "samplers": [],
            "extras": {"label": clip["label"], "loop": clip.get("loop", False)},
        }
        for channel in animation["channels"]:
            sampler = animation["samplers"][channel["sampler"]]
            input_item, input_data = data_for(sampler["input"])
            output_item, output_data = data_for(sampler["output"])
            times = struct.unpack("<" + "f" * input_item["count"], input_data)
            output_stride = len(output_data) // len(times)
            if len(times) == 2:
                # Blender optimises unchanged channels to two constant keys.
                first = output_data[:output_stride]
                assert all(
                    output_data[i * output_stride : (i + 1) * output_stride] == first
                    for i in range(len(times))
                )
                input_index = new_accessor(
                    struct.pack("<ff", 0, clip["duration"]),
                    "SCALAR",
                    2,
                    {"min": [0.0], "max": [clip["duration"]]},
                )
                output_index = new_accessor(
                    first * 2,
                    output_item["type"],
                    output_item["count"] // len(times) * 2,
                )
                result["channels"].append(
                    {"sampler": len(result["samplers"]), "target": channel["target"]}
                )
                result["samplers"].append(
                    {
                        "input": input_index,
                        "output": output_index,
                        "interpolation": "STEP",
                    }
                )
                continue
            assert sampler.get("interpolation", "LINEAR") == "LINEAR"
            # Force-sampled export is required: every clip boundary must have a sample.
            selected = [
                i
                for i, time in enumerate(times)
                if start - 0.0001 <= time <= end + 0.0001
            ]
            assert (
                selected
                and abs(times[selected[0]] - start) < 0.0001
                and abs(times[selected[-1]] - end) < 0.0001
            ), (clip["id"], channel["target"])
            local_times = [
                max(0.0, time - start) for time in times[selected[0] : selected[-1] + 1]
            ]
            local_times[-1] = clip["duration"]
            output_stride = len(output_data) // len(times)
            values = output_data[
                selected[0] * output_stride : (selected[-1] + 1) * output_stride
            ]
            input_index = new_accessor(
                struct.pack("<" + "f" * len(local_times), *local_times),
                "SCALAR",
                len(local_times),
                {"min": [0.0], "max": [clip["duration"]]},
            )
            output_index = new_accessor(
                values,
                output_item["type"],
                output_item["count"] // len(times) * len(local_times),
            )
            result["channels"].append(
                {"sampler": len(result["samplers"]), "target": channel["target"]}
            )
            result["samplers"].append(
                {
                    "input": input_index,
                    "output": output_index,
                    "interpolation": "LINEAR",
                }
            )
        animations.append(result)
    document.update(animations=animations, bufferViews=views, accessors=accessors)
    write_glb(destination, document, bytes(payload))
