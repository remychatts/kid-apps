#!/usr/bin/env python3
"""Check kitten grounding, eye enclosure, closed shells and GLB round-trip.

Usage: blender -b --disable-autoexec -t 2 --python characters/kitten/validate_kitten.py
Writes validation.json beside the source; leaves the model and GLB unchanged.
"""
import bpy, bmesh, json, math, argparse, sys, struct
from pathlib import Path
from mathutils import Vector
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--asset-dir',type=Path,default=Path(__file__).resolve().parent)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
root=args.asset_dir
bpy.ops.wm.open_mainfile(filepath=str(root/'kitten.blend'),use_scripts=False)
col=bpy.data.collections['Kitten | neutral design']
report={'source_meshes':len(col.objects),'closed_parts':{},'paw_min_z':{},'eye_normals':{}}
for obj in col.objects:
    assert obj.type=='MESH', obj.name
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co), obj.name
    if obj.name.startswith(('Ear ', 'Tail ')):
        bm=bmesh.new();bm.from_mesh(obj.data)
        report['closed_parts'][obj.name]={'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)}
        assert all(e.is_manifold for e in bm.edges),obj.name
        assert bm.calc_volume(signed=True)>0,obj.name
        bm.free()
    if obj.name.startswith(('Forepaw','Hind paw')):
        bottom=min((obj.matrix_world@v.co).z for v in obj.data.vertices)
        assert abs(bottom)<0.00001,(obj.name,bottom)
        report['paw_min_z'][obj.name]=bottom
    if obj.name.startswith(('Eye ivory','Pupil')):
        ny=sum(p.normal.y for p in obj.data.polygons)/len(obj.data.polygons)
        report['eye_normals'][obj.name]=ny
        assert ny<0,obj.name
head=bpy.data.objects['Head | continuous sculpt']
inv=head.matrix_world.inverted()
boundary_count=0; max_edge_gap=0; max_bulge=0
for obj in col.objects:
    if not obj.name.startswith('Eye ivory'):continue
    side=-1 if '-1' in obj.name else 1
    for vertex in obj.data.vertices:
        point=obj.matrix_world@vertex.co
        hit,loc,_,_=head.ray_cast(inv@Vector((point.x,-4,point.z)),Vector((0,1,0)))
        assert hit, (obj.name,tuple(point))
        gap=(head.matrix_world@loc).y-point.y
        assert gap>=-0.0001,(obj.name,gap)
        max_bulge=max(max_bulge,gap)
        radial=math.sqrt(((point.x-side*0.48)/0.337)**2+((point.z-2.43)/0.411)**2)
        if radial>0.98:
            boundary_count+=1
            max_edge_gap=max(max_edge_gap,gap)
assert boundary_count>=128 and max_edge_gap<0.006
assert max_bulge<0.08
report['eye_integration']={'perimeter_vertices':boundary_count,'maximum_edge_gap':max_edge_gap,'maximum_eye_bulge':max_bulge}
body=bpy.data.objects['Body | seated torso and limbs']
tail=bpy.data.objects['Tail | curled with cream tip']
root_points=[tail.matrix_world@v.co for v in list(tail.data.vertices)[:24]]
centre=sum(root_points,Vector())/len(root_points)
assert abs(centre.x)<0.000001,tuple(centre)
for point in root_points:
    local=body.matrix_world.inverted()@Vector((point.x,-4,point.z))
    hit,front,_,_=body.ray_cast(local,Vector((0,1,0)))
    hit2,back,_,_=body.ray_cast(body.matrix_world.inverted()@Vector((point.x,4,point.z)),Vector((0,-1,0)))
    assert hit and hit2 and (body.matrix_world@front).y < point.y < (body.matrix_world@back).y
report['tail_attachment']={'root_centre':list(centre),'root_vertices_inside_torso':len(root_points),'centred_on_x':True}
images=[i for i in bpy.data.images if i.name.startswith('Ginger coat |')]
assert len(images)==2 and all(i.packed_file for i in images)
report['coat']={'packed_maps':len(images),'resolution':list(images[0].size),'source':'Original procedural ginger fur, baked to PNG colour and normal maps'}
raw=(root/'kitten.glb').read_bytes()
length,kind=struct.unpack_from('<II',raw,12)
gltf=json.loads(raw[20:20+length])
assert len(gltf.get('images',[]))==2
assert any('normalTexture' in material for material in gltf['materials'])
assert not gltf.get('skins') and not gltf.get('animations')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'kitten.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)==report['source_meshes']
assert not any(o.type in {'CAMERA','LIGHT','ARMATURE'} for o in bpy.context.scene.objects)
assert not bpy.data.actions
report['glb_round_trip']={'meshes':len(meshes),'armatures':0,'actions':0,'studio_objects':0,'min_z':min((o.matrix_world@v.co).z for o in meshes for v in o.data.vertices)}
(root/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('VALIDATION',json.dumps(report))
