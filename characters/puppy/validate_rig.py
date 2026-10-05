#!/usr/bin/env python3
"""Validate weights, contacts, face ranges and the baked GLB against the live rig.

blender --background --factory-startup --threads 6 --python characters/puppy/validate_rig.py
Append -- --rig-dir /tmp/puppy-rig to check an alternative generated asset.
Writes rig-validation.json beside the rig; assertion failures exit non-zero with --python-exit-code 1.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--rig-dir', type=Path, default=Path(__file__).resolve().parent / 'rig')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT = args.rig_dir.resolve()
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'puppy-rig.blend'))
scene = bpy.context.scene
rig = bpy.data.objects['Puppy rig']
body = bpy.data.objects['Puppy body']
meshes = [o for o in bpy.data.collections['Puppy — rigged character'].objects if o.type == 'MESH']
report = {}


def points(obj):
    """Read final deformed mesh vertices in world space."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    result = [evaluated.matrix_world @ v.co for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return result


def distance(a, b):
    """Measure symmetric nearest-surface-vertex error despite GLB vertex splitting."""
    def one_way(source, target):
        """Find the greatest nearest-neighbour distance for one direction."""
        tree = KDTree(len(target))
        for i, point in enumerate(target):
            tree.insert(point, i)
        tree.balance()
        return max(tree.find(point)[2] for point in source)
    return max(one_way(a, b), one_way(b, a))


assert len(rig.data.bones) == 31
assert sum(b.use_deform for b in rig.data.bones) == 26
for obj in meshes:
    assert any(m.type == 'ARMATURE' and m.object == rig for m in obj.modifiers)
    for v in obj.data.vertices:
        assert 1 <= len(v.groups) <= 4, (obj.name, v.index, 'influence count')
        assert abs(sum(g.weight for g in v.groups)-1) < 1e-5
        assert all(rig.data.bones[obj.vertex_groups[g.group].name].use_deform for g in v.groups)
report['weighted_vertices'] = sum(len(o.data.vertices) for o in meshes)
report['maximum_influences'] = 4
report['body_quad_fraction'] = sum(len(p.vertices) == 4 for p in body.data.polygons)/len(body.data.polygons)
assert report['body_quad_fraction'] > .95

# Rigid sole samples must stay at the same world position through planted gestures.
scene.frame_set(1)
neutral = points(body)
report['neutral_lowest_point'] = min(p.z for p in neutral)
assert abs(report['neutral_lowest_point']) < .01, 'Neutral paws are not grounded'
soles = [v.index for v in body.data.vertices if v.co.z < .045]
assert len(soles) > 20
report['sole_samples'] = len(soles)
max_drift = 0
for frame in (16, 46, 76, 106, 136, 166):
    scene.frame_set(frame)
    posed = points(body)
    assert min(p.z for p in posed) > -.015, (frame, 'Body penetrates floor')
    drift = max((posed[i]-neutral[i]).length for i in soles)
    max_drift = max(max_drift, drift)
    assert drift < .012, (frame, 'paw sliding', drift)
    for name in ('front.L', 'front.R', 'hind.L', 'hind.R'):
        pose = rig.pose.bones['paw.'+name]
        target = rig.pose.bones['IK.'+name]
        assert (pose.head-target.head).length < .012, (frame, name, 'IK reach')
