#!/usr/bin/env python3
"""Author the complete proposed puppy clip library, retaining the quiet drafts.

Examples: ./characters/puppy/animate_library.py --render
  ./characters/puppy/animate_library.py --output-dir /tmp/puppy-library
Run with Blender's --python option if Blender is not on PATH or installed on macOS.
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
    # Run executable authoring scripts through Blender's bundled Python.
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
from animate_quiet import CLIPS as QUIET_CLIPS
from animate_quiet import envelope, move, points, rotate, rotate_world, smooth
from animate_quiet import pose as quiet_pose
from export_rig import export_rig
from quiet_glb import split_clips

FPS = 60
LEGS = ("front.L", "front.R", "hind.L", "hind.R")
CLIPS = [dict(clip) for clip in QUIET_CLIPS] + [
    {
        "id": "Q5-left",
        "label": "Ear twitch · left",
        "duration": 1.3,
        "group": "Quiet",
        "sample": 0.27,
    },
    {
        "id": "Q5-right",
        "label": "Ear twitch · right",
        "duration": 1.3,
        "group": "Quiet",
        "sample": 0.27,
    },
    {
        "id": "Q6",
        "label": "Quick ear scratch",
        "duration": 4.5,
        "group": "Quiet",
        "sample": 2.1,
        "protectedFrom": 0.8,
        "protectedUntil": 3.6,
    },
    {
        "id": "MIN1",
        "label": "Happy tail wag",
        "duration": 2.4,
        "group": "Minor success",
        "sample": 0.9,
    },
    {
        "id": "MIN2",
        "label": "Play bow",
        "duration": 3.0,
        "group": "Minor success",
        "sample": 1.0,
    },
    {
        "id": "MIN3",
        "label": "Little happy jump",
        "duration": 2.5,
        "group": "Minor success",
        "sample": 0.95,
        "protectedFrom": 0.5,
        "protectedUntil": 1.6,
    },
    {
        "id": "MAJ1",
        "label": "Tail chase",
        "duration": 4.5,
        "group": "Major success",
        "sample": 2.3,
        "protectedFrom": 0.9,
        "protectedUntil": 4.0,
    },
    {
        "id": "MAJ2",
        "label": "Celebratory backflip",
        "duration": 3.5,
        "group": "Major success",
        "sample": 1.275,
        "protectedFrom": 0.6,
        "protectedUntil": 2.2,
    },
    {
        "id": "MAJ3",
        "label": "Ears-up happy surprise",
        "duration": 3.2,
        "group": "Major success",
        "sample": 1.1,
    },
    {
        "id": "F1",
        "label": "Gentle droop, then reassurance",
        "duration": 2.8,
        "group": "Encouragement",
        "sample": 0.6,
    },
    {
        "id": "F2",
        "label": "Let's try again",
        "duration": 3.0,
        "group": "Encouragement",
        "sample": 1.7,
    },
    {
        "id": "F3",
        "label": "Reset and ready",
        "duration": 3.5,
        "group": "Encouragement",
        "sample": 0.95,
    },
]
DESCRIPTIONS = {
    "neutral": "A relaxed smile and four grounded paws.",
    "Q1": "A gentle four-second breathing loop.",
    "Q2": "Close, pause, then softly open both eyes.",
    "Q3-left": "A curious glance towards the left shoulder.",
    "Q3-right": "The same curious gesture towards the other side.",
    "Q4": "Glance aside, then attend to you.",
    "Q5-left": "A small lift and flick, with a softly lagging tip.",
    "Q5-right": "A little flick of the other floppy ear.",
    "Q6": "Shift weight, scratch twice, then put the paw down.",
    "MIN1": "A cheerful wag from base to softly trailing tip.",
    "MIN2": "Lower the chest, wag, then rise with paws planted.",
    "MIN3": "Crouch, hop, land softly and settle.",
    "MAJ1": "Look back and take little steps in a full circle.",
    "MAJ2": "A generous airborne flip with a soft four-paw landing.",
    "MAJ3": "Spring tall, unfold both ears and give a happy shimmy.",
    "F1": "Share a brief oh moment, then brighten and reassure.",
    "F2": "A sympathetic tilt, then a smile and a gentle nod.",
    "F3": "Exhale and blink, then lift and give an encouraging wag.",
}


def wag(rig, time, strength, frequency=2):
    """Swing the curved tail with a phase delay down its three segments."""
    for index, amplitude in enumerate((26, 13, 9)):
        rotate(
            rig,
            f"tail.{index}",
            (
                0,
                0,
                amplitude
                * strength
                * math.sin(2 * math.pi * frequency * time - index * 0.32),
            ),
        )


def orient(rig, name, direction):
    """Aim an ear segment in world space without twisting its cross section."""
    bpy.context.view_layer.update()
    bone = rig.pose.bones[name]
    rotation = bone.matrix.to_quaternion()
    delta = (rotation @ Vector((0, 1, 0))).rotation_difference(
        Vector(direction).normalized()
    )
    bone.rotation_euler = (rotation.inverted() @ delta @ rotation).to_euler("XYZ")
    bpy.context.view_layer.update()


def tall_ears(rig, controls):
    """Capture the tested unfolded ear pose as local rotations for smooth blending."""
    quiet_pose(rig, controls, "neutral", 0)
    result = {}
    for suffix, sign in (("L", 1), ("R", -1)):
        for index, direction in enumerate(
            (
                (sign * 0.17, -0.03, 0.35),
                (sign * 0.06, 0, 0.37),
                (sign * 0.15, -0.12, 0.23),
            )
        ):
            name = f"ear.{index}.{suffix}"
            orient(rig, name, direction)
            result[name] = rig.pose.bones[name].rotation_euler.to_quaternion().copy()
    return result


def chase_root(time):
    """Return a continuous circular root path with eased acceleration and stopping."""
    angle = 2 * math.pi * smooth((time - 1.0) / 2.55)
    return angle, Vector((0.12 * math.sin(angle), 0.12 * (1 - math.cos(angle)), 0))


def chase_paw(rig, name, time):
    """Plant each diagonal pair between short swings, including fixed paw heading."""
    phase = 0 if name in ("front.L", "hind.R") else 0.14
    first = 1.0 + phase
    rest = rig.data.bones["IK." + name].head_local.copy()
    if time < first:
        return rest, 0.0, True
    cycle = min(9, math.floor((time - first) / 0.28))
    start, end = first + cycle * 0.28, first + cycle * 0.28 + 0.14
    previous_landing = first + (cycle - 1) * 0.28 + 0.14 if cycle else 0
    old_angle, old_root = chase_root(previous_landing)
    new_angle, new_root = chase_root(end)
    old = old_root + Quaternion((0, 0, 1), old_angle) @ rest
    new = new_root + Quaternion((0, 0, 1), new_angle) @ rest
    if time >= end:
        return new, new_angle, True
    fraction = max(0, min(1, (time - start) / 0.14))
    amount = smooth(fraction)
    target = old.lerp(new, amount)
    target.z += 0.14 * math.sin(math.pi * fraction) ** 2
    return target, old_angle + (new_angle - old_angle) * amount, fraction in (0, 1)


def pose(rig, controls, clip, time, ear_rotations):
    """Choreograph every proposed reaction while retaining neutral entry and recovery."""
    quiet_pose(rig, controls, clip, time)
    if clip == "Q1":
        move(rig, "chest", (0, 0, 0.025 * math.sin(math.pi * time / 4) ** 2))
    if clip.startswith("Q5"):
        suffix, sign = ("L", 1) if clip.endswith("left") else ("R", -1)
        lift = envelope(time, 0, 0.2, 0.4, 1.3)
        flick = envelope(time, 0.2, 0.3, 0.35, 0.6)
        lag = envelope(time, 0.1, 0.35, 0.45, 1.3)
        settle = (
            math.sin(13 * max(0, time - 0.4)) * math.exp(-5 * max(0, time - 0.4)) * lag
        )
        rotate(rig, "ear.0." + suffix, (0, 0, sign * (10 * lift + 3 * flick)))
        rotate(rig, "ear.1." + suffix, (0, 0, -sign * (5 * lag + 3 * flick)))
        rotate(rig, "ear.2." + suffix, (0, 0, sign * (4 * lag + 2 * settle)))
    elif clip == "Q6":
        support = envelope(time, 0, 0.8, 3.5, 4.5)
        lift = envelope(time, 0.8, 1.5, 2.7, 3.5)
        move(rig, "pelvis", (-0.06 * support, -0.15 * support, -0.2 * support))
        move(rig, "chest", (0, 0.26 * support, -0.2 * support))
        rotate_world(rig, "neck", (0, 0, 1), 55 * support)
        rotate_world(rig, "head", (0, 1, 0), 20 * support)
        stroke = math.sin(4 * math.pi * max(0, min(1, (time - 1.5) / 1.2)))
        ear_give = 2 * stroke * envelope(time, 1.4, 1.5, 2.6, 2.7)
        rotate(rig, "ear.2.L", (0, 0, ear_give))
        bpy.context.view_layer.update()
        ear = points(bpy.data.objects["Left floppy ear"])
        contact = sum(ear[192:208], Vector()) / 16
        rest = rig.data.bones["IK.hind.L"].head_local
        target = contact + Vector((0.16, 0.085, 0.03 + 0.035 * stroke))
        move(rig, "IK.hind.L", (target - rest) * lift)
        rotate(rig, "tail.0", (0, 0, -10 * support))
        rotate(rig, "tail.1", (0, 0, -6 * support))
    elif clip == "MIN1":
        wag(rig, time - 0.4, envelope(time, 0, 0.4, 1.8, 2.4))
    elif clip == "MIN2":
        bow = envelope(time, 0, 0.7, 1.6, 2.6)
        move(rig, "chest", (0, -0.05 * bow, -0.24 * bow))
        rotate(rig, "spine", (12 * bow, 0, 0))
        rotate(rig, "neck", (18 * bow, 0, 0))
        wag(rig, time - 0.7, 0.6 * envelope(time, 0.5, 0.7, 1.5, 1.8))
        rig.pose.bones["tail.0"].rotation_euler.x = math.radians(-12 * bow)
    elif clip in ("MIN3", "MAJ2"):
        flip = clip == "MAJ2"
        launch, land, crouch_end, stable, duration = (
            (0.85, 1.7, 0.6, 2.2, 3.5) if flip else (0.75, 1.15, 0.5, 1.6, 2.5)
        )
        u = max(0, min(1, (time - launch) / (land - launch)))
        # A ballistic arc keeps downward acceleration constant through touchdown.
        # Both heights use roughly 14 rig units/s²; poses share the shorter flight.
        flight = 4 * u * (1 - u)
        compression = (0.24 if flip else 0.2) * envelope(
            time, 0, crouch_end, crouch_end, launch
        )
        compression += (0.2 if flip else 0.14) * envelope(
            time, land, land + 0.2, stable, duration
        )
        # Ease the tuck independently so limbs extend smoothly before landing.
        tuck = math.sin(math.pi * u) ** 2
        move(rig, "pelvis", (0, 0, -compression - (0.18 if flip else 0.08) * tuck))
        for name in LEGS:
            move(rig, "IK." + name, (0, 0, (0.26 if flip else 0.10) * tuck))
        if flip:
            angle = -2 * math.pi * smooth(u)
            pivot = Vector((0, 0.1, 1.3))
            translation = (
                pivot
                - Quaternion((1, 0, 0), angle) @ pivot
                + Vector((0, 0, 1.3 * flight))
            )
            move(rig, "root", translation)
            rotate(rig, "root", (math.degrees(angle), 0, 0))
            rotate(rig, "neck", (10 * tuck, 0, 0))
        else:
            move(rig, "root", (0, 0, 0.28 * flight))
            rotate(rig, "neck", (5 * compression, 0, 0))
        for suffix in ("L", "R"):
            follow = envelope(time, launch - 0.1, launch + 0.15, land, duration)
            bounce = math.sin(max(0, time - land) * 13) * math.exp(
                -max(0, time - land) * 6
            )
            rotate(rig, "ear.0." + suffix, (-7 * follow, 0, 0))
            rotate(rig, "ear.1." + suffix, (9 * follow + 4 * bounce * follow, 0, 0))
            rotate(rig, "ear.2." + suffix, (-6 * follow, 0, 0))
        rotate(rig, "tail.0", (-8 * tuck, 0, 0))
        rotate(rig, "tail.1", (6 * tuck, 0, 0))
    elif clip == "MAJ1":
        attention = envelope(time, 0, 0.6, 3.4, 4.5)
        turn, travel = chase_root(time)
        move(rig, "root", travel)
        rotate(rig, "root", (0, math.degrees(turn), 0))
        move(rig, "pelvis", (0, 0, -0.14 * attention))
        rotate_world(rig, "spine", (0, 0, 1), 8 * attention)
        rotate_world(rig, "neck", (0, 0, 1), 26 * attention)
        rotate_world(rig, "head", (0, 0, 1), 20 * attention)
        rotate(rig, "tail.0", (0, 0, 28 * attention))
        rotate(rig, "tail.1", (0, 0, 18 * attention))
        rotate(rig, "tail.2", (0, 0, 12 * attention))
        for name in LEGS:
            target, heading, _ = chase_paw(rig, name, time)
            local_target = Quaternion((0, 0, 1), -turn) @ (target - travel)
            move(
                rig,
                "IK." + name,
                local_target - rig.data.bones["IK." + name].head_local,
            )
            rotate_world(rig, "IK." + name, (0, 0, 1), math.degrees(heading - turn))
    elif clip == "MAJ3":
        anticipate = envelope(time, 0, 0.3, 0.3, 0.7)
        tall = envelope(time, 0.3, 0.7, 1.4, 3.2)
        move(rig, "pelvis", (0, 0, 0.055 * tall - 0.04 * anticipate))
        rotate(rig, "head", (5 * anticipate - 6 * tall, 0, 0))
        shimmy = (
            0.018
            * math.sin(4 * math.pi * max(0, min(1, (time - 1.4) / 0.8)))
            * envelope(time, 1.4, 1.5, 2.1, 2.2)
        )
        move(rig, "chest", (shimmy, 0, 0))
        move(rig, "pelvis", (-shimmy, 0, 0.055 * tall - 0.04 * anticipate))
        for name, rotation in ear_rotations.items():
            lag = envelope(
                time, 0.33 + int(name[4]) * 0.035, 0.75 + int(name[4]) * 0.035, 1.4, 3.2
            )
            bone = rig.pose.bones[name]
            bone.rotation_euler = Quaternion().slerp(rotation, lag).to_euler("XYZ")
            # A small delayed tip bounce softens the unfolded silhouette during the shimmy.
            bounce = math.sin(13 * max(0, time - 1.4)) * envelope(
                time, 1.4, 1.5, 2.1, 3.2
            )
            bone.rotation_euler.x += math.radians(2 * int(name[4]) * bounce)
        for suffix in ("L", "R"):
            rig["BrowRaise." + suffix] = tall
            rig["EyeWide." + suffix] = 0.8 * tall
        rig["SmileBroad"] = tall
        wag(rig, time - 1.4, 0.9 * envelope(time, 1.35, 1.5, 2.1, 2.6), 2.4)
    elif clip in ("F1", "F2", "F3"):
        if clip == "F1":
            sympathy = envelope(time, 0, 0.5, 0.8, 1.5)
            rotate(rig, "head", (12 * sympathy, 0, 0))
            rig["MouthRelax"] = sympathy
            for suffix, sign in (("L", 1), ("R", -1)):
                rig["BrowInner." + suffix] = 0.45 * sympathy
                rig["Blink." + suffix] = 0.12 * sympathy
                rotate(rig, "ear.0." + suffix, (0, 0, -sign * 10 * sympathy))
            wag(rig, time - 1.3, 0.35 * envelope(time, 1.3, 1.5, 2.0, 2.8), 0.7)
            rig.pose.bones["tail.0"].rotation_euler.x = math.radians(15 * sympathy)
        elif clip == "F2":
            sympathy = envelope(time, 0, 0.5, 0.8, 1.4)
            rotate_world(rig, "head", (0, 1, 0), 10 * sympathy)
            nod = 8 * math.sin(math.pi * max(0, min(1, (time - 1.4) / 0.6))) ** 2
            rotate_world(rig, "head", (1, 0, 0), nod)
            rig["MouthRelax"] = sympathy
            rig["BrowRaise.R"] = 0.35 * sympathy
            for suffix in ("L", "R"):
                rig["Blink." + suffix] = 0.1 * sympathy
                rotate(rig, "ear.1." + suffix, (0, 0, 3 * sympathy))
        else:
            exhale = envelope(time, 0, 0.4, 1.2, 2.0)
            move(rig, "chest", (0, 0, -0.022 * exhale))
            rotate(rig, "head", (5 * exhale, 0, 0))
            rig["MouthRelax"] = exhale
            for suffix in ("L", "R"):
                rig["Blink." + suffix] = envelope(time, 0.55, 0.8, 0.95, 1.2)
            wag(rig, time - 2.0, 0.5 * envelope(time, 2.0, 2.1, 2.6, 2.7), 1 / 0.7)
    if clip.startswith(("MIN", "MAJ")):
        duration = next(item["duration"] for item in CLIPS if item["id"] == clip)
        rig["SmileBroad"] = max(
            rig["SmileBroad"], 0.85 * envelope(time, 0, 0.4, duration - 0.6, duration)
        )
    rig.update_tag()
    bpy.context.view_layer.update()


def contacts(rig, clip, time):
    """Identify intended grounded paws, independently of solved IK reach."""
    if clip == "MIN3" and 0.75 < time < 1.15 or clip == "MAJ2" and 0.85 < time < 1.7:
        return []
    if clip == "Q6" and 0.8 < time < 3.5:
        return [name for name in LEGS if name != "hind.L"]
    if clip == "MAJ1":
        return [name for name in LEGS if chase_paw(rig, name, time)[2]]
    return list(LEGS)


def main():
    """Build, measure, bake and optionally render the complete editable draft library."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=HERE / "library")
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args(
        sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    )
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(HERE / "rig/puppy-rig.blend"))
    scene, rig, body = (
        bpy.context.scene,
        bpy.data.objects["Puppy rig"],
        bpy.data.objects["Puppy body"],
    )
    # Strengthen only the library's breath and smile shapes; preserve original rig assets.
    for obj in scene.objects:
        keys = getattr(obj.data, "shape_keys", None)
        if not keys:
            continue
        for name, strength in (("Breath", 3.5), ("SmileBroad", 1.8)):
            shape = keys.key_blocks.get(name)
            if shape:
                for basis, point in zip(keys.key_blocks[0].data, shape.data):
                    point.co = basis.co + (point.co - basis.co) * strength
    rig.animation_data_clear()
    scene.timeline_markers.clear()
    controls = [key for key, value in rig.items() if isinstance(value, float)]
    ears = tall_ears(rig, controls)
    quiet_pose(rig, controls, "neutral", 0)
    neutral = points(body)
    soles = {}
    for name in LEGS:
        group = body.vertex_groups["paw." + name].index
        soles[name] = [
            v.index
            for v in body.data.vertices
            if v.co.z < 0.045
            and any(g.group == group and g.weight > 0.99 for g in v.groups)
        ]
        assert len(soles[name]) > 10
    scene.name, scene.frame_start, scene.render.fps = "PUPPY_ANIMATION_LIBRARY", 1, FPS
    scene["review_status"] = (
        "Full proposed library: authored drafts; device and final visual review pending."
    )
    frame, reports, clips = 1, [], []
    for specification in CLIPS:
        clip = dict(
            specification,
            description=DESCRIPTIONS[specification["id"]],
            startFrame=frame,
            endFrame=frame + round(specification["duration"] * FPS),
        )
        scene.timeline_markers.new(clip["id"] + " · " + clip["label"], frame=frame)
        measured = {
            "id": clip["id"],
            "maximum_contact_drift": 0,
            "maximum_ik_error": 0,
            "minimum_floor_clearance": 10,
            "minimum_airborne_clearance": 10,
            "maximum_height": 0,
            "maximum_radius": 0,
        }
        previous_contacts, previous_points = [], None
        for step in range(round(clip["duration"] * FPS) + 1):
            time = step / FPS
            pose(rig, controls, clip["id"], time, ears)
            for bone in rig.pose.bones:
                for channel in ("location", "rotation_euler", "scale"):
                    bone.keyframe_insert(channel, frame=frame + step, group=bone.name)
            for control in controls:
                rig.keyframe_insert(
                    '["' + control + '"]', frame=frame + step, group="Facial controls"
                )
            posed = points(body)
            assert all(math.isfinite(value) for point in posed for value in point)
            low = min(point.z for point in posed)
            measured["minimum_floor_clearance"] = min(
                measured["minimum_floor_clearance"], low
            )
            assert low > -0.02, (clip["id"], time, "Floor penetration", low)
            planted = contacts(rig, clip["id"], time)
            if not planted:
                measured["minimum_airborne_clearance"] = min(
                    measured["minimum_airborne_clearance"], low
                )
                assert low > 0, (clip["id"], time, "Airborne floor clearance", low)
            for name in LEGS:
                error = (
                    rig.pose.bones["paw." + name].head
                    - rig.pose.bones["IK." + name].head
                ).length
                measured["maximum_ik_error"] = max(measured["maximum_ik_error"], error)
                assert error < 0.025, (
                    clip["id"],
                    time,
                    name,
                    "IK target out of reach",
                    error,
                )
            for name in planted:
                reference = previous_points if clip["id"] == "MAJ1" else neutral
                if reference is not None and (
                    clip["id"] != "MAJ1" or name in previous_contacts
                ):
                    drift = max(
                        (posed[index] - reference[index]).length
                        for index in soles[name]
                    )
                    measured["maximum_contact_drift"] = max(
                        measured["maximum_contact_drift"], drift
                    )
                    assert drift < 0.003, (
                        clip["id"],
                        time,
                        name,
                        "Contact sliding",
                        drift,
                    )
            previous_contacts, previous_points = planted, posed
            silhouette = (
                posed
                + points(bpy.data.objects["Left floppy ear"])
                + points(bpy.data.objects["Right floppy ear"])
                + points(bpy.data.objects["Tapered tail"])
            )
            measured["maximum_height"] = max(
                measured["maximum_height"], max(point.z for point in silhouette)
            )
            measured["maximum_radius"] = max(
                measured["maximum_radius"],
                max(math.hypot(point.x, point.y) for point in silhouette),
            )
        clip["stageHeight"], clip["stageRadius"] = (
            measured["maximum_height"],
            measured["maximum_radius"],
        )
        if measured["minimum_airborne_clearance"] == 10:
            measured["minimum_airborne_clearance"] = None
        reports.append(measured)
        clips.append(clip)
        frame = clip["endFrame"] + 2
        print("AUTHORED", json.dumps(measured), flush=True)
    # Dense linear keys match the portable sampler, including fast wags and rotations.
    action = rig.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = "LINEAR"
    scene.frame_end = frame - 2
    rig.animation_data.action.name = "Complete puppy library · editable drafts"
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(
        filepath=str(output / "puppy-library.blend"), compress=True
    )
    bpy.ops.wm.open_mainfile(filepath=str(output / "puppy-library.blend"))
    export_rig(
        output / "timeline.glb",
        bpy.data.collections["Puppy — rigged character"],
        bpy.data.objects["Puppy rig"],
    )
    split_clips(output / "timeline.glb", output / "puppy-library.glb", clips, FPS)
    (output / "timeline.glb").unlink()
    (output / "clips.json").write_text(
        json.dumps(clips, indent=2, ensure_ascii=False) + "\n"
    )
    report = {
        "passed": True,
        "fps": FPS,
        "clips": reports,
        "glb_bytes": (output / "puppy-library.glb").stat().st_size,
    }
    (output / "authoring-validation.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    if args.render:
        scene = bpy.context.scene
        scene.render.engine, scene.cycles.samples = "CYCLES", 24
        scene.render.resolution_x = scene.render.resolution_y = 512
        scene.render.threads_mode, scene.render.threads = "FIXED", 6
        for clip in clips:
            if "sample" not in clip:
                continue
            scene.frame_set(clip["startFrame"] + round(clip["sample"] * FPS))
            target = Vector((0, 0, clip["stageHeight"] / 2))
            scene.camera.data.ortho_scale = max(4.5, clip["stageHeight"] + 0.9)
            views = (
                {"hero": (4, -6, 3.3), "front": (0, -7, 2.8), "side": (7, 0, 2.6)}
                if clip["id"] in ("Q6", "MIN2", "MIN3", "MAJ1", "MAJ2", "MAJ3")
                else {"hero": (4, -6, 3.3)}
            )
            for view, location in views.items():
                scene.camera.location = location
                scene.camera.rotation_euler = (
                    (target - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
                )
                scene.render.filepath = str(output / f"{clip['id']}-{view}.png")
                bpy.ops.render.render(write_still=True)
    print("LIBRARY_VALIDATION", json.dumps(report))


if __name__ == "__main__":
    main()
