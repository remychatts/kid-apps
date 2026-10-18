#!/usr/bin/env python3
"""Rig the reviewed kitten and retarget the puppy's complete draft library.

blender --background --disable-autoexec --threads 6 --python-exit-code 1 --python characters/kitten/rig_kitten.py
Preserves kitten.blend and textures; writes library/kitten-library.blend and GLB.
"""
import json
import math
import sys
import subprocess
import tempfile
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'puppy'))
from animate_library import CLIPS, DESCRIPTIONS, pose as puppy_pose
from animate_quiet import pose as reset_pose, envelope, move, rotate, rotate_world
from export_rig import export_rig
from quiet_glb import split_clips

OUT = HERE / 'library'
OUT.mkdir(exist_ok=True)
# Author an animation-only variant from the same sculpt recipe. Re-bake its
# coat atlas so newly exposed inner forelegs have continuous fur and markings.
# The reviewed static model and its 2K textures are never overwritten.
with tempfile.TemporaryDirectory(prefix='kitten-rig-source-') as source_dir:
    subprocess.run([
        bpy.app.binary_path, '--background', '--factory-startup', '--threads', '6',
        '--python-exit-code', '1', '--python', str(HERE / 'create_kitten.py'), '--',
        '--articulated-forelegs', '--no-render', '--texture-size', '768',
        '--output-dir', source_dir,
    ], check=True)
    bpy.ops.wm.open_mainfile(filepath=str(Path(source_dir) / 'kitten.blend'))
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH' and not o.name.startswith('Studio')]
# The source's character collection is the only collection containing the head.
head = bpy.data.objects['Head | continuous sculpt']
collection = head.users_collection[0]
meshes = [o for o in collection.objects if o.type == 'MESH']
for obj in meshes:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Reduce the dense static sculpt for mobile skinning; retain UVs/materials.
    # The tail keeps its authored rings for deterministic chain weights.
    if len(obj.data.vertices)>1000 and not obj.name.startswith(('Tail', 'Foreleg')):
        simplify=obj.modifiers.new('Web deformation mesh','DECIMATE')
        simplify.ratio=.45
        bpy.ops.object.modifier_apply(modifier=simplify.name)
# Keep the original packed 2K maps in the source; use 768px maps in the web draft.
for image in bpy.data.images:
    if image.type == 'IMAGE' and image.size[0] > 768:
        image.scale(768, 768)
        image.pack()
arm = bpy.data.armatures.new('Kitten skeleton')
rig = bpy.data.objects.new('Kitten rig', arm)
collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, start, end, parent=None, deform=True):
    """Create a parent-first bone with the shared animation control name."""
    b = arm.edit_bones.new(name)
    b.head, b.tail, b.use_deform = start, end, deform
    if parent:
        b.parent = arm.edit_bones[parent]


bone('root', (0,0,0), (0,0,.4), deform=False)
bone('pelvis', (0,.25,.65), (0,.15,.95), 'root')
bone('spine', (0,.15,.95), (0,.03,1.2), 'pelvis')
bone('chest', (0,.03,1.2), (0,-.02,1.45), 'spine')
bone('neck', (0,-.02,1.45), (0,0,1.8), 'chest')
bone('head', (0,0,1.8), (0,0,2.6), 'neck')
legs = {}
for sign, suffix in ((1,'L'),(-1,'R')):
    for label in ('front','hind'):
        front = label == 'front'
        name = label+'.'+suffix
        ankle = (sign*(.365 if front else .70), -.43 if front else .02, .155)
        # Keep a small rest bend so breathing can lift the chest with paws planted.
        knee = (sign*(.34 if front else .62), -.10 if front else .40, .65 if front else .38)
        hip = (sign*(.30 if front else .40), -.20 if front else .25, 1.15 if front else .72)
        toe = (ankle[0],ankle[1]-.2,ankle[2])
        bone('upper.'+name,hip,knee,'chest' if front else 'pelvis')
        bone('lower.'+name,knee,ankle,'upper.'+name)
        bone('paw.'+name,ankle,toe,'lower.'+name)
        bone('IK.'+name,ankle,toe,'root',False)
        legs[name] = Vector(ankle)
    for i in range(3):
        bone(f'ear.{i}.{suffix}',(sign*(.72+.035*i),.015,2.93+.19*i),
             (sign*(.72+.035*(i+1)),.015,2.93+.19*(i+1)),
             'head' if i==0 else f'ear.{i-1}.{suffix}')
