#!/usr/bin/env python3
"""Author the original seated kitten, export a static GLB and render review views.

Usage: blender -b --factory-startup -t 6 --python characters/kitten/create_kitten.py
Quick draft: append -- --views front hero --resolution 640 --samples 32
This is a neutral design draft; deformation topology and animation come later.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--views', nargs='+', default=['front', 'hero', 'side', 'rear'])
parser.add_argument('--resolution', type=int, default=1000)
parser.add_argument('--samples', type=int, default=96)
parser.add_argument('--no-texture', action='store_true', help='Skip baking for geometry previews')
parser.add_argument('--texture-size', type=int, default=2048)
parser.add_argument('--no-render', action='store_true', help='Build and save without rendering')
parser.add_argument('--output-dir', type=Path, default=Path(__file__).resolve().parent)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = args.output_dir.resolve()
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
character = bpy.data.collections.new('Kitten | neutral design')
scene.collection.children.link(character)


def material(name, colour, roughness=0.5, painted=False):
    """Make an opaque Principled material with optional exportable vertex colours."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Roughness'].default_value = roughness
    if painted:
        attr = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Coat'
        mat.node_tree.links.new(attr.outputs['Color'], shader.inputs['Base Color'])
    return mat


GINGER = (0.50, 0.135, 0.012)
CREAM = (1.0, 0.79, 0.43)
coat = material('Ginger and vanilla | vertex colour', GINGER, 0.52, True)
cream = material('Vanilla muzzle and whiskers', CREAM, 0.55)
rim = material('Warm umber eye edging', (0.16, 0.042, 0.012), 0.48)
white = material('Warm ivory sclera', (0.97, 0.91, 0.72), 0.3)
blue = material('Ocean blue iris', (0.018, 0.29, 0.42), 0.28)
blue_edge = material('Deep teal limbal ring', (0.009, 0.105, 0.15), 0.32)
pupil = material('Glossy midnight pupils', (0.004, 0.008, 0.009), 0.18)
nose_mat = material('Terracotta nose', (0.30, 0.059, 0.024), 0.32)
mouth_mat = material('Soft cocoa smile', (0.17, 0.043, 0.014), 0.55)
brow_mat = material('Ginger brows', (0.30, 0.081, 0.012), 0.6)
glint = material('Eye catchlights', (1, 1, 0.94), 0.23)
toe_mat = material('Soft amber toe creases', (0.55, 0.32, 0.12), 0.7)


def put(obj, name, mat):
    """Place a named smooth object in the character collection."""
    obj.name = name
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    character.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def mesh_obj(name, verts, faces, mat):
    """Create smooth editable geometry from explicit vertices and faces."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    character.objects.link(obj)
    return put(obj, name, mat)


def oval(name, centre, scale, mat, segments=64, rings=40):
    """Create an ellipsoid with applied scale."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=centre)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return put(obj, name, mat)


def smoothstep(a, b, value):
    """Interpolate a soft colour boundary."""
    t = max(0, min(1, (value-a)/(b-a)))
    return t*t*(3-2*t)


def mix(a, b, t):
    """Blend two linear RGB colours."""
    return tuple(x*(1-t)+y*t for x, y in zip(a, b))


def paint(obj, fn):
    """Assign per-vertex colour for seamless markings and GLB portability."""
    attr = obj.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for v, value in zip(obj.data.vertices, attr.data):
        colour=fn(obj.matrix_world @ v.co)
        fur_weight=max(0,min(1,(CREAM[1]-colour[1])/(CREAM[1]-GINGER[1])))
        value.color = (*colour, fur_weight)


def curve(name, points, radius, mat, radii=None):
    """Create a tapered Bezier stroke as exportable mesh."""
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 3
    data.use_fill_caps = True
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for i, (bp, pos) in enumerate(zip(spline.bezier_points, points)):
        bp.co = pos
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
        bp.radius = radii[i] if radii else 1
    obj = bpy.data.objects.new(name, data)
    character.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return put(bpy.context.object, name, mat)


