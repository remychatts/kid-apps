#!/usr/bin/env python3
"""Bake the open puppy authoring scene to a portable, self-contained diagnostic GLB.

blender --background --disable-autoexec characters/puppy/rig/puppy-rig.blend --python-exit-code 1 --python characters/puppy/export_rig.py -- --output /tmp/puppy-rig.glb
Uses the scene frame range and active actions. Does not save changes to the .blend.
"""
import argparse
import sys
from pathlib import Path

import bpy


def export_rig(output, collection, rig):
    """Sample live IK and facial drivers, then export baked bones and morph weights."""
    scene = bpy.context.scene
    # Sample all evaluated transforms/morphs BEFORE removing constraints or drivers.
    baked = []
    for frame in range(scene.frame_start, scene.frame_end+1):
        scene.frame_set(frame)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = rig.evaluated_get(depsgraph)
        matrices = {p.name: p.matrix.copy() for p in evaluated.pose.bones}
        values = {obj.name: {k.name: k.value for k in obj.evaluated_get(depsgraph).data.shape_keys.key_blocks}
                  for obj in collection.objects if obj.type == 'MESH' and obj.data.shape_keys}
        baked.append((frame, matrices, values))
    rig.animation_data_clear()
    for p in rig.pose.bones:
        for constraint in list(p.constraints):
            p.constraints.remove(constraint)
    for obj in collection.objects:
        if obj.type == 'MESH' and obj.data.shape_keys:
            obj.data.shape_keys.animation_data_clear()
    for frame, matrices, values in baked:
        for p in rig.pose.bones:  # Bone insertion order is parent-before-child.
            p.matrix = matrices[p.name]
            bpy.context.view_layer.update()
            for channel in ('location', 'rotation_euler', 'scale'):
                p.keyframe_insert(channel, frame=frame, group=p.name)
        for name, keys in values.items():
            for key, value in keys.items():
                if key != 'Basis':
                    k = bpy.data.objects[name].data.shape_keys.key_blocks[key]
                    k.value = value
                    k.keyframe_insert('value', frame=frame)
    rig.animation_data.action.name = 'RIG_DIAGNOSTICS'
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='SCENE',
                              export_frame_range=True, export_force_sampling=True,
                              export_anim_scene_split_object=False, export_morph=True,
                              export_def_bones=False, export_extras=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    export_rig(args.output, bpy.data.collections['Puppy — rigged character'], bpy.data.objects['Puppy rig'])
