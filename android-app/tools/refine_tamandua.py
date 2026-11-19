# Run after create_tamandua.py in the existing Blender scene.
import bpy, math
from mathutils import Vector, Matrix

root=bpy.data.objects.get('Tamandua')
def active_material(object_name):
    return bpy.data.objects[object_name].data.materials[0]
green=active_material('Tailored vest left')
gold=active_material('Small brass button')
for name in ['Shirt sleeve','Shirt sleeve.001']:
    bpy.data.objects[name].data.materials.clear()
    bpy.data.objects[name].data.materials.append(green)
# Lower the arms asymmetrically so the posture reads as a relaxed host.
def arm_matrix(side):
    pivot=Vector((.49*side,-.01,1.49))
    return Matrix.Translation(pivot) @ Matrix.Rotation(side*.48,4,'Y') @ Matrix.Translation(-pivot)
arm_names=['Shirt sleeve','Forearm','Palm','Finger','Thumb','Cuff']
for obj in list(bpy.data.objects):
    if any(obj.name.split('.')[0]==name for name in arm_names):
        side=1 if obj.location.x>0 else -1
        obj.matrix_world=arm_matrix(side) @ obj.matrix_world
fur=bpy.data.objects.get('Fine warm fur')
if fur:
    for vertex in fur.data.vertices:
        p=vertex.co
        if abs(p.x)>.59 and 1.02<p.z<1.84:
            vertex.co=arm_matrix(1 if p.x>0 else -1) @ p
def tube(name,points,radius,material):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=3;curve.resolution_u=12
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for point,co in zip(spline.bezier_points,points):
        point.co=co;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(material);obj.parent=root
    return obj
for side in [-1,1]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.079,minor_radius=.0045,major_segments=64,minor_segments=8,location=(side*.241,-.34,2.22),rotation=(math.pi/2,0,side*.15))
    obj=bpy.context.object;obj.name='Atelier reading glasses';obj.data.materials.append(gold);obj.parent=root
    for face in obj.data.polygons:face.use_smooth=True
    tube('Glasses temple',[(side*.31,-.33,2.23),(side*.34,-.12,2.28),(side*.30,.02,2.29)],.0035,gold)
    # Folded lapels and seams add tailoring without heavy geometry.
    verts=[(side*.06,-.426,1.66),(side*.22,-.397,1.74),(side*.35,-.333,1.51),(side*.18,-.412,1.39)]
    mesh=bpy.data.meshes.new('Blazer lapel');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.materials.append(green)
    uv=mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        co=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(abs(co.x)*2,(co.z-1.3)*2)
    lapel=bpy.data.objects.new('Folded blazer lapel',mesh);bpy.context.collection.objects.link(lapel);lapel.parent=root
    lapel.modifiers.new('Cloth thickness','SOLIDIFY').thickness=.014
    bevel=lapel.modifiers.new('Soft tailored edge','BEVEL');bevel.width=.008;bevel.segments=3
    tube('Lapel seam',verts[:3],.0025,gold)
tube('Glasses bridge',[(-.16,-.347,2.235),(0,-.43,2.255),(.16,-.347,2.235)],.0035,gold)
for obj in bpy.data.objects:
    if obj.type=='MESH':
        for face in obj.data.polygons:face.use_smooth=True
        if not obj.data.uv_layers and any(m and m.use_nodes and any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) for m in obj.data.materials):
            uv=obj.data.uv_layers.new(name='UVMap')
            for loop in obj.data.loops:
                co=obj.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(co.x+1,co.z)
# Render light is for the review image; Android uses its own controlled lighting.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=2048;scene.render.resolution_y=2048;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
