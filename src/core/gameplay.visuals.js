(function(){
window.PPM = window.PPM || {};

function hashSeed(str){
  let h=2166136261;
  const txt=String(str||'ppm');
  for(let i=0;i<txt.length;i++){
    h^=txt.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return Math.abs(h>>>0);
}

function avatarPalette(seed){
  const palettes=[
    ['#c84d32','#f6d2bb','#532314'],
    ['#2d6a9f','#d7edf8','#16354d'],
    ['#7e4aa8','#ead9fa','#35174e'],
    ['#2f8a57','#dcf4e5','#153926'],
    ['#c58d1b','#f9ebc0','#4d3609'],
    ['#bb3f63','#f8d0dc','#4c1024']
  ];
  return palettes[seed%palettes.length];
}

// Independent pick from seed so faces don't all share the same "look".
function sPick(seed,salt,n){return Math.abs(Math.imul(seed^(salt>>>0),2654435761))%n;}
// Same idea, but a 0..1 fraction — used for small continuous jitter (face width,
// eye spacing) so two men with identical "features" still don't look like twins.
function sFrac(seed,salt){return (Math.abs(Math.imul(seed^((salt+7777)>>>0),2246822519))%10000)/10000;}
const r1=v=>Math.round(v*10)/10;

// =============================================================================
// PORTRAIT GENERATOR
// Flat-vector male sports portraits, drawn in a 96x96 viewBox.
//
// The region/ethnicity model is deliberately UNCHANGED from the first version:
// the same nationality -> region families, the same skin / hair / iris pools and
// the same per-region feature frequencies. All the new work sits on top of it:
//   - real head construction (skull -> jaw -> chin path, neck, shoulders) so the
//     face reads at 40px instead of being an ellipse with a hat;
//   - hairlines built from a curve (straight / peak / receding / M) inside a
//     skull clip, so hair can never fall over the eyebrows;
//   - beards clipped to the face, so they follow the jaw instead of blobbing;
//   - many more independent knobs: hair style + texture, brows, eye shape,
//     nose, mouth/expression, ears, jaw, build, accessories, kit and age marks.
// =============================================================================
function getAvatarData(entity,kind){
  const seed=hashSeed(`${kind||'entity'}-${entity?.id||entity?.name||'0'}-${entity?.name||'anon'}`);
  const isStaff=kind==='staff'||['coach','physio','psychologist','scout','pr'].includes(entity?.type)||!!entity?.tactics;
  const age=entity?.age||(isStaff?45:25);
  const nat=entity?.nationality||(typeof store!=='undefined'&&store.G?.countryId)||'PL';
  // Region families (males-only leagues).
  const region=nat==='CN'?'cn':nat==='KR'?'kr':nat==='JP'?'jp':nat==='DE'?'de':nat==='SE'?'se':'eu';
  const isAsian=region==='cn'||region==='kr'||region==='jp';
  const uid=seed;

  // ── Skin by region (unchanged pools) ───────────────────────────────────────
  const skinPools={
    eu:[['#ffe4d0','#f2c8a4','#d9a07c'],['#f8d4b0','#e8b888','#c89068'],['#f0c898','#dca878','#b88058'],['#e8b888','#d09868','#a87048'],['#dca878','#c08858','#986040'],['#d09870','#b07850','#8a5838'],['#c89068','#a87050','#7a4a30']],
    de:[['#ffe0c8','#f0c4a0','#d9a07a'],['#f5d0a8','#e0b080','#c08858'],['#e8b888','#d09868','#a87048'],['#dca070','#c08850','#986038'],['#c88860','#a87048','#7a5030']],
    se:[['#ffe8d8','#f8d4b4','#e8b890'],['#ffe0c8','#f0c8a0','#dcb088'],['#f5d0a8','#e0b888','#c89868'],['#e8c0a0','#d0a080','#b08060'],['#dcb090','#c09870','#a07850']],
    cn:[['#ffe8c8','#f5d4a8','#e0b888'],['#f8dcb0','#ecc098','#d0a070'],['#f0d0a0','#e0b880','#c89860'],['#e8c890','#d4b078','#b89058'],['#e0c088','#ccb070','#b08850']],
    kr:[['#ffe6c4','#f4d2a4','#e0b880'],['#f8dcb0','#ecc090','#d0a068'],['#f0d4a8','#e0bc88','#c8a068'],['#e8c898','#d4b078','#b89058']],
    jp:[['#ffe8d0','#f6d8b0','#e4c090'],['#fce0b8','#f0cc98','#d8b078'],['#f4d4a8','#e4bc88','#c8a068'],['#ecd0a0','#d8b880','#c09860']],
  };
  const sk=skinPools[region]||skinPools.eu;
  const [faceTone,midTone,skinDark]=sk[sPick(seed,12,sk.length)];

  // ── Hair colour — Asia almost always dark; Europe/SE much more variety ─────
  let hairTone;
  if(isAsian){
    hairTone=['#0c0a08','#14100c','#1c1410','#221810','#2a1c14'][sPick(seed,13,5)];
  }else if(region==='se'){
    hairTone=['#1a120c','#3a2818','#6b4a28','#a07840','#c8a868','#d8c8a0','#e8e0c8','#8a5030'][sPick(seed,13,8)];
  }else{
    hairTone=['#0f0c09','#1a120c','#2e1c10','#4a2c14','#6b3e1c','#8a5020','#a86830','#c49050','#d8b878','#e8d8b0','#c05030','#5a2010'][sPick(seed,13,12)];
  }
  if(age>=50||(!isStaff&&age>=33&&sPick(seed,14,3)===0)){
    hairTone=mixHex(hairTone,'#c8c4c0',age>=58?0.75:age>=50?0.55:0.32);
  }
  if(age>=62)hairTone=mixHex(hairTone,'#e6e4e0',0.5);
  const hairLight=mixHex(hairTone,'#ffffff',0.16);
  const hairDark=mixHex(hairTone,'#000000',0.35);
  const browTone=mixHex(hairTone,'#3a2a20',0.25);

  const irisColor=isAsian
    ?['#2a1c10','#3a2818','#4a3020','#1a140e'][sPick(seed,15,4)]
    :region==='se'
    ?['#3d6a8a','#4a7a9a','#5a8aaa','#4a6a3a','#6a5030'][sPick(seed,15,5)]
    :['#3d5a7a','#4a6a3a','#6a4830','#4a4a7a','#3a6a60','#7a5a30','#2a4a6a'][sPick(seed,15,7)];

  // ── Club / staff colours ──────────────────────────────────────────────────
  let clothA,clothB,accent;
  const brand=(entity?.teamId!=null&&typeof store!=='undefined'&&store.G)?getTeamBranding(entity.teamId):null;
  if(!isStaff&&brand){
    clothA=brand.primary;
    clothB=brand.accent||shadeHex(brand.primary,-28);
    accent=brand.secondary||'#ffffff';
  }else if(isStaff&&brand&&sPick(seed,16,2)===0){
    clothA=mixHex(brand.primary,'#1a2430',0.55);
    clothB=shadeHex(clothA,-20);
    accent=brand.secondary;
  }else if(isStaff){
    clothA=['#1a2f4a','#243840','#2e2448','#3a3020','#1e3840','#3a2430','#1a3a38','#2a2a2a','#1e2840'][sPick(seed,17,9)];
    clothB=shadeHex(clothA,-22);
    accent=shadeHex(clothA,45);
  }else{
    clothA=['#b82820','#1e4a8a','#1f7a48','#c06010','#6a2048'][sPick(seed,17,5)];
    clothB=shadeHex(clothA,-22);
    accent='#ffffff';
  }

  // Background: cool for Asia leagues, warm for EU — still varied.
  const bg=isAsian
    ?['#e8eef4','#e4ece8','#ebe8f2','#e6eaf0','#eef0e8'][sPick(seed,18,5)]
    :['#f4ebe3','#ebe6f0','#e8f0ec','#f2ecdf','#f0e6e8','#e6eef4'][sPick(seed,18,6)];
  const glow=isAsian?'#c8d4e0':'#f0d0b0';

  // ══ GEOMETRY ══════════════════════════════════════════════════════════════
  const headCy=39.5;
  const faceShape=sPick(seed,1,isAsian?4:5); // 0 round 1 oval 2 long 3 square 4 heart
  const rxT=isAsian?[20.6,19.4,18.8,20.4]:[20.2,19.2,18.6,20.6,19.6];
  const ryT=isAsian?[22.4,24.4,25.4,23.2]:[22.6,24.6,25.8,23.4,24.0];
  const jawT=isAsian?[0.80,0.72,0.68,0.90]:[0.78,0.70,0.66,0.92,0.58];
  const headRx=r1(rxT[faceShape]+(sFrac(seed,2)-0.5)*0.9);
  const headRy=r1(ryT[faceShape]+(sFrac(seed,3)-0.5)*1.1);
  const jawF=jawT[faceShape]+(sFrac(seed,4)-0.5)*0.08;
  const chinY=r1(headCy+headRy);
  const headTop=r1(headCy-headRy);

  // Widest at the cheekbones, tapering to a rounded (not pointed) chin.
  const headPath=(g)=>{
    const rx=headRx+g,ry=headRy+g,cy=headCy,top=r1(cy-ry),chin=r1(cy+ry+g*0.2),jw=rx*jawF;
    return `M${r1(48-rx)} ${r1(cy-4)}C${r1(48-rx)} ${r1(cy-ry*0.94)} ${r1(48-rx*0.74)} ${top} 48 ${top}`
      +`C${r1(48+rx*0.74)} ${top} ${r1(48+rx)} ${r1(cy-ry*0.94)} ${r1(48+rx)} ${r1(cy-4)}`
      +`C${r1(48+rx)} ${r1(cy+ry*0.40)} ${r1(48+jw)} ${r1(cy+ry*0.72)} ${r1(48+jw*0.60)} ${r1(chin-1.5)}`
      +`C${r1(48+jw*0.28)} ${r1(chin+1.2)} ${r1(48-jw*0.28)} ${r1(chin+1.2)} ${r1(48-jw*0.60)} ${r1(chin-1.5)}`
      +`C${r1(48-jw)} ${r1(cy+ry*0.72)} ${r1(48-rx)} ${r1(cy+ry*0.40)} ${r1(48-rx)} ${r1(cy-4)}Z`;
  };

  const eyeY=r1(headCy+1);
  const eyeSpread=r1(headRx*0.38+sFrac(seed,5)*1.0);
  const browY=r1(eyeY-5.4-sFrac(seed,6)*1.1);
  const noseTop=r1(eyeY+2);
  const noseY=r1(eyeY+7.6+(headRy-24)*0.3);
  const mouthY=r1(noseY+5.6);
  const build=sPick(seed,50,3);             // 0 slim 1 normal 2 broad
  const shoulderW=[38,42,46][build]+(isStaff?2:0);
  const neckW=[6.4,7.1,7.8][build];
  const neckTop=r1(chinY-9);
  const shoulderY=r1(chinY+5.5);

  // ══ FEATURES ══════════════════════════════════════════════════════════════
  const browStyle=sPick(seed,8,6);          // 0 flat 1 arched 2 angled 3 thick-straight 4 tapered 5 raised
  const browThick=r1((isAsian?1.5:1.7)+sFrac(seed,7)*1.0+(age>50?0.25:0));
  const eyeShape=sPick(seed,60,isAsian?3:4);// 0 almond 1 round 2 narrow 3 hooded
  const eyeH=r1((isAsian?1.7:2.0)+sFrac(seed,61)*0.9+(eyeShape===1?0.5:0)-(eyeShape===2?0.4:0));
  const eyeW=r1((isAsian?3.9:4.1)+sFrac(seed,62)*0.9);
  const noseType=sPick(seed,9,isAsian?3:5);
  const mouthType=sPick(seed,10,6);         // incl. expressions
  const earSize=r1(2.3+sFrac(seed,63)*1.1);
  const cheek=sPick(seed,11,3);             // 0 soft 1 normal 2 hollow

  // Hair: style, hairline, texture. Recession/thinning grows with age.
  const hairTexture=isAsian?sPick(seed,64,3):sPick(seed,64,4); // 0 straight 1 wavy 2 curly 3 tight-curl
  let hairStyle=sPick(seed,19,isAsian?11:15);
  if(!isAsian&&age<27&&sPick(seed,22,7)===0)hairStyle=9;       // young spikes
  if(isAsian&&hairStyle>10)hairStyle=sPick(seed,19,9);
  let recede=0;                                               // 0 none 1 temples 2 deep 3 bald top
  if(age>=34&&sPick(seed,65,4)===0)recede=1;
  if(age>=44&&sPick(seed,66,3)===0)recede=2;
  if(age>=52&&sPick(seed,20,3)===0)recede=3;
  if(age>=64&&sPick(seed,21,2)===0)recede=3;
  if(recede===3)hairStyle=14;                                  // horseshoe / shaved

  const facialHair=(()=>{ // 0 none 1 stubble 2 moustache 3 goatee 4 full 5 soul patch 6 chinstrap 7 short boxed
    if(age<20)return 0;
    if(isAsian){
      const t=sPick(seed,23,12);
      if(t===0)return 1; if(t===1)return 2; if(t===2&&age>=28)return 3; if(t===3&&age>=30)return 5; return 0;
    }
    const t=sPick(seed,23,12);
    if(t<=3)return 0; if(t===4)return 1; if(t===5)return 2; if(t===6)return 3;
    if(t===7||t===8)return 4; if(t===9)return 5; if(t===10)return 6; return 7;
  })();

  const hasGlasses=isStaff?sPick(seed,24,3)===0:sPick(seed,24,12)===0;
  const glassStyle=sPick(seed,25,4);        // 0 round 1 rect 2 thin wire 3 sport
  const hasHeadband=!isStaff&&age<32&&sPick(seed,26,8)===0;
  const hasCap=!isStaff&&!hasHeadband&&sPick(seed,27,14)===0;
  const hasEarring=!isStaff&&sPick(seed,67,11)===0;
  const hasMole=sPick(seed,28,10)===0;
  const hasFreckles=!isAsian&&sPick(seed,29,9)===0;
  const hasScar=!isStaff&&sPick(seed,68,22)===0;
  const kitPat=sPick(seed,30,7);            // jersey pattern
  const collar=sPick(seed,69,3);            // 0 crew 1 v-neck 2 polo
  const staffFit=isStaff?sPick(seed,70,4):0;// 0 blazer+tie 1 polo+lanyard 2 quarter-zip 3 knit
  const shirtTone=['#f4f0ea','#e8e4dc','#f8f6f0','#dfe8f0'][sPick(seed,31,4)];
  const tieColor=brand?brand.primary:['#8a2030','#1a4060','#2a6040','#6a4020'][sPick(seed,33,4)];

  // ══ HAIR ══════════════════════════════════════════════════════════════════
  // Hairline curve: everything above it (inside the skull clip) is hair, so hair
  // can never spill onto the brows no matter which style is picked.
  const baseLine=headTop+headRy*(hairStyle===7?0.34:0.40)+sFrac(seed,71)*1.8;
  const hairLineY=r1(baseLine+recede*2.1);
  const lineShape=recede>=1?2:sPick(seed,72,3); // 0 straight 1 widow's peak 2 receding
  function hairlinePath(){
    const y=hairLineY,L=48-headRx-6,R=48+headRx+6;
    if(lineShape===1)return `M${L} ${r1(y+1)}L${r1(48-headRx*0.62)} ${r1(y-0.6)}L48 ${r1(y+4.2)}L${r1(48+headRx*0.62)} ${r1(y-0.6)}L${R} ${r1(y+1)}`;
    if(lineShape===2){
      const d=recede===2?5.5:recede>=1?3.6:2.2;
      return `M${L} ${r1(y-d)}Q${r1(48-headRx*0.5)} ${r1(y-d-1.5)} ${r1(48-headRx*0.24)} ${r1(y+1.6)}Q48 ${r1(y+3.4)} ${r1(48+headRx*0.24)} ${r1(y+1.6)}Q${r1(48+headRx*0.5)} ${r1(y-d-1.5)} ${R} ${r1(y-d)}`;
    }
    return `M${L} ${r1(y+0.6)}Q48 ${r1(y-2.4)} ${R} ${r1(y+0.6)}`;
  }
  // Hair = the head shape grown by a per-style thickness, cut off at the hairline.
  // Growing the *head* (instead of painting inside the skull) is what gives the
  // hair real volume and a silhouette that differs from man to man.
  const hairT=[1.7,2.8,2.3,3.1,4.2,3.2,5.6,1.0,2.3,2.1,2.7,2.9,3.2,2.0,0.8][hairStyle]||2;
  // Texture: wave lines for wavy hair, a scalloped hairline for curly hair. The
  // scallops sit inside the hair *shell* but cross the hairline — that is what
  // makes curls read as curls instead of a flat cap.
  let hairSheen='',hairEdge='';
  if(hairTexture===1){
    hairSheen=`<path d="M${r1(48-headRx)} ${r1(hairLineY-3.5)}q5 -3 10 0t10 0t10 0" stroke="${hairDark}" stroke-width="1.2" fill="none" opacity=".3"/>`
      +`<path d="M${r1(48-headRx)} ${r1(hairLineY-8)}q5 -3 10 0t10 0t10 0" stroke="${hairDark}" stroke-width="1.2" fill="none" opacity=".22"/>`;
  }else if(hairTexture>=2){
    const n=hairTexture===3?9:7,span=headRx*2+hairT*2,rr=r1(span/(n*1.5));
    for(let i=0;i<n;i++){
      const cx=r1(48-headRx-hairT+span*(i+0.5)/n);
      hairEdge+=`<circle cx="${cx}" cy="${r1(hairLineY-rr*0.55)}" r="${rr}" fill="${hairTone}"/>`;
      hairSheen+=`<circle cx="${cx}" cy="${r1(headTop-hairT+3)}" r="${r1(rr*0.9)}" fill="${i%2?hairLight:hairDark}" opacity=".16"/>`;
    }
  }
  const hairMass=`<g clip-path="url(#shell${uid})">`
    +`<g clip-path="url(#hline${uid})"><rect x="0" y="0" width="96" height="96" fill="url(#hair${uid})"/>${hairSheen}</g>`
    +hairEdge+`</g>`;
  // Style-specific extras (drawn outside the skull clip so volume can overhang).
  function hairExtras(){
    const top=r1(headTop-hairT),lx=r1(48-headRx-hairT),rx=r1(48+headRx+hairT),hl=hairLineY;
    switch(hairStyle){
      case 0: return ''; // crop — shell only
      case 1: // thick sides over the ears
        return `<path d="M${lx} ${r1(headCy-6)}q-2.5 9 -0.5 15q3 2 5-1q-2-7-0.5-14z" fill="${hairTone}"/>`
          +`<path d="M${rx} ${r1(headCy-6)}q2.5 9 0.5 15q-3 2-5-1q2-7 0.5-14z" fill="${hairTone}"/>`;
      case 2: // swept fringe across the forehead
        return `<path d="M${r1(48-headRx*0.95)} ${r1(hl-1)}q${r1(headRx*0.5)} ${r1(6+sFrac(seed,82)*3)} ${r1(headRx*1.5)} ${r1(1.5)}q-${r1(headRx*0.6)} 5 -${r1(headRx*1.5)} 4z" fill="${hairTone}"/>`;
      case 3: // long side sweep
        return `<path d="M${r1(48-headRx*0.7)} ${r1(hl-2)}q${r1(headRx)} ${r1(9)} ${r1(headRx*1.75)} ${r1(-2)}q-2 8 -${r1(headRx*0.8)} 10q-${r1(headRx*0.9)} 1 -${r1(headRx*0.95)} -8z" fill="${hairTone}"/>`;
      case 4: // extra volume on top
        return `<ellipse cx="48" cy="${r1(top+2.5)}" rx="${r1(headRx*0.98)}" ry="5.6" fill="${hairTone}"/>`;
      case 5: // pompadour
        return `<path d="M${r1(48-headRx*0.55)} ${r1(hl-1)}q${r1(headRx*0.2)} -10 ${r1(headRx*1.1)} -8q${r1(headRx*0.3)} 3 ${r1(headRx*0.1)} 8z" fill="${hairTone}"/>`
          +`<path d="M${r1(48-headRx*0.35)} ${r1(hl-4)}q${r1(headRx*0.3)} -5 ${r1(headRx*0.7)} -4" stroke="${hairLight}" stroke-width="1.6" fill="none" opacity=".5"/>`;
      case 6: // afro halo
        return `<ellipse cx="48" cy="${r1(top+3)}" rx="${r1(headRx+4)}" ry="${r1(headRy*0.56)}" fill="${hairTone}"/>`
          +`<circle cx="${r1(48-headRx*0.7)}" cy="${r1(top+2)}" r="5.2" fill="${hairTone}"/><circle cx="${r1(48+headRx*0.7)}" cy="${r1(top+2)}" r="5.2" fill="${hairTone}"/>`
          +`<circle cx="${r1(48-headRx*0.35)}" cy="${r1(top+1)}" r="4" fill="${hairLight}" opacity=".28"/>`;
      case 7: return ''; // buzz
      case 8: // man bun
        return `<circle cx="48" cy="${r1(top-3)}" r="5.4" fill="${hairTone}"/><circle cx="48" cy="${r1(top-4)}" r="2.4" fill="${hairLight}" opacity=".3"/>`
          +`<path d="M${r1(48-headRx*0.5)} ${r1(hl-2)}q${r1(headRx*0.5)} -5 ${r1(headRx)} 0" stroke="${hairDark}" stroke-width="1.2" fill="none" opacity=".45"/>`;
      case 9: // spikes
        return `<path d="M${r1(48-headRx*0.75)} ${r1(top+3.5)}q1 -5 3.5 -5.5q1 3 2.5 5M${r1(48-headRx*0.28)} ${r1(top+1)}q1 -5.5 3.5 -6q1 3.5 2.5 5.5M${r1(48+headRx*0.2)} ${r1(top+1)}q1.5 -5.5 4 -5.5q0.5 3.5 2 5.5M${r1(48+headRx*0.64)} ${r1(top+3)}q2 -5 4 -5q0 3 1 5" fill="${hairTone}" stroke="${hairTone}" stroke-width="1.6" stroke-linejoin="round"/>`;
      case 10: // hair tucked behind the ears, longer at the nape
        return `<path d="M${lx} ${r1(headCy-2)}q-2.5 10 -0.5 15q3 1.5 4.5-1q-2.5-7-1-14z" fill="${hairTone}"/>`
          +`<path d="M${rx} ${r1(headCy-2)}q2.5 10 0.5 15q-3 1.5-4.5-1q2.5-7 1-14z" fill="${hairTone}"/>`;
      case 11: // long, tied at the nape
        return `<path d="M${lx} ${r1(headCy-4)}q-3.5 13 -1 19q3.5 2 5-0.5q-3-9-1.5-16z" fill="${hairTone}"/>`
          +`<path d="M${rx} ${r1(headCy-4)}q3.5 13 1 19q-3.5 2-5-0.5q3-9 1.5-16z" fill="${hairTone}"/>`;
      case 12: // quiff
        return `<path d="M${r1(48-headRx*0.3)} ${r1(hl-2)}q${r1(headRx*0.25)} -12 ${r1(headRx*0.95)} -9q1 5 -${r1(headRx*0.25)} 9z" fill="${hairTone}"/>`;
      case 13: // hard part / undercut
        return `<path d="M${r1(48-headRx*0.45)} ${r1(hl-1)}q1 -8 6 -11" stroke="${mixHex(faceTone,hairTone,0.35)}" stroke-width="1.6" fill="none" opacity=".9"/>`;
      case 14: return ''; // horseshoe / shaved
      default: return '';
    }
  }
  // Hair drawn *behind* the head (long styles) — keeps the face clean.
  function hairBack(){
    // Male long hair = tied at the nape, not a bob: the mass sits behind the head
    // and gathers under the jaw instead of framing the cheeks.
    if(hairStyle===11)return `<path d="M${r1(48-headRx-1)} ${r1(headCy-6)}q-2 16 1 22h${r1(headRx*2+2)}q3 -6 1 -22z" fill="${hairDark}" opacity=".9"/>`
      +`<ellipse cx="48" cy="${r1(chinY+7)}" rx="5" ry="7.5" fill="${hairDark}"/>`;
    if(hairStyle===10)return `<path d="M${r1(48-headRx-1)} ${r1(headCy-4)}q-2 10 0.5 13h${r1(headRx*2+2)}q2.5 -3 0.5 -13z" fill="${hairDark}" opacity=".85"/>`;
    if(hairStyle===6)return `<ellipse cx="48" cy="${r1(headCy-6)}" rx="${r1(headRx+4.5)}" ry="${r1(headRy*0.78)}" fill="${hairDark}"/>`;
    if(hairStyle===8)return `<circle cx="48" cy="${r1(headTop-2)}" r="6.4" fill="${hairDark}"/>`;
    return '';
  }
  // Horseshoe (bald on top) keeps a band of hair round the sides.
  const horseshoe=recede===3?`<path d="M${r1(48-headRx-0.5)} ${r1(headCy-5)}q1 14 6 19M${r1(48+headRx+0.5)} ${r1(headCy-5)}q-1 14 -6 19" stroke="${hairTone}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".95"/>`:'';
  const sideburn=(facialHair>=1&&facialHair!==5&&recede<3)
    ?`<path d="M${r1(48-headRx+1.4)} ${r1(hairLineY+2)}v${r1(4+sFrac(seed,73)*5)}M${r1(48+headRx-1.4)} ${r1(hairLineY+2)}v${r1(4+sFrac(seed,73)*5)}" stroke="${hairTone}" stroke-width="2" stroke-linecap="round" opacity=".75"/>`:'';

  // ══ BEARD (clipped to the face, so it always follows the jaw) ═════════════
  const beardTop=r1(mouthY-4+sFrac(seed,74)*2);
  const beardFill=hairTone;
  let beard='';
  if(facialHair===1||facialHair===4||facialHair===7){
    const op=facialHair===1?0.26:facialHair===7?0.85:0.92;
    const top=facialHair===7?r1(beardTop+2.5):beardTop;
    beard=`<path d="M0 ${r1(top-3)}C${r1(48-headRx*0.4)} ${r1(top+7)} ${r1(48+headRx*0.4)} ${r1(top+7)} 96 ${r1(top-3)}L96 96L0 96Z" fill="${beardFill}" opacity="${op}"/>`;
    if(facialHair===4)beard+=`<path d="M${r1(48-headRx)} ${r1(headCy-2)}q-1 10 3 16" stroke="${beardFill}" stroke-width="4" fill="none" opacity=".9"/><path d="M${r1(48+headRx)} ${r1(headCy-2)}q1 10 -3 16" stroke="${beardFill}" stroke-width="4" fill="none" opacity=".9"/>`;
  }else if(facialHair===3){
    beard=`<path d="M${r1(48-4.6)} ${r1(mouthY+1.5)}q4.6 -2 9.2 0q1 7 -4.6 9.5q-5.6 -2.5 -4.6 -9.5z" fill="${beardFill}" opacity=".9"/>`;
  }else if(facialHair===5){
    beard=`<ellipse cx="48" cy="${r1(mouthY+4.2)}" rx="2" ry="2.6" fill="${beardFill}" opacity=".85"/>`;
  }else if(facialHair===6){
    beard=`<path d="M0 ${r1(beardTop-3)}C${r1(48-headRx*0.4)} ${r1(beardTop+7)} ${r1(48+headRx*0.4)} ${r1(beardTop+7)} 96 ${r1(beardTop-3)}L96 96L0 96Z" fill="${beardFill}" opacity=".9"/>`
      +`<path d="M${r1(48-headRx*0.78)} ${r1(beardTop+1.5)}C${r1(48-headRx*0.3)} ${r1(beardTop+9)} ${r1(48+headRx*0.3)} ${r1(beardTop+9)} ${r1(48+headRx*0.78)} ${r1(beardTop+1.5)}L${r1(48+headRx*0.78)} 96L${r1(48-headRx*0.78)} 96Z" fill="url(#face${uid})"/>`;
  }
  let moustache='';
  if(facialHair===2||facialHair===3||facialHair===4||facialHair===7){
    const mst=sPick(seed,75,3);
    const w=mst===0?5.4:mst===1?6.6:4.6;
    moustache=mst===2
      ?`<path d="M${r1(48-w)} ${r1(mouthY-2.2)}q${r1(w)} -2.4 ${r1(w*2)} 0q-2 3.4 -${r1(w*2)} 0z" fill="${beardFill}" opacity=".92"/>`
      :`<path d="M48 ${r1(mouthY-3.4)}q${r1(w)} -0.4 ${r1(w+1)} 3.6q-${r1(w*0.6)} 0.6 -${r1(w+1)} -1.4q-${r1(w*0.4)} 2 -${r1(w+1)} 1.4q1 -4 ${r1(w+1)} -3.6z" fill="${beardFill}" opacity=".92"/>`;
  }

  // ══ BROWS ════════════════════════════════════════════════════════════════
  const bw=r1(4.6+sFrac(seed,76)*1.2);
  function brow(side){
    const x=48+side*eyeSpread,tilt=browStyle===2?1.4:browStyle===5?-1.2:0;
    const inner=r1(x-side*bw),outer=r1(x+side*bw);
    if(browStyle===1)return `M${inner} ${r1(browY+0.8+tilt)}Q${r1(x)} ${r1(browY-2.6)} ${outer} ${r1(browY+0.6)}`;
    if(browStyle===2)return `M${inner} ${r1(browY+1.6)}L${outer} ${r1(browY-1.2)}`;
    if(browStyle===3)return `M${inner} ${r1(browY)}L${outer} ${r1(browY-0.2)}`;
    if(browStyle===4)return `M${inner} ${r1(browY+0.4)}Q${r1(x)} ${r1(browY-1.4)} ${outer} ${r1(browY+1.4)}`;
    if(browStyle===5)return `M${inner} ${r1(browY-0.8)}Q${r1(x)} ${r1(browY-3.2)} ${outer} ${r1(browY-0.4)}`;
    return `M${inner} ${r1(browY+0.4)}Q${r1(x)} ${r1(browY-1.2)} ${outer} ${r1(browY+0.4)}`;
  }

  // ══ EYES ═════════════════════════════════════════════════════════════════
  function eye(side){
    const x=r1(48+side*eyeSpread);
    const up=eyeShape===1?eyeH*1.05:eyeShape===3?eyeH*0.8:eyeH;
    const lo=eyeShape===2?eyeH*0.6:eyeH*0.78;
    const white=`M${r1(x-eyeW)} ${eyeY}Q${x} ${r1(eyeY-up*1.9)} ${r1(x+eyeW)} ${eyeY}Q${x} ${r1(eyeY+lo*1.7)} ${r1(x-eyeW)} ${eyeY}Z`;
    const ir=r1(Math.min(2.5,up*1.05));
    return `<path d="${white}" fill="#fbf8f5"/>`
      +`<circle cx="${x}" cy="${r1(eyeY-0.1)}" r="${ir}" fill="${irisColor}"/>`
      +`<circle cx="${x}" cy="${r1(eyeY-0.1)}" r="${r1(ir*0.46)}" fill="#100c08"/>`
      +`<circle cx="${r1(x-ir*0.4)}" cy="${r1(eyeY-ir*0.5)}" r="0.62" fill="#fff" opacity=".92"/>`
      +`<path d="M${r1(x-eyeW)} ${eyeY}Q${x} ${r1(eyeY-up*1.9)} ${r1(x+eyeW)} ${eyeY}" stroke="${mixHex(hairTone,'#2a1c14',0.4)}" stroke-width="${eyeShape===3?1.5:1.15}" fill="none" stroke-linecap="round"/>`
      +(isAsian?`<path d="M${r1(x-eyeW-0.6)} ${r1(eyeY-1.2)}q${r1(eyeW*0.7)} -2.2 ${r1(eyeW*1.8)} -0.6" stroke="${midTone}" stroke-width="1.05" fill="none" opacity=".55"/>`
        :eyeShape===3?`<path d="M${r1(x-eyeW-0.4)} ${r1(eyeY-2.4)}q${r1(eyeW)} -1.8 ${r1(eyeW*2)} 0" stroke="${skinDark}" stroke-width="0.9" fill="none" opacity=".45"/>`:'');
  }

  // ══ NOSE ═════════════════════════════════════════════════════════════════
  const nw=r1(2.2+sFrac(seed,77)*1.3+(isAsian?0.4:0));
  let nose;
  if(isAsian){
    nose=noseType===0
      ?`<path d="M48 ${noseTop}q-1 ${r1(noseY-noseTop)} 0 ${r1(noseY-noseTop)}" stroke="${skinDark}" stroke-width="1.2" fill="none" opacity=".4"/><ellipse cx="48" cy="${noseY}" rx="${r1(nw+0.8)}" ry="1.5" fill="${skinDark}" opacity=".2"/><circle cx="${r1(48-nw)}" cy="${noseY}" r="0.95" fill="${skinDark}" opacity=".34"/><circle cx="${r1(48+nw)}" cy="${noseY}" r="0.95" fill="${skinDark}" opacity=".34"/>`
      :noseType===1
      ?`<path d="M${r1(48-1.2)} ${noseTop}q-1.4 ${r1(noseY-noseTop)} 1.2 ${r1(noseY-noseTop-0.5)}" stroke="${skinDark}" stroke-width="1.25" fill="none" opacity=".45"/><circle cx="${r1(48-nw)}" cy="${noseY}" r="1" fill="${skinDark}" opacity=".32"/><circle cx="${r1(48+nw)}" cy="${noseY}" r="1" fill="${skinDark}" opacity=".32"/>`
      :`<circle cx="${r1(48-nw)}" cy="${noseY}" r="1.15" fill="${skinDark}" opacity=".34"/><circle cx="${r1(48+nw)}" cy="${noseY}" r="1.15" fill="${skinDark}" opacity=".34"/><path d="M${r1(48-nw-0.8)} ${r1(noseY-1.6)}q${r1(nw)} -1.6 ${r1(nw*2+1.6)} 0" stroke="${skinDark}" stroke-width="0.9" fill="none" opacity=".28"/>`;
  }else{
    nose=noseType===0
      ?`<path d="M48 ${noseTop}c-1.4 ${r1((noseY-noseTop)*0.6)} -2 ${r1((noseY-noseTop)*0.9)} 0 ${r1(noseY-noseTop)}" stroke="${skinDark}" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/><circle cx="${r1(48-nw)}" cy="${r1(noseY+0.4)}" r="1.1" fill="${skinDark}" opacity=".3"/><circle cx="${r1(48+nw)}" cy="${r1(noseY+0.4)}" r="1.1" fill="${skinDark}" opacity=".3"/>`
      :noseType===1
      ?`<path d="M48 ${r1(noseTop-1)}c0 ${r1((noseY-noseTop)*0.7)} 1.6 ${r1((noseY-noseTop)*0.9)} 2.6 ${r1(noseY-noseTop)}" stroke="${skinDark}" stroke-width="1.35" fill="none" opacity=".5" stroke-linecap="round"/><circle cx="${r1(48-nw+0.4)}" cy="${noseY}" r="1" fill="${skinDark}" opacity=".28"/><circle cx="${r1(48+nw+0.6)}" cy="${noseY}" r="1" fill="${skinDark}" opacity=".28"/>`
      :noseType===2
      ?`<path d="M48 ${noseTop}q-1 ${r1((noseY-noseTop)*0.8)} -1.6 ${r1(noseY-noseTop)}" stroke="${skinDark}" stroke-width="1.3" fill="none" opacity=".5" stroke-linecap="round"/><ellipse cx="48" cy="${noseY}" rx="${r1(nw+0.6)}" ry="1.5" fill="${skinDark}" opacity=".22"/>`
      :noseType===3
      ?`<path d="M${r1(48+0.8)} ${r1(noseTop-1)}c1.6 ${r1((noseY-noseTop)*0.5)} 0.6 ${r1((noseY-noseTop)*0.9)} -1.4 ${r1(noseY-noseTop+0.6)}" stroke="${skinDark}" stroke-width="1.45" fill="none" opacity=".55" stroke-linecap="round"/><circle cx="${r1(48-nw)}" cy="${r1(noseY+0.6)}" r="1.05" fill="${skinDark}" opacity=".3"/><circle cx="${r1(48+nw)}" cy="${r1(noseY+0.6)}" r="1.05" fill="${skinDark}" opacity=".3"/>`
      :`<path d="M48 ${noseTop}v${r1(noseY-noseTop-1)}" stroke="${skinDark}" stroke-width="1.25" fill="none" opacity=".45" stroke-linecap="round"/><path d="M${r1(48-nw-0.6)} ${r1(noseY+0.2)}q${r1(nw+0.6)} 2 ${r1(nw*2+1.2)} 0" stroke="${skinDark}" stroke-width="1.15" fill="none" opacity=".42"/>`;
  }

  // ══ MOUTH / EXPRESSION ═══════════════════════════════════════════════════
  const lip=mixHex(skinDark,'#7a2b26',0.7);
  const mw=r1(6+sFrac(seed,78)*2);
  const mouth=(()=>{
    const L=r1(48-mw),R=r1(48+mw);
    if(mouthType===0)return `<path d="M${L} ${mouthY}q${mw} 2.6 ${r1(mw*2)} 0" stroke="${lip}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;            // soft smile
    if(mouthType===1)return `<path d="M${L} ${mouthY}q${mw} 4.6 ${r1(mw*2)} 0q-${mw} 1.6 -${r1(mw*2)} 0Z" fill="${lip}" opacity=".85"/>`;                            // grin
    if(mouthType===2)return `<path d="M${L} ${mouthY}h${r1(mw*2)}" stroke="${lip}" stroke-width="1.8" stroke-linecap="round"/>`;                                     // neutral
    if(mouthType===3)return `<path d="M${L} ${r1(mouthY+0.6)}q${mw} -1.8 ${r1(mw*2)} 0" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;    // firm / focused
    if(mouthType===4)return `<path d="M${L} ${mouthY}q${r1(mw*0.9)} 3.4 ${r1(mw*2)} -1.2" stroke="${lip}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;  // smirk
    return `<path d="M${L} ${mouthY}q${mw} 3.2 ${r1(mw*2)} 0q-${r1(mw*0.6)} 3 -${r1(mw*1.4)} 0Z" fill="${mixHex(lip,'#2a1410',0.4)}" opacity=".8"/><path d="M${r1(L+1.4)} ${r1(mouthY+0.6)}q${r1(mw*0.86)} 1.4 ${r1(mw*1.7)} 0" stroke="#fff" stroke-width="1.5" opacity=".55" fill="none"/>`; // open / shouting
  })();

  // ══ AGE MARKS ════════════════════════════════════════════════════════════
  let aging='';
  if(age>=42)aging+=`<path d="M${r1(48-headRx*0.55)} ${r1(browY-4.4)}q${r1(headRx*0.55)} -1.6 ${r1(headRx*1.1)} 0" stroke="${skinDark}" stroke-width="0.85" fill="none" opacity=".3"/>`;
  if(age>=50)aging+=`<path d="M${r1(48-headRx*0.5)} ${r1(browY-7)}q${r1(headRx*0.5)} -1.5 ${r1(headRx)} 0" stroke="${skinDark}" stroke-width="0.8" fill="none" opacity=".24"/>`;
  if(age>=38)aging+=`<path d="M${r1(48-nw-2)} ${r1(noseY+1)}q-2.4 ${r1((mouthY-noseY)*1.3)} -0.6 ${r1((mouthY-noseY)*1.9)}" stroke="${skinDark}" stroke-width="0.9" fill="none" opacity=".28"/><path d="M${r1(48+nw+2)} ${r1(noseY+1)}q2.4 ${r1((mouthY-noseY)*1.3)} 0.6 ${r1((mouthY-noseY)*1.9)}" stroke="${skinDark}" stroke-width="0.9" fill="none" opacity=".28"/>`;
  if(age>=52)aging+=`<path d="M${r1(48-eyeSpread-eyeW-1.6)} ${r1(eyeY+1)}l-2 1.4M${r1(48-eyeSpread-eyeW-1.6)} ${r1(eyeY-0.6)}l-2.2 -0.4M${r1(48+eyeSpread+eyeW+1.6)} ${r1(eyeY+1)}l2 1.4M${r1(48+eyeSpread+eyeW+1.6)} ${r1(eyeY-0.6)}l2.2 -0.4" stroke="${skinDark}" stroke-width="0.75" opacity=".3"/>`;

  // ══ ACCESSORIES ══════════════════════════════════════════════════════════
  let glasses='';
  if(hasGlasses){
    const gw=r1(eyeW+2.6),gh=r1(eyeH*1.9+2.2),gy=r1(eyeY-gh/2);
    const frame=glassStyle===2?'#4a4238':'#20242c';
    const rx=glassStyle===0?gh/2:glassStyle===3?2:3;
    const gsw=glassStyle===2?1:1.5;
    glasses=`<g stroke="${frame}" stroke-width="${gsw}" fill="rgba(214,232,255,.14)">`
      +`<rect x="${r1(48-eyeSpread-gw)}" y="${gy}" width="${r1(gw*2)}" height="${gh}" rx="${rx}"/>`
      +`<rect x="${r1(48+eyeSpread-gw)}" y="${gy}" width="${r1(gw*2)}" height="${gh}" rx="${rx}"/>`
      +`<path d="M${r1(48-eyeSpread+gw)} ${eyeY}h${r1(Math.max(1.5,eyeSpread*2-gw*2))}" fill="none"/>`
      +`<path d="M${r1(48-eyeSpread-gw)} ${r1(eyeY-1)}h-3.2M${r1(48+eyeSpread+gw)} ${r1(eyeY-1)}h3.2" fill="none"/></g>`;
  }
  const bandY=r1(hairLineY-1.5);
  const headband=hasHeadband
    ?`<g clip-path="url(#skull${uid})"><rect x="0" y="${bandY}" width="96" height="5.2" fill="${clothA}"/>`
      +`<rect x="0" y="${r1(bandY+3.4)}" width="96" height="1.4" fill="${accent}" opacity=".7"/></g>`:'';
  const capY=r1(hairLineY+1);
  const cap=hasCap
    ?`<path d="M${r1(48-headRx-2)} ${capY}a${r1(headRx+2)} ${r1(headRy*0.78)} 0 0 1 ${r1(headRx*2+4)} 0z" fill="${clothA}"/>`
      +`<path d="M${r1(48-headRx-3.5)} ${capY}q${r1(headRx+3.5)} 8 ${r1(headRx*2+7)} 0q-${r1(headRx+3.5)} 3 -${r1(headRx*2+7)} 0z" fill="${clothB}"/>`
      +`<circle cx="48" cy="${r1(capY-headRy*0.74)}" r="1.6" fill="${accent}" opacity=".85"/>`:'';
  const earring=hasEarring?`<circle cx="${r1(48+headRx+0.6)}" cy="${r1(headCy+earSize+2.6)}" r="1.15" fill="#e8c860" stroke="#a8842a" stroke-width="0.4"/>`:'';

  // ══ TORSO ════════════════════════════════════════════════════════════════
  // Shoulders: a rounded trapezoid rising to the collar, so the portrait reads as
  // head + neck + body instead of a head balancing on a hill.
  const sy=shoulderY,sw=shoulderW;
  const shoulder=`M${r1(48-sw)} 96C${r1(48-sw)} ${r1(sy+5)} ${r1(48-sw*0.56)} ${r1(sy-2)} ${r1(48-11)} ${r1(sy-4)}`
    +`L${r1(48+11)} ${r1(sy-4)}C${r1(48+sw*0.56)} ${r1(sy-2)} ${r1(48+sw)} ${r1(sy+5)} ${r1(48+sw)} 96Z`;
  let torso;
  if(isStaff){
    const base=`<path d="${shoulder}" fill="${clothA}"/>`
      +`<path d="M${r1(48-sw)} 96C${r1(48-sw)} ${r1(sy+5)} ${r1(48-sw*0.56)} ${r1(sy-2)} ${r1(48-11)} ${r1(sy-4)}l3 6c-6 3-10 9-11 ${r1(96-sy)}z" fill="${clothB}" opacity=".45"/>`
      +`<path d="M${r1(48+sw)} 96C${r1(48+sw)} ${r1(sy+5)} ${r1(48+sw*0.56)} ${r1(sy-2)} ${r1(48+11)} ${r1(sy-4)}l-3 6c6 3 10 9 11 ${r1(96-sy)}z" fill="${clothB}" opacity=".45"/>`;
    if(staffFit===0){ // blazer + shirt + tie
      torso=base
        +`<path d="M${r1(48-7.5)} ${r1(sy-4.5)}L48 ${r1(sy+7)}L${r1(48+7.5)} ${r1(sy-4.5)}V96h-15z" fill="${shirtTone}"/>`
        +`<path d="M${r1(48-9.5)} ${r1(sy-5.5)}l6.5 4 3-2 3 2 6.5-4" fill="none" stroke="${shadeHex(shirtTone,-26)}" stroke-width="0.9"/>`
        +`<path d="M${r1(48-2.4)} ${r1(sy+3)}h4.8l1.8 ${r1(96-sy-3)}h-8.4z" fill="${tieColor}"/>`
        +`<path d="M${r1(48-2.8)} ${r1(sy+0.2)}l2.8 3 2.8-3-2.8-1.8z" fill="${shadeHex(tieColor,-26)}"/>`;
    }else if(staffFit===1){ // polo + lanyard
      torso=base
        +`<path d="M${r1(48-6.5)} ${r1(sy-4.5)}L48 ${r1(sy+3)}l6.5-7.5 3.2 2.6L48 ${r1(sy+7.5)}l-9.7-7.9z" fill="${shadeHex(clothA,26)}"/>`
        +`<path d="M${r1(48-9)} ${r1(sy-5)}q9 15 18 0" stroke="${accent||'#e8e2d8'}" stroke-width="1.6" fill="none" opacity=".65"/>`
        +`<circle cx="48" cy="${r1(sy+10)}" r="2.6" fill="#e8e4dc" stroke="#8a8378" stroke-width="0.6"/>`;
    }else if(staffFit===2){ // quarter-zip tracksuit
      torso=base
        +`<path d="M${r1(48-6)} ${r1(sy-4.5)}h12v${r1(96-sy+4.5)}h-12z" fill="${clothB}"/>`
        +`<path d="M48 ${r1(sy-4)}V96" stroke="${accent||'#d8d2c8'}" stroke-width="1.1" opacity=".75"/>`
        +`<path d="M${r1(48-sw*0.62)} ${r1(sy+6)}q${r1(sw*0.62)} 5 ${r1(sw*1.24)} 0" stroke="${accent||'#d8d2c8'}" stroke-width="1.6" fill="none" opacity=".4"/>`;
    }else{ // knit sweater + collar
      torso=base
        +`<path d="M${r1(48-8)} ${r1(sy-5)}q8 8 16 0l1.6 3.2q-9 8.6-19.2 0z" fill="${shadeHex(clothA,22)}"/>`
        +`<path d="M${r1(48-sw*0.5)} ${r1(sy+9)}h${r1(sw)}" stroke="${shadeHex(clothA,-12)}" stroke-width="1.2" opacity=".55"/>`;
    }
  }else{
    const pat=kitPat===1?`<path d="M${r1(48-2.2)} ${r1(sy-4)}h4.4V96h-4.4z" fill="${accent}" opacity=".55"/>`
      :kitPat===2?`<path d="M${r1(48-7.5)} ${r1(sy-3)}h3.6V96h-3.6zM${r1(48+3.9)} ${r1(sy-3)}h3.6V96h-3.6z" fill="${accent}" opacity=".45"/>`
      :kitPat===3?`<path d="M${r1(48-sw*0.66)} ${r1(sy+3)}q${r1(sw*0.66)} 6 ${r1(sw*1.32)} 0" stroke="${accent}" stroke-width="4" fill="none" opacity=".4"/>`
      :kitPat===4?`<path d="M${r1(48-sw)} 96c0-8 2-14 6-18l4 18z" fill="${clothB}" opacity=".6"/><path d="M${r1(48+sw)} 96c0-8-2-14-6-18l-4 18z" fill="${clothB}" opacity=".6"/>`
      :kitPat===5?`<path d="M${r1(48-sw*0.8)} ${r1(sy+2)}L${r1(48+sw*0.7)} 96" stroke="${accent}" stroke-width="5" opacity=".32"/>`
      :kitPat===6?`<path d="M${r1(48-sw)} ${r1(sy+7)}h${r1(sw*2)}M${r1(48-sw)} ${r1(sy+14)}h${r1(sw*2)}" stroke="${accent}" stroke-width="2.6" opacity=".3"/>`
      :'';
    const neckline=collar===1
      ?`<path d="M${r1(48-7)} ${r1(sy-5)}L48 ${r1(sy+4)}l7-9" fill="none" stroke="${accent}" stroke-width="2.2" opacity=".9"/>`
      :collar===2
      ?`<path d="M${r1(48-6.5)} ${r1(sy-5)}L48 ${r1(sy+3)}l6.5-8 2.8 2.2L48 ${r1(sy+7)}l-9.3-6.8z" fill="${accent}" opacity=".9"/><circle cx="48" cy="${r1(sy+5.4)}" r="0.75" fill="${clothB}"/>`
      :`<path d="M${r1(48-7.5)} ${r1(sy-4.6)}q7.5 6 15 0" fill="none" stroke="${accent}" stroke-width="2.4" opacity=".9"/>`;
    torso=`<path d="${shoulder}" fill="${clothA}"/>`
      +`<path d="M${r1(48-sw)} 96C${r1(48-sw)} ${r1(sy+5)} ${r1(48-sw*0.56)} ${r1(sy-2)} ${r1(48-11)} ${r1(sy-4)}l4 5c-7 4-11 10-12 ${r1(96-sy)}z" fill="${clothB}" opacity=".38"/>`
      +`<path d="M${r1(48+sw)} 96C${r1(48+sw)} ${r1(sy+5)} ${r1(48+sw*0.56)} ${r1(sy-2)} ${r1(48+11)} ${r1(sy-4)}l-4 5c7 4 11 10 12 ${r1(96-sy)}z" fill="${clothB}" opacity=".38"/>`
      +pat+neckline;
  }

  // ══ ASSEMBLY ═════════════════════════════════════════════════════════════
  const cheekOp=cheek===2?0.11:cheek===0?0.04:0.07;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${shadeHex(bg,-16)}"/></linearGradient>
    <radialGradient id="glow${uid}" cx="50%" cy="30%" r="60%"><stop offset="0%" stop-color="${glow}" stop-opacity=".55"/><stop offset="100%" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="face${uid}" x1="0.25" y1="0" x2="0.78" y2="1"><stop offset="0%" stop-color="${faceTone}"/><stop offset="62%" stop-color="${mixHex(faceTone,midTone,0.75)}"/><stop offset="100%" stop-color="${mixHex(midTone,skinDark,0.45)}"/></linearGradient>
    <linearGradient id="hair${uid}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="${hairLight}"/><stop offset="55%" stop-color="${hairTone}"/><stop offset="100%" stop-color="${hairDark}"/></linearGradient>
    <clipPath id="clip${uid}"><circle cx="48" cy="48" r="48"/></clipPath>
    <clipPath id="face-c${uid}"><path d="${headPath(0)}"/></clipPath>
    <clipPath id="skull${uid}"><path d="${headPath(2)}"/></clipPath>
    <clipPath id="hline${uid}"><path d="${hairlinePath()}L${r1(48+headRx+12)} -12L${r1(48-headRx-12)} -12Z"/></clipPath>
    <clipPath id="shell${uid}"><path d="${headPath(hairT)}"/></clipPath>
  </defs>
  <g clip-path="url(#clip${uid})">
    <rect width="96" height="96" fill="url(#bg${uid})"/>
    <path d="M-6 ${r1(70+sPick(seed,80,10))}L102 ${r1(50+sPick(seed,81,14))}V102H-6Z" fill="${clothA}" opacity=".07"/>
    <circle cx="48" cy="36" r="42" fill="url(#glow${uid})"/>
    ${hairBack()}
    ${torso}
    <path d="M${r1(48-neckW)} ${r1(neckTop-4)}h${r1(neckW*2)}v${r1(shoulderY-neckTop+3)}h-${r1(neckW*2)}z" fill="${midTone}"/>
    <path d="M${r1(48-neckW-0.5)} ${r1(neckTop-2)}q${r1(neckW+0.5)} 7 ${r1(neckW*2+1)} 0v3q-${r1(neckW)} 5 -${r1(neckW*2+1)} 0z" fill="${skinDark}" opacity=".38"/>
    <ellipse cx="${r1(48-headRx-0.8)}" cy="${r1(headCy+2.5)}" rx="${r1(earSize)}" ry="${r1(earSize*1.5)}" fill="${midTone}"/>
    <ellipse cx="${r1(48+headRx+0.8)}" cy="${r1(headCy+2.5)}" rx="${r1(earSize)}" ry="${r1(earSize*1.5)}" fill="${midTone}"/>
    <path d="M${r1(48-headRx-0.4)} ${r1(headCy+1)}q-1.5 1.6 -0.2 3.6M${r1(48+headRx+0.4)} ${r1(headCy+1)}q1.5 1.6 0.2 3.6" stroke="${skinDark}" stroke-width="0.75" fill="none" opacity=".45"/>
    ${earring}
    <path d="${headPath(0)}" fill="url(#face${uid})"/>
    <g clip-path="url(#face-c${uid})">
      <ellipse cx="${r1(48-headRx*0.72)}" cy="${r1(headCy+6)}" rx="7" ry="5.5" fill="${skinDark}" opacity="${cheekOp}"/>
      <ellipse cx="${r1(48+headRx*0.72)}" cy="${r1(headCy+6)}" rx="7" ry="5.5" fill="${skinDark}" opacity="${cheekOp}"/>
      <path d="M0 ${r1(headCy-headRy*0.2)}q48 -14 96 0V0H0Z" fill="#fff" opacity=".07"/>
      ${hasFreckles?`<circle cx="${r1(48-headRx*0.55)}" cy="${r1(noseY-2)}" r=".7" fill="#b87858" opacity=".55"/><circle cx="${r1(48-headRx*0.38)}" cy="${r1(noseY+0.6)}" r=".62" fill="#b87858" opacity=".5"/><circle cx="${r1(48+headRx*0.55)}" cy="${r1(noseY-2)}" r=".7" fill="#b87858" opacity=".55"/><circle cx="${r1(48+headRx*0.38)}" cy="${r1(noseY+0.6)}" r=".62" fill="#b87858" opacity=".5"/>`:''}
      ${hasScar?`<path d="M${r1(48+headRx*0.55)} ${r1(browY-2)}l2.2 5.4" stroke="${mixHex(skinDark,'#a85a48',0.5)}" stroke-width="0.9" opacity=".65"/>`:''}
      ${hasMole?`<circle cx="${r1(48-headRx*0.5+sFrac(seed,40)*headRx)}" cy="${r1(noseY+sFrac(seed,41)*6)}" r="0.95" fill="${skinDark}" opacity=".5"/>`:''}
      ${aging}
      ${beard}
    </g>
    ${horseshoe}
    ${hairMass}
    <g clip-path="url(#skull${uid})">${sideburn}</g>
    ${hairExtras()}
    ${cap}${headband}
    <path d="${brow(-1)}" stroke="${browTone}" stroke-width="${browThick}" stroke-linecap="round" fill="none"/>
    <path d="${brow(1)}" stroke="${browTone}" stroke-width="${browThick}" stroke-linecap="round" fill="none"/>
    ${eye(-1)}${eye(1)}
    ${nose}
    ${mouth}
    ${moustache}
    ${glasses}
    <path d="M${r1(48-headRx*0.42)} ${r1(chinY-1.6)}q${r1(headRx*0.42)} 2.2 ${r1(headRx*0.84)} 0" stroke="${skinDark}" stroke-width="0.9" fill="none" opacity=".22"/>
  </g>
  <circle cx="48" cy="48" r="47" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.4"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g,' ').trim())}`;
}

function mixHex(a,b,t){
  const p=(h)=>{const n=parseInt(String(h).replace('#',''),16);return[(n>>16)&255,(n>>8)&255,n&255];};
  const [ar,ag,ab]=p(a),[br,bg,bb]=p(b);
  const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
  return`#${((1<<24)|(r<<16)|(g<<8)|bl).toString(16).slice(1)}`;
}
function shadeHex(hex,amt){
  const n=parseInt(String(hex).replace('#',''),16);
  let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return`#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;
}

function teamSeed(team){
  const t=typeof team==='object'?team:store.G?.teams?.find(x=>x.id===team);
  return hashSeed(`${t?.id||0}-${t?.name||'club'}`);
}

function getTeamBranding(team){
  const t=typeof team==='object'?team:store.G?.teams?.find(x=>x.id===team);
  const seed=teamSeed(t);
  const palettes=[
    {primary:'#b73a28',secondary:'#f4d9cf',accent:'#4d140d'},
    {primary:'#245b93',secondary:'#d6e7f8',accent:'#112e4b'},
    {primary:'#2f7d4f',secondary:'#d8f0e1',accent:'#143724'},
    {primary:'#8f6a15',secondary:'#f6ecc8',accent:'#473407'},
    {primary:'#7a3ea6',secondary:'#ead8f9',accent:'#311446'},
    {primary:'#9d3554',secondary:'#f7d6e0',accent:'#470f21'},
    {primary:'#2b7b7b',secondary:'#d9f3f1',accent:'#103b3b'},
    {primary:'#8a4b32',secondary:'#f4ddd3',accent:'#3f1a0f'}
  ];
  const palette=palettes[seed%palettes.length];
  const words=(t?.name||'Klub').split(/\s+/).filter(Boolean);
  const initials=words.slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'PP';
  const animal=['Smoki','Orly','Lwy','Wilki','Sztorm','Rakiety','Feniksy','Tygrysy','Tarcze','Blyskawice'][seed%10];
  const motto=['Tradycja i tempo','Sila serwisu','Gra do konca','Technika ponad chaos','Presja nas niesie','Punkt po punkcie','Stalowe nerwy','Atak i kontrola'][seed%8];
  return {...palette,initials,nickname:`${animal}`,motto};
}

// ── Club crests ─────────────────────────────────────────────────────────────
// Five real crest *compositions* (roundel, shield, banner, diamond, hex) rather
// than a random shape + random symbol mash-up. Each is built from the club's
// branding, carries a properly centred monogram, and stays readable at 24px:
// bold silhouettes, no hairlines, no micro-text beyond the two letters.
function getTeamLogoData(team){
  const t=typeof team==='object'?team:store.G?.teams?.find(x=>x.id===team);
  const brand=getTeamBranding(t);
  const seed=teamSeed(t);
  const P=brand.primary,S=brand.secondary,A=brand.accent;
  const light=mixHex(P,'#ffffff',0.34), deep=mixHex(A,'#000000',0.18);
  const shape=seed%5;                      // composition
  const device=Math.floor(seed/5)%4;       // 0 paddle+ball 1 chevron 2 star row 3 bar+ball
  const mono=brand.initials;
  const font=`font-family="'Saira Condensed','Arial Narrow',Arial,sans-serif" font-weight="800"`;
  // Monogram, always optically centred (dominant-baseline keeps it true at any size).
  const label=(cx,cy,size,fill)=>`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ${font} font-size="${size}" fill="${fill}" letter-spacing="-0.5">${mono}</text>`;

  // Devices — a small table-tennis mark, never an animal clip-art.
  const dev=(cx,cy,sc,tone)=>{
    const s=v=>r1(v*sc);
    if(device===0)  // paddle + ball
      return `<g transform="translate(${cx},${cy})"><ellipse cx="0" cy="${s(-2)}" rx="${s(7)}" ry="${s(8.5)}" fill="${tone}"/>`
        +`<rect x="${s(-1.6)}" y="${s(5)}" width="${s(3.2)}" height="${s(8)}" rx="${s(1.6)}" fill="${tone}"/>`
        +`<circle cx="${s(10)}" cy="${s(-7)}" r="${s(3.2)}" fill="${tone}"/></g>`;
    if(device===1)  // chevron
      return `<path d="M${cx-14*sc} ${cy+6*sc}L${cx} ${cy-7*sc}L${cx+14*sc} ${cy+6*sc}L${cx+14*sc} ${cy+12*sc}L${cx} ${cy-1*sc}L${cx-14*sc} ${cy+12*sc}Z" fill="${tone}"/>`;
    if(device===2){ // three stars
      let o='';for(let i=-1;i<2;i++){const x=cx+i*11*sc,y=cy;
        o+=`<path d="M${x} ${y-5*sc}l${1.6*sc} ${3.4*sc} ${3.7*sc} .5-${2.7*sc} ${2.6*sc} .7 ${3.7*sc}L${x} ${y+2.6*sc}l-${3.4*sc} ${1.8*sc} .7-${3.7*sc}-${2.7*sc}-${2.6*sc} ${3.7*sc}-.5Z" fill="${tone}"/>`;}
      return o;}
    // bar + ball
    return `<g transform="translate(${cx},${cy})"><rect x="${s(-13)}" y="${s(-2)}" width="${s(26)}" height="${s(4.5)}" rx="${s(2.2)}" fill="${tone}"/><circle cx="0" cy="${s(-9)}" r="${s(4)}" fill="${tone}"/></g>`;
  };

  let body;
  if(shape===0){            // ROUNDEL
    body=`<circle cx="48" cy="48" r="42" fill="${P}"/><circle cx="48" cy="48" r="35" fill="${S}"/>`
      +`<circle cx="48" cy="48" r="30" fill="${deep}"/>`
      +dev(48,32,0.85,S)
      +label(48,58,25,S);
  }else if(shape===1){      // SHIELD with chief band
    const sh=`M12 12h72v40c0 20-16 30-36 40C28 82 12 72 12 52z`;
    body=`<path d="${sh}" fill="${P}"/>`
      +`<path d="M12 12h72v22H12z" fill="${deep}"/>`
      +dev(48,23,0.62,S)
      +`<path d="M12 34h72v18c0 20-16 30-36 40C28 82 12 72 12 52z" fill="${P}"/>`
      +label(48,56,27,S);
  }else if(shape===2){      // BANNER with diagonal
    body=`<rect x="10" y="14" width="76" height="68" rx="10" fill="${P}"/>`
      +`<path d="M10 60L86 30v22c0 8-4 12-12 12H22c-8 0-12-4-12-12z" fill="${deep}" opacity=".9"/>`
      +`<path d="M10 24h76v10H10z" fill="${S}" opacity=".22"/>`
      +dev(48,30,0.6,S)
      +label(48,58,26,S);
  }else if(shape===3){      // DIAMOND
    body=`<path d="M48 6l42 42-42 42L6 48z" fill="${P}"/>`
      +`<path d="M48 18l30 30-30 30-30-30z" fill="${deep}"/>`
      +dev(48,34,0.6,S)
      +label(48,58,24,S);
  }else{                    // HEX with band
    body=`<path d="M48 5l37 21.5v43L48 91 11 69.5v-43z" fill="${P}"/>`
      +`<path d="M11 38h74v20H11z" fill="${deep}"/>`
      +dev(48,26,0.6,S)
      +label(48,48,25,S)
      +`<path d="M11 62h74v6H11z" fill="${S}" opacity=".25"/>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">`
    +`<defs><linearGradient id="cg${seed}" x1="0" y1="0" x2="0.4" y2="1">`
    +`<stop offset="0%" stop-color="${light}" stop-opacity=".28"/><stop offset="100%" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>`
    +body
    +`<rect width="96" height="96" fill="url(#cg${seed})" style="mix-blend-mode:soft-light"/>`
    +`</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g,' ').trim())}`;
}

window.PPM.gameplayVisuals = { hashSeed, avatarPalette, getAvatarData, teamSeed, getTeamBranding, getTeamLogoData };
})();
