// Shared dummy data + avatar wiring for UI proposals F/G/H.
// Uses the live portrait generator — do not fork or restyle the faces.
(function(){
window.store = window.store || {G:{countryId:'PL',teams:[{id:0,name:'KS Piorun'},{id:1,name:'MKS Blyskawica'},{id:2,name:'UKS Sokol'}]}};

const P=[
 {n:'Mściwoj Mroczek',a:29,s:'FH topspin',o:83,pk:86,st:[84,84,82,77,84,84],f:'Passa',ft:24,w:'63 452',y:2},
 {n:'Izydor Ignaczak',a:31,s:'Dwuskrzydłowy',o:77,pk:80,st:[71,71,94,71,72,83],f:'Gorący',ft:12,w:'30 956',y:1},
 {n:'Otton Czerwonka',a:29,s:'Kontra/blok',o:75,pk:78,st:[64,77,80,84,76,73],f:'Stabilny',ft:81,w:'23 952',y:3},
 {n:'Strzeżymir Jasiński',a:22,s:'Dwuskrzydłowy',o:71,pk:84,st:[70,76,84,63,63,63],f:'Spadek',ft:8,w:'14 552',y:1},
 {n:'Pakosław Prus',a:19,s:'Defensywny',o:64,pk:79,st:[58,66,61,72,70,60],f:'Rośnie',ft:0,w:'8 100',y:2},
 {n:'Bolesław Kot',a:26,s:'Blokujący',o:69,pk:73,st:[66,70,68,71,69,70],f:'Stabilny',ft:30,w:'17 400',y:2},
];
const M=[
 {n:'Krzesisław Izdebski',c:'SKS Delfin',t:'Przedłużenie',a:26,o:86,pk:92,w:'180 598',fee:'—',s:'Ostatni rok'},
 {n:'Jacek Górski',c:'Wolny agent',t:'Trener',a:30,o:89,pk:93,w:'31 279',fee:'—',s:'Dostępny'},
 {n:'Sykstus Ulatowski',c:'Wolny agent',t:'Skaut',a:53,o:97,pk:99,w:'70 800',fee:'—',s:'Dostępny'},
 {n:'Aureliusz Lisowski',c:'UKS Sokół',t:'Transfer',a:33,o:85,pk:85,w:'56 300',fee:'18 204',s:'Od przyszłego sezonu'},
 {n:'Damian Sieczka',c:'SKS Delfin',t:'Trener',a:32,o:87,pk:91,w:'27 066',fee:'—',s:'Za długi kontrakt'},
];
const T=[['KTS Pantera',19,83],['GKS Wicher',16,82],['KS Piorun',14,79],['AKS Feniks',13,82],['MKS Błyskawica',11,79],['UKS Sokół',10,79]];
const SL=['FH','BH','SRV','RET','FTW','MEN'];
const AL=['Forehand','Backhand','Serwis','Odbiór','Nogi','Głowa'];
const vc=v=>v>=88?'v5':v>=80?'v4':v>=70?'v3':v>=60?'v2':'v1';
const fc=f=>f==='Gorący'||f==='Rośnie'||f==='Passa'?'pos':f==='Spadek'?'neg':'';
const vis=window.PPM&&window.PPM.gameplayVisuals;
const av=(i,n,a)=>vis.getAvatarData({id:400+i,name:n,age:a,nationality:'PL',teamId:i%3},'player');

function paintFaces(){
  document.querySelectorAll('[data-av]').forEach((el,i)=>{
    const p=P[i%P.length];
    el.style.backgroundImage=`url("${av(i,p.n,p.a)}")`;
  });
}
function fill(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}

fill('hubRows',P.slice(0,4).map((p,i)=>`<tr>
 <td class="n dim">${i+1}</td>
 <td><span class="face" style="background-image:url('${av(i,p.n,p.a)}')"></span><span class="pname">${p.n}</span></td>
 <td class="dim">${p.s}</td><td class="n"><span class="pill ${fc(p.f)}">${p.f}</span></td>
 <td class="n ${p.ft>70?'neg':''}">${p.ft}%</td><td class="n ${vc(p.o)}">${p.o}</td></tr>`).join(''));

fill('tableRows',T.map((t,i)=>`<tr class="${t[0]==='KS Piorun'?'on':''}">
 <td class="n ${i===0?'v4':'dim'}">${i+1}</td><td class="${t[0]==='KS Piorun'?'pname':''}">${t[0]}</td>
 <td class="n">${t[1]}</td><td class="n dim">${t[2]}</td></tr>`).join(''));

fill('squadRows',P.map((p,i)=>`<tr class="${i===0?'on':''}">
 <td class="n dim">${i<4?i+1:'·'}</td>
 <td><span class="face" style="background-image:url('${av(i,p.n,p.a)}')"></span><span class="pname">${p.n}</span></td>
 <td class="dim">${p.s}</td><td class="n dim">${p.a}</td><td class="n ${vc(p.o)}">${p.o}</td><td class="n dim">${p.pk}</td>
 ${p.st.map(v=>`<td class="n ${vc(v)}">${v}</td>`).join('')}
 <td class="n"><span class="pill ${fc(p.f)}">${p.f}</span></td>
 <td class="n ${p.ft>70?'neg':''}">${p.ft}%</td>
 <td class="n">${p.w}</td><td class="n dim">${p.y}</td></tr>`).join(''));

fill('marketRows',M.map((m,i)=>`<tr>
 <td><span class="face" style="background-image:url('${av(i+9,m.n,m.a)}')"></span></td>
 <td class="pname">${m.n}</td><td class="dim">${m.c}</td>
 <td><span class="pill ${m.t==='Przedłużenie'?'warn':''}">${m.t}</span></td>
 <td class="n dim">${m.a}</td><td class="n ${vc(m.o)}">${m.o}</td>
 <td class="n dim">${m.pk}</td><td class="n">${m.w}</td><td class="n dim">${m.fee}</td>
 <td class="dim">${m.s}</td>
 <td class="n"><button class="btn xs">Otwórz</button></td></tr>`).join(''));

const insp=document.getElementById('inspStats');
if(insp){
  insp.innerHTML=P[0].st.map((v,j)=>`<div>
    <div class="attr-row"><span>${AL[j]}</span><b class="${vc(v)}">${v}</b></div>
    <span class="bar"><i style="width:${v}%"></i></span></div>`).join('');
}

const boards=document.getElementById('boards');
if(boards){
  boards.innerHTML=P.slice(0,4).map((p,i)=>`<div class="board">
    <div class="board-n">${i+1}</div>
    <div class="face lg" style="background-image:url('${av(i,p.n,p.a)}')"></div>
    <div class="board-who"><b>${p.n.split(' ')[1]}</b><span>${p.s}</span></div>
    <div class="board-o ${vc(p.o)}">${p.o}</div>
  </div>`).join('');
}

paintFaces();

document.querySelectorAll('.rnav[data-go], .tab[data-go]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.rnav,.tab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll(`[data-go="${b.dataset.go}"]`).forEach(x=>x.classList.add('on'));
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  const scr=document.getElementById('s-'+b.dataset.go);
  if(scr)scr.classList.add('on');
  window.scrollTo(0,0);
});
})();
