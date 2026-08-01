// Shared five-slot rating renderer. It accepts an already normalized gameplay
// profile and returns markup only, so pages can use it without DOM side effects.
(function(){
window.PPM=window.PPM||{};

const STAR_PATH='M12 2.4l2.91 5.9 6.51.95-4.71 4.59 1.11 6.49L12 17.27 6.18 20.33l1.11-6.49-4.71-4.59 6.51-.95L12 2.4z';
const SIZES=new Set(['compact','standard','profile']);
const DISCLOSURES=new Set(['summary','profile']);
const clampWidth=value=>Number((Math.max(0,Math.min(1,value))*100).toFixed(6));
const glyph=(variant,clipped,width)=>clipped
  ? `<span class="rating-stars__clip rating-stars__clip--${variant}" style="width:${width}%"><svg class="rating-stars__glyph rating-stars__glyph--${variant}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg></span>`
  : `<svg class="rating-stars__glyph rating-stars__glyph--${variant}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;

function renderRating(profile,{size='standard',peakKnown=false,disclosure='summary',showCurrentOvr=false}={}){
  const safeSize=SIZES.has(size)?size:'standard';
  const safeDisclosure=DISCLOSURES.has(disclosure)?disclosure:'summary';
  const current=Number(profile?.currentOvr)||0;
  const currentStars=Number(profile?.currentStars)||0;
  const peak=Number(profile?.peakOvr)||current;
  const effectivePeak=peakKnown?(Number(profile?.peakStars)||currentStars):currentStars;
  const labelKey=`rating.a11y.${safeDisclosure}${peakKnown?'Known':'Unknown'}`;
  const aria=window.PPM.i18n.t(labelKey,{current,peak});
  const slots=Array.from({length:5},(_,i)=>{
    const currentWidth=clampWidth(currentStars-i);
    const peakWidth=clampWidth(effectivePeak-i);
    return `<span class="rating-stars__slot">${glyph('dim',false,0)}${glyph('peak',true,peakWidth)}${glyph('current',true,currentWidth)}</span>`;
  }).join('');
  const ovr=showCurrentOvr?`<span class="rating-stars__ovr">${current}</span>`:'';
  return `<span class="rating-stars rating-stars--${safeSize} rating-stars--${safeDisclosure}" role="img" aria-label="${aria}"><span class="rating-stars__scale">${slots}</span>${ovr}</span>`;
}

window.PPM.ratingStars=Object.freeze({renderRating});
})();
