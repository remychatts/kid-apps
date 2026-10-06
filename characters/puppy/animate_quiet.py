#!/usr/bin/env python3
"""Author Q1–Q4 on the existing puppy rig and export named, baked GLB clips.

Examples: ./characters/puppy/animate_quiet.py
  blender --background --disable-autoexec --threads 6 --python-exit-code 1
  --python characters/puppy/animate_quiet.py -- --render
Use --output-dir /tmp/puppy-quiet to preserve a manually edited animation draft.
The static puppy and rig prototype are never overwritten.
"""

import argparse
import json
import math
import os
import shutil
import sys
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
from mathutils import Quaternion, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from export_rig import export_rig
from quiet_glb import split_clips

FPS = 30
CLIPS = [
    {"id": "neutral", "label": "Neutral stance", "duration": 0.2, "group": "Rest"},
    {
        "id": "Q1",
        "label": "Soft breathing",
        "duration": 4.0,
        "group": "Quiet",
        "loop": True,
    },
    {"id": "Q2", "label": "Slow blink", "duration": 1.2, "group": "Quiet"},
    {
        "id": "Q3-left",
        "label": "Curious tilt · left",
        "duration": 2.5,
        "group": "Quiet",
    },
    {
        "id": "Q3-right",
        "label": "Curious tilt · right",
        "duration": 2.5,
        "group": "Quiet",
    },
    {
        "id": "Q4",
        "label": "Look around, then attend",
        "duration": 3.5,
        "group": "Quiet",
    },
]


def smooth(value):
    """Ease an interval with zero speed at both ends."""
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def envelope(time, start, rise_end, hold_end, end):
    """Ease into a gesture, hold it, then return smoothly to neutral."""
    return smooth((time - start) / (rise_end - start)) * (
        1 - smooth((time - hold_end) / (end - hold_end))
    )


def move(rig, name, offset):
    """Move a control by a character-space displacement."""
    rig.pose.bones[name].location = rig.data.bones[
        name
    ].matrix_local.to_3x3().inverted() @ Vector(offset)


def rotate(rig, name, xyz):
    """Rotate a control in its local axes using degrees."""
    rig.pose.bones[name].rotation_euler = tuple(math.radians(v) for v in xyz)


def rotate_world(rig, name, axis, degrees):
    """Apply a character-axis turn through the bone's current orientation."""
    bpy.context.view_layer.update()
    bone = rig.pose.bones[name]
    rotation = bone.matrix.to_quaternion()
    local = (
        rotation.inverted() @ Quaternion(Vector(axis), math.radians(degrees)) @ rotation
    )
    bone.rotation_euler = (bone.rotation_euler.to_quaternion() @ local).to_euler("XYZ")
    bpy.context.view_layer.update()


def pose(rig, controls, clip, time):
    """Choreograph one quiet gesture, resetting all other channels to neutral."""
    for bone in rig.pose.bones:
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)
    for control in controls:
        rig[control] = 0.0
    if clip == "Q1":
        breath = math.sin(math.pi * time / 4) ** 2
        rig["Breath"] = breath
        move(rig, "chest", (0, 0, 0.008 * breath))
    elif clip == "Q2":
        blink = envelope(time, 0.2, 0.35, 0.45, 0.7)
        rig["Blink.L"] = rig["Blink.R"] = blink
    elif clip.startswith("Q3"):
        sign = 1 if clip == "Q3-left" else -1
        tilt = envelope(time, 0.4, 0.9, 1.6, 2.5)
        gaze = envelope(time, 0.1, 0.4, 1.6, 2.5)
        rotate_world(rig, "head", (0, 1, 0), sign * 16 * tilt)
        # The raised brow is opposite the ear lowered towards its shoulder.
        suffix = "R" if sign > 0 else "L"
        rig["BrowRaise." + suffix] = 0.7 * tilt
        for side in ("L", "R"):
            rig[("GazeLeft." if sign > 0 else "GazeRight.") + side] = 0.55 * gaze
            ear_sign = 1 if side == "L" else -1
            lag = envelope(time, 0.49, 1.02, 1.68, 2.5)
            settle = math.sin(max(0, time - 1.02) * 10) * math.exp(
                -max(0, time - 1.02) * 4
            )
            rotate(rig, "ear.0." + side, (0, 0, -ear_sign * 4 * lag))
            rotate(rig, "ear.1." + side, (0, 0, sign * (5 * lag + 1.5 * settle * lag)))
            rotate(
                rig,
                "ear.2." + side,
                (0, 0, sign * 3 * envelope(time, 0.56, 1.1, 1.72, 2.5)),
            )
    elif clip == "Q4":
        turn = envelope(time, 0.12, 0.7, 1.4, 2.2)
        nod = envelope(time, 0.18, 0.7, 1.4, 3.5)
        gaze = envelope(time, 0, 0.26, 1.4, 2.65)
        rotate_world(rig, "head", (0, 0, 1), 17 * turn)
        rotate(rig, "neck", (-2 * nod, 0, 0))
        # Preserve the neck's turn while adding a small muzzle lift on the head.
        rotate_world(rig, "neck", (0, 0, 1), 4 * turn)
        rotate_world(rig, "head", (1, 0, 0), -4 * nod)
        for side in ("L", "R"):
            rig["GazeLeft." + side] = 0.65 * gaze
            rig["GazeUp." + side] = 0.15 * nod
            sign = 1 if side == "L" else -1
            rotate(
                rig,
                "ear.1." + side,
                (0, 0, sign * 2 * envelope(time, 0.22, 0.82, 1.52, 3.5)),
            )
    rig.update_tag()
    bpy.context.view_layer.update()