report['maximum_planted_sole_drift'] = max_drift
scene.frame_set(226)
scratch = points(body)
support = [i for i in soles if not (neutral[i].x > 0 and neutral[i].y > .25)]
report['scratch_support_drift'] = max((scratch[i]-neutral[i]).length for i in support)
assert report['scratch_support_drift'] < .012
paw_group = body.vertex_groups['paw.hind.L'].index
paw = [scratch[v.index] for v in body.data.vertices if any(g.group == paw_group and g.weight > .9 for g in v.groups)]
ear = points(bpy.data.objects['Left floppy ear'])
report['scratch_paw_ear_distance'] = min((a-b).length for a in paw for b in ear)
assert report['scratch_paw_ear_distance'] < .06, 'Raised paw cannot reach ear'
scene.frame_set(136)
report['tall_ear_root_embedding'] = {}
for name in ('Left floppy ear', 'Right floppy ear'):
    ear_points = points(bpy.data.objects[name])
    assert max(p.z for p in ear_points) > 3.3, 'Ear fails tall silhouette'
    centre = sum(ear_points[:16], Vector())/16
    evaluated_body = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    hit, closest, normal, _ = evaluated_body.closest_point_on_mesh(centre)
    depth = -(centre-closest).dot(normal)
    assert hit and depth > .005, 'Tall ear root is detached from skull'
    report['tall_ear_root_embedding'][name] = depth


# Snapshot representative authoring poses for a fresh-import comparison.
frames = (1, 8, 16, 46, 76, 106, 136, 166, 196, 226, 256, 286, 301)
reference = {}
for frame in frames:
    scene.frame_set(frame)
    reference[frame] = {o.name: points(o) for o in meshes}
    assert all(math.isfinite(c) for ps in reference[frame].values() for p in ps for c in p)
    if frame in (196, 286):
        assert min(p.z for ps in reference[frame].values() for p in ps) > .1

# Exercise bounded face controls between keys, including conflicting slider inputs.
scene.frame_set(1)
rig.animation_data_clear()
for p in rig.pose.bones:
    p.location = (0, 0, 0)
    p.rotation_euler = (0, 0, 0)
    p.scale = (1, 1, 1)
controls = [k for k in rig.keys() if isinstance(rig[k], float)]
for key in controls:
    rig[key] = 0.0
bpy.context.view_layer.update()
minimum_brow_gap = float('inf')
minimum_brow_embedding = 1.0
for side, suffix in ((1, 'L'), (-1, 'R')):
    brow = bpy.data.objects['Surface brow '+str(side)]
    count = brow['front_vertices']
    for raise_value, inner_value in [(a, b) for a in (0, .25, .5, .75, 1) for b in (0, .25, .5, .75, 1)]:
        rig['BrowRaise.'+suffix], rig['BrowInner.'+suffix] = raise_value, inner_value
        rig.update_tag()
        bpy.context.view_layer.update()
        ps = points(brow)
        for front, back in zip(ps[:count], ps[count:]):
            hit, surface, _, _ = body.ray_cast(Vector((front.x, -5, front.z)), Vector((0, 1, 0)))
            assert hit
            minimum_brow_gap = min(minimum_brow_gap, surface.y-front.y)
            assert surface.y-front.y > .025, 'Brow face intersects forehead'
            embedded_fraction = (back.y-surface.y)/(back.y-front.y)
            minimum_brow_embedding = min(minimum_brow_embedding, embedded_fraction)
            assert embedded_fraction > .60, 'Brow must retain a majority of buried depth'
            hit, rear, _, _ = body.ray_cast(Vector((back.x, 5, back.z)), Vector((0, -1, 0)))
            assert hit and back.y < rear.y, ('Brow back exits skull', suffix,raise_value,inner_value,tuple(back),tuple(rear))
        # Check front quad centres as well as corners.
        for face in list(brow.data.polygons)[:brow['front_faces']]:
            centre = sum((ps[i] for i in face.vertices), Vector())/len(face.vertices)
            hit, surface, _, _ = body.ray_cast(Vector((centre.x, -5, centre.z)), Vector((0, 1, 0)))
            assert hit and surface.y-centre.y > .02
    rig['BrowRaise.'+suffix] = rig['BrowInner.'+suffix] = 0
    # The stationary whites remain embedded; gaze stays inside the visible ellipsoid.
    for point in points(bpy.data.objects['Embedded eye white '+str(side)]):
        if point.y >= -1.245-1e-6:
            hit, front, _, _ = body.ray_cast(Vector((point.x, -5, point.z)), Vector((0, 1, 0)))
            rear_hit, rear, _, _ = body.ray_cast(Vector((point.x, 5, point.z)), Vector((0, -1, 0)))
            assert hit and rear_hit and front.y < point.y < rear.y, 'Eye back exposed'
    gaze_names = ['Gaze'+direction+'.'+suffix for direction in ('Left', 'Right', 'Up', 'Down')]
    for active in gaze_names+['all']:
        for name in gaze_names:
            rig[name] = float(active == name or active == 'all')
        rig.update_tag()
        bpy.context.view_layer.update()
        for point in points(bpy.data.objects['Eye pupil '+str(side)]):
            radius = ((point.x-side*.255)/.19)**2+((point.z-2.43)/.28)**2
            assert radius < .99, 'Pupil exits eye outline'
    for name in gaze_names:
        rig[name] = 0.0
    # Upper/lower spherical shells must stay outside the eyeball at partial closure.
    for value in (0, .25, .5, .75, 1):
        rig['Blink.'+suffix] = value
        rig.update_tag()
        bpy.context.view_layer.update()
        for prefix in ('Upper', 'Lower'):
            for point in points(bpy.data.objects[prefix+' lid.'+suffix]):
                radius = ((point.x-side*.255)/.19)**2+((point.y+1.245)/.18)**2+((point.z-2.43)/.28)**2
                assert radius > 1.015, (suffix, value, 'Lid cuts into eyeball', radius)
    # At closure the two rims overlap around the whole eye.
    upper = points(bpy.data.objects['Upper lid.'+suffix])[-48:]
    lower = points(bpy.data.objects['Lower lid.'+suffix])[-48:]
    assert all(a.z < b.z for a, b in zip(upper, lower)), 'Blink seam is open'
    rig['Blink.'+suffix] = 0
