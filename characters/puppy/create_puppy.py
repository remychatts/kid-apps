#!/usr/bin/env python3
"""Build the original static puppy and render review views; no rig or animation.

Usage: blender --background --factory-startup --python characters/puppy/create_puppy.py
Outputs beside this script: puppy.blend, puppy.glb, preview-*.png, mesh-stats.json.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
character = bpy.data.collections.new('Puppy — static review mesh')
bpy.context.scene.collection.children.link(character)


def material(name, colour, roughness=0.65):
    """Create a plain, glTF-compatible surface."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def put(obj, name, mat):
    """Name a smooth mesh and move it into the character collection."""
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    character.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def oval(name, centre, scale, mat, segments=24, rings=16):
    """Create a scaled smooth ellipsoid with applied transforms."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=centre)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return put(obj, name, mat)


def tube(name, points, radius, mat):
    """Create a rounded curve and convert it to exportable mesh geometry."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return put(bpy.context.object, name, mat)


def merge_surface(parts):
    """Fuse the body forms into a continuous static surface, then simplify it."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = 'Body and head — continuous static surface'
    remesh = obj.modifiers.new('Union rounded forms', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = 0.045
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new('Soften joins', 'SMOOTH')
    smooth.factor = 1.25
    smooth.iterations = 7
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    dec = obj.modifiers.new('Static mesh reduction', 'DECIMATE')
    dec.ratio = 0.32
    bpy.ops.object.modifier_apply(modifier=dec.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def ear(side, mat):
    """Build a floppy tapered ear with a rounded tip and an outward fold."""
    vertices, faces = [], []
    count, around = 17, 16
    for i in range(count):
        t = i/(count-1)
        width = max(0.012, 0.255 * math.sin(math.pi*t)**0.65)
        depth = max(0.012, 0.125 * math.sin(math.pi*t)**0.65)
        x = side*(0.57 + 0.28*math.sin(t*math.pi*0.7))
        y = -0.62 - 0.08*t
        z = 2.57 - 1.12*t
        for j in range(around):
            a = j*math.tau/around
            vertices.append((x+width*math.cos(a), y+depth*math.sin(a), z))
    for i in range(count-1):
        for j in range(around):
            a=i*around+j
            b=i*around+(j+1)%around
            faces.append((a,b,b+around,a+around))
    faces.append(tuple(reversed(range(around))))
    faces.append(tuple((count-1)*around+j for j in range(around)))
    mesh=bpy.data.meshes.new('Floppy ear mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj=bpy.data.objects.new(('Left' if side>0 else 'Right')+' floppy ear', mesh)
    bpy.context.collection.objects.link(obj)
    put(obj, obj.name, mat)
    return obj


tan = material('Biscuit tan', (0.63, 0.32, 0.125))
cream = material('Warm cream', (0.94, 0.81, 0.59))
ear_mat = material('Toffee ears', (0.29, 0.105, 0.042))
dark = material('Cocoa nose and mouth', (0.047, 0.022, 0.016), 0.36)
eye_mat = material('Deep brown eyes', (0.021, 0.014, 0.011), 0.21)
white = material('Ivory eye whites', (0.98, 0.96, 0.88), 0.35)

parts = [oval('Torso', (0,0.35,1.04), (0.57,0.96,0.60),tan),
         oval('Chest', (0,-0.32,1.19), (0.53,0.55,0.65),tan),
         oval('Neck', (0,-0.51,1.58), (0.43,0.43,0.56),tan),
         oval('Head', (0,-0.72,2.10), (0.72,0.65,0.69),tan,32,24)]
for side in (-1,1):
    for label,y in [('Front',-0.40),('Hind',0.94)]:
        parts.append(oval(label+' leg', (side*0.40,y,0.57), (0.225,0.245,0.55),tan))
        parts.append(oval(label+' paw', (side*0.40,y-0.115,0.19), (0.28,0.35,0.19),tan))
body=merge_surface(parts)
# Set the common sole plane exactly at zero after smoothing.
base=min((body.matrix_world@v.co).z for v in body.data.vertices)
for v in body.data.vertices:
    v.co.z -= base

for side in (-1,1):
    ear(side,ear_mat)
    oval('Cream muzzle '+str(side), (side*0.205,-1.30,1.88), (0.305,0.255,0.235),cream)
    oval('Eye white '+str(side), (side*0.315,-1.285,2.255), (0.204,0.115,0.247),white)
    oval('Eye pupil '+str(side), (side*0.307,-1.385,2.25), (0.128,0.060,0.173),eye_mat)
    oval('Eye catchlight '+str(side), (side*0.307-0.033,-1.442,2.314), (0.037,0.015,0.046),white,16,12)
    oval('Eyebrow '+str(side), (side*0.335,-1.21,2.535), (0.15,0.065,0.047),tan)

oval('Lower muzzle', (0,-1.30,1.745), (0.27,0.16,0.095),cream)
nose=oval('Soft triangular nose', (0,-1.53,1.985), (0.19,0.12,0.125),dark)
for v in nose.data.vertices:
    v.co.x *= 0.78 + 0.22*(v.co.z/0.125)
tube('Mouth centre', [(0,-1.553,1.925),(0,-1.556,1.85)],0.013,dark)
for side in (-1,1):
    tube('Relaxed smile '+str(side), [(0,-1.553,1.85),(side*0.095,-1.548,1.815),(side*0.18,-1.52,1.855)],0.013,dark)
# The tail is still geometry only: no controls, bones or animation.
tail=tube('Gently lifted tail', [(0,1.11,1.22),(0,1.48,1.42),(0,1.67,1.76),(0,1.63,1.95)],0.13,tan)
oval('Rounded tail tip',(0,1.63,1.95),(0.14,0.14,0.16),tan)

scene=bpy.context.scene
scene['review_status']='Static design review only; not rigged or animated.'
scene['character_forward']='-Y in Blender; Z up; paws on Z=0.'
# Export only the puppy; studio objects are added afterwards.
bpy.ops.object.select_all(action='DESELECT')
for obj in character.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'puppy.glb'),export_format='GLB',use_selection=True,export_animations=False)
stats={'vertices':sum(len(o.data.vertices) for o in character.objects),
       'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in character.objects),
       'mesh_objects':len(character.objects),'materials':len({m.name for o in character.objects for m in o.data.materials}),
       'rigged':False,'animations':0,'stage':'static design review; retopology needed before deformation'}
(OUT/'mesh-stats.json').write_text(json.dumps(stats,indent=2)+'\n')

floor_mat=material('Studio warm grey',(0.74,0.78,0.77))
bpy.ops.mesh.primitive_plane_add(size=200)
floor=bpy.context.object
floor.name='Studio floor — not exported'
floor.location.z=-0.012
floor.data.materials.append(floor_mat)
world=scene.world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(0.74,0.80,0.86,1)
world.node_tree.nodes['Background'].inputs[1].default_value=0.35


def aim(obj, target):
    """Point the camera or light towards the model."""
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def light(name, position, power, size):
    """Add a broad studio light for soft readable surfaces."""
    bpy.ops.object.light_add(type='AREA',location=position)
    obj=bpy.context.object
    obj.name=name
    obj.data.energy=power
    obj.data.shape='DISK'
    obj.data.size=size
    aim(obj,(0,0,1.3))

light('Key softbox',(-3,-4,7),650,5)
light('Fill softbox',(4,-1,4),350,4)
light('Rim softbox',(1,4,6),550,3)
bpy.ops.object.camera_add(location=(4,-6,3.3))
cam=bpy.context.object
cam.name='Review camera'
cam.data.type='ORTHO'
cam.data.ortho_scale=4.25
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=64
scene.cycles.use_denoising=False
scene.render.resolution_x=960
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
views={'hero':(4,-6,3.3),'front':(0,-7,2.8),'side':(7,0,2.6),'rear':(4,6,3.2)}
for name,position in views.items():
    cam.location=position
    aim(cam,(0,0,1.4))
    scene.render.filepath=str(OUT/f'preview-{name}.png')
    if name=='hero':
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'puppy.blend'))
    bpy.ops.render.render(write_still=True)
print('PUPPY_STATS',json.dumps(stats))
