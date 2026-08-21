// SVG flags for Windows WebView2 (emoji regional indicators render as letters).
(function(){
window.PPM = window.PPM || {};

function svg(inner){
  return `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}
function fallback(code){
  const letters=String(code||'?').slice(0,2).toUpperCase();
  return svg(`<rect width="60" height="40" fill="#2a3340"/><text x="30" y="26" text-anchor="middle" font-size="14" font-weight="800" fill="#eef2f8" font-family="sans-serif">${letters}</text>`);
}

const FLAGS={
  PL:()=>svg('<rect width="60" height="20" fill="#fff"/><rect y="20" width="60" height="20" fill="#dc143c"/>'),
  DE:()=>svg('<rect width="60" height="13.4" fill="#000"/><rect y="13.4" width="60" height="13.3" fill="#dd0000"/><rect y="26.7" width="60" height="13.3" fill="#ffce00"/>'),
  CN:()=>svg('<rect width="60" height="40" fill="#de2910"/><polygon points="10,8 12.2,14.8 5.2,11.2 14.8,11.2 7.8,14.8" fill="#ffde00"/>'),
  JP:()=>svg('<rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="10" fill="#bc002d"/>'),
  SE:()=>svg('<rect width="60" height="40" fill="#006aa7"/><rect x="16" width="8" height="40" fill="#fecc00"/><rect y="16" width="60" height="8" fill="#fecc00"/>'),
  KR:()=>svg('<rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="9" fill="#c60c30"/><path d="M21 20a9 9 0 0 0 18 0" fill="#003478"/>'),
};

function flagSvg(code){
  const id=String(code||'').toUpperCase();
  return (FLAGS[id]?FLAGS[id]():fallback(id));
}

window.PPM.flags={flagSvg};
})();
