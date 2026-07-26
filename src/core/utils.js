// =============================================================================
// utils.js — Shared helper utilities
// Loaded second (after constants.js), before state.js and everything else.
//
// Exports (via window.PPM.utils and globals):
//   rnd(a, b)              — random integer in [a, b] inclusive
//   sleep(ms)              — Promise-based delay (used in async VME rendering)
//   formatMoney(value)     — formats number as a EUR currency string, e.g. "12 500 €"
//   clamp(value, min, max) — clamps value between min and max (inclusive)
//
// All four functions are also written to `window` directly by state.js/main.js
// so they are callable as bare globals throughout the codebase.
// =============================================================================

window.PPM = window.PPM || {};

// Returns a random integer between a and b, inclusive on both ends.
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1));}

// Returns a Promise that resolves after `ms` milliseconds.
// Used by the VME (Visual Match Engine) to pace point-by-point rendering.
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// Formats a numeric value as a human-readable EUR money string.
// Falls back to 0 for null/undefined. Uses Polish locale grouping (space as thousands separator).
// Example: formatMoney(12500) → "12 500 €"
function formatMoney(value, locale='pl'){return Number(value||0).toLocaleString(locale)+' €';}

// Clamps `value` so it is never below `min` or above `max`.
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

// Country name pools — single implementation for state migration + generation.
// Falls back to global FN/LN when a country lacks pools (must load after constants).
function getCountryNamePools(countryId){
  const id=countryId||(typeof store!=='undefined'&&store.G&&store.G.countryId)||'PL';
  const country=(typeof COUNTRIES!=='undefined'&&(COUNTRIES[id]||COUNTRIES.PL))||{};
  const firstFallback=(typeof FN!=='undefined'&&FN)||['Jan'];
  const lastFallback=(typeof LN!=='undefined'&&LN)||['Kowalski'];
  return{
    firstNames:country.firstNames||firstFallback,
    lastNames:country.lastNames||lastFallback,
  };
}
// Canonical name generator (replaces divergent copies in state.js / gameplay.js).
//
// Frequency weighting (2026-07-24). The pools are alphabetical dictionaries of
// every name a country ever used, so a flat random draw made "Boguchwał
// Mróz" as likely as "Piotr Nowak" — owner feedback: names read "too weird".
// Real squads are dominated by a few dozen common names, so:
//   - COMMON_FIRST[country] is the short, modern, high-frequency core (75% of draws)
//   - the full dictionary is the long tail (25%) — and for veterans the tail is
//     weighted up, because archaic names genuinely belong to older generations
//   - surnames: the pools are already ordered by real frequency, so we bias the
//     draw toward the front of the list instead of picking uniformly.
const COMMON_FIRST={
  PL:['Adam','Adrian','Aleksander','Andrzej','Antoni','Arkadiusz','Artur','Bartosz','Damian','Daniel','Dariusz','Dawid','Dominik','Filip','Grzegorz','Jacek','Jakub','Jan','Jarosław','Jerzy','Kacper','Kamil','Karol','Konrad','Krystian','Krzysztof','Łukasz','Maciej','Marcin','Marek','Mariusz','Mateusz','Michał','Mikołaj','Nikodem','Norbert','Oskar','Patryk','Paweł','Piotr','Przemysław','Rafał','Robert','Sebastian','Sławomir','Stanisław','Szymon','Tomasz','Wiktor','Wojciech'],
  DE:['Alexander','Andreas','Benjamin','Christian','Daniel','David','Dennis','Fabian','Felix','Florian','Jan','Jonas','Julian','Kevin','Lars','Leon','Lukas','Marcel','Markus','Martin','Matthias','Max','Michael','Niklas','Patrick','Paul','Philipp','Sebastian','Simon','Stefan','Thomas','Tim','Tobias','Christoph'],
  SE:['Alexander','Anders','Andreas','Anton','Axel','Daniel','David','Elias','Emil','Erik','Filip','Fredrik','Gustav','Hugo','Isak','Jakob','Johan','Jonas','Karl','Linus','Lucas','Ludvig','Magnus','Marcus','Mattias','Niklas','Oscar','Patrik','Per','Peter','Rasmus','Simon','Viktor','William'],
  CN:['Bin','Chao','Cheng','Feng','Gang','Hao','Hui','Jian','Jie','Jun','Kai','Lei','Liang','Ming','Peng','Qiang','Tao','Wei','Xin','Yang','Yong','Yu','Zhen','Zhi'],
  JP:['Daiki','Haruto','Hiroto','Kaito','Kenta','Kota','Ren','Riku','Sho','Sota','Takumi','Tatsuya','Yuki','Yuto','Yusuke','Ryo','Kazuki','Naoki'],
  KR:['Dohyun','Doyun','Jaehyun','Jihoon','Jinwoo','Junseo','Minjae','Minjun','Sangwoo','Seojun','Seongmin','Sungho','Taeyang','Woojin','Yeonjun','Hyunwoo'],
};
// Names draw from their OWN random stream, never from Math.random.
// Why: the tests seed Math.random for reproducible worlds, so the *number* of
// draws a name costs used to shift every later stat/budget roll. Measured: the
// weighted picker below, when fed by Math.random, pushed 8.3% of top-flight
// clubs above 110% of their budget (was 0%) purely by re-aligning the stream.
// A private PRNG keeps naming cosmetic — balance is untouched by name changes.
let _nameSeed=(Date.now()^0x9e3779b9)>>>0;
function nameRand(){
  _nameSeed^=_nameSeed<<13;_nameSeed>>>=0;
  _nameSeed^=_nameSeed>>>17;
  _nameSeed^=_nameSeed<<5;_nameSeed>>>=0;
  return _nameSeed/4294967296;
}
function nameInt(n){return Math.min(n-1,Math.floor(nameRand()*n));}
// Draw index biased toward the start of a frequency-ordered list.
function weightedIndex(len){
  const pow=nameRand()<0.7?3:nameRand()<0.9?1.6:1;   // most draws land in the top slice
  return Math.min(len-1,Math.floor(Math.pow(nameRand(),pow)*len));
}
function randNameForCountry(countryId,age){
  const id=countryId||(typeof store!=='undefined'&&store.G&&store.G.countryId)||'PL';
  const pools=getCountryNamePools(id);
  const common=COMMON_FIRST[id];
  // Veterans reach into the archaic tail more often; teenagers almost never do.
  const tailChance=age==null?0.14:age>=34?0.30:age>=28?0.16:age>=22?0.10:0.06;
  const first=(common&&common.length&&nameRand()>tailChance)
    ? common[nameInt(common.length)]
    : pools.firstNames[nameInt(pools.firstNames.length)];
  const last=pools.lastNames[weightedIndex(pools.lastNames.length)];
  return first+' '+last;
}

window.PPM.utils = { rnd, sleep, formatMoney, clamp, getCountryNamePools, randNameForCountry, COMMON_FIRST };
