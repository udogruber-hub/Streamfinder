import { useState, useEffect, useRef } from "react";

const PROXY_URL = "https://stream.thoramus.workers.dev";
const TMDB_API_KEY = "7b1cb8c1071afbbf54d15e7724645086";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

const LANGUAGE_OPTIONS = [
  {id:"en",    label:"Englisch",   flag:"🇬🇧"},
  {id:"de",    label:"Deutsch",    flag:"🇩🇪"},
  {id:"fr",    label:"Französisch",flag:"🇫🇷"},
  {id:"es",    label:"Spanisch",   flag:"🇪🇸"},
  {id:"it",    label:"Italienisch",flag:"🇮🇹"},
  {id:"ja",    label:"Japanisch",  flag:"🇯🇵"},
  {id:"ko",    label:"Koreanisch", flag:"🇰🇷"},
];

const PLATFORMS = [
  { id:"netflix",   name:"Netflix",     color:"#E50914", icon:"N",  tmdbIds:[8] },
  { id:"prime",     name:"Prime Video", color:"#00A8E1", icon:"P",  tmdbIds:[9,119] },
  { id:"appletv",   name:"Apple TV+",   color:"#A2AAAD", icon:"🍎", tmdbIds:[350] },
  { id:"disney",    name:"Disney+",     color:"#113CCF", icon:"D",  tmdbIds:[337] },
  { id:"wow",       name:"WOW",         color:"#00B4CC", icon:"W",  tmdbIds:[29,30] },
  { id:"paramount", name:"Paramount+",  color:"#0064FF", icon:"P+", tmdbIds:[531,1853] },
  { id:"hbomax",    name:"HBO Max",     color:"#9B59B6", icon:"H",  tmdbIds:[1899,384] },
  { id:"rtl",       name:"RTL+",        color:"#FF0000", icon:"R",  tmdbIds:[257] },
];


const GENRES_TMDB = {
  28:"Action",12:"Abenteuer",16:"Animation",35:"Komödie",80:"Krimi",
  99:"Doku",18:"Drama",10751:"Familie",14:"Fantasy",36:"Geschichte",
  27:"Horror",9648:"Mystery",10749:"Romantik",878:"Sci-Fi",53:"Thriller",
  10752:"Krieg",37:"Western",10759:"Action & Abenteuer",10765:"Sci-Fi & Fantasy",
};
const GENRE_EMOJI = {
  28:"💥",12:"⚡",16:"✨",35:"😂",80:"🔍",99:"📷",18:"🎭",10751:"👨‍👩‍👧",
  14:"🐉",36:"📜",27:"👻",9648:"🔮",10749:"💕",878:"🚀",53:"🔪",10752:"⚔️",37:"🤠",
};

const MOODS = [
  { id:"action",  label:"Action",        color:"#ef4444", genres:[28],        strictType:null },
  { id:"comedy",  label:"Komödie",       color:"#f59e0b", genres:[35],        strictType:null },
  { id:"drama",   label:"Drama",         color:"#8b5cf6", genres:[18],        strictType:null },
  { id:"scifi",   label:"Sci-Fi",        color:"#06b6d4", genres:[878,10765], strictType:null },
  { id:"horror",  label:"Horror",        color:"#dc2626", genres:[27],        strictType:null },
  { id:"doku",    label:"Doku",          color:"#10b981", genres:[99],        strictType:null },
  { id:"krimi",   label:"Krimi",         color:"#6366f1", genres:[80,9648],   strictType:null },
  { id:"family",  label:"Familie",       color:"#f97316", genres:[10751,16],  strictType:null },
  { id:"romance", label:"Romantik",      color:"#ec4899", genres:[10749],     strictType:null },
  { id:"thriller",label:"Thriller",      color:"#64748b", genres:[53],        strictType:null },
];

const REF_TITLES = [
  {title:"Breaking Bad",    emoji:"🧪", genres:[18,80]},
  {title:"Titanic",         emoji:"🚢", genres:[10749,18]},
  {title:"Game of Thrones", emoji:"⚔️", genres:[14,18]},
  {title:"The Office",      emoji:"😂", genres:[35]},
  {title:"Inception",       emoji:"🌀", genres:[878,28]},
  {title:"Squid Game",      emoji:"🎮", genres:[53,18]},
  {title:"Planet Erde",     emoji:"🌍", genres:[99]},
  {title:"The Boys",        emoji:"💥", genres:[28,35]},
  {title:"John Wick",       emoji:"🔫", genres:[28,53]},
  {title:"Bridgerton",      emoji:"💕", genres:[10749,18]},
  {title:"Stranger Things", emoji:"👾", genres:[878,27,18]},
  {title:"Tatort",          emoji:"🔍", genres:[80,18]},
];

const WEEKDAY_VIBES = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

const QUIPS_HOME = [
  "Dein Sofa ruft. Wir haben gehört.",
  "Besser als dein Ex im Empfehlen. Garantiert.",
  "Heute Abend wird gebingt. Kein Widerspruch.",
  "Kein Stress — wir denken für dich nach.",
  "Fernbedienung bereit? Los.",
  "Der Algorithmus hat gesprochen. Hör zu.",
  "3... 2... 1... Binge!",
  "Was auch immer du heute hattest — das hier ist besser.",
  "Andere scrollen Netflix durch. Du hast uns.",
  "Handyakku voll? Getränke kalt? Gut.",
  "Niemand muss es wissen, was du heute schaust.",
  "Empfohlen vom einzigen Algorithmus der dich kennt.",
  "Das nächste Gespräch beim Mittagessen beginnt hier.",
];

const SURPRISE_MSGS = [
  "🎲 Die Würfel haben entschieden!",
  "🎰 Jackpot! Du schaust heute...",
  "🎯 Volltreffer! Heute Abend gibt's...",
  "🍿 Dein Sofa hat abgestimmt:",
  "🎬 Trommelwirbel bitte...",
  "✨ Tadaaa! Das wird gut:",
];

function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

var _mem = {};
function sGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return _mem[k]?JSON.parse(_mem[k]):null;}}
function sSet(k,v){var s=JSON.stringify(v);try{localStorage.setItem(k,s);}catch(e){_mem[k]=s;}}
function sDel(k){try{localStorage.removeItem(k);}catch(e){delete _mem[k];}}

// stable normalized title key for ratings/dislikes
function titleKey(item){
  const t=(typeof item==="string"?item:(item?.title||item?.name||"")).toLowerCase().trim();
  return t;
}

function tmdbFetch(path,params){
  var url=TMDB_BASE+path+"?api_key="+TMDB_API_KEY+"&language=de-DE&region=DE";
  if(params)Object.keys(params).forEach(k=>{url+="&"+k+"="+encodeURIComponent(params[k]);});
  return fetch(url).then(r=>r.json());
}
function discoverTitles(type,providerIds,genreStr,page,sortBy,langFilter){
  var mt=type==="serie"?"tv":"movie";
  var params={with_watch_providers:providerIds.join("|"),watch_region:"DE",with_watch_monetization_types:"flatrate",sort_by:sortBy||"popularity.desc",page:page||1,"vote_count.gte":20};
  if(genreStr)params.with_genres=genreStr;
  if(langFilter&&langFilter.length>0)params.with_original_language=langFilter.join("|");
  return tmdbFetch("/discover/"+mt,params);
}
function getDetails(mediaType,id){ return tmdbFetch("/"+mediaType+"/"+id,{append_to_response:"credits,watch/providers,reviews,external_ids"}); }
function searchTitles(query){ return tmdbFetch("/search/multi",{query}); }
function getTrending(mediaType){ return fetch(TMDB_BASE+"/trending/"+mediaType+"/week?api_key="+TMDB_API_KEY+"&language=de-DE").then(r=>r.json()); }

// ── Discover AI Functions ──
const VIBE_REASONS = [
  "Weil du offensichtlich Geschmack hast.",
  "Perfekt für deinen aktuellen Gemütszustand.",
  "Der Algorithmus hat gesprochen. Keine Widerrede.",
  "Dein Sofa wird es dir danken.",
  "Manchmal weiß die KI es besser. Diesmal definitiv.",
  "Vertrau dem Prozess. Und uns.",
];

const DEEPDIVE_CONNECTIONS = [
  "Gleiche Energie, anderes Universum",
  "Vom selben Schlag — nur versteckter",
  "Wenn dir das gefiel, wird dich das umhauen",
  "Die logische nächste Station",
  "Gleicher Vibe, andere Plattform",
  "Die unbekannte Schwester-Serie",
];

async function getDeepDive(profile, title){
  const ctx = buildCtx(profile);
  const system = `Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks.
Format: [{"title":"...","year":"...","platform":"...","type":"Film oder Serie","connection":"...","reason":"...","emoji":"..."}]
connection = kurze kreative Beschreibung der Verbindung zu "${title}" (z.B. "Gleicher Regisseur", "Ähnliche Energie", "Verborgene Perle")`;
  const msg = `Der Nutzer liebt "${title}". Baue ein Entdeckungs-Universum mit 6 verwandten Titeln.

Plattformen des Nutzers: ${ctx.platforms}
Nutzer liebt auch: ${ctx.top || "nichts bewertet"}
Nicht empfehlen (gesehen): ${ctx.watched || "nichts"}

Regeln:
- Verschiedene Verbindungsarten: Gleicher Regisseur, ähnliche Atmosphäre, selbes Genre aber unbekannter, internationaler Geheimtipp, etc.
- NUR Titel die auf den Plattformen des Nutzers verfügbar sind: ${ctx.platforms}
- reason = 1 variabler witziger Satz warum dieser Nutzer DIESEN Titel nach ${title} schauen muss
- Keine generischen Begründungen — sei kreativ und spezifisch`;
  const text = await callAI([{role:"user",content:msg}], system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return [];}
}

async function getVibePicks(profile, trash, heavy, dark){
  const ctx = buildCtx(profile);
  const vibeDesc = [
    trash > 60 ? "guilty pleasure, leicht schräg" : trash < 40 ? "hochwertig, anspruchsvoll" : "ausgewogen",
    heavy > 60 ? "tiefgründig, komplex" : heavy < 40 ? "leicht, entspannt" : "mittel",
    dark > 60 ? "düster, intensiv" : dark < 40 ? "leicht, humorvoll" : "neutral",
  ].join(", ");
  const system = `Du bist ein witziger Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks.
Format: [{"title":"...","year":"...","platform":"...","type":"Film oder Serie","reason":"...","emoji":"..."}]`;
  const msg = `Empfehle 4 Titel basierend auf diesem Vibe-Profil: ${vibeDesc}

NUR auf diesen Plattformen verfügbar (PFLICHT!): ${ctx.platforms}
Nutzer liebt: ${ctx.top || "nichts"}
Nicht empfehlen: ${ctx.watched || "nichts"}
Blockiert: ${ctx.blocked || "nichts"}

reason = vollständiger Satz der erklärt warum dieser Titel exakt zu diesem Vibe passt. Mindestens 8 Wörter.`;
  const text = await callAI([{role:"user",content:msg}], system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return [];}
}

async function getStreamBotReply(profile, query){
  const ctx = buildCtx(profile);
  const system = `Du bist ein witziger, persönlicher Streaming-Berater namens StreamBot. Antworte mit kurzer Einleitung (1-2 Sätze, locker auf Deutsch) + JSON-Array der Picks.
Format der Antwort:
INTRO: [deine witzige Einleitung]
PICKS: [{"title":"...","year":"...","platform":"...","type":"Film oder Serie","reason":"...","emoji":"..."}]`;
  const msg = `Nutzer fragt: "${query}"

NUR auf diesen Plattformen verfügbar (PFLICHT!): ${ctx.platforms}
Nutzer liebt: ${ctx.top || "noch nichts bewertet"}
Gesehen (nicht empfehlen): ${ctx.watched || "nichts"}
Lieblingsgenres: ${ctx.topGenres || "gemischt"}

Gib 4 Empfehlungen. reason = spezifischer Satz warum dieser Titel die Antwort auf die Anfrage ist.`;
  const text = await callAI([{role:"user",content:msg}], system);
  try{
    const introMatch = text.match(/INTRO:\s*(.+?)(?=PICKS:|$)/s);
    const picksMatch = text.match(/PICKS:\s*(\[.+\])/s);
    const intro = introMatch?introMatch[1].trim():"";
    const picks = picksMatch?JSON.parse(picksMatch[1].replace(/```json|```/g,"").trim()):[];
    return {intro, picks};
  }catch{return {intro:"Hier sind meine Picks:", picks:[]};}
}


async function callAI(messages,systemPrompt){
  try{
    const res=await fetch(PROXY_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        max_tokens:600,
        messages:[{role:"system",content:systemPrompt},...messages]
      }),
    });
    if(!res.ok){
      const errText=await res.text();
      throw new Error("Server Fehler "+res.status+": "+errText.substring(0,200));
    }
    const data=await res.json();
    if(data.error){
      const msg=data.error.message||JSON.stringify(data.error);
      // Rate limit detection
      if(msg.includes("rate_limit")||msg.includes("Rate limit")||msg.includes("quota")||msg.includes("429")){
        throw new Error("RATE_LIMIT");
      }
      throw new Error(msg.substring(0,200));
    }
    if(data.choices&&data.choices[0]&&data.choices[0].message){
      return data.choices[0].message.content;
    }
    throw new Error("Keine Antwort vom Server. Bitte nochmal versuchen.");
  }catch(e){
    console.error("callAI error:",e);
    throw e;
  }
}

function buildCtx(profile){
  const platforms=(profile.platforms||[]).map(id=>PLATFORMS.find(p=>p.id===id)?.name||id).join(", ");
  const ratings=profile.ratings||{};
  // Restore readable title from watched list where possible
  const watchedTitles=(profile.watched||[]).reduce((acc,w)=>{acc[titleKey(w.title)]=w.title;return acc;},{});
  const top=Object.entries(ratings).filter(([,v])=>v>=4)
    .map(([k,v])=>(watchedTitles[k]||k)+"("+v+"★)").slice(0,6).join(", ");
  const low=Object.entries(ratings).filter(([,v])=>v<=2&&v>0)
    .map(([k,v])=>(watchedTitles[k]||k)+"("+v+"★)").slice(0,6).join(", ");
  const blocked=(profile.blocked_titles||[]).slice(0,5).join(", ");
  const watched=(profile.watched||[]).slice(0,8).map(w=>w.title).join(", ");
  const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6).map(([gid])=>GENRES_TMDB[gid]||gid).join(", ");
  return{platforms,top,low,blocked,watched,topGenres};
}

// ── Smart Recommendation Algorithm ──
// Kein KI nötig — nutzt TMDB-Daten + Nutzerprofil
// ── Smart Reason Generator — kein KI, kein Token-Verbrauch ──
function generateSmartReason(title, score, genres, profile, platform){
  const topRating=Object.entries(profile.ratings||{}).filter(([,v])=>v>=4).map(([k])=>k)[0]||"";
  const topGenre=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).map(([g])=>GENRES_TMDB[g]||"")[0]||"";
  const s=score||0;
  const templates=[
    // Score-basiert
    s>=9  ? `Mit ${s}★ fast makellos — und trotzdem noch auf deiner To-Watch-Liste?` : null,
    s>=8.5? `${s}★. Nicht wir, die Masse hat entschieden. Und die hat meistens Recht.` : null,
    s>=8  ? `Gut genug für ${s}★, gut genug für heute Abend.` : null,
    s>=7  ? `Solide ${s}★ — besser als das was du letzte Woche geschaut hast.` : null,
    // Genre-basiert
    topGenre==="Drama"    ? `Wer ${topGenre} mag, kommt hier auf seine Kosten.` : null,
    topGenre==="Action"   ? `${topGenre}-Nerven werden hier befriedigt.` : null,
    topGenre==="Komödie"  ? `${topGenre} die tatsächlich witzig ist — eine Seltenheit.` : null,
    topGenre==="Thriller" ? `Spannender als dein letzter Arzttermin. Garantiert.` : null,
    topGenre==="Sci-Fi"   ? `Für den Kopf. Und den Rest.` : null,
    topGenre==="Krimi"    ? `Whodunit? Das findest du nur raus wenn du schaust.` : null,
    // Top-Titel basiert
    topRating ? `Wer ${topRating} mochte, wird hier nicht enttäuscht.` : null,
    // Plattform-basiert
    `Auf ${platform} versteckt — bis jetzt.`,
    `${platform} hat mehr zu bieten als du denkst. Hier der Beweis.`,
    // Allgemein witzig
    `Der Algorithmus tippt hier auf ein Ja. Vertrau dem Prozess.`,
    `Noch nicht gesehen? Das ändern wir.`,
    `Dein nächstes Gesprächsthema beim Mittagessen.`,
    `Manche entdecken es zu spät. Du nicht.`,
    `Nicht für jeden. Aber für dich.`,
  ].filter(Boolean);
  return templates[Math.floor(Math.random()*templates.length)];
}


// Enrich AI-generated title with TMDB data (poster, score, overview)

// TMDB-basierte Top 5 pro Anbieter — kein KI nötig


