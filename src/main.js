import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildApartment } from './replica.js';

const loading = document.querySelector('#loading');
try { init(); } catch (error) {
  loading.remove();
  document.querySelector('#error').hidden = false;
  console.error('Apartment 4A could not start:', error);
}

function init() {
  const container = document.querySelector('#scene');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '可拖动旋转、滚轮缩放的公寓三维模型');
  renderer.domElement.setAttribute('tabindex','0');
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false; controls.minDistance = 13; controls.maxDistance = 33;
  controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI / 2.08;
  controls.rotateSpeed = .65; controls.zoomSpeed = .8;
  // Closed walls stay at the rear, but the model can be inspected from any azimuth.
  const target = new THREE.Vector3(0, .65, 0);
  controls.target.copy(target);
  const initialOffset = new THREE.Vector3(15.0, 14.0, 20.0);
  function resetView() {
    // Consume and clear pending damping before applying the home camera position.
    controls.enableDamping=false;controls.update();
    camera.position.copy(target).add(initialOffset);controls.target.copy(target);
    controls.update();controls.enableDamping=true;
  }
  resetView();
  document.querySelector('#reset').addEventListener('click',resetView);
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();resetView();});
  const hemi = new THREE.HemisphereLight('#f5f0dd','#a6a38c',2.25);scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d2',3.0);
  sun.position.set(-3,11,7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});
  sun.shadow.normalBias=.035;sun.shadow.bias=-.00012;sun.shadow.radius=4;
  scene.add(sun);
  const fill=new THREE.DirectionalLight('#d5e6ea',1.0);fill.position.set(6,5,2);scene.add(fill);
  const apartment=buildApartment(scene);
  const groundMat=new THREE.ShadowMaterial({color:'#30352d',opacity:.16});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),groundMat);
  ground.rotation.x=-Math.PI/2;ground.position.y=-.57;ground.receiveShadow=true;scene.add(ground);
  // A transparent contact shadow anchors the plinth even in overcast lighting.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,5,64,64,64);
  gradient.addColorStop(0,'rgba(55,49,38,.22)');gradient.addColorStop(.65,'rgba(55,49,38,.11)');gradient.addColorStop(1,'rgba(55,49,38,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(16,13),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  contact.rotation.x=-Math.PI/2;contact.position.set(.35,-.558,.3);scene.add(contact);
  // Rain is restricted to the exterior strips behind and beside the apartment.
  const rainCount=450, rainPositions=new Float32Array(rainCount*6), rainData=[];
  let randomSeed=95;
  const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
  for(let i=0;i<rainCount;i++) {
    const behind=i%2===0;
    rainData.push({x:behind?random()*16-8:6.65+random()*1.7,y:random()*7.5,z:behind?-5.75-random()*1.5:random()*10.5-5.25,speed:4.5+random()*2,length:.13+random()*.2});
  }
  const rainGeometry=new THREE.BufferGeometry();
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));
  const rainMaterial=new THREE.LineBasicMaterial({color:'#afc7d6',transparent:true,opacity:0,depthWrite:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const states={
    sunny:{bg:'#f3f0e9',sky:'#f5f0dd',ground:'#a6a38c',sunColor:'#fff1d2',sun:3,hemi:2.25,fill:1,lamps:0,shade:.04,rain:0,window:'#bddadd',windowGlow:.22,screen:.06,exposure:1.28,name:'晴日午后',time:'14:30',description:'阳光刚好，今天也适合待在家。'},
    rainy:{bg:'#d9e1e5',sky:'#c9d9e8',ground:'#8a979c',sunColor:'#c2d5ec',sun:.70,hemi:1.65,fill:.7,lamps:2.0,shade:.48,rain:.47,window:'#849eae',windowGlow:.14,screen:.18,exposure:1.13,name:'听雨时分',time:'16:10',description:'窗外下着雨，故事留在屋子里。'},
    night:{bg:'#1d293a',sky:'#8398bd',ground:'#596376',sunColor:'#b5ccff',sun:.6,hemi:.82,fill:.38,lamps:5.8,shade:1.5,rain:0,window:'#324c72',windowGlow:.27,screen:.5,exposure:1.15,name:'晚安，宇宙',time:'21:45',description:'灯亮着，今晚的小宇宙还没入睡。'},
  };
  const colorKeys=['bg','sky','ground','sunColor','window'];
  const numberKeys=['sun','hemi','fill','lamps','shade','rain','windowGlow','screen','exposure'];
  function values(state){const result={};for(const k of colorKeys)result[k]=new THREE.Color(state[k]);for(const k of numberKeys)result[k]=state[k];return result;}
  let current=values(states.sunny), start=values(states.sunny), destination=values(states.sunny), elapsed=1;
  let mode='sunny';
  const buttons=[...document.querySelectorAll('[data-mode]')];
  function setWeather(next) {
    if(!states[next])return;
    mode=next;start={};
    for(const k of colorKeys)start[k]=current[k].clone();
    for(const k of numberKeys)start[k]=current[k];
    destination=values(states[next]);elapsed=0;
    document.body.dataset.weather=next;
    document.querySelector('meta[name="theme-color"]').content=states[next].bg;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===next)));
    document.querySelector('#weather-name').textContent=states[next].name;
    document.querySelector('#weather-time').textContent=states[next].time;
    document.querySelector('#weather-description').textContent=states[next].description;
  }
  buttons.forEach(button=>button.addEventListener('click',()=>setWeather(button.dataset.mode)));
  // Arrow keys on the focused canvas complement OrbitControls' pointer gestures.
  renderer.domElement.addEventListener('keydown',event=>{
    const delta=camera.position.clone().sub(controls.target);
    const spherical=new THREE.Spherical().setFromVector3(delta);
    if(event.key==='ArrowLeft')spherical.theta-=.10;
    else if(event.key==='ArrowRight')spherical.theta+=.10;
    else if(event.key==='ArrowUp')spherical.phi-=.08;
    else if(event.key==='ArrowDown')spherical.phi+=.08;
    else if(event.key==='+'||event.key==='=')spherical.radius*=.9;
    else if(event.key==='-')spherical.radius*=1.1;
    else if(event.key==='Home'){resetView();event.preventDefault();return;}
    else return;
    event.preventDefault();spherical.phi=THREE.MathUtils.clamp(spherical.phi,controls.minPolarAngle,controls.maxPolarAngle);
    spherical.radius=THREE.MathUtils.clamp(spherical.radius,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
  });
  function resize() {
    const {width:w,height:h}=container.getBoundingClientRect();
    renderer.setSize(w,h);camera.aspect=w/h;camera.clearViewOffset();
    const minVerticalFov=window.innerWidth>600&&window.innerWidth<=1100&&window.innerHeight>700?26:32;
    camera.fov=Math.max(minVerticalFov,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(19))/camera.aspect)));
    controls.minDistance=window.innerWidth<=600?24:17;controls.maxDistance=42;
    camera.updateProjectionMatrix();controls.update();
  }
  window.addEventListener('resize',resize);resize();
  let frame=0, previous=0, contextLost=false;
  function render(now) {
    frame=0;
    if(document.hidden||contextLost)return;
    const wallDt=previous?(now-previous)/1000:0,dt=Math.min(wallDt,.05);previous=now;
    elapsed=Math.min(1,elapsed+(reducedMotion.matches?1:wallDt));
    const t=elapsed*elapsed*(3-2*elapsed);
    for(const k of colorKeys)current[k].copy(start[k]).lerp(destination[k],t);
    for(const k of numberKeys)current[k]=THREE.MathUtils.lerp(start[k],destination[k],t);
    document.body.style.backgroundColor=current.bg.getStyle();
    hemi.color.copy(current.sky);hemi.groundColor.copy(current.ground);hemi.intensity=current.hemi;
    sun.color.copy(current.sunColor);sun.intensity=current.sun;fill.intensity=current.fill;
    apartment.lamps.forEach((lamp,i)=>{lamp.intensity=current.lamps*(i===2?1.35:1);});
    apartment.lampMaterials.forEach(material=>{material.emissiveIntensity=current.shade;});
    apartment.windowMaterial.color.copy(current.window);apartment.windowMaterial.emissive.copy(current.window);apartment.windowMaterial.emissiveIntensity=current.windowGlow;
    apartment.screenMaterial.emissiveIntensity=current.screen;renderer.toneMappingExposure=current.exposure;
    rainMaterial.opacity=current.rain;rain.visible=current.rain>.002;
    if(rain.visible){
      rainData.forEach((drop,i)=>{
        if(!reducedMotion.matches){drop.y-=dt*drop.speed;if(drop.y<-.4)drop.y=7.2;}
        const j=i*6;rainPositions[j]=drop.x;rainPositions[j+1]=drop.y;rainPositions[j+2]=drop.z;
        rainPositions[j+3]=drop.x-.025;rainPositions[j+4]=drop.y+drop.length;rainPositions[j+5]=drop.z;
      });rainGeometry.attributes.position.needsUpdate=true;
    }
    controls.update();renderer.render(scene,camera);
    frame=requestAnimationFrame(render);
  }
  function resume(){if(!frame&&!document.hidden&&!contextLost){previous=0;frame=requestAnimationFrame(render);}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;
    const error=document.querySelector('#error');error.hidden=false;
    error.querySelector('h2').textContent='画面暂时中断';
    error.querySelector('p').textContent='浏览器正在恢复图形环境。若画面未恢复，请刷新页面。';
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;document.querySelector('#error').hidden=true;resume();});
  renderer.render(scene,camera);
  loading.style.opacity='0';setTimeout(()=>loading.remove(),450);
  document.body.dataset.ready='true';
  // Small read-only diagnostics for repeatable browser verification.
  window.apartment4A=Object.freeze({inspect:()=>({mode,camera:camera.position.toArray(),target:controls.target.toArray(),layout:apartment.layout,rainVisible:rain.visible,rainOpacity:rainMaterial.opacity,lamps:apartment.lamps.map(l=>l.intensity),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,animationScheduled:!!frame,exteriorRain:rainData.every(d=>d.z<-5.5||d.x>6.5)})});
  resume();
}
