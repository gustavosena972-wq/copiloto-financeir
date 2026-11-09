# Run in an empty Blender process: blender --background --factory-startup --python create_tamandua.py
import bpy, math, random
from mathutils import Vector, Euler
random.seed(31)
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj,do_unlink=True)
def mat(n,c,rough=.65,metal=0):
    m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
fur=mat('Warm chestnut fur',(.23,.13,.075));light=mat('Soft muzzle',(.37,.24,.145));dark=mat('Nose and pupils',(.035,.022,.016),.32)
inner=mat('Velvet inner ear',(.34,.16,.11));linen=mat('Natural linen',(.69,.63,.49));green=mat('Forest green wool',(.025,.075,.045));gold=mat('Brushed brass',(.65,.43,.13),.3,.65);eye=mat('Warm amber eyes',(.25,.095,.025),.2);white=mat('Eye reflection',(.95,.93,.82),.12)
root=bpy.data.objects.new('Tamandua',None);bpy.context.collection.objects.link(root)
def ell(n,p,s,m,rot=(0,0,0),segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=20,location=p)
    o=bpy.context.object;o.name=n;o.scale=s;o.rotation_euler=rot;o.data.materials.append(m)
    for poly in o.data.polygons:poly.use_smooth=True
    o.parent=root;return o
ell('Body',(0,0,1.10),(.52,.38,.77),fur)
ell('Linen shirt',(0,-.016,1.30),(.525,.39,.57),linen)
ell('Tail',(-.40,.40,.80),(.48,.28,.92),fur,(0,-.72,-.1))
ell('Tail tip',(-.80,.48,.36),(.37,.25,.43),light,(0,-.8,0))
for side in [-1,1]:
    ell('Leg',(.25*side,0,.37),(.235,.25,.34),fur)
    ell('Foot',(.26*side,-.15,.135),(.245,.36,.14),fur)
    for j in range(3):
        ell('Small toe',(.26*side+(j-1)*.10,-.43,.12),(.052,.085,.045),linen)
    ell('Shirt sleeve',(.53*side,-.01,1.40),(.22,.22,.33),linen,(0,side*.65,0))
    ell('Forearm',(.76*side,-.10,1.29),(.145,.165,.29),fur,(0,side*.90,0))
    ell('Palm',(.96*side,-.16,1.43),(.145,.095,.195),light,(0,side*.35,0))
    for j in range(3):
        ell('Finger',((.91+j*.065)*side,-.20,1.61),(.031,.045,.11),light,(0,side*(.30+j*.1),0),24)
    ell('Thumb',(.84*side,-.25,1.43),(.06,.06,.13),light,(0,-side*.6,0),24)
# Tail and limbs stay organic, with one continuous tapered anteater muzzle.
ell('Neck',(0,-.025,1.89),(.30,.28,.37),fur)
ell('Head',(0,-.07,2.13),(.32,.33,.37),fur,(.12,0,0))
verts=[];faces=[];rings=18;steps=32
for j in range(rings):
    t=j/(rings-1);rad=.23*((1-t)**1.35)+.060*t;cy=-.31-.86*t;cz=2.13-.29*t+.012*math.sin(t*math.pi)
    for k in range(steps):
        a=2*math.pi*k/steps;verts.append((rad*math.cos(a),cy,cz+rad*.71*math.sin(a)))
for j in range(rings-1):
    for k in range(steps):
        a=j*steps+k;b=j*steps+(k+1)%steps;faces.append((a,b,b+steps,a+steps))
