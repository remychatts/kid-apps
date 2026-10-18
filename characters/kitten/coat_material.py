"""Author and bake a subtle short ginger coat into portable colour/normal maps.

Called by create_kitten.py inside Blender. The material is locally authored;
no third-party image texture is incorporated. Rebuild with create_kitten.py.
"""
from pathlib import Path

import bpy


def finish_coat(character, coat, output_dir, size=2048):
    """UV unwrap the coloured parts and bake directional grain for Blender/glTF."""
    output_dir=Path(output_dir)
    texture_dir=output_dir/'textures'
    texture_dir.mkdir(parents=True,exist_ok=True)
    objects=[o for o in character.objects if coat.name in o.data.materials]
    nodes,links=coat.node_tree.nodes,coat.node_tree.links
    shader=nodes.get('Principled BSDF')
    output=nodes.get('Material Output')
    attr=next(n for n in nodes if n.type=='VERTEX_COLOR')
    coord=nodes.new('ShaderNodeTexCoord')
    mapping=nodes.new('ShaderNodeVectorMath')
    mapping.operation='MULTIPLY'
    mapping.inputs[1].default_value=(135,135,24)
    links.new(coord.outputs['Object'],mapping.inputs[0])
    grain=nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value=1
    grain.inputs['Detail'].default_value=2
    grain.inputs['Roughness'].default_value=0.6
    links.new(mapping.outputs['Vector'],grain.inputs['Vector'])
    # Long fine fibres with soft colour variation, rather than coarse fur clumps.
    ramp=nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position=0.20
    ramp.color_ramp.elements[0].color=(0.65,0.65,0.65,1)
    ramp.color_ramp.elements[1].position=0.8
    ramp.color_ramp.elements[1].color=(1.12,1.12,1.12,1)
    links.new(grain.outputs['Fac'],ramp.inputs[0])
    variation=nodes.new('ShaderNodeMixRGB')
    variation.blend_type='MULTIPLY'
    links.new(attr.outputs['Alpha'],variation.inputs[0])
    links.new(attr.outputs['Color'],variation.inputs[1])
    links.new(ramp.outputs['Color'],variation.inputs[2])
    links.new(variation.outputs[0],shader.inputs['Base Color'])
    masked_height=nodes.new('ShaderNodeMath')
    masked_height.operation='MULTIPLY'
    links.new(grain.outputs['Fac'],masked_height.inputs[0])
    links.new(attr.outputs['Alpha'],masked_height.inputs[1])
    bump=nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=0.3
    bump.inputs['Distance'].default_value=0.014
    links.new(masked_height.outputs[0],bump.inputs['Height'])
    links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    shader.inputs['Roughness'].default_value=0.69

    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=0.015,area_weight=0.2)
    bpy.ops.object.mode_set(mode='OBJECT')
    for obj in objects:
        obj.data.uv_layers.active.name='CoatUV'

    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=4
    scene.cycles.use_denoising=False
    scene.render.bake.margin=12
    scene.render.bake.use_clear=True
    scene.render.bake.use_selected_to_active=False
    target=nodes.new('ShaderNodeTexImage')
    target.name='Baked ginger colour'
    colour=bpy.data.images.new('Ginger coat | base colour',width=size,height=size,alpha=False)
    colour.colorspace_settings.name='sRGB'
    target.image=colour
    nodes.active=target
    emission=nodes.new('ShaderNodeEmission')
    links.new(variation.outputs[0],emission.inputs['Color'])
    links.new(emission.outputs[0],output.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    colour.filepath_raw=str(texture_dir/'ginger-coat-basecolor.png')
    colour.file_format='PNG'
    colour.save()
    colour.pack()

    links.new(shader.outputs[0],output.inputs['Surface'])
    normal=bpy.data.images.new('Ginger coat | soft fibre normal',width=size,height=size,alpha=False)
    normal.colorspace_settings.name='Non-Color'
    target.image=normal
    bpy.ops.object.bake(type='NORMAL')
    normal.filepath_raw=str(texture_dir/'ginger-coat-normal.png')
    normal.file_format='PNG'
    normal.save()
    normal.pack()

    # Standard image/Principled wiring preserves the same coat in glTF viewers.
    target.image=colour
    links.new(target.outputs['Color'],shader.inputs['Base Color'])
    normal_image=nodes.new('ShaderNodeTexImage')
    normal_image.name='Baked ginger fibre normal'
    normal_image.image=normal
    normal_map=nodes.new('ShaderNodeNormalMap')
    normal_map.uv_map='CoatUV'
    normal_map.inputs['Strength'].default_value=0.65
    links.new(normal_image.outputs['Color'],normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'],shader.inputs['Normal'])
    # The colours are already baked; remove the old attribute to avoid multiplying
    # them into the texture for a second time during glTF export.
    for obj in objects:
        for colour_attribute in list(obj.data.color_attributes):
            obj.data.color_attributes.remove(colour_attribute)
    for node in list(nodes):
        if node not in {shader,output,target,normal_image,normal_map}:
            nodes.remove(node)
    target.location=(-520,120)
    normal_image.location=(-520,-220)
    normal_map.location=(-220,-200)
    shader.location=(40,100)
    output.location=(380,100)
    coat['texture_source']='Original procedural short-fur material; see coat_material.py'
    coat['texture_resolution']=size
    return {'resolution':size,'maps':['textures/ginger-coat-basecolor.png','textures/ginger-coat-normal.png'],'textured_meshes':len(objects)}