def fuse(parts, name, voxel=0.028):
    """Voxel-union overlapping sculpt volumes and soften their junctions."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    mod = obj.modifiers.new('Sculpt union', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Smooth sculpt', 'SMOOTH')
    mod.factor = 1.0
    mod.iterations = 6
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Review mesh reduction', 'DECIMATE')
    mod.ratio = 0.48
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


# Broad cheeks, a gently flattened facial plane and softly pointed cheek tufts.
head = oval('Head | sculpted cheek silhouette', (0, 0, 2.39), (1.12, 0.79, 0.94), coat, 128, 96)
for v in head.data.vertices:
    z = v.co.z / 0.94
    v.co.x *= 1 + 0.10*math.exp(-((z+0.42)/0.28)**2)
    if v.co.y < 0:
        v.co.y = -0.84 * (-v.co.y/0.79)**0.76
parts = [head]
for side in (-1, 1):
    tuft = oval('Cheek silhouette', (side*1.00, 0.01, 2.12), (0.24, 0.37, 0.16), coat)
    tuft.rotation_euler.y = side*0.25
    parts.append(tuft)
head = fuse(parts, 'Head | continuous sculpt', 0.022)
bpy.context.view_layer.update()
# Sculpt the eyelids directly into the face instead of adding eye backing discs.
for vertex in head.data.vertices:
    p = head.matrix_world @ vertex.co
    if p.y < -0.30:
        for side in (-1, 1):
            r = math.sqrt(((p.x-side*0.48)/0.337)**2+((p.z-2.43)/0.411)**2)
            vertex.co.y -= 0.037*math.exp(-((r-1.04)/0.16)**2)
head.data.update()
bpy.context.view_layer.update()


def face_front(x, z, surfaces=None):
    """Find the front of the sculpt so details sit against the actual skin."""
    hits=[]
    for surface in surfaces or [head]:
        hit, loc, _, _=surface.ray_cast(surface.matrix_world.inverted() @ Vector((x,-4,z)),Vector((0,1,0)))
        if hit:
            hits.append((surface.matrix_world @ loc).y)
    if not hits:
        raise RuntimeError(f'Facial projection missed at {x}, {z}')
    return min(hits)


def eye_position(side, dx, dz, offset=0):
    """Make a shallow eye dome that wraps around the head and meets its eyelid."""
    r2=(dx/0.337)**2+(dz/0.411)**2
    x,z=side*0.48+dx,2.43+dz
    y=face_front(x,z)-0.075*max(0,1-r2)**2-0.003-offset
    return Vector((x,y,z))


def head_colour(p):
    """Paint cream lower cheeks, a narrow blaze and subtle ginger forehead stripes."""
    front = 1-smoothstep(-0.25, 0.14, p.y)
    boundary = 2.09 - 0.20*(abs(p.x)/1.1)**1.5
    lower = 1-smoothstep(boundary-0.045, boundary+0.045, p.z)
    blaze_width = 0.035 + 0.24*(1-smoothstep(2.02, 2.65, p.z))
    blaze = (1-smoothstep(blaze_width-0.015, blaze_width+0.025, abs(p.x))) * (1-smoothstep(2.65, 2.84, p.z))
    base = GINGER
    for side in (-1, 0, 1):
        stripe_x = side*(0.20+0.15*(p.z-2.8))
        stripe = math.exp(-((p.x-stripe_x)/0.055)**2) * smoothstep(2.62, 2.88, p.z) * (1-smoothstep(3.15, 3.30, p.z))
        base = mix(base, (0.25, 0.05, 0.004), stripe*front*0.42)
    return mix(base, CREAM, max(lower, blaze)*front)


paint(head, head_colour)
# Planted forelegs, plump haunches and little cream socks.
parts = [oval('Torso', (0, 0.20, 0.86), (0.55, 0.48, 0.77), coat),
         oval('Neck', (0, 0.03, 1.37), (0.39, 0.36, 0.43), coat)]
for side in (-1, 1):
    parts.append(oval('Seated haunch', (side*0.49, 0.22, 0.45), (0.38, 0.43, 0.44), coat))
    arm = oval('Foreleg', (side*0.33, -0.29, 0.69), (0.215, 0.24, 0.64), coat)
    arm.rotation_euler.y = -side*0.115
    parts.append(arm)
body = fuse(parts, 'Body | seated torso and limbs')
bpy.context.view_layer.update()


def body_colour(p):
    """Paint the tapered chest bib and softly blended cream forefeet."""
    width = 0.09+0.24*smoothstep(0.5, 1.12, p.z)
    bib = (1-smoothstep(width-0.04, width+0.025, abs(p.x))) * smoothstep(0.44, 0.66, p.z) * (1-smoothstep(-0.14, 0.0, p.y))
    socks = (1-smoothstep(0.23, 0.33, p.z)) * (1-smoothstep(-0.14, 0.0, p.y))
    stripe=(0.5+0.5*math.sin(p.z*19+0.8*math.sin(p.y*7)))**10
    flank=smoothstep(0.25,0.5,abs(p.x))
    base=mix(GINGER,(0.26,0.055,0.004),0.22*stripe*flank)
    return mix(base, CREAM, max(bib, socks))


paint(body, body_colour)
for side in (-1, 1):
    for is_front in (True, False):
        cx, cy = (side*0.365, -0.43) if is_front else (side*0.70, 0.02)
        paw = oval(('Forepaw' if is_front else 'Hind paw')+f' {side}', (cx, cy, 0.155), (0.235, 0.30 if is_front else 0.25, 0.185), cream)
        for v in paw.data.vertices:
            v.co.z = max(-0.155, v.co.z)
        for offset in (-0.072, 0.072):
            curve('Soft toe crease', [(cx+offset, cy-0.268 if is_front else cy-0.223, 0.07),
                                     (cx+offset, cy-0.278 if is_front else cy-0.23, 0.14),
                                     (cx+offset, cy-0.225 if is_front else cy-0.18, 0.24)], 0.006, toe_mat, [0.2, 0.7, 0.05])


def catmull(points, steps=8, closed=False):
    """Sample a soft interpolating centreline or closed outline."""
    pts = [Vector(p) for p in points]
    result = []
    count = len(pts) if closed else len(pts)-1
    for i in range(count):
        a = pts[(i-1)%len(pts)] if closed or i else pts[0]
        b, c = pts[i], pts[(i+1)%len(pts)]
        d = pts[(i+2)%len(pts)] if closed or i+2<len(pts) else pts[-1]
        for j in range(steps):
            t = j/steps
            result.append(0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3))
    if not closed:
        result.append(pts[-1])
    return result


def ear(side):
    """Create a rounded triangular ear shell with a recessed peach interior."""
    outline = catmull([(0.47, 2.88), (0.72, 3.28), (1.09, 3.67), (1.20, 3.65),
                       (1.28, 3.30), (1.22, 2.82), (0.89, 2.72)], 10, True)
    centre = Vector((0.94, 3.14))
    verts, faces, colours = [], [], []
    rings, around = 15, len(outline)
    for back in (False, True):
        for i in range(rings+1):
            r = max(0.001, i/rings)
            for pt in outline:
                pos = centre.lerp(pt, r)
                y = (0.045+0.13*(1-r*r)) if back else (-0.095-0.13*math.exp(-((r-0.81)/0.19)**2))
                verts.append((side*pos.x, y, pos.y))
                pink = mix((0.64, 0.15, 0.075), (0.94, 0.39, 0.20), 1-r)
                colour=GINGER if back else mix(pink, GINGER, smoothstep(0.66, 0.83, r))
                colours.append((*colour, 1 if back else smoothstep(0.66,0.83,r)))
    layer = (rings+1)*around
    for back in (0, 1):
        for i in range(rings):
            for j in range(around):
                a = back*layer+i*around+j
                b = back*layer+i*around+(j+1)%around
                f = (a, b, b+around, a+around)
                faces.append(f if (side==1)==(back==0) else tuple(reversed(f)))
        cap = tuple(back*layer+j for j in range(around))
        faces.append(cap if (side==1)==(back==1) else tuple(reversed(cap)))
    for j in range(around):
        a, b = rings*around+j, rings*around+(j+1)%around
        f = (a, b, b+layer, a+layer)
        faces.append(f if side==1 else tuple(reversed(f)))
    obj = mesh_obj(f'Ear {side} | rounded shell', verts, faces, coat)
    attr = obj.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for value, colour in zip(attr.data, colours):
        value.color = colour
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Soft ear edges', 'SUBSURF')
    mod.levels=1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


for side in (-1, 1):
    ear(side)
# Crown tuft is continuous swept geometry with tips, not separate end balls.
for i, pts in enumerate([[(0,0.0,3.21),(0.045,0.0,3.35),(0.15,0.015,3.40)],
                         [(0.10,0.04,3.22),(0.19,0.035,3.32),(0.28,0.04,3.32)]]):
    tuft = curve(f'Crown tuft {i}', pts, 0.10, coat, [1,0.65,0.02])
    paint(tuft, lambda p: GINGER)


def eye_cap(name, side, radius, offset, mat):
    """Lay a concentric iris or pupil patch on the curved eye surface."""
    verts, faces = [], []
    rings, around = 12, 64
    for i in range(rings+1):
        r = max(0.0001, radius*i/rings)
        for j in range(around):
            a = math.tau*j/around
            dx, dz = 0.337*r*math.cos(a), 0.411*r*math.sin(a)
            verts.append(eye_position(side, dx, dz, offset))
    for i in range(rings):
        for j in range(around):
            a, b = i*around+j, i*around+(j+1)%around
            faces.append((a+around, b+around, b, a))
    faces.append(tuple(range(around)))
    return mesh_obj(name, verts, faces, mat)


for side in (-1, 1):
    eye_cap(f'Eye ivory {side}', side, 0.995, 0, white)
    eye_cap(f'Iris outer ring {side}', side, 0.83, 0.0015, blue_edge)
    eye_cap(f'Blue iris {side}', side, 0.78, 0.003, blue)
    eye_cap(f'Pupil {side}', side, 0.615, 0.0045, pupil)
    # Small geometric highlights keep the expression legible in unlit review tools.
    for dx, dz, size in [(-0.075, 0.145, 0.044), (0.095, -0.16, 0.016)]:
        pos=eye_position(side,dx,dz,0.012)
        oval(f'Eye glint {side}', pos, (size,0.009,size*1.08),glint,24,16)

# Two softly merged whisker pads and a rounded triangular nose.
muzzle = fuse([oval('Muzzle L',(-0.145,-0.807,2.015),(0.22,0.215,0.175),cream),
               oval('Muzzle R',(0.145,-0.807,2.015),(0.22,0.215,0.175),cream)], 'Muzzle | paired cream pads', 0.014)
nose = oval('Nose | rounded triangle', (0,-1.012,2.155), (0.142,0.075,0.095), nose_mat,64,40)
for v in nose.data.vertices:
    t=(v.co.z/0.095+1)/2
    v.co.x *= 0.25+0.90*t
curve('Philtrum',[(0,-1.04,2.10),(0,-1.031,2.01),(0,-1.018,1.975)],0.012,mouth_mat,[0.65,0.8,0.8])
for side in (-1,1):
    points=[]
    for x,z in [(0,1.975),(0.10,1.936),(0.20,1.958),(0.28,2.015),(0.315,2.065)]:
        x*=side
        points.append((x,face_front(x,z,[head,muzzle])-0.007,z))
    curve(f'Relaxed smile {side}',points,0.012,mouth_mat,[0.8,1,0.9,0.65,0.03])
    # Project brows onto the head to keep them attached around its curvature.
    points=[]
    inv=head.matrix_world.inverted()
    for i in range(9):
        t=i/8
        x=side*(0.31+0.39*t)
        z=2.975+0.065*math.sin(math.pi*t)-0.015*t
        hit, loc, normal, index=head.ray_cast(inv @ Vector((x,-3,z)),Vector((0,1,0)))
        if not hit:
            raise RuntimeError('Brow missed head')
        p=head.matrix_world @ loc
        points.append((x,p.y+0.006,z))
    curve(f'Attached brow {side}',points,0.025,brow_mat,[0.1,0.65,0.95,1,0.95,0.8,0.6,0.35,0.02])
    for i in range(3):
        z=2.02-i*0.055
        curve(f'Whisker {side}.{i}',[(side*0.29,-0.965,z),(side*0.66,-0.95,z+0.045-i*0.035),(side*(1.22-i*0.02),-0.86,z+0.07-i*0.13)],0.008,cream,[0.75,0.65,0.015])

# A closed, softly curled tail sweeping to the kitten's right (image left).
path = catmull([(0,0.38,0.62),(0,0.65,0.60),(0,0.83,0.55),(-0.32,0.96,0.43),(-0.72,0.82,0.33),(-1.02,0.55,0.38),(-1.22,0.36,0.60),(-1.24,0.24,0.83),(-1.19,0.18,0.95)],12)
verts, faces = [], []
around=24
for i,p in enumerate(path):
    t=i/(len(path)-1)
    tangent=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
    u=tangent.cross(Vector((0,0,1))).normalized()
    v=tangent.cross(u).normalized()
    radius=0.145*(1-0.20*t)*math.sqrt(max(0.0004,1-t**10))
    for j in range(around):
        a=math.tau*j/around
        verts.append(p+radius*(u*math.cos(a)+v*math.sin(a)))
for i in range(len(path)-1):
    for j in range(around):
        a,b=i*around+j,i*around+(j+1)%around
        faces.append((a,b,b+around,a+around))
faces.append(tuple(reversed(range(around))))
faces.append(tuple((len(path)-1)*around+j for j in range(around)))
tail=mesh_obj('Tail | curled with cream tip',verts,faces,coat)
tail['root_centre']=[0,0.38,0.62]
tail['root_rings']=24
paint(tail,lambda p: mix(GINGER,CREAM,smoothstep(0.69,0.82,p.z)))

texture_stats=None
if not args.no_texture:
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    from coat_material import finish_coat
    texture_stats=finish_coat(character,coat,OUT,args.texture_size)

scene['review_status']='Revised neutral kitten: centred tail, integrated eyes, lifted smile, textured ginger coat. Static; unrigged.'
scene['character_axes']='Forward -Y, up Z, soles Z=0, matching the puppy source.'
bpy.ops.object.select_all(action='DESELECT')
for obj in character.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitten.glb'),export_format='GLB',use_selection=True,export_animations=False)
stats={'vertices':sum(len(o.data.vertices) for o in character.objects),
       'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in character.objects),
       'mesh_objects':len(character.objects),'materials':len({m.name for o in character.objects for m in o.data.materials}),
       'textures':texture_stats,'rigged':False,'animations':0,'stage':'neutral design draft; retopology and rigging deferred'}
(OUT/'mesh-stats.json').write_text(json.dumps(stats,indent=2)+'\n')

# Studio lighting is saved for editing, but omitted from the character export.
studio=bpy.data.collections.new('Studio | excluded from GLB')
scene.collection.children.link(studio)


def studio_object(obj):
    """Move non-character objects into the studio collection."""
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    studio.objects.link(obj)
    return obj


def aim(obj, target):
    """Point a camera or light at the subject."""
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def light(name, location, energy, size, colour):
    """Create a soft studio light."""
    bpy.ops.object.light_add(type='AREA',location=location)
    obj=studio_object(bpy.context.object)
    obj.name=name
    obj.data.energy=energy
    obj.data.shape='DISK'
    obj.data.size=size
    obj.data.color=colour
    aim(obj,(0,0,1.8))


bpy.ops.mesh.primitive_plane_add(size=200)
floor=studio_object(bpy.context.object)
floor.name='Warm ivory studio floor'
floor.location.z=-0.012
floor_mat=material('Studio ivory',(0.84,0.79,0.68),0.8)
floor_shader=floor_mat.node_tree.nodes.get('Principled BSDF')
floor_shader.inputs['Emission Color'].default_value=(0.84,0.79,0.68,1)
floor_shader.inputs['Emission Strength'].default_value=0.65
floor.data.materials.append(floor_mat)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.82,0.87,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=0.45
light('Large warm key',(-3.8,-4.5,6.5),500,4,(1,0.88,0.73))
light('Cool soft fill',(4,-3,4.5),330,3.5,(0.78,0.88,1))
light('Golden rim',(0,3.5,6),350,3,(1,0.9,0.75))
bpy.ops.object.camera_add()
cam=studio_object(bpy.context.object)
cam.name='Kitten review camera'
cam.data.type='ORTHO'
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=args.samples
scene.cycles.use_denoising=False
scene.render.resolution_x=args.resolution
scene.render.resolution_y=args.resolution
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
views={'front':(0,-9,3.0),'hero':(3.6,-8,3.45),'side':(8,0,2.8),'rear':(3,8,3.4)}
for name in args.views:
    cam.location=views[name]
    cam.data.ortho_scale=4.42
    aim(cam,(0,0,1.85))
    scene.render.filepath=str(OUT/f'preview-{name}.png')
    if name==args.views[0]:
        # Open the blend with a clean material-colour view, ready to orbit.
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type=='VIEW_3D':
                    area.spaces.active.region_3d.view_perspective='CAMERA'
                    area.spaces.active.shading.type='MATERIAL'
        bpy.ops.object.select_all(action='DESELECT')
        head.select_set(True)
        bpy.context.view_layer.objects.active=head
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitten.blend'))
    if not args.no_render:
        bpy.ops.render.render(write_still=True)
print('KITTEN_STATS',json.dumps(stats))
