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


// ── Similar Titles — TMDB /similar endpoint ──
async function getSimilarTitles(mediaType, id, providerIds, profile){
  try{
    const mt=mediaType==="tv"?"tv":"movie";
    const res=await tmdbFetch("/"+mt+"/"+id+"/similar",{page:1});
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const blocked=new Set(profile.blocked_titles||[]);
    const ratings=profile.ratings||{};
    const liked=new Set(profile.liked||[]);
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    return (res.results||[])
      .map(r=>({...r,media_type:mt}))
      .filter(r=>{
        if(watched.has(r.id)||liked.has(r.id))return false;
        const t=titleKey(r.title||r.name||"");
        if(blocked.has(t))return false;
        const myRating=ratings[t]||0;
        if(myRating>0&&myRating<=2)return false;
        if((r.vote_average||0)<6)return false;
        if(langFilter&&langFilter.length>0){
          if(!langFilter.includes(r.original_language))return false;
        }
        return true;
      })
      .slice(0,8);
  }catch(e){return[];}
}

// Template-Texte für Similar (kein KI nötig)
function similarReason(sourceTitle, item){
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const templates=[
    `Ähnlich wie "${sourceTitle}" — aber mit eigener Handschrift.`,
    `Wer "${sourceTitle}" mochte, wird hier nicht enttäuscht.`,
    `Der logische nächste Schritt nach "${sourceTitle}".`,
    `Gleiche Energie wie "${sourceTitle}", andere Geschichte.`,
    `${score>=8?"Ausgezeichnet bewertet":"Gut bewertet"} — und thematisch nah an "${sourceTitle}".`,
    `Was "${sourceTitle}" angefangen hat, führt das hier weiter.`,
  ];
  return templates[Math.floor(Math.random()*templates.length)];
}

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
Geschmack: ${ctx.taste||""}
Liebt: ${ctx.top || "nichts"}
Watchlist: ${ctx.watchlist||""}
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
Nutzer-Geschmack: ${ctx.taste||""}
Liebt: ${ctx.top || "noch nichts bewertet"}
Watchlist: ${ctx.watchlist||""}
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
  const watched=profile.watched||[];

  // Titel-Mapping
  const titleMap=watched.reduce((acc,w)=>{acc[titleKey(w.title)]=w.title;return acc;},(profile.liked_items||[]).reduce((acc,it)=>{acc[titleKey(it.title||it.name||"")]=it.title||it.name||"";return acc;},{}));

  // LED: 5=Grün/Top, 3=Orange/Ok, 1=Rot/Nein
  const rated5=Object.entries(ratings).filter(([,v])=>v===5).map(([k])=>titleMap[k]||k).slice(0,6).join(", ");
  const rated4=Object.entries(ratings).filter(([,v])=>v===3).map(([k])=>titleMap[k]||k).slice(0,6).join(", "); // Orange=Ok
  const rated2=Object.entries(ratings).filter(([,v])=>v===1).map(([k])=>titleMap[k]||k).slice(0,4).join(", "); // Rot=Nein
  const rated1=rated2;

  const top=[...Object.entries(ratings).filter(([,v])=>v>=3).map(([k,v])=>{
    const label=v===5?"🟢":v===3?"🟠":"";
    return label+(titleMap[k]||k);
  })].slice(0,8).join(", ");
  const low=[...Object.entries(ratings).filter(([,v])=>v===1).map(([k])=>titleMap[k]||k)].slice(0,5).join(", ");
  const blocked=(profile.blocked_titles||[]).slice(0,8).join(", ");
  const watchedTitles=watched.slice(0,10).map(w=>w.title).join(", ");
  const watchlist=(profile.liked_items||[]).map(it=>it.title||it.name||"").slice(0,6).join(", ");

  // Genre-Profil mit Stärke
  const genreEntries=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6);
  const maxGenre=genreEntries[0]?.[1]||1;
  const topGenres=genreEntries.map(([gid,v])=>{
    const pct=Math.round(v/maxGenre*100);
    return (GENRES_TMDB[gid]||gid)+(pct>=80?" (Liebling)":pct>=50?" (mag ich)":"");
  }).join(", ");

  // Negative Genres aus schlechten Bewertungen
  const negGenres={};
  watched.forEach(w=>{
    const r=ratings[titleKey(w.title)]||0;
    if(r<=2&&r>0)(w.genre_ids||[]).forEach(g=>{negGenres[g]=(negGenres[g]||0)+1;});
  });
  const dislikedGenres=Object.entries(negGenres).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>GENRES_TMDB[g]||"").filter(Boolean).join(", ");

  // Persönlichkeits-Zusammenfassung — dynamisch aus allen Daten
  const topGenreNames=genreEntries.slice(0,3).map(([gid])=>GENRES_TMDB[gid]||"").filter(Boolean);
  const totalRatings=Object.values(ratings).filter(v=>v>0).length;
  const avgRating=totalRatings>0?Math.round(Object.values(ratings).filter(v=>v>0).reduce((a,b)=>a+b,0)/totalRatings*10)/10:0;

  let taste="";
  if(topGenreNames.length>0)taste+=topGenreNames.join("/")+"-Fan";
  if(rated5)taste+=". 🟢 Top: "+rated5;
  if(rated4)taste+=". 🟠 Ok: "+rated4;
  if(rated2)taste+=". 🔴 Nicht mein Ding: "+rated2;
  if(dislikedGenres)taste+=". Meidet Genres: "+dislikedGenres;
  if(avgRating>0)taste+=". Durchschnittlich bewertet: "+avgRating+"★ ("+totalRatings+" Titel)";
  if(avgRating>=4)taste+=" — sehr wählerisch";
  else if(avgRating>=3)taste+=" — selektiv";

  // Muster erkennen
  const patterns=[];
  if(rated5&&(rated5.toLowerCase().includes("breaking")||rated5.toLowerCase().includes("wire")||rated5.toLowerCase().includes("sopranos")))
    patterns.push("bevorzugt komplexe Charakterstudien");
  if(dislikedGenres.includes("Romantik")||dislikedGenres.includes("Komödie"))
    patterns.push("meidet leichte Unterhaltung");
  if(topGenreNames.includes("Thriller")||topGenreNames.includes("Krimi"))
    patterns.push("liebt Spannung und Mysterium");
  if(patterns.length>0)taste+=". Muster: "+patterns.join(", ");

  return{platforms,top,low,blocked,watched:watchedTitles,topGenres,watchlist,taste,rated5,rated4,rated2,rated1,dislikedGenres,totalRatings,avgRating};
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



// ── Prüfe ob Titel auf Plattform verfügbar (DE) ──
async function isAvailableOnPlatform(mediaType, tmdbId, providerIds){
  try{
    const mt=mediaType==="tv"?"tv":"movie";
    const data=await tmdbFetch("/"+mt+"/"+tmdbId+"/watch/providers",{});
    const flatrate=(data?.results?.DE?.flatrate||[]);
    return flatrate.some(p=>providerIds.includes(p.provider_id));
  }catch(e){return true;} // Im Zweifel akzeptieren
}