mesh=bpy.data.meshes.new('Tapered muzzle');mesh.from_pydata(verts,[],faces);mesh.materials.append(light)
muzzle=bpy.data.objects.new('Long anteater muzzle',mesh);bpy.context.collection.objects.link(muzzle);muzzle.parent=root
for f in mesh.polygons:f.use_smooth=True
ell('Soft black nose',(0,-1.205,1.82),(.066,.056,.047),dark)
for side in [-1,1]:
    ell('Ear',(.29*side,.01,2.42),(.10,.065,.135),fur,(0,side*.3,0))
    ell('Inner ear',(.30*side,-.071,2.43),(.066,.018,.090),inner,(0,side*.3,0))
    ell('Eye surround',(.237*side,-.263,2.22),(.079,.044,.087),light)
    ell('Amber eye',(.240*side,-.284,2.22),(.052,.029,.061),eye)
    ell('Pupil',(.237*side,-.309,2.22),(.028,.010,.040),dark)
    ell('Eye glint',(.228*side,-.319,2.242),(.010,.005,.011),white,segments=20)
    ell('Brow',(.258*side,-.30,2.35),(.080,.025,.021),fur,(0,side*.10,side*.15))
# Tailored cloth follows the body, with cut V neck, pockets and fine seams.
def cloth_panel(side):
    vs=[];fs=[];uv=[];nz=22;nx=18
    for j in range(nz):
        z=.87+j/(nz-1)*.87
        body_x=.539*math.sqrt(max(.01,1-((z-1.30)/.60)**2))
        inner_x=.018+max(0,z-1.40)*.62
        if z<1.00:inner_x+=(1.00-z)*.18
        outer_x=max(inner_x+.03,body_x-.024)
        for k in range(nx):
            t=k/(nx-1);x=(inner_x+(outer_x-inner_x)*t)*side
            y=-.017-.406*math.sqrt(max(.008,1-(x/.54)**2-((z-1.30)/.60)**2))-.015
            vs.append((x,y,z));uv.append((t,j/(nz-1)))
    for j in range(nz-1):
        for k in range(nx-1):
            a=j*nx+k;fs.append((a,a+1,a+nx+1,a+nx))
    me=bpy.data.meshes.new('Tailored vest pattern');me.from_pydata(vs,[],fs);me.materials.append(green)
    ob=bpy.data.objects.new('Tailored vest left' if side<0 else 'Tailored vest right',me);bpy.context.collection.objects.link(ob);ob.parent=root
    for f in me.polygons:f.use_smooth=True
    layer=me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:layer.data[li].uv=uv[me.loops[li].vertex_index]
    solid=ob.modifiers.new('Fabric thickness','SOLIDIFY');solid.thickness=.009
    return ob
for side in [-1,1]:
    cloth_panel(side)
    x=.15*side
    mesh=bpy.data.meshes.new('Linen collar fold')
    mesh.from_pydata([(x*.35,-.34,1.78),(.27*side,-.27,1.73),(.20*side,-.405,1.54)],[],[(0,1,2)])
    mesh.materials.append(linen)
    ob=bpy.data.objects.new('Folded linen collar',mesh);bpy.context.collection.objects.link(ob);ob.parent=root
    sol=ob.modifiers.new('Collar edge','SOLIDIFY');sol.thickness=.008
    ell('Cuff',(.67*side,-.055,1.30),(.168,.19,.055),linen,(0,side*.75,0))
    ell('Pocket welt',(.255*side,-.37,1.30),(.105,.022,.015),green,(0,0,side*.08),24)
for z in [1.04,1.25,1.46]:
    ell('Small brass button',(0,-.443,z),(.023,.013,.023),gold,segments=24)
ell('Leaf pin',(-.27,-.345,1.57),(.017,.01,.046),gold,(0,-.4,-.45),24)
# Packed fabric maps survive GLB export and keep mobile material detail.
def texture_material(material,base,kind):
    import random
    image=bpy.data.images.new(material.name+' woven color',width=512,height=512)
    pix=[]
    rng=random.Random(18)
    for y in range(512):
        for x in range(512):
            if kind=='cloth':
                weave=.025*math.sin(x*math.pi/2)*math.sin(y*math.pi/2)
                n=.95+weave+rng.random()*.035
            else:
                n=.975+.035*rng.random()
            pix.extend([min(1,1.055*((c*n)**(1/2.4))-.055) for c in base]+[1])
    image.pixels.foreach_set(pix);image.pack()
    nodes=material.node_tree.nodes;bs=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    material.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value=.83
    if 'Sheen Weight' in bs.inputs:bs.inputs['Sheen Weight'].default_value=.25