tail = bpy.data.objects['Tail | curled with cream tip']
rings = len(tail.data.vertices)//24
centres = [sum((v.co for v in tail.data.vertices[i*24:(i+1)*24]),Vector())/24 for i in range(rings)]
for i in range(3):
    bone(f'tail.{i}', centres[round(i*(rings-1)/3)],centres[round((i+1)*(rings-1)/3)],'pelvis' if i==0 else f'tail.{i-1}')
bpy.ops.object.mode_set(mode='OBJECT')
for p in rig.pose.bones:
    p.rotation_mode = 'XYZ'
for name in legs:
    ik=rig.pose.bones['lower.'+name].constraints.new('IK')
    ik.target,ik.subtarget,ik.chain_count,ik.use_stretch = rig,'IK.'+name,2,False
    ik.iterations=100
    c=rig.pose.bones['paw.'+name].constraints.new('COPY_ROTATION')
    c.target,c.subtarget,c.target_space,c.owner_space=rig,'IK.'+name,'WORLD','WORLD'


def smooth(a,b,x):
    """Blend weights without hard region boundaries."""
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)


def chain(t,names):
    """Blend adjacent chain segments, anchoring the base."""
    u=max(0,min(2,t*3-.5)); i=min(1,int(u)); f=u-i
    return {names[i]:1-f,names[i+1]:f}


def body_weights(v):
    """Attach the seated torso to its spine and blend legs into the haunches."""
    x,y,z=v.co
    chest=smooth(.55,1.25,z)
    weights={'pelvis':1-chest,'chest':chest}
    limb=(1-smooth(.70,1.2,z))*smooth(.16,.32,abs(x))
    # The closed torso follows only the hind legs; front legs have their own
    # closed surfaces so raising one cannot stretch a web out of the belly.
    name='hind.'+('L' if x>=0 else 'R')
    weights={k:w*(1-limb) for k,w in weights.items()}
    paw=1-smooth(.21,.37,z)
    upper=smooth(.4,.53,z)*(1-paw)
    weights.update({'paw.'+name:paw*limb,'upper.'+name:upper*limb,'lower.'+name:(1-paw-upper)*limb})
    return weights


def foreleg_weights(v, suffix):
    """Bend each foreleg along its own chain, with a soft shoulder attachment."""
    z=v.co.z
    shoulder=smooth(1.02,1.30,z)
    paw=1-smooth(.21,.37,z)
    upper=smooth(.48,.82,z)*(1-paw)
    limb=1-shoulder
    return {'chest':shoulder, 'paw.front.'+suffix:paw*limb,
            'upper.front.'+suffix:upper*limb,
            'lower.front.'+suffix:(1-paw-upper)*limb}


def bind(obj,weights):
    """Assign normalised skin weights and preserve the source UVs and materials."""
    groups={}
    for v in obj.data.vertices:
        values={k:w for k,w in weights(v).items() if w>1e-6}
        values=dict(sorted(values.items(),key=lambda item:item[1],reverse=True)[:4])
        total=sum(values.values())
        for name,w in values.items():
            if name not in groups: groups[name]=obj.vertex_groups.new(name=name)
            groups[name].add([v.index],w/total,'REPLACE')
    mod=obj.modifiers.new('Kitten skin','ARMATURE'); mod.object=rig
    obj.parent=rig


