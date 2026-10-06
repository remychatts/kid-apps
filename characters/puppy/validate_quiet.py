#!/usr/bin/env python3
"""Compare Q1–Q4's fresh-imported GLB deformation with the editable Blender draft.

Examples: ./characters/puppy/validate_quiet.py
  blender --background --factory-startup --threads 6 --python-exit-code 1
  --python characters/puppy/validate_quiet.py
Use -- --animation-dir /tmp/puppy-quiet to check a separate build.
"""

import argparse
import json
import math
import os
import shutil
import sys
import tempfile
from pathlib import Path

try:
    import bpy
except ModuleNotFoundError:
    # Executable entry points relaunch under Blender's Python, where bpy is available.
    executable = (
        shutil.which("blender") or "/Applications/Blender.app/Contents/MacOS/Blender"
    )
    if not Path(executable).is_file():
        raise SystemExit(
            "Blender was not found. Put blender on PATH and try again."
        ) from None
    os.execv(
        executable,
        [
            executable,
            "--background",
            "--disable-autoexec",
            "--threads",
            "6",
            "--python-exit-code",
            "1",
            "--python",
            str(Path(__file__).resolve()),
            "--",
            *sys.argv[1:],
        ],
    )
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quiet_glb import read_glb, write_glb


def points(obj):
    """Read final evaluated mesh vertices in world coordinates."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    result = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return result


def distance(original, imported):
    """Compare deformed surfaces while allowing the exporter to split vertices."""

    def one_way(source, target):
        """Find the largest nearest-vertex error from one surface to the other."""
        tree = KDTree(len(target))
        for index, point in enumerate(target):
            tree.insert(point, index)
        tree.balance()
        return max(tree.find(point)[2] for point in source)

    return max(one_way(original, imported), one_way(imported, original))


def main():
    """Fresh-import each named clip and verify endpoints, extremes and between-key poses."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--animation-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "animations",
    )
    args = parser.parse_args(
        sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    )
    directory = args.animation_dir.resolve()
    clips = json.loads((directory / "clips.json").read_text())
    document, binary = read_glb(directory / "puppy-quiet.glb")
    assert [animation["name"] for animation in document["animations"]] == [
        clip["id"] for clip in clips
    ]
    assert len(document["skins"]) == 1
    assert not document.get("cameras") and not document.get("images")
    assert all("Studio" not in node.get("name", "") for node in document["nodes"])
    mesh_names = {
        node["name"]: document["meshes"][node["mesh"]]["name"]
        for node in document["nodes"]
        if "mesh" in node
    }
    bpy.ops.wm.open_mainfile(filepath=str(directory / "puppy-quiet.blend"))
    scene = bpy.context.scene
    meshes = [
        obj
        for obj in bpy.data.collections["Puppy — rigged character"].objects
        if obj.type == "MESH"
    ]
    reference = {}
    sample_times = {}
    for clip in clips:
        # Include half-frame samples, blink hold and the two endpoints.
        times = sorted(
            {
                0,
                0.4 if clip["id"] == "Q2" else clip["duration"] * 0.5,
                clip["duration"] * 0.315,
                clip["duration"],
            }
        )
        sample_times[clip["id"]] = times
        for time in times:
            frame = clip["startFrame"] + time * scene.render.fps
            scene.frame_set(math.floor(frame), subframe=frame % 1)
            reference[(clip["id"], time)] = {obj.name: points(obj) for obj in meshes}
    maximum_error = 0
    with tempfile.TemporaryDirectory(prefix="puppy-round-trip-") as temporary:
        for animation in document["animations"]:
            # Import a single clip per fresh scene so NLA selection cannot hide a wrong clip.
            single = dict(document, animations=[animation])
            path = Path(temporary) / "clip.glb"
            write_glb(path, single, binary)
            bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.context.scene.render.fps = 30
            bpy.ops.import_scene.gltf(filepath=str(path))
            for time in sample_times[animation["name"]]:
                frame = time * 30
                bpy.context.scene.frame_set(math.floor(frame), subframe=frame % 1)
                for name, original in reference[(animation["name"], time)].items():
                    obj = next(
                        (
                            obj
                            for obj in bpy.data.objects
                            if obj.type == "MESH" and obj.data.name == mesh_names[name]
                        ),
                        None,
                    )
                    assert obj is not None, (animation["name"], "Missing mesh", name)
                    error = distance(original, points(obj))
                    maximum_error = max(maximum_error, error)
                    assert error < 0.002, (
                        animation["name"],
                        time,
                        name,
                        "Deformation mismatch",
                        error,
                    )
    report = {
        "passed": True,
        "blender": bpy.app.version_string,
        "clips": sample_times,
        "maximum_round_trip_vertex_error": maximum_error,
        "comparison": "symmetric nearest vertex; fresh import per clip; endpoints and between-key samples",
    }
    (directory / "export-validation.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print("QUIET_EXPORT_VALIDATION", json.dumps(report))


if __name__ == "__main__":
    main()