async function getSmartRecommendations(profile){
  const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
  const allIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337,350];
  
  const ratings=profile.ratings||{};
  const watched=profile.watched||[];
  const watchedIds=new Set(watched.map(w=>w.id));
  const likedIds=new Set(profile.liked||[]);
  const blockedKeys=new Set(profile.blocked_titles||[]);
  
  // Berechne Genre-Gewichtung aus Bewertungen + gesehenen Titeln
  const genreScore={};
  Object.entries(profile.genres||{}).forEach(([g,v])=>{genreScore[g]=v;});
  
  // Extra Boost aus Sternbewertungen
  watched.forEach(w=>{
    const myRating=ratings[titleKey(w.title)]||0;
    if(myRating>=4)(w.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)+(myRating-3)*2;});
    if(myRating>0&&myRating<=2)(w.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)-(3-myRating)*2;});
  });
  
  // Top-Genres ermitteln
  const topGenres=Object.entries(genreScore).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([g])=>g);
  const badGenres=Object.entries(genreScore).filter(([,v])=>v<-2).map(([g])=>g);
  const genreStr=topGenres.length>0?topGenres.join("|"):null;
  
  const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
  // Lade mehrere Quellen parallel
  const sources=await Promise.all([
    getTrending("tv"),
    getTrending("movie"),
    discoverTitles("serie",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("film",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("serie",allIds,genreStr,2,"popularity.desc",langFilter),
    discoverTitles("film",allIds,genreStr,2,"popularity.desc",langFilter),
  ]).catch(()=>[]);
  
  // Alle Ergebnisse zusammenführen
  const all=[
    ...((sources[0]?.results||[]).map(r=>({...r,media_type:"tv",_source:"trending"}))),
    ...((sources[1]?.results||[]).map(r=>({...r,media_type:"movie",_source:"trending"}))),
    ...((sources[2]?.results||[]).map(r=>({...r,media_type:"tv",_source:"top_rated"}))),
    ...((sources[3]?.results||[]).map(r=>({...r,media_type:"movie",_source:"top_rated"}))),
    ...((sources[4]?.results||[]).map(r=>({...r,media_type:"tv",_source:"popular"}))),
    ...((sources[5]?.results||[]).map(r=>({...r,media_type:"movie",_source:"popular"}))),
  ];
  
  // Filtern + Scoring
  const seen=new Set();
  const scored=all.filter(it=>{
    if(!it||!it.id)return false;
    if(seen.has(it.id))return false;
    seen.add(it.id);
    if(watchedIds.has(it.id))return false;
    if(likedIds.has(it.id))return false;
    const t=titleKey(it.title||it.name||"");
    if(blockedKeys.has(t))return false;
    const myRating=ratings[t]||0;
    if(myRating>0&&myRating<3)return false;
    if((it.vote_average||0)<5.5)return false;
    // Schlechte Genres ausfiltern
    if(badGenres.length>0&&(it.genre_ids||[]).every(g=>badGenres.includes(String(g))))return false;
    return true;
  }).map(it=>{
    let score=0;
    
    // 1. TMDB Rating (0-20 Punkte)
    score+=(it.vote_average||0)*2;
    
    // 2. Genre-Match (0-40 Punkte)
    (it.genre_ids||[]).forEach(g=>{
      score+=(genreScore[g]||0)*3;
    });
    
    // 3. Popularität normalisiert (0-10 Punkte)
    score+=Math.min(10,(it.popularity||0)/100);
    
    // 4. Neuheit (neuere Titel leicht bevorzugt)
    const year=parseInt((it.release_date||it.first_air_date||"2000").substring(0,4));
    if(year>=2022)score+=4;
    else if(year>=2019)score+=2;
    
    // 5. Trending-Bonus
    if(it._source==="trending")score+=5;
    
    // 6. Top-Rated Bonus
    if(it._source==="top_rated"&&(it.vote_average||0)>=8)score+=6;
    
    return{...it,_score:score};
  }).sort((a,b)=>b._score-a._score);
  
  // Diversität sicherstellen: nicht alle vom gleichen Typ
  const series=scored.filter(it=>it.media_type==="tv");
  const films=scored.filter(it=>it.media_type==="movie");
  
  // Abwechselnd Serie/Film für bessere Mischung
  const mixed=[];
  const maxLen=Math.max(series.length,films.length);
  for(let i=0;i<maxLen&&mixed.length<20;i++){
    if(i<series.length)mixed.push(series[i]);
    if(i<films.length&&mixed.length<20)mixed.push(films[i]);
  }
  
  return mixed.slice(0,20);
}


async function getAIHomeFeed(profile){
  const ctx=buildCtx(profile);
  const hasRatings=Object.keys(profile.ratings||{}).length>0;
  const hasWatched=(profile.watched||[]).length>0;
  const system=`Du bist ein persönlicher Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks.
Format: [{"title":"...","year":"...","platform":"...","type":"Serie oder Film","genre":"...","reason":"...","emoji":"..."}]
WICHTIG: Nur echte existierende Titel empfehlen die auf den genannten Plattformen in Deutschland verfügbar sind.`;

  const msg=`Erstelle 8 personalisierte Empfehlungen (Mix aus Serien und Filmen).

NUR auf diesen Plattformen verfügbar (PFLICHT): ${ctx.platforms||"Netflix, Prime Video"}

${hasRatings?`LIEBT diese Titel (4-5★) — empfehle ÄHNLICHES: ${ctx.top}`:"Noch keine Bewertungen — empfehle populäre Top-Titel"}
${ctx.low?`HASST diese Titel (1-2★) — diese Genres/Stile VERMEIDEN: ${ctx.low}`:""}
${ctx.blocked?`BLOCKIERT — NIEMALS empfehlen: ${ctx.blocked}`:""}
${hasWatched?`BEREITS GESEHEN — NICHT nochmal empfehlen: ${ctx.watched}`:""}
${ctx.topGenres?`Lieblingsgenres: ${ctx.topGenres}`:""}

Regeln:
- Empfehle NICHTS aus den Listen "GESEHEN" oder "BLOCKIERT"
- ${hasRatings?"Orientiere dich STARK an den hochbewerteten Titeln":"Wähle beliebte, gut bewertete Titel"}
- Abwechslung: verschiedene Genres, Mix Serie/Film
- reason = 1 witziger Satz Deutsch warum dieser Titel SPEZIELL zu diesem Nutzer passt`;

  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

// Enrich AI-generated title with TMDB data (poster, score, overview)
async function enrichWithTMDB(rec,profile){
  try{
    const isTV=rec.type==="Serie"||rec.type==="tv"||rec.media_type==="tv";
    const mt=isTV?"tv":"movie";
    // Suche auf Englisch für bessere Trefferquote
    const res=await fetch(
      TMDB_BASE+"/search/"+(mt==="tv"?"tv":"movie")+"?api_key="+TMDB_API_KEY+
      "&language=en-US&query="+encodeURIComponent(rec.title)+
      (rec.year?"&first_air_date_year="+rec.year:"")
    ).then(r=>r.json());
    const results=res.results||[];
    // Finde besten Treffer — exakter Titelvergleich zuerst
    const exact=results.find(r=>{
      const t=(r.title||r.name||"").toLowerCase().trim();
      return t===rec.title.toLowerCase().trim();
    });
    const found=exact||results[0];
    if(!found)return null;
    return{
      ...found,
      media_type:mt,
      _aiReason:rec.reason,
      _aiEmoji:rec.emoji,
      _platform:rec.platform,
    };
  }catch{return null;}
}

// TMDB-basierte Top 5 pro Anbieter
async function getTMDBTop5(profile,platform,type){
  const ratings=profile.ratings||{};
  const watched=new Set((profile.watched||[]).map(w=>w.id));
  const blocked=new Set(profile.blocked_titles||[]);
  const liked=new Set(profile.liked||[]);
  const genres=profile.genres||{};
  // Top Genres aus Profil — enthält Swipe-Boosts
  const topGenres=Object.entries(genres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([gid])=>gid);
  const genreStr=topGenres.length>0?topGenres.join("|"):null;
  const mt=type==="serie"?"tv":"movie";
  const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;

  const [r1,r2,r3]=await Promise.all([
    discoverTitles(type,platform.tmdbIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles(type,platform.tmdbIds,genreStr,2,"vote_average.desc",langFilter),
    discoverTitles(type,platform.tmdbIds,null,1,"popularity.desc",langFilter),
  ]);
  const all=[...(r1.results||[]),...(r2.results||[]),...(r3.results||[])];
  const seen=new Set();
  return all
    .map(r=>({...r,media_type:mt}))
    .filter(r=>{
      if(seen.has(r.id))return false;
      seen.add(r.id);
      if(watched.has(r.id))return false;
      if(liked.has(r.id))return false;
      const t=titleKey(r.title||r.name||"");
      if(blocked.has(t))return false;
      const myRating=ratings[t]||0;
      if(myRating>0&&myRating<3)return false;
      if((r.vote_average||0)<6)return false;
      return true;
    })
    .map(r=>{
      let s=(r.vote_average||0)*2;
      // Genre-Boost ×3 — Swipe-Effekt sichtbar
      (r.genre_ids||[]).forEach(g=>{s+=(genres[g]||0)*3;});
      return{...r,_score:s};
    })
    .sort((a,b)=>b._score-a._score)
    .slice(0,5);
}

async function getAITop5(profile,type){
  const ctx=buildCtx(profile);
  const typeStr=type==="serie"?"Serien":"Filme";
  const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. NUR ${typeStr} (kein Mix!). Format: [{"title":"...","year":"...","platform":"...","reason":"...","emoji":"..."}]`;
  const msg=`Empfehle 5 ${typeStr} auf: ${ctx.platforms||"diverse"}.\n\nNutzer-Profil:\n- LIEBT (4-5★): ${ctx.top||"noch nichts"}\n- HASST (1-2★): ${ctx.low||"nichts"}\n- BLOCKIERT (NIE empfehlen!): ${ctx.blocked||"nichts"}\n- BEREITS GESEHEN (NICHT empfehlen!): ${ctx.watched||"nichts"}\n- Lieblingsgenres: ${ctx.topGenres||"gemischt"}\n\nWICHTIG: Empfehle KEINE Titel die in "GESEHEN" oder "BLOCKIERT" stehen.\nBerücksichtige die Bewertungen — wenn jemand z.B. Action mit 5★ bewertet hat, empfehle ähnliche Action-Titel.\nreason = 1 witziger Satz Deutsch der erklärt WARUM dieser Titel basierend auf den Bewertungen passt.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

async function getPlatformTop5(profile,platformName,type){
  const ctx=buildCtx(profile);
  const typeStr=type==="serie"?"Serien":"Filme";
  const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. NUR ${typeStr}. Format: [{"title":"...","year":"...","reason":"...","emoji":"..."}]`;
  const msg=`Empfehle genau 5 ${typeStr} die JETZT auf ${platformName} Deutschland verfügbar sind.\n\nNutzer:\n- LIEBT: ${ctx.top||"noch nichts"}\n- HASST: ${ctx.low||"nichts"}\n- BLOCKIERT (NIE empfehlen!): ${ctx.blocked||"nichts"}\n- GESEHEN (NIE empfehlen!): ${ctx.watched||"nichts"}\n- Lieblingsgenres: ${ctx.topGenres||"gemischt"}\n\nNICHT empfehlen was bereits gesehen oder blockiert wurde.\nBerücksichtige die Bewertungen für personalisierte Picks.\nreason = 1 witziger Satz Deutsch warum dieser Titel zu diesem Nutzer passt.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

async function getSurprise(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein dramatisches Streaming-Orakel. Antworte NUR mit JSON, keine Backticks. Format: {"title":"...","year":"...","platform":"...","prophecy":"...","emoji":"..."}`;
  const msg=`EIN Titel für heute Abend.\nPlattformen: ${ctx.platforms}.\nLIEBT: ${ctx.top||"nichts"}.\nGESEHEN (NICHT wählen!): ${ctx.watched||"nichts"}.\nBLOCKIERT (NICHT wählen!): ${ctx.blocked||"nichts"}.\nGenres: ${ctx.topGenres||"gemischt"}.\nprophecy = dramatisch-witzige Prophezeiung Deutsch. Max 2 Sätze.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getOracle(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein mystisches Streaming-Orakel. Antworte NUR mit JSON, keine Backticks. Format: {"title":"...","year":"...","platform":"...","prophecy":"...","emoji":"..."}`;
  const msg=`Wähle einen ÜBERRASCHENDEN Titel — etwas Mystisches, Unerwartetes.\nPlattformen: ${ctx.platforms}.\nGESEHEN (NICHT wählen!): ${ctx.watched||"nichts"}.\nBLOCKIERT (NICHT wählen!): ${ctx.blocked||"nichts"}.\nHASST (Genres meiden): ${ctx.low||"nichts"}.\nprophecy = mystisch-dramatische Prophezeiung Deutsch. Max 2 Sätze. Wie ein echtes Orakel.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getPersonalityType(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein witziger Streaming-Psychologe. Antworte NUR mit JSON, keine Backticks. Format: {"type":"...","emoji":"...","description":"...","weakness":"...","recommendation":"..."}`;
  const msg=`Analysiere diesen Nutzer.\nLIEBT: ${ctx.top||"nichts"}.\nHASST: ${ctx.low||"nichts"}.\nGESEHEN: ${ctx.watched||"nichts"}.\nGenres: ${ctx.topGenres||"gemischt"}.\ntype = lustiger Name (z.B. "Der Serienleichen-Sammler").\ndescription = 2 Sätze witzig auf Deutsch.\nweakness = 1 Satz Schwäche.\nrecommendation = 1 konkreter Titel.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getPopcornMeter(title){
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];
  const system=`Du bist ein witziger Streaming-Kritiker. Antworte NUR mit JSON, keine Backticks. Format: {"score":85,"label":"...","reason":"...","popcorn":"..."}`;
  const msg=`Wie gut passt "${title}" zu einem ${day}abend?\nscore=0-100. label=lustig. reason=1 Satz Deutsch. popcorn=Emojis (🍿🍿🍿).`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

// ── Star Rating ──
function StarRating({itemTitle,profile,onRate,size}){
  const key=titleKey(itemTitle);
  const current=(profile.ratings||{})[key]||0;
  const [hover,setHover]=useState(0);
  const sz=size||20;
  return(
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {[1,2,3,4,5].map(star=>(
        <button key={star} onClick={e=>{e.stopPropagation();onRate(itemTitle,star===current?0:star);}}
          onMouseEnter={()=>setHover(star)} onMouseLeave={()=>setHover(0)}
          style={{background:"transparent",border:"none",cursor:"pointer",padding:"1px",fontSize:sz,lineHeight:1,transition:"transform 0.1s",transform:(hover||current)>=star?"scale(1.2)":"scale(1)"}}>
          <span style={{color:(hover||current)>=star?"#f5c518":"#3a3344"}}>{(hover||current)>=star?"★":"☆"}</span>
        </button>
      ))}
    </div>
  );
}

// ── Popcorn Meter ──
function PopcornMeter({item}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const title=item.title||item.name||"";
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];
  async function check(){
    setLoading(true);
    setData(await getPopcornMeter(title).catch(()=>null));setLoading(false);
  }
  return(
    <div style={{marginTop:10}}>
      {!data&&!loading&&<button onClick={e=>{e.stopPropagation();check();}} style={{width:"100%",background:"#1a1a2e",border:"1px solid #2a2340",borderRadius:10,padding:"8px",color:"#b0a8b8",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:600}}>🍿 Popcorn-o-Meter für {day}</button>}
      {loading&&<p style={{fontSize:12,color:"#888",textAlign:"center"}}>Messe Popcorn-Kompatibilität... 🍿</p>}
      {data&&(
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#12121f)",borderRadius:12,padding:"10px 12px",border:"1px solid #2a2340"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:"#f5c518"}}>{data.popcorn}</span>
            <span style={{fontSize:14,fontWeight:800,color:data.score>=70?"#4ade80":data.score>=40?"#fbbf24":"#ef4444"}}>{data.score}/100</span>
          </div>
          <div style={{height:4,borderRadius:2,background:"#0d0d18",marginBottom:6,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,width:data.score+"%",background:data.score>=70?"linear-gradient(90deg,#4ade80,#22d3ee)":data.score>=40?"#fbbf24":"#ef4444",transition:"width 0.8s"}}/></div>
          <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,marginBottom:2}}>{data.label}</p>
          <p style={{fontSize:11,color:"#a09aaa",fontStyle:"italic",margin:0}}>{data.reason}</p>
        </div>
      )}
    </div>
  );
}

// ── Help Modal ──
function HelpModal({onClose,activeTab}){
  const [selectedTab,setSelectedTab]=useState(activeTab||"home");

  const TABS=[
    {id:"home",    label:"✨ Für dich",  icon:"✨"},
    {id:"browse",  label:"🔍 Entdecken", icon:"🔍"},
    {id:"fun",     label:"🎲 Spaß",      icon:"🎲"},
    {id:"liked",   label:"❤️ Merkliste", icon:"❤️"},
    {id:"history", label:"📋 Verlauf",   icon:"📋"},
  ];

  const HELP={
    home:{
      title:"✨ Für dich",
      intro:"Deine persönliche Startseite — personalisiert nach deinem Geschmack. Je mehr du bewertest, desto besser die Empfehlungen.",
      items:[
        {icon:"⭐",title:"Sterne bewerten",text:"Tippe auf einen Titel → Detail-Ansicht → Sterne vergeben. 1-2★ = nie wieder · 3★ = okay · 4-5★ = mehr davon! Der Algorithmus reagiert sofort."},
        {icon:"🎭",title:"Stimmung wählen",text:"Die farbigen Pills oben wechseln das Genre sofort. Action, Drama, Sci-Fi, Horror... Nochmal tippen = zurück zu deinen persönlichen Picks."},
        {icon:"←",title:"Ausblenden per Wischen",text:"Einen Titel links wischen blendet ihn dauerhaft aus — er erscheint nie wieder in Empfehlungen. Siehst du es beim Wischen: roter 'Ausblenden'-Text."},
        {icon:"🔄",title:"Liste bleibt aktuell",text:"Titel die du als gesehen markierst oder schlecht bewertest verschwinden sofort aus der Liste. Beim nächsten Start kommen automatisch neue."},
        {icon:"👁",title:"Als gesehen markieren",text:"Öffne einen Titel → 'Als gesehen' tippen. Er wandert in den Verlauf und wird nie mehr empfohlen."},
        {icon:"🤍",title:"Merken",text:"Für Titel die du noch sehen möchtest. Landung in der Merkliste — jederzeit abrufbar."},
        {icon:"💡",title:"Wie der Algorithmus lernt",text:"Jede Bewertung, jeder gesehene Titel, jedes Ausblenden verbessert dein Profil. Nach 10+ Bewertungen merkst du den Unterschied deutlich."},
      ]
    },
    browse:{
      title:"🔍 Entdecken",
      intro:"Vier Wege zum perfekten Titel — vom gezielten Stöbern bis zum KI-Gespräch.",
      items:[
        {icon:"📺",title:"Anbieter durchstöbern",text:"Tippe einen Anbieter an — Top 5 passende Titel laden sofort nach deinen Bewertungen. 💘 Swipe wechselt in den Tinder-Modus. 🔄 lädt neue Picks."},
        {icon:"←",title:"Swipe beim Stöbern",text:"Im Swipe-Modus: rechts wischen = merken, links wischen = ausblenden. Nach dem Durchswipen zeigt der Anbieter wieder seine Top 5."},
        {icon:"🔭",title:"Deep Dive",text:"Gib einen Lieblingstitel ein — StreamFinder baut ein ganzes Entdeckungs-Universum daraus. Gleicher Regisseur, ähnliche Energie, verborgene Perlen."},
        {icon:"🎛️",title:"Vibe-Meter",text:"Drei Regler: Trash vs. Hochkultur · Easy vs. Kopfkino · Lustig vs. Dunkel. Einstellen → 4 Picks die exakt zu deinem heutigen Mood passen."},
        {icon:"💬",title:"StreamBot",text:"Tippe einfach was du willst: 'Wie Breaking Bad aber lustiger' oder 'Etwas für einen verregneten Sonntag'. Der Bot antwortet mit konkreten Picks und einer Erklärung."},
        {icon:"🔄",title:"Aktualisieren",text:"Jeder Bereich hat einen 🔄 Button — tippe für frische Empfehlungen. Besonders sinnvoll nach neuen Bewertungen."},
      ]
    },
    fun:{
      title:"🎲 Spaß-Ecke",
      intro:"Wenn normales Suchen zu langweilig ist. Hier entscheidet die KI — oder du befragst das Orakel.",
      items:[
        {icon:"🎲",title:"Überrasch mich!",text:"Du kannst dich nicht entscheiden? Die KI entscheidet für dich — basierend auf deinem Profil, mit dramatischer Begründung warum genau dieser Titel heute Abend sein muss."},
        {icon:"🔮",title:"Das Orakel",text:"Mystischer als 'Überrasch mich'. Das Orakel ignoriert manchmal das Profil und wählt etwas Unerwartetes. Manchmal trifft es den Nagel auf den Kopf."},
        {icon:"🧠",title:"Dein Streaming-Typ",text:"Die KI analysiert alle deine Bewertungen und gibt dir deinen persönlichen Streaming-Persönlichkeitstyp — mit Stärken, Schwächen und einer Diagnose. Ehrlich und manchmal schonungslos."},
        {icon:"💡",title:"Wann es am besten funktioniert",text:"Mit 5+ Bewertungen im Verlauf werden alle drei Features deutlich treffsicherer. Mit leerem Profil rät die KI — mit vollem Profil kennt sie dich."},
        {icon:"⚡",title:"KI-Limit",text:"Die KI-Features laufen über einen Server mit Tageslimit. Wenn mal keine Antwort kommt, einfach morgen wieder versuchen — das Limit resettet sich täglich um 2 Uhr nachts."},
      ]
    },
    liked:{
      title:"❤️ Merkliste",
      intro:"Deine persönliche Watchlist — alles was du noch sehen möchtest.",
      items:[
        {icon:"🤍",title:"Titel merken",text:"Bei jedem Titel den 'Merken' Button tippen — er landet sofort hier. Funktioniert aus allen Tabs: Startseite, Entdecken, Spaß, Suche."},
        {icon:"❤️",title:"Bereits gemerkt",text:"Rote Herzen zeigen gemerkte Titel an. Nochmal tippen = wieder entfernen. Die Liste bleibt gespeichert auch wenn du die App schließt."},
        {icon:"👁",title:"Als gesehen markieren",text:"Wenn du einen Titel aus der Merkliste geschaut hast, tippe 'Als gesehen' — er wandert in den Verlauf und wird aus der Merkliste entfernt."},
        {icon:"💡",title:"Merkliste vs. Empfehlungen",text:"Die Merkliste beeinflusst die Empfehlungen nicht direkt. Für bessere Empfehlungen: Sterne vergeben und 'Als gesehen' markieren."},
      ]
    },
    history:{
      title:"📋 Verlauf & Profil",
      intro:"Dein Streaming-Gedächtnis — alles was du bewertet und gesehen hast, plus dein Geschmacksprofil.",
      items:[
        {icon:"✅",title:"Gesehene Titel",text:"Alle Titel die du als gesehen markiert hast — mit deiner Sterne-Bewertung. Tippe ✕ um einen zu entfernen. Gesehene Titel tauchen nie mehr in Empfehlungen auf."},
        {icon:"⭐",title:"Bewertung ändern",text:"Tippe auf einen gesehenen Titel um seine Bewertung zu ändern. Das Profil und die Empfehlungen passen sich sofort an."},
        {icon:"🚫",title:"Ausgeblendete Titel",text:"Alle Titel die du per Wischgeste ausgeblendet hast. Tippe auf einen um ihn wieder freizugeben — er erscheint dann wieder in Empfehlungen."},
        {icon:"📊",title:"Dein Geschmacksprofil",text:"Der Balken-Graph zeigt deine Top-Genres. Je länger der Balken, desto stärker bevorzugst du dieses Genre. Wird bei jeder Bewertung automatisch aktualisiert."},
        {icon:"⚙️",title:"Einstellungen",text:"Über das Zahnrad oben rechts: Plattformen ändern, Profil zurücksetzen, oder das Onboarding neu starten wenn du dich verändern möchtest."},
        {icon:"💡",title:"Profil zurücksetzen",text:"Wenn die Empfehlungen nicht mehr passen — Einstellungen → Profil zurücksetzen. Das Onboarding startet neu und du kannst von vorne beginnen."},
      ]
    },
  };

  const current=HELP[selectedTab];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"linear-gradient(180deg,#13121f,#09090f)",minHeight:"100vh",maxWidth:560,margin:"0 auto",padding:"24px 20px 100px"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,margin:0,background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Hilfe</h2>
          <button onClick={onClose} style={{background:"#12121f",border:"1px solid #2a2340",borderRadius:10,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans'",fontWeight:700}}>✕</button>
        </div>

        {/* Tab selector */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:20}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setSelectedTab(t.id)}
              style={{background:selectedTab===t.id?"linear-gradient(135deg,#ff6b35,#e84393)":"#12121f",border:"1px solid "+(selectedTab===t.id?"transparent":"#1e1e30"),borderRadius:20,padding:"7px 14px",cursor:"pointer",color:selectedTab===t.id?"#fff":"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:700,fontSize:11,whiteSpace:"nowrap",flexShrink:0,transition:"all 0.2s"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#f0ece4"}}>{current.title}</h3>
        <p style={{fontSize:13,color:"#b0a8b8",lineHeight:1.6,marginBottom:16}}>{current.intro}</p>

        {current.items.map((item,i)=>(
          <div key={i} style={{background:"#12121f",borderRadius:14,padding:14,marginBottom:10,border:"1px solid #1e1e30",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{fontSize:22,flexShrink:0,marginTop:2}}>{item.icon}</div>
            <div>
              <h4 style={{fontSize:14,fontWeight:700,color:"#f0ece4",margin:"0 0 4px"}}>{item.title}</h4>
              <p style={{fontSize:13,color:"#b0a8b8",lineHeight:1.5,margin:0}}>{item.text}</p>
            </div>
          </div>
        ))}

        <button onClick={onClose} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:14,color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>
          Verstanden! 🍿
        </button>
      </div>
    </div>
  );
}

// ── Detail Modal ──
function DetailModal({item,profile,onClose,onRate,onLike,onWatched,onBlock}){
  const [details,setDetails]=useState(null);
  const [loading,setLoading]=useState(true);
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:(details?.vote_average?Math.round(details.vote_average*10)/10:0);
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const backdrop=(item.backdrop_path||details?.backdrop_path)?"https://image.tmdb.org/t/p/w780"+(item.backdrop_path||details?.backdrop_path):null;
  const poster=(item.poster_path||details?.poster_path)?TMDB_IMG+(item.poster_path||details?.poster_path):null;
  const overview=item.overview||details?.overview||"Keine Beschreibung verfügbar.";
  const imdbId=details?.external_ids?.imdb_id;
  const reviews=details?.reviews?.results||[];

  useEffect(()=>{
    if(item.id&&!item._aiOnly){
      setLoading(true);
      getDetails(mediaType,item.id).then(d=>{setDetails(d);setLoading(false);}).catch(()=>setLoading(false));
    }else{setLoading(false);}
  },[item.id]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:200,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"linear-gradient(180deg,#13121f,#09090f)",minHeight:"100vh",maxWidth:560,margin:"0 auto",paddingBottom:100}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"relative",height:220}}>
          {backdrop?<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.6}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)"}}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,#13121f 100%)"}}/>
          <div style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 12px"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#f0ece4"}}>{mediaType==="tv"?"📺 Serie":"🎬 Film"}</span>
          </div>
        </div>

        <div style={{padding:"0 20px"}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-end",marginTop:-50,marginBottom:16}}>
            {poster?<img src={poster} alt="" style={{width:80,height:120,borderRadius:14,objectFit:"cover",flexShrink:0,border:"3px solid #2a2340",boxShadow:"0 8px 32px rgba(0,0,0,0.67)"}}/>:<div style={{width:80,height:120,borderRadius:14,background:"#1a1a2e",flexShrink:0,border:"3px solid #2a2340",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🎬</div>}
            <div style={{flex:1,paddingBottom:4,minWidth:0}}>
              <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 4px",color:"#f0ece4",lineHeight:1.2}}>{title}</h2>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                {year&&<span style={{fontSize:12,color:"#b0a8b8"}}>{year}</span>}
                {score>0&&(
                  <div style={{display:"inline-flex",alignItems:"center",gap:3,background:`${scoreColor}18`,padding:"3px 8px",borderRadius:6}}>
                    <span style={{color:"#f5c518",fontSize:12}}>★</span>
                    <span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
                    <span style={{color:scoreColor,fontSize:9,fontWeight:700,opacity:0.8}}>IMDb-ähnlich</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rating + Block */}
          <div style={{background:"#12121f",borderRadius:14,padding:"14px 16px",marginBottom:12,border:"1px solid #1e1e30"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <div style={{fontSize:12,color:"#b0a8b8",fontWeight:600}}>Deine Bewertung</div>
                <div style={{fontSize:10,color:"#888",marginTop:2}}>Beeinflusst zukünftige Empfehlungen</div>
              </div>
              <StarRating itemTitle={title} profile={profile} onRate={onRate} size={26}/>
            </div>
            
          </div>

          {overview&&<p style={{fontSize:14,color:"#c4b8c8",lineHeight:1.7,marginBottom:16}}>{overview}</p>}

          {(item.genre_ids||details?.genres)&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {(item.genre_ids||(details?.genres||[]).map(g=>g.id)).map(gid=>GENRES_TMDB[gid]?<span key={gid} style={{fontSize:12,color:"#c4b8c8",background:"#1a1a2e",padding:"4px 10px",borderRadius:8}}>{GENRE_EMOJI[gid]} {GENRES_TMDB[gid]}</span>:null)}
            </div>
          )}

          {details?.credits?.cast?.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Besetzung</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {details.credits.cast.slice(0,8).map(c=>(
                  <div key={c.id} style={{flexShrink:0,textAlign:"center",width:60}}>
                    <div style={{width:50,height:50,borderRadius:25,background:"#1a1a2e",margin:"0 auto 4px",overflow:"hidden",border:"1px solid #2a2340"}}>
                      {c.profile_path?<img src={"https://image.tmdb.org/t/p/w92"+c.profile_path} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>}
                    </div>
                    <div style={{fontSize:10,color:"#b0a8b8",lineHeight:1.2}}>{c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details?.["watch/providers"]?.results?.DE?.flatrate?.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Verfügbar bei</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {details["watch/providers"].results.DE.flatrate.map(prov=>{
                  const known=PLATFORMS.find(p=>p.tmdbIds.includes(prov.provider_id));
                  return(<div key={prov.provider_id} style={{display:"flex",alignItems:"center",gap:6,background:known?known.color+"22":"#1a1a2e",border:"1px solid "+(known?known.color+"44":"#2a2a3e"),borderRadius:10,padding:"6px 12px"}}>
                    {prov.logo_path&&<img src={"https://image.tmdb.org/t/p/w45"+prov.logo_path} alt="" style={{width:20,height:20,borderRadius:5}}/>}
                    <span style={{fontSize:12,fontWeight:700,color:known?known.color:"#c4b8c8"}}>{prov.provider_name}</span>
                  </div>);
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Rezensionen</p>
              {reviews.slice(0,2).map(r=>(
                <div key={r.id} style={{background:"#12121f",borderRadius:12,padding:12,marginBottom:8,border:"1px solid #1e1e30"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#f0ece4"}}>{r.author}</span>
                    {r.author_details?.rating&&<span style={{fontSize:11,color:"#f5c518"}}>★ {r.author_details.rating}/10</span>}
                  </div>
                  <p style={{fontSize:12,color:"#c4b8c8",lineHeight:1.5,margin:0,maxHeight:120,overflow:"hidden"}}>{r.content.substring(0,300)}{r.content.length>300?"…":""}</p>
                </div>
              ))}
            </div>
          )}

          {imdbId&&<a href={"https://www.imdb.com/title/"+imdbId} target="_blank" rel="noopener noreferrer" style={{display:"block",textAlign:"center",fontSize:12,color:"#f5c518",textDecoration:"none",fontWeight:700,marginBottom:12}}>Auf IMDb öffnen ↗</a>}

          <PopcornMeter item={item}/>

          {/* Actions */}
          <div style={{display:"flex",gap:10,marginTop:16,marginBottom:8}}>
            <button onClick={()=>onLike(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isLiked?"rgba(229,9,20,0.13)":"#12121f",border:isLiked?"1px solid rgba(229,9,20,0.33)":"1px solid #1e1e30",color:isLiked?"#E50914":"#b0a8b8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
            <button onClick={()=>onWatched(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isWatched?"rgba(59,130,246,0.13)":"#12121f",border:isWatched?"1px solid rgba(59,130,246,0.33)":"1px solid #1e1e30",color:isWatched?"#3b82f6":"#b0a8b8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isWatched?"✅ Gesehen":"👁 Als gesehen"}</button>
          </div>


          {/* Bottom-Right Back Button */}
          <button onClick={onClose} style={{position:"fixed",bottom:24,right:24,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:30,padding:"14px 24px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,boxShadow:"0 8px 32px rgba(255,107,53,0.4)",zIndex:201,display:"flex",alignItems:"center",gap:6}}>← Zurück</button>
        </div>
      </div>
    </div>
  );
}

// ── Swipe to Block Wrapper ──
function SwipeToBlock({onBlock,children}){
  const [startX,setStartX]=useState(null);
  const [offsetX,setOffsetX]=useState(0);
  const [dismissed,setDismissed]=useState(false);
  const THRESH=80;

  function onTouchStart(e){setStartX(e.touches[0].clientX);}
  function onTouchMove(e){
    if(startX===null)return;
    const dx=e.touches[0].clientX-startX;
    if(dx<0)setOffsetX(dx); // only left
  }
  function onTouchEnd(){
    if(offsetX<-THRESH){
      setDismissed(true);
      setTimeout(()=>onBlock(),300);
    } else {
      setOffsetX(0);setStartX(null);
    }
  }

  const opacity=Math.max(0,1+offsetX/150);
  const blockOpacity=Math.min(1,Math.abs(offsetX)/THRESH);

  if(dismissed)return null;
  return(
    <div style={{position:"relative",overflow:"hidden",borderRadius:16,marginBottom:10,animation:"fadeIn 0.4s ease"}}>
      {/* Block reveal */}
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:100,background:"linear-gradient(to left,#1a0a0a,transparent)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,opacity:blockOpacity,pointerEvents:"none"}}>
        <span style={{fontSize:11,color:"#ef4444",fontWeight:600,fontFamily:"'DM Sans'"}}>Ausblenden</span>
      </div>
      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform:`translateX(${offsetX}px)`,
          transition:startX?undefined:"transform 0.3s ease",
          opacity,
          userSelect:"none",
        }}>
        {children}
      </div>
    </div>
  );
}

// ── Title Card ──
function TitleCard({item,profile,onRate,onLike,onWatched,onBlock,onSelect}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  const myRating=(profile.ratings||{})[titleKey(title)]||0;
  const aiReason=item._aiReason;
  const aiEmoji=item._aiEmoji;
  const platform=item._platform;
  const pl=PLATFORMS.find(p=>p.name===platform)||null;
  return(
    <div onClick={()=>onSelect(item)} style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:8,cursor:"pointer"}}>
      <div style={{padding:14,display:"flex",gap:12,alignItems:"flex-start"}}>
        {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:
          <div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{aiEmoji||"🎬"}</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h3>
            {isLiked&&<span style={{fontSize:11,flexShrink:0}}>❤️</span>}
            {isWatched&&<span style={{fontSize:11,flexShrink:0}}>✅</span>}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontSize:11,color:"#c4b8c8",background:"#1a1a2e",padding:"2px 8px",borderRadius:6,fontWeight:700}}>{mediaType==="tv"?"Serie":"Film"}</span>
            {year&&<span style={{fontSize:11,color:"#b0a8b8"}}>{year}</span>}
            {pl&&<span style={{fontSize:10,color:pl.color,fontWeight:700}}>{pl.icon} {pl.name}</span>}
          </div>
          {aiReason
            ?<p style={{margin:"0 0 5px",fontSize:12,color:"#ff6b35",lineHeight:1.4,fontStyle:"italic"}}>✨ {aiReason}</p>
            :item.overview&&<p style={{margin:"0 0 5px",fontSize:12,color:"#a09aaa",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>
          }
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {score>0&&<div style={{display:"inline-flex",alignItems:"center",gap:3,background:`${scoreColor}18`,padding:"2px 8px",borderRadius:6}}>
              <span style={{color:"#f5c518",fontSize:11}}>★</span>
              <span style={{color:scoreColor,fontSize:12,fontWeight:900}}>{score}</span>
              <span style={{color:scoreColor,fontSize:8,opacity:0.8}}>IMDb≈</span>
            </div>}
            {myRating>0&&<span style={{fontSize:12,color:"#f5c518"}}>{"★".repeat(myRating)+"☆".repeat(5-myRating)}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
          <div style={{color:"#ff6b35",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>›</div>
        </div>
      </div>
      {/* Interessiert mich nicht Button */}
      <div style={{padding:"0 14px 12px",borderTop:"1px solid rgba(30,30,48,0.13)",marginTop:-4}}>
        
      </div>
    </div>
  );
}

// ── Hero Card ──
function HeroCard({item,profile,onRate,onLike,onWatched,onBlock,onSelect}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w780"+item.backdrop_path:null;
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  return(
    <div style={{borderRadius:24,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:14,cursor:"pointer"}} onClick={()=>onSelect(item)}>
      <div style={{position:"relative",height:190,background:"#0d0d18"}}>
        {backdrop&&<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.55}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,#0d0d18 100%)"}}/>
        {score>0&&<div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",gap:4}}>
          <span style={{color:"#f5c518",fontSize:12}}>★</span>
          <span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
          <span style={{color:scoreColor,fontSize:9,fontWeight:700,opacity:0.7}}>IMDb≈</span>
        </div>}
        <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 12px"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#f0ece4"}}>{mediaType==="tv"?"📺 Serie":"🎬 Film"}</span>
        </div>
      </div>
      <div style={{background:"linear-gradient(145deg,#13121f,#0f0e1a)",padding:"14px 16px"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          {poster&&<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0,marginTop:-36,border:"2px solid #2a2340",boxShadow:"0 8px 24px rgba(0,0,0,0.53)"}}/>}
          <div style={{flex:1,minWidth:0}}>
            <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:800,color:"#f0ece4"}}>{title}</h3>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
              {year&&<span style={{fontSize:11,color:"#b0a8b8"}}>{year}</span>}
              {(item.genre_ids||[]).slice(0,2).map(gid=>GENRES_TMDB[gid]?<span key={gid} style={{fontSize:11,color:"#a09aaa"}}>{GENRE_EMOJI[gid]} {GENRES_TMDB[gid]}</span>:null)}
            </div>
            {item._aiReason
              ?<p style={{margin:"0 0 8px",fontSize:13,color:"#ff6b35",lineHeight:1.5,fontStyle:"italic"}}>✨ {item._aiReason}</p>
              :item.overview&&<p style={{margin:"0 0 8px",fontSize:13,color:"#b0a8b8",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>
            }
            {item._platform&&(()=>{const pl=PLATFORMS.find(p=>p.name===item._platform);return pl?<div style={{fontSize:10,color:pl.color,fontWeight:700,marginBottom:6}}>{pl.icon} {pl.name}</div>:null;})()}
            <StarRating itemTitle={title} profile={profile} onRate={onRate} size={20}/>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
          <button onClick={e=>{e.stopPropagation();onLike(item);}} style={{flex:"1 1 80px",padding:"9px",borderRadius:12,background:isLiked?"rgba(229,9,20,0.13)":"#1a1a2e",border:isLiked?"1px solid rgba(229,9,20,0.33)":"1px solid #2a2340",color:isLiked?"#E50914":"#b0a8b8",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"'DM Sans'"}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
          <button onClick={e=>{e.stopPropagation();onWatched(item);}} style={{padding:"9px 12px",borderRadius:12,background:isWatched?"rgba(59,130,246,0.13)":"#1a1a2e",border:isWatched?"1px solid rgba(59,130,246,0.33)":"1px solid #2a2340",color:isWatched?"#3b82f6":"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:11}}>{isWatched?"✅":"👁"}</button>
          
        </div>
      </div>
    </div>
  );
}

// ── Platform Card ──
// ── Swipe Card ──
function SwipeCard({item,color,onSwipeRight,onSwipeLeft,onTap}){
  const [startX,setStartX]=useState(null);
  const [offsetX,setOffsetX]=useState(0);
  const [gone,setGone]=useState(null);
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const poster=item.poster_path?"https://image.tmdb.org/t/p/w342"+item.poster_path:null;
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w780"+item.backdrop_path:null;
  const THRESH=80;
  const rotation=offsetX/12;
  const likeOpacity=Math.min(1,Math.max(0,offsetX/60));
  const nopeOpacity=Math.min(1,Math.max(0,-offsetX/60));

  function onStart(x){setStartX(x);}
  function onMove(x){if(startX===null)return;setOffsetX(x-startX);}
  function onEnd(){
    if(offsetX>THRESH){setGone("right");setTimeout(()=>onSwipeRight(item),300);}
    else if(offsetX<-THRESH){setGone("left");setTimeout(()=>onSwipeLeft(item),300);}
    else{setOffsetX(0);}
    setStartX(null);
  }

  const transform=gone==="right"?"translateX(120%) rotate(20deg)":gone==="left"?"translateX(-120%) rotate(-20deg)":`translateX(${offsetX}px) rotate(${rotation}deg)`;

  return(
    <div
      onMouseDown={e=>onStart(e.clientX)} onMouseMove={e=>onMove(e.clientX)} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={e=>onStart(e.touches[0].clientX)} onTouchMove={e=>onMove(e.touches[0].clientX)} onTouchEnd={onEnd}
      onClick={()=>Math.abs(offsetX)<5&&onTap(item)}
      style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",cursor:"grab",transition:gone||startX?undefined:"transform 0.3s ease",transform,userSelect:"none",border:"2px solid "+(color||"#2a2340")}}>
      {(backdrop||poster)?<img src={backdrop||poster} alt="" style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>🎬</div>}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.4) 50%,transparent 100%)"}}/>
      {/* Like/Nope indicators */}
      <div style={{position:"absolute",top:20,left:20,background:"rgba(74,222,128,0.6)",border:"3px solid #4ade80",borderRadius:10,padding:"6px 14px",opacity:likeOpacity,transform:"rotate(-15deg)"}}>
        <span style={{fontSize:18,fontWeight:900,color:"#fff"}}>❤️ MERKEN</span>
      </div>
      <div style={{position:"absolute",top:20,right:20,background:"rgba(239,68,68,0.6)",border:"3px solid #ef4444",borderRadius:10,padding:"6px 14px",opacity:nopeOpacity,transform:"rotate(15deg)"}}>
        <span style={{fontSize:18,fontWeight:900,color:"#fff"}}>🚫 NOPE</span>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 20px 24px"}}>
        <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,fontWeight:800,color:"#fff",margin:"0 0 4px",textShadow:"0 2px 8px #000"}}>{title}</h3>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {year&&<span style={{fontSize:13,color:"rgba(255,255,255,0.8)"}}>{year}</span>}
          {score>0&&<span style={{fontSize:13,color:"#f5c518",fontWeight:700}}>★ {score}</span>}
          <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{item.media_type==="tv"?"Serie":"Film"}</span>
        </div>
        {item.overview&&<p style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginTop:6,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
        <p style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:8}}>← Geht gar nicht &nbsp;·&nbsp; Tippen = Details &nbsp;·&nbsp; Merken →</p>
      </div>
    </div>
  );
}

// ── Platform Swipe Mode ──
function PlatformSwipe({platform,profile,browseType,onBlock,onLike,onSelect,onDone,onRate}){
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [swipedCount,setSwipedCount]=useState(0);
  // Track swipe results locally so Top5 gets fresh data immediately
  const localRatings=useRef({});
  const localBlocked=useRef(new Set());

  useEffect(()=>{
    setLoading(true);setIdx(0);setDone(false);setItems([]);setSwipedCount(0);
    const pg=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([gid])=>gid);
    const genreStr=pg.length>0?pg.join("|"):null;
    const blocked=new Set(profile.blocked_titles||[]);
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const ratings=profile.ratings||{};
    const liked=new Set(profile.liked||[]);

    function filterItems(results){
      return (results||[])
        .map(r=>({...r,media_type:browseType==="serie"?"tv":"movie"}))
        .filter(r=>{
          const t=titleKey(r.title||r.name||"");
          if(blocked.has(t))return false;
          if(watched.has(r.id))return false;
          if(liked.has(r.id))return false;
          const myRating=ratings[t]||0;
          if(myRating>0&&myRating<=2)return false;
          return true;
        });
    }

    // Random pages + sorts für echte Abwechslung bei jedem Aufruf
    const rp1=Math.floor(Math.random()*8)+1;
    const rp2=Math.floor(Math.random()*8)+1;
    const rp3=Math.floor(Math.random()*8)+1;
    const sorts=["popularity.desc","vote_average.desc","primary_release_date.desc","revenue.desc"];
    const rs1=sorts[Math.floor(Math.random()*sorts.length)];
    const rs2=sorts[Math.floor(Math.random()*sorts.length)];

    Promise.all([
      genreStr?discoverTitles(browseType,platform.tmdbIds,genreStr,rp1,"popularity.desc"):Promise.resolve({results:[]}),
      discoverTitles(browseType,platform.tmdbIds,null,rp1,rs1),
      discoverTitles(browseType,platform.tmdbIds,null,rp2,rs2),
      discoverTitles(browseType,platform.tmdbIds,null,rp3,"vote_average.desc"),
    ]).then(([r1,r2,r3,r4])=>{
      const all=[...(r1.results||[]),...(r2.results||[]),...(r3.results||[]),...(r4.results||[])];
      const seen=new Set();
      const deduped=all.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
      const filtered=filterItems(deduped);
      // Fisher-Yates shuffle
      for(let i=filtered.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
      }
      setItems(filtered.slice(0,20));
      setLoading(false);

      // KI sortiert optional im Hintergrund
      try{
        const ctx=buildCtx(profile);
        const titles=filtered.slice(0,15).map(it=>it.title||it.name||"").join(", ");
        const system=`Antworte NUR mit JSON-Array aus Titeln, keine Backticks. Format: ["Titel1","Titel2",...]`;
        const msg=`Sortiere nach Relevanz für diesen Nutzer:\n${titles}\nNutzer liebt: ${ctx.top||"nichts"}\nGenres: ${ctx.topGenres||"gemischt"}`;
        callAI([{role:"user",content:msg}],system).then(text=>{
          try{
            const ordered=JSON.parse(text.replace(/```json|```/g,"").trim());
            if(Array.isArray(ordered)&&ordered.length>0){
              const map=new Map(filtered.map(it=>[titleKey(it.title||it.name||""),it]));
              const reordered=ordered.map(t=>map.get(titleKey(t))).filter(Boolean);
              const rest=filtered.filter(it=>!ordered.map(t=>titleKey(t)).includes(titleKey(it.title||it.name||"")));
              setItems([...reordered,...rest].slice(0,20));
            }
          }catch(e){}
        }).catch(()=>{});
      }catch(e){}
    }).catch(()=>setLoading(false));
  },[platform.id,browseType]);

  // Right swipe = 4★ + genre boost
  function handleRight(item){
    const title=item.title||item.name||"";
    const key=titleKey(title);
    localRatings.current[key]={stars:4,genre_ids:item.genre_ids||[]};
    onRate(title,4,item.genre_ids||[]);
    setSwipedCount(c=>c+1);
    advance();
  }
  // Left swipe = ausblenden
  function handleLeft(item){
    const title=item.title||item.name||"";
    const key=titleKey(title);
    localBlocked.current.add(key);
    localRatings.current[key]={stars:1,genre_ids:item.genre_ids||[]};
    onBlock(title);
    onRate(title,1,item.genre_ids||[]);
    setSwipedCount(c=>c+1);
    advance();
  }
  // Skip = neutral
  function handleSkip(){
    setSwipedCount(c=>c+1);
    advance();
  }

  function advance(){
    setIdx(i=>{
      if(i+1>=items.length){setDone(true);return i;}
      return i+1;
    });
  }

  // Build fresh profile with swipe results for immediate Top5
  function buildFreshProfile(){
    const freshRatings={...profile.ratings||{}};
    const freshGenres={...profile.genres||{}};
    const freshBlocked=[...(profile.blocked_titles||[])];

    Object.entries(localRatings.current).forEach(([key,{stars,genre_ids}])=>{
      freshRatings[key]=stars;
      const boost=stars>=4?4:stars<=2?-3:0;
      if(boost!==0)genre_ids.forEach(g=>{freshGenres[g]=(freshGenres[g]||0)+boost;});
    });
    localBlocked.current.forEach(t=>{
      if(!freshBlocked.includes(t))freshBlocked.push(t);
    });

    return{...profile,ratings:freshRatings,genres:freshGenres,blocked_titles:freshBlocked};
  }

  if(loading)return<div style={{textAlign:"center",padding:40}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🍿</div><p style={{fontSize:13,color:"#b0a8b8",marginTop:8}}>Lade Titel von {platform.name}…</p></div>;
  if(done){
    onDone(buildFreshProfile());
    return null;
  }
  if(items.length===0)return<div style={{textAlign:"center",padding:30,color:"#b0a8b8"}}><div style={{fontSize:36,marginBottom:8}}>😕</div><p style={{fontWeight:700}}>Keine Titel gefunden</p><p style={{fontSize:12,marginTop:4}}>Versuche den anderen Typ (Serie/Film).</p></div>;

  // Swipe instructions
  const showHint=idx===0;
  const current=items[idx];
  const next=items[idx+1];

  return(
    <div>
      {/* Hint */}
      {showHint&&(
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(239,68,68,0.09)",borderRadius:10,padding:"6px 12px"}}>
            <span style={{fontSize:14}}>👈</span>
            <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>Interessiert nicht</span>
          </div>
          <div style={{fontSize:10,color:"#555",alignSelf:"center"}}>Tippen = Details</div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(74,222,128,0.09)",borderRadius:10,padding:"6px 12px"}}>
            <span style={{fontSize:10,color:"#4ade80",fontWeight:700}}>Merken</span>
            <span style={{fontSize:14}}>👉</span>
          </div>
        </div>
      )}

      {/* Card Stack */}
      <div style={{position:"relative",height:460,margin:"0 -18px"}}>
        {next&&<div style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",transform:"scale(0.95) translateY(8px)",zIndex:0,background:"#12121f"}}>{next.poster_path&&<img src={"https://image.tmdb.org/t/p/w342"+next.poster_path} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.3}}/>}</div>}
        <div style={{position:"absolute",inset:0,zIndex:1}}>
          <SwipeCard key={current.id} item={current} color={platform.color} onSwipeRight={handleRight} onSwipeLeft={handleLeft} onTap={onSelect}/>
        </div>
        {/* Progress */}
        <div style={{position:"absolute",bottom:-28,left:0,right:0,display:"flex",gap:3,padding:"0 4px"}}>
          {items.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<idx?"#ff6b35":i===idx?"#fff":"#2a2340"}}/>)}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginTop:44,paddingBottom:8}}>
        {/* Nope */}
        <button onClick={()=>handleLeft(current)}
          style={{width:58,height:58,borderRadius:29,background:"linear-gradient(145deg,#1a1a2e,#0d0d18)",border:"1px solid rgba(239,68,68,0.2)",cursor:"pointer",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.4)"}}>
          ✕
        </button>
        {/* Skip — elegant */}
        <button onClick={handleSkip}
          style={{width:46,height:46,borderRadius:23,background:"linear-gradient(145deg,#1a1a2e,#0d0d18)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.27)"}}>
          <span style={{fontSize:14,color:"#555",fontFamily:"'DM Sans'",fontWeight:700,letterSpacing:"1px"}}>↷</span>
        </button>
        {/* Like */}
        <button onClick={()=>handleRight(current)}
          style={{width:58,height:58,borderRadius:29,background:"linear-gradient(145deg,#1a1a2e,#0d0d18)",border:"1px solid rgba(74,222,128,0.2)",cursor:"pointer",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.4)"}}>
          ❤️
        </button>
      </div>
    </div>
  );
}

// ── Platform Card ──
function PlatformCard({platform,profile,onSelect,onBlock,onLike,onRate,browseType}){
  const [mode,setMode]=useState("top5"); // "top5" | "swipe" | null=collapsed
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(true);
  const lastTypeRef=useRef(null);

  function loadTop5Recs(){
    if(lastTypeRef.current===browseType&&recs)return;
    lastTypeRef.current=browseType;
    setLoading(true);setRecs(null);

    // TMDB + KI parallel laden — erst wenn beides fertig anzeigen
    getTMDBTop5(profile,platform,browseType||"serie")
      .then(async tmdbItems=>{
        if(tmdbItems.length>0){
          // Fallback-Texte sofort bereit
          const ctx_f=buildCtx(profile);
          const topTitle=ctx_f.top?.split(",")[0]?.trim()||"";
          const fallbackReasons=[
            topTitle?`Wenn dir ${topTitle} gefallen hat, ist das hier dein nächster Schritt.`:"Ein Titel der zu deinem Geschmack passt.",
            "Der Algorithmus ist sich bei diesem sicher. Selten, aber diesmal eindeutig.",
            `★ ${browseType==="serie"?"Serien":"Filme"} die so gut sind, brauchen keine Erklärung.`,
            "Wenige kennen ihn. Du solltest ihn kennen.",
            "Dein Profil hat gesprochen. Das hier ist die Antwort.",
          ];
          // KI parallel laden
          let aiReasons=null;
          try{
            const ctx=buildCtx(profile);
            const titles=tmdbItems.map(it=>it.title||it.name||"").join(", ");
            const typeStr=browseType==="serie"?"Serien":"Filme";
            const system=`Du bist ein witziger Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. Format: [{"title":"...","reason":"..."}]`;
            const msg=`Schreibe für diese ${typeStr} auf ${platform.name} witzige Begründungen.\nTitel: ${titles}\nNutzer liebt: ${ctx.top||"nichts"}\nreason = vollständiger Satz, min 10 Wörter, witzig und persönlich.`;
            const text=await callAI([{role:"user",content:msg}],system);
            aiReasons=JSON.parse(text.replace(/```json|```/g,"").trim());
          }catch(e){}
          // Alles zusammen anzeigen — kein "Wird geladen"
          const formatted=tmdbItems.map(it=>({
            title:it.title||it.name||"",
            year:(it.release_date||it.first_air_date||"").substring(0,4),
            reason:it.overview?it.overview.substring(0,160)+(it.overview.length>160?"…":""):"",
            emoji:it.media_type==="tv"?"📺":"🎬",
            _tmdbItem:it,
          }));
          setRecs(formatted);
          setLoading(false);
        }else{
          setRecs([]);
          setLoading(false);
        }
      })
      .catch(()=>{setRecs([]);setLoading(false);});
  }

  function handleMode(m){
    if(mode===m){setMode(null);return;}
    setMode(m);
    if(m==="top5")loadTop5Recs();
  }

  function handleRefresh(){
    lastTypeRef.current=null;
    loadTop5Recs();
    if(mode==="swipe"){setMode(null);setTimeout(()=>setMode("swipe"),50);}
  }

  // Auto-load top5 on mount and browseType change
  useEffect(()=>{
    lastTypeRef.current=null;
    setMode("top5");
    loadTop5Recs();
  },[browseType]);

  // Also load on first mount
  useEffect(()=>{
    loadTop5Recs();
  },[]);

  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:10}}>
      {/* Header — klickbar zum Ein/Ausklappen */}
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{width:44,height:44,borderRadius:12,background:platform.color+"22",border:"1px solid "+platform.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:platform.color,flexShrink:0}}>{platform.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>{platform.name}</div>
          <div style={{fontSize:11,color:"#b0a8b8"}}>Top 5 · {browseType==="serie"?"Serien":"Filme"}</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>handleMode("swipe")} style={{background:mode==="swipe"?"rgba(232,67,147,0.13)":"#1a1a2e",border:mode==="swipe"?"1px solid rgba(232,67,147,0.27)":"1px solid #2a2340",borderRadius:10,padding:"7px 10px",color:mode==="swipe"?"#e84393":"#b0a8b8",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>💘 Swipe</button>
          <span style={{color:"#3a3344",fontSize:12,marginLeft:2,transition:"transform 0.3s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </div>
      </div>
      {open&&mode!=="swipe"&&(
        <div style={{padding:"0 14px 16px"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:14}}/>
          {loading&&<div style={{textAlign:"center",padding:16}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:12,color:"#b0a8b8",marginTop:6}}>Lade…</p></div>}
          {!loading&&recs&&recs.length===0&&(
            <div style={{textAlign:"center",padding:12}}>
              <p style={{fontSize:12,color:"#b0a8b8",marginBottom:10}}>Keine Titel gefunden — nochmal?</p>
              <button onClick={()=>{setRecs(null);loadTop5Recs();}} style={{background:"rgba(255,107,53,0.13)",border:"1px solid rgba(255,107,53,0.27)",borderRadius:10,padding:"8px 16px",color:"#ff6b35",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:700}}>🔄 Nochmal</button>
            </div>
          )}
          {!loading&&recs&&recs.length>0&&(
            <p style={{fontSize:10,color:"#55506a",margin:"0 0 10px",textAlign:"right",letterSpacing:"0.3px",fontStyle:"italic"}}>← wischen zum Ausblenden</p>
          )}
          {!loading&&recs&&recs.map((rec,i)=>{
            const tmdb=rec._tmdbItem;
            const backdrop=tmdb?.backdrop_path?"https://image.tmdb.org/t/p/w500"+tmdb.backdrop_path:null;
            const poster=tmdb?.poster_path?TMDB_IMG+tmdb.poster_path:null;
            const score=tmdb?.vote_average?Math.round(tmdb.vote_average*10)/10:0;
            const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
            const rankColors=["#c4a960","#aaaaaa","#cd7f32","#888","#777","#666","#555"];
            const isNew=rec._isNew;
            return(
              <div key={rec.title+rec.year} style={{animation:isNew?"fadeIn 0.5s ease":"none",marginBottom:10}}>
                <SwipeToBlock onBlock={()=>{
                  const blockedTitle=rec.title;
                  // Entfernen aus Liste
                  setRecs(prev=>{
                    if(!prev)return prev;
                    return prev.filter(r=>r.title!==blockedTitle);
                  });
                  // Lade größeren Pool für Ersatz
                  Promise.all([
                    discoverTitles(browseType,platform.tmdbIds,null,Math.floor(Math.random()*5)+2,"vote_average.desc",profile.languages||["en","de"]),
                    discoverTitles(browseType,platform.tmdbIds,null,Math.floor(Math.random()*5)+2,"popularity.desc",profile.languages||["en","de"]),
                  ]).then(([r1,r2])=>{
                    const fresh=[...(r1.results||[]),...(r2.results||[])].map(it=>({...it,media_type:browseType==="serie"?"tv":"movie"}));
                    setRecs(cur=>{
                      if(!cur)return cur;
                      const existingTitles=new Set(cur.map(r=>r.title));
                      const watched=new Set((profile.watched||[]).map(w=>w.id));
                      const blocked=new Set(profile.blocked_titles||[]);
                      const replacement=fresh.find(it=>{
                        const t=it.title||it.name||"";
                        return !existingTitles.has(t)&&t!==blockedTitle&&!watched.has(it.id)&&!blocked.has(titleKey(t))&&(it.vote_average||0)>=6;
                      });
                      if(replacement){
                        const ctx=buildCtx(profile);
                              // Witziger Fallback ohne extra KI-Call
                        const rTitle=replacement.title||replacement.name||"";
                        const rScore=replacement.vote_average?Math.round(replacement.vote_average*10)/10:0;
                        const smartReason=generateSmartReason(rTitle,rScore,replacement.genre_ids||[],profile,platform.name);
                        return[...cur,{
                          title:rTitle,
                          year:(replacement.release_date||replacement.first_air_date||"").substring(0,4),
                          reason:smartReason,
                          emoji:replacement.media_type==="tv"?"📺":"🎬",
                          _tmdbItem:replacement,
                          _isNew:true,
                        }];
                      }
                      return cur;
                    });
                  }).catch(()=>{});
                }}>
                <div style={{borderRadius:16,overflow:"hidden",position:"relative",background:"#0d0d18",border:"1px solid #1e1e30"}}>
                  <div onClick={()=>onSelect(tmdb||{title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:browseType==="serie"?"tv":"movie",release_date:rec.year||""})}
                    style={{cursor:"pointer",position:"relative",height:100}}>
                    {backdrop&&<img src={backdrop} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.35}}/>}
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.2) 100%)"}}/>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",gap:12,padding:"0 14px"}}>
                      <div style={{fontSize:20,fontFamily:"'Instrument Serif',serif",fontWeight:700,color:rankColors[Math.min(i,rankColors.length-1)],flexShrink:0,minWidth:26,textAlign:"center",textShadow:"0 2px 8px rgba(0,0,0,0.8)"}}>#{i+1}</div>
                      {poster?<img src={poster} alt="" style={{width:44,height:66,borderRadius:8,objectFit:"cover",flexShrink:0,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 4px 12px rgba(0,0,0,0.8)"}}/>:
                        <div style={{width:44,height:66,borderRadius:8,background:platform.color+"22",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{rec.emoji||"🎬"}</div>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:800,color:"#f0ece4",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{rec.title}</div>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                          {rec.year&&<span style={{fontSize:10,color:"#888"}}>{rec.year}</span>}
                          {score>0&&<div style={{display:"flex",alignItems:"center",gap:2,background:`${scoreColor}18`,padding:"2px 6px",borderRadius:5}}>
                            <span style={{color:"#f5c518",fontSize:10}}>★</span>
                            <span style={{color:scoreColor,fontSize:10,fontWeight:800}}>{score}</span>
                          </div>}
                        </div>
                        {rec.reason&&<p style={{fontSize:12,color:"#a09aaa",margin:"4px 0 0",lineHeight:1.5,fontStyle:"italic"}}>"{rec.reason}"</p>}
                      </div>
                    </div>
                  </div>
                </div>
                </SwipeToBlock>
              </div>
            );
          })}
        </div>
      )}
      {open&&mode==="swipe"&&(
        <div style={{padding:"0 18px 48px"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:16}}/>
          <PlatformSwipe platform={platform} profile={profile} browseType={browseType} onBlock={t=>onBlock(t)} onLike={it=>onLike(it)} onSelect={onSelect} onRate={onRate||((t,s,g)=>{})} onDone={async(freshProfile)=>{
            setMode("top5");
            lastTypeRef.current=null;
            setLoading(true);setRecs(null);

            // Baue Swipe-Kontext für KI
            const fp=freshProfile||profile;
            const liked=Object.entries(fp.ratings||{}).filter(([,v])=>v>=4).map(([k])=>k).slice(0,6).join(", ");
            const disliked=Object.entries(fp.ratings||{}).filter(([,v])=>v<=2&&v>0).map(([k])=>k).slice(0,4).join(", ");
            const blocked=(fp.blocked_titles||[]).slice(0,8).join(", ");
            const topGenres=Object.entries(fp.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([g])=>GENRES_TMDB[g]||g).join(", ");
            const typeStr=browseType==="serie"?"Serien":"Filme";
            const langFilter=fp.languages&&fp.languages.length>0?fp.languages:null;

            // 1 KI-Call für Titelauswahl nach Swipes
            try{
              const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. Format: [{"title":"...","year":"...","type":"${typeStr.slice(0,-1)}"}]`;
              const msg=`Empfehle genau 5 ${typeStr} die JETZT auf ${platform.name} Deutschland verfügbar sind.\n\nNach Swipe-Session:\n- GEMOCHT (rechts): ${liked||"noch nichts"}\n- ABGELEHNT (links): ${disliked||"nichts"}\n- Niemals empfehlen: ${blocked||"nichts"}\n- Top-Genres: ${topGenres||"gemischt"}\n\nWähle Titel die zu den gemochten passen. Vermeide Ähnliches zu den abgelehnten.`;
              const text=await callAI([{role:"user",content:msg}],system);
              const aiTitles=JSON.parse(text.replace(/```json|```/g,"").trim());

              // KI-Titel mit TMDB anreichern für Bilder
              const enriched=await Promise.all(aiTitles.map(r=>enrichWithTMDB(r,fp)));
              const valid=enriched.filter(it=>it&&it.id&&!(fp.blocked_titles||[]).includes(titleKey(it.title||it.name||"")));

              if(valid.length>0){
                setRecs(valid.map(it=>({
                  title:it.title||it.name||"",
                  year:(it.release_date||it.first_air_date||"").substring(0,4),
                  reason:it.overview?it.overview.substring(0,160)+(it.overview.length>160?"…":""):"",
                  emoji:it.media_type==="tv"?"📺":"🎬",
                  _tmdbItem:it,
                })));
                setLoading(false);
                return;
              }
            }catch(e){console.error("KI nach Swipe fehlgeschlagen, TMDB Fallback:",e);}

            // Fallback: TMDB mit frischen Genre-Scores
            getTMDBTop5(fp,platform,browseType||"serie")
              .then(tmdbItems=>{
                if(tmdbItems.length>0){
                  setRecs(tmdbItems.map(it=>({
                    title:it.title||it.name||"",
                    year:(it.release_date||it.first_air_date||"").substring(0,4),
                    reason:it.overview?it.overview.substring(0,160)+(it.overview.length>160?"…":""):"",
                    emoji:it.media_type==="tv"?"📺":"🎬",
                    _tmdbItem:it,
                  })));
                }else{setRecs([]);}
                setLoading(false);
              }).catch(()=>{setRecs([]);setLoading(false);});
          }}/>
        </div>
      )}
    </div>
  );
}


function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [plats,setPlats]=useState([]);
  const [swipeItems,setSwipeItems]=useState([]);
  const [swipeIdx,setSwipeIdx]=useState(0);
  const [swipeRatings,setSwipeRatings]=useState({});
  const [swipeLoading,setSwipeLoading]=useState(false);
  const [swipeDone,setSwipeDone]=useState(false);
  const [startX,setStartX]=useState(null);
  const [offsetX,setOffsetX]=useState(0);
  const [gone,setGone]=useState(null);
  const THRESH=80;

  async function loadSwipeItems(selectedPlats){
    setSwipeLoading(true);
    const ids=PLATFORMS.filter(p=>selectedPlats.includes(p.id)).flatMap(p=>p.tmdbIds);
    const useIds=ids.length>0?ids:[8,9,337,350];
    // Echte Zufälligkeit: verschiedene Seiten und Sortierungen
    const p1=Math.floor(Math.random()*8)+1;
    const p2=Math.floor(Math.random()*8)+1;
    const p3=Math.floor(Math.random()*8)+1;
    const sorts=["popularity.desc","vote_average.desc","primary_release_date.desc","revenue.desc"];
    const s1=sorts[Math.floor(Math.random()*sorts.length)];
    const s2=sorts[Math.floor(Math.random()*sorts.length)];
    try{
      const results=await Promise.all([
        discoverTitles("serie",useIds,null,p1,s1),
        discoverTitles("film",useIds,null,p1,s1),
        discoverTitles("serie",useIds,null,p2,s2),
        discoverTitles("film",useIds,null,p2,s2),
        discoverTitles("serie",useIds,null,p3,"vote_average.desc"),
        discoverTitles("film",useIds,null,p3,"vote_average.desc"),
      ]);
      const all=[
        ...(results[0].results||[]).map(r=>({...r,media_type:"tv"})),
        ...(results[1].results||[]).map(r=>({...r,media_type:"movie"})),
        ...(results[2].results||[]).map(r=>({...r,media_type:"tv"})),
        ...(results[3].results||[]).map(r=>({...r,media_type:"movie"})),
        ...(results[4].results||[]).map(r=>({...r,media_type:"tv"})),
        ...(results[5].results||[]).map(r=>({...r,media_type:"movie"})),
      ];
      const seen=new Set();
      const filtered=all.filter(r=>{
        if(seen.has(r.id))return false;
        seen.add(r.id);
        return(r.vote_average||0)>=6&&(r.poster_path||r.backdrop_path);
      });
      // Fisher-Yates shuffle für echte Zufälligkeit
      for(let i=filtered.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
      }
      setSwipeItems(filtered.slice(0,20));
    }catch(e){
      setSwipeItems([]);
    }
    setSwipeLoading(false);
  }

  function handleGoNext(){
    if(gone)return;
    const next=swipeIdx+1;
    if(next>=swipeItems.length){setSwipeDone(true);return;}
    setSwipeIdx(next);
    setGone(null);setOffsetX(0);setStartX(null);
  }

  function swipeRight(){
    const item=swipeItems[swipeIdx];
    if(!item)return;
    const title=item.title||item.name||"";
    setSwipeRatings(s=>({...s,[titleKey(title)]:{stars:5,genre_ids:item.genre_ids||[]}}));
    setGone("right");
    setTimeout(handleGoNext,280);
  }

  function swipeLeft(){
    const item=swipeItems[swipeIdx];
    if(!item)return;
    const title=item.title||item.name||"";
    setSwipeRatings(s=>({...s,[titleKey(title)]:{stars:1,genre_ids:item.genre_ids||[]}}));
    setGone("left");
    setTimeout(handleGoNext,280);
  }

  function swipeSkip(){
    setGone("up");
    setTimeout(handleGoNext,280);
  }

  function onTouchStart(x){setStartX(x);}
  function onTouchMove(x){if(startX===null)return;setOffsetX(x-startX);}
  function onTouchEnd(){
    if(offsetX>THRESH)swipeRight();
    else if(offsetX<-THRESH)swipeLeft();
    else{setOffsetX(0);setStartX(null);}
  }

  function finish(){
    const genres={};
    const ratings={};
    Object.entries(swipeRatings).forEach(([key,val])=>{
      ratings[key]=val.stars;
      const boost=val.stars>=4?4:val.stars<=2?-3:0;
      if(boost!==0)(val.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+boost;});
    });
    onComplete({platforms:plats,genres,liked:[],blocked_titles:[],watched:[],liked_titles:[],ratings,languages:["en","de"]});
  }

  const current=swipeItems[swipeIdx];
  const next=swipeItems[swipeIdx+1];
  const rotation=offsetX/12;
  const likeOpacity=Math.min(1,Math.max(0,offsetX/60));
  const nopeOpacity=Math.min(1,Math.max(0,-offsetX/60));
  const cardTransform=gone==="right"?"translateX(120%) rotate(20deg)":gone==="left"?"translateX(-120%) rotate(-20deg)":gone==="up"?"translateY(-120%)":
    `translateX(${offsetX}px) rotate(${rotation}deg)`;
  const rated=Object.keys(swipeRatings).length;

  return(
    <div style={{minHeight:"100vh",background:"#09090f",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      <div style={{position:"fixed",top:"-10%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:"radial-gradient(circle,rgba(255,107,53,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"32px 24px 32px",position:"relative",maxWidth:540,margin:"0 auto",width:"100%"}}>

        {/* Progress bar */}
        <div style={{display:"flex",gap:6,marginBottom:28}}>
          {[0,1].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?"linear-gradient(90deg,#ff6b35,#e84393)":"#1e1830",opacity:i>step?0.3:1}}/>)}
        </div>

        {/* STEP 0: Plattformen wählen */}
        {step===0&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{display:"inline-block",marginBottom:16}}>
                <div style={{background:"linear-gradient(145deg,#1a1a2e,#0d0d18)",borderRadius:24,padding:"18px 28px",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 8px 40px rgba(0,0,0,0.67),inset 0 1px 0 rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:44,filter:"drop-shadow(0 0 12px rgba(196,169,96,0.4))"}}>🎬</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:2,marginBottom:6}}>
                <span style={{fontFamily:"'Instrument Serif',serif",fontSize:36,fontWeight:400,color:"#f0ece4",letterSpacing:"-1px",lineHeight:1}}>Stream</span>
                <span style={{fontFamily:"'Instrument Serif',serif",fontSize:36,fontStyle:"italic",background:"linear-gradient(135deg,#c4a960,#e8d5a3)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px",lineHeight:1}}>Finder</span>
              </div>
              <p style={{color:"#444",fontSize:10,margin:0,letterSpacing:"2.5px",textTransform:"uppercase",fontFamily:"'DM Sans'"}}>Dein persönlicher Streaming-Guide</p>
            </div>
            <p style={{color:"#b0a8b8",marginBottom:16,fontSize:14,textAlign:"center"}}>Welche Dienste hast du?</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {PLATFORMS.map(p=>{
                const sel=plats.includes(p.id);
                return(<button key={p.id} onClick={()=>setPlats(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])}
                  style={{background:sel?"linear-gradient(135deg,"+p.color+"33,"+p.color+"11)":"#12121f",border:"1px solid "+(sel?p.color+"88":"#1e1e30"),borderRadius:16,padding:"13px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.2s"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:sel?p.color+"33":"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:sel?p.color:"#888",flexShrink:0}}>{p.icon}</div>
                  <span style={{fontSize:12,fontWeight:700,color:sel?"#f0ece4":"#b0a8b8"}}>{p.name}</span>
                  {sel&&<span style={{marginLeft:"auto",color:"#ff6b35",fontSize:14}}>✓</span>}
                </button>);
              })}
            </div>
            <button onClick={()=>{if(plats.length===0)return;setStep(1);loadSwipeItems(plats);}}
              style={{width:"100%",background:plats.length>0?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1525",border:"none",borderRadius:18,padding:"17px",color:plats.length>0?"#fff":"#666",cursor:plats.length>0?"pointer":"default",fontFamily:"'DM Sans'",fontWeight:800,fontSize:16,boxShadow:plats.length>0?"0 8px 28px rgba(255,107,53,0.25)":"none"}}>
              {plats.length>0?"Weiter — Geschmack ermitteln 👉":"Mindestens einen wählen"}
            </button>
          </div>
        )}

        {/* STEP 1: Swipe */}
        {step===1&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,margin:"0 0 4px"}}>
                <span style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Was magst du?</span>
              </h2>
              <p style={{color:"#b0a8b8",fontSize:13,margin:0}}>Swipe rechts = ❤️ &nbsp;·&nbsp; Links = 🚫 &nbsp;·&nbsp; Überspringen = ❓</p>
            </div>

            {swipeLoading&&(
              <div style={{textAlign:"center",padding:60}}>
                <div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🍿</div>
                <p style={{fontSize:14,color:"#b0a8b8",marginTop:12}}>Lade Titel von deinen Plattformen…</p>
              </div>
            )}

            {!swipeLoading&&!swipeDone&&current&&(
              <div>
                {/* Swipe Hint */}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(239,68,68,0.09)",borderRadius:8,padding:"5px 10px"}}>
                    <span>👈</span><span style={{fontSize:11,color:"#ef4444",fontWeight:700}}>Nope</span>
                  </div>
                  <div style={{fontSize:11,color:"#555"}}>{swipeIdx+1} / {swipeItems.length}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(74,222,128,0.09)",borderRadius:8,padding:"5px 10px"}}>
                    <span style={{fontSize:11,color:"#4ade80",fontWeight:700}}>Mag ich</span><span>👉</span>
                  </div>
                </div>

                {/* Card Stack */}
                <div style={{position:"relative",height:440,marginBottom:16}}>
                  {/* Next card background */}
                  {next&&(
                    <div style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",transform:"scale(0.95) translateY(10px)",zIndex:0}}>
                      {next.backdrop_path&&<img src={"https://image.tmdb.org/t/p/w780"+next.backdrop_path} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.3}}/>}
                      <div style={{position:"absolute",inset:0,background:"rgba(13,13,24,0.67)"}}/>
                    </div>
                  )}

                  {/* Current card */}
                  <div
                    onMouseDown={e=>onTouchStart(e.clientX)} onMouseMove={e=>onTouchMove(e.clientX)} onMouseUp={onTouchEnd} onMouseLeave={()=>{if(startX!==null){setOffsetX(0);setStartX(null);}}}
                    onTouchStart={e=>onTouchStart(e.touches[0].clientX)} onTouchMove={e=>onTouchMove(e.touches[0].clientX)} onTouchEnd={onTouchEnd}
                    style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",cursor:"grab",zIndex:1,
                      transition:gone||startX?undefined:"transform 0.3s ease",
                      transform:cardTransform,userSelect:"none"}}>
                    {(current.backdrop_path||current.poster_path)&&(
                      <img src={current.backdrop_path?"https://image.tmdb.org/t/p/w780"+current.backdrop_path:TMDB_IMG+current.poster_path}
                        alt="" style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>
                    )}
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.3) 60%,transparent 100%)"}}/>

                    {/* Like/Nope indicators */}
                    <div style={{position:"absolute",top:20,left:20,background:"rgba(74,222,128,0.6)",border:"3px solid #4ade80",borderRadius:10,padding:"5px 12px",opacity:likeOpacity,transform:"rotate(-15deg)"}}>
                      <span style={{fontSize:16,fontWeight:900,color:"#fff"}}>❤️ MAG ICH</span>
                    </div>
                    <div style={{position:"absolute",top:20,right:20,background:"rgba(239,68,68,0.6)",border:"3px solid #ef4444",borderRadius:10,padding:"5px 12px",opacity:nopeOpacity,transform:"rotate(15deg)"}}>
                      <span style={{fontSize:16,fontWeight:900,color:"#fff"}}>🚫 NOPE</span>
                    </div>

                    <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 20px 24px"}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{current.media_type==="tv"?"📺 Serie":"🎬 Film"}</div>
                      <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,fontWeight:800,color:"#fff",margin:"0 0 4px",textShadow:"0 2px 8px #000"}}>{current.title||current.name||""}</h3>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                        {(current.release_date||current.first_air_date)&&<span style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{(current.release_date||current.first_air_date).substring(0,4)}</span>}
                        {current.vote_average>0&&<span style={{fontSize:12,color:"#f5c518",fontWeight:700}}>★ {Math.round(current.vote_average*10)/10}</span>}
                      </div>
                      {current.overview&&<p style={{fontSize:12,color:"rgba(255,255,255,0.7)",margin:0,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{current.overview}</p>}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                  <button onClick={swipeLeft} style={{width:60,height:60,borderRadius:30,background:"rgba(239,68,68,0.13)",border:"2px solid rgba(239,68,68,0.4)",cursor:"pointer",fontSize:24,display:"flex",alignItems:"center",justifyContent:"center"}}>🚫</button>
                  <button onClick={swipeSkip} style={{width:50,height:50,borderRadius:25,background:"#1a1a2e",border:"2px solid #2a2340",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",alignSelf:"center"}}>❓</button>
                  <button onClick={swipeRight} style={{width:60,height:60,borderRadius:30,background:"rgba(74,222,128,0.13)",border:"2px solid rgba(74,222,128,0.4)",cursor:"pointer",fontSize:24,display:"flex",alignItems:"center",justifyContent:"center"}}>❤️</button>
                </div>

                {rated>=3&&(
                  <button onClick={finish} style={{width:"100%",marginTop:16,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px rgba(255,107,53,0.25)"}}>
                    Los geht's! ({rated} bewertet) 🍿
                  </button>
                )}
              </div>
            )}

            {/* Done or no items */}
            {(!swipeLoading&&(swipeDone||swipeItems.length===0))&&(
              <div style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:48,marginBottom:12}}>{rated>0?"🎉":"🤷"}</div>
                <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,marginBottom:8,color:"#f0ece4"}}>
                  {rated>0?`${rated} Titel bewertet!`:"Alles durch!"}
                </h3>
                <p style={{fontSize:13,color:"#b0a8b8",marginBottom:20}}>
                  {rated>0?"Wir kennen deinen Geschmack jetzt. Los!":"Kein Problem — wir lernen beim Nutzen."}
                </p>
                <button onClick={finish} style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"16px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:16,boxShadow:"0 6px 24px rgba(255,107,53,0.25)"}}>
                  App starten 🍿
                </button>
              </div>
            )}

            {/* Back + Skip */}
            {!swipeLoading&&!swipeDone&&(
              <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
                <button onClick={()=>setStep(0)} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>← Zurück</button>
                <button onClick={finish} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Überspringen →</button>
              </div>
            )}
          </div>
        )}

      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}


// ── Liked Tab — loads items from TMDB by ID ──
function LikedTab({profile,cardProps}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const ids=profile.liked||[];
    if(!ids.length){setLoading(false);return;}
    setLoading(true);
    // Fetch each liked item from TMDB - try movie first then tv
    Promise.all(ids.map(id=>
      getDetails("movie",id).then(d=>d.title?{...d,media_type:"movie"}:getDetails("tv",id).then(d=>({...d,media_type:"tv"}))).catch(()=>null)
    )).then(results=>{
      setItems(results.filter(Boolean));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[profile.liked?.length]);

  return(
    <div style={{padding:"0 18px"}}>
      <h3 style={{fontSize:20,fontWeight:800,marginBottom:6}}>❤️ Merkliste</h3>
      <p style={{fontSize:12,color:"#b0a8b8",marginBottom:14}}>{items.length} Titel gemerkt</p>
      {loading&&<div style={{textAlign:"center",padding:30}}><div style={{fontSize:24,animation:"spin 1.5s linear infinite",display:"inline-block"}}>❤️</div><p style={{fontSize:13,color:"#b0a8b8",marginTop:8}}>Lade Merkliste…</p></div>}
      {!loading&&items.length===0&&<div style={{textAlign:"center",padding:40,color:"#b0a8b8"}}><div style={{fontSize:40,marginBottom:10}}>🤍</div><p>Noch nichts gemerkt. Tippe bei einem Titel auf "Merken".</p></div>}
      {!loading&&items.map(it=><TitleCard key={it.id} item={it} {...cardProps}/>)}
    </div>
  );
}

// ── BrowseTab ──
function BrowseTab({profile,cardProps,onSelect}){
  const [mode,setMode]=useState("deepdive");
  const [searchQuery,setSQ]=useState("");
  const [searchResults,setSR]=useState([]);
  const [searching,setSearching]=useState(false);
  const searchRef=useRef(null);
  const [browseType,setBrowseType]=useState("serie");

  // Deep Dive state
  const [ddInput,setDDInput]=useState("");
  const [ddResults,setDDResults]=useState([]);
  const [ddLoading,setDDLoading]=useState(false);
  const [ddSearchRes,setDDSearchRes]=useState([]);
  const [ddSearching,setDDSearching]=useState(false);
  const ddRef=useRef(null);

  // Vibe state
  const [trash,setTrash]=useState(50);
  const [heavy,setHeavy]=useState(50);
  const [dark,setDark]=useState(50);
  const [vibeResults,setVibeResults]=useState([]);
  const [vibeLoading,setVibeLoading]=useState(false);

  // Bot state
  const [botQuery,setBotQuery]=useState("");
  const [botResult,setBotResult]=useState(null);
  const [botLoading,setBotLoading]=useState(false);

  // Platform browse
  const [showPlatforms,setShowPlatforms]=useState(true);
  // Trigger platform cards to load immediately when tab opens
  const browseKey=useRef(Date.now());
  const userPlatforms=PLATFORMS.filter(p=>profile.platforms.includes(p.id));

  function handleSearch(q){
    setSQ(q);
    if(searchRef.current)clearTimeout(searchRef.current);
    if(!q.trim()){setSR([]);return;}
    searchRef.current=setTimeout(()=>{
      setSearching(true);
      searchTitles(q).then(d=>{setSR((d?.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,15));setSearching(false);}).catch(()=>setSearching(false));
    },400);
  }

  function handleDDSearch(q){
    setDDInput(q);
    if(ddRef.current)clearTimeout(ddRef.current);
    if(!q.trim()){setDDSearchRes([]);return;}
    ddRef.current=setTimeout(()=>{
      setDDSearching(true);
      searchTitles(q).then(d=>{setDDSearchRes((d?.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,5));setDDSearching(false);}).catch(()=>setDDSearching(false));
    },400);
  }

  async function startDeepDive(title){
    setDDInput(title);setDDSearchRes([]);setDDResults([]);setDDLoading(true);
    try{
      const recs=await getDeepDive(profile,title);
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB(r,profile)));
      setDDResults(enriched.map((it,i)=>({...it,_ddConnection:recs[i]?.connection,_aiReason:recs[i]?.reason,_aiEmoji:recs[i]?.emoji})));
    }catch(e){setDDResults([{_rateLimit:e.message==="RATE_LIMIT"}]);}
    setDDLoading(false);
  }

  async function getVibeRecs(){
    setVibeResults([]);setVibeLoading(true);
    try{
      const recs=await getVibePicks(profile,trash,heavy,dark);
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB(r,profile)));
      setVibeResults(enriched.map((it,i)=>({...it,_aiReason:recs[i]?.reason,_aiEmoji:recs[i]?.emoji})));
    }catch(e){setVibeResults([{_rateLimit:e.message==="RATE_LIMIT"}]);}
    setVibeLoading(false);
  }

  async function askBot(){
    if(!botQuery.trim())return;
    setBotResult(null);setBotLoading(true);
    try{
      const res=await getStreamBotReply(profile,botQuery);
      const enriched=await Promise.all(res.picks.map(r=>enrichWithTMDB(r,profile)));
      setBotResult({intro:res.intro,picks:enriched.map((it,i)=>({...it,_aiReason:res.picks[i]?.reason,_aiEmoji:res.picks[i]?.emoji}))});
    }catch(e){setBotResult({intro:e.message==="RATE_LIMIT"?"Die KI macht heute Feierabend 🌙 — morgen früh wieder da.":"Hmm, kurz warten und nochmal.",picks:[]});}
    setBotLoading(false);
  }

  function refreshCurrentMode(){
    if(mode==="deepdive"){setDDResults([]);setDDInput("");}
    if(mode==="vibe"){setVibeResults([]);getVibeRecs();}
    if(mode==="bot"){setBotResult(null);if(botQuery.trim())askBot();}
    // Refresh platform cards by resetting them
    setShowPlatforms(false);
    setTimeout(()=>setShowPlatforms(true),100);
  }

  const REFRESH_LABELS=[
    "🔮 Frische Picks holen",
    "🎲 Nochmal würfeln",
    "✨ Neu entdecken",
    "🔄 Andere Empfehlungen",
    "🚀 Nochmal durchsuchen",
  ];
  const [refreshLabel]=useState(()=>REFRESH_LABELS[Math.floor(Math.random()*REFRESH_LABELS.length)]);

  const MODES=[
    {id:"deepdive",label:"🔭 Deep Dive",desc:"Starte mit einem Titel"},
    {id:"vibe",    label:"🎛️ Vibe-Meter",desc:"Regler einstellen"},
    {id:"bot",     label:"💬 StreamBot",desc:"Einfach fragen"},
  ];

  const vibeLabel=(v)=>v>66?"viel":v>33?"mittel":"wenig";

  return(
    <div>
      {/* Header mit Refresh */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        <input value={searchQuery} onChange={e=>handleSearch(e.target.value)} placeholder="Schnellsuche… 🔍"
          style={{flex:1,padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none"}}/>
        {!searchQuery&&(
          <button onClick={refreshCurrentMode}
            style={{background:"linear-gradient(135deg,rgba(255,107,53,0.13),rgba(232,67,147,0.09))",border:"1px solid rgba(255,107,53,0.3)",borderRadius:14,padding:"12px 14px",color:"#ff6b35",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:11,whiteSpace:"nowrap",flexShrink:0}}>
            {refreshLabel}
          </button>
        )}
      </div>
      {searchQuery?(
        <div>
          {searching&&<p style={{color:"#b0a8b8",fontSize:13,textAlign:"center",marginBottom:8}}>Suche…</p>}
          {searchResults.map(it=><TitleCard key={it.id} item={it} {...cardProps}/>)}
        </div>
      ):(
        <div>
          {/* Anbieter durchstöbern */}
          <div style={{background:"linear-gradient(135deg,#1a1525,#0f0e1a)",borderRadius:18,padding:"16px",marginBottom:16,border:"1px solid #2a1f3d"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>📺 Anbieter durchstöbern</div>
                <div style={{fontSize:11,color:"#b0a8b8",marginTop:2}}>Top 5 + Swipe pro Plattform</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                {["serie","film"].map(t=>(
                  <button key={t} onClick={e=>{e.stopPropagation();setBrowseType(t);setShowPlatforms(true);}}
                    style={{background:browseType===t?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1a2e",border:"1px solid "+(browseType===t?"transparent":"#2a2340"),borderRadius:10,padding:"6px 14px",color:browseType===t?"#fff":"#888",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,transition:"all 0.2s"}}>
                    {t==="serie"?"📺 Serien":"🎬 Filme"}
                  </button>
                ))}
              </div>
            </div>

            {showPlatforms&&(
              <div>
                {userPlatforms.map(p=>(
                  <PlatformCard key={p.id} platform={p} profile={profile} onSelect={onSelect}
                    onBlock={cardProps.onBlock} onLike={cardProps.onLike} onRate={cardProps.onRate} browseType={browseType}/>
                ))}

              </div>
            )}
          </div>

          {/* Mode Tabs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:20}}>
            {MODES.map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{background:mode===m.id?"linear-gradient(135deg,#ff6b35,#e84393)":"#12121f",border:"1px solid "+(mode===m.id?"transparent":"#1e1e30"),borderRadius:14,padding:"10px 6px",cursor:"pointer",color:mode===m.id?"#fff":"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:700,fontSize:11,textAlign:"center",transition:"all 0.2s"}}>
                <div style={{fontSize:16,marginBottom:2}}>{m.label.split(" ")[0]}</div>
                <div style={{fontSize:10,fontWeight:600}}>{m.label.split(" ").slice(1).join(" ")}</div>
                <div style={{fontSize:9,opacity:0.7,marginTop:2}}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ── DEEP DIVE ── */}
          {mode==="deepdive"&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#1a1525,#0f0e1a)",borderRadius:18,padding:16,marginBottom:16,border:"1px solid #2a1f3d"}}>
                <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:18,margin:"0 0 4px",color:"#f0ece4"}}>🔭 Deep Dive</h3>
                <p style={{fontSize:12,color:"#b0a8b8",marginBottom:12}}>Gib einen Titel ein den du liebst — wir bauen daraus ein ganzes Entdeckungs-Universum.</p>
                <div style={{position:"relative"}}>
                  <input value={ddInput} onChange={e=>handleDDSearch(e.target.value)}
                    placeholder="Titel eingeben… (z.B. Breaking Bad)"
                    style={{width:"100%",padding:"12px 14px",borderRadius:12,background:"#0d0d18",border:"1px solid #2a1f3d",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:13,outline:"none"}}/>
                  {ddSearchRes.length>0&&(
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1525",border:"1px solid #2a1f3d",borderRadius:12,zIndex:10,marginTop:4,overflow:"hidden"}}>
                      {ddSearchRes.map(it=>(
                        <div key={it.id} onClick={()=>startDeepDive(it.title||it.name||"")}
                          style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(42,31,61,0.25)"}}>
                          {it.poster_path&&<img src={TMDB_IMG+it.poster_path} alt="" style={{width:28,height:42,borderRadius:6,objectFit:"cover"}}/>}
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:"#f0ece4"}}>{it.title||it.name}</div>
                            <div style={{fontSize:10,color:"#b0a8b8"}}>{it.media_type==="tv"?"Serie":"Film"} · {(it.release_date||it.first_air_date||"").substring(0,4)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {ddInput&&!ddSearching&&ddSearchRes.length===0&&(
                  <button onClick={()=>startDeepDive(ddInput)} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:"12px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>
                    🔭 Universum erkunden
                  </button>
                )}
              </div>

              {ddLoading&&(
                <div style={{textAlign:"center",padding:30}}>
                  <div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔭</div>
                  <p style={{fontSize:13,color:"#b0a8b8",marginTop:8}}>Baue dein Universum…</p>
                </div>
              )}

              {!ddLoading&&ddResults.length>0&&(
                <div>
                  <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>Entdeckt durch "{ddInput}"</p>
                  {ddResults.map((it,i)=>{
                    const poster=it.poster_path?TMDB_IMG+it.poster_path:null;
                    const score=it.vote_average?Math.round(it.vote_average*10)/10:0;
                    const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
                    return(
                      <div key={i} onClick={()=>onSelect(it)}
                        style={{background:"#12121f",borderRadius:16,padding:14,marginBottom:10,border:"1px solid #1e1e30",cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}>
                        {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:
                          <div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{it._aiEmoji||"🎬"}</div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10,color:"#ff6b35",fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{it._ddConnection||"Verwandt"}</div>
                          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4",marginBottom:3}}>{it.title||it.name||""}</div>
                          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:10,color:"#b0a8b8"}}>{it.media_type==="tv"?"Serie":"Film"}</span>
                            {(it.release_date||it.first_air_date)&&<span style={{fontSize:10,color:"#b0a8b8"}}>{(it.release_date||it.first_air_date).substring(0,4)}</span>}
                            {score>0&&<span style={{fontSize:10,color:scoreColor,fontWeight:700}}>★{score}</span>}
                          </div>
                          {it._aiReason&&<p style={{fontSize:12,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{it._aiReason}"</p>}
                          
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── VIBE METER ── */}
          {mode==="vibe"&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#1a1525,#0f0e1a)",borderRadius:18,padding:16,marginBottom:16,border:"1px solid #2a1f3d"}}>
                <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:18,margin:"0 0 4px",color:"#f0ece4"}}>🎛️ Vibe-Meter</h3>
                <p style={{fontSize:12,color:"#b0a8b8",marginBottom:16}}>Stell deinen heutigen Vibe ein — wir finden passende Titel.</p>

                {[
                  {label:"Guilty Pleasure",left:"🏆 Hochkultur",right:"🗑️ Totaltrash",val:trash,set:setTrash},
                  {label:"Komplexität",left:"🏖️ Easy Mode",right:"🧠 Kopfkino",val:heavy,set:setHeavy},
                  {label:"Stimmung",left:"😂 Lachen",right:"😈 Dunkel",val:dark,set:setDark},
                ].map(({label,left,right,val,set})=>(
                  <div key={label} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:11,color:"#b0a8b8"}}>{left}</span>
                      <span style={{fontSize:11,color:"#ff6b35",fontWeight:700}}>{label}: {vibeLabel(val)}</span>
                      <span style={{fontSize:11,color:"#b0a8b8"}}>{right}</span>
                    </div>
                    <input type="range" min={0} max={100} value={val} onChange={e=>set(Number(e.target.value))}
                      style={{width:"100%",accentColor:"#ff6b35",cursor:"pointer"}}/>
                  </div>
                ))}

                <button onClick={getVibeRecs} disabled={vibeLoading}
                  style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:"13px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <span style={{display:"inline-block",animation:vibeLoading?"spin 1s linear infinite":"none"}}>🎛️</span>
                  {vibeLoading?"Findet passende Titel…":"Picks anzeigen"}
                </button>
              </div>

              {!vibeLoading&&vibeResults.length>0&&(
                <div>
                  <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>Dein Vibe-Match</p>
                  {vibeResults.map((it,i)=>{
                    const poster=it.poster_path?TMDB_IMG+it.poster_path:null;
                    const score=it.vote_average?Math.round(it.vote_average*10)/10:0;
                    const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
                    return(
                      <div key={i} onClick={()=>onSelect(it)}
                        style={{background:"#12121f",borderRadius:16,padding:14,marginBottom:10,border:"1px solid #1e1e30",cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}>
                        {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:
                          <div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{it._aiEmoji||"🎬"}</div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4",marginBottom:3}}>{it.title||it.name||""}</div>
                          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:10,color:"#b0a8b8"}}>{it.media_type==="tv"?"Serie":"Film"}</span>
                            {(it.release_date||it.first_air_date)&&<span style={{fontSize:10,color:"#b0a8b8"}}>{(it.release_date||it.first_air_date).substring(0,4)}</span>}
                            {score>0&&<span style={{fontSize:10,color:scoreColor,fontWeight:700}}>★{score}</span>}
                          </div>
                          {it._aiReason&&<p style={{fontSize:12,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{it._aiReason}"</p>}
                          
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STREAMBOT ── */}
          {mode==="bot"&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#1a1525,#0f0e1a)",borderRadius:18,padding:16,marginBottom:16,border:"1px solid #2a1f3d"}}>
                <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:18,margin:"0 0 4px",color:"#f0ece4"}}>💬 StreamBot</h3>
                <p style={{fontSize:12,color:"#b0a8b8",marginBottom:12}}>Sag einfach was du willst. In normalen Worten.</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {["Wie Breaking Bad aber lustiger","Etwas für einen verregneten Sonntag","Kurze Serie zum Reinschnuppern","Etwas das mich überrascht"].map(hint=>(
                    <button key={hint} onClick={()=>setBotQuery(hint)}
                      style={{background:"#0d0d18",border:"1px solid #2a1f3d",borderRadius:8,padding:"5px 10px",color:"#b0a8b8",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'"}}>
                      {hint}
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={botQuery} onChange={e=>setBotQuery(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&askBot()}
                    placeholder="Was suchst du heute Abend?"
                    style={{flex:1,padding:"12px 14px",borderRadius:12,background:"#0d0d18",border:"1px solid #2a1f3d",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:13,outline:"none"}}/>
                  <button onClick={askBot} disabled={botLoading||!botQuery.trim()}
                    style={{padding:"12px 16px",borderRadius:12,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",color:"#fff",cursor:"pointer",fontSize:18,opacity:botLoading||!botQuery.trim()?0.5:1}}>
                    {botLoading?"⏳":"→"}
                  </button>
                </div>
              </div>

              {botResult&&!botLoading&&(
                <div>
                  {botResult.intro&&(
                    <div style={{background:"#12121f",borderRadius:14,padding:"12px 14px",marginBottom:12,border:"1px solid #1e1e30",display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20,flexShrink:0}}>🤖</span>
                      <p style={{fontSize:13,color:"#c4b8c8",margin:0,lineHeight:1.5,fontStyle:"italic"}}>"{botResult.intro}"</p>
                    </div>
                  )}
                  {botResult.picks.map((it,i)=>{
                    const poster=it.poster_path?TMDB_IMG+it.poster_path:null;
                    const score=it.vote_average?Math.round(it.vote_average*10)/10:0;
                    const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
                    return(
                      <div key={i} onClick={()=>onSelect(it)}
                        style={{background:"#12121f",borderRadius:16,padding:14,marginBottom:10,border:"1px solid #1e1e30",cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}>
                        {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:
                          <div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{it._aiEmoji||"🎬"}</div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4",marginBottom:3}}>{it.title||it.name||""}</div>
                          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:10,color:"#b0a8b8"}}>{it.media_type==="tv"?"Serie":"Film"}</span>
                            {(it.release_date||it.first_air_date)&&<span style={{fontSize:10,color:"#b0a8b8"}}>{(it.release_date||it.first_air_date).substring(0,4)}</span>}
                            {score>0&&<span style={{fontSize:10,color:scoreColor,fontWeight:700}}>★{score}</span>}
                          </div>
                          {it._aiReason&&<p style={{fontSize:12,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{it._aiReason}"</p>}
                          
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Collapsible Blocked Titles ──
function CollapsibleBlocked({blocked,onUnblock}){
  const [open,setOpen]=useState(false);
  if(blocked.length===0)return null;
  return(
    <div style={{marginBottom:14}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",background:"#12121f",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,color:"#ef4444",fontWeight:700}}>🚫 Ausgeblendet ({blocked.length})</span>
        <span style={{color:"#ef4444",fontSize:12,transition:"transform 0.3s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </button>
      {open&&(
        <div style={{background:"#12121f",borderRadius:"0 0 14px 14px",padding:"10px 14px 14px",border:"1px solid rgba(239,68,68,0.2)",borderTop:"none",marginTop:-1}}>
          <p style={{fontSize:11,color:"#666",marginBottom:8}}>Tippe zum Entsperren</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {blocked.map(t=>(
              <button key={t} onClick={()=>onUnblock(t)}
                style={{background:"rgba(239,68,68,0.09)",border:"1px solid rgba(239,68,68,0.27)",borderRadius:8,padding:"4px 10px",color:"#ef4444",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'"}}>
                {t} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History List (einklappbar) ──
function HistoryList({watched,ratings,onSelect,onRemove}){
  const [expanded,setExpanded]=useState(false);
  const SHOW=5;
  const sorted=[...watched].reverse(); // neueste zuerst
  const visible=expanded?sorted:sorted.slice(0,SHOW);
  return(
    <div>
      {visible.map(w=>{
        const myRating=ratings[titleKey(w.title)]||0;
        return(
          <div key={w.id} style={{background:"#12121f",borderRadius:14,padding:"12px",border:"1px solid #1e1e30",display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:"pointer"}} onClick={()=>onSelect(w)}>
            {w.poster_path?<img src={TMDB_IMG+w.poster_path} alt="" style={{width:36,height:54,borderRadius:8,objectFit:"cover",flexShrink:0}}/>:
              <div style={{width:36,height:54,borderRadius:8,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>🎬</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.title}</div>
              <div style={{fontSize:11,color:"#b0a8b8",marginTop:2}}>{w.media_type==="tv"?"Serie":"Film"}</div>
              {myRating>0&&<div style={{fontSize:12,color:"#f5c518",marginTop:2}}>{"★".repeat(myRating)+"☆".repeat(5-myRating)}</div>}
            </div>
            <button onClick={e=>{e.stopPropagation();onRemove(w);}} style={{padding:"7px 10px",borderRadius:10,background:"#1a1a2e",border:"1px solid #2a2340",color:"#b0a8b8",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        );
      })}
      {sorted.length>SHOW&&(
        <button onClick={()=>setExpanded(e=>!e)}
          style={{width:"100%",background:"transparent",border:"1px solid #1e1e30",borderRadius:12,padding:"10px",color:"#b0a8b8",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:600,marginBottom:8}}>
          {expanded?`▲ Weniger anzeigen`:`▼ Alle ${sorted.length} Titel anzeigen`}
        </button>
      )}
    </div>
  );
}

// ── Genre Profile (lustig) ──
function GenreProfile({genres}){
  const sorted=Object.entries(genres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6);
  if(!sorted.length)return(
    <div style={{marginTop:20,background:"#12121f",borderRadius:14,padding:20,border:"1px solid #1e1e30",textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:8}}>🎭</div>
      <p style={{fontSize:13,color:"#b0a8b8"}}>Noch kein Profil — bewerte ein paar Titel!</p>
    </div>
  );
  const max=sorted[0][1];
  const colors=["#ff6b35","#e84393","#fbbf24","#4ade80","#06b6d4","#8b5cf6"];

  // Fun labels based on top genre
  const topGenre=GENRES_TMDB[sorted[0][0]]||"Unbekannt";
  const funTitles={
    "Action":"Der Adrenalinjunkie",
    "Komödie":"Der Lachmuskel-Trainer",
    "Drama":"Die Gefühlsachterbahn",
    "Sci-Fi":"Der Weltraumdenker",
    "Horror":"Der Angstlust-Profi",
    "Thriller":"Der Spannung-Süchtige",
    "Dokumentation":"Der Wissensdurstiger",
    "Krimi":"Der Hobbydetektiv",
    "Romantik":"Der Romantiker im Herzen",
    "Familie":"Der Familienmensch",
    "Animation":"Der ewige Kinogänger",
  };
  const title=funTitles[topGenre]||"Der Streaming-Connaisseur";

  return(
    <div style={{marginTop:20,background:"linear-gradient(135deg,#1a1525,#0f0e1a)",borderRadius:18,padding:18,border:"1px solid #2a1f3d"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#ff6b35,#e84393)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
          {GENRE_EMOJI[sorted[0][0]]||"🎬"}
        </div>
        <div>
          <p style={{fontSize:13,fontWeight:800,color:"#f0ece4",marginBottom:2}}>{title}</p>
          <p style={{fontSize:10,color:"#b0a8b8"}}>Basierend auf deinen Bewertungen</p>
        </div>
      </div>
      {sorted.map(([gid,val],i)=>{
        const name=GENRES_TMDB[gid];
        if(!name)return null; // skip unknown genre IDs
        const pct=Math.round(val/max*100);
        const label=pct>=90?"Obsession":pct>=70?"Favorit":pct>=50?"Mag ich":pct>=30?"Gelegentlich":"Selten";
        return(
          <div key={gid} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>{GENRE_EMOJI[gid]||"🎬"}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#f0ece4"}}>{name}</span>
              </div>
              <span style={{fontSize:10,color:colors[i],fontWeight:600}}>{label}</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"#1a1a2e",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,width:pct+"%",background:colors[i],transition:"width 0.8s ease"}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──
function MainApp({profile:initProfile,onReset}){
  const [profile,setProfile]=useState(()=>{
    const p={...initProfile};
    if(!p.watched)p.watched=[];
    if(!p.liked)p.liked=[];
    if(!p.liked_titles)p.liked_titles=[];
    if(!p.blocked_titles)p.blocked_titles=[];
    if(!p.ratings)p.ratings={};
    return p;
  });
  const [tab,setTab]=useState("home");
  const [showSettings,setSS]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [selectedItem,setSelectedItem]=useState(null);
  const [searchQuery,setSQ]=useState("");
  const [searchResults,setSR]=useState([]);
  const [searching,setSearching]=useState(false);
  const searchRef=useRef(null);
  const [homeQuip]=useState(()=>rnd(QUIPS_HOME));

  const [heroItems,setHeroItems]=useState([]);
  const [feedItems,setFeedItems]=useState([]);
  const [baseHeroItems,setBaseHeroItems]=useState([]);
  const [baseFeedItems,setBaseFeedItems]=useState([]);
  const reserveItems=useRef([]); // Reserve für Ersatz-Empfehlungen
  const [feedLoading,setFeedLoading]=useState(true);
  const [activeMood,setActiveMood]=useState(null);
  const [aiRecs,setAiRecs]=useState([]);

  const [surpriseData,setSurpriseData]=useState(null);
  const [surpriseLoading,setSurpriseLoading]=useState(false);
  const [surpriseError,setSurpriseError]=useState(null);
  const [oracleData,setOracleData]=useState(null);
  const [oracleLoading,setOracleLoading]=useState(false);
  const [oracleError,setOracleError]=useState(null);
  const [personality,setPersonality]=useState(null);
  const [personalityLoading,setPersonalityLoading]=useState(false);

  const [browseType,setBrowseType]=useState("serie");
  const [top5Serie,setTop5Serie]=useState([]);
  const [top5Film,setTop5Film]=useState([]);
  const [top5Loading,setTop5Loading]=useState(true);

  function updateProfile(fn){
    setProfile(prev=>{const next=fn(prev);sSet("sf_profile",next);return next;});
  }

  function handleLike(item){
    updateProfile(p=>{
      const id=item.id,title=item.title||item.name||"";
      const isLiked=(p.liked||[]).includes(id);
      const liked=isLiked?p.liked.filter(x=>x!==id):[...p.liked,id];
      const liked_titles=isLiked?(p.liked_titles||[]).filter(t=>t!==title):[...(p.liked_titles||[]),title];
      const genres={...p.genres};
      if(!isLiked)(item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+2;});
      return{...p,liked,liked_titles,genres};
    });
  }

  function handleRate(itemTitle,stars,directGenreIds){
    const key=titleKey(itemTitle);
    updateProfile(p=>{
      const ratings={...(p.ratings||{}),[key]:stars};
      const genres={...p.genres};
      const allItems=[...(p.watched||[])];
      const found=allItems.find(it=>titleKey(it.title||it.name||"")===key);
      // Use directly passed genre_ids (from swipe) or look up from watched
      const genreIds=directGenreIds||found?.genre_ids||[];
      if(genreIds.length>0){
        const boost=stars===5?6:stars===4?4:stars===3?1:stars===2?-3:stars===1?-5:0;
        if(boost!==0)genreIds.forEach(g=>{genres[g]=(genres[g]||0)+boost;});
      }
      const ref=REF_TITLES.find(r=>titleKey(r.title)===key);
      if(ref){
        const boost=stars===5?6:stars===4?4:stars===3?1:stars===2?-3:stars===1?-5:0;
        if(boost!==0)ref.genres.forEach(g=>{genres[g]=(genres[g]||0)+boost;});
      }
      return{...p,ratings,genres};
    });
    // Sofort aus Feed entfernen + ersetzen wenn schlecht bewertet
    if(stars<=2){
      const key=titleKey(itemTitle);
      const removeIfBad=items=>items.filter(it=>titleKey(it.title||it.name||"")!==key);
      const reserve=reserveItems.current;
      const replacement=reserve.find(r=>{
        const t=titleKey(r.title||r.name||"");
        return t!==key&&!(profile.blocked_titles||[]).includes(t)&&!(profile.watched||[]).some(w=>w.id===r.id);
      });
      if(replacement){
        reserveItems.current=reserve.filter(r=>r.id!==replacement.id);
        setFeedItems(prev=>[...removeIfBad(prev),replacement]);
        setBaseFeedItems(prev=>[...removeIfBad(prev),replacement]);
      } else {
        setFeedItems(prev=>removeIfBad(prev));
        setBaseFeedItems(prev=>removeIfBad(prev));
      }
      setHeroItems(prev=>removeIfBad(prev));
      setBaseHeroItems(prev=>removeIfBad(prev));
    }
  }

  function handleBlock(itemTitle){
    const key=titleKey(itemTitle);
    updateProfile(p=>{
      const blocked=p.blocked_titles||[];
      const isBlocked=blocked.includes(key);
      return{...p,blocked_titles:isBlocked?blocked.filter(t=>t!==key):[...blocked,key]};
    });
    // Sofort aus der aktuellen Liste entfernen
    const filterOut=items=>items.filter(it=>titleKey(it.title||it.name||"")!==key);
    setHeroItems(prev=>filterOut(prev));
    setFeedItems(prev=>filterOut(prev));
  }

  function handleWatched(item){
    // Sofort aus der aktuellen Feed-Liste entfernen
    const removeFromFeed=items=>items.filter(it=>it.id!==item.id);
    setHeroItems(prev=>removeFromFeed(prev));
    setFeedItems(prev=>removeFromFeed(prev));
    setBaseHeroItems(prev=>removeFromFeed(prev));
    setBaseFeedItems(prev=>removeFromFeed(prev));
    updateProfile(p=>{
      const watched=p.watched||[];
      const exists=watched.some(w=>w.id===item.id);
      if(exists)return{...p,watched:watched.filter(w=>w.id!==item.id)};
      // Support both genre_ids array and genres array of objects
      const genreIds=item.genre_ids||(item.genres||[]).map(g=>g.id)||[];
      const entry={
        id:item.id,
        title:item.title||item.name||"?",
        poster_path:item.poster_path,
        genre_ids:genreIds,
        vote_average:item.vote_average,
        media_type:item.media_type||(item.first_air_date?"tv":"movie"),
        addedAt:Date.now()
      };
      const genres={...p.genres};
      genreIds.forEach(g=>{genres[g]=(genres[g]||0)+1;});
      return{...p,watched:[entry,...watched].slice(0,50),genres};
    });
  }

  const cardProps={profile,onRate:handleRate,onLike:handleLike,onWatched:handleWatched,onBlock:handleBlock,onSelect:setSelectedItem};

  function filterItems(items){
    const watchedIds=new Set((profile.watched||[]).map(w=>w.id));
    const watchedKeys=new Set((profile.watched||[]).map(w=>titleKey(w.title)));
    const blockedKeys=new Set(profile.blocked_titles||[]);
    const ratings=profile.ratings||{};
    return items.filter(it=>{
      const t=titleKey(it.title||it.name||"");
      if(watchedIds.has(it.id))return false;
      if(watchedKeys.has(t))return false;
      if(blockedKeys.has(t))return false;
      // Exclude anything rated 1-2 stars — never show these as recommendations
      const myRating=ratings[t]||0;
      if(myRating>0&&myRating<=2)return false;
      return true;
    });
  }

  function scoreItem(it){
    let s=(it.vote_average||0)*2;
    // Genre boost from profile
    (it.genre_ids||[]).forEach(g=>{s+=(profile.genres[g]||0)*1.5;});
    // 3 stars = neutral, 4-5 = boost similar titles (this item shouldn't appear since it's watched)
    return s;
  }

  async function loadHomeFeed(){
    setFeedLoading(true);
    setHeroItems([]);
    setFeedItems([]);
    setActiveMood(null);
    try{
      const items=await getSmartRecommendations(profile);
      const hero=items.slice(0,3);
      const feed=items.slice(3);
      setHeroItems(hero);
      setFeedItems(feed);
      setBaseHeroItems(hero);
      setBaseFeedItems(feed);
      reserveItems.current=items.slice(20); // Reservetitel für Ersatz
    }catch(e){console.error("loadHomeFeed error:",e);}
    setFeedLoading(false);
  }


  async function loadTop5(){
    setTop5Loading(true);
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    const allIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337];

    // Nutze alle Plattformen für Top 5 im Entdecken-Tab
    const pseudoPlatform={id:"all",tmdbIds:allIds};

    try{
      // TMDB sofort — kein KI nötig
      const [serieItems,filmItems]=await Promise.all([
        getTMDBTop5(profile,pseudoPlatform,"serie"),
        getTMDBTop5(profile,pseudoPlatform,"film"),
      ]);

      // In AI-Format konvertieren für Anzeige
      function toRec(it){
        const pl=PLATFORMS.find(p=>p.tmdbIds.some(id=>(it.origin_country||[]).includes("US")||true));
        return{
          title:it.title||it.name||"",
          year:(it.release_date||it.first_air_date||"").substring(0,4),
          reason:`★ ${it.vote_average?Math.round(it.vote_average*10)/10:""} — passt zu deinen Lieblingsgenres`,
          emoji:it.media_type==="tv"?"📺":"🎬",
          platform:"",
          _tmdbItem:it,
        };
      }

      setTop5Serie(serieItems.map(toRec));
      setTop5Film(filmItems.map(toRec));
      setTop5Loading(false);

      // KI verfeinert im Hintergrund
      Promise.all([getAITop5(profile,"serie"),getAITop5(profile,"film")])
        .then(([s,f])=>{
          if(s&&s.length>0)setTop5Serie(s);
          if(f&&f.length>0)setTop5Film(f);
        })
        .catch(()=>{/* KI nicht verfügbar — TMDB bleibt */});

    }catch(e){
      // Fallback: nur KI
      getAITop5(profile,"serie").then(s=>{if(s?.length)setTop5Serie(s);}).catch(()=>{});
      getAITop5(profile,"film").then(f=>{if(f?.length)setTop5Film(f);}).catch(()=>{});
      setTop5Loading(false);
    }
  }

  useEffect(()=>{loadHomeFeed();loadTop5();},[]);

  async function doAiRefresh(){
    setAiRefreshing(true);
    setFeedLoading(true);
    setHeroItems([]);
    setFeedItems([]);
    // Lese aktuelles Profil direkt aus localStorage für frische Genre-Daten
    let freshProfile=profile;
    try{const saved=localStorage.getItem("streamfinder_profile");if(saved)freshProfile=JSON.parse(saved);}catch(e){}
    try{
      const items=await getSmartRecommendations(freshProfile);
      if(items.length>0){
        const hero=items.slice(0,3);
        const feed=items.slice(3);
        setHeroItems(hero);
        setFeedItems(feed);
        setBaseHeroItems(hero);
        setBaseFeedItems(feed);
        setActiveMood(null);
        setFeedLoading(false);
      }
    }catch(e){console.error("Smart algo error:",e);}
    // KI optional im Hintergrund
    try{
      const aiRecs=await getAIHomeFeed(freshProfile);
      if(aiRecs&&aiRecs.length>0){
        const enriched=await Promise.all(aiRecs.map(r=>enrichWithTMDB(r,freshProfile)));
        const likedIds=new Set(freshProfile.liked||[]);
        const watchedIds=new Set((freshProfile.watched||[]).map(w=>w.id));
        const blockedKeys=new Set(freshProfile.blocked_titles||[]);
        const ratings=freshProfile.ratings||{};
        const valid=enriched.filter(it=>{
          if(!it||!it.id)return false;
          if(likedIds.has(it.id))return false;
          if(watchedIds.has(it.id))return false;
          const t=titleKey(it.title||it.name||"");
          if(blockedKeys.has(t))return false;
          const myRating=ratings[t]||0;
          if(myRating>0&&myRating<3)return false;
          return true;
        });
        if(valid.length>0){
          setHeroItems(valid.slice(0,3));
          setFeedItems(valid.slice(3));
        }
      }
    }catch(e){console.error("KI optional:",e);}
    setFeedLoading(false);
    setAiRefreshing(false);
  }


  function applyMood(mood){
    // Nochmal tippen = Filter aufheben, zurück zur Original-Liste
    if(activeMood===mood.id){
      setActiveMood(null);
      setHeroItems(baseHeroItems);
      setFeedItems(baseFeedItems);
      return;
    }
    setActiveMood(mood.id);
    // Filter die Original-Liste nach Genre — kein neuer API-Call nötig
    const all=[...baseHeroItems,...baseFeedItems];
    if(all.length>0){
      const filtered=all.filter(it=>
        (it.genre_ids||[]).some(g=>mood.genres.includes(g))
      );
      setHeroItems(filtered.slice(0,3));
      setFeedItems(filtered.slice(3));
      // Falls zu wenig Treffer — lade zusätzlich von TMDB
      if(filtered.length<6){
        const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
        const moodIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337,350];
        const watchedIds=new Set((profile.watched||[]).map(w=>w.id));
        const likedIds=new Set(profile.liked||[]);
        const blocked=new Set(profile.blocked_titles||[]);
        const ratings=profile.ratings||{};
        setFeedLoading(true);
        Promise.all([
          discoverTitles("serie",moodIds,mood.genres.join("|"),1,"vote_average.desc"),
          discoverTitles("film",moodIds,mood.genres.join("|"),1,"vote_average.desc"),
        ]).then(([s1,f1])=>{
          const extra=[
            ...(s1.results||[]).map(r=>({...r,media_type:"tv"})),
            ...(f1.results||[]).map(r=>({...r,media_type:"movie"})),
          ].filter(it=>{
            const t=titleKey(it.title||it.name||"");
            const myRating=ratings[t]||0;
            return !watchedIds.has(it.id)&&!likedIds.has(it.id)&&!blocked.has(t)&&!(myRating>0&&myRating<3);
          });
          const combined=[...filtered,...extra.filter(e=>!filtered.find(f=>f.id===e.id))];
          setHeroItems(combined.slice(0,3));
          setFeedItems(combined.slice(3,20));
          setFeedLoading(false);
        }).catch(()=>setFeedLoading(false));
      }
    } else {
      // Noch keine Base-Liste — lade von TMDB
      const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
      const moodIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337,350];
      setFeedLoading(true);
      Promise.all([
        discoverTitles("serie",moodIds,mood.genres.join("|"),1,"vote_average.desc"),
        discoverTitles("film",moodIds,mood.genres.join("|"),1,"vote_average.desc"),
      ]).then(([s1,f1])=>{
        const all=[...(s1.results||[]).map(r=>({...r,media_type:"tv"})),...(f1.results||[]).map(r=>({...r,media_type:"movie"}))];
        setHeroItems(all.slice(0,3));setFeedItems(all.slice(3,20));setFeedLoading(false);
      }).catch(()=>setFeedLoading(false));
    }
  }

  async function doSurprise(){
    setSurpriseLoading(true);setSurpriseData(null);setSurpriseError(null);
    try{
      const result=await getSurprise(profile);
      if(result)setSurpriseData(result);
      else setSurpriseError("Keine Antwort vom Server. Bitte nochmal versuchen.");
    }catch(e){setSurpriseError(e.message==="RATE_LIMIT"?"RATE_LIMIT":"ERROR");}
    setSurpriseLoading(false);
  }
  async function doOracle(){
    setOracleLoading(true);setOracleData(null);setOracleError(null);
    try{
      const result=await getOracle(profile);
      if(result)setOracleData(result);
      else setOracleError("Das Orakel schweigt. Bitte nochmal versuchen.");
    }catch(e){setOracleError(e.message==="RATE_LIMIT"?"RATE_LIMIT":"ERROR");}
    setOracleLoading(false);
  }
  async function doPersonality(){setPersonalityLoading(true);setPersonality(null);setPersonality(await getPersonalityType(profile).catch(()=>null));setPersonalityLoading(false);}

  function handleSearch(q){
    setSQ(q);
    if(searchRef.current)clearTimeout(searchRef.current);
    if(!q.trim()){setSR([]);return;}
    searchRef.current=setTimeout(()=>{
      setSearching(true);
      searchTitles(q).then(d=>{setSR((d?.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,15));setSearching(false);}).catch(()=>setSearching(false));
    },400);
  }

  const userPlatforms=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
  const top5Current=browseType==="serie"?top5Serie:top5Film;
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];

  const tabs=[
    {id:"home",   label:"Für dich",  icon:"✨"},
    {id:"browse", label:"Entdecken", icon:"🔍"},
    {id:"fun",    label:"Spaß",      icon:"🎲"},
    {id:"liked",  label:"Merkliste", icon:"❤️"},
    {id:"history",label:"Verlauf",   icon:"📋"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#09090f",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",paddingBottom:90}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      {selectedItem&&<DetailModal item={selectedItem} profile={profile} onClose={()=>setSelectedItem(null)} onRate={handleRate} onLike={handleLike} onWatched={handleWatched} onBlock={handleBlock}/>}
      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)} activeTab={tab}/>}

      {/* Header */}
      <div style={{padding:"20px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Logo Icon */}
          <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
            <div style={{position:"absolute",inset:0,borderRadius:14,background:"linear-gradient(145deg,#1a1a2e,#0d0d18)",border:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 4px 20px rgba(0,0,0,0.67), inset 0 1px 0 rgba(255,255,255,0.04)"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:22,filter:"drop-shadow(0 0 8px rgba(196,169,96,0.27))"}}>🎬</span>
            </div>
          </div>
          {/* Logo Text */}
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:1}}>
              <span style={{fontFamily:"'Instrument Serif',serif",fontSize:24,fontWeight:400,color:"#f0ece4",letterSpacing:"-0.5px",lineHeight:1}}>Stream</span>
              <span style={{fontFamily:"'Instrument Serif',serif",fontSize:24,fontStyle:"italic",fontWeight:400,background:"linear-gradient(135deg,#c4a960,#e8d5a3)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px",lineHeight:1}}>Finder</span>
            </div>
            <p style={{fontSize:9,color:"#444",margin:"2px 0 0",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"'DM Sans'"}}>{homeQuip}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowHelp(true)} style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#b0a8b8",fontSize:16,fontWeight:700,fontFamily:"'DM Sans'"}}>?</button>
          <button onClick={()=>setSS(!showSettings)} style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#b0a8b8",fontSize:18}}>⚙️</button>
        </div>
      </div>
      {showSettings&&(
        <div style={{margin:"10px 18px",background:"#12121f",borderRadius:14,border:"1px solid #1e1e30",overflow:"hidden"}}>
          {/* Sprachen */}
          <div style={{padding:14,borderBottom:"1px solid #1e1e30"}}>
            <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:"0 0 10px"}}>Sprachen</p>
            <p style={{fontSize:11,color:"#666",margin:"0 0 10px"}}>Welche Originalsprachen möchtest du sehen?</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {LANGUAGE_OPTIONS.map(l=>{
                const active=(profile.languages||["en","de"]).includes(l.id);
                return(
                  <button key={l.id} onClick={()=>{
                    const langs=profile.languages||["en","de"];
                    const next=active&&langs.length>1?langs.filter(x=>x!==l.id):[...langs,l.id];
                    updateProfile(p=>({...p,languages:next}));
                  }} style={{
                    background:active?"rgba(196,169,96,0.15)":"transparent",
                    border:"1px solid "+(active?"rgba(196,169,96,0.5)":"#2a2340"),
                    borderRadius:10,padding:"7px 12px",cursor:"pointer",
                    color:active?"#c4a960":"#666",
                    fontFamily:"'DM Sans'",fontWeight:active?700:400,fontSize:12,
                    display:"flex",alignItems:"center",gap:5,
                  }}>
                    <span>{l.flag}</span>{l.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Reset */}
          <div style={{padding:14}}>
            <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:"0 0 10px"}}>Profil zurücksetzen</p>
            <button onClick={onReset} style={{background:"rgba(229,9,20,0.09)",border:"1px solid rgba(229,9,20,0.27)",borderRadius:10,padding:"9px 18px",color:"#E50914",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:12}}>🔄 Zurücksetzen</button>
          </div>
        </div>
      )}

      <div style={{paddingTop:14}}>
        {/* HOME */}
        {tab==="home"&&(
          <div>
            <div style={{padding:"0 18px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:0}}>Stimmung — {day}?</p>
              </div>
              {/* Genre Pills */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {MOODS.map(m=>{
                  const active=activeMood===m.id;
                  return(
                    <button key={m.id} onClick={()=>applyMood(m)}
                      style={{
                        background:active?m.color+"22":"transparent",
                        border:"1px solid "+(active?m.color+(active?"99":"33"):m.color+"33"),
                        borderRadius:8,padding:"6px 14px",cursor:"pointer",
                        color:active?m.color:"#666",
                        fontFamily:"'DM Sans'",fontWeight:active?700:400,
                        fontSize:11,whiteSpace:"nowrap",flexShrink:0,
                        letterSpacing:"0.3px",transition:"all 0.2s",
                        boxShadow:active?"0 0 10px "+m.color+"44":"none",
                      }}>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status-Zeile wenn Genre aktiv */}
            {activeMood&&(()=>{
              const m=MOODS.find(x=>x.id===activeMood);
              const total=(heroItems.length+feedItems.length);
              return m?(
                <div style={{margin:"0 18px 12px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(to right,"+m.color+"66,transparent)"}}/>
                  <span style={{fontSize:11,color:m.color,fontWeight:600,whiteSpace:"nowrap"}}>{m.label} · {total} Titel</span>
                  <button onClick={()=>applyMood(m)} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",padding:"0 4px"}}>× zurück</button>
                  <div style={{flex:1,height:1,background:"linear-gradient(to left,"+m.color+"66,transparent)"}}/>
                </div>
              ):null;
            })()}

            {feedLoading?(
              <div style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:28,animation:"spin 2s linear infinite",display:"inline-block"}}>🍿</div>
                <p style={{fontSize:14,color:"#f0ece4",fontWeight:700,marginTop:12}}>Empfehlungen werden geladen…</p>
                <p style={{fontSize:12,color:"#b0a8b8",marginTop:4}}>Einen Moment — das lohnt sich!</p>
              </div>
            ):(
              <div style={{padding:"0 18px"}}>
                {heroItems.length>0&&(
                  <div style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:0}}>
                        {activeMood?MOODS.find(m=>m.id===activeMood)?.label||"Picks":"Top-Picks"}
                      </p>
                      <span style={{fontSize:10,color:"#55506a",letterSpacing:"0.3px",fontStyle:"italic"}}>← wischen zum Ausblenden</span>
                    </div>
                    {heroItems.map(it=><SwipeToBlock key={it.id} onBlock={()=>cardProps.onBlock(it.title||it.name||"")}><HeroCard item={it} {...cardProps}/></SwipeToBlock>)}
                  </div>
                )}
                {feedItems.length>0&&(
                  <div>
                    <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Weitere Empfehlungen</p>
                    {feedItems.map(it=><SwipeToBlock key={it.id} onBlock={()=>cardProps.onBlock(it.title||it.name||"")}><TitleCard item={it} {...cardProps}/></SwipeToBlock>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BROWSE */}
        {tab==="browse"&&(
          <div style={{padding:"0 18px"}}>
            <BrowseTab profile={profile} cardProps={cardProps} onSelect={setSelectedItem}/>
          </div>
        )}

        {/* FUN */}
        {tab==="fun"&&(
          <div style={{padding:"0 18px"}}>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,margin:"0 0 4px",background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🎲 Spaß-Ecke</h2>
            <p style={{fontSize:12,color:"#b0a8b8",marginBottom:20}}>Weil normales Suchen so langweilig ist.</p>

            <div style={{background:"linear-gradient(135deg,#1a1525,#13101e)",borderRadius:20,padding:20,marginBottom:16,border:"1px solid #2a1f3d",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🎲</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#f0ece4"}}>Überrasch mich!</h3>
              <p style={{fontSize:13,color:"#a09aaa",marginBottom:14}}>Wir entscheiden. Du schaust. Ende der Diskussion.</p>
              {!surpriseData&&!surpriseLoading&&!surpriseError&&<button onClick={doSurprise} style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"14px 28px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px rgba(255,107,53,0.25)"}}>🎰 Schicksal herausfordern</button>}
              {surpriseLoading&&<div><div style={{fontSize:32,animation:"spin 1s linear infinite",display:"inline-block"}}>🎲</div><p style={{fontSize:13,color:"#c4b8c8",marginTop:8}}>Würfelt…</p></div>}
              {surpriseError&&!surpriseLoading&&(
                <div style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:14,padding:16,marginBottom:10,textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>{surpriseError==="RATE_LIMIT"?"🌙":"🎬"}</div>
                  <p style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:4}}>
                    {surpriseError==="RATE_LIMIT"?"Heute ausgebucht":"Gleich wieder da"}
                  </p>
                  <p style={{fontSize:11,color:"#b0a8b8",marginBottom:12}}>
                    {surpriseError==="RATE_LIMIT"?"Die KI macht heute Feierabend. Morgen früh wieder verfügbar.":"Kurz warten und nochmal versuchen."}
                  </p>
                  <button onClick={doSurprise} style={{background:"rgba(255,107,53,0.13)",border:"1px solid rgba(255,107,53,0.27)",borderRadius:10,padding:"8px 18px",color:"#ff6b35",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:700}}>Nochmal versuchen</button>
                </div>
              )}
              {surpriseData&&!surpriseLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <p style={{fontSize:14,color:"#ff6b35",fontWeight:800,marginBottom:8}}>{rnd(SURPRISE_MSGS)}</p>
                  <div style={{background:"#0d0d18",borderRadius:14,padding:"16px",marginBottom:12,textAlign:"left",border:"1px solid #2a1f3d"}}>
                    <div style={{fontSize:28,marginBottom:8}}>{surpriseData.emoji||"🎬"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#f0ece4",marginBottom:4}}>{surpriseData.title} {surpriseData.year&&<span style={{fontSize:12,color:"#b0a8b8"}}>({surpriseData.year})</span>}</div>
                    {surpriseData.platform&&<div style={{fontSize:12,color:"#ff6b35",fontWeight:700,marginBottom:8}}>{surpriseData.platform}</div>}
                    <p style={{fontSize:13,color:"#c4b8c8",fontStyle:"italic",lineHeight:1.6,margin:0}}>"{surpriseData.prophecy}"</p>
                  </div>
                  <button onClick={doSurprise} style={{background:"transparent",border:"1px solid rgba(255,107,53,0.27)",borderRadius:12,padding:"10px 20px",color:"#ff6b35",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>🎲 Nochmal</button>
                </div>
              )}
            </div>

            <div style={{background:"linear-gradient(135deg,#1a1020,#130818)",borderRadius:20,padding:20,marginBottom:16,border:"1px solid #3d1f5a",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🔮</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#d4b8f0"}}>Das Orakel</h3>
              <p style={{fontSize:13,color:"#a09aaa",marginBottom:14}}>Mystischer. Unabhängig vom Würfel.</p>
              {!oracleData&&!oracleLoading&&!oracleError&&<button onClick={doOracle} style={{background:"linear-gradient(135deg,#7c3aed,#e84393)",border:"none",borderRadius:14,padding:"14px 28px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px rgba(124,58,237,0.27)"}}>🔮 Orakel befragen</button>}
              {oracleLoading&&<div><div style={{fontSize:32,animation:"spin 2s linear infinite",display:"inline-block"}}>🔮</div><p style={{fontSize:13,color:"#c4b8c8",marginTop:8}}>Das Orakel meditiert…</p></div>}
              {oracleError&&!oracleLoading&&(
                <div style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:14,padding:16,marginBottom:10,textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>{oracleError==="RATE_LIMIT"?"🌙":"🔮"}</div>
                  <p style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:4}}>
                    {oracleError==="RATE_LIMIT"?"Das Orakel ruht":"Das Orakel schweigt"}
                  </p>
                  <p style={{fontSize:11,color:"#b0a8b8",marginBottom:12}}>
                    {oracleError==="RATE_LIMIT"?"Heute ausgebucht — morgen früh ist das Orakel wieder wach.":"Die Sterne stehen ungünstig. Kurz warten."}
                  </p>
                  <button onClick={doOracle} style={{background:"rgba(124,58,237,0.13)",border:"1px solid rgba(124,58,237,0.27)",borderRadius:10,padding:"8px 18px",color:"#a78bfa",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:700}}>Nochmal versuchen</button>
                </div>
              )}
              {oracleData&&!oracleLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <div style={{background:"rgba(124,58,237,0.12)",borderRadius:14,padding:"16px",marginBottom:12,textAlign:"left",border:"1px solid #3d1f5a"}}>
                    <div style={{fontSize:28,marginBottom:8}}>{oracleData.emoji||"🔮"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#f0ece4",marginBottom:4}}>{oracleData.title} {oracleData.year&&<span style={{fontSize:12,color:"#b0a8b8"}}>({oracleData.year})</span>}</div>
                    {oracleData.platform&&<div style={{fontSize:12,color:"#a78bfa",fontWeight:700,marginBottom:8}}>{oracleData.platform}</div>}
                    <p style={{fontSize:13,color:"#c4b8d4",fontStyle:"italic",lineHeight:1.6,margin:0}}>"{oracleData.prophecy}"</p>
                  </div>
                  <button onClick={doOracle} style={{background:"transparent",border:"1px solid #3d1f5a",borderRadius:12,padding:"10px 20px",color:"#a78bfa",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>🔮 Neu befragen</button>
                </div>
              )}
            </div>

            <div style={{background:"linear-gradient(135deg,#0f1a1a,#0d1f1a)",borderRadius:20,padding:20,border:"1px solid #1f3d2a"}}>
              <div style={{fontSize:36,marginBottom:8,textAlign:"center"}}>🧠</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#a0f0c8",textAlign:"center"}}>Dein Streaming-Typ</h3>
              <p style={{fontSize:13,color:"#a09aaa",marginBottom:14,textAlign:"center"}}>Wir analysieren dich. Bitte nicht erschrecken.</p>
              {!personality&&!personalityLoading&&<button onClick={doPersonality} style={{width:"100%",background:"linear-gradient(135deg,#22d3ee,#4ade80)",border:"none",borderRadius:14,padding:"14px",color:"#0d1f1a",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🔬 Persönlichkeit analysieren</button>}
              {personalityLoading&&<div style={{textAlign:"center"}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🧠</div><p style={{fontSize:12,color:"#b0a8b8",marginTop:8}}>Analysiere Filmgeschmack…</p></div>}
              {personality&&!personalityLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <div style={{background:"#0d1a14",borderRadius:16,padding:"16px",border:"1px solid #1f3d2a",marginBottom:12,textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:8}}>{personality.emoji||"🎬"}</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#4ade80",marginBottom:6}}>{personality.type}</div>
                    <p style={{fontSize:13,color:"#a0f0c8",lineHeight:1.6,marginBottom:8}}>{personality.description}</p>
                    <div style={{background:"#0a1410",borderRadius:10,padding:"8px 12px",marginBottom:8}}><span style={{fontSize:11,color:"#ef4444",fontWeight:700}}>⚠️ Schwäche: </span><span style={{fontSize:11,color:"#c4b8c8"}}>{personality.weakness}</span></div>
                    <div style={{background:"#0a1410",borderRadius:10,padding:"8px 12px"}}><span style={{fontSize:11,color:"#4ade80",fontWeight:700}}>🎯 Perfekt: </span><span style={{fontSize:11,color:"#c4b8c8"}}>{personality.recommendation}</span></div>
                  </div>
                  <button onClick={doPersonality} style={{width:"100%",background:"transparent",border:"1px solid #1f3d2a",borderRadius:12,padding:"10px",color:"#4ade80",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>🔄 Nochmal</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIKED */}
        {tab==="liked"&&<LikedTab profile={profile} cardProps={cardProps}/>}

        {/* HISTORY */}
        {tab==="history"&&(
          <div style={{padding:"0 18px"}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:6}}>📋 Verlauf & Profil</h3>
            <p style={{fontSize:12,color:"#b0a8b8",marginBottom:16}}>Je mehr du markierst, desto besser die Empfehlungen.</p>
            <CollapsibleBlocked blocked={profile.blocked_titles||[]} onUnblock={handleBlock}/>
            {(profile.watched||[]).length===0
              ?<div style={{textAlign:"center",padding:40,color:"#b0a8b8"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p>Noch keine Titel gesehen.</p></div>
              :<HistoryList watched={profile.watched||[]} ratings={profile.ratings||{}} onSelect={setSelectedItem} onRemove={handleWatched}/>
            }
            <GenreProfile genres={profile.genres||{}}/>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(180deg,transparent,#09090f 40%)",backdropFilter:"blur(20px)",borderTop:"1px solid #1e1e30",display:"flex",padding:"8px 8px 20px",zIndex:100}}>
        {tabs.map(t=>{
          const isActive=tab===t.id;
          return(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:isActive?"linear-gradient(135deg,rgba(255,107,53,0.13),rgba(232,67,147,0.09))":"transparent",border:isActive?"1px solid rgba(255,107,53,0.19)":"1px solid transparent",borderRadius:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",color:isActive?"#ff6b35":"#5a4e6a"}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:800,fontFamily:"'DM Sans'"}}>{t.label}</span>
          </button>);
        })}
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}

export default function StreamFinder(){
  const [profile,setProfile]=useState(()=>sGet("sf_profile"));
  function handleComplete(p){sSet("sf_profile",p);setProfile(p);}
  function handleReset(){sDel("sf_profile");setProfile(null);}
  if(!profile)return<Onboarding onComplete={handleComplete}/>;
  return<MainApp profile={profile} onReset={handleReset}/>;
}