for obj in meshes:
    name=obj.name
    if obj==tail:
        bind(obj,lambda v:chain((v.index//24)/(rings-1),[f'tail.{i}' for i in range(3)]))
    elif name.startswith('Ear '):
        suffix='R' if '-1' in name else 'L'
        bind(obj,lambda v,s=suffix:chain((v.co.z-2.93)/.57,[f'ear.{i}.{s}' for i in range(3)]))
    elif name.startswith('Foreleg'):
        bind(obj,lambda v,s='R' if '-1' in name else 'L':foreleg_weights(v,s))
    elif name.startswith('Body'):
        bind(obj,body_weights)
    elif name.startswith(('Forepaw','Hind paw','Soft toe')):
        centre=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
        limb=min(legs,key=lambda key:(legs[key]-centre).length)
        bind(obj,lambda v,n=limb:{'paw.'+n:1})
    else:
        bind(obj,lambda v:{'head':1})

controls = ['Breath','SmileBroad','MouthRelax']+[f'{name}.{s}' for name in ('Blink','EyeWide','BrowRaise','BrowInner','GazeLeft','GazeRight','GazeUp','GazeDown') for s in ('L','R')]
for name in controls: rig[name]=0.0


def morph(obj,name,deform):
    """Drive a portable shape key from the shared central facial control."""
    if not obj.data.shape_keys: obj.shape_key_add(name='Basis')
    key=obj.shape_key_add(name=name)
    for v,p in zip(obj.data.vertices,key.data): p.co=deform(v.co.copy())
    d=key.driver_add('value').driver
    var=d.variables.new(); var.name='value'; var.type='SINGLE_PROP'
    var.targets[0].id=rig; var.targets[0].data_path='["'+name+'"]'
    d.expression='min(1,max(0,value))'


def surface(x,z):
    """Project face movements onto the original curved head."""
    hit,p,_,_=head.ray_cast(Vector((x,-4,z)),Vector((0,1,0)))
    if not hit: raise RuntimeError('Face projection missed')
    return p.y


for obj in meshes:
    name=obj.name
    if name.startswith(('Relaxed smile','Muzzle')):
        for control,amount in (('SmileBroad',.045),('MouthRelax',-.035)):
            morph(obj,control,lambda p,a=amount:Vector((p.x,p.y,p.z+a*smooth(.03,.30,abs(p.x)))))
    if name.startswith('Body'):
        morph(obj,'Breath',lambda p:Vector((p.x*(1+.04*smooth(.4,1,p.z)),p.y-.025*smooth(.4,1,p.z),p.z)))
    if name.startswith('Attached brow'):
        suffix='R' if '-1' in name else 'L'
        for control in ('BrowRaise','BrowInner'):
            def brow(p,c=control):
                """Slide the attached brow up the curved forehead."""
                depth=p.y-surface(p.x,p.z)
                p.z+=.025*(1 if c=='BrowRaise' else 1-smooth(.3,.7,abs(p.x)))
                p.y=surface(p.x,p.z)+depth
                return p
            morph(obj,control+'.'+suffix,brow)
    if name.startswith(('Eye ivory','Iris outer','Blue iris','Pupil','Eye glint')):
        suffix='R' if '-1' in name else 'L'
        # Collapse the shallow eye patches onto a curved closed-lid line; all layers
        # share the same field, so no iris or glint remains exposed during a blink.
        def blink(p):
            """Close the shallow eye surface against the sculpted face."""
            p.z=2.43+(p.z-2.43)*.005
            p.y=surface(p.x,p.z)+.008
            return p
        morph(obj,'Blink.'+suffix,blink)
        if not name.startswith('Eye ivory'):
            for control,dx,dz in [('GazeLeft',.025,0),('GazeRight',-.025,0),('GazeUp',0,.025),('GazeDown',0,-.025)]:
                def gaze(p,dx=dx,dz=dz):
                    """Keep pupil layers on the head surface while glancing."""
                    depth=p.y-surface(p.x,p.z)
                    p.x+=dx; p.z+=dz; p.y=surface(p.x,p.z)+depth
                    return p
                morph(obj,control+'.'+suffix,gaze)
# A curved, dark lid crease emerges only when the eyes close.
for sign,suffix in ((1,'L'),(-1,'R')):
    vertices=[]; faces=[]
    for i in range(25):
        u=-1+2*i/24
        x=sign*.48+.30*u; z=2.43-.025*(1-u*u)
        for j in range(6):
            a=math.tau*j/6
            vertices.append((x,surface(x,z)+.10+.006*math.cos(a),z+.006*math.sin(a)))
    for i in range(24):
        for j in range(6):
            a=i*6+j; b=i*6+(j+1)%6
            faces.append((a,b,b+6,a+6))
    mesh=bpy.data.meshes.new('Closed eyelid crease')
    mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new('Closed lid '+suffix,mesh); collection.objects.link(obj)
    mesh.materials.append(bpy.data.objects['Attached brow 1'].data.materials[0])
    bind(obj,lambda v:{'head':1})
    morph(obj,'Blink.'+suffix,lambda p:Vector((p.x,p.y-.112,p.z)))
# Save and reload to resolve facial driver dependencies before sampling.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitten-rig.blend'),compress=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'kitten-rig.blend'))
rig=bpy.data.objects['Kitten rig']; scene=bpy.context.scene
collection=rig.users_collection[0]
meshes=[o for o in collection.objects if o.type=='MESH']


def pose(clip,time):
    """Retarget shared choreography, with seated scratch and upright ear adaptations."""
    if clip=='Q6':
        reset_pose(rig,controls,'neutral',time)
        support=envelope(time,0,.8,3.5,4.5)
        lift=envelope(time,.8,1.5,2.7,3.5)
        rotate_world(rig,'head',(0,1,0),20*support)
        rotate_world(rig,'neck',(0,0,1),18*support)
        # The seated kitten scratches its cheek with a forepaw (hind leg is short).
        move(rig,'chest',(.06*support,0,-.12*support))
        move(rig,'IK.front.L',(.23*lift,-.02*lift,(1.25+.035*math.sin(time*math.pi*4))*lift))
    else:
        puppy_pose(rig,controls,clip,time,{})
    if clip=='MAJ3':
        tall=envelope(time,.3,.75,1.4,3.2)
        for sign,s in ((1,'L'),(-1,'R')): rotate(rig,'ear.0.'+s,(0,0,-sign*8*tall))
    # The seated pelvis is already close to the floor: retain only a quarter
    # of downward compression, leaving room for the curled tail and haunches.
    pelvis=rig.pose.bones['pelvis']
    world_offset=rig.data.bones['pelvis'].matrix_local.to_3x3() @ pelvis.location
    if world_offset.z < 0:
        world_offset.z *= .25
        move(rig,'pelvis',world_offset)
    # Upright ears and low curled tail need less local rotation than floppy ears.
    for b in rig.pose.bones:
        if b.name.startswith('ear.'): b.rotation_euler = [v*.45 for v in b.rotation_euler]
        if b.name.startswith('tail.'): b.rotation_euler = [v*.45 for v in b.rotation_euler]
    rig.update_tag(); bpy.context.view_layer.update()


FPS=30
scene.render.fps=FPS
scene.frame_start=1
frame=1; clips=[]
for spec in CLIPS:
    clip=dict(spec,description=DESCRIPTIONS[spec['id']],startFrame=frame,endFrame=frame+round(spec['duration']*FPS))
    height=radius=0
    for step in range(round(spec['duration']*FPS)+1):
        pose(spec['id'],step/FPS)
        for b in rig.pose.bones:
            for channel in ('location','rotation_euler','scale'): b.keyframe_insert(channel,frame=frame+step,group=b.name)
        for control in controls: rig.keyframe_insert('["'+control+'"]',frame=frame+step)
        if step%5==0:
            deps=bpy.context.evaluated_depsgraph_get()
            for obj in meshes:
                evaluated=obj.evaluated_get(deps)
                for v in evaluated.data.vertices:
                    p=evaluated.matrix_world@v.co
                    height=max(height,p.z); radius=max(radius,math.hypot(p.x,p.y))
    clip.update(stageHeight=height+.05,stageRadius=radius+.05)
    if clip['id']=='neutral': clip['description']='A relaxed smile and a comfortable seated pose.'
    if clip['id']=='Q6':
        clip['label']='Quick cheek scratch'
        clip['description']='Lift a forepaw for a cheek scratch, then settle.'
    if clip['id'].startswith('Q5'): clip['description']='A small flick of an upright ear.'
    if clip['id']=='MAJ3': clip['description']='Sit tall, perk both ears and give a happy shimmy.'
    clips.append(clip); frame=clip['endFrame']+2
    print('AUTHORED',clip['id'],flush=True)
for curve in rig.animation_data.action.fcurves:
    for key in curve.keyframe_points: key.interpolation='LINEAR'
scene.frame_end=frame-2
scene.frame_set(1)
rig.animation_data.action.name='Kitten complete animation library'
scene['review_status']='Rigged kitten with retargeted draft animations; device review pending.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitten-library.blend'),compress=True)
export_rig(OUT/'timeline.glb',collection,rig)
split_clips(OUT/'timeline.glb',OUT/'kitten-library.glb',clips,FPS)
(OUT/'timeline.glb').unlink()
(OUT/'clips.json').write_text(json.dumps(clips,indent=2)+'\n')
print('KITTEN_LIBRARY_COMPLETE',flush=True)
