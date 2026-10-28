(() => {
  const note = document.querySelector('.scene-note');
  window.addEventListener('error', (event) => {
    if (!note) return;
    if (event.target instanceof HTMLScriptElement) {
      const scriptName = event.target.src.split('/').pop() || 'script externo';
      note.textContent = `NÃO FOI POSSÍVEL CARREGAR ${scriptName}`;
      return;
    }
    const location = event.filename ? ` · ${event.filename.split('/').pop()}:${event.lineno || 0}` : '';
    note.textContent = `ERRO NA MAQUETE · ${event.message || 'falha de execução'}${location}`;
  });
  if (!window.THREE) {
    note.textContent = 'SEM CONEXÃO · RECARREGUE QUANDO HOUVER INTERNET';
    return;
  }
  const canvas = document.querySelector('#scene');
  const title = document.querySelector('#areaTitle');
  const description = document.querySelector('#areaDescription');
  const state = document.querySelector('#areaState');
  const data = document.querySelector('#areaData');
  const next = document.querySelector('#areaNext');
  const peopleCount = document.querySelector('#peopleCount');
  const clock = document.querySelector('#clock');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch (_) {
    note.textContent = 'WEBGL INDISPONÍVEL NESTE NAVEGADOR · abra pelo Chrome atualizado';
    return;
  }
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07120e, 26, 60);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  const defaultCamera = new THREE.Vector3(21, 22, 28);
  camera.position.copy(defaultCamera);
  const target = new THREE.Vector3(0, 0, 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const walkers = [];
  const vehicles = [];
  const vehicleHalfWidth = .28, vehicleHalfLength = .6, trafficLaneOffset = .14;
  const cycleStatus = document.querySelector('#cycleStatus');
  const dailyEventTime = document.querySelector('#dailyEventTime');
  const dailyEventTitle = document.querySelector('#dailyEventTitle');
  const dailyEventDetail = document.querySelector('#dailyEventDetail');
  const vehicleCount = document.querySelector('#vehicleCount');
  const sectorMeshes = [];
  const live = { loaded: false, areas: {}, dashboard: null };
  const db = window.supabase?.createClient?.(window.OPEIXEIRO_SUPABASE_URL, window.OPEIXEIRO_SUPABASE_ANON_KEY);
  const liveProfile = document.querySelector('#liveProfile');
  const livePassword = document.querySelector('#livePassword');
  const liveStatus = document.querySelector('#liveStatus');
  const liveLogin = document.querySelector('#liveLogin');
  const setLiveStatus = (message, error=false) => { liveStatus.textContent=message;liveStatus.className=error?'error':'ok'; };
  let motion = true, dragging = false, moved = false, previous = { x: 0, y: 0 }, orbit = { theta: .65, phi: .65, radius: 38 };

  const info = {
    P1: ['P1','Salão, caixa e rotinas locais.','Fluxo normal (simulado)','Pedidos, caixa e checklist','Associar fechamento e responsável'],
    P2: ['P2','Confeitaria, água e controle de validade.','Acompanhar filtro de água','Validade, fotos e pedidos','Ligar checklist anual do P2'],
    P3: ['P3','Operação local e pedidos.','Fluxo normal (simulado)','Pedidos e inventário','Cadastrar responsáveis'],
    P4: ['P4','Operação local e pedidos.','Fluxo normal (simulado)','Pedidos e inventário','Cadastrar responsáveis'],
    P5: ['P5','Bar e abastecimento.','Fluxo normal (simulado)','Pedidos, bebidas e reposição','Ligar resumo diário'],
    P6: ['P6','Gerência, recebimento de itens e pedidos.','Marcio · gerente e recebimento (simulado)','Pedidos, conferência e inventário','Ligar recebimentos ao resumo diário'],
    P7: ['P7','Operação local e pedidos.','Fluxo normal (simulado)','Pedidos e inventário','Cadastrar responsáveis'],
    Peixaria: ['Peixaria','Produção, catálogo, lotes e validade.','Área principal (simulada)','Leitura EAN, fotos e etiquetas','Ligar Validade PT260'],
    Estoque: ['Estoque','Entradas, saídas e inventário.','Área estrutural','Movimentações e divergências','Ligar catálogo e conferência'],
    Logística: ['Logística','Motoristas, rotas e comprovantes.','Área estrutural','Coletas, rotas e entregas','Ligar app do motorista']
  };
  const materials = { floor: new THREE.MeshStandardMaterial({ color:0x155c48, roughness:.82 }), wall: new THREE.MeshStandardMaterial({ color:0x1d7a61, transparent:true, opacity:.46, roughness:.5 }), accent: new THREE.MeshStandardMaterial({ color:0x27535c, transparent:true, opacity:.52 }), table: new THREE.MeshStandardMaterial({ color:0x765a36, roughness:.72 }), mint: new THREE.MeshStandardMaterial({ color:0x00bd83, emissive:0x003c27, emissiveIntensity:.7 }), yellow: new THREE.MeshStandardMaterial({ color:0xb68026, emissive:0x4e2b00, emissiveIntensity:.6 }) };

  scene.add(new THREE.HemisphereLight(0xb9f7de,0x07120e,2.8));
  const sun = new THREE.DirectionalLight(0xdcfff1,2.0); sun.position.set(12,25,9); scene.add(sun);
  const base = new THREE.Mesh(new THREE.BoxGeometry(32,.8,24),new THREE.MeshStandardMaterial({color:0x0f3027,roughness:.9})); base.position.y=-.5;base.receiveShadow=true;scene.add(base);
  const grid = new THREE.GridHelper(70,30,0x286e58,0x102d24);grid.position.y=-.88;scene.add(grid);
  const asphalt = new THREE.MeshStandardMaterial({color:0x26363b,roughness:.94});
  const roadPaint = new THREE.MeshStandardMaterial({color:0xc8d4c7,roughness:.8});
  const roadCenter = new THREE.MeshStandardMaterial({color:0xe4bd5d,roughness:.8});
  function roadSegment(x1,z1,x2,z2,width){
    const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),mx=(x1+x2)/2,mz=(z1+z2)/2;
    const road=new THREE.Mesh(new THREE.BoxGeometry(length,.05,width),asphalt);road.position.set(mx,-.075,mz);road.rotation.y=yaw;scene.add(road);
    const centerDash=new THREE.BoxGeometry(.78,.018,.045);
    for(let at=.9;at<length-.35;at+=1.65){const mark=new THREE.Mesh(centerDash,roadCenter);mark.position.set(x1+dx*(at/length),-.043,z1+dz*(at/length));mark.rotation.y=yaw;scene.add(mark);}
    const sideX=-dz/length,sideZ=dx/length;
    for(const side of [-1,1]){
      const edge=new THREE.Mesh(new THREE.BoxGeometry(length,.016,.035),roadPaint);edge.position.set(mx+sideX*side*(width/2-.1),-.045,mz+sideZ*side*(width/2-.1));edge.rotation.y=yaw;scene.add(edge);
    }
  }
  // Ruas ficam nas faixas livres entre os prédios; os dois corredores centrais conectam o depósito aos setores.
  roadSegment(-14.5,9.25,14.5,9.25,1.45);
  roadSegment(-14.5,2.75,14.5,2.75,1.45);
  roadSegment(-5.5,-4.75,14.5,-4.75,1.45);
  roadSegment(-14.5,-11.25,14.5,-11.25,1.45);
  roadSegment(-14.5,9.25,-14.5,-11.25,1.35);
  roadSegment(14.5,9.25,14.5,-11.25,1.35);
  roadSegment(2,2.75,2,-11.25,.95);
  roadSegment(5,2.75,5,9.25,.95);

  function label(text, color= '#dffff1') {
    const c=document.createElement('canvas'); c.width=512;c.height=128;const x=c.getContext('2d');x.font='700 52px Arial';x.textAlign='center';x.fillStyle='rgba(4,18,13,.78)';x.fillRect(0,10,512,100);x.fillStyle=color;x.fillText(text,256,78);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));sprite.scale.set(4.4,1.1,1);return sprite;
  }
  function personLabel(name, role, color='#eafff6') {
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='rgba(3,18,13,.82)';ctx.fillRect(0,4,512,118);ctx.textAlign='center';ctx.fillStyle=color;ctx.font='700 42px Arial';ctx.fillText(name,256,51);ctx.fillStyle='#c4dfd4';ctx.font='600 25px Arial';ctx.fillText(role,256,93);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));sprite.scale.set(2.9,.72,1);sprite.position.y=2.25;return sprite;
  }
  function sector(name,x,z,w,d,accent=false) {
    const group=new THREE.Group();group.userData={area:name,bounds:{minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}};group.position.set(x,0,z);
    const floor=new THREE.Mesh(new THREE.BoxGeometry(w,.24,d),(accent?materials.accent:materials.floor).clone());floor.position.y=0;floor.userData.area=name;group.userData.floor=floor;group.add(floor);
    const walls=[[-w/2+.12,1.25,0,.24,2.5,d],[w/2-.12,1.25,0,.24,2.5,d],[0,1.25,-d/2+.12,w,2.5,.24],[0,1.25,d/2-.12,w,2.5,.24]];
    walls.forEach(([a,b,c,ww,hh,dd])=>{const wall=new THREE.Mesh(new THREE.BoxGeometry(ww,hh,dd),materials.wall);wall.position.set(a,b,c);wall.userData.area=name;group.add(wall);});
    const sign=label(name,accent?'#bce9ff':'#dffff1');sign.position.set(0,3.1,0);group.add(sign);
    scene.add(group);sectorMeshes.push(group);return group;
  }
  function table(x,z,area){const g=new THREE.Group();g.userData.area=area;const top=new THREE.Mesh(new THREE.BoxGeometry(1.6,.16,.8),materials.table);top.position.y=.72;top.castShadow=true;g.add(top);for(const dx of [-.65,.65])for(const dz of [-.28,.28]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,.7,.1),materials.table);leg.position.set(dx,.35,dz);g.add(leg);}g.position.set(x,0,z);scene.add(g);return g;}
  function worker(x,z,area,name,role,shift=0,tint=0x00bd83){const g=new THREE.Group();g.userData={area,role:`${name} · ${role}`};const uniform=materials.mint.clone();uniform.color.setHex(tint);const body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.27,.72,10),uniform);body.position.y=.9;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,10),new THREE.MeshStandardMaterial({color:0xffc89d,roughness:.8}));head.position.y=1.47;g.add(body,head);const armL=new THREE.Mesh(new THREE.BoxGeometry(.1,.55,.1),uniform),armR=armL.clone();armL.position.set(-.3,.98,0);armR.position.set(.3,.98,0);g.add(armL,armR,personLabel(name,role));g.position.set(x,0,z);scene.add(g);walkers.push({g,armL,armR,origin:new THREE.Vector3(x,0,z),phase:shift,area,role:`${name} · ${role}`});}
  sector('P1',-10,6,5,5);sector('P2',-4,6,5,5);sector('P3',2,6,5,5);sector('P4',8,6,5,5);sector('P5',11,-1,5,6);sector('P6',5,-1,5,6);sector('P7',-1,-1,5,6);sector('Peixaria',-10,-4,7,7,true);sector('Estoque',-2,-8,7,5,true);sector('Logística',7,-8,7,5,true);
  const roster=[
    ['P1','Alisson','Gerência'],['P1','Antonio','Cozinha'],['P1','Laura','Conferência'],['P1','Barman · 3450','Chefe de bar'],
    ['P2','Gabriel','Chefe de cozinha'],['P2','Maria','Cozinha'],['P2','Lia','Caixa'],['P2','Rodrigo','Confeitaria'],['P2','Rodolfo','Rotisseria'],['P2','Rafaela','Conferência'],['P2','Danilo · 7680','Bar'],
    ['P3','Diego','Cozinha'],['P3','Equipe P3','Conferência'],['P4','João Gabriel','Responsável'],['P4','Bento','Bar'],['P5','Durval','Cozinha'],['P5','Camila','Bar'],['P6','Kayke','Bar'],['P6','Marcio','Gerente · recebimento'],['P7','Equipe P7','Operação'],
    ['Peixaria','Carol','Despacho'],['Peixaria','Caroline','Produção'],['Peixaria','Equipe','Conferência'],['Estoque','Claudio','Bebidas'],['Estoque','Equipe','Conferência'],['Logística','Douglas','Logística'],['Logística','Motorista','Entrega'],['Logística','Equipe','Rota']
  ];
  const zones={P1:[-10,6,0x00bd83],P2:[-4,6,0xffbd45],P3:[2,6,0x00bd83],P4:[8,6,0x00bd83],P5:[11,-1,0x00bd83],P6:[5,-1,0x00bd83],P7:[-1,-1,0x00bd83],Peixaria:[-10,-4,0x48a7ff],Estoque:[-2,-8,0x48a7ff],Logística:[7,-8,0x48a7ff]};
  const placed=new Set();
  roster.forEach(([area,name,role],index)=>{const [x,z,tint]=zones[area];const inArea=roster.filter(item=>item[0]===area).indexOf(roster[index]);const col=inArea%3,row=Math.floor(inArea/3);if(!placed.has(area)){table(x-.8,z-.5,area);placed.add(area);}worker(x+(col-1)*.85,z+(row-.5)*.9,area,name,role,index*.73,tint);});
  peopleCount.textContent=walkers.length;

  function car(color, route, driverName, destinations, offset=0){
    const g=new THREE.Group();g.userData={area:'Logística',role:`Motorista ${driverName} · entrega para ${destinations}`};
    const paint=new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.18});
    const body=new THREE.Mesh(new THREE.BoxGeometry(.56,.38,1.2),paint);body.position.y=.38;body.castShadow=true;g.add(body);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(.5,.32,.54),new THREE.MeshStandardMaterial({color:0x9bd6e8,transparent:true,opacity:.8,roughness:.15}));cabin.position.set(0,.72,.14);cabin.castShadow=true;g.add(cabin);
    const driverBody=new THREE.Mesh(new THREE.CylinderGeometry(.095,.12,.24,8),new THREE.MeshStandardMaterial({color:0x173b33,roughness:.8}));driverBody.position.set(0,.59,.15);g.add(driverBody);
    const driverHead=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshStandardMaterial({color:0xf0bd96,roughness:.8}));driverHead.position.set(0,.79,.16);g.add(driverHead);
    const cargo=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.44),new THREE.MeshStandardMaterial({color:0xb68a52,roughness:.9}));cargo.position.set(0,.65,-.38);cargo.castShadow=true;g.add(cargo);
    for(const x of [-.29,.29])for(const z of [-.4,.4]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.08,12),new THREE.MeshStandardMaterial({color:0x101211,roughness:.9}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.17,z);g.add(wheel);}
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(.08,8,8),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1}));beacon.position.set(0,.94,-.04);g.add(beacon);
    const nameTag=label(driverName,'#ffffff');nameTag.scale.set(1.85,.46,1);nameTag.position.set(0,1.35,0);g.add(nameTag);
    const vehicle={g,route,label:driverName,destinations,offset,color,trafficDelay:0,currentPose:null};
    vehicle.currentPose=routePose(vehicle,0);
    g.position.copy(vehicle.currentPose.position);g.position.y=.04;g.rotation.y=Math.atan2(vehicle.currentPose.direction.x,vehicle.currentPose.direction.z);
    scene.add(g);vehicles.push(vehicle);
  }
  const depotGate=new THREE.Vector3(7,0,-11.25), eastBottom=new THREE.Vector3(14.5,0,-11.25), eastMiddle=new THREE.Vector3(14.5,0,2.75), eastTop=new THREE.Vector3(14.5,0,9.25), p1Gate=new THREE.Vector3(-10,0,2.75), p3Gate=new THREE.Vector3(2,0,2.75), p4Gate=new THREE.Vector3(8,0,9.25), centralBottom=new THREE.Vector3(2,0,-11.25), p6Gate=new THREE.Vector3(2,0,-4.75);
  car(0xffbd45,[depotGate,eastBottom,eastMiddle,p3Gate,eastMiddle,eastBottom,depotGate,centralBottom,p6Gate,centralBottom,depotGate],'Edimar','P3 e P6',0);
  car(0x45b3ff,[depotGate,eastBottom,eastMiddle,p1Gate,eastMiddle,eastBottom,depotGate],'Motorista 2','P1',5.5);
  car(0xff5f70,[depotGate,eastBottom,eastTop,p4Gate,eastTop,eastBottom,depotGate],'Motorista 3','P4',11);
  vehicleCount.textContent=vehicles.length;

  const reportEvents = [
    { time:'00:23', title:'Lista de pedidos do P3', detail:'Pedido do setor entra na fila de separação.', area:'P3' },
    { time:'08:26–11:38', title:'13 fotos recebidas', detail:'Itens enviados no grupo Pedidos Recebidos para conferência.', area:'Peixaria' },
    { time:'13:10–13:25', title:'Reposição urgente no P1', detail:'Gelo solicitado; em seguida, pedido de laranja.', area:'P1' },
    { time:'16:55–16:58', title:'Reposição urgente no P4', detail:'Pedido do setor seguido pela solicitação de gelo.', area:'P4' },
    { time:'17:11', title:'Foto registrada no grupo Bar', detail:'Registro visual anexado após a movimentação.', area:'P4' },
    { time:'FECHAMENTO', title:'Retorno à logística', detail:'Veículos fecham a rota; o ciclo recomeça em 20 segundos.', area:'Logística' },
  ];
  let currentReportEvent = -1;

  function pointOnRoute(route, progress){
    if(!Array.isArray(route)||route.length===0)throw new Error('Rota sem pontos cadastrados');
    if(route.length===1)return {position:route[0].clone(),direction:new THREE.Vector3(1,0,0),leg:0};
    const lengths=[];let total=0;
    for(let i=1;i<route.length;i++){const length=route[i-1].distanceTo(route[i]);lengths.push(length);total+=length;}
    let distance=progress*total;
    for(let i=0;i<lengths.length;i++){
      if(distance<=lengths[i]){const amount=lengths[i]===0?0:distance/lengths[i];return {position:route[i].clone().lerp(route[i+1],amount),direction:route[i+1].clone().sub(route[i]).normalize(),leg:i};}
      distance-=lengths[i];
    }
    return {position:route[route.length-1].clone(),direction:new THREE.Vector3(1,0,0),leg:route.length-2};
  }
  function routePose(vehicle,time){
    const cycle=20,local=(((time+vehicle.offset-vehicle.trafficDelay)%cycle)+cycle)%cycle/cycle;
    const frame=pointOnRoute(vehicle.route,local);
    frame.position.x+=frame.direction.z*trafficLaneOffset;
    frame.position.z-=frame.direction.x*trafficLaneOffset;
    return frame;
  }
  function vehicleHitsSector(pose,group){
    const bounds=group.userData.bounds;
    if(!bounds)return false;
    const rightX=pose.direction.z,rightZ=-pose.direction.x;
    const halfX=vehicleHalfLength*Math.abs(pose.direction.x)+vehicleHalfWidth*Math.abs(rightX)+.025;
    const halfZ=vehicleHalfLength*Math.abs(pose.direction.z)+vehicleHalfWidth*Math.abs(rightZ)+.025;
    return pose.position.x+halfX>bounds.minX&&pose.position.x-halfX<bounds.maxX&&pose.position.z+halfZ>bounds.minZ&&pose.position.z-halfZ<bounds.maxZ;
  }
  function updateVehicles(t,deltaTime){
    const cycle=20;const seconds=t%cycle;const remaining=Math.max(0,Math.ceil(cycle-seconds));const moving=[];let waiting=0;
    const candidates=vehicles.map(vehicle=>routePose(vehicle,t));
    vehicles.forEach((vehicle,index)=>{
      const blockedBySector=sectorMeshes.some(group=>vehicleHitsSector(candidates[index],group));
      if(blockedBySector){
        waiting++;
        vehicle.trafficDelay+=deltaTime;
      }else moving.push(vehicle.label);
      const pose=blockedBySector?vehicle.currentPose:candidates[index];
      vehicle.currentPose=pose;vehicle.g.position.copy(pose.position);vehicle.g.position.y=.04;vehicle.g.rotation.y=Math.atan2(pose.direction.x,pose.direction.z);
    });
    const eventIndex=Math.min(reportEvents.length-1,Math.floor(seconds/(cycle/reportEvents.length)));
    if(eventIndex!==currentReportEvent){
      currentReportEvent=eventIndex;
      const event=reportEvents[eventIndex];
      dailyEventTime.textContent=`${event.time} · RELATÓRIO 28/10/2026`;
      dailyEventTitle.textContent=event.title;
      dailyEventDetail.textContent=event.detail;
      sectorMeshes.forEach(group=>{const floor=group.userData.floor;if(!floor)return;const active=group.userData.area.toUpperCase()===event.area.toUpperCase()||(event.area==='Logística'&&group.userData.area==='Logística');floor.material.emissive.setHex(active?0x145a44:0x000000);floor.material.emissiveIntensity=active?0.75:0;});
    }
    const waitingText=waiting?` · ${waiting} aguardando obstáculo`:'';
    cycleStatus.textContent=`Rota de 20 s · ${remaining}s para reiniciar · ${moving.slice(0,2).join(' + ')||'retorno à logística'}${waitingText}`;
  }

  function renderSize(){const box=canvas.getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();}
  function placeCamera(){camera.position.set(target.x+orbit.radius*Math.sin(orbit.theta)*Math.cos(orbit.phi),target.y+orbit.radius*Math.sin(orbit.phi)+7,target.z+orbit.radius*Math.cos(orbit.theta)*Math.cos(orbit.phi));camera.lookAt(target);}
  function choose(area,role=''){const item=info[area];if(!item)return;const liveArea=live.areas[area.toUpperCase()]||live.areas[area]||null;title.textContent=item[0];description.textContent=role?`${item[1]} Personagem selecionado: ${role}.` : item[1];state.textContent=liveArea?`${liveArea.orders} pedido(s) nos últimos 7 dias` : item[2];data.textContent=role?`${role} · vínculo individual permanece protegido no Supabase.`:liveArea?`${liveArea.workers} função(ões) vinculada(s) · status: ${Object.entries(liveArea.order_statuses||{}).map(([key,value])=>`${key} ${value}`).join(', ')||'sem pedidos no período'}`:item[3];next.textContent=live.loaded?'Dados carregados com sessão administrativa. Atualização automática a cada 30 segundos.':item[4];}
  async function invokeLive(body){const {data,error}=await db.functions.invoke('opeixeiro-auth',{body});if(!error)return data;let message='Não foi possível carregar os dados.';try{const detail=await error.context?.clone?.().json();if(detail?.error)message=detail.error;}catch(_){}throw new Error(message);}
  async function loadProfiles(){if(!db||!window.OpeixeiroAuth){setLiveStatus('A autenticação administrativa não foi carregada.',true);return;}try{const profiles=await window.OpeixeiroAuth.listProfiles(db,'panel');liveProfile.replaceChildren(new Option('Selecione seu perfil',''));profiles.forEach(profile=>liveProfile.add(new Option(profile.display_name,profile.display_name)));setLiveStatus('Entre com o perfil administrativo para carregar os dados reais.');}catch(error){setLiveStatus(error.message||'Não foi possível carregar os perfis.',true);}}
  function applyLiveData(){sectorMeshes.forEach(group=>{const key=group.userData.area==='Logística'?'LOGISTICA':String(group.userData.area).toUpperCase();const area=live.areas[key];if(!group.userData.floor||!area)return;const material=group.userData.floor.material;if(area.orders>0){material.color.setHex(0xb68026);material.emissive?.setHex(0x472a00);material.emissiveIntensity=.38;}else{material.color.setHex(key==='PEIXARIA'||key==='ESTOQUE'||key==='LOGISTICA'?0x27535c:0x155c48);material.emissive?.setHex(0x000000);material.emissiveIntensity=0;}});}
  async function refreshDashboard(){const data=await invokeLive({action:'get_3d_dashboard'});live.loaded=true;live.areas=data.areas||{};live.dashboard=data;applyLiveData();const dispatch=Object.entries(data.dispatches||{}).map(([key,value])=>`${key}: ${value}`).join(' · ')||'sem despachos nos últimos 7 dias';setLiveStatus(`Resumo real carregado · despachos: ${dispatch}`);choose(title.textContent==='Visão geral'?'Logística':title.textContent);}
  async function loginLive(){const displayName=liveProfile.value;if(!displayName)return setLiveStatus('Selecione o perfil administrativo.',true);liveLogin.disabled=true;setLiveStatus('Autenticando e carregando dados…');try{const actor=await window.OpeixeiroAuth.signIn(db,'panel',displayName,livePassword.value);livePassword.value='';if(!actor.is_admin){await db.auth.signOut();throw new Error('Este perfil não tem permissão administrativa para a maquete.');}await refreshDashboard();liveLogin.textContent='Atualizar agora';}catch(error){setLiveStatus(error.message||'Não foi possível entrar.',true);}finally{liveLogin.disabled=false;}}
  function pick(event){const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(scene.children,true).find(item=>item.object.userData.area||item.object.parent?.userData.area);let object=hit?.object;while(object&&!object.userData.area)object=object.parent;if(object?.userData.area)choose(object.userData.area,object.userData.role||'');}
  canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;previous={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-previous.x,dy=e.clientY-previous.y;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;orbit.theta-=dx*.008;orbit.phi=Math.max(.15,Math.min(1.25,orbit.phi+dy*.006));previous={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{dragging=false;if(!moved)pick(e);});canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=Math.max(21,Math.min(52,orbit.radius+e.deltaY*.018));},{passive:false});
  document.querySelector('#resetView').onclick=()=>{orbit={theta:.65,phi:.65,radius:38};};
  liveLogin.addEventListener('click', async ()=>{if(live.loaded) await refreshDashboard();else await loginLive();});
  loadProfiles();setInterval(()=>{if(live.loaded)refreshDashboard().catch(()=>setLiveStatus('Não foi possível atualizar agora.',true));},30_000);
  document.querySelector('#toggleMotion').onclick=e=>{motion=!motion;e.currentTarget.textContent=motion?'Pausar pessoas':'Retomar pessoas';};
  function updateClock(){clock.textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date());}updateClock();setInterval(updateClock,1000);
  let lastFrameAt=performance.now(),simulationTime=0;
  function loop(){const now=performance.now(),deltaTime=Math.min(Math.max((now-lastFrameAt)/1000,0),1/30);lastFrameAt=now;simulationTime+=deltaTime;const t=simulationTime;updateVehicles(t,deltaTime);if(motion)walkers.forEach((w,i)=>{const s=t*1.8+w.phase;w.g.position.x=w.origin.x+Math.sin(s)*.38;w.g.position.z=w.origin.z+Math.cos(s*.8)*.28;w.g.rotation.y=Math.sin(s)*.6;w.armL.rotation.z=Math.sin(s*2)*.55;w.armR.rotation.z=-Math.sin(s*2)*.55;});placeCamera();renderer.render(scene,camera);requestAnimationFrame(loop);}
  note.textContent = 'SIMULAÇÃO VISUAL · RUAS, ENTREGAS E TRÁFEGO';
  new ResizeObserver(renderSize).observe(canvas);renderSize();placeCamera();loop();
})();