report['minimum_brow_front_clearance'] = minimum_brow_gap
report['minimum_brow_embedded_fraction'] = minimum_brow_embedding
report['face_range_checks'] = 'brow vertices and face centres; full and intermediate eyelid closure'

# Check the portable asset's structure, not just its file extension.
blob = (OUT / 'puppy-rig.glb').read_bytes()
magic, version, length = struct.unpack_from('<4sII', blob)
assert magic == b'glTF' and version == 2 and length == len(blob)
chunk_size = struct.unpack_from('<I', blob, 12)[0]
gltf = json.loads(blob[20:20+chunk_size])
assert len(gltf['skins']) == 1 and len(gltf['skins'][0]['joints']) == 31
assert len(gltf['animations']) == 1
assert not gltf.get('cameras') and not gltf.get('images')
assert all('Studio' not in n.get('name', '') for n in gltf['nodes'])
assert any(c['target']['path'] == 'weights' for c in gltf['animations'][0]['channels'])
assert any(c['target']['path'] == 'rotation' for c in gltf['animations'][0]['channels'])
report['export_animation'] = gltf['animations'][0]['name']
report['glb_bytes'] = len(blob)
mesh_names = {node['name']: gltf['meshes'][node['mesh']]['name'] for node in gltf['nodes'] if 'mesh' in node}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(OUT / 'puppy-rig.glb'))
maximum_error = 0
for frame, objects in reference.items():
    bpy.context.scene.frame_set(frame)
    for name, original in objects.items():
        obj = next((o for o in bpy.data.objects if o.type == 'MESH' and o.data.name == mesh_names[name]), None)
        assert obj is not None, ('Missing exported mesh', name)
        error = distance(original, points(obj))
        maximum_error = max(maximum_error, error)
        assert error < .002, (frame, name, 'GLB deformation mismatch', error)
report['round_trip_frames'] = list(frames)
report['maximum_round_trip_vertex_error'] = maximum_error
report['passed'] = True
(OUT / 'rig-validation.json').write_text(json.dumps(report, indent=2)+'\n')
print('RIG_VALIDATION', json.dumps(report))
