#!/usr/bin/env python3
"""Measure and render the kitten animation draft in its editable authoring scene.

blender --background --disable-autoexec --threads 6 --python-exit-code 1 --python characters/kitten/validate_library.py
"""
import json
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

HERE=Path(__file__).resolve().parent/'library'
bpy.ops.wm.open_mainfile(filepath=str(HERE/'kitten-library.blend'))
scene=bpy.context.scene
rig=bpy.data.objects['Kitten rig']
meshes=[o for o in rig.users_collection[0].objects if o.type=='MESH']
clips=json.loads((HERE/'clips.json').read_text())
# Every independently moving limb and the newly exposed torso must be closed.
for obj in meshes:
    if not obj.name.startswith(('Body', 'Foreleg')):
        continue
    mesh=bmesh.new()
    mesh.from_mesh(obj.data)
    assert all(edge.is_manifold for edge in mesh.edges), (obj.name, 'Open surface')
    assert mesh.calc_volume(signed=True)>0, (obj.name, 'Inverted surface')
    mesh.free()
report=[]
for clip in clips:
    low=100; ik_error=0
    for step in range(0,round(clip['duration']*30)+1,3):
        scene.frame_set(clip['startFrame']+step)
        deps=bpy.context.evaluated_depsgraph_get()
        for obj in meshes:
            evaluated=obj.evaluated_get(deps)
            low=min(low,min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices))
        for name in ('front.L','front.R','hind.L','hind.R'):
            ik_error=max(ik_error,(rig.pose.bones['paw.'+name].head-rig.pose.bones['IK.'+name].head).length)
    assert low > -.015, (clip['id'], 'Floor penetration', low)
    assert ik_error < .003, (clip['id'], 'Unreachable paw target', ik_error)
    report.append(dict(id=clip['id'],minimum_height=low,maximum_ik_error=ik_error))
    print('MEASURED',report[-1],flush=True)
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising=False
scene.render.resolution_x=scene.render.resolution_y=480
scene.render.resolution_percentage=100
for id,time in [('neutral',0),('Q2',.4),('Q3-left',1),('Q3-right',1),('Q6',2.1),('MIN2',1),('MAJ2',1.275),('MAJ3',1.1)]:
    clip=next(c for c in clips if c['id']==id)
    scene.frame_set(clip['startFrame']+round(time*30))
    target=Vector((0,0,clip['stageHeight']/2))
    scene.camera.location=(4,-6,3.3)
    scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera.data.ortho_scale=max(4.5,clip['stageHeight']+.8)
    scene.render.filepath=str(HERE/(id+'-hero.png'))
    bpy.ops.render.render(write_still=True)
