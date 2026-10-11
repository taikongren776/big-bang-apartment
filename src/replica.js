import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Photo-grounded reconstruction. See REFERENCES.md for sources and layout notes.
export function buildApartment(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const materials = new Map();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const roundGeometry = new RoundedBoxGeometry(1, 1, 1, 2, .085);
  const sphereGeometry = new THREE.IcosahedronGeometry(1, 1);
  const lampMaterials = [];
  const lamps = [];
  let seed = 41;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function mat(color, options = {}) {
    const key = (color?.isColor ? color.getHexString() : color) + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .88, ...options }));
    return materials.get(key);
  }
  function mesh(geometry, material, x, y, z, parent = root) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function box(x,y,z,w,h,d,color,round=false,parent=root) {
    const m = mesh(round ? roundGeometry : boxGeometry, color?.isMaterial ? color : mat(color),x,y,z,parent);
    m.scale.set(w,h,d); return m;
  }
  function cyl(x,y,z,rt,rb,h,color,n=12,parent=root) {
    return mesh(new THREE.CylinderGeometry(rt,rb,h,n),color?.isMaterial ? color : mat(color),x,y,z,parent);
  }
  function ball(x,y,z,r,color,parent=root) { const m=mesh(sphereGeometry,mat(color),x,y,z,parent);m.scale.setScalar(r);return m; }
  function group(x,y,z,rotation=0) { const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;root.add(g);return g; }
  function rod(a,b,r,color,parent=root) {
    const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b), delta=end.clone().sub(start);
    const m=cyl(0,0,0,r,r,delta.length(),color,8,parent);
    m.position.copy(start.add(end).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function canvasTexture(draw, w=512,h=256) {
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    draw(canvas.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;return t;
  }
  function label(x,y,z,w,h,text,bg='#ece8d7',fg='#535748',parent=root,size=46) {
    const texture=canvasTexture((c,cw,ch)=>{c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.fillStyle=fg;c.font=`${size}px Georgia, serif`;c.textAlign='center';c.textBaseline='middle';text.split('\n').forEach((s,i,lines)=>c.fillText(s,cw/2,ch/2+(i-(lines.length-1)/2)*size*1.4));});
    const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.95}),x,y,z,parent);return m;
  }
  const wood='#bc8543', dark='#523c2d', trim='#ddd5b5', wall='#c5bc96', metal='#687575';
  const bookColors=['#6a3034','#a89462','#294755','#284136','#d0b993','#504955','#922f28','#202c39'];
  const windowMaterial=mat('#bdd4d7',{emissive:'#bdd4d7',emissiveIntensity:.22});
  const screenMaterial=mat('#263e4c',{emissive:'#6387a4',emissiveIntensity:.08,roughness:.3});
  const glass=mat('#b2ccce',{transparent:true,opacity:.32,roughness:.17,metalness:.2,depthWrite:false});
  function ring(x,y,z,r,color,parent=root){return mesh(new THREE.TorusGeometry(r,.018,5,40),mat(color),x,y,z,parent);}
  function books(g,x,y,z,count,height=.36){
    let offset=0;
    for(let i=0;i<count;i++){
      const w=.06+random()*.055,h=height*(.65+random()*.35);
      box(x+offset+w/2,y+h/2,z,w,h,.23,bookColors[Math.floor(random()*bookColors.length)],false,g);
      box(x+offset+w/2,y+h*.75,z+.12,w*.75,.012,.006,'#cbbd97',false,g);offset+=w+.008;
    }
  }
  function stack(g,x,y,z,count=4){for(let i=0;i<count;i++)box(x,y+i*.055,z,.3+random()*.13,.047,.24,bookColors[i%bookColors.length],false,g);}
  function shelf(x,z,w,h,rotation=0,color=dark){
    const g=group(x,0,z,rotation);
    box(0,h/2,.01,w,h,.38,color,false,g);
    box(0,h/2,.215,w-.12,h-.12,.015,'#3d3427',false,g);
    for(const x of [-w/2,w/2])box(x,h/2,.19,.07,h,.47,color,false,g);
    const n=Math.round(h/.47);
    for(let j=0;j<=n;j++){
      const y=.14+j*(h-.20)/n;box(0,y,.21,w,.06,.5,color,false,g);
      if(j<n){books(g,-w/2+.07,y+.04,.31,Math.floor((w-.16)/.10),Math.min(.39,(h-.2)/n-.08));}
    }
    box(0,h+.035,.18,w+.07,.09,.52,color,false,g);return g;
  }
  function lamp(x,y,z,scale=1,parent=root){
    cyl(x,y+.03*scale,z,.20*scale,.23*scale,.06*scale,dark,12,parent);
    cyl(x,y+.40*scale,z,.025*scale,.032*scale,.76*scale,'#776446',10,parent);
    const shade=new THREE.MeshStandardMaterial({color:'#e6d6aa',emissive:'#ffd398',emissiveIntensity:.04,roughness:1,side:THREE.DoubleSide});
    cyl(x,y+.84*scale,z,.19*scale,.34*scale,.44*scale,shade,12,parent);lampMaterials.push(shade);
    const light=new THREE.PointLight('#ffd49b',0,4.8*scale,2);light.position.set(x,y+.77*scale,z);parent.add(light);lamps.push(light);
  }
  function mug(x,y,z,color,parent=root){cyl(x,y+.085,z,.074,.06,.17,color,12,parent);cyl(x,y+.173,z,.060,.06,.006,'#3d3128',12,parent);const m=ring(x+.075,y+.095,z,.044,color,parent);m.scale.setScalar(.8);}
  function figure(x,y,z,color,parent=root){ball(x,y+.29,z,.064,'#ceac89',parent);box(x,y+.17,z,.14,.18,.085,color,true,parent);for(const dx of [-.05,.05])box(x+dx,y+.045,z,.048,.16,.06,'#343a42',false,parent);}

  // The set is organized around two perpendicular walls, not a sofa under a window.
  box(0,-.28,0,12.7,.56,10.75,dark,true);box(0,-.035,0,12.78,.13,10.82,wood,true);
  const floorColors=['#ad865a','#b89465','#c49b67','#b58d5b','#be9769'];
  for(let row=0;row<26;row++)for(let col=0;col<6;col++){
    const x=-6.25+col*2.08+1.03,z=-5.1+row*.402;
    box(x,.035,z,2.065,.065,.394,floorColors[Math.floor(random()*5)]);
    box(x-.45,.071,z-.09,.61,.003,.006,'#9b7a52');
  }
  box(-6.24,1.78,0,.16,3.56,10.58,wall);
  // Rear wall has a deep window niche at left and a doorway between nook and kitchen.
  box(-3.78,.35,-5.22,4.85,.70,.16,'#a88262');
  box(-3.78,3.38,-5.22,4.85,.40,.16,wall);
  box(-6.07,1.84,-5.22,.34,2.96,.16,wall);
  box(-1.53,1.84,-5.22,.34,2.96,.16,wall);
  box(-.98,1.79,-5.22,.76,3.58,.16,wall);
  box(.4,3.19,-5.22,2.04,.75,.16,wall);
  box(3.82,1.79,-5.22,4.93,3.58,.16,wall);
  box(-6.12,.17,0,.08,.24,10.48,trim);box(-6.22,3.25,0,.10,.065,10.52,trim);
  box(0,3.56,-5.22,12.62,.09,.22,trim);box(-6.25,3.56,0,.22,.09,10.64,trim);
  box(3.86,.18,-5.10,4.83,.22,.11,trim);
  // Deep blue drapes, multi-pane windows, brickwork and the scientists' nook.
  // Let glazing overlap the masonry reveal; no daylight slit around the pane.
  box(-3.79,1.95,-5.21,4.25,2.58,.07,windowMaterial);
  for(let i=0;i<7;i++)box(-5.82+i*.678,1.98,-5.12,.037,2.48,.10,'#7f8d81');
  for(let i=0;i<5;i++)box(-3.79,.75+i*.607,-5.11,4.18,.045,.11,'#7f8d81');
  box(-3.79,.69,-4.98,4.54,.10,.48,trim);
  for(const x of [-5.99,-1.57])for(let i=0;i<6;i++){
    const fold=cyl(x+(i-2.5)*.065,1.95,-4.96,.056,.056,2.87,i%2?'#263f43':'#314b51',8);fold.scale.z=.7;
  }
  box(-3.78,3.35,-5.10,4.55,.20,.18,'#8b6549');
  box(-3.76,.14,-4.23,4.70,.14,1.94,'#b39264');
  box(-3.76,.19,-3.24,4.72,.10,.10,trim);
  for(let r=0;r<3;r++)for(let c=0;c<17;c++)box(-6.05+c*.28+(r%2)*.11,.11+r*.19,-5.11,.256,.163,.035,(r+c)%3?'#a38266':'#b1967a');
  for(let i=0;i<5;i++)figure(-5.1+i*.59,2.56,-5.02,['#b84435','#ba9e53','#32598a','#b93431','#48805e'][i]);
  // Nook desk and card catalog: characteristic details visible in set-visit photos.
  const nook=group(-3.95,.14,-3.96);
  box(0,.96,0,1.67,.10,.86,dark,false,nook);
  for(const x of [-.68,.68])box(x,.51,0,.10,.88,.72,dark,false,nook);
  box(0,.75,.37,1.41,.30,.09,'#674734',false,nook);
  box(0,1.42,-.10,.78,.64,.09,'#9ea49c',true,nook);box(0,1.45,-.044,.69,.48,.014,screenMaterial,false,nook);
  box(0,1.12,-.11,.055,.27,.07,metal,false,nook);box(0,1.031,.15,.55,.028,.22,'#cdcfc2',false,nook);
  stack(nook,.58,1.04,.16,5);mug(-.55,1.02,.16,'#cbbd96',nook);
  const catalog=group(-2.25,.14,-4.60);
  box(0,.65,0,1.15,1.23,.62,'#705034',false,catalog);
  for(let row=0;row<6;row++)for(let col=0;col<4;col++){
    const x=-.425+col*.282,y=.16+row*.195;box(x,y,.33,.254,.171,.028,'#805d3e',false,catalog);box(x,y,.352,.065,.022,.012,'#bb9d63',false,catalog);
  }
  stack(catalog,-.26,1.31,.03,4);figure(.23,1.31,.04,'#63828b',catalog);
  const telescope=group(-5.25,.14,-3.70,-.35);
  for(let i=0;i<3;i++){const a=i*2.094;rod([Math.cos(a)*.46,.08,Math.sin(a)*.46],[0,1.09,0],.025,metal,telescope);}
  const tube=cyl(0,1.5,0,.16,.16,.91,'#242c30',16,telescope);tube.rotation.z=.85;tube.rotation.x=.30;
  cyl(0,1.08,0,.13,.13,.17,'#313c3b',12,telescope);
  // One shared, full-depth door assembly spans the actual wall opening.
  // Small structural overlaps seal the reveal from front, back and oblique views.
  const doorOpening={left:-.60,right:1.355,center:.3775,leafWidth:1.40};
  const doorParts=[];
  const leftLeaf=doorOpening.center-doorOpening.leafWidth/2,rightLeaf=doorOpening.center+doorOpening.leafWidth/2;
  doorParts.push(box((doorOpening.left+leftLeaf)/2,1.43,-5.31,leftLeaf-doorOpening.left+.04,2.86,.52,trim));
  doorParts.push(box((doorOpening.right+rightLeaf)/2,1.43,-5.31,doorOpening.right-rightLeaf+.04,2.86,.52,trim));
  doorParts.push(box(doorOpening.center,1.43,-5.36,1.43,2.80,.15,'#b3a585'));
  doorParts.push(box(doorOpening.center,2.84,-5.31,2.015,.20,.52,trim));
  doorParts.push(box(doorOpening.center,.06,-5.31,2.015,.12,.62,'#bdb49a'));
  for(const x of [doorOpening.left+.055,doorOpening.right-.055])box(x,1.43,-5.025,.15,2.88,.10,trim);
  box(doorOpening.center,2.88,-5.025,2.04,.13,.10,trim);ball(.88,1.22,-5.24,.045,'#756649');
  // Left wall order, front to rear: entrance, gray electronics shelf, long bookcase,
  // postered closet, whiteboard/DNA and the tall shelving beside the window nook.
  function wallDoor(z,w,poster=false){
    const g=group(-6.10,0,z,Math.PI/2);box(0,1.39,0,w,2.78,.08,poster?'#ac793f':'#d1cbb3',false,g);
    for(const x of [-w/2-.04,w/2+.04])box(x,1.43,.0,.13,2.89,.19,trim,false,g);
    box(0,2.83,.0,w+.21,.15,.19,trim,false,g);
    box(0,.065,.0,w+.21,.13,.22,'#bdb49a',false,g);box(-w*.32,1.18,.07,.055,.20,.032,'#6a5c43',false,g);
    if(poster)label(0,1.85,.051,w*.74,.88,'ROCK’EM\nSOCK’EM\nROBOTS','#314044','#d7b36c',g,45);
    else{
      const disk=cyl(0,1.98,.073,.32,.32,.028,'#333a33',40,g);disk.rotation.x=Math.PI/2;
      for(const r of [.29,.20,.12])ring(0,1.98,.10,r,'#c7b897',g);
      for(let i=0;i<16;i++){const a=i*Math.PI/8;rod([Math.cos(a)*.05,1.98+Math.sin(a)*.05,.105],[Math.cos(a)*.30,1.98+Math.sin(a)*.30,.105],.008,i%2?'#90604f':'#c5b59a',g);}
    }
  }
  wallDoor(4.30,1.23);wallDoor(-1.39,1.03,true);
  const longShelf=shelf(-5.94,.78,2.95,2.45,Math.PI/2,wood);
  const grayShelf=shelf(-5.92,2.99,1.05,1.78,Math.PI/2,'#747d75');
  figure(-.23,1.88,.2,'#244577',grayShelf);figure(.17,1.88,.2,'#303b3d',grayShelf);
  const radio=box(0,1.38,.38,.48,.22,.08,'#a6aca0',false,grayShelf);
  for(const x of [-.14,.14]){const knob=cyl(x,1.40,.439,.071,.071,.014,'#3a443e',12,grayShelf);knob.rotation.x=Math.PI/2;}
  for(const x of [-1.1,-.50,.85])stack(longShelf,x,2.56,.13,3+Math.round(random()*3));
  ball(.24,2.81,.16,.24,'#68928c',longShelf);cyl(.24,2.57,.16,.11,.17,.08,dark,12,longShelf);
  const scienceOrb=ball(-.61,2.86,.10,.24,'#a8b3a0',longShelf);scienceOrb.material=mat('#a8b3a0',{wireframe:true});
  figure(1.13,2.51,.22,'#c7cbc0',longShelf);
  shelf(-5.92,-3.46,1.51,2.70,Math.PI/2,dark);
  // Wall whiteboards replace the invented freestanding board in the first model.
  const equationTexture=canvasTexture((c,w,h)=>{
    c.fillStyle='#e2e0c9';c.fillRect(0,0,w,h);c.fillStyle='#45696c';c.font='italic 28px Georgia';
    ['Hψ = Eψ','iℏ ∂ψ/∂t = Ĥψ','∇ × B = μ₀J + μ₀ε₀ ∂E/∂t'].forEach((s,i)=>c.fillText(s,22,42+i*53));
    c.fillStyle='#9a4647';c.font='italic 22px Georgia';c.fillText('∫ Dφ exp(iS[φ])     E = mc²',22,225);
  });
  function whiteboard(x,y,z,w,h,rotation=0){
    const g=group(x,y,z,rotation);box(0,0,0,w,h,.045,'#a2aaa0',false,g);
    mesh(new THREE.PlaneGeometry(w-.08,h-.08),new THREE.MeshStandardMaterial({map:equationTexture,roughness:1}),0,0,.028,g);
    box(0,-h/2,.08,w,.03,.15,'#899589',false,g);return g;
  }
  whiteboard(-6.135,2.35,3.02,1.03,.95,Math.PI/2);
  whiteboard(-6.13,1.64,-2.41,.76,1.98,Math.PI/2);
  const dna=group(-5.62,0,-2.39);
  cyl(0,.12,0,.23,.25,.10,'#494e47',12,dna);
  for(let i=0;i<37;i++){
    const y=.22+i*.061,a=i*.36,colors=['#c45246','#718faa','#d0c4a5'];
    for(const sign of [-1,1])ball(Math.cos(a)*.16*sign,y,Math.sin(a)*.16*sign,.038,colors[i%3],dna);
    if(i%2===0)rod([Math.cos(a)*.16,y,Math.sin(a)*.16],[-Math.cos(a)*.16,y,-Math.sin(a)*.16],.018,'#cfba8f',dna);
  }
  // Nested carpets: large muted blue base with a small geometric Persian rug on top.
  box(-1.81,.082,.93,5.7,.02,5.4,'#798789');
  const rugTexture=canvasTexture((c,w,h)=>{
    c.fillStyle='#bd9b6b';c.fillRect(0,0,w,h);c.fillStyle='#27494d';c.fillRect(13,13,w-26,h-26);
    c.strokeStyle='#d1b789';c.lineWidth=5;c.strokeRect(31,31,w-62,h-62);c.fillStyle='#a45d42';c.fillRect(55,55,w-110,h-110);
    for(let x=78;x<w-56;x+=57)for(let y=78;y<h-55;y+=60){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#d3bb85';c.fillRect(-20,-20,40,40);c.fillStyle='#3d5754';c.fillRect(-12,-12,24,24);c.fillStyle='#c3a579';c.fillRect(-5,-5,10,10);c.restore();}
    for(let i=0;i<9000;i++){c.fillStyle=random()>.5?'#ffffff0a':'#0000000a';c.fillRect(random()*w,random()*h,1,2);}
  },512,768);
  box(-2.05,.10,.82,2.87,.025,4.15,new THREE.MeshStandardMaterial({map:rugTexture,roughness:1}));
  // Brown leather sofa faces across the room; the bookshelves stand directly behind it.
  const sofa=group(-3.97,0,.72,Math.PI/2);
  for(const x of [-1.38,1.38])for(const z of [-.43,.43])box(x,.18,z,.11,.24,.12,dark,false,sofa);
  box(0,.44,0,3.20,.43,1.22,'#75432f',true,sofa);
  box(0,.99,-.49,3.10,.91,.29,'#895038',true,sofa);
  for(let i=0;i<3;i++){
    const x=(i-1)*.93;box(x,.69,.10,.91,.20,1.03,'#95593c',true,sofa);
    const b=box(x,1.06,-.30,.93,.66,.25,'#8b5037',true,sofa);b.rotation.x=-.12;
  }
  for(const x of [-1.50,1.50])box(x,.75,.04,.30,.71,1.35,'#874a33',true,sofa);
  const throwMat=mat('#b19b7a');box(0,1.28,-.25,2.2,.18,.34,throwMat,true,sofa);box(0,1.13,-.105,2.2,.29,.022,throwMat,false,sofa);
  const cushion=box(-1.03,1.00,.04,.47,.46,.18,'#cfb274',true,sofa);cushion.rotation.z=.15;
  const stripeTexture=canvasTexture((c,w,h)=>{const colors=['#3e687a','#bf673c','#ccb864','#8b944a','#bb6745','#d7c88e'];for(let y=0;y<h;y+=17){c.fillStyle=colors[Math.floor(y/17)%6];c.fillRect(0,y,w,14);c.fillStyle='#dfd4b1';c.fillRect(0,y+14,w,3);}});
  const striped=box(1.04,1.04,.045,.55,.53,.17,new THREE.MeshStandardMaterial({map:stripeTexture,roughness:1}),true,sofa);striped.rotation.z=-.15;
  // Oval transparent glass coffee table with two metal pedestal feet.
  const table=group(-1.94,0,.78,Math.PI/2);
  for(const x of [-.49,.49]){cyl(x,.16,0,.29,.34,.035,metal,24,table);cyl(x,.43,0,.038,.05,.51,metal,12,table);}
  const top=cyl(0,.715,0,1,1,.045,glass,48,table);top.scale.set(1.13,1,.58);top.castShadow=false;
  const edge=ring(0,.71,0,1,'#94a29a',table);edge.rotation.x=Math.PI/2;edge.scale.set(1.13,.58,1);
  stack(table,-.40,.77,.04,3);box(.31,.77,-.05,.36,.09,.27,'#ccbca0',false,table);mug(.68,.74,.04,'#f0dfb2',table);
  // Cream armchair and orange cushion, at the window end of the seating group.
  const armchair=group(-1.34,0,-1.89,.12);
  for(const x of [-.43,.43])for(const z of [-.4,.4])box(x,.16,z,.12,.22,.12,dark,false,armchair);
  box(0,.44,0,1.22,.35,1.23,'#c9bea0',true,armchair);box(0,.67,.06,1.09,.18,1.05,'#dfd3b3',true,armchair);
  box(0,1.02,-.47,1.27,.90,.31,'#d8ccb0',true,armchair);
  for(const x of [-.62,.62])box(x,.78,.02,.30,.64,1.31,'#d7caae',true,armchair);
  const orange=box(.02,.99,-.11,.49,.48,.18,'#bd6a3e',true,armchair);orange.rotation.z=-.14;orange.rotation.x=-.14;
  const woodChair=group(-1.34,0,2.65,Math.PI);
  box(0,.57,0,.71,.10,.67,'#805532',true,woodChair);
  for(const x of [-.29,.29])for(const z of [-.27,.27])rod([x,.09,z],[x,.55,z],.030,dark,woodChair);
  for(const x of [-.32,.32]){rod([x,.55,-.28],[x,1.31,-.33],.031,wood,woodChair);rod([x,.83,-.25],[x,.83,.29],.028,wood,woodChair);rod([x,.58,.25],[x,.83,.25],.022,wood,woodChair);}
  box(0,1.24,-.32,.73,.15,.09,'#8c6039',true,woodChair);
  for(let i=0;i<5;i++)rod([-.23+i*.115,.64,-.28],[-.23+i*.115,1.19,-.32],.018,wood,woodChair);
  cyl(-4.14,.39,-1.64,.33,.32,.59,wood);cyl(-4.14,.72,-1.64,.46,.46,.08,wood);lamp(-4.14,.77,-1.64,.94);
  // L-shaped kitchen: fridge/range on the rear return, sink run on the right.
  // The right wall is cut down toward the viewer to expose the working surface.
  box(6.24,.91,-2.97,.16,1.82,4.66,wall);
  box(6.24,2.67,-4.16,.16,1.70,2.29,wall);
  box(6.24,1.84,-1.83,.22,.08,2.38,trim);
  box(6.24,3.56,-4.16,.22,.09,2.29,trim);
  box(6.13,.18,-2.97,.10,.22,4.66,trim);
  function tiledBack(parent,x,y,z,width,height){
    box(x,y,z,width,height,.045,'#94aa92',false,parent);
    for(let u=-width/2;u<=width/2;u+=.25)box(x+u,y,z+.026,.009,height,.008,'#d5d4b3',false,parent);
    for(let v=-height/2;v<=height/2;v+=.25)box(x,y+v,z+.026,width,.009,.008,'#d5d4b3',false,parent);
  }
  function cabinet(parent,x,z,width){
    box(x,.60,z,width,1.03,1.0,wood,false,parent);
    const n=Math.max(1,Math.round(width/.65)),w=width/n;
    for(let i=0;i<n;i++){
      const dx=x-width/2+w*(i+.5);
      box(dx,.66,z+.518,w-.04,.85,.037,'#c7954f',false,parent);
      box(dx,.66,z+.545,w-.16,.71,.028,'#bd8a47',false,parent);
      ball(dx+w*.31,.89,z+.58,.034,'#857653',parent);
    }
    return box(x,1.16,z,width,.11,1.10,'#a6b195',false,parent);
  }
  function upperCabinet(parent,x,z,width=.76){
    box(x,2.41,z,width,1.14,.47,'#be8a40',false,parent);
    box(x,2.41,z+.254,width-.08,1.02,.036,'#d0a054',false,parent);
    box(x,2.41,z+.28,width-.24,.80,.02,'#c7984d',false,parent);
    ball(x+width*.28,2.11,z+.32,.032,'#7c704c',parent);
    box(x,3.02,z,width+.06,.09,.56,'#d3a051',false,parent);
  }
  tiledBack(root,4.37,1.47,-5.09,3.49,.70);
  const fridge=group(2.12,0,-4.57);
  box(0,1.32,0,1.08,2.48,1.02,'#a1a7a0',true,fridge);
  for(const [y,h]of [[2.10,.74],[.95,1.52]])box(0,y,.542,1.0,h,.055,'#b8bcb2',true,fridge);
  for(const [y,h]of [[1.99,.38],[1.45,.44]])box(-.38,y,.60,.038,h,.045,'#4a5450',false,fridge);
  for(let i=0;i<8;i++)label(-.29+(i%3)*.23,.58+Math.floor(i/3)*.33,.579,.17,.24,i%2?'MILK\nEGGS':'NOTES','#e3ddbe','#58645e',fridge,44);
  cabinet(root,3.19,-4.61,1.02);
  cabinet(root,5.39,-4.61,1.46);
  for(const x of [3.13,3.93,4.74])upperCabinet(root,x,-4.96);
  const range=group(4.18,0,-4.52);
  box(0,.59,0,.92,1.02,1.12,'#818981',false,range);
  box(0,.57,.579,.81,.64,.045,'#272f2c',false,range);box(0,.57,.609,.64,.44,.014,'#3f4b47',false,range);
  box(0,.96,.62,.64,.032,.05,'#b2b8ac',false,range);box(0,1.16,.04,.94,.06,1.12,'#343e38',false,range);
  box(0,1.36,-.43,.90,.35,.10,'#b9bcb0',false,range);
  for(const x of [-.23,.23])for(const z of [-.23,.29])cyl(x,1.20,z,.12,.12,.025,'#1e2925',16,range);
  cyl(-.22,1.34,.26,.13,.16,.25,'#d79c37',12,range);ring(-.22,1.50,.26,.14,'#363f31',range);
  // Local +Z faces into the room (-X in the apartment); local X runs front to back.
  const rightKitchen=group(6.14,0,-2.45,-Math.PI/2);
  tiledBack(rightKitchen,0,1.47,.015,3.20,.70);
  const rightCounter=cabinet(rightKitchen,0,.51,3.20);
  box(-.20,1.23,.54,.87,.018,.56,'#abb9af',true,rightKitchen);
  box(-.20,1.24,.54,.70,.01,.40,'#667d77',true,rightKitchen);
  rod([-.20,1.24,.17],[-.20,1.64,.17],.027,'#b4beb0',rightKitchen);
  rod([-.20,1.64,.17],[-.20,1.64,.48],.027,'#b4beb0',rightKitchen);
  box(1.14,1.43,.51,.65,.43,.49,'#a0aaa2',true,rightKitchen);
  box(1.07,1.43,.768,.44,.29,.018,'#2e3d39',false,rightKitchen);
  cyl(-1.13,1.38,.37,.11,.11,.31,'#45534b',12,rightKitchen);mug(-.82,1.23,.73,'#e1d0a3',rightKitchen);
  const openShelf=group(6.00,0,-4.55,-Math.PI/2);
  box(0,2.38,0,.71,1.28,.39,wood,false,openShelf);
  box(0,2.38,.212,.60,1.13,.018,'#806843',false,openShelf);
  for(const y of [1.81,2.18,2.57,2.98])box(0,y,.19,.73,.055,.43,wood,false,openShelf);
  for(let i=0;i<3;i++){
    for(let j=0;j<3;j++)cyl(-.18,1.88+i*.38+j*.025,.25,.12,.12,.023,['#5e807c','#b14e39','#d9ba60'][i],16,openShelf);
    mug(.15,1.85+i*.38,.23,['#b8b279','#b65c48','#728c9a'][i],openShelf);
  }
  // Pot rack is attached to the right wall, clear of cabinet doors.
  const rack=group(6.035,0,-3.54,-Math.PI/2);
  rod([-.35,2.55,0],[.35,2.55,0],.018,dark,rack);
  mesh(new THREE.TorusGeometry(.35,.018,5,24,Math.PI),mat(dark),0,2.55,0,rack);
  for(let i=0;i<3;i++){
    const x=(i-1)*.25,y=2.06+(i%2)*.08;rod([x,2.53,.04],[x,y+.14,.04],.018,'#353c37',rack);
    const pan=cyl(x,y,.07,.15,.15,.035,['#65898c','#b4553f','#354440'][i],16,rack);pan.rotation.x=Math.PI/2;
  }
  // Open butcher-block island with chrome legs and visible equipment shelves.
  const island=group(3.30,0,-2.43,-Math.PI/2);
  box(0,1.19,0,3.57,.13,1.15,'#c89752',true,island);
  for(let i=0;i<24;i++)box(-1.68+i*.145,1.259,0,.038,.003,1.08,i%3?'#b88748':'#e0b978',false,island);
  for(const x of [-1.62,1.62])for(const z of [-.43,.43]){
    rod([x,.12,z],[x,1.12,z],.034,'#8b9790',island);ball(x,.09,z,.065,'#555d54',island);
  }
  for(const y of [.23,.66]){box(0,y,0,3.43,.065,.94,'#b78c4c',false,island);rod([-1.62,y,-.46],[1.62,y,-.46],.025,metal,island);rod([-1.62,y,.46],[1.62,y,.46],.025,metal,island);}
  for(let i=0;i<5;i++)box(-1.25+i*.61,.40,.02,.48,.27,.65,['#37413d','#606f66','#846447','#4f4a35','#817656'][i],false,island);
  for(let i=0;i<6;i++)box(-1.40+i*.49,.82,0,.38,.25,.52,i%2?'#625647':'#8f9385',false,island);
  box(.83,1.283,.1,.41,.025,.52,'#e5d9b7',false,island);mug(-.63,1.26,.12,'#354e66',island);
  box(-.30,1.38,-.20,.45,.21,.30,'#343f3b',true,island);
  for(const z of [-3.19,-1.81]){
    const x=2.27;
    cyl(x,.78,z,.28,.28,.12,'#b67e47',16);
    for(const dx of [-.17,.17])for(const dz of [-.17,.17])rod([x+dx*1.25,.09,z+dz*1.25],[x+dx,.74,z+dz],.027,dark);
    const foot=ring(x,.34,z,.23,dark);foot.rotation.x=Math.PI/2;
  }
  // A white schoolhouse pendant suspended over the longitudinal island.
  rod([3.30,3.64,-4.99],[3.30,3.64,-2.75],.015,metal);rod([3.30,3.64,-2.75],[3.30,3.05,-2.75],.015,metal);
  const pendant=mat('#ece4c8',{emissive:'#ffdb9b',emissiveIntensity:.05});
  const bulb=ball(3.30,2.86,-2.75,.22,'#ece4c8');bulb.material=pendant;
  cyl(3.30,3.03,-2.75,.07,.22,.24,pendant,12);lampMaterials.push(pendant);
  const kitchenLight=new THREE.PointLight('#ffda9b',0,6,2);kitchenLight.position.set(3.30,2.76,-2.75);root.add(kitchenLight);lamps.push(kitchenLight);
  // Two cluttered work tables occupy the open right-hand foreground.
  function workdesk(x,z,rotation,computerColor){
    const g=group(x,0,z,rotation);box(0,.95,0,1.86,.1,.86,'#65513b',false,g);
    for(const x of [-.78,.78])for(const z of [-.31,.31])box(x,.51,z,.08,.87,.08,'#4d5044',false,g);
    box(-.1,1.035,-.06,.63,.036,.42,'#343a38',true,g);
    const screen=box(-.1,1.27,-.25,.64,.47,.035,computerColor,true,g);screen.rotation.x=-.14;
    box(-.1,1.27,-.222,.54,.37,.01,screenMaterial,false,g);
    stack(g,.59,1.04,.12,4);box(-.59,1.14,.09,.15,.24,.15,'#827862',false,g);
    for(let i=0;i<5;i++)rod([-.62+i*.022,1.14,.09],[-.64+i*.03,1.42,.09],.007,['#313b45','#9e4638','#baa064'][i%3],g);
    mug(.49,1.03,-.24,'#9a7752',g);
    const seat=group(x+Math.sin(rotation)*.92,0,z+Math.cos(rotation)*.92,rotation);
    cyl(0,.52,0,.31,.31,.12,'#626a61',12,seat);box(0,.86,.19,.59,.65,.16,'#697269',true,seat);
    cyl(0,.27,0,.035,.035,.44,metal,8,seat);for(let i=0;i<5;i++){const a=i*1.257;rod([0,.12,0],[Math.cos(a)*.35,.08,Math.sin(a)*.35],.025,metal,seat);}
    return g;
  }
  workdesk(4.94,2.00,-Math.PI/2,'#a14436');
  workdesk(2.21,3.82,Math.PI,'#838f85');
  // The television sits at the front of the seating area and points toward the sofa.
  const tv=group(2.25,0,sofa.position.z,-Math.PI/2);
  box(0,.38,0,1.42,.54,.50,dark,false,tv);
  for(const x of [-.43,.43])box(x,.15,0,.08,.21,.36,metal,false,tv);
  box(0,1.10,0,1.30,.85,.10,'#323c39',true,tv);box(0,1.11,.062,1.17,.71,.015,screenMaterial,false,tv);
  box(0,.69,0,.16,.15,.14,metal,false,tv);box(0,.62,0,.54,.045,.33,metal,false,tv);
  // Small secondary task lamp and artwork retain the lived-in, scientific character.
  lamp(-3.50,1.17,-4.01,.5);
  const framed=group(-6.13,2.96,.22,Math.PI/2);
  box(0,0,0,.67,.55,.035,dark,false,framed);label(0,0,.023,.56,.45,'COSMOS','#7b8c8a','#d7d8ba',framed,50);
  // Exterior is a complementary miniature facade, rather than a claimed TV-set replica.
  // It uses the same actual window opening, with no invented interior-facing windows.
  const exterior=group(0,0,0);
  const sideFacade=new THREE.Group();sideFacade.position.set(-6.34,0,0);sideFacade.rotation.y=-Math.PI/2;exterior.add(sideFacade);
  const brickColors=['#9e7860','#ac856a','#b49173','#97705b','#bd9b7d'];
  box(0,1.77,-.01,10.58,3.5,.10,'#b8ab91',false,sideFacade);
  for(let row=0;row<17;row++)for(let col=0;col<24;col++){
    const x=-5.13+col*.444+(row%2)*.222;
    if(x>5.15)continue;
    box(x,.23+row*.193,.027,.420,.175,.035,brickColors[(col+row*3)%5],false,sideFacade);
  }
  // Low stone course, cornice and shallow pilasters break up the long side elevation.
  box(0,.14,.044,10.67,.25,.12,'#aa9b7e',false,sideFacade);
  box(0,3.48,.035,10.70,.13,.19,trim,false,sideFacade);
  box(0,2.87,.056,10.64,.065,.10,'#c1b394',false,sideFacade);
  for(const x of [-5.23,.38,5.23])box(x,1.72,.056,.15,3.40,.105,'#b4a182',false,sideFacade);
  // Wall-mounted address plaque and service vents occupy the formerly blank reverse side.
  box(2.69,1.93,.092,1.44,.93,.09,'#3f5954',true,sideFacade);
  label(2.69,2.01,.145,1.25,.53,'4A','#3f5954','#eadab5',sideFacade,100);
  label(2.69,1.68,.145,1.23,.16,'LOS ROBLES AVENUE','#3f5954','#cecaad',sideFacade,29);
  for(const x of [-1.31,1.12]){
    box(x,.72,.102,.89,.56,.15,'#737f73',true,sideFacade);
    for(let i=0;i<7;i++)box(x,.51+i*.064,.19,.73,.025,.025,'#465a53',false,sideFacade);
  }
  rod([-4.76,.18,.12],[-4.76,3.43,.12],.048,'#637569',sideFacade);
  for(const y of [.55,1.52,2.48,3.2])box(-4.76,y,.14,.17,.045,.08,'#7e8c7b',false,sideFacade);
  rod([-4.76,.22,.12],[-4.60,.13,.29],.048,'#637569',sideFacade);
  // Rear brickwork stops precisely at the real window and the recessed service door.
  for(let row=0;row<18;row++)for(let col=0;col<28;col++){
    const x=-6.09+col*.445+(row%2)*.222,y=.14+row*.193;
    if(x>6.2)continue;
    const inWindow=x> -6.07&&x< -1.51&&y>.64&&y<3.20;
    const inDoor=x>-.52&&x<1.26&&y<2.98;
    if(!inWindow&&!inDoor)box(x,y,-5.328,.420,.175,.043,brickColors[(col+row*2)%5],false,exterior);
  }
  box(0,3.52,-5.31,12.69,.16,.25,trim,false,exterior);
  for(const x of [-6.22,-1.40,1.36,6.22])box(x,1.78,-5.35,.13,3.47,.15,'#b4a182',false,exterior);
  // Exterior frames and sill give the window depth from either direction.
  for(let i=0;i<7;i++)box(-5.82+i*.678,1.98,-5.32,.052,2.48,.10,'#798b7c',false,exterior);
  for(let i=0;i<5;i++)box(-3.79,.75+i*.607,-5.32,4.18,.05,.10,'#798b7c',false,exterior);
  box(-3.79,.69,-5.38,4.48,.12,.32,trim,false,exterior);
  box(-3.79,3.23,-5.34,4.53,.12,.22,trim,false,exterior);
  const backDoor=group(doorOpening.center,0,-5.448,Math.PI);root.remove(backDoor);exterior.add(backDoor);
  box(0,1.43,0,1.40,2.78,.026,'#73847c',false,backDoor);
  for(const x of [-.9225,.9225])box(x,1.43,.12,.15,2.88,.07,trim,false,backDoor);
  box(0,2.88,.12,2.04,.13,.07,trim,false,backDoor);
  label(0,2.04,.016,.60,.25,'4A','#73847c','#ebe1c6',backDoor,75);
  ball(-.45,1.22,.05,.043,'#c0a16b',backDoor);
  // Solid reveals connect both window frames to the existing wall thickness.
  for(const x of [-5.94,-1.64])box(x,1.95,-5.27,.14,2.63,.35,trim,false,exterior);
  box(3.77,.17,-5.33,4.89,.25,.17,'#aa9b7e',false,exterior);
  // A shallow landscaped strip sits on the outside of the wooden display base.
  box(-6.54,-.29,0,.47,.40,10.86,wood,true,exterior);
  box(0,-.29,-5.54,12.83,.40,.48,wood,true,exterior);
  function planter(parent,x,y,z,width=.85){
    box(x,y+.12,z,width,.24,.29,'#977356',true,parent);
    box(x,y+.249,z,width-.09,.015,.21,'#4e5040',false,parent);
    for(let i=0;i<7;i++){
      const px=x-width*.4+i*width*.13,pz=z+(i%2?.045:-.045);
      rod([px,y+.25,pz],[px,y+.40+(i%3)*.04,pz],.012,'#5b7356',parent);
      const leaf=ball(px,y+.40+(i%3)*.04,pz,.09,i%2?'#7e8f60':'#637d57',parent);leaf.scale.set(.10,.13,.07);
      if(i%3===0)ball(px,y+.52,pz,.04,'#ceaa77',parent);
    }
  }
  planter(exterior,-4.80,.73,-5.55,1.22);planter(exterior,-2.76,.73,-5.55,1.22);
  planter(sideFacade,3.91,.08,.30,1.32);planter(sideFacade,-3.61,.08,.30,1.0);
  // A light climbing vine provides organic detail without covering the wall.
  for(let stem=0;stem<3;stem++){
    const x=-3.85+stem*.27;
    rod([x,.28,.13],[x+.30,2.72-stem*.26,.13],.014,'#6a7751',sideFacade);
    for(let i=0;i<10;i++){
      const y=.4+i*.23,px=x+i*.025+(i%2?.11:-.11);
      const leaf=ball(px,y,.14,.08,i%3?'#6f8254':'#8a9569',sideFacade);leaf.scale.set(.10,.065,.033);leaf.rotation.z=i%2?.5:-.5;
    }
  }
  // Near the entrance, add only small furnishings; keep the circulation path open.
  const entryMat=box(-5.13,.085,4.19,1.17,.014,1.04,'#6d7966');
  for(let i=0;i<6;i++)box(-5.56+i*.17,.095,4.19,.021,.005,.86,'#b1aa88');
  const umbrella=group(-5.66,0,3.66);
  cyl(0,.32,0,.12,.11,.46,'#6b746b',10,umbrella);rod([0,.28,0],[.04,.87,0],.017,'#6f4437',umbrella);
  // Record actual geometry bounds, so spacing can be checked after meshes are merged.
  root.updateMatrixWorld(true);
  const shelfBounds=new THREE.Box3().setFromObject(longShelf),sofaBounds=new THREE.Box3().setFromObject(sofa),tableBounds=new THREE.Box3().setFromObject(table);
  const doorIntervals=doorParts.slice(0,3).map(part=>new THREE.Box3().setFromObject(part)).sort((a,b)=>a.min.x-b.min.x);
  const doorSeams={leftWallOverlap:doorOpening.left-doorIntervals[0].min.x,rightWallOverlap:doorIntervals[2].max.x-doorOpening.right,leafOverlaps:[doorIntervals[0].max.x-doorIntervals[1].min.x,doorIntervals[1].max.x-doorIntervals[2].min.x]};
  const tvNormal=new THREE.Vector3(0,0,1).transformDirection(tv.matrixWorld);
  const toSofa=sofa.position.clone().sub(tv.position).normalize();
  const islandBounds=new THREE.Box3().setFromObject(island),counterBounds=new THREE.Box3().setFromObject(rightCounter);
  const islandAxis=new THREE.Vector3(1,0,0).transformDirection(island.matrixWorld);
  const layout={shelfToSofa:sofaBounds.min.x-shelfBounds.max.x,sofaToCoffeeTable:tableBounds.min.x-sofaBounds.max.x,doorSeams,
    tvFacingSofa:tvNormal.dot(toSofa),tvCenterOffset:Math.abs(tv.position.z-sofa.position.z),
    islandLongAxis:islandAxis.toArray(),kitchenAisle:counterBounds.min.x-islandBounds.max.x,
    counterWallOverlap:counterBounds.max.x-6.16};
  // Physical brass plaque, kept separate from the reconstructed interior.
  box(0,-.28,5.403,2.08,.25,.025,'#c3aa6c',true);label(0,-.28,5.42,1.91,.17,'APARTMENT 4A','#c3aa6c','#62563b',root,39);
  root.updateMatrixWorld(true);
  const batches=new Map(), originals=new Set(), pieces=[];
  root.traverse(object=>{
    if(!object.isMesh)return;
    // Transparent glass must remain separately sorted for correct compositing.
    if(object.material.transparent)return;
    if(!batches.has(object.material))batches.set(object.material,[]);
    const geometry=object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    batches.get(object.material).push(geometry.applyMatrix4(object.matrixWorld));originals.add(object.geometry);pieces.push(object);
  });
  for(const object of pieces)object.removeFromParent();
  for(const [material,geometries]of batches){const merged=new THREE.Mesh(mergeGeometries(geometries),material);merged.castShadow=true;merged.receiveShadow=true;root.add(merged);geometries.forEach(g=>g.dispose());}
  // Shared primitive geometries are retained because the glass may still use one.
  return {root,lamps,lampMaterials,windowMaterial,screenMaterial,layout};
}
