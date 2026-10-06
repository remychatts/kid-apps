#!/usr/bin/env python3
"""Build the puppy authoring rig, baked diagnostic GLB and optional pose renders.

blender --background --factory-startup --threads 6 --python characters/puppy/rig_puppy.py
Append -- --render to render review poses, or -- --output-dir /tmp/puppy-rig.
The static puppy.blend is the input and is never overwritten.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Quaternion

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', type=Path, default=HERE / 'rig')
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = args.output_dir.resolve()
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE / 'puppy.blend'))
scene = bpy.context.scene
scene.name = 'RIG_DIAGNOSTICS'
scene.render.fps = 30
scene.render.resolution_x = scene.render.resolution_y = 640
scene.cycles.samples = 24
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 6
scene['review_status'] = 'Rig prototype: diagnostic poses, not production animation clips.'
collection = bpy.data.collections['Puppy — static review mesh']
collection.name = 'Puppy — rigged character'
body = bpy.data.objects['Body and head — continuous static surface']
body.name = 'Puppy body'
# Resample the decimated sculpt into a uniform quad surface, then project back.
reference = body.copy()
reference.data = body.data.copy()
scene.collection.objects.link(reference)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
remesh = body.modifiers.new('Uniform deformation surface', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = 0.055
bpy.ops.object.modifier_apply(modifier=remesh.name)
relax = body.modifiers.new('Relax deformation grid', 'SMOOTH')
relax.factor = 0.7
relax.iterations = 3
bpy.ops.object.modifier_apply(modifier=relax.name)
project = body.modifiers.new('Preserve reviewed silhouette', 'SHRINKWRAP')
project.target = reference
project.wrap_method = 'NEAREST_SURFACEPOINT'
bpy.ops.object.modifier_apply(modifier=project.name)
bpy.data.objects.remove(reference, do_unlink=True)
for polygon in body.data.polygons:
    polygon.use_smooth = True
# Put every mesh into the same coordinate space before assigning weights/morphs.
for obj in list(collection.objects):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def smooth(a, b, value):
    """Return a clamped smooth blend between two thresholds."""
    t = max(0.0, min(1.0, (value-a)/(b-a)))
    return t*t*(3-2*t)


def forehead(x, z):
    """Project onto the actual resampled forehead along the depth axis."""
    hit, point, _, _ = body.ray_cast(Vector((x, -5, z)), Vector((0, 1, 0)))
    if not hit:
        raise RuntimeError(f'Forehead projection missed at {x}, {z}')
    return point.y


def brow_depth(x, z, back):
    """Keep both brow layers inside the available curved-skull thickness."""
    front = forehead(x, z)
    hit, rear, _, _ = body.ray_cast(Vector((x, 5, z)), Vector((0, -1, 0)))
    if not hit:
        raise RuntimeError('Brow rear projection missed skull')
    depth = min(.30, rear.y-front-.02)
    return front+(depth if back else -min(.093, depth*.31))


# Bury the narrow ear roots slightly inside the skull, including the tall-ear pose.
for side, label in ((1, 'Left'), (-1, 'Right')):
    for vertex in bpy.data.objects[label+' floppy ear'].data.vertices:
        t = (2.57-vertex.co.z)/1.12
        vertex.co.x -= side*.08*(1-smooth(0, .35, t))


arm = bpy.data.armatures.new('Puppy skeleton')
rig = bpy.data.objects.new('Puppy rig', arm)
collection.objects.link(rig)
rig.show_in_front = True
bpy.context.view_layer.objects.active = rig
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, head, tail, parent=None, deform=True):
    """Add a named bone in character space with explicit parenting."""
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    b.use_deform = deform
    if parent:
        b.parent = arm.edit_bones[parent]
    return b


bone('root', (0, 0, 0), (0, 0, 0.4), deform=False)
bone('pelvis', (0, .9, 1.05), (0, .45, 1.1), 'root')
bone('spine', (0, .45, 1.1), (0, -.1, 1.2), 'pelvis')
bone('chest', (0, -.1, 1.2), (0, -.45, 1.5), 'spine')
bone('neck', (0, -.45, 1.5), (0, -.62, 1.85), 'chest')
bone('head', (0, -.62, 1.85), (0, -.72, 2.5), 'neck')
legs = {}
for side, suffix in ((1, 'L'), (-1, 'R')):
    for label, y in (('front', -.4), ('hind', .94)):
        name = f'{label}.{suffix}'
        hip = (side*.4, y, 1.1)
        knee = (side*.4, y+(.17 if label == 'front' else -.24), .65)
        ankle = (side*.4, y-.03, .22)
        toe = (side*.4, y-.3, .22)
        parent = 'chest' if label == 'front' else 'pelvis'
        bone('upper.'+name, hip, knee, parent)
        bone('lower.'+name, knee, ankle, 'upper.'+name)
        bone('paw.'+name, ankle, toe, 'lower.'+name)
        bone('IK.'+name, ankle, toe, 'root', False)
        # A bent rest chain provides a stable preferred bend without pole flips.
        legs[name] = {'hip': hip, 'knee': knee, 'ankle': ankle, 'toe': toe}
    points = [(side*(.57+.28*math.sin(t*math.pi*.7)-.08*(1-smooth(0, .35, t))), -.62-.08*t, 2.57-1.12*t)
              for t in (0, 1/3, 2/3, 1)]
    for i in range(3):
        bone(f'ear.{i}.{suffix}', points[i], points[i+1], 'head' if i == 0 else f'ear.{i-1}.{suffix}')
points = [(0, 1.08, 1.20), (0, 1.47, 1.39), (0, 1.66, 1.72), (0, 1.61, 2.02)]
for i in range(3):
    bone(f'tail.{i}', points[i], points[i+1], 'pelvis' if i == 0 else f'tail.{i-1}')
bpy.ops.object.mode_set(mode='OBJECT')
controls = arm.collections.new('Pose controls — root, torso, IK, ears, tail')
deforms = arm.collections.new('Legs — solved by paw IK')
for b in arm.bones:
    (deforms if b.name.startswith(('upper.', 'lower.', 'paw.')) else controls).assign(b)
for p in rig.pose.bones:
    p.rotation_mode = 'XYZ'
    p.bone.color.palette = 'THEME04' if p.name.startswith('IK.') else 'THEME03'
for name in legs:
    p = rig.pose.bones['lower.'+name]
    ik = p.constraints.new('IK')
    ik.name = 'Planted paw — bake on export'
    ik.target, ik.subtarget, ik.chain_count = rig, 'IK.'+name, 2
    ik.use_stretch = False
    ik.iterations = 100
    p = rig.pose.bones['paw.'+name]
    orient = p.constraints.new('COPY_ROTATION')
    orient.name = 'Paw orientation'
    orient.target, orient.subtarget = rig, 'IK.'+name
    orient.target_space = orient.owner_space = 'WORLD'


def bind(obj, weights):
    """Bind normalised, maximum-four-influence skin weights to the rig."""
    groups = {}
    for vertex in obj.data.vertices:
        values = {k: v for k, v in weights(vertex).items() if v > 1e-6}
        values = dict(sorted(values.items(), key=lambda pair: pair[1], reverse=True)[:4])
        total = sum(values.values())
        for name, weight in values.items():
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([vertex.index], weight/total, 'REPLACE')
    modifier = obj.modifiers.new('Puppy skin', 'ARMATURE')
    modifier.object = rig
    # Linear blend skinning matches glTF; do not use Blender-only dual quaternions.
    modifier.use_deform_preserve_volume = False
    obj.parent = rig


def body_weights(vertex):
    """Blend torso regions and articulated limbs, preserving rigid head and soles."""
    x, y, z = vertex.co
    head = smooth(1.52, 1.94, z)*(1-smooth(-.15, .30, y))
    neck = smooth(1.25, 1.70, z)*(1-head)*(1-smooth(-.15, .30, y))
    front = 1-smooth(-.05, .8, y)
    torso = {'chest': front, 'pelvis': 1-front}
    # A central spine influence avoids a hard hip/chest seam.
    middle = max(0, 1-abs(y-.35)/.65)*.55
    torso = {k: v*(1-middle) for k, v in torso.items()}
    torso['spine'] = middle
    result = {k: v*(1-head-neck) for k, v in torso.items()}
    result.update(head=head, neck=neck)
    limb = (1-smooth(.76, 1.12, z))*smooth(.10, .28, abs(x))
    if z < .45:
        limb = 1.0
    if limb:
        centre_y = -.4 if y < .25 else .94
        limb *= 1-smooth(.24, .48, abs(y-centre_y))
        limb = 1-(1-limb)*smooth(.24, .45, z)
        name = ('front' if y < .25 else 'hind') + ('.L' if x >= 0 else '.R')
        paw = 1-smooth(.24, .43, z)
        upper = smooth(.50, .81, z)*(1-paw)
        lower = 1-paw-upper
        result = {k: v*(1-limb) for k, v in result.items()}
        result.update({'paw.'+name: paw*limb, 'upper.'+name: upper*limb, 'lower.'+name: lower*limb})
    return result


def chain_weights(t, names):
    """Blend chain segments across their centres with a fixed anchored root."""
    u = max(0, min(2, t*3-.5))
    index = min(1, int(u))
    mix = u-index
    return {names[index]: 1-mix, names[index+1]: mix}


bind(body, body_weights)
for obj in list(collection.objects):
    if obj.type != 'MESH' or obj == body:
        continue
    if 'floppy ear' in obj.name:
        suffix = 'L' if obj.name.startswith('Left') else 'R'
        bind(obj, lambda v, s=suffix: chain_weights((2.57-v.co.z)/1.12, [f'ear.{i}.{s}' for i in range(3)]))
    elif obj.name == 'Tapered tail':
        bind(obj, lambda v: chain_weights(min(v.index//16, 28)/28, [f'tail.{i}' for i in range(3)]))
    else:
        bind(obj, lambda v: {'head': 1})

morphs = {}


def morph(obj, name, deform):
    """Add an exported morph and register its control for diagnostic keyframes."""
    if not obj.data.shape_keys:
        obj.shape_key_add(name='Basis')
    key = obj.shape_key_add(name=name)
    for vertex, point in zip(obj.data.vertices, key.data):
        point.co = deform(vertex.co.copy(), vertex.index)
    morphs.setdefault(name, []).append(key)
    return key


# A small surface-pose grid prevents additive brow morphs leaving the curved skull.
for side, suffix in ((1, 'L'), (-1, 'R')):
    obj = bpy.data.objects['Surface brow '+str(side)]
    count = obj['front_vertices']
    for vertex in obj.data.vertices:
        vertex.co.y = brow_depth(vertex.co.x, vertex.co.z, vertex.index >= count)
    obj.shape_key_add(name='Basis')
    morphs['BrowRaise.'+suffix] = []
    morphs['BrowInner.'+suffix] = []
    for raise_value in (0, .5, 1):
        for inner_value in (0, .5, 1):
            if raise_value == inner_value == 0:
                continue
            key = obj.shape_key_add(name=f'BrowSurface_{raise_value}_{inner_value}.{suffix}')
            for vertex, point in zip(obj.data.vertices, key.data):
                co = vertex.co.copy()
                factor = 1-smooth(.11, .38, abs(co.x))
                co.z += .020*raise_value+.015*inner_value*(1-raise_value)*factor
                co.y = brow_depth(co.x, co.z, vertex.index >= count)
                point.co = co
            driver = key.driver_add('value').driver
            for variable_name, control in [('raised', 'BrowRaise.'+suffix), ('inner', 'BrowInner.'+suffix)]:
                variable = driver.variables.new()
                variable.name, variable.type = variable_name, 'SINGLE_PROP'
                variable.targets[0].id = rig
                variable.targets[0].data_path = '["'+control+'"]'
            driver.expression = (f'max(0,1-abs(2*min(1,max(0,raised))-{2*raise_value}))'
                                 f'*max(0,1-abs(2*min(1,max(0,inner))-{2*inner_value}))')

# Smile is the basis. Relax/delight deform the muzzle and mouth together, avoiding gaps.
for name in ('Broad cream muzzle', 'Relaxed curved mouth'):
    obj = bpy.data.objects[name]
    for label, amount in (('MouthRelax', -.028), ('SmileBroad', .025)):
        def smile(co, index, a=amount):
            """Lift corners and adjacent cheek volume with one shared displacement field."""
            co.z += a*smooth(.035, .25, abs(co.x))*(1-smooth(1.94, 2.17, co.z))
            return co
        morph(obj, label, smile)

# Eye aiming slides pupils along the actual ellipsoid; whites stay enclosed and still.
for side, suffix in ((1, 'L'), (-1, 'R')):
    for prefix in ('Eye pupil ', 'Eye catchlight '):
        obj = bpy.data.objects[prefix+str(side)]
        for label, dx, dz in (('GazeLeft', .032, 0), ('GazeRight', -.032, 0), ('GazeUp', 0, .030), ('GazeDown', 0, -.030)):
            def gaze(co, index, x=dx, z=dz, s=side):
                """Slide on an ellipsoid while preserving each vertex's depth offset."""
                def front(px, pz):
                    """Return the visible eye surface at the requested bounded coordinate."""
                    r = ((px-s*.255)/.19)**2+((pz-2.43)/.28)**2
                    return -1.245-.18*math.sqrt(max(.001, 1-r))
                depth = co.y-front(co.x, co.z)
                co.x += x
                co.z += z
                co.y = front(co.x, co.z)+depth
                return co
            morph(obj, label+'.'+suffix, gaze)
    # Two closed-cap lid meshes envelop whites, pupils and highlights at Blink=1.
    for upper in (True, False):
        vertices, faces = [], []
        rings, segments = 12, 48
        def lid_point(row, column, angle):
            """Evaluate an opaque lid over the eye with an overlapping closure seam."""
            theta = .001+(angle-.001)*row/rings
            if not upper:
                theta = math.pi-theta
            phi = math.tau*column/segments
            return Vector((side*.255+.213*math.sin(theta)*math.cos(phi),
                           -1.245+.204*math.sin(theta)*math.sin(phi),
                           2.43+.302*math.cos(theta)))
        for row in range(rings+1):
            for column in range(segments):
                vertices.append(lid_point(row, column, .38))
        for row in range(rings):
            for column in range(segments):
                a = row*segments+column
                b = row*segments+(column+1)%segments
                faces.append((a+segments, b+segments, b, a) if upper else (a, b, b+segments, a+segments))
        mesh = bpy.data.meshes.new('Eyelid quad surface')
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(('Upper' if upper else 'Lower')+' lid.'+suffix, mesh)
        collection.objects.link(obj)
        mesh.materials.append(bpy.data.materials['Biscuit tan'])
        for p in mesh.polygons:
            p.use_smooth = True
        bind(obj, lambda v: {'head': 1})
        morph(obj, 'Blink.'+suffix, lambda co, i: lid_point(i//segments, i%segments, math.pi/2+.012))
        # Midpoint corrective keeps the interpolating lid outside the eyeball.
        key = obj.shape_key_add(name='LidArcCorrective.'+suffix)
        for i, point in enumerate(key.data):
            base = obj.data.vertices[i].co
            mid = lid_point(i//segments, i%segments, (.38+math.pi/2+.012)/2)
            end = obj.data.shape_keys.key_blocks['Blink.'+suffix].data[i].co
            point.co = base+mid-(base+end)/2
        driver = key.driver_add('value').driver
        variable = driver.variables.new()
        variable.name, variable.type = 'blink', 'SINGLE_PROP'
        variable.targets[0].id = rig
        variable.targets[0].data_path = '["Blink.'+suffix+'"]'
        driver.expression = 'max(0,1-abs(2*min(1,max(0,blink))-1))'
        morph(obj, 'EyeWide.'+suffix, lambda co, i: lid_point(i//segments, i%segments, .12))


# A fine crease makes a fully closed eye readable at small sizes; it is buried at rest.
for side, suffix in ((1, 'L'), (-1, 'R')):
    vertices, faces = [], []
    for row in range(25):
        u = -1+2*row/24
        x = side*.255+.165*u
        z = 2.435+.018*(1-u*u)
        y = -1.245-.204*math.sqrt(1-((x-side*.255)/.213)**2-((z-2.43)/.302)**2)-.006
        for column in range(8):
            angle = math.tau*column/8
            vertices.append((x, y+.3+.004*math.cos(angle), z+.004*math.sin(angle)))
    for row in range(24):
        for column in range(8):
            a = row*8+column
            b = row*8+(column+1)%8
            faces.append((a, b, b+8, a+8))
    mesh = bpy.data.meshes.new('Closed lid crease')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Lid crease.'+suffix, mesh)
    collection.objects.link(obj)
    mesh.materials.append(bpy.data.materials['Toffee ears'])
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    bind(obj, lambda v: {'head': 1})
    obj.shape_key_add(name='Basis')
    key = obj.shape_key_add(name='ClosedCrease.'+suffix)
    for point in key.data:
        point.co.y -= .3
    driver = key.driver_add('value').driver
    variable = driver.variables.new()
    variable.name, variable.type = 'blink', 'SINGLE_PROP'
    variable.targets[0].id = rig
    variable.targets[0].data_path = '["Blink.'+suffix+'"]'
    driver.expression = 'min(1,max(0,blink))**8'


def breath(co, index):
    """Expand the chest by 1.5% with a smooth mask that excludes planted paws."""
    weight = smooth(.55, 1.05, co.z)*(1-smooth(1.45, 1.8, co.z))*(1-smooth(.1, .8, co.y))
    co.x *= 1+.015*weight
    co.y -= .012*weight
    co.z += .012*weight
    return co


morph(body, 'Breath', breath)
# Expose all face controls in one place; baked export samples these drivers explicitly.
for name, keys in morphs.items():
    rig[name] = 0.0
    rig.id_properties_ui(name).update(min=0, max=1, description='Normalised facial control; keyframe on Puppy rig')
    for key in keys:
        driver = key.driver_add('value').driver
        driver.type = 'SCRIPTED'
        var = driver.variables.new()
        var.name, var.type = 'value', 'SINGLE_PROP'
        var.targets[0].id = rig
        var.targets[0].data_path = '["'+name+'"]'
        # Blink and gaze combinations stay inside the explicitly tested range.
        driver.expression = 'min(1,max(0,value))'
        # Normalise additive face channels; arbitrary slider combinations stay bounded.
        partners = []
        if name.startswith('Gaze'):
            partners = [k for k in morphs if k.startswith('Gaze') and k[-1] == name[-1] and k != name]
        elif name in ('MouthRelax', 'SmileBroad'):
            partners = ['SmileBroad' if name == 'MouthRelax' else 'MouthRelax']
        elif name.startswith('EyeWide'):
            partners = ['Blink.'+name[-1]]
        for index, partner in enumerate(partners):
            other = driver.variables.new()
            other.name, other.type = 'p'+str(index), 'SINGLE_PROP'
            other.targets[0].id = rig
            other.targets[0].data_path = '["'+partner+'"]'
        if partners:
            terms = ['min(1,max(0,value))']+['min(1,max(0,p'+str(i)+'))' for i in range(len(partners))]
            driver.expression = terms[0]+'/max(1,'+'+'.join(terms)+')'
            if name.startswith('EyeWide'):
                driver.expression = 'min(1,max(0,value))*(1-min(1,max(0,p0)))'

# A diagnostic action with neutral frames between capability probes, not finished clips.
POSES = {
    1: 'neutral', 16: 'blink', 31: 'neutral', 46: 'curious', 61: 'neutral',
    76: 'bow', 91: 'neutral', 106: 'crouch', 121: 'neutral', 136: 'ears_up',
    151: 'neutral', 166: 'sympathy', 181: 'neutral', 196: 'airborne',
    211: 'neutral', 226: 'scratch_probe', 241: 'neutral', 256: 'turn_probe',
    271: 'neutral', 286: 'flip_clearance', 301: 'neutral',
}


def move(name, offset):
    """Translate a pose bone by an armature-space displacement."""
    rig.pose.bones[name].location = arm.bones[name].matrix_local.to_3x3().inverted() @ Vector(offset)


def rotate(name, xyz):
    """Set a bone's local rotation in degrees."""
    rig.pose.bones[name].rotation_euler = [math.radians(v) for v in xyz]


def rotate_world(name, axis, degrees):
    """Apply a world-axis turn while retaining the existing local rotation."""
    bpy.context.view_layer.update()
    p = rig.pose.bones[name]
    q = p.matrix.to_quaternion()
    local = q.inverted() @ Quaternion(Vector(axis), math.radians(degrees)) @ q
    p.rotation_euler = (p.rotation_euler.to_quaternion() @ local).to_euler('XYZ')
    bpy.context.view_layer.update()


def orient(name, direction):
    """Aim a chain segment in world space without twisting its cross section."""
    bpy.context.view_layer.update()
    p = rig.pose.bones[name]
    rotation = p.matrix.to_quaternion()
    current = rotation @ Vector((0, 1, 0))
    delta = current.rotation_difference(Vector(direction).normalized())
    local = rotation.inverted() @ delta @ rotation
    p.rotation_euler = local.to_euler('XYZ')
    bpy.context.view_layer.update()


def set_pose(label):
    """Set a repeatable static rig probe; no claim of completed animation choreography."""
    for p in rig.pose.bones:
        p.location = (0, 0, 0)
        p.rotation_euler = (0, 0, 0)
        p.scale = (1, 1, 1)
    for name in morphs:
        rig[name] = 0.0
    if label == 'blink':
        rig['Blink.L'] = rig['Blink.R'] = 1
        rig['Breath'] = 1
    elif label == 'curious':
        rotate_world('head', (0, 1, 0), 16)
        rig['BrowRaise.L'] = 1
        rig['GazeLeft.L'] = rig['GazeLeft.R'] = 1
        rotate('ear.0.L', (0, 0, -10))
        rotate('ear.1.L', (0, 0, 8))
        rotate('tail.0', (0, 0, 25))
        rotate('tail.1', (0, 0, 12))
        rotate('tail.2', (0, 0, -8))
    elif label == 'bow':
        move('chest', (0, -.05, -.24))
        rotate('spine', (12, 0, 0))
        rotate('neck', (-14, 0, 0))
        rotate('tail.0', (-12, 0, 15))
    elif label == 'crouch':
        move('pelvis', (0, 0, -.20))
        rotate('neck', (8, 0, 0))
    elif label == 'ears_up':
        move('pelvis', (0, 0, .055))
        for suffix, sign in (('L', 1), ('R', -1)):
            orient('ear.0.'+suffix, (sign*.17, -.03, .35))
            orient('ear.1.'+suffix, (sign*.06, 0, .37))
            orient('ear.2.'+suffix, (sign*.15, -.12, .23))
            rig['BrowRaise.'+suffix] = 1
            rig['EyeWide.'+suffix] = 1
        rig['SmileBroad'] = 1
    elif label == 'sympathy':
        rotate('head', (12, 0, 0))
        rig['MouthRelax'] = 1
        for suffix, sign in (('L', 1), ('R', -1)):
            rig['BrowInner.'+suffix] = 1
            rig['Blink.'+suffix] = .18
            rotate('ear.0.'+suffix, (0, 0, -sign*10))
        rotate('tail.0', (15, 0, 0))
    elif label in ('airborne', 'flip_clearance'):
        move('root', (0, 0, .35 if label == 'airborne' else 3.6))
        move('pelvis', (0, 0, -.12))
        for name in legs:
            move('IK.'+name, (0, 0, .12))
        if label == 'flip_clearance':
            rotate('root', (180, 0, 0))
    elif label == 'scratch_probe':
        move('pelvis', (-.06, -.15, -.20))
        move('chest', (0, .26, -.20))
        rotate_world('neck', (0, 0, 1), 55)
        rotate_world('head', (0, 1, 0), 20)
        ear = bpy.data.objects['Left floppy ear'].evaluated_get(bpy.context.evaluated_depsgraph_get())
        contact = sum((ear.matrix_world @ v.co for v in list(ear.data.vertices)[192:208]), Vector())/16
        target = contact+Vector((.16, .085, .03))
        move('IK.hind.L', target-arm.bones['IK.hind.L'].head_local)
    elif label == 'turn_probe':
        rotate('root', (0, 35, 0))
        rotate('spine', (0, 0, 14))
        rotate('neck', (0, 0, 20))
        move('IK.front.L', (0, -.12, .12))
        move('IK.hind.R', (0, .10, .10))
    rig.update_tag()
    bpy.context.view_layer.update()


scene.frame_start, scene.frame_end = 1, 301
for frame, label in POSES.items():
    set_pose(label)
    for p in rig.pose.bones:
        for channel in ('location', 'rotation_euler', 'scale'):
            p.keyframe_insert(channel, frame=frame, group=p.name)
    for name in morphs:
        rig.keyframe_insert('["'+name+'"]', frame=frame, group='Facial controls')
    marker = scene.timeline_markers.new(label, frame=frame)
rig.animation_data.action.name = 'RIG_DIAGNOSTICS — pose probes, not gameplay'
scene.frame_set(1)
# Save the authoring rig with live IK and central facial sliders.
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
scene.camera.location = (4, -6, 3.3)
scene.camera.data.ortho_scale = 4.5
scene.camera.rotation_euler = (Vector((0, 0, 1.65))-scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'puppy-rig.blend'))

# Reload the saved rig so all driver dependencies resolve exactly as for an animator.
# Some facial drivers are defined before their target custom properties exist.
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'puppy-rig.blend'))
scene = bpy.context.scene
collection = bpy.data.collections['Puppy — rigged character']
rig = bpy.data.objects['Puppy rig']
arm = rig.data
body = bpy.data.objects['Puppy body']
# Bake constraints and drivers with the same exporter available to animators.
sys.path.insert(0, str(HERE))
from export_rig import export_rig
export_rig(OUT / 'puppy-rig.glb', collection, rig)
# Render baked poses, so review pictures exercise the exported deformation path.
if args.render:
    previews = [('neutral', 1, 'hero'), ('blink', 16, 'hero'), ('curious', 46, 'hero'),
                ('bow', 76, 'hero'), ('bow-side', 76, 'side'), ('crouch', 106, 'hero'),
                ('crouch-front', 106, 'front'), ('ears-up', 136, 'hero'),
                ('ears-up-front', 136, 'front'), ('sympathy', 166, 'hero'),
                ('scratch-probe', 226, 'hero'), ('neutral-rear', 1, 'rear')]
    cameras = {'hero': (4, -6, 3.3), 'side': (7, 0, 2.6),
               'front': (0, -7, 2.8), 'rear': (4, 6, 3.2)}
    for label, frame, view in previews:
        scene.frame_set(frame)
        scene.camera.location = cameras[view]
        scene.camera.rotation_euler = (Vector((0, 0, 1.65))-scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(OUT / f'pose-{label}.png')
        bpy.ops.render.render(write_still=True)
meshes = [obj for obj in collection.objects if obj.type == 'MESH']
stats = {'stage': 'rig prototype, diagnostic action only', 'bones': len(arm.bones),
         'deform_bones': sum(b.use_deform for b in arm.bones), 'mesh_objects': len(meshes),
         'vertices': sum(len(o.data.vertices) for o in meshes),
         'triangles': sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),
         'body_quads': sum(len(p.vertices) == 4 for p in body.data.polygons),
         'morph_controls': list(morphs), 'diagnostic_poses': POSES,
         'glb_bytes': (OUT / 'puppy-rig.glb').stat().st_size}
(OUT / 'rig-stats.json').write_text(json.dumps(stats, indent=2)+'\n')
print('RIG_STATS', json.dumps(stats))