texture_material(fur,(.23,.13,.075),'fur')
texture_material(linen,(.69,.63,.49),'cloth')
texture_material(green,(.025,.075,.045),'cloth')
hair=mat('Fine chestnut filaments',(.28,.165,.09),.88)
# Fine tapered fur fibres, merged into one lightweight mesh for Android.
fv=[];ff=[]
def fibres(center,scale,count,color,rotation=(0,0,0),region='all'):
    start=len(fv)
    for i in range(count):
        z=random.uniform(-1,1);a=random.uniform(0,math.tau);r=math.sqrt(max(0,1-z*z));n=Vector((r*math.cos(a),r*math.sin(a),z))
        offset=Vector((n.x*scale[0],n.y*scale[1],n.z*scale[2]));offset.rotate(Euler(rotation));n.rotate(Euler(rotation));p=Vector(center)+offset;length=random.uniform(.010,.023)
        if region=='belly' and p.z>1.12:continue
        tangent=n.cross(Vector((0,0,1)))
        if tangent.length<.01:tangent=Vector((1,0,0))
        tangent.normalize();w=random.uniform(.00065,.00115)
        tip=p+n*length+Vector((0,.005,-.008));idx=len(fv);fv.extend([p-tangent*w,p+tangent*w,tip]);ff.append((idx,idx+1,idx+2))
fibres((0,-.07,2.13),(.322,.332,.372),32000,fur,(.12,0,0))
fibres((-.40,.40,.80),(.482,.282,.922),60000,fur,(0,-.72,-.1))
for side in [-1,1]:fibres((.25*side,0,.37),(.238,.253,.342),6000,fur)
fibres((0,0,1.10),(.523,.383,.773),30000,fur,region='belly')
for side in [-1,1]:fibres((.76*side,-.10,1.29),(.147,.167,.292),12000,fur,(0,side*.90,0))
# Short muzzle fur is generated along the actual taper, rather than painted as a blurred texture.
for i in range(16000):
    t=random.random();a=random.uniform(0,math.tau);rad=.23*((1-t)**1.35)+.060*t
    cy=-.31-.86*t;cz=2.13-.29*t+.012*math.sin(t*math.pi)
    n=Vector((math.cos(a),-.18,.71*math.sin(a))).normalized()
    p=Vector((rad*math.cos(a),cy,cz+rad*.71*math.sin(a)))
    tangent=n.cross(Vector((0,1,0))).normalized();w=.00065;idx=len(fv)
    fv.extend([p-tangent*w,p+tangent*w,p+n*random.uniform(.006,.013)+Vector((0,-.005,-.002))]);ff.append((idx,idx+1,idx+2))
fm=bpy.data.meshes.new('Fur fibres');fm.from_pydata(fv,[],ff);fm.materials.append(hair)
fo=bpy.data.objects.new('Fine warm fur',fm);bpy.context.collection.objects.link(fo);fo.parent=root
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
if scene.world is None: scene.world=bpy.data.worlds.new('Warm studio')
scene.world.color=(.25,.25,.25)
def area(name,p,power,size):
    bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.3))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(3,-4,5),450,4);area('Soft fill',(-3,-2,3),250,3);area('Fur rim',(0,3,4),500,3)
bpy.ops.object.camera_add(location=(3.5,-6.5,3.1));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.1,1.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.3;scene.camera=cam
scene.render.resolution_x=2048;scene.render.resolution_y=2048;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
result={'character':'Tamandua','kind':'authored 3D prototype, not image generation','objects':len(bpy.data.objects),'triangles_estimate':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'),'needs_review':True}

