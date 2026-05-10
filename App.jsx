import { useState, useEffect, useRef } from "react";

const PROXY_URL = "https://stream.thoramus.workers.dev";
const TMDB_API_KEY = "7b1cb8c1071afbbf54d15e7724645086";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";


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

    {id:"spotlight", label:"✨ Spotlight",   icon:"✨"},
    {id:"browse",    label:"🔍 Erkunden",    icon:"🔍"},
    {id:"liked",     label:"❤️ Watchlist",  icon:"❤️"},
    {id:"history",   label:"📋 Verlauf",    icon:"📋"},
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
    spotlight:{
      title:"✨ Spotlight — dein KI-Assistent",
      intro:"Hier wohnt die KI. Drei Hauptfunktionen plus Extras — alle lernen aus deinem Profil.",
      items:[
        {icon:"🔭",title:"Sag mir was mir gefällt…",text:"Sag mir was du schaust — ich sage dir was dir gefällt. Gib einen Titel ein und bekomme sofort ähnliche Empfehlungen die deinen Geschmack treffen. Tipp: Breaking Bad, Inception oder Peaky Blinders als Startpunkt."},
        {icon:"🎛️",title:"Vibe-Meter",text:"3 Regler einstellen: Action & Spannung · Leichtigkeit · Dunkel & Ernst. Die KI findet Titel die exakt zu deiner heutigen Stimmung passen. Viel Action + Dunkel = Thriller. Leicht + Hell = Komödie."},
        {icon:"🍿",title:"Frag den Popcorn-Guru",text:"Stell jede Frage: 'Was läuft auf Netflix wie Breaking Bad?' oder 'Empfiehl mir einen Thriller für heute Abend'. Der Guru antwortet auf Deutsch mit konkreten Picks."},
        {icon:"✨",title:"Überrasch mich",text:"1 perfekter Titel — kein Scrollen, kein Suchen. Die KI wählt basierend auf deinem Profil. Auch ohne KI-Verbindung: wir greifen auf deine Watchlist zurück."},
        {icon:"🔮",title:"Orakel",text:"Mystischer als Überrasch mich. Das Orakel spricht in Prophezeiungen — manchmal überraschend, immer unterhaltsam."},
        {icon:"🎬",title:"Welcher Filmtyp bin ich?",text:"Die KI analysiert dein Profil und gibt dir deinen Streaming-Persönlichkeitstyp: Der Spannungs-Junkie, Die Seelen-Forscherin, Der Lach-Philosoph…"},
        {icon:"💡",title:"Wenn die KI schläft",text:"Alle Funktionen haben einen Backup-Plan ohne KI. Du bekommst immer ein Ergebnis — versprochen."},
      ]
    },
    browse:{
      title:"🔍 Erkunden",
      intro:"Deine Streaming-Anbieter auf einen Blick — Top 10 Titel sortiert nach deinem Geschmack.",
      items:[
        {icon:"📺",title:"Top 10 pro Anbieter",text:"Tippe einen Anbieter an — deine persönlichen Top 10 laden sofort. Sortiert nach % Übereinstimmung mit deinem Geschmack. Der Balken links zeigt den Wert — er erscheint ab 5 Bewertungen."},
        {icon:"🔄",title:"Persönliche Empfehlungen holen",text:"Tippe den Button oben — swipe durch Titel um deinen Geschmack zu verfeinern. Danach berechnet die KI deine Top 10 pro Anbieter neu und sortiert sie frisch."},
        {icon:"✓",title:"Gesehen-Button",text:"Tippe 'Gesehen' direkt in der Liste — der Titel verschwindet sofort und wird durch einen neuen ersetzt."},
        {icon:"🔴🟡🟢",title:"Bewerten",text:"3 Punkte rechts unten: Nicht mein Ding · Ok · Top. Direkt tippbar ohne Detailansicht zu öffnen."},
        {icon:"🔍",title:"Schnellsuche",text:"Oben in Erkunden nach jedem Titel suchen — mit Bewertung, Beschreibung und direktem Zugriff."},
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

// ── LED Bewertungs-Streifen (wischbar) ──
function LedStrip({itemTitle,profile,onRate,genre_ids}){
  const key=titleKey(itemTitle);
  const current=(profile.ratings||{})[key]||0;
  const dots=[
    {v:1,color:"#ef4444",glow:"rgba(239,68,68,0.6)",label:"Nicht mein Ding"},
    {v:3,color:"#f59e0b",glow:"rgba(245,158,11,0.6)",label:"Ok"},
    {v:5,color:"#a3e635",glow:"rgba(163,230,53,0.6)",label:"Top"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {dots.map(dot=>{
          const active=current===dot.v;
          return(
            <button key={dot.v}
              onClick={e=>{e.stopPropagation();e.preventDefault();onRate(itemTitle,current===dot.v?0:dot.v,genre_ids||[]);}}
              style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:active?dot.color:"rgba(255,255,255,0.12)",border:"1px solid "+(active?dot.color:"rgba(255,255,255,0.2)"),boxShadow:active?"0 0 8px 2px "+dot.glow:"none",transition:"all 0.18s ease",transform:active?"scale(1.25)":"scale(1)"}}/>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:6,paddingRight:3}}>
        {dots.map(dot=>(
          <span key={dot.v} style={{width:36,textAlign:"center",fontSize:7,fontWeight:600,color:current===dot.v?dot.color:"rgba(255,255,255,0.18)",fontFamily:"'DM Sans'",transition:"color 0.18s",lineHeight:1}}>{dot.label}</span>
        ))}
      </div>
    </div>
  );
}

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
            {/* Gesehen Button */}
            <button onClick={e=>{e.stopPropagation();onWatched(item);}} style={{background:isWatched?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.1)"),borderRadius:20,padding:"2px 10px",cursor:"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600}}>
              {isWatched?"✓ Gesehen":"Gesehen"}
            </button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
          <div style={{color:"#ff6b35",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>›</div>
        </div>
      </div>
      {/* Interessiert mich nicht Button */}
      <div style={{padding:"0 14px 12px",borderTop:"1px solid rgba(30,30,48,0.13)",marginTop:-4}}>
        
      </div>
      {/* LED Dots rechts */}
      <div onClick={e=>e.stopPropagation()} style={{padding:"4px 12px 10px",display:"flex",justifyContent:"flex-end"}}>
        <LedStrip itemTitle={title} profile={profile} onRate={onRate} genre_ids={item.genre_ids||[]}/>
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
  const poster=item.poster_path?"https://image.tmdb.org/t/p/w500"+item.poster_path:null;
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
      {(poster||backdrop)
        ?<img src={poster||backdrop} alt="" onLoad={e=>e.target.style.opacity=1} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none",opacity:0,transition:"opacity 0.3s ease"}}/>
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
      <div style={{position:"relative",height:"calc(100vh - 320px)",maxHeight:420,margin:"0 -18px"}}>
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
      <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center",marginTop:20,paddingBottom:8,padding:"0 18px"}}>
        {/* Nein */}
        <button onClick={()=>handleLeft(current)}
          style={{flex:1,background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:16,padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.2s"}}>
          👎 Nein
        </button>
        {/* Kenne ich nicht */}
        <button onClick={handleSkip}
          style={{flex:0.8,background:"rgba(255,255,255,0.05)",border:"2px solid #1e1e30",borderRadius:16,padding:"16px 6px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:11,color:"#555",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",lineHeight:1.3,transition:"all 0.2s"}}>
          Kenne<br/>ich nicht
        </button>
        {/* Ja */}
        <button onClick={()=>handleRight(current)}
          style={{flex:1,background:"rgba(74,222,128,0.1)",border:"2px solid rgba(74,222,128,0.3)",borderRadius:16,padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,color:"#4ade80",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.2s"}}>
          👍 Ja
        </button>
      </div>
    </div>
  );
}

// ── Platform Card ──
function PlatformCard({platform,profile,onSelect,onBlock,onLike,onRate,browseType,onWatched}){
  // Entferne Titel der mit Rot bewertet wurde
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const [showMatchInfo,setShowMatchInfo]=useState(false);
  // Einmaligen Hinweis beim ersten Öffnen
  useEffect(()=>{
    if(open&&recs&&recs.length>0){
      const seen=localStorage.getItem("sf_match_hint_seen");
      if(!seen){setShowMatchInfo(true);localStorage.setItem("sf_match_hint_seen","1");setTimeout(()=>setShowMatchInfo(false),4000);}
    }
  },[open,recs]);
  const reserveRef=useRef([]);
  const recsRef=useRef(null); // Ref für Events ohne Closure-Problem
  const storageKey="sf_plat_"+platform.id; // Einheitlicher Key, kein Serie/Film Split

  // Lade gespeicherte Recs aus localStorage
  function loadStoredRecs(){
    try{
      const stored=localStorage.getItem(storageKey);
      if(stored){
        const parsed=JSON.parse(stored);
        if(parsed&&parsed.length>0){
          // Sortiere nach Score/Übereinstimmung
          const sorted=[...parsed].sort((a,b)=>(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0));
          setRecs(sorted);
          recsRef.current=sorted;
          return true;
        }
      }
      localStorage.removeItem(storageKey+"_serie");
      localStorage.removeItem(storageKey+"_film");
    }catch(e){}
    return false;
  }

  // Halte recsRef immer aktuell
  useEffect(()=>{recsRef.current=recs;},[recs]);

  // Speichere Recs in localStorage
  function storeRecs(r){
    try{
      // Immer sortiert speichern
      const sorted=[...r].sort((a,b)=>(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0));
      localStorage.setItem(storageKey,JSON.stringify(sorted));
    }catch(e){}
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

      const kidGenresF=[10762,10751]; // Nur echte Kids/Family, nicht Animation
      const profileLikesKids=(profile.genres||{})[10762]>0||(profile.genres||{})[10751]>2;
      const filteredNoKids=profileLikesKids?filtered:filtered.filter(it=>{
        const genres=it.genre_ids||[];
        // Nur ausblenden wenn ALLE Genres Kids sind
        return genres.length===0||!genres.every(g=>kidGenresF.includes(g));
      });
      const top5=(filteredNoKids.length>=5?filteredNoKids:filtered).slice(0,10);
      reserveRef.current=filtered.slice(10,25);

      if(top5.length>0){
        // Genre-Basis: bewertete Titel ODER Profilpräferenzen als Fallback
        const watchedGoodItems=(profile.watched||[]).filter(w=>(profile.ratings||{})[titleKey(w.title||"")]>=3);
        const watchedGoodG=new Set(watchedGoodItems.flatMap(w=>w.genre_ids||[]));
        // Fallback: profile.genres wenn Verlauf leer
        const profileGenres=profile.genres||{};
        const topProfileGenres=new Set(Object.entries(profileGenres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,5).map(([g])=>Number(g)));
        const useProfileFallback=watchedGoodG.size<3;
        const effectiveGenres=useProfileFallback?topProfileGenres:watchedGoodG;
        const maxGenreBoost=useProfileFallback?Math.max(...Object.values(profileGenres).filter(v=>v>0),1):1;
        const formatted=top5.slice(0,10).map(it=>{
          const titleGenres=it.genre_ids||[];
          let genreMatch=0;
          if(useProfileFallback){
            // Nutze relative Genre-Stärke aus Profil
            const boost=titleGenres.reduce((s,g)=>s+(profileGenres[g]||0),0);
            genreMatch=Math.min(1,boost/(maxGenreBoost*2));
          }else{
            const matchingG=titleGenres.filter(g=>effectiveGenres.has(g)).length;
            genreMatch=titleGenres.length>0?matchingG/Math.min(titleGenres.length,3):0;
          }
          const ratingBonus=((it.vote_average||7)-6.5)/5;
          const calcScore=Math.min(92,Math.max(25,Math.round(25+genreMatch*52+ratingBonus*18)));
          return{
            id:it.id,
            title:it.title||it.name||"",
            year:(it.release_date||it.first_air_date||"").substring(0,4),
            reason:it.overview?it.overview.substring(0,80)+(it.overview.length>80?"…":""):"",
            emoji:it.media_type==="tv"?"📺":"🎬",
            score:calcScore,
            _tmdbItem:it,
          };
        }).sort((a,b)=>b.score-a.score);
        const sortedFormatted=[...formatted].sort((a,b)=>(b.score||0)-(a.score||0));
        setRecs(sortedFormatted);
        recsRef.current=sortedFormatted;
        storeRecs(sortedFormatted);
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
        // Berechne Score für neuen Titel
        const watchedGoodItems2=(profile.watched||[]).filter(w=>(profile.ratings||{})[titleKey(w.title||"")]>=3);
        const watchedGoodG2=new Set(watchedGoodItems2.flatMap(w=>w.genre_ids||[]));
        const profileGenres2=profile.genres||{};
        const useProfileFallback2=watchedGoodG2.size<3;
        const titleGenres=repl.genre_ids||[];
        let genreMatch2=0;
        if(useProfileFallback2){
          const boost=titleGenres.reduce((s,g)=>s+(profileGenres2[g]||0),0);
          const maxB=Math.max(...Object.values(profileGenres2).filter(v=>v>0),1);
          genreMatch2=Math.min(1,boost/(maxB*2));
        }else{
          const matchingG=titleGenres.filter(g=>watchedGoodG2.has(g)).length;
          genreMatch2=titleGenres.length>0?matchingG/Math.min(titleGenres.length,3):0;
        }
        const ratingBonus=((repl.vote_average||7)-6.5)/5;
        const calcScore=Math.min(92,Math.max(25,Math.round(25+genreMatch2*52+ratingBonus*18)));
        const newItem={
          id:repl.id,
          title:repl.title||repl.name||"",
          year:(repl.release_date||repl.first_air_date||"").substring(0,4),
          reason:repl.overview||"",
          emoji:repl.media_type==="tv"?"📺":"🎬",
          score:calcScore,
          _tmdbItem:repl,
          _isNew:true,
        };
        const next=[...filtered,newItem].sort((a,b)=>(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0)).slice(0,10);
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
      const currentRecs=recsRef.current;
      if(!currentRecs)return;
      // Nur reagieren wenn dieser Titel in unserer Liste ist
      const has=currentRecs.find(r=>
        (e.detail.id&&r._tmdbItem?.id===e.detail.id)||
        titleKey(r.title)===titleKey(e.detail.title||"")
      );
      if(has)replaceRec(has.title);
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
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:10,position:"relative"}}>
      {/* Floating Match Info Toast */}
      {showMatchInfo&&(
        <div style={{position:"fixed",bottom:90,left:16,right:16,zIndex:500,animation:"fadeIn 0.3s ease"}}>
          <div style={{background:"linear-gradient(135deg,#1a1528,#12101e)",border:"1px solid rgba(196,169,96,0.35)",borderRadius:16,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(196,169,96,0.12)",border:"1px solid rgba(196,169,96,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>📊</div>
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:700,color:"#c4a960",margin:"0 0 4px",fontFamily:"'DM Sans'"}}>Was bedeutet der Balken?</p>
              <p style={{fontSize:12,color:"#b0a8b8",margin:0,lineHeight:1.5}}>Der % Balken zeigt wie gut dieser Titel zu <strong style={{color:"#f0ece4"}}>deinem persönlichen Geschmack</strong> passt — basierend auf deinen Bewertungen und Lieblingsgenres.</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setShowMatchInfo(false);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:0,flexShrink:0}}>✕</button>
          </div>
        </div>
      )}
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
          {!loading&&recs&&recs.length>0&&(()=>{
            const ratingCount=Object.keys(profile.ratings||{}).length;
            const hasAnyKIScore=recs.some(r=>r.score);
            const sorted=[...recs].sort((a,b)=>
              hasAnyKIScore||ratingCount>=5
                ?(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0)
                :(b._tmdbItem?.vote_average||0)-(a._tmdbItem?.vote_average||0)
            );
            return sorted.map((rec,i)=>{
            const tmdb=rec._tmdbItem;
            const backdrop=tmdb?.backdrop_path?"https://image.tmdb.org/t/p/w500"+tmdb.backdrop_path:null;
            const poster=tmdb?.poster_path?TMDB_IMG+tmdb.poster_path:null;
            const score=tmdb?.vote_average?Math.round(tmdb.vote_average*10)/10:0;
            const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
            const hasKIScore2=!!rec.score;
            const hasEnoughData=hasKIScore2||ratingCount>=5;
            const titleGenres=tmdb?.genre_ids||[];
            const watchedGood=(profile.watched||[]).filter(w=>{const r=(profile.ratings||{})[titleKey(w.title||"")]||0;return r>=3;});
            const watchedGenreSet=new Set(watchedGood.flatMap(w=>w.genre_ids||[]));
            const matchingGenres=titleGenres.filter(g=>watchedGenreSet.has(g)).length;
            const genreMatch=titleGenres.length>0?matchingGenres/Math.min(titleGenres.length,3):0;
            const ratingBonus=((score||7)-6.5)/5;
            const matchPct=rec.score||Math.min(92,Math.max(25,Math.round(25+genreMatch*52+ratingBonus*18)));
            const matchColor=matchPct>=75?"#4ade80":matchPct>=55?"#c4a960":matchPct>=35?"#f97316":"#b0a8b8";
            const matchLabel=matchPct+"%";
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
                      {/* Match % aus Verlauf — nur wenn genug Daten */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:32,gap:2}}>
                        <div style={{width:5,height:36,borderRadius:3,background:"#1e1e30",overflow:"hidden",position:"relative"}}>
                          <div style={{position:"absolute",bottom:0,left:0,right:0,height:hasEnoughData?matchPct+"%":"0%",background:hasEnoughData?matchColor:"#2a2340",borderRadius:3,boxShadow:hasEnoughData?"0 0 6px "+matchColor+"88":"none",transition:"height 0.4s"}}/>
                        </div>
                        {hasEnoughData
                          ?<button onClick={e=>{e.stopPropagation();setShowMatchInfo(v=>!v);}}
                            style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:8,color:matchColor,fontWeight:800,fontFamily:"'DM Sans'",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:2}}>
                            {matchLabel}
                            <span style={{fontSize:8,color:"#4a4060",opacity:0.7}}>ℹ</span>
                          </button>
                          :<span style={{fontSize:7,color:"#3a3350",fontFamily:"'DM Sans'",lineHeight:1.2,textAlign:"center"}}>wenig Daten</span>
                        }
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
                        {rec.reason&&<p style={{fontSize:12,color:"#a09aaa",margin:"4px 0 0",lineHeight:1.4,fontStyle:"italic",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>"{rec.reason}"</p>}
                      </div>
                    </div>
                  </div>
                  {/* LED + Gesehen */}
                  <div onClick={e=>e.stopPropagation()} style={{padding:"6px 12px 10px",display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <LedStrip itemTitle={rec.title} profile={profile} onRate={(t,v,g)=>{onRate(t,v,g);if(v===1)replaceRec(t);}} genre_ids={tmdb?.genre_ids||[]}/>
                    </div>
                    {(()=>{
                      const isWatched=(profile.watched||[]).some(w=>w.id===rec.id||w.id===tmdb?.id);
                      return(
                        <button onClick={e=>{e.stopPropagation();if(!isWatched){const item=rec._tmdbItem||{id:rec.id,title:rec.title,genre_ids:tmdb?.genre_ids||[],media_type:rec.emoji==="📺"?"tv":"movie"};if(onWatched)onWatched(item);replaceRec(rec.title);}}}
                          style={{background:isWatched?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.1)"),borderRadius:8,padding:"4px 10px",cursor:isWatched?"default":"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>
                          {isWatched?"✓ Gesehen":"Gesehen"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
                </SwipeToBlock>
              </div>
            );
          })})()}
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
          // Kinder-Content ausfiltern wenn nicht im Profil
          const kidGenres=[16,10762,10751];
          const profileHasKids=(profile.genres||{})[16]>2||(profile.genres||{})[10762]>2||(profile.genres||{})[10751]>2;
          if(!profileHasKids&&(r.genre_ids||[]).some(g=>kidGenres.includes(g)))return false;
          return(r.vote_average||0)>=7.0;
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
        const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","score":85}]. score = Match-Score 40-95 wie gut der Titel zum Nutzerprofil passt. Differenziere bewusst — nicht alle bekommen hohe Scores.`;
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
reason = witziger persönlicher Satz Deutsch 15-20 Wörter
score = Match-Score 40-95 wie gut dieser Titel zum Nutzerprofil passt (differenziere bewusst, nicht alle 90+)`;

        try{
          const text=await callAI([{role:"user",content:msg}],system);
          const picks=JSON.parse(text.replace(/```json|```/g,"").trim());
          const result=picks.map(p=>{
            const match=unique.find(c=>titleKey(c.title||c.name||"")===titleKey(p.title||""));
            if(!match)return null;
            return{id:match.id,title:match.title||match.name||"",year:(match.release_date||match.first_air_date||"").substring(0,4),reason:p.reason||"",score:p.score||null,emoji:match.media_type==="tv"?"📺":"🎬",_tmdbItem:match};
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
function FunFeature({mode,profile,onSelect,onRate,onLike,onWatched}){
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
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","year":"...","type":"Serie/Film","reason":"...","emoji":"..."}. reason = persönlicher Satz der den User direkt anspricht und duzt, z.B. "Du wirst diesen Film lieben weil..." oder "Genau das brauchst du heute Abend..."`;
      const msg=`Überrasche diesen User mit EINEM perfekten Titel.
Geschmack: ${ctx.taste||"gemischt"}
Liebt: ${ctx.rated5||"noch nichts"}
Mag nicht: ${ctx.low||"nichts"}
Bereits gesehen: ${ctx.watched||"nichts"}
Watchlist: ${ctx.watchlist||"leer"}
Plattformen: ${ctx.platforms}
Wähle einen Titel der ihn wirklich überrascht aber trotzdem trifft. Sprich ihn in reason direkt an und duze ihn.`;
      const text=await callAI([{role:"user",content:msg}],system);
      setSurpriseResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){
        setSurpriseError("RATE_LIMIT");
      }else{
        // Fallback: Zufälliger Top-Titel aus Watchlist oder TMDB
        try{
          const watchlist=profile.liked_items||[];
          const watched=new Set((profile.watched||[]).map(w=>w.id));
          const candidate=watchlist.find(it=>!watched.has(it.id));
          if(candidate){
            setSurpriseResult({title:candidate.title||candidate.name||"",year:(candidate.release_date||candidate.first_air_date||"").substring(0,4),type:candidate.media_type==="tv"?"Serie":"Film",reason:"Steht schon lange auf deiner Watchlist — jetzt ist der perfekte Moment!",emoji:"🎬"});
          }else{
            const topG=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,2).map(([g])=>g).join("|");
            const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
            const r=await discoverTitles("serie",allIds,topG||null,Math.floor(Math.random()*5)+1,"vote_average.desc",null);
            const picks=(r.results||[]).filter(it=>(it.vote_average||0)>=8&&!watched.has(it.id));
            const pick=picks[Math.floor(Math.random()*Math.min(picks.length,10))];
            if(pick)setSurpriseResult({title:pick.title||pick.name||"",year:(pick.release_date||pick.first_air_date||"").substring(0,4),type:pick.media_type==="tv"?"Serie":"Film",reason:"Sehr hoch bewertet — und passt zu deinem Geschmack!",emoji:"⭐"});
            else setSurpriseError("error");
          }
        }catch{setSurpriseError("error");}
      }
    }
    setSurpriseLoading(false);
  }

  async function doOracle(){
    setOracleLoading(true);setOracleResult(null);setOracleError("");
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein mystisches Orakel für Streaming. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","prophecy":"...","emoji":"..."}. WICHTIG: "title" muss ein ECHTER, bekannter Film oder eine echte Serie sein die auf TMDB zu finden ist. Keine erfundenen Titel!`;
      const msg=`Das Orakel spricht. Welcher Titel erwartet diesen User heute Abend? Sprich ihn direkt an mit "du".
Geschmack: ${ctx.taste||"unbekannt"}
Liebt: ${ctx.rated5||"noch nichts bewertet"}
Plattformen: ${ctx.platforms}
Schreibe eine mystische Prophezeiung (2 Sätze, dramatisch aber witzig).`;
      const text=await callAI([{role:"user",content:msg}],system);
      setOracleResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){
        setOracleError("RATE_LIMIT");
      }else{
        // Fallback: Vordefinierte Prophezeiungen
        const prophecies=[
          {title:"Ein Klassiker wartet auf dich",prophecy:"Die Sterne sprechen: Was du suchst, hast du bereits auf deiner Watchlist. Scroll nach oben — die Antwort liegt dort.",emoji:"🌟"},
          {title:"Der perfekte Abend naht",prophecy:"Das Orakel sieht einen gemütlichen Abend voraus. Nicht denken — einfach den ersten Titel auf deiner Watchlist starten.",emoji:"🔮"},
          {title:"Vertraue deinem Instinkt",prophecy:"Du weißt bereits was du schauen willst. Das Orakel bestätigt: Dein erster Gedanke war richtig.",emoji:"✨"},
        ];
        const p=prophecies[Math.floor(Math.random()*prophecies.length)];
        setOracleResult(p);
      }
    }
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
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){
        setPersonalityError("RATE_LIMIT");
      }else{
        // Fallback: Regelbasierter Persönlichkeitstyp aus Genres
        const genres=profile.genres||{};
        const top=Object.entries(genres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,2).map(([g])=>Number(g));
        const typeMap={
          53:{type:"Der Spannungs-Junkie",emoji:"🔪",description:"Du lebst für den nächsten Twist. Ruhige Filme? Langweilig. Du willst an den Nageln kauen.",titles:["Zodiac","Se7en","Gone Girl"]},
          18:{type:"Die Seelen-Forscherin",emoji:"🎭",description:"Charaktertiefe ist alles für dich. Wenn ein Film nicht wehtut, hat er nichts getaugt.",titles:["Manchester by the Sea","Requiem for a Dream","The Leftovers"]},
          28:{type:"Der Action-Held",emoji:"💥",description:"Explosionen sind Musik für deine Ohren. Plot? Optional. Hauptsache es knallt.",titles:["Mad Max","John Wick","Die Hard"]},
          35:{type:"Der Lach-Philosoph",emoji:"😂",description:"Du weißt: Das Leben ist zu kurz für schlechte Stimmung. Komödien sind deine Therapie.",titles:["Arrested Development","Fleabag","What We Do in the Shadows"]},
          9648:{type:"Der Rätsel-Löser",emoji:"🧩",description:"Du pausierst Filme um Theorien aufzustellen. Spoiler machen dir Freude statt Leid.",titles:["Dark","Westworld","Severance"]},
        };
        const match=top.find(g=>typeMap[g]);
        if(match&&typeMap[match])setPersonalityResult(typeMap[match]);
        else setPersonalityResult({type:"Der Vielseitige",emoji:"🎬",description:"Du bist schwer einzuordnen — du magst einfach gute Unterhaltung, egal welches Genre.",titles:["Breaking Bad","Inception","The Bear"]});
      }
    }
    setPersonalityLoading(false);
  }
  const [personalityError,setPersonalityError]=useState("");

  if(mode==="surprise")return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)"}}>
      {!surpriseResult&&!surpriseLoading&&<button onClick={doSurprise} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>✨ Überrasch mich!</button>}
      {surpriseLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Suche den perfekten Titel…</p></div>}
      {surpriseError==="RATE_LIMIT"&&<RateLimitBanner emoji="✨" title="Alle Überraschungen für heute verteilt!" msg="Unser Überraschungs-Elf hat seinen Vorrat aufgebraucht. Er schläft schon mit einem Lächeln — morgen hat er neue Ideen!"/>}
      {surpriseError==="error"&&<p style={{color:"#b0a8b8",fontSize:13,textAlign:"center",padding:12}}>Etwas ist schiefgelaufen — <button onClick={doSurprise} style={{background:"none",border:"none",color:"#c4a960",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700}}>nochmal versuchen →</button></p>}
      {surpriseResult&&(
        <div>
          <BotTitleCard title={surpriseResult.title} profile={profile} onSelect={onSelect} onRate={onRate} onLike={onLike} onWatched={onWatched}/>
          {surpriseResult.reason&&<p style={{fontSize:12,color:"#c4b8c8",lineHeight:1.5,fontStyle:"italic",textAlign:"center",margin:"8px 0 12px"}}>"{surpriseResult.reason}"</p>}
          <button onClick={doSurprise} style={{width:"100%",background:"transparent",border:"1px solid #2a2340",borderRadius:10,padding:"10px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Neuen Titel finden ✨</button>
        </div>
      )}
    </div>
  );

  if(mode==="oracle")return(
    <div style={{background:"linear-gradient(135deg,rgba(196,169,96,0.06),rgba(232,67,147,0.04))",borderRadius:16,padding:20,border:"1px solid rgba(196,169,96,0.2)"}}>
      {!oracleResult&&!oracleLoading&&<button onClick={doOracle} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#e84393)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🔮 Orakel befragen</button>}
      {oracleLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔮</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Das Orakel meditiert…</p></div>}
      {oracleError==="RATE_LIMIT"&&<RateLimitBanner emoji="🔮" title="Das Orakel meditiert" msg="Die Kristallkugel ist heute schon so oft befragt worden, dass sie sich eine wohlverdiente Auszeit nimmt. Morgen sieht sie wieder klarer!"/>}
      {oracleError==="error"&&<p style={{color:"#b0a8b8",fontSize:13,textAlign:"center",padding:12}}>Das Orakel ist kurz abgelenkt — <button onClick={doOracle} style={{background:"none",border:"none",color:"#c4a960",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700}}>nochmal befragen →</button></p>}
      {oracleResult&&(
        <div>
          <div style={{textAlign:"center",marginBottom:12}}>
            <p style={{fontSize:13,color:"#c4a960",lineHeight:1.6,fontStyle:"italic",marginBottom:8}}>🔮 "{oracleResult.prophecy}"</p>
          </div>
          <BotTitleCard title={oracleResult.title} profile={profile} onSelect={onSelect} onRate={onRate} onLike={onLike} onWatched={onWatched}/>
          <button onClick={doOracle} style={{width:"100%",marginTop:10,background:"transparent",border:"1px solid rgba(196,169,96,0.3)",borderRadius:10,padding:"10px 20px",color:"#c4a960",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Nochmal befragen 🔮</button>
        </div>
      )}
    </div>
  );

  if(mode==="personality")return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)"}}>
      {personalityError==="RATE_LIMIT"&&<RateLimitBanner emoji="🎬" title="Der Filmtyp-Analytiker hat Pause" msg="Er hat heute so viele Persönlichkeiten analysiert, dass sein Kopf raucht. Morgen ist er wieder hellwach!"/>}
      {!personalityResult&&!personalityLoading&&!personalityError&&<button onClick={doPersonality} style={{width:"100%",background:"linear-gradient(135deg,#e84393,#c4a960)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🎭 Meinen Typ entdecken</button>}
      {personalityLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🎭</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Analysiere deinen Geschmack…</p></div>}
      {personalityResult&&(
        <div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:8}}>{personalityResult.emoji||"🎭"}</div>
            <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,margin:"0 0 8px",color:"#f0ece4"}}>{personalityResult.type}</h3>
            <p style={{fontSize:13,color:"#c4b8c8",lineHeight:1.6,marginBottom:12}}>{personalityResult.description}</p>
          </div>
          {(personalityResult.titles||[]).length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              <p style={{fontSize:11,color:"#7a7488",marginBottom:4}}>Titel die zu dir passen:</p>
              {(personalityResult.titles||[]).map((t,i)=>(
                <BotTitleCard key={i} title={t} profile={profile} onSelect={onSelect} onRate={onRate} onLike={onLike} onWatched={onWatched}/>
              ))}
            </div>
          )}
          <button onClick={doPersonality} style={{width:"100%",background:"transparent",border:"1px solid #2a2340",borderRadius:10,padding:"10px 20px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Neu analysieren 🎭</button>
        </div>
      )}
    </div>
  );

  return null;
}



// ── SpotlightCard — große Hero-Karte für Spotlight Ergebnisse ──
function SpotlightCard({item,profile,onSelect,onRate,onLike,onWatched,onBlock}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w780"+item.backdrop_path:null;
  const bg=backdrop||poster;
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type==="tv"?"Serie":"Film";
  const aiReason=item._aiReason||"";
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const myRating=(profile.ratings||{})[titleKey(title)]||0;
  const ratingColors={1:"#ef4444",3:"#f59e0b",5:"#4ade80"};
  const ratingLabels={1:"Nicht mein Ding",3:"Ok",5:"Top"};

  return(
    <div style={{borderRadius:20,overflow:"hidden",marginBottom:12,position:"relative",background:"#0a0a12"}}>
      {/* Großes Hintergrundbild — klickbar für Details */}
      <div onClick={()=>onSelect&&onSelect(item)} style={{cursor:"pointer",position:"relative"}}>
        {bg?<img src={bg} alt="" style={{width:"100%",height:220,objectFit:"cover",display:"block"}}/>
          :<div style={{width:"100%",height:220,background:"linear-gradient(135deg,#1a1520,#0f1020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>🎬</div>}
        {/* Gradient overlay */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:220,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.85) 100%)"}}/>
        {/* Score Badge */}
        {score>0&&<div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.7)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4,backdropFilter:"blur(8px)"}}>
          <span style={{color:"#f5c518",fontSize:11}}>★</span>
          <span style={{color:scoreColor,fontSize:12,fontWeight:800}}>{score}</span>
        </div>}
        {/* Type badge */}
        <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.6)",borderRadius:6,padding:"3px 10px",backdropFilter:"blur(8px)"}}>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:10,fontWeight:700}}>{mediaType} {year&&"· "+year}</span>
        </div>
        {/* Info unten auf Bild */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px 10px"}}>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,color:"#fff",margin:"0 0 4px",textShadow:"0 2px 8px rgba(0,0,0,0.8)",lineHeight:1.2}}>{title}</h3>
          {aiReason&&<p style={{fontSize:12,color:"rgba(255,255,255,0.75)",margin:0,fontStyle:"italic",lineHeight:1.4,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{aiReason}</p>}
        </div>
      </div>
      {/* Actions */}
      <div onClick={e=>e.stopPropagation()} style={{padding:"10px 14px 12px",background:"#0d0d1a",display:"flex",alignItems:"center",gap:8}}>
        {/* Gesehen */}
        <button onClick={()=>!isWatched&&onWatched&&onWatched(item)}
          style={{background:isWatched?"rgba(74,222,128,0.12)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.1)"),borderRadius:8,padding:"5px 12px",cursor:isWatched?"default":"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600}}>
          {isWatched?"✓ Gesehen":"Gesehen"}
        </button>
        {/* Merken */}
        <button onClick={()=>onLike&&onLike(item)}
          style={{width:34,height:34,borderRadius:8,background:isLiked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(isLiked?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
          {isLiked?"❤️":"🤍"}
        </button>
        <div style={{flex:1}}/>
        {/* LED Dots rechts */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {[{v:1,c:"#ef4444",g:"rgba(239,68,68,0.6)",l:"Nicht mein Ding"},{v:3,c:"#f59e0b",g:"rgba(245,158,11,0.6)",l:"Ok"},{v:5,c:"#4ade80",g:"rgba(74,222,128,0.6)",l:"Top"}].map(dot=>{
              const active=myRating===dot.v;
              return(
                <button key={dot.v} onClick={()=>onRate&&onRate(title,myRating===dot.v?0:dot.v,item.genre_ids||[])}
                  style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:active?dot.c:"rgba(255,255,255,0.15)",border:"1px solid "+(active?dot.c:"rgba(255,255,255,0.2)"),boxShadow:active?"0 0 8px 2px "+dot.g:"none",transition:"all 0.15s",transform:active?"scale(1.3)":"scale(1)"}}/>
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:6,paddingRight:4}}>
            {[{v:1,l:"Nicht mein Ding"},{v:3,l:"Ok"},{v:5,l:"Top"}].map(dot=>(
              <span key={dot.v} style={{width:32,textAlign:"center",fontSize:7,color:myRating===dot.v?(dot.v===1?"#ef4444":dot.v===3?"#f59e0b":"#4ade80"):"rgba(255,255,255,0.18)",fontFamily:"'DM Sans'",fontWeight:600}}>{dot.l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── BotTitleCard — lädt TMDB-Bild für Guru-Empfehlungen ──
function BotTitleCard({title,profile,onSelect,onRate,onLike,onWatched}){
  const [item,setItem]=useState(null);
  useEffect(()=>{
    fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=de-DE&query="+encodeURIComponent(title))
      .then(r=>r.json())
      .then(d=>{const found=(d.results||[]).find(r=>r.media_type==="tv"||r.media_type==="movie");if(found)setItem(found);})
      .catch(()=>{});
  },[title]);
  if(!item)return(
    <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
      <span style={{fontSize:13,color:"#c4b8c8",fontWeight:600}}>🎬 {title}</span>
    </div>
  );
  return <SpotlightCard item={item} profile={profile} onSelect={onSelect} onRate={onRate} onLike={onLike} onWatched={onWatched} onBlock={()=>{}}/>;
}

// ── Rate Limit Banner ──
function RateLimitBanner({emoji,title,msg,onAlternative}){
  return(
    <div style={{background:"linear-gradient(135deg,rgba(196,169,96,0.07),rgba(255,107,53,0.04))",border:"1px solid rgba(196,169,96,0.18)",borderRadius:18,padding:"22px 18px",textAlign:"center"}}>
      <div style={{fontSize:38,marginBottom:12}}>{emoji||"🌙"}</div>
      <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,color:"#c4a960",margin:"0 0 10px",lineHeight:1.2}}>{title||"Feierabend!"}</h3>
      <p style={{fontSize:13,color:"#b0a8b8",lineHeight:1.7,margin:"0 0 16px"}}>{msg||"Unser Experte macht eine Pause."}</p>
      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"11px 14px",marginBottom:16,border:"1px solid rgba(255,255,255,0.07)"}}>
        <p style={{fontSize:12,color:"#9a94a8",margin:0,lineHeight:1.5}}>💡 Tipp: Erkunde die Anbieter oder starte einen Swipe — das geht immer!</p>
      </div>
      {onAlternative&&(
        <button onClick={onAlternative}
          style={{background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"11px 22px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>
          → Zu Erkunden wechseln
        </button>
      )}
    </div>
  );
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
  const [botMessages,setBotMessages]=useState([]);
  const [botLoading,setBotLoading]=useState(false);
  const ddRef=useRef(null);

  const vibeLabel=(v)=>v>66?"viel":v>33?"mittel":"wenig";

  async function startDeepDive(titleStr){
    setDDLoading(true);setDDResults([]);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]`;
      const msg=`Erstelle 8 Empfehlungen basierend auf "${titleStr}".
Nutzerprofil: ${ctx.taste||"gemischt"}
Liebt: ${ctx.rated5||"nichts"}
Plattformen: ${ctx.platforms}
reason = witziger Satz Deutsch.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      setDDResults(enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason})));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){
        setDDResults([{_rateLimit:true}]);
      }else{
        // Fallback: TMDB Discover mit Lieblingsgenres
        try{
          const topG=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
          const gStr=topG.join("|");
          const r=await discoverTitles("serie",(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]),gStr,1,"vote_average.desc",null);
          const items=(r.results||[]).filter(it=>(it.vote_average||0)>=7.5).slice(0,6).map(it=>({...it,media_type:"tv",_aiReason:"Basierend auf deinen Lieblingsgenres"}));
          setDDResults(items.length>0?items:[{_rateLimit:true}]);
        }catch{setDDResults([{_rateLimit:true}]);}
      }
    }
    setDDLoading(false);
  }

  async function getVibeRecs(){
    setVibeLoading(true);setVibeResults([]);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]`;
      const msg=`Empfehle 6 Titel für diese Stimmung:
Action/Spannung: ${vibeLabel(heavy)}
Leichtigkeit: ${vibeLabel(100-trash)}
Dunkel/Ernst: ${vibeLabel(dark)}
Nutzerprofil: ${ctx.taste||"gemischt"}
Plattformen: ${ctx.platforms}
reason = witziger Satz Deutsch.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      setVibeResults(enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason})));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){
        setVibeResults([{_rateLimit:true}]);
      }else{
        // Fallback: Genre-basierte Empfehlungen aus Vibe-Einstellungen
        try{
          const actionGenres=heavy>60?[28,12,53]:[];
          const darkGenres=dark>60?[9648,80,18]:[];
          const lightGenres=trash<40?[35,10749]:[];
          const fallbackGenres=[...new Set([...actionGenres,...darkGenres,...lightGenres])].slice(0,3);
          const gStr=fallbackGenres.length>0?fallbackGenres.join("|"):null;
          const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
          const r=await discoverTitles("serie",allIds,gStr,1,"vote_average.desc",null);
          const items=(r.results||[]).filter(it=>(it.vote_average||0)>=7).slice(0,6).map(it=>({...it,media_type:"tv",_aiReason:"Passend zu deiner Stimmung"}));
          setVibeResults(items.length>0?items:[{_rateLimit:true}]);
        }catch{setVibeResults([{_rateLimit:true}]);}
      }
    }
    setVibeLoading(false);
  }

  async function handleDDSearch(q){
    if(!q.trim())return;
    if(ddRef.current)clearTimeout(ddRef.current);
    ddRef.current=setTimeout(async()=>{
      setDDSearching(true);
      const res=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=de-DE&query="+encodeURIComponent(q)).then(r=>r.json());
      setDDSearchRes((res.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,5));
      setDDSearching(false);
    },400);
  }

  async function handleDDSelect(item){
    setDDInput(item.title||item.name||"");
    setDDSearchRes([]);
    await startDeepDive(item.title||item.name||"");
  }

  async function handleBot(){
    if(!botInput.trim())return;
    const q=botInput.trim();
    setBotInput("");
    setBotMessages(prev=>[...prev,{role:"user",text:q}]);
    setBotLoading(true);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist StreamBot, ein freundlicher Streaming-Experte. Antworte auf Deutsch in max 3 Sätzen. Empfiehl dann 2-3 Titel in diesem Format: **Titel** (Jahr) - kurze Begründung. Nutzerprofil: ${ctx.taste||"gemischt"}. Plattformen: ${ctx.platforms}`;
      const history=botMessages.slice(-6).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
      const text=await callAI([...history,{role:"user",content:q}],system);
      // Extrahiere Titel — Bold Format bevorzugt da im System-Prompt vorgegeben
      const boldTitles=(text.match(/\*\*([^*\n]{2,50})\*\*/g)||[]).map(t=>t.replace(/\*\*/g,"").trim());
      const quotedTitles=(text.match(/["""„]([^"""„\n]{2,50})["""]/g)||[]).map(t=>t.replace(/["""„]/g,"").trim());
      const titles=[...new Set([...boldTitles,...quotedTitles].map(t=>t.replace(/\s*[\(\-–:,].*$/,"").trim()).filter(t=>t.length>2&&t.length<55&&/[a-zA-ZäöüÄÖÜ]/.test(t)))].slice(0,5);
      setBotMessages(prev=>[...prev,{role:"bot",text,titles}]);
    }catch(e){
      const isLimit=e.message==="RATE_LIMIT"||e.message?.includes("429")||e.message?.includes("limit")||e.message?.includes("rate");
      const msg=isLimit?"__RATE_LIMIT__":"Fehler — bitte nochmal versuchen.";
      setBotMessages(prev=>[...prev,{role:"bot",text:msg}]);
    }
    setBotLoading(false);
  }

  if(mode==="deepdive")return(
    <div>
      {/* Beispiel-Chips */}
      {!ddInput&&!ddLoading&&ddResults.length===0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:12,color:"#7a7488",marginBottom:8,fontFamily:"'DM Sans'"}}>Zum Beispiel:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {["Breaking Bad","The Wire","Inception","Peaky Blinders","Dark"].map(ex=>(
              <button key={ex} onClick={()=>{setDDInput(ex);startDeepDive(ex);}}
                style={{background:"rgba(196,169,96,0.08)",border:"1px solid rgba(196,169,96,0.2)",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12,color:"#c4a960",fontFamily:"'DM Sans'",fontWeight:600}}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input value={ddInput} onChange={e=>{setDDInput(e.target.value);handleDDSearch(e.target.value);}}
          placeholder="Was schaust du gerne? z.B. Breaking Bad…"
          style={{flex:1,padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none"}}/>
        <button onClick={()=>startDeepDive(ddInput)} disabled={!ddInput.trim()||ddLoading}
          style={{background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:14,padding:"0 18px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14,opacity:ddInput.trim()?1:0.5}}>
          {ddLoading?"…":"🔭"}
        </button>
      </div>
      {ddSearchRes.length>0&&(
        <div style={{background:"#12121f",borderRadius:12,border:"1px solid #1e1e30",marginBottom:10}}>
          {ddSearchRes.map((r,i)=>(
            <button key={r.id} onClick={()=>handleDDSelect(r)}
              style={{width:"100%",background:"transparent",border:"none",borderBottom:i<ddSearchRes.length-1?"1px solid #1e1e30":"none",padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
              {r.poster_path&&<img src={TMDB_IMG+r.poster_path} alt="" style={{width:28,height:42,borderRadius:4,objectFit:"cover"}}/>}
              <span style={{color:"#f0ece4",fontSize:13}}>{r.title||r.name}</span>
              <span style={{color:"#555",fontSize:11}}>{r.media_type==="tv"?"Serie":"Film"}</span>
            </button>
          ))}
        </div>
      )}
      {ddLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:24,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔭</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Baue dein Universum…</p></div>}
      {ddResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ddResults[0]?._rateLimit
            ?<RateLimitBanner emoji="🔭" title="Das Universum braucht eine Pause" msg="Unser Entdecker hat heute schon so viele Filmwelten bereist — er schläft jetzt. Morgen früh geht die Reise weiter!"/>
            :ddResults.map((it,i)=><SpotlightCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)
          }
        </div>
      )}
    </div>
  );

  if(mode==="vibe")return(
    <div>
      <p style={{fontSize:12,color:"#7a7488",marginBottom:14,lineHeight:1.5,fontFamily:"'DM Sans'"}}>Stelle deine aktuelle Stimmung ein — wir finden den perfekten Titel dazu.</p>
      {[
        {label:"Action & Spannung",val:heavy,set:setHeavy,low:"Ruhig",high:"Explosiv"},
        {label:"Leichtigkeit",val:100-trash,set:v=>setTrash(100-v),low:"Schwer",high:"Locker"},
        {label:"Dunkel & Ernst",val:dark,set:setDark,low:"Hell & Leicht",high:"Düster & Tief"},
      ].map(s=>(
        <div key={s.label} style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:"#c4b8c8",fontFamily:"'DM Sans'",fontWeight:600}}>{s.label}</span>
            <span style={{fontSize:12,color:"#e84393",fontWeight:700,fontFamily:"'DM Sans'"}}>{vibeLabel(s.val)}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#555",flexShrink:0,width:50,textAlign:"right"}}>{s.low}</span>
            <input type="range" min="0" max="100" value={s.val} onChange={e=>s.set(Number(e.target.value))} style={{flex:1,accentColor:"#e84393"}}/>
            <span style={{fontSize:10,color:"#555",flexShrink:0,width:50}}>{s.high}</span>
          </div>
        </div>
      ))}
      <div style={{background:"rgba(232,67,147,0.06)",borderRadius:12,padding:"10px 14px",marginBottom:14,border:"1px solid rgba(232,67,147,0.1)"}}>
        <p style={{fontSize:12,color:"#c4b8a8",margin:0}}>💡 Tipp: Viel Action + Dunkel = Thriller. Wenig Action + Hell = Komödie.</p>
      </div>
      <button onClick={getVibeRecs} disabled={vibeLoading}
        style={{width:"100%",background:"linear-gradient(135deg,#e84393,#ff6b35)",border:"none",borderRadius:14,padding:"13px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,marginBottom:14}}>
        {vibeLoading?"Suche…":"Passende Titel finden →"}
      </button>
      {vibeResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {vibeResults[0]?._rateLimit
            ?<RateLimitBanner emoji="🎛️" title="Die Vibes sind zu stark für heute" msg="Das Vibe-Meter hat heute so viele Stimmungen gemessen, dass es selbst eine Pause braucht. Morgen wieder frisch!"/>
            :vibeResults.map((it,i)=><SpotlightCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)
          }
        </div>
      )}
    </div>
  );

  if(mode==="bot")return(
    <div>
      {/* Beispiel-Fragen */}
      {botMessages.length===0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:12,color:"#7a7488",marginBottom:8,fontFamily:"'DM Sans'"}}>Du könntest zum Beispiel fragen:</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              "Was läuft auf Netflix wie Breaking Bad?",
              "Empfiehl mir einen guten Thriller für heute Abend",
              "Was sind die besten Serien 2024?",
              "Ich mag Filme wie Inception — was noch?",
            ].map(q=>(
              <button key={q} onClick={()=>{setBotInput(q);}}
                style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:12,padding:"10px 14px",cursor:"pointer",textAlign:"left",fontSize:12,color:"#c4b8c8",fontFamily:"'DM Sans'"}}>
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
        {botMessages.length===0&&<p style={{fontSize:13,color:"#555",fontStyle:"italic",textAlign:"center",padding:"10px 0"}}>Der Guru wartet auf deine Frage…</p>}
        {botMessages.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",width:"100%",gap:8}}>
            {m.text==="__RATE_LIMIT__"
              ?<div style={{width:"100%"}}><RateLimitBanner emoji="🍿" title="Der Guru hat heute Kinoabend" msg="Unser Popcorn-Guru hat heute so viele Fragen beantwortet, dass er sich selbst einen Film gönnt. Morgen ist er wieder für dich da!"/></div>
              :<>
                <div style={{background:m.role==="user"?"linear-gradient(135deg,#e84393,#ff6b35)":"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 14px",maxWidth:"85%",fontSize:13,color:"#f0ece4",lineHeight:1.6,border:m.role==="user"?"none":"1px solid rgba(255,255,255,0.08)"}}>
                  {m.role==="bot"
                    ?m.text.split(/(\*\*[^*]+\*\*)/).map((part,pi)=>
                        part.startsWith("**")&&part.endsWith("**")
                          ?<strong key={pi} style={{color:"#f5e090"}}>{part.slice(2,-2)}</strong>
                          :<span key={pi}>{part}</span>
                      )
                    :m.text}
                </div>
                {m.role==="bot"&&m.titles&&m.titles.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
                    {m.titles.map((t,ti)=>(
                      <BotTitleCard key={ti} title={t} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched}/>
                    ))}
                  </div>
                )}
              </>
            }
          </div>
        ))}
        {botLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:"#1a1a2e",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#555"}}>Der Guru denkt nach…</div></div>}
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



// ── Premium SVG Icons für Spotlight ──
const SpotlightIcons = {
  deepdive: (color, size=32) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="m21 21-4.35-4.35"/>
      <path d="M11 8c0 0 1.5 1 1.5 3s-1.5 3-1.5 3"/>
      <circle cx="11" cy="11" r="1" fill={color}/>
    </svg>
  ),
  vibe: (color, size=32) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h2l2.5-7 3 14 2.5-10 2 6 1.5-3H22"/>
    </svg>
  ),
  bot: (color, size=32) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <circle cx="9" cy="10" r="1" fill={color}/>
      <circle cx="15" cy="10" r="1" fill={color}/>
    </svg>
  ),
  surprise: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
    </svg>
  ),
  oracle: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3c4 4 4 14 0 18"/>
      <path d="M3 12c4-4 14-4 18 0"/>
      <circle cx="12" cy="12" r="2" fill={color} opacity="0.5"/>
    </svg>
  ),
  personality: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};


// ── Stimmungs-Icons SVG ──


// ── Onboarding Component ──
function SpotlightTab({profile,cardProps,onSelect}){
  const [activeFeature,setActiveFeature]=useState(null);
  const [bgImgs,setBgImgs]=useState([null,null,null]);
  const [activeStimmung,setActiveStimmung]=useState(null);
  const [stimmungRecs,setStimmungRecs]=useState([]);
  const [stimmungReserve,setStimmungReserve]=useState([]);
  const [stimmungLoading,setStimmungLoading]=useState(false);
  const [initialLoaded,setInitialLoaded]=useState(false);

  // Auto-load beim ersten Öffnen — kombiniert Swipe + Stimmung
  useEffect(()=>{
    if(initialLoaded)return;
    setInitialLoaded(true);
    // Beste Stimmung aus Profil-Genres ermitteln — immer laden
    const profileGenres=profile.genres||{};
    const bestMatch=STIMMUNGEN.find(s=>
      s.genres.some(g=>(profileGenres[g]||0)>0)
    )||STIMMUNGEN[0];
    setActiveStimmung(bestMatch.id);
    loadFirstRecs(bestMatch);
  },[]);

  async function loadFirstRecs(stimmung){
    setStimmungLoading(true);setStimmungRecs([]);
    try{
      const ctx=buildCtx(profile);
      // Bewertete Titel aus Swipe als Kontext
      const likedTitles=Object.entries(profile.ratings||{})
        .filter(([,v])=>v>=4).map(([k])=>k).slice(0,5).join(", ");
      const dislikedTitles=Object.entries(profile.ratings||{})
        .filter(([,v])=>v<=2).map(([k])=>k).slice(0,3).join(", ");

      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]. reason = kurzer persönlicher Satz der den User duzt.`;
      const msg=`Empfehle 4 Titel basierend auf diesen persönlichen Daten:
Stimmung: "${stimmung.label}" (${stimmung.sub})
Mag gerne: ${likedTitles||"noch unbekannt"}
Mag nicht: ${dislikedTitles||"noch unbekannt"}
Lieblingsgenres: ${ctx.topGenres||"gemischt"}
Plattformen: ${ctx.platforms}
Personalisiere die Empfehlungen — kombiniere Stimmung und Geschmack.`;

      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      const valid=enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason}));
      setStimmungRecs(valid.slice(0,3));
      setStimmungReserve(valid.slice(3));
    }catch(e){
      // Fallback: TMDB mit besten Genres
      try{
        const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
        const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
        const gStr=topGenres.length>0?topGenres.join("|"):stimmung.genres.join("|");
        const r=await discoverTitles("serie",allIds,gStr,1,"vote_average.desc",null);
        const items=(r.results||[]).filter(it=>(it.vote_average||0)>=7.5).slice(0,4);
        setStimmungRecs(items.map(it=>({...it,media_type:"tv"})));
      }catch{}
    }
    setStimmungLoading(false);
  }

  async function loadStimmungRecs(stimmung){
    setStimmungLoading(true);setStimmungRecs([]);
    try{
      const ctx=buildCtx(profile);
      const likedTitles=Object.entries(profile.ratings||{}).filter(([,v])=>v>=4).map(([k])=>k).slice(0,5).join(", ");
      const dislikedTitles=Object.entries(profile.ratings||{}).filter(([,v])=>v<=2).map(([k])=>k).slice(0,3).join(", ");
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]. reason = kurzer persönlicher Satz der den User duzt.`;
      const msg=`Empfehle 4 Titel für Stimmung: "${stimmung.label}" (${stimmung.sub}).
Mag gerne: ${likedTitles||"noch unbekannt"}
Mag nicht: ${dislikedTitles||"nichts"}
Lieblingsgenres: ${ctx.topGenres||"gemischt"}
Plattformen: ${ctx.platforms}
Kombiniere Stimmung und persönlichen Geschmack.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      const valid=enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason}));
      setStimmungRecs(valid.slice(0,3));
      setStimmungReserve(valid.slice(3));
    }catch(e){
      try{
        const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
        const gStr=stimmung.genres.join("|");
        const r=await discoverTitles("serie",allIds,gStr,1,"vote_average.desc",null);
        const items=(r.results||[]).filter(it=>(it.vote_average||0)>=7.5).slice(0,4);
        setStimmungRecs(items.map(it=>({...it,media_type:"tv"})));
      }catch{}
    }
    setStimmungLoading(false);
  }

  useEffect(()=>{
    // Wähle zufällig aus einem Pool von cineastischen Titeln
    const pool=[
      ["Breaking Bad","Inception","Peaky Blinders"],
      ["The Dark Knight","Interstellar","Ozark"],
      ["Narcos","The Crown","Blade Runner 2049"],
      ["Mindhunter","1917","Severance"],
      ["Succession","Dune","True Detective"],
      ["The Wire","Mad Max Fury Road","Westworld"],
    ];
    const queries=pool[Math.floor(Math.random()*pool.length)];
    Promise.all(queries.map(async q=>{
      try{
        const r=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&query="+encodeURIComponent(q)).then(r=>r.json());
        const found=(r.results||[])[0];
        return found?.backdrop_path?"https://image.tmdb.org/t/p/w780"+found.backdrop_path:null;
      }catch{return null;}
    })).then(setBgImgs);
  },[]);

  const tiles=[
    {id:"deepdive",title:"Sag mir was mir gefällt…",hint:"Sag mir was du schaust — ich sag dir was dir gefällt. Versprochen.",color:"#c4a960",accentGrad:"linear-gradient(90deg,#c4a960,#ff6b35)"},
    {id:"vibe",title:"Vibe-Meter",hint:"Düster & düster? Leicht & locker? Wir finden den einen Titel der heute Abend perfekt passt — ganz ohne Scrollen.",color:"#e84393",accentGrad:"linear-gradient(90deg,#e84393,#c026d3)"},
    {id:"bot",title:"Frag den Popcorn-Guru",hint:"Stell jede Frage — er hat alle Antworten. Außer warum Staffel 3 so enttäuschend war. Das weiß niemand.",color:"#4ade80",accentGrad:"linear-gradient(90deg,#4ade80,#22d3ee)"},
  ];

  const extras=[
    {id:"surprise",title:"Überrasch mich",hint:"1 Klick. 1 perfekter Titel. Kein Scrollen.",color:"#c4a960",icon:"surprise"},
    {id:"oracle",title:"Orakel",hint:"Die Kristallkugel weiß was du heute Abend brauchst.",color:"#a78bfa",icon:"oracle"},
    {id:"personality",title:"Welcher Filmtyp bin ich?",hint:"Bist du der Noir-Detektiv oder doch die Action-Heldin?",color:"#e84393",icon:"personality"},
  ];

  if(activeFeature){
    const tile=tiles.find(t=>t.id===activeFeature);
    const extra=extras.find(e=>e.id===activeFeature);
    const active=tile||extra;
    const isMain=['deepdive','vibe','bot'].includes(activeFeature);
    const bgIdx=tiles.findIndex(t=>t.id===activeFeature);
    const bg=bgIdx>=0?bgImgs[bgIdx]:null;
    return(
      <div style={{position:"relative",minHeight:"85vh",overflow:"hidden"}}>
        {bg&&<img src={bg} alt="" style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.07,zIndex:0,pointerEvents:"none"}}/>}
        <div style={{position:"relative",zIndex:1,padding:"0 18px 24px"}}>
          <button onClick={()=>setActiveFeature(null)}
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 16px",cursor:"pointer",color:"#c4b8c8",fontSize:13,fontFamily:"'DM Sans'",fontWeight:600,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
            ← Zurück
          </button>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
            <div style={{width:48,height:48,borderRadius:15,background:(active?.color||"#c4a960")+"22",border:"1.5px solid "+(active?.color||"#c4a960")+"50",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px "+(active?.color||"#c4a960")+"35"}}>
              {SpotlightIcons[activeFeature]?.(active?.color||"#c4a960",26)}
            </div>
            <div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 4px",color:"#f5f0e8"}}>{active?.title}</h3>
              <p style={{fontSize:12,color:"#7a7488",margin:0,lineHeight:1.4}}>{active?.hint}</p>
            </div>
          </div>
          {isMain
            ?<BrowseFeature mode={activeFeature} profile={profile} cardProps={cardProps} onSelect={onSelect}/>
            :<FunFeature mode={activeFeature} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched}/>
          }
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{flexShrink:0,padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#c4a960,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(196,169,96,0.45)",flexShrink:0}}>
          {SpotlightIcons.surprise("#fff",21)}
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#c4a960,#f5e090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Spotlight</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>KI-Assistent · Persönlich · Präzise</p>
        </div>
      </div>

      {/* Hero Mosaic */}
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 12px 8px"}}>

                {/* Deep Dive — großer Hero-Banner */}
        <button onClick={()=>setActiveFeature("deepdive")}
          style={{height:160,background:"#080810",borderRadius:22,cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",border:"none",display:"flex",flexDirection:"column",width:"100%"}}>
          {/* Vollbild-Bild */}
          {bgImgs[0]?<img src={bgImgs[0]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.55}}/>
            :<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a1510,#0f0f20)"}}/>}
          {/* Vignette */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.5) 100%)"}}/>
          {/* Bottom gradient stark */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 20%,rgba(0,0,0,0.95) 100%)"}}/>
          {/* Top accent linie */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:tiles[0].accentGrad,opacity:0.9}}/>
          {/* Icon oben links */}
          <div style={{position:"absolute",top:14,left:14,width:40,height:40,borderRadius:12,background:"rgba(0,0,0,0.4)",border:"1.5px solid rgba(196,169,96,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)"}}>
            {SpotlightIcons.deepdive("#c4a960",22)}
          </div>
          {/* Text unten */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"16px 18px 18px"}}>
            <div style={{fontFamily:"'Instrument Serif',serif",fontSize:26,color:"#ffffff",marginBottom:6,lineHeight:1.1,textShadow:"0 2px 16px rgba(0,0,0,0.8)"}}>{tiles[0].title}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.4,fontWeight:500}}>{tiles[0].hint}</div>
          </div>
          {/* Arrow */}
          <div style={{position:"absolute",bottom:18,right:16,width:32,height:32,borderRadius:10,background:"rgba(196,169,96,0.2)",border:"1.5px solid rgba(196,169,96,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4a960" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>

        {/* Vibe + Guru — Hero-Banner nebeneinander */}
        <div style={{height:130,display:"flex",gap:8}}>
          {tiles.slice(1).map((t,ri)=>(
            <button key={t.id} onClick={()=>setActiveFeature(t.id)}
              style={{flex:1,background:"#080810",borderRadius:20,cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",border:"none",display:"flex",flexDirection:"column"}}>
              {bgImgs[ri+1]?<img src={bgImgs[ri+1]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.5}}/>
                :<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a1020,#0f1020)"}}/>}
              {/* Vignette */}
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,transparent 20%,rgba(0,0,0,0.5) 100%)"}}/>
              {/* Bottom gradient */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 15%,rgba(0,0,0,0.92) 100%)"}}/>
              {/* Accent linie */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:t.accentGrad,opacity:0.85}}/>
              {/* Icon */}
              <div style={{position:"absolute",top:12,left:12,width:36,height:36,borderRadius:10,background:"rgba(0,0,0,0.4)",border:"1.5px solid "+t.color+"55",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)"}}>
                {SpotlightIcons[t.id]?.(t.color,19)}
              </div>
              {/* Text */}
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px 14px"}}>
                <div style={{fontFamily:"'Instrument Serif',serif",fontSize:18,color:"#ffffff",marginBottom:4,lineHeight:1.15,textShadow:"0 2px 12px rgba(0,0,0,0.9)"}}>{t.title}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",lineHeight:1.3,fontWeight:500}}>{t.hint}</div>
              </div>
            </button>
          ))}
        </div>

{/* Stimmungsleiste */}
        {!activeFeature&&(
          <div style={{flexShrink:0,marginBottom:4}}>
            <p style={{fontSize:10,color:"#5a5468",margin:"0 0 8px",letterSpacing:"0.8px",textTransform:"uppercase",paddingLeft:2}}>Stimmung heute?</p>
            <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4}}>
              {STIMMUNGEN.map(m=>{
                const active=activeStimmung===m.id;
                return(
                  <button key={m.id} onClick={()=>{
                    if(m.id===activeStimmung){setActiveStimmung(null);setStimmungRecs([]);return;}
                    setActiveStimmung(m.id);
                    loadStimmungRecs(m);
                  }}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 10px",background:active?m.color+"18":"rgba(255,255,255,0.04)",border:"1px solid "+(active?m.color+"50":"rgba(255,255,255,0.07)"),borderRadius:13,cursor:"pointer",flexShrink:0,minWidth:58,transition:"all 0.2s",boxShadow:active?"0 0 14px "+m.color+"28":"none"}}>
                    <div style={{width:30,height:30,borderRadius:9,background:m.color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {StimmungIcons[m.id]?.(active?m.color:"#3a3350",17)}
                    </div>
                    <span style={{fontSize:8,fontWeight:active?700:500,color:active?m.color:"#4a4060",fontFamily:"'DM Sans'",whiteSpace:"nowrap",lineHeight:1.2,textAlign:"center"}}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Extras */}
        <div style={{height:100,display:"flex",gap:8}}>
          {extras.map((e,ei)=>{
            const bgs=["rgba(196,169,96,0.06)","rgba(167,139,250,0.06)","rgba(232,67,147,0.06)"];
            const borders=["rgba(196,169,96,0.18)","rgba(167,139,250,0.18)","rgba(232,67,147,0.18)"];
            return(
              <button key={e.id} onClick={()=>setActiveFeature(e.id)}
                style={{flex:1,background:bgs[ei],border:"1px solid "+borders[ei],borderRadius:18,cursor:"pointer",textAlign:"center",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 6px"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+e.color+"60,transparent)"}}/>
                <div style={{position:"absolute",top:-15,left:"50%",transform:"translateX(-50%)",width:80,height:80,background:"radial-gradient(circle,"+e.color+"12,transparent 70%)",pointerEvents:"none"}}/>
                <div style={{width:40,height:40,borderRadius:12,background:e.color+"16",border:"1.5px solid "+e.color+"35",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px "+e.color+"25"}}>
                  {SpotlightIcons[e.icon]?.(e.color,21)}
                </div>
                <div>
                  <div style={{fontFamily:"'Instrument Serif',serif",fontSize:13,color:"#f0ece4",lineHeight:1.2,marginBottom:3}}>{e.title}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",lineHeight:1.3,fontWeight:500}}>{e.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stimmungs-Empfehlungen — unter den KI-Funktionen */}
        {!activeFeature&&(activeStimmung||stimmungLoading)&&(
          <div style={{marginTop:4}}>
            {stimmungLoading&&!stimmungRecs.length&&(
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <span style={{fontSize:22,animation:"spin 1s linear infinite",display:"inline-block"}}>✨</span>
                <p style={{color:"#b0a8b8",fontSize:12,marginTop:6}}>Suche passende Titel…</p>
              </div>
            )}
            {stimmungRecs.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 2px 8px"}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(196,169,96,0.3),transparent)"}}/>
                  <span style={{fontSize:10,color:"#c4a960",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"'DM Sans'"}}>Deine Empfehlungen</span>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(196,169,96,0.3))"}}/>
                </div>
                {stimmungRecs.slice(0,3).map((it,i)=>(
                  <SwipeToBlock key={it.id||i} onBlock={async()=>{
                    setStimmungRecs(prev=>prev.filter((_,j)=>j!==i));
                    try{
                      const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
                      const st=STIMMUNGEN.find(s=>s.id===activeStimmung);
                      if(!st)return;
                      const page=Math.floor(Math.random()*5)+2;
                      const r=await discoverTitles("film",allIds,st.genres.join("|"),page,"vote_average.desc",null);
                      const watched=new Set((profile.watched||[]).map(w=>w.id));
                      const blocked=new Set(profile.blocked_titles||[]);
                      const fresh=(r.results||[]).filter(it=>!watched.has(it.id)&&!blocked.has(titleKey(it.title||it.name||""))&&(it.vote_average||0)>=7.0);
                      if(fresh.length>0)setStimmungRecs(prev=>[...prev,{...fresh[0],media_type:"movie"}]);
                    }catch(e){}
                  }}>
                    <SpotlightCard item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>
                  </SwipeToBlock>
                ))}
              </div>
            )}
          </div>
        )}


{/* Extras Wegweiser — witzig */}
        {!activeFeature&&(
          <div style={{padding:"8px 2px 4px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(255,107,53,0.2),transparent)"}}/>
            <span style={{fontSize:10,color:"#6a5a48",fontWeight:600,fontFamily:"'DM Sans'",textAlign:"center",lineHeight:1.4}}>
              Für alle die noch nicht genug haben 🍿
            </span>
            <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(255,107,53,0.2))"}}/>
          </div>
        )}
        {/* Extras */}
        <div style={{height:100,display:"flex",gap:8}}>
          {extras.map((e,ei)=>{
            const bgs=["rgba(196,169,96,0.06)","rgba(167,139,250,0.06)","rgba(232,67,147,0.06)"];
            const borders=["rgba(196,169,96,0.18)","rgba(167,139,250,0.18)","rgba(232,67,147,0.18)"];
            return(
              <button key={e.id} onClick={()=>setActiveFeature(e.id)}
                style={{flex:1,background:bgs[ei],border:"1px solid "+borders[ei],borderRadius:18,cursor:"pointer",textAlign:"center",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 6px"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+e.color+"60,transparent)"}}/>
                <div style={{position:"absolute",top:-15,left:"50%",transform:"translateX(-50%)",width:80,height:80,background:"radial-gradient(circle,"+e.color+"12,transparent 70%)",pointerEvents:"none"}}/>
                <div style={{width:40,height:40,borderRadius:12,background:e.color+"16",border:"1.5px solid "+e.color+"35",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px "+e.color+"25"}}>
                  {SpotlightIcons[e.icon]?.(e.color,21)}
                </div>
                <div>
                  <div style={{fontFamily:"'Instrument Serif',serif",fontSize:13,color:"#f0ece4",lineHeight:1.2,marginBottom:3}}>{e.title}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",lineHeight:1.3,fontWeight:500}}>{e.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function BrowseTab({profile,cardProps,onSelect}){
  const [showUniversalSwipe,setShowUniversalSwipe]=useState(false);
  const [searchQuery,setSQ]=useState("");
  const [searchResults,setSR]=useState([]);
  const [searching,setSearching]=useState(false);
  const searchRef=useRef(null);
  const [showPlatforms,setShowPlatforms]=useState(true);

  function handleSearch(q){
    setSQ(q);
    if(!q.trim()){setSR([]);return;}
    if(searchRef.current)clearTimeout(searchRef.current);
    searchRef.current=setTimeout(()=>{
      setSearching(true);
      fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=de-DE&query="+encodeURIComponent(q))
        .then(r=>r.json())
        .then(d=>{
          setSR((d.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,8));
          setSearching(false);
        }).catch(()=>setSearching(false));
    },400);
  }

  const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));

  return(
    <div>
      {/* Swipe Button */}
      <div style={{padding:"0 18px 14px"}}>
        <button onClick={()=>setShowUniversalSwipe(true)}
          style={{width:"100%",background:"linear-gradient(135deg,rgba(232,67,147,0.1),rgba(255,107,53,0.07))",border:"1px solid rgba(232,67,147,0.3)",borderRadius:14,padding:"13px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#e84393,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✨</div>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#f0ece4"}}>Persönliche Empfehlungen holen</div>
            <div style={{fontSize:11,color:"#b0a8b8",marginTop:2}}>Swipe durch Titel · Wir lernen deinen Geschmack</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Suche */}
      <div style={{padding:"0 18px 14px"}}>
        <input value={searchQuery} onChange={e=>handleSearch(e.target.value)}
          placeholder="Schnellsuche…"
          style={{width:"100%",padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        {searching&&<p style={{fontSize:12,color:"#b0a8b8",padding:"8px 4px"}}>Suche…</p>}
        {searchResults.length>0&&(
          <div style={{marginTop:8}}>
            {searchResults.map(it=><TitleCard key={it.id} item={it} {...cardProps}/>)}
          </div>
        )}
      </div>

      {/* Anbieter */}
      {!searchQuery&&(
        <div style={{padding:"0 18px"}}>
          {userPlats.map(plat=>(
            <PlatformCard key={plat.id} platform={plat} profile={profile}
              onSelect={onSelect} onBlock={cardProps.onBlock}
              onLike={cardProps.onLike} onRate={cardProps.onRate}
              onWatched={cardProps.onWatched}/>
          ))}
        </div>
      )}

      {/* Universal Swipe Modal */}
      {showUniversalSwipe&&(
        <div style={{position:"fixed",inset:0,background:"#09090f",zIndex:200,overflow:"auto"}}>
          <div style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid #1e1e30"}}>
            <button onClick={()=>setShowUniversalSwipe(false)} style={{background:"transparent",border:"none",color:"#b0a8b8",cursor:"pointer",fontSize:14,fontFamily:"'DM Sans'",fontWeight:600}}>← Zurück</button>
            <span style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>✨ Persönliche Empfehlungen</span>
          </div>
          <div style={{padding:"16px 18px 4px",background:"rgba(232,67,147,0.06)",borderBottom:"1px solid #1e1e30"}}>
            <p style={{fontSize:12,color:"#b0a8b8",margin:0}}>Wische rechts ❤️ für Titel die dich interessieren, links ✕ für alles andere.</p>
          </div>
          <div style={{padding:"0 18px",paddingBottom:120}}>
            <UniversalSwipe profile={profile} cardProps={cardProps} onSelect={onSelect} onDone={()=>setShowUniversalSwipe(false)}/>
          </div>
        </div>
      )}
    </div>
  );
}

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
      icon:"🎬",
      title:"StreamFinder — dein Streaming-Assistent",
      text:"Kennst du das? Du scrollst 20 Minuten durch Netflix und findest nichts. StreamFinder löst genau das — mit KI die deinen Geschmack versteht und in Sekunden den richtigen Titel findet.",
      tip:"Das Geheimnis: Je mehr du bewertest, desto persönlicher werden deine Empfehlungen.",
      accent:"#c4a960",
    },
    {
      icon:"🏠",
      title:"Für dich — deine Startseite",
      text:"Jeden Tag neue Titel die zu dir passen. Wische einen Titel links weg wenn er dich nicht interessiert. Tippe drauf für Details. Bewerte mit den 3 Punkten unten rechts.",
      tip:"🔴 Geht gar nicht · 🟡 Ok · 🟢 Top — 3 Taps und der Algorithmus kennt dich besser.",
      accent:"#ff6b35",
    },
    {
      icon:"✨",
      title:"Spotlight — dein KI-Assistent",
      text:"Hier lebt die Magie. Sag mir was dir gefällt → wir bauen dein persönliches Universum. Stell deine Stimmung ein → perfekter Titel. Frag den Popcorn-Guru alles über Serien und Filme.",
      tip:"Auch ohne KI-Verbindung funktioniert Spotlight — wir haben immer einen Backup-Plan.",
      accent:"#c4a960",
    },
    {
      icon:"🔍",
      title:"Erkunden — Anbieter & Swipe",
      text:"Schau was Netflix, Prime, HBO und Co. für dich haben — Top 10 pro Anbieter, sortiert nach deinem Geschmack. Oder swipe durch Titel um deine Empfehlungen zu verfeinern.",
      tip:"Nach dem Swipe berechnet die KI deine persönlichen Top 10 pro Anbieter neu.",
      accent:"#e84393",
    },
    {
      icon:"🔴🟠🟢",
      title:"Bewerten — so lernt StreamFinder",
      text:"3 kleine Punkte unter jedem Titel. Tippe drauf: Geht gar nicht → Titel verschwindet. Ok → leichter Boost. Top → mehr davon! Nach 10 Bewertungen merkst du den Unterschied.",
      tip:"Gesehen-Button nicht vergessen — gesehene Titel kommen nie mehr in Empfehlungen.",
      accent:"#4ade80",
    },
    {
      icon:"🚀",
      title:"Bereit — los geht's!",
      text:"Wähle deine Streaming-Anbieter, swipe ein paar Titel und lass StreamFinder seinen Job machen. In 2 Minuten weißt du was du heute Abend schaust.",
      tip:"Das ? oben rechts öffnet jederzeit die Hilfe. Viel Spaß!",
      accent:"#a78bfa",
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
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,background:"linear-gradient(135deg,"+(cur.accent||"#ff6b35")+","+( cur.accent||"#e84393")+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:700,marginBottom:0}}>{cur.title}</h2>
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

function RatingFeedback({message,onDone}){
  useEffect(()=>{
    const t=setTimeout(onDone,3000);
    return()=>clearTimeout(t);
  },[]);
  return(
    <div style={{position:"fixed",top:80,left:16,right:16,zIndex:1000,animation:"fadeIn 0.3s ease"}}>
      <div style={{background:"linear-gradient(135deg,#1a1528,#12101e)",border:"1px solid rgba(196,169,96,0.35)",borderRadius:14,padding:"12px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.7)",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>{message.emoji}</span>
        <p style={{fontSize:13,color:"#f0ece4",margin:0,fontFamily:"'DM Sans'",fontWeight:600}}>{message.text}</p>
      </div>
    </div>
  );
}



// ── Stimmungs-Icons SVG ──
const StimmungIcons={
  spannung:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  leicht:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  emotional:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  action:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  duester:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  komplex:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  wahre:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  fantasy:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

const STIMMUNGEN=[
  {id:"spannung",label:"Spannung",sub:"Thriller & Krimi",color:"#ef4444",genres:[53,80,9648]},
  {id:"leicht",label:"Leicht & Lustig",sub:"Komödie & Unterhaltung",color:"#f59e0b",genres:[35,10749,10751]},
  {id:"emotional",label:"Emotional",sub:"Drama & Berührend",color:"#e84393",genres:[18,10749]},
  {id:"action",label:"Action",sub:"Abenteuer & Action",color:"#ff6b35",genres:[28,12]},
  {id:"duester",label:"Düster",sub:"Horror & Neo-Noir",color:"#6366f1",genres:[27,53,80]},
  {id:"komplex",label:"Komplex",sub:"Mystery & Sci-Fi",color:"#a78bfa",genres:[878,9648,14]},
  {id:"wahre",label:"Wahre Geschichten",sub:"Doku & Biografie",color:"#22d3ee",genres:[99,36]},
  {id:"fantasy",label:"Fantasy",sub:"Fantasy & Sci-Fi",color:"#4ade80",genres:[14,878,12]},
];

function Onboarding({onComplete}){
  const [step,setStep]=useState(0); // 0=intro, 1=platforms, 2=stimmung, 3=swipe
  const [platforms,setPlatforms]=useState([]);
  const [stimmungen,setStimmungen]=useState([]);
  const [swipeItems,setSwipeItems]=useState([]);
  const [swipeIdx,setSwipeIdx]=useState(0);
  const [swipeRatings,setSwipeRatings]=useState({});
  const [swipeGenres,setSwipeGenres]=useState({});
  const [swipeLoading,setSwipeLoading]=useState(false);

  function buildGenres(extraGenres={}){
    const genres={...extraGenres};
    stimmungen.forEach(sid=>{
      const st=STIMMUNGEN.find(s=>s.id===sid);
      if(st)(st.genres||[]).forEach(g=>{genres[g]=(genres[g]||0)+3;});
    });
    return genres;
  }

  async function loadSwipeItems(){
    setSwipeLoading(true);
    try{
      const genreIds=[...new Set(stimmungen.flatMap(sid=>STIMMUNGEN.find(s=>s.id===sid)?.genres||[]))];
      const gStr=genreIds.length>0?genreIds.slice(0,3).join("|"):null;
      const page=Math.floor(Math.random()*5)+1;
      const platIds=platforms.flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
      const watchId=platIds.length>0?platIds[Math.floor(Math.random()*platIds.length)]:null;
      const url=TMDB_BASE+"/discover/movie?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=popularity.desc&vote_average.gte=7"+(gStr?"&with_genres="+gStr:"")+(watchId?"&with_watch_providers="+watchId+"&watch_region=DE":"")+"&page="+page;
      const res=await fetch(url).then(r=>r.json());
      const items=(res.results||[]).filter(it=>it.poster_path).slice(0,10).map(it=>({...it,media_type:"movie"}));
      setSwipeItems(items);
    }catch(e){
      setSwipeItems([]);
    }
    setSwipeLoading(false);
  }

  function handleSwipe(item,liked){
    const genres=item.genre_ids||[];
    const key=titleKey(item.title||item.name||"");
    const newRatings={...swipeRatings,[key]:liked?5:1};
    const newGenres={...swipeGenres};
    genres.forEach(g=>{
      newGenres[g]=(newGenres[g]||0)+(liked?3:-1);
    });
    setSwipeRatings(newRatings);
    setSwipeGenres(newGenres);
    if(swipeIdx<swipeItems.length-1){
      setSwipeIdx(i=>i+1);
    }else{
      finishOnboarding(newRatings,newGenres);
    }
  }

  function finishOnboarding(ratings=swipeRatings,extraGenres=swipeGenres){
    const finalGenres=buildGenres(extraGenres);
    const finalRatings=Object.fromEntries(Object.entries(ratings).map(([k,v])=>[k,v]));
    onComplete({
      platforms,
      genres:finalGenres,
      liked:[],liked_items:[],liked_titles:[],
      blocked_titles:[],watched:[],
      ratings:finalRatings,
      
      onboardingDone:true,
    });
  }

  // ── Step: Intro ──
  if(step===0)return(
    <div style={{minHeight:"100vh",background:"#09090f",display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      {/* Cinematic background */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,rgba(196,169,96,0.18),transparent 55%), radial-gradient(ellipse at 85% 85%,rgba(232,67,147,0.12),transparent 50%), radial-gradient(ellipse at 50% 50%,rgba(255,107,53,0.06),transparent 70%)",pointerEvents:"none"}}/>
      {/* Top decorative line */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#c4a960,#ff6b35,transparent)"}}/>

      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 28px 32px",position:"relative",zIndex:1}}>
        {/* Logo + Brand */}
        <div style={{marginBottom:40,textAlign:"center"}}>
          <div style={{width:88,height:88,borderRadius:28,background:"linear-gradient(135deg,#c4a960,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 12px 48px rgba(196,169,96,0.5),0 0 80px rgba(196,169,96,0.15)"}}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div style={{marginBottom:4}}>
            <span style={{fontFamily:"'Instrument Serif',serif",fontSize:38,background:"linear-gradient(135deg,#c4a960,#f5e090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Stream</span>
            <span style={{fontFamily:"'Instrument Serif',serif",fontSize:38,fontStyle:"italic",color:"#f0ece4"}}>Finder</span>
          </div>
          <p style={{fontSize:11,color:"#4a4060",letterSpacing:"2px",textTransform:"uppercase"}}>Kein Stress — wir denken für dich nach</p>
        </div>

        {/* Hero Text */}
        <div style={{textAlign:"center",marginBottom:36,maxWidth:340}}>
          <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:32,color:"#f0ece4",marginBottom:12,lineHeight:1.15}}>Schluss mit 20 Minuten<br/>sinnlosem Scrollen.</h1>
          <p style={{fontSize:15,color:"#8a849a",lineHeight:1.7}}>Dein persönlicher KI-Assistent findet in Sekunden was du heute Abend wirklich schauen willst.</p>
        </div>

        {/* Feature Pills */}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:40,maxWidth:360}}>
          {[
            {icon:"⚡",text:"Sofort personalisiert"},
            {icon:"🎯",text:"Alle Anbieter"},
            {icon:"✨",text:"KI-Assistent"},
            {icon:"🔮",text:"Immer besser"},
          ].map(({icon,text})=>(
            <div key={text} style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.05)",borderRadius:20,padding:"8px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
              <span style={{fontSize:14}}>{icon}</span>
              <span style={{fontSize:12,color:"#c4b8c8",fontWeight:600}}>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={()=>setStep(1)} style={{width:"100%",maxWidth:360,background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:18,padding:"20px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:16,boxShadow:"0 8px 40px rgba(196,169,96,0.4),0 2px 8px rgba(0,0,0,0.3)",letterSpacing:"0.3px"}}>
          Jetzt starten →
        </button>
        <p style={{fontSize:11,color:"#3a3050",marginTop:14,textAlign:"center"}}>Kostenlos · Keine Registrierung</p>
      </div>
    </div>
  );

  // ── Step: Platforms ──
  if(step===1)return(
    <div style={{minHeight:"100vh",background:"#09090f",fontFamily:"'DM Sans',sans-serif",padding:"48px 24px 32px",position:"relative",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 70% 10%,rgba(196,169,96,0.08),transparent 60%)",pointerEvents:"none"}}/>
      {/* Progress */}
      <div style={{display:"flex",gap:6,marginBottom:40,justifyContent:"center",position:"relative",zIndex:1}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:i===1?28:8,height:8,borderRadius:4,background:i<=1?"linear-gradient(90deg,#c4a960,#ff6b35)":"#1e1e30",transition:"all 0.3s"}}/>
        ))}
      </div>
      <div style={{maxWidth:440,margin:"0 auto",position:"relative",zIndex:1}}>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:30,color:"#f0ece4",marginBottom:8,lineHeight:1.2}}>Welche Anbieter hast du?</h2>
        <p style={{fontSize:14,color:"#7a7488",marginBottom:28}}>Wähle alle die du nutzt — wir suchen nur dort.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:32}}>
          {PLATFORMS.map(p=>{
            const active=platforms.includes(p.id);
            return(
              <button key={p.id} onClick={()=>setPlatforms(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])}
                style={{background:active?p.color+"18":"#0d0d1a",border:"2px solid "+(active?p.color:"#1e1e30"),borderRadius:16,padding:"16px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.2s",textAlign:"left",boxShadow:active?"0 4px 20px "+p.color+"30":"none"}}>
                <div style={{width:38,height:38,borderRadius:10,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0,boxShadow:"0 2px 10px "+p.color+"40"}}>{p.icon}</div>
                <span style={{fontSize:13,fontWeight:700,color:active?"#f0ece4":"#666"}}>{p.name}</span>
                {active&&<span style={{marginLeft:"auto",color:p.color,fontWeight:800,fontSize:16}}>✓</span>}
              </button>
            );
          })}
        </div>
        <button onClick={()=>{if(platforms.length===0)return;setStep(2);}} disabled={platforms.length===0}
          style={{width:"100%",background:platforms.length>0?"linear-gradient(135deg,#c4a960,#ff6b35)":"#1e1e30",border:"none",borderRadius:16,padding:"18px",color:"#fff",cursor:platforms.length===0?"not-allowed":"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,transition:"all 0.3s",boxShadow:platforms.length>0?"0 6px 24px rgba(196,169,96,0.3)":"none"}}>
          Weiter → {platforms.length>0&&`(${platforms.length} ausgewählt)`}
        </button>
      </div>
    </div>
  );

  // ── Step: Stimmungen ──
  if(step===2)return(
    <div style={{minHeight:"100vh",background:"#09090f",fontFamily:"'DM Sans',sans-serif",padding:"48px 24px 32px",overflowY:"auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      {/* Progress */}
      <div style={{display:"flex",gap:6,marginBottom:40,justifyContent:"center"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:i===2?28:8,height:8,borderRadius:4,background:i<=2?"linear-gradient(90deg,#c4a960,#ff6b35)":"#1e1e30",transition:"all 0.3s"}}/>
        ))}
      </div>
      <div style={{maxWidth:440,margin:"0 auto"}}>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:30,color:"#f0ece4",marginBottom:8,lineHeight:1.2}}>Was magst du?</h2>
        <p style={{fontSize:14,color:"#7a7488",marginBottom:28}}>Mehrere möglich — sei ehrlich zu dir.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:32}}>
          {STIMMUNGEN.map(s=>{
            const active=stimmungen.includes(s.id);
            return(
              <button key={s.id} onClick={()=>setStimmungen(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])}
                style={{background:active?s.color+"15":"#0d0d1a",border:"2px solid "+(active?s.color:"#1e1e30"),borderRadius:18,padding:"18px 12px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:10,boxShadow:active?"0 4px 20px "+s.color+"30":"none"}}>
                <div style={{width:52,height:52,borderRadius:16,background:active?s.color+"22":"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:active?"0 0 20px "+s.color+"40":"none",transition:"all 0.2s"}}>
                  {StimmungIcons[s.id]?.(active?s.color:"#3a3450",26)}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:active?"#f0ece4":"#666",marginBottom:3}}>{s.label}</div>
                  <div style={{fontSize:10,color:active?s.color:"#3a3450"}}>{s.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={()=>{if(stimmungen.length===0)return;setStep(3);loadSwipeItems();}} disabled={stimmungen.length===0}
          style={{width:"100%",background:stimmungen.length>0?"linear-gradient(135deg,#c4a960,#ff6b35)":"#1e1e30",border:"none",borderRadius:16,padding:"18px",color:"#fff",cursor:stimmungen.length===0?"not-allowed":"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,transition:"all 0.3s",marginBottom:12,boxShadow:stimmungen.length>0?"0 6px 24px rgba(196,169,96,0.3)":"none"}}>
          Weiter →
        </button>
        <button onClick={()=>setStep(1)} style={{width:"100%",background:"transparent",border:"none",color:"#4a4060",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:13,padding:8}}>← Zurück</button>
      </div>
    </div>
  );

  // ── Step: Swipe ──
  if(step===3){
    const cur=swipeItems[swipeIdx];
    return(
      <div style={{minHeight:"100vh",background:"#09090f",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
        {/* Progress */}
        <div style={{display:"flex",gap:6,padding:"40px 24px 0",justifyContent:"center",flexShrink:0}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:i===3?28:8,height:8,borderRadius:4,background:"linear-gradient(90deg,#c4a960,#ff6b35)",transition:"all 0.3s"}}/>
          ))}
        </div>
        <div style={{padding:"20px 24px 0",flexShrink:0,maxWidth:440,margin:"0 auto",width:"100%"}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,color:"#f0ece4",marginBottom:6,lineHeight:1.2}}>Zeig uns deinen Geschmack</h2>
          <p style={{fontSize:13,color:"#7a7488",marginBottom:0}}>Kennst du den Titel? Gefällt er dir?</p>
        </div>
        {/* Swipe counter */}
        <div style={{padding:"12px 24px 0",textAlign:"center",flexShrink:0}}>
          <span style={{fontSize:11,color:"#3a3450"}}>{swipeIdx+1} von {swipeItems.length}</span>
        </div>

        {swipeLoading&&(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block",marginBottom:12}}>🎬</div>
              <p style={{color:"#b0a8b8",fontSize:14}}>Lade Titel…</p>
            </div>
          </div>
        )}

        {!swipeLoading&&!cur&&(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:16}}>✨</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,color:"#f0ece4",marginBottom:12}}>Perfekt!</h3>
              <p style={{fontSize:14,color:"#b0a8b8",marginBottom:24}}>Wir haben genug über deinen Geschmack gelernt.</p>
              <button onClick={()=>finishOnboarding()} style={{background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:14,padding:"16px 32px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>Zur App →</button>
            </div>
          </div>
        )}

        {!swipeLoading&&cur&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 20px",maxWidth:440,margin:"0 auto",width:"100%",minHeight:0}}>
            {/* Poster — feste Höhe damit Buttons sichtbar bleiben */}
            <div style={{height:"calc(100vh - 280px)",maxHeight:420,borderRadius:20,overflow:"hidden",position:"relative",background:"#0a0a12",flexShrink:0}}>
              {(cur.backdrop_path||cur.poster_path)
                ?<img src={"https://image.tmdb.org/t/p/w780"+(cur.backdrop_path||cur.poster_path)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",display:"block"}}/>
                :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>🎬</div>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.95) 100%)"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"14px 16px"}}>
                <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,color:"#fff",margin:"0 0 3px",textShadow:"0 2px 8px rgba(0,0,0,0.8)"}}>{cur.title||cur.name}</h3>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {cur.vote_average>0&&<span style={{fontSize:12,color:"#f5c518",fontWeight:700}}>★ {Math.round(cur.vote_average*10)/10}</span>}
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{(cur.release_date||"").substring(0,4)}</span>
                </div>
              </div>
            </div>
            {/* Buttons */}
            <div style={{display:"flex",gap:8,marginTop:12,flexShrink:0}}>
              <button onClick={()=>handleSwipe(cur,false)}
                style={{flex:1,background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:14,padding:"14px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:13,color:"#ef4444",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                👎 Nein
              </button>
              <button onClick={()=>{if(swipeIdx>=swipeItems.length-1)finishOnboarding();else setSwipeIdx(i=>i+1);}}
                style={{flex:0.8,background:"rgba(255,255,255,0.05)",border:"2px solid #1e1e30",borderRadius:14,padding:"14px 6px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:11,color:"#555",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",lineHeight:1.3}}>
                Kenne<br/>ich nicht
              </button>
              <button onClick={()=>handleSwipe(cur,true)}
                style={{flex:1,background:"rgba(74,222,128,0.1)",border:"2px solid rgba(74,222,128,0.3)",borderRadius:14,padding:"14px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:13,color:"#4ade80",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                👍 Ja
              </button>
            </div>
            <button onClick={()=>finishOnboarding()}
              style={{marginTop:10,background:"transparent",border:"none",color:"#3a3450",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:11,padding:"6px",textAlign:"center"}}>
              Überspringen — direkt zur App
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}


// ── Profil Modal ──
function ProfileModal({profile,onClose,onReset,onUpdateProfile,onStartSwipe}){
  const ratingCount=Object.keys(profile.ratings||{}).length;
  const watchedCount=(profile.watched||[]).length;
  const likedCount=(profile.liked||[]).length;
  const total=ratingCount+watchedCount;
  const topGenres=Object.entries(profile.genres||{})
    .filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,5)
    .map(([g])=>GENRES_TMDB[g]).filter(Boolean);
  const [showResetConfirm,setShowResetConfirm]=useState(false);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxHeight:"90vh",overflowY:"auto",background:"#0d0d1a",borderRadius:"24px 24px 0 0",padding:"0 0 40px"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#2a2340"}}/>
        </div>
        {/* Header */}
        <div style={{padding:"16px 20px 20px",borderBottom:"1px solid #1e1e30"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,color:"#f0ece4",margin:0}}>Mein Profil</h2>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:20,padding:0}}>✕</button>
          </div>
        </div>

        <div style={{padding:"20px"}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
            {[
              {n:ratingCount,l:"Bewertungen"},
              {n:watchedCount,l:"Gesehen"},
              {n:likedCount,l:"Watchlist"},
            ].map(({n,l})=>(
              <div key={l} style={{background:"rgba(196,169,96,0.06)",border:"1px solid rgba(196,169,96,0.12)",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:900,color:"#c4a960",fontFamily:"'DM Sans'"}}>{n}</div>
                <div style={{fontSize:10,color:"#7a7488",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Top Genres */}
          {topGenres.length>0&&(
            <div style={{marginBottom:24}}>
              <p style={{fontSize:11,color:"#5a5468",letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>Dein Geschmack</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {topGenres.map(g=>(
                  <span key={g} style={{background:"rgba(196,169,96,0.1)",border:"1px solid rgba(196,169,96,0.2)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"#c4a960",fontWeight:600}}>{g}</span>
                ))}
              </div>
            </div>
          )}

          {/* Geschmack verfeinern */}
          <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:"16px",marginBottom:16,border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
              <span style={{fontSize:24,flexShrink:0}}>🎯</span>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:"#f0ece4",margin:"0 0 4px"}}>Geschmack verfeinern</p>
                <p style={{fontSize:12,color:"#7a7488",margin:0,lineHeight:1.5}}>Swipe durch neue Titel — je mehr du bewertest desto besser werden deine Empfehlungen.</p>
              </div>
            </div>
            <button onClick={()=>{onClose();onStartSwipe();}}
              style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"12px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>
              Neuen Swipe starten →
            </button>
          </div>

          {/* Anbieter — direkt anzeigen */}
          <div style={{marginBottom:16}}>
            <p style={{fontSize:11,color:"#5a5468",letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>Meine Anbieter</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {PLATFORMS.filter(p=>(profile.platforms||[]).includes(p.id)).map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,background:p.color+"15",border:"1px solid "+p.color+"40",borderRadius:12,padding:"8px 12px"}}>
                  <span style={{fontSize:14,fontWeight:900,color:p.color}}>{p.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#f0ece4"}}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid #1e1e30"}}>
            {!showResetConfirm
              ?<button onClick={()=>setShowResetConfirm(true)} style={{width:"100%",background:"transparent",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:"12px",color:"#6a4040",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>
                Profil zurücksetzen
              </button>
              :<div style={{textAlign:"center"}}>
                <p style={{fontSize:13,color:"#b0a8b8",marginBottom:12}}>Wirklich alles löschen?</p>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setShowResetConfirm(false)} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid #2a2340",borderRadius:12,padding:"12px",color:"#888",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:13}}>Abbrechen</button>
                  <button onClick={onReset} style={{flex:1,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px",color:"#ef4444",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>Ja, alles löschen</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main App ──
function MainApp({profile,onReset}){
  const [prof,setProf]=useState(profile);
  const [tab,setTab]=useState("spotlight");
  const [selectedItem,setSelectedItem]=useState(null);
  const [showHelp,setShowHelp]=useState(false);
  const [showTour,setShowTour]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [ratingFeedback,setRatingFeedback]=useState(null);
  const [showSwipeModal,setShowSwipeModal]=useState(false);

  function updateProfile(updater){
    setProf(prev=>{
      const next=typeof updater==="function"?updater(prev):{...prev,...updater};
      sSet("sf_profile",next);
      return next;
    });
  }

  function handleRate(itemTitle,value,genre_ids){
    if(value>0){
      const genreNames=(genre_ids||[]).slice(0,1).map(g=>GENRES_TMDB[g]).filter(Boolean);
      const feedbacks={
        1:{emoji:"👍",text:"Verstanden — weniger davon"},
        3:{emoji:"🎯",text:genreNames.length>0?"Ok! "+genreNames[0]+" notiert":"Ok — notiert"},
        5:{emoji:"🔥",text:genreNames.length>0?"Top! Mehr "+genreNames[0]+" für dich":"Ausgezeichnet!"},
      };
      const fb=feedbacks[value];
      if(fb)setRatingFeedback(fb);
    }
    updateProfile(p=>{
      const key=titleKey(itemTitle);
      const ratings={...(p.ratings||{}),[key]:value};
      const genres={...(p.genres||{})};
      (genre_ids||[]).forEach(g=>{
        const boost=value>=4?3:value>=3?1:value<=2?-2:0;
        genres[g]=(genres[g]||0)+boost;
      });
      return{...p,ratings,genres};
    });
    window.dispatchEvent(new CustomEvent("sf_rated",{detail:{title:itemTitle,stars:value}}));
  }

  function handleLike(item){
    updateProfile(p=>{
      const id=item.id;
      const liked=p.liked||[];
      const isLiked=liked.includes(id);
      const liked_items=p.liked_items||[];
      const liked_titles=p.liked_titles||[];
      const key=titleKey(item.title||item.name||"");
      if(isLiked){
        return{...p,
          liked:liked.filter(x=>x!==id),
          liked_items:liked_items.filter(x=>x.id!==id),
          liked_titles:liked_titles.filter(x=>x!==key),
        };
      }
      return{...p,
        liked:[...liked,id],
        liked_items:[...liked_items,{...item,_likedAt:Date.now()}],
        liked_titles:[...liked_titles,key],
      };
    });
  }

  function handleWatched(item){
    updateProfile(p=>{
      const id=item.id;
      const watched=p.watched||[];
      if(watched.find(w=>w.id===id))return p;
      return{...p,watched:[...watched,{
        id,title:item.title||item.name||"",
        poster_path:item.poster_path,
        genre_ids:item.genre_ids||[],
        media_type:item.media_type||"movie",
        _watchedAt:Date.now(),
      }]};
    });
    window.dispatchEvent(new CustomEvent("sf_watched",{detail:{id:item.id,title:item.title||item.name||""}}));
  }

  function handleBlock(itemTitle){
    const key=titleKey(itemTitle);
    updateProfile(p=>{
      const blocked=p.blocked_titles||[];
      if(blocked.includes(key))return p;
      return{...p,blocked_titles:[...blocked,key]};
    });
    window.dispatchEvent(new CustomEvent("sf_blocked",{detail:{title:itemTitle}}));
  }

  function handleRemoveWatched(id){
    updateProfile(p=>({...p,watched:(p.watched||[]).filter(w=>w.id!==id)}));
  }

  function handleUnblock(key){
    updateProfile(p=>({...p,blocked_titles:(p.blocked_titles||[]).filter(k=>k!==key)}));
  }

  const cardProps={
    profile:prof,
    onRate:handleRate,
    onLike:handleLike,
    onWatched:handleWatched,
    onBlock:handleBlock,
    onSelect:setSelectedItem,
  };

  const tabs=[
    {id:"spotlight",label:"Spotlight"},
    {id:"browse",label:"Erkunden"},
    {id:"liked",label:"Watchlist"},
    {id:"history",label:"Verlauf"},
  ];

  // SVG Tab Icons
  const TabIcons={
    spotlight:(active)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#c4a960":"#4a4060"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    browse:(active)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#c4a960":"#4a4060"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    liked:(active)=><svg width="22" height="22" viewBox="0 0 24 24" fill={active?"#c4a960":"none"} stroke={active?"#c4a960":"#4a4060"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    history:(active)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#c4a960":"#4a4060"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };

  return(
    <div style={{minHeight:"100vh",background:"#09090f",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",paddingBottom:90}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      {ratingFeedback&&<RatingFeedback message={ratingFeedback} onDone={()=>setRatingFeedback(null)}/>}
      {selectedItem&&<DetailModal item={selectedItem} profile={prof} onClose={()=>setSelectedItem(null)} onRate={handleRate} onLike={handleLike} onWatched={handleWatched} onBlock={handleBlock}/>}
      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)} activeTab={tab}/>}
      {showTour&&<TourModal onClose={()=>setShowTour(false)}/>}
      {showProfile&&<ProfileModal profile={prof} onClose={()=>setShowProfile(false)} onReset={onReset} onUpdateProfile={updateProfile} onStartSwipe={()=>setShowSwipeModal(true)}/>}
      {showSwipeModal&&(
        <div style={{position:"fixed",inset:0,background:"#09090f",zIndex:400,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 18px",borderBottom:"1px solid #1e1e30",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setShowSwipeModal(false)} style={{background:"transparent",border:"none",color:"#b0a8b8",cursor:"pointer",fontSize:14,fontFamily:"'DM Sans'",fontWeight:600}}>← Zurück</button>
            <span style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>Geschmack verfeinern</span>
          </div>
          <UniversalSwipe profile={prof} cardProps={cardProps} onSelect={setSelectedItem} onDone={()=>setShowSwipeModal(false)}/>
        </div>
      )}

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(9,9,15,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid #1e1e30",padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#c4a960,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div>
            <span style={{fontFamily:"'Instrument Serif',serif",fontSize:20,background:"linear-gradient(135deg,#c4a960,#f5e090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Stream</span>
            <span style={{fontFamily:"'Instrument Serif',serif",fontSize:20,fontStyle:"italic",color:"#f0ece4"}}>Finder</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowHelp(true)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"5px 8px",cursor:"pointer"}}>
            <span style={{fontSize:14,color:"#b0a8b8",lineHeight:1}}>?</span>
            <span style={{fontSize:8,color:"#4a4060",fontFamily:"'DM Sans'",fontWeight:600}}>Hilfe</span>
          </button>
          <button onClick={()=>setShowProfile(true)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"5px 8px",cursor:"pointer"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b0a8b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style={{fontSize:8,color:"#4a4060",fontFamily:"'DM Sans'",fontWeight:600}}>Profil</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {tab==="spotlight"&&<SpotlightTab profile={prof} cardProps={cardProps} onSelect={setSelectedItem}/>}
        {tab==="browse"&&<BrowseTab profile={prof} cardProps={cardProps} onSelect={setSelectedItem}/>}
        {tab==="liked"&&<LikedTab profile={prof} cardProps={cardProps}/>}
        {tab==="history"&&(
          <div style={{padding:"16px 18px"}}>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,marginBottom:16}}>Verlauf</h2>
            <HistoryList watched={prof.watched||[]} ratings={prof.ratings||{}} onSelect={setSelectedItem} onRemove={handleRemoveWatched}/>
            {(prof.blocked_titles||[]).length>0&&<CollapsibleBlocked blocked={prof.blocked_titles||[]} onUnblock={handleUnblock}/>}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(9,9,15,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid #1e1e30",display:"flex",zIndex:100}}>
        {tabs.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,background:"none",border:"none",padding:"10px 0 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s"}}>
              {TabIcons[t.id]?.(active)}
              <span style={{fontSize:9,fontWeight:active?700:500,color:active?"#c4a960":"#4a4060",fontFamily:"'DM Sans'",letterSpacing:"0.3px"}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default function StreamFinder(){
  const [profile,setProfile]=useState(()=>sGet("sf_profile"));
  function handleComplete(p){sSet("sf_profile",p);setProfile(p);}
  function handleReset(){sDel("sf_profile");setProfile(null);}
  if(!profile||!profile.onboardingDone)return<Onboarding onComplete={handleComplete}/>;
  return<MainApp profile={profile} onReset={handleReset}/>;
}
