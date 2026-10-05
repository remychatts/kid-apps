#!/usr/bin/env python3
"""Check the static puppy's eye enclosure, brow contact and closed tapered tail.

Usage: blender --background --disable-autoexec characters/puppy/puppy.blend --python characters/puppy/validate_puppy.py
"""
import bpy
import bmesh
from mathutils import Vector


def surface_y(body, x, z, rear=False):
    """Intersect the actual head surface from the front or rear."""
    origin = Vector((x, 5 if rear else -5, z))
    direction = Vector((0, -1 if rear else 1, 0))
    hit, point, _, _ = body.ray_cast(body.matrix_world.inverted() @ origin, direction)
    assert hit, f'No head surface at {x}, {z}'
    return (body.matrix_world @ point).y


bpy.context.view_layer.update()
body = bpy.data.objects['Body and head — continuous static surface']
checked = 0
for side in (-1, 1):
    eye = bpy.data.objects['Embedded eye white '+str(side)]
    for vertex in eye.data.vertices:
        point = eye.matrix_world @ vertex.co
        if point.y >= -1.245 - 1e-6:
            assert surface_y(body, point.x, point.z) < point.y
            assert point.y < surface_y(body, point.x, point.z, rear=True)
            checked += 1
    brow = bpy.data.objects['Surface brow '+str(side)]
    embedded = 0
    for vertex in brow.data.vertices:
        point = brow.matrix_world @ vertex.co
        depth = point.y - surface_y(body, point.x, point.z)
        assert -0.014 <= depth <= 0.028, f'Brow detached by {depth}'
        embedded += depth >= 0
    assert embedded > len(brow.data.vertices) // 2

tail = bpy.data.objects['Tapered tail']
bm = bmesh.new()
bm.from_mesh(tail.data)
assert all(edge.is_manifold for edge in bm.edges), 'Tail is not closed'
bm.free()
radii = []
for ring in range(28):
    points = [tail.data.vertices[ring*16+i].co for i in range(16)]
    centre = sum(points, Vector()) / 16
    radii.append(sum((point-centre).length for point in points) / 16)
assert all(a > b for a, b in zip(radii, radii[1:])), 'Tail does not taper continuously'
assert 'Rounded tail tip' not in bpy.data.objects
assert not bpy.data.armatures and not bpy.data.actions
collection = bpy.data.collections['Puppy — static review mesh']
floor = min((o.matrix_world @ v.co).z for o in collection.objects for v in o.data.vertices)
assert abs(floor) < 1e-5
print(f'PASS: {checked} rear-eye vertices enclosed; brows embedded; tail closed; static mesh grounded.')