def points(obj):
    """Read evaluated world vertices without retaining temporary Blender meshes."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    result = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return result


def main():
    """Build an editable timeline, validate planted paws and bake the portable library."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=HERE / "animations")
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args(
        sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    )
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(HERE / "rig/puppy-rig.blend"))
    scene = bpy.context.scene
    rig = bpy.data.objects["Puppy rig"]
    body = bpy.data.objects["Puppy body"]
    controls = [key for key, value in rig.items() if isinstance(value, float)]
    rig.animation_data_clear()
    scene.timeline_markers.clear()
    scene.name = "PUPPY_QUIET_DRAFTS"
    scene["review_status"] = "Q1–Q4 draft clips; visual and iPad review pending."
    scene.render.fps = FPS
    scene.frame_start = 1
    pose(rig, controls, "neutral", 0)
    neutral = points(body)
    soles = [v.index for v in body.data.vertices if v.co.z < 0.045]
    report = {
        "fps": FPS,
        "sole_samples": len(soles),
        "maximum_planted_sole_drift": 0,
        "clips": [],
    }
    frame = 1
    for specification in CLIPS:
        clip = dict(specification)
        clip["startFrame"] = frame
        end = round(clip["duration"] * FPS)
        clip["endFrame"] = frame + end
        scene.timeline_markers.new(clip["id"] + " · " + clip["label"], frame=frame)
        for step in range(end + 1):
            pose(rig, controls, clip["id"], step / FPS)
            for bone in rig.pose.bones:
                for channel in ("location", "rotation_euler", "scale"):
                    bone.keyframe_insert(channel, frame=frame + step, group=bone.name)
            for control in controls:
                rig.keyframe_insert(
                    '["' + control + '"]', frame=frame + step, group="Facial controls"
                )
            posed = points(body)
            drift = max((posed[index] - neutral[index]).length for index in soles)
            assert drift < 0.002, (clip["id"], step, "Planted paw drift", drift)
            assert min(point.z for point in posed) > -0.015, (
                clip["id"],
                step,
                "Floor penetration",
            )
            assert all(math.isfinite(value) for point in posed for value in point)
            report["maximum_planted_sole_drift"] = max(
                report["maximum_planted_sole_drift"], drift
            )
        report["clips"].append(clip)
        frame += end + 2
    scene.frame_end = frame - 2
    rig.animation_data.action.name = "Q1–Q4 · editable quiet drafts"
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "puppy-quiet.blend"))
    # Reload so export samples precisely the saved authoring timeline and live drivers.
    bpy.ops.wm.open_mainfile(filepath=str(output / "puppy-quiet.blend"))
    export_rig(
        output / "timeline.glb",
        bpy.data.collections["Puppy — rigged character"],
        bpy.data.objects["Puppy rig"],
    )
    split_clips(
        output / "timeline.glb", output / "puppy-quiet.glb", report["clips"], FPS
    )
    (output / "timeline.glb").unlink()
    (output / "clips.json").write_text(json.dumps(report["clips"], indent=2) + "\n")
    report["glb_bytes"] = (output / "puppy-quiet.glb").stat().st_size
    report["passed"] = True
    (output / "authoring-validation.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    if args.render:
        # Renders use the baked scene, exercising the same deformation as the exported curves.
        scene = bpy.context.scene
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 24
        scene.render.resolution_x = scene.render.resolution_y = 640
        scene.render.threads_mode = "FIXED"
        scene.render.threads = 6
        cameras = {"hero": (4, -6, 3.3), "front": (0, -7, 2.8), "side": (7, 0, 2.6)}
        for clip in report["clips"]:
            sample = {
                "neutral": 0,
                "Q1": 2,
                "Q2": 0.4,
                "Q3-left": 1.2,
                "Q3-right": 1.2,
                "Q4": 1.1,
            }[clip["id"]]
            scene.frame_set(clip["startFrame"] + round(sample * FPS))
            for view, location in cameras.items():
                scene.camera.location = location
                scene.camera.rotation_euler = (
                    (Vector((0, 0, 1.65)) - scene.camera.location)
                    .to_track_quat("-Z", "Y")
                    .to_euler()
                )
                scene.render.filepath = str(output / f"{clip['id']}-{view}.png")
                bpy.ops.render.render(write_still=True)
    print("QUIET_DRAFTS", json.dumps(report))


if __name__ == "__main__":
    main()