// ── Filtere Titel auf Plattform-Verfügbarkeit ──
async function filterByPlatform(items, platform, mediaType){
  const providerIds=platform.tmdbIds||[];
  if(!providerIds.length)return items;
  const results=await Promise.all(
    items.map(async it=>{
      const mt=it.media_type||mediaType||"movie";
      const available=await isAvailableOnPlatform(mt,it.id,providerIds);
      return available?it:null;
    })
  );
  return results.filter(Boolean);
}

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

  // Watchlist-Titel als starkes Signal — Genre-Boost ×3
  (profile.liked_items||[]).forEach(it=>{
    (it.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)+3;});
  });
  
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

  // Top bewertete Titel für /similar
  const topRatedItems=watched
    .filter(w=>(ratings[titleKey(w.title)]||0)>=4)
    .slice(0,3);

  // Lade mehrere Quellen parallel inkl. /similar
  const sources=await Promise.all([
    getTrending("tv"),
    getTrending("movie"),
    discoverTitles("serie",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("film",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("serie",allIds,genreStr,2,"popularity.desc",langFilter),
    discoverTitles("film",allIds,genreStr,2,"popularity.desc",langFilter),
    // /similar für Top bewertete Titel — persönlichere Treffer
    ...topRatedItems.map(w=>getSimilarTitles(w.media_type||"movie",w.id,allIds,profile)),
  ]).catch(()=>[]);
  
  // Alle Ergebnisse zusammenführen inkl. /similar
  const similarResults=sources.slice(6).flat().filter(Boolean).map(r=>({...r,_source:"similar",_score_boost:5}));
  const all=[
    ...((sources[0]?.results||[]).map(r=>({...r,media_type:"tv",_source:"trending"}))),
    ...((sources[1]?.results||[]).map(r=>({...r,media_type:"movie",_source:"trending"}))),
    ...((sources[2]?.results||[]).map(r=>({...r,media_type:"tv",_source:"top_rated"}))),
    ...((sources[3]?.results||[]).map(r=>({...r,media_type:"movie",_source:"top_rated"}))),
    ...((sources[4]?.results||[]).map(r=>({...r,media_type:"tv",_source:"popular"}))),
    ...((sources[5]?.results||[]).map(r=>({...r,media_type:"movie",_source:"popular"}))),
    ...similarResults, // /similar Ergebnisse — erhalten Bonus-Scoring
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

    // 7. Similar-Bonus — direkt verwandt mit gemochten Titeln
    if(it._source==="similar")score+=(it._score_boost||5);
    
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

NUR auf diesen Plattformen verfügbar (PFLICHT): ${ctx.platforms}
Geschmack: ${ctx.taste||""}
5★ Favoriten: ${ctx.rated5||""}
Watchlist: ${ctx.watchlist||""}

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
    const isTV=rec.type==="Serie"||rec.type==="tv"||rec.type==="serie";
    const isMovie=rec.type==="Film"||rec.type==="movie"||rec.type==="film";
    // Multi-search gibt bestes Ergebnis zurück
    const multiRes=await fetch(
      TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+
      "&language=en-US&query="+encodeURIComponent(rec.title)
    ).then(r=>r.json());
    const allResults=(multiRes.results||[]).filter(r=>r.media_type==="tv"||r.media_type==="movie");
    // Typ-Filter wenn bekannt
    const typeFiltered=isTV?allResults.filter(r=>r.media_type==="tv"):
                       isMovie?allResults.filter(r=>r.media_type==="movie"):
                       allResults;
    const pool=typeFiltered.length>0?typeFiltered:allResults;
    // Exakter Treffer zuerst
    const exact=pool.find(r=>(r.title||r.name||"").toLowerCase().trim()===rec.title.toLowerCase().trim());
    const found=exact||pool[0];
    if(!found)return null;
    return{...found,_aiReason:rec.reason,_platform:rec.platform};
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
      if(watched.has(r.id))return false; // Gesehene NIEMALS
      if(liked.has(r.id))return false;
      const t=titleKey(r.title||r.name||"");
      if(blocked.has(t))return false; // Ausgeblendete NIEMALS
      const myRating=ratings[t]||0;
      if(myRating===1)return false; // Rot = niemals empfehlen
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
// LED Bewertung: Rot=nicht mein Ding, Orange=ok, Grün=top
// Intern: Rot=1, Orange=3, Grün=5
function StarRating({itemTitle,profile,onRate,size}){
  const key=titleKey(itemTitle);
  const current=(profile.ratings||{})[key]||0;
  const [hover,setHover]=useState(0);
  const sz=size||20;
  const leds=[
    {value:1,color:"#ef4444",glow:"rgba(239,68,68,0.6)",label:"Nicht mein Ding"},
    {value:3,color:"#f97316",glow:"rgba(249,115,22,0.6)",label:"Ok"},
    {value:5,color:"#4ade80",glow:"rgba(74,222,128,0.6)",label:"Top"},
  ];
  // Ermittle aktiven LED
  function activeLed(val){
    if(val>=5)return 5;
    if(val>=3)return 3;
    if(val>=1)return 1;
    return 0;
  }
  const activeVal=activeLed(hover||current);
  return(
    <div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {leds.map(led=>{
        const isActive=activeVal===led.value;
        const isPast=activeVal>0&&led.value<=activeVal&&led.value!==1||activeVal===led.value;
        const lit=hover>0?activeLed(hover)===led.value:activeLed(current)===led.value;
        return(
          <button key={led.value}
            onClick={e=>{e.stopPropagation();e.preventDefault();onRate(itemTitle,current===led.value?0:led.value);}}
            onMouseEnter={()=>setHover(led.value)}
            onMouseLeave={()=>setHover(0)}
            title={led.label}
            style={{background:"transparent",border:"none",cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minWidth:36,minHeight:36}}>
            <div style={{
              width:sz*0.6,height:sz*0.6,
              borderRadius:"50%",
              background:lit?led.color:"#1e1e30",
              border:"1.5px solid "+(lit?led.color:"#3a3344"),
              boxShadow:lit?"0 0 "+(sz*0.4)+"px "+(sz*0.2)+"px "+led.glow:"none",
              transition:"all 0.15s ease",
              transform:lit?"scale(1.2)":"scale(1)",
            }}/>
          </button>
        );
      })}
      </div>
      <div style={{display:"flex",gap:8,marginTop:3}}>
        {leds.map(led=>(
          <span key={led.value} style={{fontSize:9,color:activeLed(current)===led.value?led.color:"#3a3344",fontFamily:"'DM Sans'",letterSpacing:"0.2px",transition:"color 0.15s"}}>
            {led.label}
          </span>
        ))}
      </div>
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
    {id:"liked",   label:"Watchlist", icon:"❤️"},
    {id:"history", label:"📋 Verlauf",   icon:"📋"},
  ];

  const HELP={
    home:{
      title:"✨ Für dich",
      intro:"Deine persönliche Startseite — personalisiert nach deinem Geschmack. Je mehr du bewertest, desto besser die Empfehlungen.",
      items:[
        {icon:"🔴🟠🟢",title:"LED-Dots: So bewertest du",text:"Tippe auf einen Titel → Detail-Ansicht → drei Punkte tippen. 🔴 Rot = Nie wieder empfehlen · 🟠 Orange = Ok, aber kein Favorit · 🟢 Grün = Mehr davon! Der Algorithmus reagiert sofort auf jede Bewertung."},
        {icon:"🎭",title:"Stimmung wählen",text:"Die farbigen Pills oben wechseln das Genre sofort. Action, Drama, Sci-Fi, Horror... Nochmal tippen = zurück zu deinen persönlichen Picks."},
        {icon:"←",title:"Ausblenden per Wischen",text:"Einen Titel links wischen blendet ihn dauerhaft aus — er erscheint nie wieder in Empfehlungen. Siehst du es beim Wischen: roter 'Ausblenden'-Text."},
        {icon:"🔄",title:"Liste bleibt aktuell",text:"Titel die du als gesehen markierst oder schlecht bewertest verschwinden sofort aus der Liste. Beim nächsten Start kommen automatisch neue."},
        {icon:"👁",title:"Als gesehen markieren",text:"Öffne einen Titel → 'Als gesehen' tippen. Er wandert in den Verlauf und wird nie mehr empfohlen."},
        {icon:"🤍",title:"Merken",text:"Für Titel die du noch sehen möchtest. Landung in der Watchlist — jederzeit abrufbar."},
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
      title:"Watchlist",
      intro:"Deine persönliche Watchlist — alles was du noch sehen möchtest.",
      items:[
        {icon:"🤍",title:"Titel merken",text:"Bei jedem Titel den 'Merken' Button tippen — er landet sofort hier. Funktioniert aus allen Tabs: Startseite, Entdecken, Spaß, Suche."},
        {icon:"❤️",title:"Bereits gemerkt",text:"Rote Herzen zeigen gemerkte Titel an. Nochmal tippen = wieder entfernen. Die Liste bleibt gespeichert auch wenn du die App schließt."},
        {icon:"👁",title:"Als gesehen markieren",text:"Wenn du einen Titel aus der Watchlist geschaut hast, tippe 'Als gesehen' — er wandert in den Verlauf und wird aus der Watchlist entfernt."},
        {icon:"💡",title:"Watchlist vs. Empfehlungen",text:"Die Watchlist beeinflusst die Empfehlungen nicht direkt. Für bessere Empfehlungen: Sterne vergeben und 'Als gesehen' markieren."},
      ]
    },
    history:{
      title:"📋 Verlauf & Profil",
      intro:"Dein Streaming-Gedächtnis — alles was du bewertet und gesehen hast, plus dein Geschmacksprofil.",
      items:[
        {icon:"✅",title:"Gesehene Titel",text:"Alle Titel die du als gesehen markiert hast — mit deiner LED-Bewertung. Tippe ✕ um einen zu entfernen. Gesehene Titel tauchen nie mehr in Empfehlungen auf."},
        {icon:"🔴🟠🟢",title:"LED-Bewertung ändern",text:"Tippe auf einen gesehenen Titel um seine LED-Bewertung zu ändern. 🔴 Rot · 🟠 Orange · 🟢 Grün. Profil und Empfehlungen passen sich sofort an."},
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
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:8,position:"relative"}}>
      {/* LED Dots rechts oben */}
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:10,right:10,display:"flex",flexDirection:"column",gap:6,background:"rgba(0,0,0,0.5)",borderRadius:20,padding:"6px 5px",backdropFilter:"blur(4px)",zIndex:2}}>
        {[{v:5,c:"#4ade80",glow:"rgba(74,222,128,0.7)"},{v:3,c:"#f97316",glow:"rgba(249,115,22,0.7)"},{v:1,c:"#ef4444",glow:"rgba(239,68,68,0.7)"}].map(l=>{
          const lit=myRating===l.v;
          return<div key={l.v} onClick={()=>onRate(title,myRating===l.v?0:l.v,item.genre_ids||[])}
            style={{width:14,height:14,borderRadius:"50%",background:lit?l.c:"rgba(255,255,255,0.1)",border:"1.5px solid "+(lit?l.c:"rgba(255,255,255,0.15)"),cursor:"pointer",boxShadow:lit?"0 0 8px 3px "+l.glow:"none",transition:"all 0.15s"}}/>;
        })}
      </div>
      <div onClick={()=>onSelect(item)} style={{padding:14,display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",paddingRight:40}}>
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
      onMouseDown={e=>onStart(e.clientX)} onMouseMove={e=>onMove(e.clientX)} onMouseUp={onEnd} onMouseLeave={()=>{setOffsetX(0);setStartX(null);}}
      onTouchStart={e=>onStart(e.touches[0].clientX)} onTouchMove={e=>onMove(e.touches[0].clientX)} onTouchEnd={onEnd}
      onClick={()=>Math.abs(offsetX)<5&&onTap(item)}
      style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",cursor:"grab",transition:gone||startX?undefined:"transform 0.3s ease",transform,userSelect:"none",border:"2px solid "+(color||"#2a2340")}}>
      {(backdrop||poster)
        ?<img src={backdrop||poster} alt="" onLoad={e=>e.target.style.opacity=1} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none",opacity:0,transition:"opacity 0.3s ease"}}/>
        :<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>🎬</div>}
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

    // Genre-Diversität: Mix aus Top-Genres + zufälligen anderen Genres
    const allGenreKeys=Object.keys(GENRES_TMDB);
    const otherGenres=allGenreKeys.filter(g=>!pg.includes(g)).sort(()=>Math.random()-0.5).slice(0,3);
    const mixedStr=[...pg.slice(0,2),...otherGenres].join("|");
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    const rp1=Math.floor(Math.random()*6)+1;
    const rp2=Math.floor(Math.random()*6)+1;

    Promise.all([
      // Top-Genres des Nutzers
      genreStr?discoverTitles(browseType,platform.tmdbIds,genreStr,rp1,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      // Genre-Mix für Überraschung und Differenz
      discoverTitles(browseType,platform.tmdbIds,mixedStr,rp2,"popularity.desc",langFilter),
      // Aktuelle Tops ohne Genre-Filter
      discoverTitles(browseType,platform.tmdbIds,null,1,"popularity.desc",langFilter),
      discoverTitles(browseType,platform.tmdbIds,null,2,"vote_average.desc",langFilter),
    ]).then(([r1,r2,r3,r4])=>{
      const all=[...(r1.results||[]),...(r2.results||[]),...(r3.results||[]),...(r4.results||[])];
      const seen=new Set();
      const deduped=all.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
      const filtered=filterItems(deduped);
      // Fisher-Yates shuffle + random offset für Abwechslung
      for(let i=filtered.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
      }
      const skip=Math.floor(Math.random()*6);
      setItems(filtered.slice(skip,skip+20));
      setLoading(false);
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
  // Entferne Titel der mit Rot bewertet wurde
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const reserveRef=useRef([]);
  const recsRef=useRef(null); // Ref für Events ohne Closure-Problem
  const storageKey="sf_plat_"+platform.id; // Einheitlicher Key, kein Serie/Film Split

  // Lade gespeicherte Recs aus localStorage
  function loadStoredRecs(){
    try{
      // Neuer einheitlicher Key zuerst
      const stored=localStorage.getItem(storageKey);
      if(stored){
        const parsed=JSON.parse(stored);
        if(parsed&&parsed.length>0){
          setRecs(parsed);
          return true;
        }
      }
      // Alte _serie/_film Keys löschen damit kein alter State geladen wird
      localStorage.removeItem(storageKey+"_serie");
      localStorage.removeItem(storageKey+"_film");
    }catch(e){}
    return false;
  }

  // Halte recsRef immer aktuell
  useEffect(()=>{recsRef.current=recs;},[recs]);

  // Speichere Recs in localStorage
  function storeRecs(r){
    try{localStorage.setItem(storageKey,JSON.stringify(r));}catch(e){}
  }

  // Lade TMDB Top10 — gemischt Serien + Filme, plattformspezifisch
  async function loadTMDBRecs(){
    setLoading(true);
    try{
      const watched=new Set((profile.watched||[]).map(w=>w.id));
      const blocked=new Set(profile.blocked_titles||[]);
      const ratings=profile.ratings||{};
      const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
      const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
      const genreStr=topGenres.length>0?topGenres.join("|"):null;
      const platSeed=platform.id%5;
      const page1=(platSeed%4)+1;
      const page2=((platSeed+2)%4)+1;
      // Serien + Filme gemischt
      const [s1,s2,f1,f2]=await Promise.all([
        discoverTitles("serie",platform.tmdbIds,genreStr,page1,"vote_average.desc",langFilter),
        discoverTitles("serie",platform.tmdbIds,null,page2,"popularity.desc",langFilter),
        discoverTitles("film",platform.tmdbIds,genreStr,page1,"vote_average.desc",langFilter),
        discoverTitles("film",platform.tmdbIds,null,page2,"popularity.desc",langFilter),
      ]);
      const all=[
        ...(s1.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(s2.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(f1.results||[]).map(r=>({...r,media_type:"movie"})),
        ...(f2.results||[]).map(r=>({...r,media_type:"movie"})),
      ];
      const seen=new Set();
      const filtered=all.filter(r=>{
        if(seen.has(r.id))return false;
        seen.add(r.id);
        if(watched.has(r.id))return false;
        const t=titleKey(r.title||r.name||"");
        if(blocked.has(t))return false;
        const myRating=ratings[t]||0;
        if(myRating===1)return false; // Rot = niemals empfehlen
        return(r.vote_average||0)>=7.0; // Qualitätsschwelle 7.0
      }).sort((a,b)=>{
        let sa=(a.vote_average||0)*2;
        let sb=(b.vote_average||0)*2;
        (a.genre_ids||[]).forEach(g=>{sa+=(profile.genres?.[g]||0)*3;});
        (b.genre_ids||[]).forEach(g=>{sb+=(profile.genres?.[g]||0)*3;});
        return sb-sa;
      });

      const top5=filtered.slice(0,10);
      reserveRef.current=filtered.slice(10,25);

      if(top5.length>0){
        const formatted=top5.slice(0,10).map(it=>({
          id:it.id,
          title:it.title||it.name||"",
          year:(it.release_date||it.first_air_date||"").substring(0,4),
          reason:it.overview?it.overview.substring(0,140)+(it.overview.length>140?"…":""):"",
          emoji:it.media_type==="tv"?"📺":"🎬",
          _tmdbItem:it,
        }));
        setRecs(formatted);
        storeRecs(formatted);
      }else{setRecs([]);}
    }catch(e){setRecs([]);}
    setLoading(false);
  }

  // Ersetze Titel — nutze Reserve (plattformgefiltert) oder lade neu
  async function replaceRec(removedTitle){
    const key=titleKey(removedTitle);
    const blocked=new Set(profile.blocked_titles||[]);
    const watched=new Set((profile.watched||[]).map(w=>w.id));

    setRecs(prev=>{
      if(!prev)return prev;
      const filtered=prev.filter(r=>titleKey(r.title)!==key);
      const existIds=new Set(filtered.map(r=>r.id).filter(Boolean));
      const existTitles=new Set(filtered.map(r=>titleKey(r.title)));

      // Aus Reserve
      const reserve=reserveRef.current;
      const repl=reserve.find(r=>{
        const t=titleKey(r.title||r.name||"");
        return !existIds.has(r.id)&&!existTitles.has(t)&&t!==key&&!blocked.has(t)&&!watched.has(r.id);
      });

      if(repl){
        reserveRef.current=reserve.filter(r=>r.id!==repl.id);
        const next=[...filtered,{
          id:repl.id,
          title:repl.title||repl.name||"",
          year:(repl.release_date||repl.first_air_date||"").substring(0,4),
          reason:repl.overview?repl.overview.substring(0,140)+(repl.overview.length>140?"…":""):"",
          emoji:repl.media_type==="tv"?"📺":"🎬",
          _tmdbItem:repl,
          _isNew:true,
        }].slice(0,10);
        storeRecs(next);
        return next;
      }
      // Reserve leer → nur entfernen, im Hintergrund nachladen
      const next=filtered.slice(0,10);
      storeRecs(next);
      // Im Hintergrund neue Reserve holen
      const bl=new Set(profile.blocked_titles||[]);
      const wt=new Set((profile.watched||[]).map(w=>w.id));
      Promise.all([
        discoverTitles("serie",platform.tmdbIds,null,Math.floor(Math.random()*5)+1,"vote_average.desc",null),
        discoverTitles("film",platform.tmdbIds,null,Math.floor(Math.random()*5)+1,"vote_average.desc",null),
      ]).then(([s,f])=>{
          const candidates=[
            ...(s.results||[]).map(it=>({...it,media_type:"tv"})),
            ...(f.results||[]).map(it=>({...it,media_type:"movie"})),
          ].filter(it=>{
              const t=titleKey(it.title||it.name||"");
              return !existIds.has(it.id)&&!existTitles.has(t)&&!bl.has(t)&&!wt.has(it.id)&&(it.vote_average||0)>=6.5;
            });
          if(candidates.length>0){
            reserveRef.current=[...reserveRef.current,...candidates.slice(0,10)];
          }
        }).catch(()=>{});
      return next;
    });
  }


  // Öffnen: zuerst gespeicherte Recs, dann TMDB
  async function handleOpen(){
    const next=!open;
    setOpen(next);
    if(next&&!recs){
      const hasStored=loadStoredRecs();
      if(!hasStored)await loadTMDBRecs();
    }
  }

  // browseType wechsel → KI-Recs prüfen, sonst TMDB
  useEffect(()=>{
    if(open){
      setRecs(null);
      const hasStored=loadStoredRecs();
      if(!hasStored)loadTMDBRecs();
    }
  },[browseType]);

  // Events: watched/blocked entfernen + NUR diesen einen ersetzen
  useEffect(()=>{
    function onWatched(e){
      // Prüfe ob dieser Titel in unserer Liste ist
      const currentRecs=recsRef.current;
      if(!currentRecs)return;
      const has=currentRecs.find(r=>r._tmdbItem?.id===e.detail.id||titleKey(r.title)===titleKey(e.detail.title||""));
      if(has)replaceRec(has.title); // Nur ersetzen, kein Reload
    }
    function onBlocked(e){
      const currentRecs=recsRef.current;
      if(!currentRecs)return;
      const has=currentRecs.find(r=>titleKey(r.title)===titleKey(e.detail.title||""));
      if(has){
        replaceRec(has.title);
      }
    }
    function onRated(e){
      // Wenn Rot bewertet → aus Top10 entfernen
      if(e.detail?.stars===1){
        const currentRecs=recsRef.current;
        if(!currentRecs)return;
        const has=currentRecs.find(r=>titleKey(r.title)===titleKey(e.detail.title||""));
        if(has)replaceRec(has.title);
      }
    }
    // Nach Swipe: KI-Recs laden — nur wenn noch keine vorhanden
    function onSwipeDone(){
      setOpen(true);
      // Kurz warten bis localStorage geschrieben
      setTimeout(()=>{
        const hasStored=loadStoredRecs();
        if(!hasStored)loadTMDBRecs();
      },800);
    }
    window.addEventListener("sf_watched",onWatched);
    window.addEventListener("sf_blocked",onBlocked);
    window.addEventListener("sf_swipe_done",onSwipeDone);
    window.addEventListener("sf_rated",onRated);
    return()=>{
      window.removeEventListener("sf_watched",onWatched);
      window.removeEventListener("sf_blocked",onBlocked);
      window.removeEventListener("sf_swipe_done",onSwipeDone);
    };
  },[]);

  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:10}}>
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={handleOpen}>
        <div style={{width:44,height:44,borderRadius:12,background:platform.color+"22",border:"1px solid "+platform.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:platform.color,flexShrink:0}}>{platform.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>{platform.name}</div>
          <div style={{fontSize:11,color:"#b0a8b8"}}>Top 10 · Serien & Filme</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{color:"#3a3344",fontSize:12,transition:"transform 0.3s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 14px 16px"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:14}}/>
          {loading&&<div style={{textAlign:"center",padding:16}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:12,color:"#b0a8b8",marginTop:6}}>Lade…</p></div>}
          {!loading&&recs&&recs.length===0&&<div style={{textAlign:"center",padding:12}}><p style={{fontSize:12,color:"#b0a8b8"}}>Keine Titel gefunden.</p></div>}
          {!loading&&recs&&recs.length>0&&(
            <p style={{fontSize:10,color:"#55506a",margin:"0 0 10px",textAlign:"right",fontStyle:"italic"}}>← wischen zum Ausblenden</p>
          )}
          {!loading&&recs&&recs.map((rec,i)=>{
            const tmdb=rec._tmdbItem;
            const backdrop=tmdb?.backdrop_path?"https://image.tmdb.org/t/p/w500"+tmdb.backdrop_path:null;
            const poster=tmdb?.poster_path?TMDB_IMG+tmdb.poster_path:null;
            const score=tmdb?.vote_average?Math.round(tmdb.vote_average*10)/10:0;
            const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
            const genreScore=tmdb?(tmdb.genre_ids||[]).reduce((s,g)=>(s+(profile.genres?.[g]||0)),0):0;
            const matchPct=Math.min(100,Math.max(15,Math.round(((score*2+genreScore*3)/24)*100)));
            const matchColor=matchPct>=75?"#4ade80":matchPct>=50?"#c4a960":"#ff6b35";
            return(
              <div key={rec.id||rec.title+i} style={{animation:rec._isNew?"fadeIn 0.5s ease":"none",marginBottom:10}}>
                <SwipeToBlock onBlock={()=>{
                  onBlock(rec.title);
                  replaceRec(rec.title);
                }}>
                <div style={{borderRadius:16,overflow:"hidden",position:"relative",background:"#0d0d18",border:"1px solid #1e1e30"}}>
                  <div onClick={()=>onSelect(tmdb||{title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:"movie"})}
                    style={{cursor:"pointer",position:"relative",height:100}}>
                    {backdrop&&<img src={backdrop} alt="" onLoad={e=>e.target.style.opacity=1} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0,transition:"opacity 0.3s ease"}}/>}
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.2) 100%)"}}/>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",gap:12,padding:"0 14px"}}>
                      {/* Match Farbbalken statt Nummer */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:18,gap:2}}>
                        <div style={{width:4,height:44,borderRadius:2,background:"#1e1e30",overflow:"hidden",position:"relative"}}>
                          <div style={{position:"absolute",bottom:0,left:0,right:0,height:matchPct+"%",background:matchColor,borderRadius:2}}/>
                        </div>
                      </div>
                      {poster?<img src={poster} alt="" style={{width:44,height:66,borderRadius:8,objectFit:"cover",flexShrink:0,border:"1px solid rgba(255,255,255,0.08)"}}/>:
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
                  {/* LED Dots rechts */}
                  {(()=>{
                    const rKey=titleKey(rec.title);
                    const rVal=(profile.ratings||{})[rKey]||0;
                    const leds=[{v:1,c:"#ef4444",label:"✕"},{v:3,c:"#f97316",label:"○"},{v:5,c:"#4ade80",label:"✓"}];
                    return(
                      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:8,right:8,display:"flex",gap:6,background:"rgba(0,0,0,0.5)",borderRadius:20,padding:"5px 8px",backdropFilter:"blur(4px)"}}>
                        {leds.map(l=>(
                          <button key={l.v} onClick={e=>{e.stopPropagation();e.preventDefault();const newVal=rVal===l.v?0:l.v;onRate(rec.title,newVal,tmdb?.genre_ids||[]);if(newVal===1)replaceRec(rec.title);}}
                            style={{width:22,height:22,borderRadius:"50%",background:rVal===l.v?l.c:"rgba(255,255,255,0.1)",border:"1.5px solid "+(rVal===l.v?l.c:"rgba(255,255,255,0.2)"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:rVal===l.v?"#fff":"rgba(255,255,255,0.5)",fontWeight:700,boxShadow:rVal===l.v?"0 0 8px "+l.c:"none",transition:"all 0.15s"}}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                </SwipeToBlock>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Universal Swipe — alle Anbieter auf einmal ──
function UniversalSwipe({profile,cardProps,onSelect,onDone}){
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [processing,setProcessing]=useState(false);
  const localRatings=useRef({});

  useEffect(()=>{
    setLoading(true);
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    const allIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337,350];
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const blocked=new Set(profile.blocked_titles||[]);
    const ratings=profile.ratings||{};
    const liked=new Set(profile.liked||[]);
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
    const genreStr=topGenres.length>0?topGenres.join("|"):null;
    const rp=Math.floor(Math.random()*6)+1;
    const rp2=Math.floor(Math.random()*6)+2;

    function filterItems(results){
      return(results||[]).filter(r=>{
        if(watched.has(r.id)||liked.has(r.id))return false;
        const t=titleKey(r.title||r.name||"");
        if(blocked.has(t))return false;
        const myRating=ratings[t]||0;
        if(myRating>0&&myRating<=2)return false;
        return(r.vote_average||0)>=6.5;
      });
    }

    // Gemischt: Serien + Filme
    Promise.all([
      genreStr?discoverTitles("serie",allIds,genreStr,rp,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      discoverTitles("serie",allIds,null,rp2,"popularity.desc",langFilter),
      genreStr?discoverTitles("film",allIds,genreStr,rp,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      discoverTitles("film",allIds,null,rp2,"popularity.desc",langFilter),
    ]).then(([s1,s2,f1,f2])=>{
      const all=[
        ...(s1.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(s2.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(f1.results||[]).map(r=>({...r,media_type:"movie"})),
        ...(f2.results||[]).map(r=>({...r,media_type:"movie"})),
      ];
      const seen=new Set();
      const deduped=all.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
      const filtered=filterItems(deduped);
      for(let i=filtered.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
      }
      const skip=Math.floor(Math.random()*6);
      setItems(filtered.slice(skip,skip+25));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  function handleRight(item){
    const t=item.title||item.name||"";
    localRatings.current[titleKey(t)]={stars:4,genre_ids:item.genre_ids||[]};
    cardProps.onRate(t,4,item.genre_ids||[]);
    setIdx(i=>i+1);
  }
  function handleLeft(item){
    const t=item.title||item.name||"";
    localRatings.current[titleKey(t)]={stars:1,genre_ids:item.genre_ids||[]};
    cardProps.onBlock(t);
    setIdx(i=>i+1);
  }
  function handleSkip(){setIdx(i=>i+1);}

  async function handleDone(){
    setProcessing(true);
    const liked_sw=Object.entries(localRatings.current).filter(([,v])=>v.stars>=4).map(([k])=>k);
    const disliked_sw=Object.entries(localRatings.current).filter(([,v])=>v.stars<=2).map(([k])=>k);
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    const ctx=buildCtx(profile);
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const blocked=new Set(profile.blocked_titles||[]);

    // Genre-Boosts aus Swipes berechnen
    const mergedGenres={...profile.genres};
    Object.entries(localRatings.current).forEach(([,{stars,genre_ids}])=>{
      const boost=stars>=4?3:stars<=2?-3:0;
      (genre_ids||[]).forEach(g=>{mergedGenres[g]=(mergedGenres[g]||0)+boost;});
    });
    const topGenreIds=Object.entries(mergedGenres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([g])=>g);
    const genreStr=topGenreIds.length>0?topGenreIds.join("|"):null;

    // Globales Set für alle bereits vergebenen Titel — keine Duplikate zwischen Anbietern
    const globalUsedIds=new Set();

    try{
      // 1. Pro Plattform TMDB-Kandidaten laden — verschiedene Seiten pro Anbieter
      const platCandidates=await Promise.all(userPlats.map(async(plat,pi)=>{
        const page1=(pi%5)+1;
        const page2=((pi*2+3)%6)+1;
        // Serien + Filme gemischt
        const [s1,s2,f1,f2]=await Promise.all([
          discoverTitles("serie",plat.tmdbIds,genreStr,page1,"vote_average.desc",langFilter),
          discoverTitles("serie",plat.tmdbIds,null,page2,"popularity.desc",langFilter),
          discoverTitles("film",plat.tmdbIds,genreStr,page1,"vote_average.desc",langFilter),
          discoverTitles("film",plat.tmdbIds,null,page2,"popularity.desc",langFilter),
        ]);
        const all=[
          ...(s1.results||[]).map(r=>({...r,media_type:"tv"})),
          ...(s2.results||[]).map(r=>({...r,media_type:"tv"})),
          ...(f1.results||[]).map(r=>({...r,media_type:"movie"})),
          ...(f2.results||[]).map(r=>({...r,media_type:"movie"})),
        ];
        const seen=new Set();
        const candidates=all.filter(r=>{
          if(seen.has(r.id))return false;
          seen.add(r.id);
          if(watched.has(r.id)||blocked.has(titleKey(r.title||r.name||"")))return false;
          const myRating=(profile.ratings||{})[titleKey(r.title||r.name||"")]||0;
          if(myRating===1)return false;
          return(r.vote_average||0)>=6.5;
        }).sort((a,b)=>{
          let sa=(a.vote_average||0)*2,sb=(b.vote_average||0)*2;
          (a.genre_ids||[]).forEach(g=>{sa+=(mergedGenres[g]||0)*3;});
          (b.genre_ids||[]).forEach(g=>{sb+=(mergedGenres[g]||0)*3;});
          return sb-sa;
        });
        return{plat,candidates};
      }));

      // 2. Pro Plattform: erst globale Duplikate entfernen, dann KI wählt Top 10
      await Promise.all(platCandidates.map(async({plat,candidates})=>{
        // Nur Titel die noch nicht bei einem anderen Anbieter vergeben
        const unique=candidates.filter(c=>!globalUsedIds.has(c.id)).slice(0,20);
        if(!unique.length)return;

        const titles=unique.slice(0,15).map(it=>(it.title||it.name||"")+" ("+(it.media_type==="tv"?"Serie":"Film")+")").join(", ");
        const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"..."}]`;
        const msg=`Wähle die 10 besten Titel für diesen Nutzer aus dieser Liste:

KANDIDATEN (alle auf ${plat.name} DE verfügbar): ${titles}

NUTZERPROFIL:
${ctx.taste||"Noch wenig Daten"}
🟢 Top: ${ctx.rated5||"keine"}
🔴 Nicht mein Ding: ${ctx.rated2||ctx.rated1||"keine"}
❤️ Swipe gemocht: ${liked_sw.join(", ")||"nichts"}
✕ Swipe abgelehnt: ${disliked_sw.join(", ")||"nichts"}
Genres: ${ctx.topGenres||"gemischt"}
GESEHEN (nicht wählen!): ${ctx.watched||"nichts"}

Wähle NUR aus den Kandidaten — nichts erfinden!
Gute Mischung aus Serien und Filmen.
reason = witziger persönlicher Satz Deutsch 15-20 Wörter`;

        try{
          const text=await callAI([{role:"user",content:msg}],system);
          const picks=JSON.parse(text.replace(/```json|```/g,"").trim());
          const result=picks.map(p=>{
            const match=unique.find(c=>titleKey(c.title||c.name||"")===titleKey(p.title||""));
            if(!match)return null;
            return{id:match.id,title:match.title||match.name||"",year:(match.release_date||match.first_air_date||"").substring(0,4),reason:p.reason||"",emoji:match.media_type==="tv"?"📺":"🎬",_tmdbItem:match};
          }).filter(Boolean).slice(0,10);
          // Auffüllen auf 10 wenn nötig
          if(result.length<10){
            const existIds=new Set(result.map(r=>r.id));
            const fill=unique.filter(c=>!existIds.has(c.id)).slice(0,10-result.length).map(c=>({
              id:c.id,title:c.title||c.name||"",year:(c.release_date||c.first_air_date||"").substring(0,4),
              reason:c.overview?c.overview.substring(0,160)+(c.overview.length>160?"…":""):"",
              emoji:c.media_type==="tv"?"📺":"🎬",_tmdbItem:c,
            }));
            result.push(...fill);
          }
          // Merke diese IDs als vergeben
          result.forEach(r=>globalUsedIds.add(r.id));
          if(result.length>0)localStorage.setItem("sf_plat_"+plat.id,JSON.stringify(result));
        }catch(e){
          const fallback=unique.slice(0,10).map(c=>({
            id:c.id,title:c.title||c.name||"",year:(c.release_date||c.first_air_date||"").substring(0,4),
            reason:c.overview?c.overview.substring(0,160)+(c.overview.length>160?"…":""):"",
            emoji:c.media_type==="tv"?"📺":"🎬",_tmdbItem:c,
          }));
          fallback.forEach(r=>globalUsedIds.add(r.id));
          if(fallback.length>0)localStorage.setItem("sf_plat_"+plat.id,JSON.stringify(fallback));
        }
      }));
    }catch(e){
      await Promise.all(userPlats.map(async(plat,pi)=>{
        try{
          const [s,f]=await Promise.all([
            discoverTitles("serie",plat.tmdbIds,genreStr,(pi%4)+1,"vote_average.desc",langFilter),
            discoverTitles("film",plat.tmdbIds,genreStr,(pi%4)+1,"vote_average.desc",langFilter),
          ]);
          const all=[...(s.results||[]).map(r=>({...r,media_type:"tv"})),...(f.results||[]).map(r=>({...r,media_type:"movie"}))];
          const items=all.filter(it=>!watched.has(it.id)&&!globalUsedIds.has(it.id)&&(it.vote_average||0)>=7).slice(0,10).map(it=>({
            id:it.id,title:it.title||it.name||"",year:(it.release_date||it.first_air_date||"").substring(0,4),
            reason:it.overview?it.overview.substring(0,160)+"…":"",emoji:it.media_type==="tv"?"📺":"🎬",_tmdbItem:it,
          }));
          items.forEach(r=>globalUsedIds.add(r.id));
          if(items.length>0)localStorage.setItem("sf_plat_"+plat.id,JSON.stringify(items));
        }catch(e2){}
      }));
    }

    setTimeout(()=>{
      window.dispatchEvent(new CustomEvent("sf_swipe_done",{detail:{liked:liked_sw,disliked:disliked_sw}}));
      onDone();
    },400);
  }


  if(loading)return<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:14,color:"#b0a8b8",marginTop:12}}>Lade Titel von allen Anbietern…</p></div>;

  if(done||idx>=items.length)return(
    <div style={{textAlign:"center",padding:40}}>
      {processing?(
        <><div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block",marginBottom:12}}>✨</div><p style={{fontSize:14,color:"#b0a8b8"}}>Empfehlungen werden angepasst…</p></>
      ):(
        <>
          <div style={{fontSize:40,marginBottom:12}}>🎉</div>
          <p style={{fontSize:16,fontWeight:700,color:"#f0ece4",marginBottom:6}}>Alles geswiped!</p>
          <p style={{fontSize:12,color:"#b0a8b8",marginBottom:20}}>
            {Object.entries(localRatings.current).filter(([,v])=>v.stars>=4).length} gemocht · {Object.entries(localRatings.current).filter(([,v])=>v.stars<=2).length} abgelehnt
          </p>
          <button onClick={()=>{setDone(true);handleDone();}} style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:"12px 24px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14}}>
            Empfehlungen anpassen ✓
          </button>
        </>
      )}
    </div>
  );

  const current=items[idx];
  if(!current)return null;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingTop:8}}>
        <div style={{flex:1,height:3,background:"#1e1e30",borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${(idx/items.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#ff6b35,#e84393)",transition:"width 0.3s",borderRadius:2}}/>
        </div>
        <span style={{fontSize:11,color:"#b0a8b8",fontFamily:"'DM Sans'",flexShrink:0}}>{idx}/{items.length}</span>
      </div>
      <div style={{position:"relative",height:460}}>
        <SwipeCard key={`${current.id}-${idx}`} item={current} color="#e84393" onSwipeRight={handleRight} onSwipeLeft={handleLeft} onTap={onSelect}/>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginTop:20}}>
        <button onClick={()=>handleLeft(current)} style={{width:58,height:58,borderRadius:29,background:"#12121f",border:"1px solid rgba(239,68,68,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <button onClick={handleSkip} style={{width:46,height:46,borderRadius:23,background:"#12121f",border:"1px solid #1e1e30",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>
        <button onClick={()=>handleRight(current)} style={{width:58,height:58,borderRadius:29,background:"#12121f",border:"1px solid rgba(74,222,128,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>❤️</button>
      </div>
      <p style={{textAlign:"center",fontSize:10,color:"#3a3344",marginTop:10,fontFamily:"'DM Sans'"}}>← Nicht mein Ding · Tippen = Details · ❤️ Interessiert mich →</p>
    </div>
  );
}

// ── BrowseTab ──


// ── Fun Feature — Wrapper für Spaß-Funktionen ──
function FunFeature({mode,profile,onSelect}){
  const [surpriseResult,setSurpriseResult]=useState(null);
  const [surpriseLoading,setSurpriseLoading]=useState(false);
  const [surpriseError,setSurpriseError]=useState("");
  const [oracleResult,setOracleResult]=useState(null);
  const [oracleLoading,setOracleLoading]=useState(false);
  const [oracleError,setOracleError]=useState("");
  const [personalityResult,setPersonalityResult]=useState(null);
  const [personalityLoading,setPersonalityLoading]=useState(false);

  async function doSurprise(){
    setSurpriseLoading(true);setSurpriseResult(null);setSurpriseError("");
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","year":"...","type":"Serie/Film","reason":"...","emoji":"..."}`;
      const msg=`Überrasche diesen Nutzer mit EINEM perfekten Titel.
Geschmack: ${ctx.taste||"gemischt"}
Liebt: ${ctx.rated5||"noch nichts"}
Mag nicht: ${ctx.low||"nichts"}
Bereits gesehen: ${ctx.watched||"nichts"}
Watchlist: ${ctx.watchlist||"leer"}
Plattformen: ${ctx.platforms}
Wähle einen Titel der ihn wirklich überrascht aber trotzdem trifft.`;
      const text=await callAI([{role:"user",content:msg}],system);
      setSurpriseResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){setSurpriseError(e.message?.includes("429")||e.message?.includes("limit")?"RATE_LIMIT":"error");}
    setSurpriseLoading(false);
  }

  async function doOracle(){
    setOracleLoading(true);setOracleResult(null);setOracleError("");
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein mystisches Orakel für Streaming. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","prophecy":"...","emoji":"..."}`;
      const msg=`Das Orakel spricht. Welcher Titel erwartet diesen Nutzer heute Abend?
Geschmack: ${ctx.taste||"unbekannt"}
Liebt: ${ctx.rated5||"noch nichts bewertet"}
Plattformen: ${ctx.platforms}
Schreibe eine mystische Prophezeiung (2 Sätze, dramatisch aber witzig).`;
      const text=await callAI([{role:"user",content:msg}],system);
      setOracleResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){setOracleError(e.message?.includes("429")||e.message?.includes("limit")?"RATE_LIMIT":"error");}
    setOracleLoading(false);
  }

  async function doPersonality(){
    setPersonalityLoading(true);setPersonalityResult(null);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Persönlichkeitsanalyst für Streaming-Gewohnheiten. Antworte NUR mit JSON, kein Markdown. Format: {"type":"...","emoji":"...","description":"...","titles":["...","...","..."]}`;
      const msg=`Analysiere den Streaming-Persönlichkeitstyp dieses Nutzers.
Geschmack: ${ctx.taste||"noch aufbauend"}
Liebt: ${ctx.rated5||"noch nichts"}
Genres: ${ctx.topGenres||"gemischt"}
Gib ihm einen kreativen Persönlichkeitstyp-Namen (z.B. "Der Noir-Detektiv", "Die Seelen-Forscherin") + lustige Beschreibung + 3 typische Titel.`;
      const text=await callAI([{role:"user",content:msg}],system);
      setPersonalityResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){}
    setPersonalityLoading(false);
  }

  if(mode==="surprise")return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)"}}>
      {!surpriseResult&&!surpriseLoading&&<button onClick={doSurprise} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>✨ Überrasch mich!</button>}
      {surpriseLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Suche den perfekten Titel…</p></div>}
      {surpriseError==="RATE_LIMIT"&&<p style={{color:"#b0a8b8",fontSize:13,textAlign:"center",padding:12}}>🌙 Heute ausgebucht — morgen wieder verfügbar.</p>}
      {surpriseResult&&(
        <div>
          <div style={{fontSize:32,textAlign:"center",marginBottom:8}}>{surpriseResult.emoji||"🎬"}</div>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,textAlign:"center",margin:"0 0 4px"}}>{surpriseResult.title}</h3>
          <p style={{fontSize:12,color:"#b0a8b8",textAlign:"center",marginBottom:12}}>{surpriseResult.type} · {surpriseResult.year}</p>
          <p style={{fontSize:13,color:"#c4b8c8",lineHeight:1.6,fontStyle:"italic",textAlign:"center",marginBottom:16}}>"{surpriseResult.reason}"</p>
          <button onClick={doSurprise} style={{width:"100%",background:"transparent",border:"1px solid #2a2340",borderRadius:10,padding:"10px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Nochmal würfeln</button>
        </div>
      )}
    </div>
  );

  if(mode==="oracle")return(
    <div style={{background:"linear-gradient(135deg,rgba(196,169,96,0.06),rgba(232,67,147,0.04))",borderRadius:16,padding:20,border:"1px solid rgba(196,169,96,0.2)"}}>
      {!oracleResult&&!oracleLoading&&<button onClick={doOracle} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#e84393)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🔮 Orakel befragen</button>}
      {oracleLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔮</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Das Orakel meditiert…</p></div>}
      {oracleError==="RATE_LIMIT"&&<p style={{color:"#b0a8b8",fontSize:13,textAlign:"center",padding:12}}>🌙 Das Orakel ruht heute.</p>}
      {oracleResult&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>{oracleResult.emoji||"🔮"}</div>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 12px"}}>{oracleResult.title}</h3>
          <p style={{fontSize:13,color:"#c4a960",lineHeight:1.6,fontStyle:"italic",marginBottom:16}}>"{oracleResult.prophecy}"</p>
          <button onClick={doOracle} style={{background:"transparent",border:"1px solid rgba(196,169,96,0.3)",borderRadius:10,padding:"10px 20px",color:"#c4a960",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Nochmal befragen</button>
        </div>
      )}
    </div>
  );

  if(mode==="personality")return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)"}}>
      {!personalityResult&&!personalityLoading&&<button onClick={doPersonality} style={{width:"100%",background:"linear-gradient(135deg,#e84393,#c4a960)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🎭 Meinen Typ entdecken</button>}
      {personalityLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🎭</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Analysiere deinen Geschmack…</p></div>}
      {personalityResult&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>{personalityResult.emoji||"🎭"}</div>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 8px"}}>{personalityResult.type}</h3>
          <p style={{fontSize:13,color:"#c4b8c8",lineHeight:1.6,marginBottom:12}}>{personalityResult.description}</p>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {(personalityResult.titles||[]).map((t,i)=>(
              <span key={i} style={{background:"rgba(196,169,96,0.1)",border:"1px solid rgba(196,169,96,0.2)",borderRadius:20,padding:"4px 12px",fontSize:11,color:"#c4a960"}}>{t}</span>
            ))}
          </div>
          <button onClick={doPersonality} style={{marginTop:14,background:"transparent",border:"1px solid #2a2340",borderRadius:10,padding:"10px 20px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Neu analysieren</button>
        </div>
      )}
    </div>
  );

  return null;
}

// ── BrowseFeature — Deep Dive, Vibe, StreamBot ──
function BrowseFeature({mode,profile,cardProps,onSelect}){
  const [ddInput,setDDInput]=useState("");
  const [ddResults,setDDResults]=useState([]);
  const [ddLoading,setDDLoading]=useState(false);
  const [ddSearchRes,setDDSearchRes]=useState([]);
  const [ddSearching,setDDSearching]=useState(false);
  const [trash,setTrash]=useState(50);
  const [heavy,setHeavy]=useState(50);
  const [dark,setDark]=useState(50);
  const [vibeResults,setVibeResults]=useState([]);
  const [vibeLoading,setVibeLoading]=useState(false);
  const [botInput,setBotInput]=useState("");
  const [botLog,setBotLog]=useState([]);
  const [botLoading,setBotLoading]=useState(false);
  const ddRef=useRef(null);

  async function handleDDSearch(q){
    if(!q.trim())return;
    setDDSearching(true);
    const res=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=de-DE&query="+encodeURIComponent(q)).then(r=>r.json());
    setDDSearchRes((res.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,5));
    setDDSearching(false);
  }

  async function handleDDSelect(item){
    setDDSearchRes([]);setDDInput(item.title||item.name||"");setDDLoading(true);setDDResults([]);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]`;
      const msg=`Erstelle 8 personalisierte Empfehlungen basierend auf "${item.title||item.name}".
Nutzerprofil: ${ctx.taste||"gemischt"}
Liebt: ${ctx.rated5||"nichts"}
Mag nicht: ${ctx.low||"nichts"}
Mix aus direkten Ähnlichkeiten, gleicher Atmosphäre und überraschenden Entdeckungen.
reason = 1 Satz Deutsch warum dieser Titel.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB(r,profile)));
      setDDResults(enriched.filter(Boolean));
    }catch(e){}
    setDDLoading(false);
  }

  async function handleVibe(){
    setVibeLoading(true);setVibeResults([]);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]`;
      const msg=`Empfehle 6 Titel für diese Stimmung:
Action/Spannung: ${vibeLabel(heavy)}
Komödie/Leichtigkeit: ${vibeLabel(100-trash)}
Dunkel/Ernst: ${vibeLabel(dark)}
Nutzerprofil: ${ctx.taste||"gemischt"}
Plattformen: ${ctx.platforms}
reason = 1 Satz Deutsch.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB(r,profile)));
      setVibeResults(enriched.filter(Boolean));
    }catch(e){}
    setVibeLoading(false);
  }

  async function handleBot(e){
    if(e)e.preventDefault();
    if(!botInput.trim())return;
    const q=botInput.trim();
    setBotInput("");
    setBotMessages(prev=>[...prev,{role:"user",text:q}]);
    setBotLoading(true);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist StreamBot, ein freundlicher Streaming-Assistent. Antworte auf Deutsch, kurz und hilfreich. Nutze das Nutzerprofil für persönliche Empfehlungen.
Profil: ${ctx.taste||"noch aufbauend"}
Liebt: ${ctx.rated5||"nichts"}
Plattformen: ${ctx.platforms}`;
      const text=await callAI([{role:"user",content:q}],system);
      setBotMessages(prev=>[...prev,{role:"bot",text}]);
    }catch(e){setBotMessages(prev=>[...prev,{role:"bot",text:"Die KI macht heute Feierabend 🌙"}]);}
    setBotLoading(false);
  }

  if(mode==="deepdive")return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input ref={ddRef} value={ddInput} onChange={e=>{setDDInput(e.target.value);if(e.target.value.length>2)handleDDSearch(e.target.value);}}
          placeholder="Lieblingstitel eingeben…"
          style={{flex:1,padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none"}}/>
      </div>
      {ddSearchRes.length>0&&(
        <div style={{background:"#12121f",borderRadius:12,border:"1px solid #1e1e30",marginBottom:12,overflow:"hidden"}}>
          {ddSearchRes.map(r=>(
            <button key={r.id} onClick={()=>handleDDSelect(r)}
              style={{width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:"1px solid #1e1e30",color:"#f0ece4",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans'",fontSize:13,display:"flex",gap:8,alignItems:"center"}}>
              {r.poster_path&&<img src={TMDB_IMG+r.poster_path} alt="" style={{width:28,height:42,borderRadius:4,objectFit:"cover"}}/>}
              <span>{r.title||r.name}</span>
              <span style={{color:"#555",fontSize:11}}>{r.media_type==="tv"?"Serie":"Film"}</span>
            </button>
          ))}
        </div>
      )}
      {ddLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:24,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔭</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Baue dein Universum…</p></div>}
      {ddResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ddResults.map((it,i)=><TitleCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)}
        </div>
      )}
    </div>
  );

  if(mode==="vibe")return(
    <div>
      {[{label:"Action & Spannung",val:heavy,set:setHeavy},{label:"Leichtigkeit",val:100-trash,set:v=>setTrash(100-v)},{label:"Dunkel & Ernst",val:dark,set:setDark}].map(s=>(
        <div key={s.label} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:12,color:"#b0a8b8"}}>{s.label}</span>
            <span style={{fontSize:12,color:"#c4a960",fontWeight:700}}>{vibeLabel(s.val)}</span>
          </div>
          <input type="range" min="0" max="100" value={s.val} onChange={e=>s.set(Number(e.target.value))}
            style={{width:"100%",accentColor:"#c4a960"}}/>
        </div>
      ))}
      <button onClick={handleVibe} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"13px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,marginBottom:12}}>
        {vibeLoading?"Suche…":"Passende Titel finden"}
      </button>
      {vibeResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {vibeResults.map((it,i)=><TitleCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)}
        </div>
      )}
    </div>
  );

  if(mode==="bot")return(
    <div>
      <div style={{minHeight:100,maxHeight:300,overflow:"auto",marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
        {botMessages.length===0&&<p style={{fontSize:13,color:"#555",fontStyle:"italic",textAlign:"center",padding:20}}>Stell mir eine Frage zu Serien und Filmen…</p>}
        {botMessages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",background:m.role==="user"?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1a2e",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#f0ece4",lineHeight:1.5}}>{m.text}</div>
          </div>
        ))}
        {botLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:"#1a1a2e",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#b0a8b8"}}>…</div></div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={botInput} onChange={e=>setBotInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleBot()}
          placeholder="Frag mich was…"
          style={{flex:1,padding:"12px 14px",borderRadius:12,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:13,outline:"none"}}/>
        <button onClick={handleBot} style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:"12px 16px",color:"#fff",cursor:"pointer",fontSize:16}}>→</button>
      </div>
    </div>
  );

  return null;
}

// ── Spotlight Tab — KI-Funktionen zentral ──
function SpotlightTab({profile,cardProps,onSelect}){
  const [mode,setMode]=useState("deepdive");
  const MODES=[
    {id:"deepdive",icon:"🔭",label:"Deep Dive",desc:"Starte mit einem Lieblingstitel — wir bauen ein ganzes Universum drum herum"},
    {id:"vibe",icon:"🎛️",label:"Vibe-Meter",desc:"Stelle deine Stimmung ein — wir finden den perfekten Titel"},
    {id:"bot",icon:"💬",label:"StreamBot",desc:"Stell jede Frage — dein persönlicher Streaming-Experte antwortet"},
  ];
  const FUN_MODES=[
    {id:"surprise",icon:"✨",label:"Überrasch mich",desc:"1 Titel — kein Scrollen, kein Suchen"},
    {id:"oracle",icon:"🔮",label:"Orakel",desc:"Das Orakel kennt deinen nächsten Film"},
    {id:"personality",icon:"🎭",label:"Dein Typ",desc:"Entdecke deinen Streaming-Persönlichkeitstyp"},
  ];

  return(
    <div style={{padding:"0 18px",paddingBottom:20}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,margin:"0 0 4px",background:"linear-gradient(135deg,#c4a960,#ff6b35)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Spotlight</h2>
        <p style={{fontSize:12,color:"#b0a8b8",margin:0}}>Lass die KI für dich arbeiten — präzise, persönlich, schnell</p>
      </div>

      {/* Haupt-Features — groß */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {MODES.map(m=>{
          const isActive=mode===m.id;
          return(
            <button key={m.id} onClick={()=>setMode(isActive?m.id:m.id)}
              style={{background:isActive?"linear-gradient(135deg,rgba(196,169,96,0.15),rgba(255,107,53,0.1))":"rgba(255,255,255,0.03)",border:"1px solid "+(isActive?"rgba(196,169,96,0.4)":"rgba(255,255,255,0.07)"),borderRadius:16,padding:"16px 18px",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:isActive?"linear-gradient(135deg,#c4a960,#ff6b35)":"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:isActive?"#c4a960":"#f0ece4",marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:11,color:"#b0a8b8",lineHeight:1.4}}>{m.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive?"#c4a960":"#444"} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Feature Content */}
      <div style={{marginBottom:24}}>
        <BrowseFeature mode={mode} profile={profile} cardProps={cardProps} onSelect={onSelect}/>
      </div>

      {/* Divider */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:"#1e1e30"}}/>
        <span style={{fontSize:11,color:"#3a3344",fontWeight:600,letterSpacing:"0.5px"}}>EXTRAS</span>
        <div style={{flex:1,height:1,background:"#1e1e30"}}/>
      </div>

      {/* Spaß-Extras — kleiner */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        {FUN_MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)}
            style={{flex:1,minWidth:90,background:mode===m.id?"rgba(232,67,147,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(mode===m.id?"rgba(232,67,147,0.3)":"rgba(255,255,255,0.07)"),borderRadius:12,padding:"12px 8px",cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:4}}>{m.icon}</div>
            <div style={{fontSize:11,fontWeight:700,color:mode===m.id?"#e84393":"#f0ece4"}}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Fun Feature Content */}
      {["surprise","oracle","personality"].includes(mode)&&(
        <FunFeature mode={mode} profile={profile} onSelect={onSelect}/>
      )}
    </div>
  );
}

function BrowseTab({profile,cardProps,onSelect}){
  const [showUniversalSwipe,setShowUniversalSwipe]=useState(false);
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




  const vibeLabel=(v)=>v>66?"viel":v>33?"mittel":"wenig";

  return(
    <div>
      {/* Schnellsuche */}
      <div style={{marginBottom:14}}>
        <input value={searchQuery} onChange={e=>handleSearch(e.target.value)} placeholder="Schnellsuche… 🔍"
          style={{width:"100%",padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
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
                <div style={{fontSize:11,color:"#b0a8b8",marginTop:2}}>Top 10 · Serien & Filme gemischt</div>
              </div>
            </div>

            {/* Universal Swipe Button */}
            <button onClick={()=>setShowUniversalSwipe(true)}
              style={{width:"100%",background:"linear-gradient(135deg,rgba(232,67,147,0.1),rgba(255,107,53,0.07))",border:"1px solid rgba(232,67,147,0.3)",borderRadius:12,padding:"13px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#e84393,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>✨</div>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#f0ece4"}}>Persönliche Empfehlungen holen</div>
                <div style={{fontSize:11,color:"#b0a8b8",marginTop:2}}>Swipe durch Titel · Wir lernen deinen Geschmack</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            {showUniversalSwipe&&(
            <div style={{position:"fixed",inset:0,background:"#09090f",zIndex:200,overflow:"auto"}}>
              <div style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid #1e1e30"}}>
                <button onClick={()=>setShowUniversalSwipe(false)} style={{background:"transparent",border:"none",color:"#b0a8b8",cursor:"pointer",fontSize:14,fontFamily:"'DM Sans'",fontWeight:600}}>← Zurück</button>
                <span style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>✨ Persönliche Empfehlungen</span>
              </div>
              <div style={{padding:"16px 18px 4px",background:"rgba(232,67,147,0.06)",borderBottom:"1px solid #1e1e30"}}>
                <p style={{fontSize:12,color:"#b0a8b8",margin:0,lineHeight:1.5}}>Wische rechts ❤️ für Titel die dich interessieren, links ✕ für alles andere. Danach passen sich deine Empfehlungen an.</p>
              </div>
              <div style={{padding:"0 18px",paddingBottom:120}}>
                <UniversalSwipe profile={profile} cardProps={cardProps} onSelect={cardProps.onSelect||onSelect} onDone={()=>setShowUniversalSwipe(false)}/>
              </div>
            </div>
          )}
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


// ── Tour Modal — Onboarding für neue Nutzer ──
function TourModal({onClose}){
  const [step,setStep]=useState(0);
  const slides=[
    {
      icon:"✨",
      title:"Willkommen bei StreamFinder",
      text:"Schluss mit endlosem Scrollen. Wir helfen dir genau das zu finden was du heute Abend schauen willst — über alle deine Streaming-Anbieter hinweg.",
      tip:"Je mehr du bewertest, desto besser kennen wir dich.",
    },
    {
      icon:"🏠",
      title:"Für dich",
      text:"Deine täglichen Top-Picks — personalisiert auf deinen Geschmack. Wische Titel weg die dich nicht interessieren. Wähle eine Stimmung wenn du was Bestimmtes suchst.",
      tip:"Tipp: Bewerte Titel mit den LED-Dots — 🔴 Nein · 🟠 Ok · 🟢 Top. Mehr Bewertungen = bessere Empfehlungen.",
    },
    {
      icon:"🔍",
      title:"Entdecken",
      text:"Stöbere bei deinen Anbietern: Top 5 pro Plattform, Swipe-Modus für schnelles Bewerten, Deep Dive für Universen rund um einen Lieblingstitel, Vibe-Meter für die genaue Stimmung, und der StreamBot beantwortet jede Frage.",
      tip:"Tippe einen Anbieter an um seine Top 5 zu sehen.",
    },
    {
      icon:"🎲",
      title:"Spaß-Ecke",
      text:"Wenn du dich nicht entscheiden kannst: Würfeln lassen, das Orakel befragen, oder deinen Streaming-Persönlichkeitstyp herausfinden.",
      tip:"Die KI entscheidet — du musst nur schauen.",
    },
    {
      icon:"🔴🟠🟢",
      title:"Bewerten mit LED-Dots",
      text:"Statt Sternen gibt es 3 LED-Dots. Tippe bei jedem Titel auf die kleinen Punkte: Rot = Nicht mein Ding · Orange = Ok · Grün = Top. Je mehr du bewertest, desto persönlicher werden deine Empfehlungen.",
      tip:"Die LED-Dots findest du in der Detailansicht jedes Titels. Tipp auf ? oben rechts für weitere Hilfe.",
    },
    {
      icon:"❤️",
      title:"Merken & Verlauf",
      text:"Was dich interessiert wandert in die Watchlist. Was du gesehen hast in den Verlauf. Daraus berechnet sich dein Geschmacksprofil.",
      tip:"Bereit? Das ? oben rechts öffnet jederzeit die Hilfe.",
    },
  ];
  const cur=slides[step];
  const isLast=step===slides.length-1;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div style={{background:"linear-gradient(135deg,#12121f,#0d0d18)",borderRadius:24,padding:28,maxWidth:420,width:"100%",border:"1px solid rgba(255,107,53,0.3)",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",animation:"fadeIn 0.4s ease"}}>
        {/* Progress Dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:24}}>
          {slides.map((_,i)=>(
            <div key={i} style={{width:i===step?24:6,height:6,borderRadius:3,background:i===step?"linear-gradient(90deg,#ff6b35,#e84393)":i<step?"#c4a960":"#2a2340",transition:"all 0.3s"}}/>
          ))}
        </div>
        {/* Icon */}
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:48,marginBottom:8}}>{cur.icon}</div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,color:"#f0ece4",fontWeight:700,marginBottom:0}}>{cur.title}</h2>
        </div>
        {/* Text */}
        <p style={{fontSize:14,color:"#c4b8c8",lineHeight:1.6,textAlign:"center",marginBottom:14}}>{cur.text}</p>
        {/* Tip */}
        <div style={{background:"rgba(196,169,96,0.1)",border:"1px solid rgba(196,169,96,0.3)",borderRadius:12,padding:"10px 14px",marginBottom:24}}>
          <p style={{fontSize:12,color:"#c4a960",margin:0,fontStyle:"italic",textAlign:"center"}}>💡 {cur.tip}</p>
        </div>
        {/* Buttons */}
        <div style={{display:"flex",gap:10}}>
          {step>0&&(
            <button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"transparent",border:"1px solid #2a2340",borderRadius:12,padding:"12px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:13}}>
              Zurück
            </button>
          )}
          <button onClick={()=>{if(isLast)onClose();else setStep(s=>s+1);}} style={{flex:2,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:"12px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>
            {isLast?"Los gehts ✨":"Weiter →"}
          </button>
        </div>
        {/* Skip */}
        {!isLast&&(
          <button onClick={onClose} style={{width:"100%",background:"transparent",border:"none",color:"#555",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:11,marginTop:12,padding:6}}>
            Tour überspringen
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tab Hint Banner — kontextueller Hinweis ──
function TabHintBanner({tab,onDismiss}){
  const hints={
    home:{icon:"✨",text:"Deine Top-Picks. Wische links zum Ausblenden · Tippe für Details · 🔴🟠🟢 LED-Dots zum Bewerten. Tipp auf ? oben rechts für Hilfe."},
    browse:{icon:"📺",text:"Tippe einen Anbieter für Top 5 · Alle auf einmal swipen für personalisierte Empfehlungen · Deep Dive für Titel-Universen."},
    fun:{icon:"🎲",text:"KI entscheidet für dich — Würfel, Orakel oder Persönlichkeitstyp. Funktioniert besser mit mehr Bewertungen."},
    liked:{icon:"❤️",text:"Deine Watchlist — alle gemerkten Titel. Tippe Herz-Icon bei jedem Titel zum Merken."},
    history:{icon:"📋",text:"Dein Verlauf und Geschmacksprofil. Je mehr du bewertest, desto persönlicher die Empfehlungen."},
  };
  const h=hints[tab];
  if(!h)return null;
  return(
    <div style={{margin:"0 18px 14px",padding:"10px 14px",background:"linear-gradient(135deg,rgba(255,107,53,0.08),rgba(232,67,147,0.05))",border:"1px solid rgba(255,107,53,0.2)",borderRadius:12,display:"flex",alignItems:"center",gap:10,animation:"fadeIn 0.4s ease"}}>
      <span style={{fontSize:18,flexShrink:0}}>{h.icon}</span>
      <p style={{flex:1,fontSize:11,color:"#c4b8c8",margin:0,lineHeight:1.4}}>{h.text}</p>
      <button onClick={onDismiss} style={{background:"transparent",border:"none",color:"#666",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>
    </div>
  );
}


// ── Watchlist Tab ──
function LikedTab({profile,cardProps}){
  const items=profile.liked_items||[];
  if(items.length===0)return(
    <div style={{padding:"0 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <h3 style={{fontSize:20,fontWeight:800,margin:0}}>Watchlist</h3>
      </div>
      <div style={{textAlign:"center",padding:40,color:"#b0a8b8"}}>
        <div style={{fontSize:40,marginBottom:10}}>🤍</div>
        <p>Noch nichts gespeichert.</p>
        <p style={{fontSize:11,marginTop:6}}>Tippe bei einem Titel auf das Herz-Icon.</p>
      </div>
    </div>
  );
  return(
    <div style={{padding:"0 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <h3 style={{fontSize:20,fontWeight:800,margin:0}}>Watchlist</h3>
        <span style={{fontSize:12,color:"#b0a8b8",background:"#1a1a2e",borderRadius:20,padding:"2px 10px"}}>{items.length}</span>
      </div>
      <p style={{fontSize:12,color:"#b0a8b8",marginBottom:14}}>Titel die du noch sehen möchtest</p>
      {items.map(it=><TitleCard key={it.id} item={it} {...cardProps}/>)}
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
  const [showTour,setShowTour]=useState(()=>{
    try{return localStorage.getItem("streamfinder_tour_done")!=="1";}catch{return true;}
  });
  const [tabHints,setTabHints]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("streamfinder_hints"))||{home:false,browse:false,fun:false,liked:false,history:false};}catch{return {home:false,browse:false,fun:false,liked:false,history:false};}
  });
  function dismissHint(t){
    const next={...tabHints,[t]:true};
    setTabHints(next);
    try{localStorage.setItem("streamfinder_hints",JSON.stringify(next));}catch{}
  }
  function finishTour(){
    setShowTour(false);
    try{localStorage.setItem("streamfinder_tour_done","1");}catch{}
  }
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
  const reserveItems=useRef([]);
  const heroItemsRef=useRef([]);
  const feedItemsRef=useRef([]);
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
    // Sofort aus Feed entfernen wenn gemerkt
    const id=item.id;
    const isCurrentlyLiked=(profile.liked||[]).includes(id);
    if(!isCurrentlyLiked){
      // Neu gemerkt → aus allen Empfehlungen entfernen
      const filterOut=items=>items.filter(it=>it.id!==id);
      setHeroItems(prev=>filterOut(prev));
      setFeedItems(prev=>{const n=filterOut(prev);feedItemsRef.current=n;return n;});
      setBaseHeroItems(prev=>filterOut(prev));
      setBaseFeedItems(prev=>filterOut(prev));
      // Auch aus PlatformCards entfernen
      window.dispatchEvent(new CustomEvent("sf_watched",{detail:{id,title:item.title||item.name||""}}));
    }
    updateProfile(p=>{
      const id=item.id;
      const title=item.title||item.name||"";
      const isLiked=(p.liked||[]).includes(id);
      const liked=isLiked?p.liked.filter(x=>x!==id):[...p.liked,id];
      const liked_titles=isLiked?(p.liked_titles||[]).filter(t=>t!==title):[...(p.liked_titles||[]),title];
      // Store full item data so Merkliste shows correct title+poster
      const liked_items=p.liked_items||[];
      const liked_items_next=isLiked
        ?liked_items.filter(it=>it.id!==id)
        :[...liked_items,{
          id,
          title,
          name:item.name||"",
          poster_path:item.poster_path||null,
          backdrop_path:item.backdrop_path||null,
          media_type:item.media_type||"movie",
          vote_average:item.vote_average||0,
          genre_ids:item.genre_ids||[],
          release_date:item.release_date||"",
          first_air_date:item.first_air_date||"",
          overview:item.overview||"",
        }];
      const genres={...p.genres};
      if(!isLiked)(item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+2;});
      return{...p,liked,liked_titles,liked_items:liked_items_next,genres};
    });
    // Sofort aus Startseite entfernen wenn gemerkt
    if(!(profile.liked||[]).includes(item.id)){
      const filterOut=items=>items.filter(it=>it.id!==item.id);
      setHeroItems(prev=>filterOut(prev));
      setFeedItems(prev=>{const n=filterOut(prev);feedItemsRef.current=n;return n;});
      setBaseHeroItems(prev=>filterOut(prev));
      setBaseFeedItems(prev=>filterOut(prev));
      // PlatformCards auch informieren
      window.dispatchEvent(new CustomEvent("sf_watched",{detail:{id:item.id,title:item.title||item.name||""}}));
    }
  }

  function handleRate(itemTitle,stars,directGenreIds){
    // Broadcast rating for PlatformCards
    window.dispatchEvent(new CustomEvent("sf_rated",{detail:{title:itemTitle,stars}}));
    const key=titleKey(itemTitle);
    updateProfile(p=>{
      const ratings={...(p.ratings||{}),[key]:stars};
      const genres={...p.genres};
      const allItems=[...(p.watched||[])];
      const found=allItems.find(it=>titleKey(it.title||it.name||"")===key);
      // Use directly passed genre_ids (from swipe) or look up from watched
      const genreIds=directGenreIds||found?.genre_ids||[];
      if(genreIds.length>0){
        // LED: 5=Grün(+4), 3=Orange(+1), 1=Rot(-3)
        const boost=stars===5?4:stars===3?1:stars===1?-3:0;
        if(boost!==0)genreIds.forEach(g=>{genres[g]=(genres[g]||0)+boost;});
      }
      const ref=REF_TITLES.find(r=>titleKey(r.title)===key);
      if(ref){
        const boost=stars===5?4:stars===3?1:stars===1?-3:0;
        if(boost!==0)ref.genres.forEach(g=>{genres[g]=(genres[g]||0)+boost;});
      }
      return{...p,ratings,genres};
    });
    // Sofort aus Feed entfernen wenn Rot bewertet
    if(stars===1){
      const key=titleKey(itemTitle);
      const removeIfBad=items=>items.filter(it=>titleKey(it.title||it.name||"")!==key);
      const reserve=reserveItems.current;
      const replacement=reserve.find(r=>{
        const t=titleKey(r.title||r.name||"");
        return t!==key&&!(profile.blocked_titles||[]).includes(t)&&!(profile.watched||[]).some(w=>w.id===r.id);
      });
      if(replacement){
        reserveItems.current=reserve.filter(r=>r.id!==replacement.id);
        setFeedItems(prev=>{
          const filtered=prev.filter(it=>titleKey(it.title||it.name||'')!==key);
          // Duplikat-Check: nicht einfügen wenn schon vorhanden
          if(filtered.some(it=>it.id===replacement.id))return filtered;
          const n=[...filtered,{...replacement,_isNew:true}];
          feedItemsRef.current=n;
          return n;
        });
        setBaseFeedItems(prev=>{
          const filtered=prev.filter(it=>titleKey(it.title||it.name||'')!==key);
          if(filtered.some(it=>it.id===replacement.id))return filtered;
          return[...filtered,{...replacement,_isNew:true}];
        });
        // Reserve fast leer → im Hintergrund auffüllen
        if(reserveItems.current.length<3){
          getSmartRecommendations(profile).then(items=>{
            const existIds=new Set([...heroItemsRef.current,...feedItemsRef.current].map(it=>it.id));
            reserveItems.current=[...reserveItems.current,...items.filter(it=>!existIds.has(it.id)).slice(10)];
          }).catch(()=>{});
        }
      } else {
        setFeedItems(prev=>removeIfBad(prev));
        setBaseFeedItems(prev=>removeIfBad(prev));
        // Reserve leer → neu laden
        getSmartRecommendations(profile).then(items=>{
          reserveItems.current=items.slice(10);
        }).catch(()=>{});
      }
      setHeroItems(prev=>removeIfBad(prev));
      setBaseHeroItems(prev=>removeIfBad(prev));
    }
  }

  function handleBlock(itemTitle){
    const key=titleKey(itemTitle);
    // Profil updaten
    updateProfile(p=>{
      const blocked=p.blocked_titles||[];
      const isBlocked=blocked.includes(key);
      return{...p,blocked_titles:isBlocked?blocked.filter(t=>t!==key):[...blocked,key]};
    });
    // Sofort aus allen Listen entfernen
    const filterOut=items=>items.filter(it=>titleKey(it.title||it.name||"")!==key);
    setHeroItems(prev=>filterOut(prev));
    setBaseHeroItems(prev=>filterOut(prev));
    // Ersatz aus Reserve — einmalig, kein Event
    const reserve=reserveItems.current;
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const liked=new Set(profile.liked||[]);
    const replacement=reserve.find(r=>{
      const t=titleKey(r.title||r.name||"");
      return t!==key&&!watched.has(r.id)&&!liked.has(r.id)&&
        !(profile.blocked_titles||[]).includes(t);
    });
    if(replacement){
      reserveItems.current=reserve.filter(r=>r.id!==replacement.id);
      const repl={...replacement,_isNew:true};
      setFeedItems(prev=>{
        const filtered=filterOut(prev);
        if(filtered.some(it=>it.id===repl.id))return filtered;
        const n=[...filtered,repl];
        feedItemsRef.current=n;
        return n;
      });
      setBaseFeedItems(prev=>{
        const filtered=filterOut(prev);
        if(filtered.some(it=>it.id===repl.id))return filtered;
        return[...filtered,repl];
      });
    }else{
      setFeedItems(prev=>{const n=filterOut(prev);feedItemsRef.current=n;return n;});
      setBaseFeedItems(prev=>filterOut(prev));
      // Reserve leer → nachladen
      getSmartRecommendations(profile).then(newItems=>{
        const existIds=new Set([...heroItemsRef.current,...feedItemsRef.current].map(it=>it.id));
        const fresh=newItems.filter(it=>!existIds.has(it.id)&&titleKey(it.title||it.name||"")!==key);
        if(fresh.length>0){
          const toShow={...fresh[0],_isNew:true};
          setFeedItems(prev=>{
            const filtered=prev.filter(it=>titleKey(it.title||it.name||"")!==key);
            if(filtered.some(it=>it.id===toShow.id))return filtered;
            const n=[...filtered,toShow];
            feedItemsRef.current=n;
            return n;
          });
          setBaseFeedItems(prev=>{
            const filtered=prev.filter(it=>titleKey(it.title||it.name||"")!==key);
            if(filtered.some(it=>it.id===toShow.id))return filtered;
            return[...filtered,toShow];
          });
          reserveItems.current=fresh.slice(1,11);
        }
      }).catch(()=>{});
    }
    // Event NUR für PlatformCards — kein Ersatz auf Startseite nochmal
    window.dispatchEvent(new CustomEvent("sf_blocked",{detail:{title:itemTitle}}));
  }

  function handleWatched(item){
    window.dispatchEvent(new CustomEvent("sf_watched",{detail:{id:item.id,title:item.title||item.name||""}}));
    const removeFromFeed=items=>items.filter(it=>it.id!==item.id);
    const reserve=reserveItems.current;
    const replacement=reserve.find(r=>
      r.id!==item.id&&
      !(profile.watched||[]).some(w=>w.id===r.id)&&
      !(profile.liked||[]).includes(r.id)&&
      !(profile.blocked_titles||[]).includes(titleKey(r.title||r.name||""))
    );
    if(replacement){
      reserveItems.current=reserve.filter(r=>r.id!==replacement.id);
      setFeedItems(prev=>{const n=[...prev.filter(it=>it.id!==item.id),{...replacement,_isNew:true}];feedItemsRef.current=n;return n;});
      setBaseFeedItems(prev=>[...removeFromFeed(prev),{...replacement,_isNew:true}]);
    }else{
      setFeedItems(prev=>removeFromFeed(prev));
      setBaseFeedItems(prev=>removeFromFeed(prev));
      // Reserve leer → direkt neuen Titel nachladen
      getSmartRecommendations(profile).then(newItems=>{
        const existIds=new Set([...heroItemsRef.current,...feedItemsRef.current].map(it=>it.id));
        const fresh=newItems.filter(it=>!existIds.has(it.id)&&it.id!==item.id);
        if(fresh.length>0){
          const toShow={...fresh[0],_isNew:true};
          setFeedItems(prev=>{const n=[...prev.filter(it=>it.id!==item.id),toShow];feedItemsRef.current=n;return n;});
          setBaseFeedItems(prev=>[...prev.filter(it=>it.id!==item.id),toShow]);
          reserveItems.current=fresh.slice(1,11);
        }
      }).catch(()=>{});
    }
    setHeroItems(prev=>removeFromFeed(prev));
    setBaseHeroItems(prev=>removeFromFeed(prev));
    updateProfile(p=>{
      const watched=p.watched||[];
      const exists=watched.some(w=>w.id===item.id);
      if(exists)return{...p,watched:watched.filter(w=>w.id!==item.id)};
      const genreIds=item.genre_ids||(item.genres||[]).map(g=>g.id)||[];
      const entry={id:item.id,title:item.title||item.name||"?",poster_path:item.poster_path,genre_ids:genreIds,vote_average:item.vote_average,media_type:item.media_type||(item.first_air_date?"tv":"movie"),addedAt:Date.now()};
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
      // Sicherstellen dass keine Duplikate zwischen hero und feed
      const shownIds=new Set(hero.map(it=>it.id));
      const feedUnique=feed.filter(it=>!shownIds.has(it.id));
      setHeroItems(hero);heroItemsRef.current=hero;
      setFeedItems(feedUnique);feedItemsRef.current=feedUnique;
      setBaseHeroItems(hero);
      setBaseFeedItems(feedUnique);
      reserveItems.current=items.filter(it=>!shownIds.has(it.id)&&!feedUnique.some(f=>f.id===it.id)).slice(0,15);
    }catch(e){}
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

  // Nach Universal Swipe → Startseite mit frischem Profil neu laden
  useEffect(()=>{
    async function onSwipeDone(e){
      // Kurz warten damit localStorage aktuell ist
      await new Promise(r=>setTimeout(r,800));
      let freshProfile=profile;
      try{const saved=localStorage.getItem("sf_profile");if(saved)freshProfile=JSON.parse(saved);}catch(e){}
      setHeroItems([]);setFeedItems([]);setFeedLoading(true);
      try{
        const items=await getSmartRecommendations(freshProfile);
        const hero=items.slice(0,3);
        const feed=items.slice(3);
        setHeroItems(hero);setFeedItems(feed);
        setBaseHeroItems(hero);setBaseFeedItems(feed);
      }catch(e){}
      setFeedLoading(false);
    }
    window.addEventListener("sf_swipe_done",onSwipeDone);
    return()=>window.removeEventListener("sf_swipe_done",onSwipeDone);
  },[]);

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
    }catch(e){}
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
          if(myRating===1)return false; // Rot = niemals empfehlen
          return true;
        });
        if(valid.length>0){
          setHeroItems(valid.slice(0,3));
          setFeedItems(valid.slice(3));
        }
      }
    }catch(e){}
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
        const likedIds=new Set(profile.liked||[]); // Watchlist-Titel nie empfehlen
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
    {id:"home",      label:"Für dich"},
    {id:"spotlight", label:"Spotlight"},
    {id:"browse",    label:"Erkunden"},
    {id:"liked",     label:"Watchlist"},
    {id:"history",   label:"Verlauf"},
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
          <button onClick={()=>setShowHelp(true)} title="Hilfe & Erklärungen" style={{background:"rgba(196,169,96,0.1)",border:"1px solid rgba(196,169,96,0.3)",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#c4a960",fontSize:16,fontWeight:700,fontFamily:"'DM Sans'"}}>?</button>
          <button onClick={()=>setSS(!showSettings)} style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#b0a8b8",fontSize:18}}>⚙️</button>
        </div>
      </div>
      {showSettings&&(
        <div style={{margin:"10px 18px",background:"#12121f",borderRadius:14,border:"1px solid #1e1e30",overflow:"hidden"}}>

          <div style={{padding:14}}>
            <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:"0 0 10px"}}>Profil zurücksetzen</p>
            <button onClick={onReset} style={{background:"rgba(229,9,20,0.09)",border:"1px solid rgba(229,9,20,0.27)",borderRadius:10,padding:"9px 18px",color:"#E50914",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:12}}>🔄 Zurücksetzen</button>
          </div>
          {/* Tour neu starten */}
          <div style={{padding:14,borderTop:"1px solid #1e1e30"}}>
            <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:"0 0 10px"}}>Hilfe</p>
            <button onClick={()=>{
              setShowTour(true);
              try{localStorage.removeItem("streamfinder_tour_done");localStorage.removeItem("streamfinder_hints");}catch{}
              setTabHints({home:false,browse:false,fun:false,liked:false,history:false});
              setSS(false);
            }} style={{background:"rgba(196,169,96,0.13)",border:"1px solid rgba(196,169,96,0.27)",borderRadius:10,padding:"9px 18px",color:"#c4a960",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:12}}>✨ Tour nochmal anzeigen</button>
          </div>
        </div>
      )}

      <div style={{paddingTop:14}}>
        {/* HOME */}
        {showTour&&<TourModal onClose={finishTour}/>}
        {!showTour&&tab==="home"&&feedItems.length>6&&!tabHints.spotlight&&(
          <div onClick={()=>{setTab("spotlight");dismissHint("spotlight");}} style={{margin:"0 18px 10px",padding:"10px 14px",background:"linear-gradient(135deg,rgba(196,169,96,0.08),rgba(196,169,96,0.04))",border:"1px solid rgba(196,169,96,0.2)",borderRadius:12,display:"flex",alignItems:"center",gap:10,cursor:"pointer",animation:"fadeIn 0.5s ease"}}>
            <span style={{fontSize:16}}>✦</span>
            <p style={{flex:1,fontSize:11,color:"#c4a960",margin:0}}>Nicht das Richtige dabei? Spotlight hilft dir gezielt weiter →</p>
            <button onClick={e=>{e.stopPropagation();dismissHint("spotlight");}} style={{background:"transparent",border:"none",color:"#666",cursor:"pointer",fontSize:14}}>×</button>
          </div>
        )}
        {!tabHints[tab]&&!showTour&&<TabHintBanner tab={tab} onDismiss={()=>dismissHint(tab)}/>}
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
        {tab==="spotlight"&&(
          <SpotlightTab profile={profile} cardProps={cardProps} onSelect={handleSelect}/>
        )}
        {tab==="browse"&&( // Erkunden
          <div style={{padding:"0 18px"}}>
            <BrowseTab profile={profile} cardProps={cardProps} onSelect={setSelectedItem}/>
          </div>
        )}


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

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(9,9,15,0.95)",backdropFilter:"blur(20px)",borderTop:"1px solid #1a1a2e",display:"flex",padding:"8px 4px 20px",zIndex:100}}>
        {tabs.map(t=>{
          const isActive=tab===t.id;
          const gold="#c4a960";
          const grey="#3a3450";
          const color=isActive?gold:grey;
          const svgIcons={
            home:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
            spotlight:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive?color:"none"} stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ),
            browse:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            ),
            fun:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive?color:"none"} stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            ),
            liked:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive?color:"none"} stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            ),
            history:(
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive?2:1.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="12 8 12 12 14 14"/>
                <path d="M3.05 11a9 9 0 108.83-7H9"/>
                <polyline points="3 4 3 11 10 11"/>
              </svg>
            ),
          };
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 4px",transition:"all 0.2s"}}>
              <div style={{transition:"transform 0.2s",transform:isActive?"scale(1.1)":"scale(1)"}}>
                {svgIcons[t.id]||svgIcons.home}
              </div>
              <span style={{fontSize:9,fontWeight:isActive?700:400,fontFamily:"'DM Sans'",color,letterSpacing:"0.5px",textTransform:"uppercase"}}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}


// ── Onboarding ──

// ── Onboarding Swipe ──
function OnboardingSwipe({profile,onDone}){
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [loading,setLoading]=useState(true);
  const localRatings=useRef({});

  useEffect(()=>{
    const allIds=[8,9,337,350,1899,531]; // Top Plattformen
    Promise.all([
      discoverTitles("serie",allIds,null,1,"popularity.desc",null),
      discoverTitles("film",allIds,null,1,"popularity.desc",null),
      discoverTitles("serie",allIds,null,2,"vote_average.desc",null),
      discoverTitles("film",allIds,null,2,"vote_average.desc",null),
    ]).then(([s1,f1,s2,f2])=>{
      const all=[
        ...(s1.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(f1.results||[]).map(r=>({...r,media_type:"movie"})),
        ...(s2.results||[]).map(r=>({...r,media_type:"tv"})),
        ...(f2.results||[]).map(r=>({...r,media_type:"movie"})),
      ];
      const seen=new Set();
      const deduped=all.filter(r=>{
        if(seen.has(r.id))return false;
        seen.add(r.id);
        return(r.vote_average||0)>=6.5&&r.poster_path;
      });
      for(let i=deduped.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deduped[i],deduped[j]]=[deduped[j],deduped[i]];}
      const result=deduped.slice(0,12);
      if(result.length>0){
        setItems(result);
        setLoading(false);
      }else{
        // Notfall-Fallback ohne Provider-Filter
        discoverTitles("serie",[],null,1,"popularity.desc",null).then(r=>{
          const items=(r.results||[]).slice(0,12).map(it=>({...it,media_type:"tv"}));
          setItems(items);
          setLoading(false);
        }).catch(()=>{setItems([]);setLoading(false);});
      }
    }).catch(()=>{setItems([]);setLoading(false);});
  },[]);

  function handleRight(item){
    localRatings.current[titleKey(item.title||item.name||"")]={stars:4,genre_ids:item.genre_ids||[]};
    advance();
  }
  function handleLeft(item){
    localRatings.current[titleKey(item.title||item.name||"")]={stars:1,genre_ids:item.genre_ids||[]};
    advance();
  }
  function advance(){
    setIdx(i=>{
      if(i+1>=items.length){finish();return i;}
      return i+1;
    });
  }
  function finish(){
    const genres={};
    Object.entries(localRatings.current).forEach(([,{stars,genre_ids}])=>{
      const boost=stars>=4?4:-3;
      genre_ids.forEach(g=>{genres[g]=(genres[g]||0)+boost;});
    });
    onDone(localRatings.current,genres);
  }

  const current=items[idx];
  if(loading)return<div style={{textAlign:"center",padding:30}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:13,color:"#b0a8b8",marginTop:8}}>Lade Titel…</p></div>;
  if(idx>=items.length||!current)return<div style={{textAlign:"center",padding:20}}><p style={{fontSize:14,color:"#b0a8b8"}}>Fast fertig…</p></div>;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{flex:1,height:3,background:"#1e1e30",borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${(idx/items.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#ff6b35,#e84393)",borderRadius:2}}/>
        </div>
        <span style={{fontSize:10,color:"#b0a8b8"}}>{idx}/{items.length}</span>
      </div>
      <div style={{position:"relative",height:380}}>
        <SwipeCard key={current.id+"-"+idx} item={current} color="#e84393" onSwipeRight={handleRight} onSwipeLeft={handleLeft} onTap={()=>{}}/>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:16}}>
        <button onClick={()=>handleLeft(current)} style={{width:56,height:56,borderRadius:28,background:"#12121f",border:"1px solid rgba(239,68,68,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <button onClick={advance} style={{width:44,height:44,borderRadius:22,background:"#12121f",border:"1px solid #1e1e30",cursor:"pointer",fontSize:12,color:"#555",display:"flex",alignItems:"center",justifyContent:"center"}}>↷</button>
        <button onClick={()=>handleRight(current)} style={{width:56,height:56,borderRadius:28,background:"#12121f",border:"1px solid rgba(74,222,128,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>❤️</button>
      </div>
      <p style={{textAlign:"center",fontSize:10,color:"#3a3344",marginTop:8}}>← Nicht mein Ding &nbsp;·&nbsp; ❤️ Interessiert mich →</p>
    </div>
  );
}

function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [selected,setSelected]=useState([]);
  const [swipeRatings,setSwipeRatings]=useState({});
  const [swipeGenres,setSwipeGenres]=useState({});

  const STEPS=[
    {
      title:"Willkommen bei StreamFinder 🎬",
      subtitle:"Deine persönlichen Streaming-Empfehlungen",
      type:"intro",
    },
    {
      title:"Welche Anbieter hast du?",
      subtitle:"Wähle alle die du nutzt",
      type:"platforms",
    },
    {
      title:"Was gefällt dir?",
      subtitle:"Wische durch ein paar Titel — rechts für Interesse, links für nicht mein Ding",
      type:"swipe",
    },
  ];

  function handlePlatformToggle(id){
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }
  function handleGenreToggle(id){
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }
  function handleNext(){
    if(step===0){setStep(1);setSelected([]);}
    else if(step===1){
      if(selected.length===0)return;
      window._ob_plats=selected;
      setStep(2);setSelected([]);
    }else{
      // Swipe-Schritt abgeschlossen — baue Profil aus Swipe-Daten
      const profile={
        platforms:window._ob_plats||[],
        genres:swipeGenres,
        liked:[],liked_items:[],liked_titles:[],
        blocked_titles:[],watched:[],
        ratings:Object.fromEntries(Object.entries(swipeRatings).map(([k,v])=>[k,v.stars])),
        languages:["en","de"],
      };
      onComplete(profile);
    }
  }

  const cur=STEPS[step];

  return(
    <div style={{minHeight:"100vh",background:"#09090f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{maxWidth:420,width:"100%"}}>
        {/* Progress */}
        <div style={{display:"flex",gap:6,marginBottom:32,justifyContent:"center"}}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{width:i===step?32:8,height:8,borderRadius:4,background:i<=step?"linear-gradient(90deg,#ff6b35,#e84393)":"#1e1e30",transition:"all 0.3s"}}/>
          ))}
        </div>

        <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,color:"#f0ece4",marginBottom:8,textAlign:"center"}}>{cur.title}</h1>
        <p style={{fontSize:13,color:"#b0a8b8",marginBottom:24,textAlign:"center"}}>{cur.subtitle}</p>

        {cur.type==="intro"&&(
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:64,marginBottom:16}}>🎬</div>
            <p style={{fontSize:13,color:"#b0a8b8",lineHeight:1.6}}>StreamFinder findet den perfekten Film oder die perfekte Serie für dich — über alle deine Streaming-Anbieter hinweg.</p>
          </div>
        )}

        {cur.type==="platforms"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
            {PLATFORMS.map(p=>{
              const active=selected.includes(p.id);
              return(
                <button key={p.id} onClick={()=>handlePlatformToggle(p.id)}
                  style={{background:active?p.color+"22":"#12121f",border:"2px solid "+(active?p.color:"#1e1e30"),borderRadius:14,padding:"14px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.2s"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",flexShrink:0}}>{p.icon}</div>
                  <span style={{fontSize:13,fontWeight:700,color:active?"#f0ece4":"#888"}}>{p.name}</span>
                  {active&&<span style={{marginLeft:"auto",color:p.color}}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {cur.type==="swipe"&&(
          <OnboardingSwipe
            profile={{platforms:window._ob_plats||[],genres:{},liked:[],liked_items:[],blocked_titles:[],watched:[],ratings:{},languages:["en","de"]}}
            onDone={(ratings,genres)=>{
              setSwipeRatings(ratings);
              setSwipeGenres(genres);
              // Direkt abschließen
              const profile={
                platforms:window._ob_plats||[],
                genres,
                liked:[],liked_items:[],liked_titles:[],
                blocked_titles:[],watched:[],
                ratings:Object.fromEntries(Object.entries(ratings).map(([k,v])=>[k,v.stars])),
                languages:["en","de"],
              };
              onComplete(profile);
            }}
          />
        )}

        {cur.type!=="swipe"&&<button onClick={handleNext}
          disabled={cur.type==="platforms"&&selected.length===0}
          style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"16px",color:"#fff",cursor:cur.type==="platforms"&&selected.length===0?"not-allowed":"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:15,opacity:cur.type==="platforms"&&selected.length===0?0.5:1}}>
          {step===STEPS.length-1?"Los gehts ✨":"Weiter →"}
        </button>}
        {step>0&&cur.type!=="swipe"&&(
          <button onClick={()=>{setStep(s=>s-1);setSelected([]);}}
            style={{width:"100%",background:"transparent",border:"none",color:"#555",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:13,marginTop:12,padding:8}}>
            ← Zurück
          </button>
        )}
      </div>
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
