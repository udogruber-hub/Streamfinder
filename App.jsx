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

const WEEKDAY_VIBES = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

var _mem = {};
function sGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return _mem[k]?JSON.parse(_mem[k]):null;}}
function sSet(k,v){var s=JSON.stringify(v);try{localStorage.setItem(k,s);}catch(e){_mem[k]=s;}}
function sDel(k){try{localStorage.removeItem(k);}catch(e){delete _mem[k];}}

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
  // Nur deutsche + englische Originaltitel, kein Anime
  var langs=langFilter&&langFilter.length>0?langFilter:["de","en"];
  var params={with_watch_providers:providerIds.join("|"),watch_region:"DE",with_watch_monetization_types:"flatrate",sort_by:sortBy||"popularity.desc",page:page||1,"vote_count.gte":100,with_original_language:langs.join("|")};
  if(genreStr)params.with_genres=genreStr;
  if(!genreStr||!genreStr.includes("16"))params.without_genres="16";
  return tmdbFetch("/discover/"+mt,params);
}
function getDetails(mediaType,id){ return tmdbFetch("/"+mediaType+"/"+id,{append_to_response:"credits,watch/providers,reviews,external_ids"}); }
function getTrending(mediaType){ return fetch(TMDB_BASE+"/trending/"+mediaType+"/week?api_key="+TMDB_API_KEY+"&language=de-DE").then(r=>r.json()); }

async function getSimilarTitles(mediaType,id,providerIds,profile){
  try{
    const mt=mediaType==="tv"?"tv":"movie";
    const res=await tmdbFetch("/"+mt+"/"+id+"/similar",{page:1});
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const blocked=new Set(profile.blocked_titles||[]);
    const ratings=profile.ratings||{};
    const liked=new Set(profile.liked||[]);
    return (res.results||[]).map(r=>({...r,media_type:mt})).filter(r=>{
      if(watched.has(r.id)||liked.has(r.id))return false;
      const t=titleKey(r.title||r.name||"");
      if(blocked.has(t))return false;
      const myRating=ratings[t]||0;
      if(myRating>0&&myRating<=2)return false;
      if((r.vote_average||0)<6)return false;
      return true;
    }).slice(0,8);
  }catch(e){return[];}
}

async function callAI(messages,systemPrompt){
  try{
    const res=await fetch(PROXY_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({max_tokens:600,messages:[{role:"system",content:systemPrompt},...messages]}),
    });
    if(!res.ok){const errText=await res.text();throw new Error("Server Fehler "+res.status+": "+errText.substring(0,200));}
    const data=await res.json();
    if(data.error){
      const msg=data.error.message||JSON.stringify(data.error);
      if(msg.includes("rate_limit")||msg.includes("Rate limit")||msg.includes("quota")||msg.includes("429"))throw new Error("RATE_LIMIT");
      throw new Error(msg.substring(0,200));
    }
    if(data.choices&&data.choices[0]&&data.choices[0].message)return data.choices[0].message.content;
    throw new Error("Keine Antwort vom Server.");
  }catch(e){console.error("callAI error:",e);throw e;}
}

function buildCtx(profile){
  const platforms=(profile.platforms||[]).map(id=>PLATFORMS.find(p=>p.id===id)?.name||id).join(", ");
  const ratings=profile.ratings||{};
  const watched=profile.watched||[];
  const titleMap=watched.reduce((acc,w)=>{acc[titleKey(w.title)]=w.title;return acc;},(profile.liked_items||[]).reduce((acc,it)=>{acc[titleKey(it.title||it.name||"")]=it.title||it.name||"";return acc;},{}));
  const rated5=Object.entries(ratings).filter(([,v])=>v===5).map(([k])=>titleMap[k]||k).slice(0,6).join(", ");
  const rated4=Object.entries(ratings).filter(([,v])=>v===3).map(([k])=>titleMap[k]||k).slice(0,6).join(", ");
  const rated2=Object.entries(ratings).filter(([,v])=>v===1).map(([k])=>titleMap[k]||k).slice(0,4).join(", ");
  const rated1=rated2;
  const top=[...Object.entries(ratings).filter(([,v])=>v>=3).map(([k,v])=>{const label=v===5?"🟢":v===3?"🟠":"";return label+(titleMap[k]||k);})].slice(0,8).join(", ");
  const low=[...Object.entries(ratings).filter(([,v])=>v===1).map(([k])=>titleMap[k]||k)].slice(0,5).join(", ");
  const blocked=(profile.blocked_titles||[]).slice(0,8).join(", ");
  const watchedTitles=watched.slice(0,10).map(w=>w.title).join(", ");
  const watchlist=(profile.liked_items||[]).map(it=>it.title||it.name||"").slice(0,6).join(", ");
  const genreEntries=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6);
  const maxGenre=genreEntries[0]?.[1]||1;
  const topGenres=genreEntries.map(([gid,v])=>{const pct=Math.round(v/maxGenre*100);return (GENRES_TMDB[gid]||gid)+(pct>=80?" (Liebling)":pct>=50?" (mag ich)":"");}).join(", ");
  const negGenres={};
  watched.forEach(w=>{const r=ratings[titleKey(w.title)]||0;if(r<=2&&r>0)(w.genre_ids||[]).forEach(g=>{negGenres[g]=(negGenres[g]||0)+1;});});
  const dislikedGenres=Object.entries(negGenres).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>GENRES_TMDB[g]||"").filter(Boolean).join(", ");
  const topGenreNames=genreEntries.slice(0,3).map(([gid])=>GENRES_TMDB[gid]||"").filter(Boolean);
  const totalRatings=Object.values(ratings).filter(v=>v>0).length;
  const avgRating=totalRatings>0?Math.round(Object.values(ratings).filter(v=>v>0).reduce((a,b)=>a+b,0)/totalRatings*10)/10:0;
  let taste="";
  if(topGenreNames.length>0)taste+=topGenreNames.join("/")+"-Fan";
  if(rated5)taste+=". 🟢 Top: "+rated5;
  if(rated4)taste+=". 🟠 Ok: "+rated4;
  if(rated2)taste+=". 🔴 Nope: "+rated2;
  if(dislikedGenres)taste+=". Meidet Genres: "+dislikedGenres;
  if(avgRating>0)taste+=". Durchschnittlich bewertet: "+avgRating+"★ ("+totalRatings+" Titel)";
  if(avgRating>=4)taste+=" — sehr wählerisch";
  else if(avgRating>=3)taste+=" — selektiv";
  const patterns=[];
  if(rated5&&(rated5.toLowerCase().includes("breaking")||rated5.toLowerCase().includes("wire")||rated5.toLowerCase().includes("sopranos")))patterns.push("bevorzugt komplexe Charakterstudien");
  if(dislikedGenres.includes("Romantik")||dislikedGenres.includes("Komödie"))patterns.push("meidet leichte Unterhaltung");
  if(topGenreNames.includes("Thriller")||topGenreNames.includes("Krimi"))patterns.push("liebt Spannung und Mysterium");
  if(patterns.length>0)taste+=". Muster: "+patterns.join(", ");
  return{platforms,top,low,blocked,watched:watchedTitles,topGenres,watchlist,taste,rated5,rated4,rated2,rated1,dislikedGenres,totalRatings,avgRating};
}

async function enrichWithTMDB(rec,profile){
  try{
    const isTV=rec.type==="Serie"||rec.type==="tv"||rec.type==="serie";
    const isMovie=rec.type==="Film"||rec.type==="movie"||rec.type==="film";
    const multiRes=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=en-US&query="+encodeURIComponent(rec.title)).then(r=>r.json());
    const allResults=(multiRes.results||[]).filter(r=>r.media_type==="tv"||r.media_type==="movie");
    const typeFiltered=isTV?allResults.filter(r=>r.media_type==="tv"):isMovie?allResults.filter(r=>r.media_type==="movie"):allResults;
    const pool=typeFiltered.length>0?typeFiltered:allResults;
    const exact=pool.find(r=>(r.title||r.name||"").toLowerCase().trim()===rec.title.toLowerCase().trim());
    const found=exact||pool[0];
    if(!found)return null;
    return{...found,_aiReason:rec.reason,_platform:rec.platform};
  }catch{return null;}
}

async function getSmartRecommendations(profile){
  const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
  const allIds=userPlats.length>0?userPlats.flatMap(p=>p.tmdbIds):[8,9,337,350];
  const ratings=profile.ratings||{};
  const watched=profile.watched||[];
  const watchedIds=new Set(watched.map(w=>w.id));
  const likedIds=new Set(profile.liked||[]);
  const blockedKeys=new Set(profile.blocked_titles||[]);
  const genreScore={};
  Object.entries(profile.genres||{}).forEach(([g,v])=>{genreScore[g]=v;});
  (profile.liked_items||[]).forEach(it=>{(it.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)+3;});});
  watched.forEach(w=>{
    const myRating=ratings[titleKey(w.title)]||0;
    if(myRating>=4)(w.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)+(myRating-3)*2;});
    if(myRating>0&&myRating<=2)(w.genre_ids||[]).forEach(g=>{genreScore[g]=(genreScore[g]||0)-(3-myRating)*2;});
  });
  const topGenres=Object.entries(genreScore).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([g])=>g);
  const badGenres=Object.entries(genreScore).filter(([,v])=>v<-2).map(([g])=>g);
  const genreStr=topGenres.length>0?topGenres.join("|"):null;
  const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
  const topRatedItems=watched.filter(w=>(ratings[titleKey(w.title)]||0)>=4).slice(0,3);
  const sources=await Promise.all([
    getTrending("tv"),getTrending("movie"),
    discoverTitles("serie",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("film",allIds,genreStr,1,"vote_average.desc",langFilter),
    discoverTitles("serie",allIds,genreStr,2,"popularity.desc",langFilter),
    discoverTitles("film",allIds,genreStr,2,"popularity.desc",langFilter),
    ...topRatedItems.map(w=>getSimilarTitles(w.media_type||"movie",w.id,allIds,profile)),
  ]).catch(()=>[]);
  const similarResults=sources.slice(6).flat().filter(Boolean).map(r=>({...r,_source:"similar",_score_boost:5}));
  const all=[
    ...((sources[0]?.results||[]).map(r=>({...r,media_type:"tv",_source:"trending"}))),
    ...((sources[1]?.results||[]).map(r=>({...r,media_type:"movie",_source:"trending"}))),
    ...((sources[2]?.results||[]).map(r=>({...r,media_type:"tv",_source:"top_rated"}))),
    ...((sources[3]?.results||[]).map(r=>({...r,media_type:"movie",_source:"top_rated"}))),
    ...((sources[4]?.results||[]).map(r=>({...r,media_type:"tv",_source:"popular"}))),
    ...((sources[5]?.results||[]).map(r=>({...r,media_type:"movie",_source:"popular"}))),
    ...similarResults,
  ];
  const seen=new Set();
  const scored=all.filter(it=>{
    if(!it||!it.id)return false;
    if(seen.has(it.id))return false;
    seen.add(it.id);
    if(watchedIds.has(it.id)||likedIds.has(it.id))return false;
    const t=titleKey(it.title||it.name||"");
    if(blockedKeys.has(t))return false;
    const myRating=ratings[t]||0;
    if(myRating>0&&myRating<3)return false;
    if((it.vote_average||0)<5.5)return false;
    if(badGenres.length>0&&(it.genre_ids||[]).every(g=>badGenres.includes(String(g))))return false;
    return true;
  }).map(it=>{
    let score=(it.vote_average||0)*2;
    (it.genre_ids||[]).forEach(g=>{score+=(genreScore[g]||0)*3;});
    score+=Math.min(10,(it.popularity||0)/100);
    const year=parseInt((it.release_date||it.first_air_date||"2000").substring(0,4));
    if(year>=2022)score+=4;else if(year>=2019)score+=2;
    if(it._source==="trending")score+=5;
    if(it._source==="top_rated"&&(it.vote_average||0)>=8)score+=6;
    if(it._source==="similar")score+=(it._score_boost||5);
    return{...it,_score:score};
  }).sort((a,b)=>b._score-a._score);
  const series=scored.filter(it=>it.media_type==="tv");
  const films=scored.filter(it=>it.media_type==="movie");
  const mixed=[];
  const maxLen=Math.max(series.length,films.length);
  for(let i=0;i<maxLen&&mixed.length<20;i++){
    if(i<series.length)mixed.push(series[i]);
    if(i<films.length&&mixed.length<20)mixed.push(films[i]);
  }
  return mixed.slice(0,20);
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
  const msg=`Wähle einen ÜBERRASCHENDEN Titel.\nPlattformen: ${ctx.platforms}.\nGESEHEN (NICHT wählen!): ${ctx.watched||"nichts"}.\nBLOCKIERT (NICHT wählen!): ${ctx.blocked||"nichts"}.\nHASST: ${ctx.low||"nichts"}.\nprophecy = mystisch-dramatische Prophezeiung Deutsch. Max 2 Sätze.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

// ── LED Bewertung ──
// Intern: Rot=1, Orange=3, Grün=5
function StarRating({itemTitle,profile,onRate,size}){
  const key=titleKey(itemTitle);
  const current=(profile.ratings||{})[key]||0;
  const [hover,setHover]=useState(0);
  const sz=size||20;
  const leds=[
    {value:1,color:"#ef4444",glow:"rgba(239,68,68,0.6)",label:"Nope"},
    {value:3,color:"#f97316",glow:"rgba(249,115,22,0.6)",label:"Ok"},
    {value:5,color:"#4ade80",glow:"rgba(74,222,128,0.6)",label:"Top"},
  ];
  function activeLed(val){if(val>=5)return 5;if(val>=3)return 3;if(val>=1)return 1;return 0;}
  const activeVal=activeLed(hover||current);
  return(
    <div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {leds.map(led=>{
        const lit=hover>0?activeLed(hover)===led.value:activeLed(current)===led.value;
        return(
          <button key={led.value}
            onClick={e=>{e.stopPropagation();e.preventDefault();onRate(itemTitle,current===led.value?0:led.value);}}
            onMouseEnter={()=>setHover(led.value)} onMouseLeave={()=>setHover(0)}
            title={led.label}
            style={{background:"transparent",border:"none",cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minWidth:36,minHeight:36}}>
            <div style={{width:sz*0.6,height:sz*0.6,borderRadius:"50%",background:lit?led.color:"#1e1e30",border:"1.5px solid "+(lit?led.color:"#3a3344"),boxShadow:lit?"0 0 "+(sz*0.4)+"px "+(sz*0.2)+"px "+led.glow:"none",transition:"all 0.15s ease",transform:lit?"scale(1.2)":"scale(1)"}}/>
          </button>
        );
      })}
      </div>
      <div style={{display:"flex",gap:8,marginTop:3}}>
        {leds.map(led=>(
          <span key={led.value} style={{fontSize:9,color:activeLed(current)===led.value?led.color:"#3a3344",fontFamily:"'DM Sans'",transition:"color 0.15s"}}>{led.label}</span>
        ))}
      </div>
    </div>
  );
}

function LedStrip({itemTitle,profile,onRate,genre_ids}){
  const key=titleKey(itemTitle);
  const current=(profile.ratings||{})[key]||0;
  const dots=[
    {v:1,color:"#ef4444",glow:"rgba(239,68,68,0.6)",label:"Nope"},
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

function PopcornMeter({item}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const title=item.title||item.name||"";
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];
  async function check(){
    setLoading(true);
    const system=`Du bist ein witziger Streaming-Kritiker. Antworte NUR mit JSON, keine Backticks. Format: {"score":85,"label":"...","reason":"...","popcorn":"..."}`;
    const msg=`Wie gut passt "${title}" zu einem ${day}abend?\nscore=0-100. label=lustig. reason=1 Satz Deutsch. popcorn=Emojis.`;
    try{const text=await callAI([{role:"user",content:msg}],system);setData(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setData(null);}
    setLoading(false);
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

// ── Help Modal — aktualisiert mit 4 Tabs ──
function HelpModal({onClose,activeTab}){
  const [selTab,setSelTab]=useState(activeTab||"spotlight");
  const TABS=[
    {id:"spotlight",label:"✨ Spotlight"},
    {id:"browse",   label:"🔍 Erkunden"},
    {id:"liked",    label:"❤️ Watchlist"},
    {id:"profile",  label:"👤 Profil"},
  ];
  const HELP={
    spotlight:{
      title:"✨ Spotlight — deine Empfehlungen",
      intro:"StreamFinder lernt deinen Geschmack durch Swipen und zeigt dir dann genau die richtigen Titel. Alles startet hier.",
      items:[
        {icon:"🎬",title:"Genre wählen",text:"Tippe eine der 12 Genre-Kacheln — StreamFinder zeigt sofort 3 passende Empfehlungen. Nochmal tippen hebt die Auswahl auf."},
        {icon:"👈",title:"Wegwischen",text:"Empfehlung nach links wischen = ausblenden, ein neuer Titel rückt nach. Funktioniert für alle Karten."},
        {icon:"🔴🟠🟢",title:"Bewerten",text:"Nope · Ok · Top — tippe die 3 Punkte unter jedem Titel. Je mehr du bewertest, desto besser werden die Empfehlungen."},
        {icon:"🎴",title:"Swipe für bessere Empfehlungen",text:"Der wichtigste Button! In Erkunden → 'Persönliche Empfehlungen' swipen. Die KI sucht danach ähnliche Titel bei allen Anbietern — genau auf dich zugeschnitten."},
        {icon:"🔍",title:"Sag mir was mir gefällt",text:"Nenn einen Titel den du liebst — die KI findet sofort ähnliche. Probiere: Breaking Bad, Inception, Peaky Blinders."},
        {icon:"🎚️",title:"Vibe-Meter",text:"Düster & tief? Leicht & locker? Stelle 3 Regler ein — die KI findet den perfekten Titel für deine aktuelle Stimmung."},
        {icon:"🍿",title:"Popcorn-Guru",text:"Stell jede Frage: 'Was läuft auf Netflix wie Breaking Bad?' oder 'Bester Thriller für heute Abend?' — er antwortet sofort."},
        {icon:"✨",title:"Überrasch mich",text:"1 Klick. 1 perfekter Titel. Basierend auf allem was du bisher bewertet hast."},
      ]
    },
    browse:{
      title:"🔍 Erkunden — deine Anbieter",
      intro:"Hier siehst du deine persönlichen Top 10 pro Streaming-Anbieter. Die Liste wird durch Swipen immer besser.",
      items:[
        {icon:"🎴",title:"So funktioniert es",text:"Zuerst 'Persönliche Empfehlungen' antippen und swipen. Die KI analysiert deine Auswahl und füllt alle Anbieter mit passenden Titeln — ähnlich zu dem was du gemocht hast."},
        {icon:"📺",title:"Anbieter aufklappen",text:"Tippe Netflix, Prime, HBO etc. an — deine persönliche Top 10 erscheint. Sortiert nach Übereinstimmung mit deinem Geschmack."},
        {icon:"👈",title:"Titel ausblenden",text:"Nach links wischen entfernt einen Titel dauerhaft — sofort rückt ein neuer nach aus deiner KI-Reserve."},
        {icon:"✓",title:"Gesehen",text:"Tippe 'Gesehen' direkt in der Liste — Titel verschwindet, neuer rückt nach."},
        {icon:"🔴🟠🟢",title:"Bewerten",text:"Nope · Ok · Top direkt in der Liste bewerten — beeinflusst sofort zukünftige Empfehlungen."},
        {icon:"🔍",title:"Suche",text:"Oben jeden Titel suchen — mit allen Infos, Bewertung und direktem Zugriff."},
      ]
    },
    liked:{
      title:"❤️ Watchlist",
      intro:"Alle Titel die du noch sehen möchtest — deine persönliche Merkliste.",
      items:[
        {icon:"🤍",title:"Merken",text:"Tippe das Herz-Symbol bei jedem Titel — er landet auf der Watchlist. Geht aus allen Bereichen der App."},
        {icon:"❤️",title:"Entfernen",text:"Rotes Herz antippen = wieder entfernen. Liste bleibt nach App-Neustart erhalten."},
        {icon:"✓",title:"Als gesehen markieren",text:"Tippe 'Gesehen' — Titel wandert in den Verlauf und verschwindet von der Watchlist."},
        {icon:"💡",title:"Tipp",text:"Gemerkte Titel fließen in deine Empfehlungen ein. Je aktiver du die App nutzt, desto besser wird sie."},
      ]
    },
    profile:{
      title:"👤 Mein Profil",
      intro:"Deine Statistiken, Anbieter und Einstellungen — alles auf einen Blick.",
      items:[
        {icon:"📊",title:"Statistiken",text:"Wie viele Titel du bewertet, gesehen und gemerkt hast."},
        {icon:"🎯",title:"Dein Geschmack",text:"Deine Lieblingsgenres — automatisch berechnet aus Bewertungen und Swipes. Wird mit jeder Aktion besser."},
        {icon:"📺",title:"Anbieter ändern",text:"Hier kannst du deine Streaming-Dienste anpassen — wird sofort für Empfehlungen übernommen."},
        {icon:"🗑️",title:"Zurücksetzen",text:"Löscht alle Daten und startet neu. Ganz unten im Profil."},
      ]
    },
  };
  const cur=HELP[selTab];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxHeight:"90vh",overflowY:"auto",background:"#0d0d1a",borderRadius:"24px 24px 0 0",paddingBottom:40}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#2a2340"}}/>
        </div>
        <div style={{padding:"12px 20px 16px",borderBottom:"1px solid #1e1e30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,color:"#f0ece4",margin:0}}>Hilfe</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:20,padding:0}}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,padding:"12px 16px",overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setSelTab(t.id)}
              style={{background:selTab===t.id?"rgba(196,169,96,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(selTab===t.id?"rgba(196,169,96,0.4)":"rgba(255,255,255,0.08)"),borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12,color:selTab===t.id?"#c4a960":"#7a7488",fontFamily:"'DM Sans'",fontWeight:selTab===t.id?700:400,whiteSpace:"nowrap"}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{padding:"8px 20px"}}>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,color:"#f0ece4",margin:"0 0 6px"}}>{cur.title}</h3>
          <p style={{fontSize:13,color:"#b0a8b8",lineHeight:1.6,marginBottom:16}}>{cur.intro}</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {cur.items.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,0.03)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:3}}>{item.title}</div>
                  <div style={{fontSize:12,color:"#8a849a",lineHeight:1.5}}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{width:"100%",marginTop:16,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:14,color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>
            Verstanden! 🍿
          </button>
        </div>
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
      <div style={{background:"linear-gradient(180deg,#13121f,#09090f)",minHeight:"100vh",maxWidth:820,margin:"0 auto",paddingBottom:100}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"relative",height:220}}>
          {backdrop?<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:0.6}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)"}}/>}
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
                {score>0&&<div style={{display:"inline-flex",alignItems:"center",gap:3,background:`${scoreColor}18`,padding:"3px 8px",borderRadius:6}}>
                  <span style={{color:"#f5c518",fontSize:12}}>★</span>
                  <span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
                </div>}
              </div>
            </div>
          </div>
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
          <div style={{display:"flex",gap:10,marginTop:16,marginBottom:8}}>
            <button onClick={()=>onLike(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isLiked?"rgba(229,9,20,0.13)":"#12121f",border:isLiked?"1px solid rgba(229,9,20,0.33)":"1px solid #1e1e30",color:isLiked?"#E50914":"#b0a8b8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
            <button onClick={()=>onWatched(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isWatched?"rgba(59,130,246,0.13)":"#12121f",border:isWatched?"1px solid rgba(59,130,246,0.33)":"1px solid #1e1e30",color:isWatched?"#3b82f6":"#b0a8b8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isWatched?"✅ Gesehen":"👁 Als gesehen"}</button>
          </div>
          <button onClick={onClose} style={{position:"fixed",bottom:24,right:24,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:30,padding:"14px 24px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,boxShadow:"0 8px 32px rgba(255,107,53,0.4)",zIndex:201,display:"flex",alignItems:"center",gap:6}}>← Zurück</button>
        </div>
      </div>
    </div>
  );
}

function SwipeToBlock({onBlock,children}){
  const [startX,setStartX]=useState(null);
  const [offsetX,setOffsetX]=useState(0);
  const [dismissed,setDismissed]=useState(false);
  const THRESH=80;
  function onTouchStart(e){setStartX(e.touches[0].clientX);}
  function onTouchMove(e){if(startX===null)return;const dx=e.touches[0].clientX-startX;if(dx<0)setOffsetX(dx);}
  function onTouchEnd(){
    if(offsetX<-THRESH){setDismissed(true);setTimeout(()=>onBlock(),300);}
    else{setOffsetX(0);setStartX(null);}
  }
  const opacity=Math.max(0,1+offsetX/150);
  const blockOpacity=Math.min(1,Math.abs(offsetX)/THRESH);
  if(dismissed)return null;
  return(
    <div style={{position:"relative",overflow:"hidden",borderRadius:16,marginBottom:10,animation:"fadeIn 0.4s ease"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:100,background:"linear-gradient(to left,#1a0a0a,transparent)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,opacity:blockOpacity,pointerEvents:"none"}}>
        <span style={{fontSize:11,color:"#ef4444",fontWeight:600,fontFamily:"'DM Sans'"}}>Ausblenden</span>
      </div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{transform:`translateX(${offsetX}px)`,transition:startX?undefined:"transform 0.3s ease",opacity,userSelect:"none"}}>
        {children}
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
  const aiReason=item._aiReason;
  const aiEmoji=item._aiEmoji;
  const platform=item._platform;
  const pl=PLATFORMS.find(p=>p.name===platform)||null;
  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:8,position:"relative"}}>
      <div onClick={()=>onSelect(item)} style={{padding:14,display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}}>
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
          {aiReason?<p style={{margin:"0 0 5px",fontSize:12,color:"#ff6b35",lineHeight:1.4,fontStyle:"italic"}}>✨ {aiReason}</p>
            :item.overview&&<p style={{margin:"0 0 5px",fontSize:12,color:"#a09aaa",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {score>0&&<div style={{display:"inline-flex",alignItems:"center",gap:3,background:`${scoreColor}18`,padding:"2px 8px",borderRadius:6}}>
              <span style={{color:"#f5c518",fontSize:11}}>★</span>
              <span style={{color:scoreColor,fontSize:12,fontWeight:900}}>{score}</span>
            </div>}
            <button onClick={e=>{e.stopPropagation();onWatched(item);}} style={{background:isWatched?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.1)"),borderRadius:20,padding:"2px 10px",cursor:"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600}}>
              {isWatched?"✓ Gesehen":"Gesehen"}
            </button>
          </div>
        </div>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{padding:"4px 12px 10px",display:"flex",justifyContent:"flex-end"}}>
        <LedStrip itemTitle={title} profile={profile} onRate={onRate} genre_ids={item.genre_ids||[]}/>
      </div>
    </div>
  );
}

function HeroCard({item,profile,onRate,onLike,onWatched,onBlock,onSelect}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w500"+item.backdrop_path:null;
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  return(
    <div style={{borderRadius:24,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:14,cursor:"pointer"}} onClick={()=>onSelect(item)}>
      <div style={{position:"relative",height:190,background:"#0d0d18"}}>
        {backdrop&&<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:0.55}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,#0d0d18 100%)"}}/>
        {score>0&&<div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",gap:4}}>
          <span style={{color:"#f5c518",fontSize:12}}>★</span><span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
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
            {item._aiReason?<p style={{margin:"0 0 8px",fontSize:13,color:"#ff6b35",lineHeight:1.5,fontStyle:"italic"}}>✨ {item._aiReason}</p>
              :item.overview&&<p style={{margin:"0 0 8px",fontSize:13,color:"#b0a8b8",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
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

// ── Swipe Card ──
function SwipeCard({item,color,onSwipeRight,onSwipeLeft,onTap}){
  const [startX,setStartX]=useState(null);
  const [offsetX,setOffsetX]=useState(0);
  const [gone,setGone]=useState(null);
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const poster=item.poster_path?"https://image.tmdb.org/t/p/w500"+item.poster_path:null;
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w500"+item.backdrop_path:null;
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
      onTouchStart={e=>{e.stopPropagation();onStart(e.touches[0].clientX);}}
      onTouchMove={e=>{e.preventDefault();e.stopPropagation();onMove(e.touches[0].clientX);}}
      onTouchEnd={e=>{e.stopPropagation();onEnd();}}
      onClick={()=>Math.abs(offsetX)<5&&onTap(item)}
      style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",cursor:"grab",touchAction:"none",transition:gone||startX?undefined:"transform 0.3s ease",transform,userSelect:"none",border:"2px solid "+(color||"#2a2340")}}>
      {(poster||backdrop)?<img src={poster||backdrop} alt="" onLoad={e=>e.target.style.opacity=1} style={{width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none",objectPosition:"center",opacity:0,transition:"opacity 0.3s ease"}}/>
        :<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>🎬</div>}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.4) 50%,transparent 100%)"}}/>
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

// ── Platform Swipe ──
function PlatformSwipe({platform,profile,browseType,onBlock,onLike,onSelect,onDone,onRate}){
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [swipedCount,setSwipedCount]=useState(0);
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
      return (results||[]).map(r=>({...r,media_type:browseType==="serie"?"tv":"movie"})).filter(r=>{
        const t=titleKey(r.title||r.name||"");
        if(blocked.has(t)||watched.has(r.id)||liked.has(r.id))return false;
        const myRating=ratings[t]||0;
        if(myRating>0&&myRating<=2)return false;
        return true;
      });
    }
    const allGenreKeys=Object.keys(GENRES_TMDB);
    const otherGenres=allGenreKeys.filter(g=>!pg.includes(g)).sort(()=>Math.random()-0.5).slice(0,3);
    const mixedStr=[...pg.slice(0,2),...otherGenres].join("|");
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    const rp1=Math.floor(Math.random()*6)+1;
    const rp2=Math.floor(Math.random()*6)+1;
    Promise.all([
      genreStr?discoverTitles(browseType,platform.tmdbIds,genreStr,rp1,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      discoverTitles(browseType,platform.tmdbIds,mixedStr,rp2,"popularity.desc",langFilter),
      discoverTitles(browseType,platform.tmdbIds,null,1,"popularity.desc",langFilter),
      discoverTitles(browseType,platform.tmdbIds,null,2,"vote_average.desc",langFilter),
    ]).then(([r1,r2,r3,r4])=>{
      const all=[...(r1.results||[]),...(r2.results||[]),...(r3.results||[]),...(r4.results||[])];
      const seen=new Set();
      const deduped=all.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
      const filtered=filterItems(deduped);
      for(let i=filtered.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[filtered[i],filtered[j]]=[filtered[j],filtered[i]];}
      const skip=Math.floor(Math.random()*6);
      setItems(filtered.slice(skip,skip+20));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[platform.id,browseType]);
  function handleRight(item){
    const title=item.title||item.name||"";
    localRatings.current[titleKey(title)]={stars:4,genre_ids:item.genre_ids||[]};
    onRate(title,4,item.genre_ids||[]);setSwipedCount(c=>c+1);advance();
  }
  function handleLeft(item){
    const title=item.title||item.name||"";
    localBlocked.current.add(titleKey(title));
    localRatings.current[titleKey(title)]={stars:1,genre_ids:item.genre_ids||[]};
    onBlock(title);onRate(title,1,item.genre_ids||[]);setSwipedCount(c=>c+1);advance();
  }
  function handleSkip(){setSwipedCount(c=>c+1);advance();}
  function advance(){setIdx(i=>{if(i+1>=items.length){setDone(true);return i;}return i+1;});}
  function buildFreshProfile(){
    const freshRatings={...profile.ratings||{}};
    const freshGenres={...profile.genres||{}};
    const freshBlocked=[...(profile.blocked_titles||[])];
    Object.entries(localRatings.current).forEach(([key,{stars,genre_ids}])=>{
      freshRatings[key]=stars;
      const boost=stars>=4?4:stars<=2?-3:0;
      if(boost!==0)genre_ids.forEach(g=>{freshGenres[g]=(freshGenres[g]||0)+boost;});
    });
    localBlocked.current.forEach(t=>{if(!freshBlocked.includes(t))freshBlocked.push(t);});
    return{...profile,ratings:freshRatings,genres:freshGenres,blocked_titles:freshBlocked};
  }
  if(loading)return<div style={{textAlign:"center",padding:40}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🍿</div><p style={{fontSize:13,color:"#b0a8b8",marginTop:8}}>Lade Titel von {platform.name}…</p></div>;
  if(done){onDone(buildFreshProfile());return null;}
  if(items.length===0)return<div style={{textAlign:"center",padding:30,color:"#b0a8b8"}}><div style={{fontSize:36,marginBottom:8}}>😕</div><p style={{fontWeight:700}}>Keine Titel gefunden</p></div>;
  const showHint=idx===0;
  const current=items[idx];
  const next=items[idx+1];
  return(
    <div>
      {showHint&&(
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(239,68,68,0.09)",borderRadius:10,padding:"6px 12px"}}>
            <span style={{fontSize:14}}>👈</span><span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>Interessiert nicht</span>
          </div>
          <div style={{fontSize:10,color:"#555",alignSelf:"center"}}>Tippen = Details</div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(74,222,128,0.09)",borderRadius:10,padding:"6px 12px"}}>
            <span style={{fontSize:10,color:"#4ade80",fontWeight:700}}>Merken</span><span style={{fontSize:14}}>👉</span>
          </div>
        </div>
      )}
      <div style={{position:"relative",height:"calc(100vh - 340px)",maxHeight:400,margin:"0 -18px",overflow:"hidden",touchAction:"none"}}>
        {next&&<div style={{position:"absolute",inset:0,borderRadius:24,overflow:"hidden",transform:"scale(0.95) translateY(8px)",zIndex:0,background:"#12121f"}}>{next.poster_path&&<img src={"https://image.tmdb.org/t/p/w342"+next.poster_path} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.3}}/>}</div>}
        <div style={{position:"absolute",inset:0,zIndex:1}}>
          <SwipeCard key={current.id} item={current} color={platform.color} onSwipeRight={handleRight} onSwipeLeft={handleLeft} onTap={onSelect}/>
        </div>
        <div style={{position:"absolute",bottom:-28,left:0,right:0,display:"flex",gap:3,padding:"0 4px"}}>
          {items.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<idx?"#ff6b35":i===idx?"#fff":"#2a2340"}}/>)}
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center",marginTop:20,padding:"0 18px"}}>
        <button onClick={()=>handleLeft(current)} style={{flex:1,background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:16,padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          👎 Nein
        </button>
        <button onClick={handleSkip} style={{flex:0.8,background:"rgba(255,255,255,0.05)",border:"2px solid #1e1e30",borderRadius:16,padding:"16px 6px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:11,color:"#555",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",lineHeight:1.3}}>
          Kenne<br/>ich nicht
        </button>
        <button onClick={()=>handleRight(current)} style={{flex:1,background:"rgba(74,222,128,0.1)",border:"2px solid rgba(74,222,128,0.3)",borderRadius:16,padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,color:"#4ade80",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          👍 Ja
        </button>
      </div>
    </div>
  );
}

// ── Platform Card ──
function PlatformCard({platform,profile,onSelect,onBlock,onLike,onRate,browseType,onWatched,forceOpen}){
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const [showMatchInfo,setShowMatchInfo]=useState(false);
  useEffect(()=>{
    if(forceOpen&&!open){
      // Nach Swipe: PlatformCard aufklappen und IMMER neu laden
      setOpen(true);
      setRecs(null);recsRef.current=null;reserveRef.current=[];
      setTimeout(()=>{const hasStored=loadStoredRecs();if(!hasStored)loadTMDBRecs();},150);
    }
  },[forceOpen]);
  useEffect(()=>{
    if(open&&recs&&recs.length>0){
      const seen=localStorage.getItem("sf_match_hint_seen");
      if(!seen){setShowMatchInfo(true);localStorage.setItem("sf_match_hint_seen","1");setTimeout(()=>setShowMatchInfo(false),4000);}
    }
  },[open,recs]);
  const reserveRef=useRef([]);
  const recsRef=useRef(null);
  const storageKey="sf_plat_"+platform.id;
  function loadStoredRecs(){
    try{
      const stored=localStorage.getItem(storageKey);
      if(stored){
        const parsed=JSON.parse(stored);
        // Neues Format: {active:[], reserve:[]}
        if(parsed&&parsed.active&&parsed.active.length>0){
          const sorted=[...parsed.active].sort((a,b)=>(b.score||0)-(a.score||0));
          setRecs(sorted);recsRef.current=sorted;
          reserveRef.current=parsed.reserve||[];
          return true;
        }
        // Altes Format: direkt Array
        if(parsed&&Array.isArray(parsed)&&parsed.length>0){
          const sorted=[...parsed].sort((a,b)=>(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0));
          setRecs(sorted);recsRef.current=sorted;return true;
        }
      }
    }catch(e){}
    return false;
  }
  useEffect(()=>{recsRef.current=recs;},[recs]);
  function storeRecs(r){
    try{
      // Speichere aktive Liste; Reserve bleibt in reserveRef
      const existing=JSON.parse(localStorage.getItem(storageKey)||"{}");
      const reserve=existing.reserve||reserveRef.current||[];
      localStorage.setItem(storageKey,JSON.stringify({active:r,reserve}));
    }catch(e){}
  }
  async function loadTMDBRecs(){
    setLoading(true);
    try{
      const watched=new Set((profile.watched||[]).map(w=>w.id));
      const blocked=new Set(profile.blocked_titles||[]);
      const ratings=profile.ratings||{};
      const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
      const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
      const genreStr=topGenres.length>0?topGenres.join("|"):null;
      const platSeed=platform.tmdbIds[0]%5;
      const page1=(platSeed%4)+1;
      const page2=((platSeed+2)%4)+1;
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
        if(seen.has(r.id))return false;seen.add(r.id);
        if(watched.has(r.id))return false;
        const t=titleKey(r.title||r.name||"");
        if(blocked.has(t))return false;
        const myRating=ratings[t]||0;
        if(myRating===1)return false;
        return(r.vote_average||0)>=5.5;
      }).sort((a,b)=>{
        let sa=(a.vote_average||0)*2,sb=(b.vote_average||0)*2;
        (a.genre_ids||[]).forEach(g=>{sa+=(profile.genres?.[g]||0)*3;});
        (b.genre_ids||[]).forEach(g=>{sb+=(profile.genres?.[g]||0)*3;});
        return sb-sa;
      });
      const top10=filtered.slice(0,10);
      // Wenn weniger als 10: mit populären Titeln ohne Genre-Filter auffüllen
      const needMore=10-top10.length;
      if(needMore>0){
        const existIds=new Set(top10.map(r=>r.id));
        const filler=all.filter(r=>!existIds.has(r.id)&&!watched.has(r.id)&&(r.vote_average||0)>=5.0).slice(0,needMore);
        top10.push(...filler);
      }
      reserveRef.current=filtered.slice(10,30);
      if(top10.length>0){
        const profileGenres=profile.genres||{};
        const maxG=Math.max(...Object.values(profileGenres).filter(v=>v>0),1);
        const formatted=top10.map(it=>{
          const tg=it.genre_ids||[];
          const boost=tg.reduce((s,g)=>s+(profileGenres[g]||0),0);
          const gm=Math.min(1,boost/(maxG*2));
          const rb=((it.vote_average||7)-6.5)/5;
          const calcScore=Math.min(92,Math.max(25,Math.round(25+gm*52+rb*18)));
          return{id:it.id,title:it.title||it.name||"",year:(it.release_date||it.first_air_date||"").substring(0,4),reason:it.overview?it.overview.substring(0,80)+(it.overview.length>80?"…":""):"",emoji:it.media_type==="tv"?"📺":"🎬",score:calcScore,_tmdbItem:it};
        }).sort((a,b)=>b.score-a.score);
        setRecs(formatted);recsRef.current=formatted;storeRecs(formatted);
      }else{setRecs([]);}
    }catch(e){setRecs([]);}
    setLoading(false);
  }
  async function replaceRec(removedTitle){
    const key=titleKey(removedTitle);
    const blocked=new Set(profile.blocked_titles||[]);
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    setRecs(prev=>{
      if(!prev)return prev;
      const filtered=prev.filter(r=>titleKey(r.title)!==key);
      // Aus KI-Reserve nehmen (schnell, kein Call)
      if(reserveRef.current.length>0){
        const next=reserveRef.current.shift();
        const newList=[...filtered,next];
        storeRecs(newList);
        return newList;
      }
      storeRecs(filtered);
      return filtered;
    });
    // Reserve nachfüllen wenn leer — TMDB Fallback
    if(reserveRef.current.length===0){
      try{
        const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
        const genreStr2=topGenres.length>0?topGenres.join("|"):null;
        const pg=Math.floor(Math.random()*6)+1;
        const existIds=new Set((recsRef.current||[]).map(r=>r.id).filter(Boolean));
        const [s,f]=await Promise.all([
          discoverTitles("serie",platform.tmdbIds,genreStr2,pg,"vote_average.desc",null),
          discoverTitles("film",platform.tmdbIds,genreStr2,pg,"popularity.desc",null),
        ]);
        const candidates=[...(s.results||[]).map(r=>({...r,media_type:"tv"})),...(f.results||[]).map(r=>({...r,media_type:"movie"}))]
          .filter(r=>{
            if(existIds.has(r.id)||watched.has(r.id))return false;
            const t=titleKey(r.title||r.name||"");
            if(blocked.has(t))return false;
            return(r.vote_average||0)>=5.5;
          });
        const newReserve=candidates.slice(0,10).map(c=>({id:c.id,title:c.title||c.name||"",year:(c.release_date||c.first_air_date||"").substring(0,4),reason:"",score:60,emoji:c.media_type==="tv"?"📺":"🎬",_tmdbItem:c}));
        reserveRef.current=newReserve;
        // Sofort auffüllen falls Liste noch unter 10
        setRecs(prev=>{
          if(!prev||prev.length>=10)return prev;
          const needed=10-prev.length;
          const fills=reserveRef.current.splice(0,needed);
          const newList=[...prev,...fills];
          storeRecs(newList);
          return newList;
        });
      }catch{}
    }
  }

  async function handleOpen(){
    const next=!open;setOpen(next);
    if(next){
      // Immer frisch aus localStorage laden (enthält KI-Ergebnisse nach Swipe)
      const hasStored=loadStoredRecs();
      if(!hasStored)await loadTMDBRecs();
    }
  }
  useEffect(()=>{
    if(open){setRecs(null);const hasStored=loadStoredRecs();if(!hasStored)loadTMDBRecs();}
  },[browseType]);
  useEffect(()=>{
    function onWatched(e){const cur=recsRef.current;if(!cur)return;const has=cur.find(r=>(e.detail.id&&r._tmdbItem?.id===e.detail.id)||titleKey(r.title)===titleKey(e.detail.title||""));if(has)replaceRec(has.title);}
    function onBlocked(e){const cur=recsRef.current;if(!cur)return;const has=cur.find(r=>titleKey(r.title)===titleKey(e.detail.title||""));if(has)replaceRec(has.title);}
    function onRated(e){if(e.detail?.stars===1){const cur=recsRef.current;if(!cur)return;const has=cur.find(r=>titleKey(r.title)===titleKey(e.detail.title||""));if(has)replaceRec(has.title);}}
    function onPlatformUpdated(e){if(e.detail?.platId===platform.id){setRecs(null);recsRef.current=null;reserveRef.current=[];setTimeout(()=>{loadStoredRecs();},100);}}
    function onSwipeDone(){setOpen(true);}
    window.addEventListener("sf_platform_updated",onPlatformUpdated);
    // legacy: keep for compat
    // (legacy removed)
    window.addEventListener("sf_watched",onWatched);window.addEventListener("sf_blocked",onBlocked);
    window.addEventListener("sf_swipe_done",onSwipeDone);window.addEventListener("sf_rated",onRated);
    return()=>{window.removeEventListener("sf_platform_updated",onPlatformUpdated);window.removeEventListener("sf_watched",onWatched);window.removeEventListener("sf_blocked",onBlocked);window.removeEventListener("sf_swipe_done",onSwipeDone);window.removeEventListener("sf_rated",onRated);};
  },[]);
  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:10,position:"relative"}}>
      {showMatchInfo&&(
        <div style={{position:"fixed",bottom:90,left:16,right:16,zIndex:500,animation:"fadeIn 0.3s ease"}}>
          <div style={{background:"linear-gradient(135deg,#1a1528,#12101e)",border:"1px solid rgba(196,169,96,0.35)",borderRadius:16,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(196,169,96,0.12)",border:"1px solid rgba(196,169,96,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>📊</div>
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:700,color:"#c4a960",margin:"0 0 4px",fontFamily:"'DM Sans'"}}>Was bedeutet der Balken?</p>
              <p style={{fontSize:12,color:"#b0a8b8",margin:0,lineHeight:1.5}}>Der % Balken zeigt wie gut dieser Titel zu <strong style={{color:"#f0ece4"}}>deinem persönlichen Geschmack</strong> passt.</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setShowMatchInfo(false);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:0,flexShrink:0}}>✕</button>
          </div>
        </div>
      )}
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={handleOpen}>
        <div style={{width:44,height:44,borderRadius:12,background:platform.color+"22",border:"1px solid "+platform.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:platform.color,flexShrink:0}}>{platform.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>{platform.name}</div>
          <div style={{fontSize:11,color:"#b0a8b8"}}>Top 10 · <span style={{color:"#c4a960",fontWeight:600}}>anhand deiner Bewertungen</span></div>
        </div>
        <span style={{color:"#3a3344",fontSize:12,transition:"transform 0.3s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </div>
      {open&&(
        <div style={{padding:"0 14px 16px"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:14}}/>
          {loading&&<div style={{textAlign:"center",padding:16}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:12,color:"#b0a8b8",marginTop:6}}>Lade…</p></div>}
          {!loading&&recs&&recs.length===0&&<p style={{fontSize:12,color:"#b0a8b8",textAlign:"center",padding:12}}>Keine Titel gefunden.</p>}
          {!loading&&recs&&recs.length>0&&<p style={{fontSize:10,color:"#55506a",margin:"0 0 10px",textAlign:"right",fontStyle:"italic"}}>← wischen zum Ausblenden</p>}
          {!loading&&recs&&recs.length>0&&(()=>{
            const ratingCount=Object.keys(profile.ratings||{}).length;
            const sorted=[...recs].sort((a,b)=>(b.score||b._tmdbItem?.vote_average||0)-(a.score||a._tmdbItem?.vote_average||0));
            return sorted.map((rec,i)=>{
              const tmdb=rec._tmdbItem;
              const backdrop=tmdb?.backdrop_path?"https://image.tmdb.org/t/p/w500"+tmdb.backdrop_path:null;
              const poster=tmdb?.poster_path?TMDB_IMG+tmdb.poster_path:null;
              const score=tmdb?.vote_average?Math.round(tmdb.vote_average*10)/10:0;
              const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
              const matchPct=rec.score||50;
              const matchColor=matchPct>=85?"#4ade80":matchPct>=75?"#a3e635":matchPct>=65?"#c4a960":matchPct>=50?"#f97316":"#b0a8b8";
              const hasEnoughData=!!(rec.score)||ratingCount>=5;
              return(
                <div key={rec.id||rec.title+i} style={{animation:rec._isNew?"fadeIn 0.5s ease":"none",marginBottom:10}}>
                  <SwipeToBlock onBlock={()=>{onBlock(rec.title);replaceRec(rec.title);}}>
                    <div style={{borderRadius:16,overflow:"hidden",position:"relative",background:"#0d0d18",border:"1px solid #1e1e30"}}>
                      <div onClick={()=>onSelect(tmdb||{title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:"movie"})}
                        style={{cursor:"pointer",position:"relative",height:100}}>
                        {backdrop&&<img src={backdrop} alt="" onLoad={e=>e.target.style.opacity=1} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0,transition:"opacity 0.3s ease"}}/>}
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.2) 100%)"}}/>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",gap:12,padding:"0 14px"}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:32,gap:2}}>
                            <div style={{width:5,height:36,borderRadius:3,background:"#1e1e30",overflow:"hidden",position:"relative"}}>
                              <div style={{position:"absolute",bottom:0,left:0,right:0,height:hasEnoughData?matchPct+"%":"0%",background:hasEnoughData?matchColor:"#2a2340",borderRadius:3,transition:"height 0.4s"}}/>
                            </div>
                            {hasEnoughData?<span style={{fontSize:8,color:matchColor,fontWeight:800,fontFamily:"'DM Sans'"}}>{matchPct}%</span>
                              :<span style={{fontSize:7,color:"#3a3350",fontFamily:"'DM Sans'",lineHeight:1.2,textAlign:"center"}}>neu</span>}
                          </div>
                          {poster?<img src={poster} alt="" style={{width:44,height:66,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                            :<div style={{width:44,height:66,borderRadius:8,background:platform.color+"22",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{rec.emoji||"🎬"}</div>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:800,color:"#f0ece4",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{rec.title}</div>
                            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                              {rec.year&&<span style={{fontSize:10,color:"#888"}}>{rec.year}</span>}
                              {score>0&&<div style={{display:"flex",alignItems:"center",gap:2,background:`${scoreColor}18`,padding:"2px 6px",borderRadius:5}}>
                                <span style={{color:"#f5c518",fontSize:10}}>★</span><span style={{color:scoreColor,fontSize:10,fontWeight:800}}>{score}</span>
                              </div>}
                            </div>
                            {rec.reason&&<p style={{fontSize:12,color:"#a09aaa",margin:"4px 0 0",lineHeight:1.4,fontStyle:"italic",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>"{rec.reason}"</p>}
                          </div>
                        </div>
                      </div>
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
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ── Universal Swipe ──
function UniversalSwipe({profile,cardProps,onSelect,onDone}){
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [rateLimited,setRateLimited]=useState(false);
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
    Promise.all([
      genreStr?discoverTitles("serie",allIds,genreStr,rp,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      discoverTitles("serie",allIds,null,rp2,"popularity.desc",langFilter),
      genreStr?discoverTitles("film",allIds,genreStr,rp,"vote_average.desc",langFilter):Promise.resolve({results:[]}),
      discoverTitles("film",allIds,null,rp2,"popularity.desc",langFilter),
    ]).then(([s1,s2,f1,f2])=>{
      const all=[...(s1.results||[]).map(r=>({...r,media_type:"tv"})),...(s2.results||[]).map(r=>({...r,media_type:"tv"})),...(f1.results||[]).map(r=>({...r,media_type:"movie"})),...(f2.results||[]).map(r=>({...r,media_type:"movie"}))];
      const seen=new Set();
      const deduped=all.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
      const filtered=filterItems(deduped);
      for(let i=filtered.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[filtered[i],filtered[j]]=[filtered[j],filtered[i]];}
      const skip=Math.floor(Math.random()*6);
      setItems(filtered.slice(skip,skip+25));setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  function handleRight(item){
    const t=item.title||item.name||"";
    localRatings.current[titleKey(t)]={stars:4,genre_ids:item.genre_ids||[]};
    cardProps.onRate(t,4,item.genre_ids||[]);setIdx(i=>i+1);
  }
  function handleLeft(item){
    const t=item.title||item.name||"";
    localRatings.current[titleKey(t)]={stars:1,genre_ids:item.genre_ids||[]};
    cardProps.onBlock(t);setIdx(i=>i+1);
  }
  function handleSkip(){setIdx(i=>i+1);}
  async function handleDone(){
    setProcessing(true);
    const liked_sw=Object.entries(localRatings.current).filter(([,v])=>v.stars>=4).map(([k])=>k);
    const disliked_sw=Object.entries(localRatings.current).filter(([,v])=>v.stars<=2).map(([k])=>k);
    const likedItems=Object.entries(localRatings.current).filter(([,v])=>v.stars>=4).map(([,v])=>v);
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    const ctx=buildCtx(profile);
    const langFilter=profile.languages&&profile.languages.length>0?profile.languages:null;
    const watched=new Set((profile.watched||[]).map(w=>w.id));
    const blocked=new Set(profile.blocked_titles||[]);

    // Merge swipe ratings into genres
    const mergedGenres={...profile.genres};
    Object.entries(localRatings.current).forEach(([,{stars,genre_ids}])=>{
      const boost=stars>=4?4:stars<=2?-4:0;
      (genre_ids||[]).forEach(g=>{mergedGenres[g]=(mergedGenres[g]||0)+boost;});
    });

    // ── SCHRITT 1: Similar-Titles für jeden gelikten Swipe-Titel ──
    // Das ist der Kern: wir suchen Titel die wirklich ähnlich sind
    const similarPool=[];
    const likedTmdbItems=items.filter(it=>{
      const key=titleKey(it.title||it.name||"");
      return (localRatings.current[key]?.stars||0)>=4;
    });

    if(likedTmdbItems.length>0){
      const similarResults=await Promise.all(
        likedTmdbItems.slice(0,8).map(async(it)=>{
          try{
            const mt=it.media_type==="tv"?"tv":"movie";
            const [sim1,sim2]=await Promise.all([
              fetch(TMDB_BASE+"/"+mt+"/"+it.id+"/similar?api_key="+TMDB_API_KEY+"&language=de-DE&page=1").then(r=>r.json()),
              fetch(TMDB_BASE+"/"+mt+"/"+it.id+"/recommendations?api_key="+TMDB_API_KEY+"&language=de-DE&page=1").then(r=>r.json()),
            ]);
            const results=[...(sim1.results||[]),...(sim2.results||[])].map(r=>({...r,media_type:mt,_similarTo:it.title||it.name,_boost:5}));
            return results;
          }catch{return[];}
        })
      );
      similarPool.push(...similarResults.flat());
      console.log("Similar pool size:", similarPool.length, "from", likedTmdbItems.length, "liked titles");
    }

    // ── SCHRITT 2: Genre-basierte Kandidaten (Ergänzung) ──
    const topGenreIds=Object.entries(mergedGenres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,4).map(([g])=>g);
    const genreStr=topGenreIds.length>0?topGenreIds.join("|"):null;
    const globalUsedIds=new Set();

    const platCandidates=await Promise.all(userPlats.map(async(plat,pi)=>{
      try{
        // Genre-Kandidaten von diesem Anbieter
        const pages=[[1,"vote_average.desc"],[2,"popularity.desc"],[3,"vote_average.desc"]];
        const calls=pages.flatMap(([pg,sort])=>[
          discoverTitles("serie",plat.tmdbIds,genreStr,pg,sort,langFilter),
          discoverTitles("film",plat.tmdbIds,genreStr,pg,sort,langFilter),
        ]);
        const results=await Promise.all(calls);
        const genreCandidates=results.flatMap((r,i)=>(r.results||[]).map(x=>({...x,media_type:i%2===0?"tv":"movie"})));

        // Similar-Titles filtern: nur die die auf diesem Anbieter verfügbar sind
        // (Wir können nicht direkt prüfen - nehmen alle Similar und hoffen auf Überschneidung)
        const ALLOWED_LANGS=new Set(["de","en","fr","it","es"]);
        const similarForPlat=similarPool.filter(r=>{
          if(watched.has(r.id)||blocked.has(titleKey(r.title||r.name||"")))return false;
          const myRating=(profile.ratings||{})[titleKey(r.title||r.name||"")]||0;
          if(myRating===1)return false;
          // Sprach-Filter: nur westliche Sprachen
          if(r.original_language&&!ALLOWED_LANGS.has(r.original_language))return false;
          // Kein Anime/Animation
          if((r.genre_ids||[]).includes(16))return false;
          return(r.vote_average||0)>=6.5;
        });

        // Kombiniere: Similar zuerst (mit Boost), dann Genre
        const seen=new Set();
        const allCandidates=[...similarForPlat,...genreCandidates].filter(r=>{
          if(seen.has(r.id))return false;seen.add(r.id);
          if(watched.has(r.id)||blocked.has(titleKey(r.title||r.name||"")))return false;
          const myRating=(profile.ratings||{})[titleKey(r.title||r.name||"")]||0;
          if(myRating===1)return false;
          // Sprach-Filter: nur westliche Sprachen, kein Anime
          const WLANGS=["de","en","fr","it","es"];
          if(r.original_language&&!WLANGS.includes(r.original_language))return false;
          if((r.genre_ids||[]).includes(16))return false;
          return(r.vote_average||0)>=6.0;
        }).sort((a,b)=>{
          // Score: Similar-Boost + Genre-Match + Rating
          let sa=(a._boost||0)*10+(a.vote_average||0)*2;
          let sb=(b._boost||0)*10+(b.vote_average||0)*2;
          (a.genre_ids||[]).forEach(g=>{sa+=(mergedGenres[g]||0)*2;});
          (b.genre_ids||[]).forEach(g=>{sb+=(mergedGenres[g]||0)*2;});
          return sb-sa;
        });

        return{plat,candidates:allCandidates};
      }catch{return{plat,candidates:[]};}
    }));

    // ── SCHRITT 3: KI wählt aus Similar+Genre Kandidaten ──
    const swipedLikedNames=liked_sw.slice(0,8).join(", ");
    const swipedDislikedNames=disliked_sw.slice(0,5).join(", ");

    // Sequentiell statt parallel → Token-Burst vermeiden, kein Rate Limit
    for(const {plat,candidates} of platCandidates){
      const unique=candidates.filter(c=>!globalUsedIds.has(c.id)).slice(0,50);
      if(!unique.length)return;

      // Zeige KI welche Titel ähnlich zu den gelikten sind
      const similarTitles=unique.filter(c=>c._similarTo).slice(0,15).map(c=>`${c.title||c.name||""} (ähnlich zu: ${c._similarTo})`).join(", ");
      const genreTitles=unique.filter(c=>!c._similarTo).slice(0,20).map(it=>`${it.title||it.name||""} (${it.media_type==="tv"?"S":"F"}, ${Math.round((it.vote_average||0)*10)/10}★)`).join(", ");

      const system=`Du bist Streaming-Kurator. Nur JSON-Array. Format: [{"title":"...","reason":"...","score":85}]. reason = 1 Satz mit du, warum genau dieser Titel. score = Übereinstimmung mit Nutzer (80-99 für sehr passende, 60-79 für gut passende).`;
      const msg=`Wähle die besten 30 Titel für ${plat.name}.
ÄHNLICHE TITEL (basierend auf Swipe-Likes): ${similarTitles||"keine"}
WEITERE KANDIDATEN: ${genreTitles}
Nutzer hat GELIKED: ${swipedLikedNames||"nichts"}
Nutzer hat ABGELEHNT: ${swipedDislikedNames||"nichts"}
Geschmack: ${ctx.taste||"gemischt"}
Priorisiere ähnliche Titel! Nur aus Kandidaten wählen.`;

      try{
        const text=await callAI([{role:"user",content:msg}],system);
        const picks=JSON.parse(text.replace(/```json|```/g,"").trim());
        const mapped=picks.map(p=>{
          const match=unique.find(c=>titleKey(c.title||c.name||"")===titleKey(p.title||""));
          if(!match)return null;
          return{id:match.id,title:match.title||match.name||"",year:(match.release_date||match.first_air_date||"").substring(0,4),reason:p.reason||"",score:p.score||75,emoji:match.media_type==="tv"?"📺":"🎬",_tmdbItem:match,_similarTo:match._similarTo};
        }).filter(Boolean);

        // Fallback: nicht von KI gewählte mit berechnetem Score
        const mappedIds=new Set(mapped.map(r=>r.id));
        const maxG=Math.max(...Object.values(mergedGenres).filter(v=>v>0),1);
        const fill=unique.filter(c=>!mappedIds.has(c.id)).map(c=>{
          const isSimilar=!!c._similarTo;
          const tg=c.genre_ids||[];
          const boost=tg.reduce((s,g)=>s+(mergedGenres[g]||0),0);
          const gm=Math.min(1,boost/(maxG*2));
          const rb=Math.min(1,((c.vote_average||6)-5)/4);
          // Similar-Titel bekommen Bonus
          const similarBonus=isSimilar?15:0;
          const calcScore=Math.min(94,Math.max(40,Math.round(40+gm*30+rb*15+similarBonus)));
          return{id:c.id,title:c.title||c.name||"",year:(c.release_date||c.first_air_date||"").substring(0,4),reason:isSimilar?`Ähnlich wie ${c._similarTo}`:"",score:calcScore,emoji:c.media_type==="tv"?"📺":"🎬",_tmdbItem:c};
        });

        const full=[...mapped,...fill].slice(0,30);
        full.forEach(r=>globalUsedIds.add(r.id));
        localStorage.setItem("sf_plat_"+plat.id,JSON.stringify({active:full.slice(0,10),reserve:full.slice(10,30)}));
        window.dispatchEvent(new CustomEvent("sf_platform_updated",{detail:{platId:plat.id}}));
      }catch(kiErr){
        if(kiErr?.message==="RATE_LIMIT"||kiErr?.message?.includes("429")||kiErr?.message?.includes("rate_limit")||kiErr?.message?.includes("quota"))setRateLimited(true);
        // KI-Fehler: Similar-Bonus trotzdem nutzen
        const maxG2=Math.max(...Object.values(mergedGenres).filter(v=>v>0),1);
        const fallback=unique.slice(0,30).map(c=>{
          const isSimilar=!!c._similarTo;
          const tg=c.genre_ids||[];
          const boost=tg.reduce((s,g)=>s+(mergedGenres[g]||0),0);
          const gm=Math.min(1,boost/(maxG2*2));
          const rb=Math.min(1,((c.vote_average||6)-5)/4);
          const similarBonus=isSimilar?15:0;
          const calcScore=Math.min(94,Math.max(40,Math.round(40+gm*30+rb*15+similarBonus)));
          return{id:c.id,title:c.title||c.name||"",year:(c.release_date||c.first_air_date||"").substring(0,4),reason:isSimilar?`Ähnlich wie ${c._similarTo}`:"",score:calcScore,emoji:c.media_type==="tv"?"📺":"🎬",_tmdbItem:c};
        });
        fallback.forEach(r=>globalUsedIds.add(r.id));
        localStorage.setItem("sf_plat_"+plat.id,JSON.stringify({active:fallback.slice(0,10),reserve:fallback.slice(10,30)}));
        window.dispatchEvent(new CustomEvent("sf_platform_updated",{detail:{platId:plat.id}}));
      }
    }

    // ── SCHRITT 4: Spotlight-Empfehlungen aus Similar-Pool ──
    try{
      const SP_LANGS=new Set(["de","en","fr","it","es"]);
      const spCandidates=similarPool.filter(it=>
        it.poster_path&&!watched.has(it.id)&&!blocked.has(titleKey(it.title||it.name||""))
        &&(!it.original_language||SP_LANGS.has(it.original_language))
        &&!(it.genre_ids||[]).includes(16)
      ).sort((a,b)=>(b.vote_average||0)-(a.vote_average||0)).slice(0,20);

      if(spCandidates.length>=3){
        const spList=spCandidates.map(x=>`${x.title||x.name||""} (ähnlich zu: ${x._similarTo})`).join(", ");
        const spSys=`Nur JSON-Array. Format: [{"title":"...","reason":"..."}]. reason mit du, warum dieser Titel jetzt.`;
        const spMsg=`3 perfekte Titel. Alle ähnlich zu Titeln die der Nutzer geliked hat: ${spList}. Geliked: ${swipedLikedNames}.`;
        const spText=await callAI([{role:"user",content:spMsg}],spSys);
        const spPicks=JSON.parse(spText.replace(/```json|```/g,"").trim());
        const spResult=spPicks.map(p=>{
          const m=spCandidates.find(c=>titleKey(c.title||c.name||"")===titleKey(p.title||""));
          return m?{...m,_aiReason:p.reason}:null;
        }).filter(Boolean);
        if(spResult.length>0){
          localStorage.setItem("sf_spotlight_recs",JSON.stringify(spResult));
          // Direkt in aktiven stimmungCache schreiben
          const activeStimmungId=localStorage.getItem("sf_active_stimmung");
          if(activeStimmungId){
            localStorage.setItem("sf_spotlight_"+activeStimmungId,JSON.stringify(spResult));
          }
        }
      }
    }catch{}

    window.dispatchEvent(new CustomEvent("sf_swipe_done",{detail:{liked:liked_sw,disliked:disliked_sw}}));
    window.dispatchEvent(new CustomEvent("sf_swipe_done_goto_browse"));
    setTimeout(()=>{onDone();},300);
  }

  if(loading)return<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:14,color:"#b0a8b8",marginTop:12}}>Lade Titel von allen Anbietern…</p></div>;
  if(done||idx>=items.length)return(
    <div style={{textAlign:"center",padding:"32px 20px"}}>
      {processing?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#7c3aed,#e84393)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 32px rgba(124,58,237,0.4)"}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <p style={{fontSize:15,fontWeight:700,color:"#f0ece4"}}>KI berechnet deine Top 10…</p>
          <p style={{fontSize:12,color:"#7a7488"}}>Einen Moment bitte</p>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"0 10px"}}>
          <div style={{width:80,height:80,borderRadius:25,background:"linear-gradient(135deg,#c4a960,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 12px 40px rgba(196,169,96,0.5)"}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{textAlign:"center"}}>
            {rateLimited&&<div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:12,padding:"10px 14px",marginBottom:12,textAlign:"left"}}><p style={{fontSize:12,color:"#f59e0b",fontWeight:700,margin:"0 0 4px"}}>⚠️ KI-Limit erreicht</p><p style={{fontSize:11,color:"#b0a8b8",margin:0,lineHeight:1.5}}>Die Empfehlungen basieren auf ähnlichen Titeln — ohne KI-Auswahl. Swipe später nochmal für noch bessere Ergebnisse.</p></div>}
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:30,color:"#f0ece4",margin:"0 0 10px",lineHeight:1.1}}>Deine Top 10{String.fromCharCode(10)}sind fertig!</h2>
            <p style={{fontSize:13,color:"#7a7488",lineHeight:1.5}}>Für jeden Anbieter deine persönliche Top 10.</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:300}}>
            {PLATFORMS.filter(p=>profile.platforms.includes(p.id)).map(p=>(
              <div key={p.id} style={{background:p.color+"18",border:"1px solid "+p.color+"44",borderRadius:10,padding:"6px 12px",display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13,color:p.color,fontWeight:900}}>{p.icon}</span>
                <span style={{fontSize:11,color:p.color,fontWeight:700}}>{p.name}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>{setProcessing(true);setDone(false);handleDone();}} style={{width:"100%",maxWidth:300,background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:18,padding:"18px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:17,boxShadow:"0 8px 32px rgba(196,169,96,0.4)"}}>
            Jetzt in Erkunden ansehen →
          </button>
          <p style={{fontSize:11,color:"#3a3344",fontFamily:"'DM Sans'"}}>Spotlight zeigt auch neue persönliche Picks</p>
        </div>
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
      <div style={{position:"relative",height:440,overflow:"hidden",touchAction:"none"}}>
        <SwipeCard key={`${current.id}-${idx}`} item={current} color="#e84393" onSwipeRight={handleRight} onSwipeLeft={handleLeft} onTap={onSelect}/>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginTop:20}}>
        <button onClick={()=>handleLeft(current)} style={{width:58,height:58,borderRadius:29,background:"#12121f",border:"1px solid rgba(239,68,68,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <button onClick={handleSkip} style={{width:46,height:46,borderRadius:23,background:"#12121f",border:"1px solid #1e1e30",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>
        <button onClick={()=>handleRight(current)} style={{width:58,height:58,borderRadius:29,background:"#12121f",border:"1px solid rgba(74,222,128,0.3)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>❤️</button>
      </div>
      <p style={{textAlign:"center",fontSize:10,color:"#3a3344",marginTop:10,fontFamily:"'DM Sans'"}}>← Nope · Tippen = Details · ❤️ Interessiert mich →</p>
    </div>
  );
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
      {onAlternative&&<button onClick={onAlternative} style={{background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"11px 22px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>→ Zu Erkunden wechseln</button>}
    </div>
  );
}

// ── SpotlightCard ──
function SpotlightCard({item,profile,onSelect,onRate,onLike,onWatched,onBlock}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w500"+item.backdrop_path:null;
  const bg=backdrop||poster;
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type==="tv"?"Serie":"Film";
  const aiReason=item._aiReason||"";
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const myRating=(profile.ratings||{})[titleKey(title)]||0;
  return(
    <div style={{borderRadius:20,overflow:"hidden",marginBottom:12,position:"relative",background:"#0a0a12"}}>
      <div onClick={()=>onSelect&&onSelect(item)} style={{cursor:"pointer",position:"relative"}}>
        {bg?<img src={bg} alt="" style={{width:"100%",height:220,objectFit:"cover",objectPosition:"center 20%",display:"block"}}/>
          :<div style={{width:"100%",height:220,background:"linear-gradient(135deg,#1a1520,#0f1020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>🎬</div>}
        <div style={{position:"absolute",top:0,left:0,right:0,height:220,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.85) 100%)"}}/>
        {score>0&&<div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.7)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4,backdropFilter:"blur(8px)"}}>
          <span style={{color:"#f5c518",fontSize:11}}>★</span><span style={{color:scoreColor,fontSize:12,fontWeight:800}}>{score}</span>
        </div>}
        <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.6)",borderRadius:6,padding:"3px 10px",backdropFilter:"blur(8px)"}}>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:10,fontWeight:700}}>{mediaType} {year&&"· "+year}</span>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px 10px"}}>
          <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,color:"#fff",margin:"0 0 4px",textShadow:"0 2px 8px rgba(0,0,0,0.8)",lineHeight:1.2}}>{title}</h3>
          {aiReason&&<p style={{fontSize:12,color:"rgba(255,255,255,0.75)",margin:0,fontStyle:"italic",lineHeight:1.4,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{aiReason}</p>}
        </div>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{padding:"10px 14px 12px",background:"#0d0d1a",display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>!isWatched&&onWatched&&onWatched(item)}
          style={{background:isWatched?"rgba(74,222,128,0.12)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.1)"),borderRadius:8,padding:"5px 12px",cursor:isWatched?"default":"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600}}>
          {isWatched?"✓ Gesehen":"Gesehen"}
        </button>
        <button onClick={()=>onLike&&onLike(item)}
          style={{width:34,height:34,borderRadius:8,background:isLiked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(isLiked?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
          {isLiked?"❤️":"🤍"}
        </button>
        <div style={{flex:1}}/>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {[{v:1,c:"#ef4444",g:"rgba(239,68,68,0.6)",l:"Nope"},{v:3,c:"#f59e0b",g:"rgba(245,158,11,0.6)",l:"Ok"},{v:5,c:"#4ade80",g:"rgba(74,222,128,0.6)",l:"Top"}].map(dot=>{
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
            {[{v:1,l:"Nope"},{v:3,l:"Ok"},{v:5,l:"Top"}].map(dot=>(
              <span key={dot.v} style={{width:32,textAlign:"center",fontSize:7,color:myRating===dot.v?(dot.v===1?"#ef4444":dot.v===3?"#f59e0b":"#4ade80"):"rgba(255,255,255,0.18)",fontFamily:"'DM Sans'",fontWeight:600}}>{dot.l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BotTitleCard ──
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

// ── FunFeature ──
function FunFeature({mode,profile,onSelect,onRate,onLike,onWatched}){
  const [surpriseResult,setSurpriseResult]=useState(null);
  const [surpriseLoading,setSurpriseLoading]=useState(false);
  const [surpriseError,setSurpriseError]=useState("");
  const [oracleResult,setOracleResult]=useState(null);
  const [oracleLoading,setOracleLoading]=useState(false);
  const [oracleError,setOracleError]=useState("");
  const [personalityResult,setPersonalityResult]=useState(null);
  const [personalityLoading,setPersonalityLoading]=useState(false);
  const [personalityError,setPersonalityError]=useState("");

  async function doSurprise(){
    setSurpriseLoading(true);setSurpriseResult(null);setSurpriseError("");
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","year":"...","type":"Serie/Film","reason":"...","emoji":"..."}. reason = persönlicher Satz der den User duzt.`;
      const msg=`Überrasche diesen User mit EINEM perfekten Titel.\nGeschmack: ${ctx.taste||"gemischt"}\nLiebt: ${ctx.rated5||"noch nichts"}\nMag nicht: ${ctx.low||"nichts"}\nBereits gesehen: ${ctx.watched||"nichts"}\nPlattformen: ${ctx.platforms}`;
      const text=await callAI([{role:"user",content:msg}],system);
      setSurpriseResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){setSurpriseError("RATE_LIMIT");}
      else{
        try{
          const watchlist=profile.liked_items||[];
          const watched=new Set((profile.watched||[]).map(w=>w.id));
          const candidate=watchlist.find(it=>!watched.has(it.id));
          if(candidate){setSurpriseResult({title:candidate.title||candidate.name||"",year:(candidate.release_date||candidate.first_air_date||"").substring(0,4),type:candidate.media_type==="tv"?"Serie":"Film",reason:"Steht schon lange auf deiner Watchlist — jetzt ist der perfekte Moment!",emoji:"🎬"});}
          else{
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
      const system=`Du bist ein mystisches Orakel für Streaming. Antworte NUR mit JSON, kein Markdown. Format: {"title":"...","prophecy":"...","emoji":"..."}.`;
      const msg=`Das Orakel spricht. Welcher Titel erwartet diesen User heute Abend?\nGeschmack: ${ctx.taste||"unbekannt"}\nLiebt: ${ctx.rated5||"noch nichts"}\nPlattformen: ${ctx.platforms}\nProphezeiung: 2 Sätze, dramatisch aber witzig.`;
      const text=await callAI([{role:"user",content:msg}],system);
      setOracleResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){setOracleError("RATE_LIMIT");}
      else{
        const prophecies=[
          {title:"Ein Klassiker wartet",prophecy:"Die Sterne sprechen: Was du suchst hast du bereits auf deiner Watchlist. Scroll nach oben — die Antwort liegt dort.",emoji:"🌟"},
          {title:"Der perfekte Abend naht",prophecy:"Das Orakel sieht einen gemütlichen Abend voraus. Einfach den ersten Titel auf der Watchlist starten.",emoji:"🔮"},
        ];
        setOracleResult(prophecies[Math.floor(Math.random()*prophecies.length)]);
      }
    }
    setOracleLoading(false);
  }

  async function doPersonality(){
    setPersonalityLoading(true);setPersonalityResult(null);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist ein Persönlichkeitsanalyst für Streaming. Antworte NUR mit JSON, kein Markdown. Format: {"type":"...","emoji":"...","description":"...","titles":["...","...","..."]}`;
      const msg=`Analysiere den Streaming-Persönlichkeitstyp dieses Nutzers.\nGeschmack: ${ctx.taste||"noch aufbauend"}\nLiebt: ${ctx.rated5||"noch nichts"}\nGenres: ${ctx.topGenres||"gemischt"}\nKreativer Persönlichkeitstyp-Name + Beschreibung + 3 typische Titel.`;
      const text=await callAI([{role:"user",content:msg}],system);
      setPersonalityResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){setPersonalityError("RATE_LIMIT");}
      else{
        const genres=profile.genres||{};
        const top=Object.entries(genres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,2).map(([g])=>Number(g));
        const typeMap={
          53:{type:"Der Spannungs-Junkie",emoji:"🔪",description:"Du lebst für den nächsten Twist. Ruhige Filme? Langweilig.",titles:["Zodiac","Se7en","Gone Girl"]},
          18:{type:"Die Seelen-Forscherin",emoji:"🎭",description:"Charaktertiefe ist alles. Wenn ein Film nicht wehtut, hat er nichts getaugt.",titles:["Manchester by the Sea","The Leftovers","Succession"]},
          28:{type:"Der Action-Held",emoji:"💥",description:"Explosionen sind Musik für deine Ohren. Plot? Optional.",titles:["Mad Max","John Wick","Die Hard"]},
          35:{type:"Der Lach-Philosoph",emoji:"😂",description:"Das Leben ist zu kurz für schlechte Stimmung. Komödien sind deine Therapie.",titles:["Arrested Development","Fleabag","The Bear"]},
          9648:{type:"Der Rätsel-Löser",emoji:"🧩",description:"Du pausierst Filme um Theorien aufzustellen.",titles:["Dark","Westworld","Severance"]},
        };
        const match=top.find(g=>typeMap[g]);
        setPersonalityResult(match&&typeMap[match]?typeMap[match]:{type:"Der Vielseitige",emoji:"🎬",description:"Du bist schwer einzuordnen — du magst einfach gute Unterhaltung.",titles:["Breaking Bad","Inception","The Bear"]});
      }
    }
    setPersonalityLoading(false);
  }

  if(mode==="surprise")return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,0.07)"}}>
      {!surpriseResult&&!surpriseLoading&&<button onClick={doSurprise} style={{width:"100%",background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:12,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>✨ Überrasch mich!</button>}
      {surpriseLoading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{color:"#b0a8b8",fontSize:13,marginTop:8}}>Suche den perfekten Titel…</p></div>}
      {surpriseError==="RATE_LIMIT"&&<RateLimitBanner emoji="✨" title="Alle Überraschungen für heute verteilt!" msg="Unser Überraschungs-Elf hat seinen Vorrat aufgebraucht. Morgen hat er neue Ideen!"/>}
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
      {oracleError==="RATE_LIMIT"&&<RateLimitBanner emoji="🔮" title="Das Orakel meditiert" msg="Die Kristallkugel braucht eine Pause. Morgen sieht sie wieder klarer!"/>}
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
      {personalityError==="RATE_LIMIT"&&<RateLimitBanner emoji="🎬" title="Der Filmtyp-Analytiker hat Pause" msg="Morgen ist er wieder hellwach!"/>}
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
              {(personalityResult.titles||[]).map((t,i)=><BotTitleCard key={i} title={t} profile={profile} onSelect={onSelect} onRate={onRate} onLike={onLike} onWatched={onWatched}/>)}
            </div>
          )}
          <button onClick={doPersonality} style={{width:"100%",background:"transparent",border:"1px solid #2a2340",borderRadius:10,padding:"10px 20px",color:"#b0a8b8",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12}}>Neu analysieren 🎭</button>
        </div>
      )}
    </div>
  );
  return null;
}

// ── BrowseFeature ──
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
      const msg=`Erstelle 8 Empfehlungen basierend auf "${titleStr}".\nNutzerprofil: ${ctx.taste||"gemischt"}\nLiebt: ${ctx.rated5||"nichts"}\nPlattformen: ${ctx.platforms}\nreason = witziger Satz mit "du" — persönlich, nicht generisch.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      setDDResults(enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason})));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){setDDResults([{_rateLimit:true}]);}
      else{
        try{
          const topG=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g).join("|");
          const r=await discoverTitles("serie",(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]),topG,1,"vote_average.desc",null);
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
      const msg=`Empfehle 6 Titel für diese Stimmung:\nAction/Spannung: ${vibeLabel(heavy)}\nLeichtigkeit: ${vibeLabel(100-trash)}\nDunkel/Ernst: ${vibeLabel(dark)}\nNutzerprofil: ${ctx.taste||"gemischt"}\nPlattformen: ${ctx.platforms}`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      setVibeResults(enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason})));
    }catch(e){
      if(e.message==="RATE_LIMIT"||e.message?.includes("429")){setVibeResults([{_rateLimit:true}]);}
      else{
        try{
          const actionGenres=heavy>60?[28,12,53]:[];
          const darkGenres=dark>60?[9648,80,18]:[];
          const lightGenres=trash<40?[35,10749]:[];
          const fg=[...new Set([...actionGenres,...darkGenres,...lightGenres])].slice(0,3);
          const gStr=fg.length>0?fg.join("|"):null;
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
    setDDInput(item.title||item.name||"");setDDSearchRes([]);
    await startDeepDive(item.title||item.name||"");
  }

  async function handleBot(){
    if(!botInput.trim())return;
    const q=botInput.trim();setBotInput("");
    setBotMessages(prev=>[...prev,{role:"user",text:q}]);setBotLoading(true);
    try{
      const ctx=buildCtx(profile);
      const system=`Du bist StreamBot, ein freundlicher Streaming-Experte. Antworte auf Deutsch in max 3 Sätzen. Empfiehl dann 2-3 Titel: **Titel** (Jahr) - Begründung. Nutzerprofil: ${ctx.taste||"gemischt"}. Plattformen: ${ctx.platforms}`;
      const history=botMessages.slice(-6).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
      const text=await callAI([...history,{role:"user",content:q}],system);
      const boldTitles=(text.match(/\*\*([^*\n]{2,50})\*\*/g)||[]).map(t=>t.replace(/\*\*/g,"").trim());
      const quotedTitles=(text.match(/["""„]([^"""„\n]{2,50})["""]/g)||[]).map(t=>t.replace(/["""„]/g,"").trim());
      const titles=[...new Set([...boldTitles,...quotedTitles].map(t=>t.replace(/\s*[\(\-–:,].*$/,"").trim()).filter(t=>t.length>2&&t.length<55&&/[a-zA-ZäöüÄÖÜ]/.test(t)))].slice(0,5);
      setBotMessages(prev=>[...prev,{role:"bot",text,titles}]);
    }catch(e){
      const isLimit=e.message==="RATE_LIMIT"||e.message?.includes("429")||e.message?.includes("limit")||e.message?.includes("rate");
      setBotMessages(prev=>[...prev,{role:"bot",text:isLimit?"__RATE_LIMIT__":"Fehler — bitte nochmal versuchen."}]);
    }
    setBotLoading(false);
  }

  if(mode==="deepdive")return(
    <div>
      {!ddInput&&!ddLoading&&ddResults.length===0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:12,color:"#7a7488",marginBottom:8,fontFamily:"'DM Sans'"}}>Zum Beispiel:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {["Breaking Bad","The Wire","Inception","Peaky Blinders","Dark"].map(ex=>(
              <button key={ex} onClick={()=>{setDDInput(ex);startDeepDive(ex);}}
                style={{background:"rgba(196,169,96,0.08)",border:"1px solid rgba(196,169,96,0.2)",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12,color:"#c4a960",fontFamily:"'DM Sans'",fontWeight:600}}>{ex}</button>
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
          {ddResults[0]?._rateLimit?<RateLimitBanner emoji="🔭" title="Das Universum braucht eine Pause" msg="Morgen früh geht die Reise weiter!"/>
            :ddResults.map((it,i)=><SpotlightCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)}
        </div>
      )}
    </div>
  );

  if(mode==="vibe")return(
    <div>
      <p style={{fontSize:12,color:"#7a7488",marginBottom:14,lineHeight:1.5,fontFamily:"'DM Sans'"}}>Stelle deine aktuelle Stimmung ein — wir finden den perfekten Titel dazu.</p>
      {[
        {label:"Action & Spannung",val:heavy,set:setHeavy,low:"Ruhig",high:"Explosiv",grad:"linear-gradient(90deg,#3b82f6,#ff6b35)",emoji:heavy>66?"💥":heavy>33?"⚡":"😴"},
        {label:"Leichtigkeit",val:100-trash,set:v=>setTrash(100-v),low:"Schwer",high:"Locker",grad:"linear-gradient(90deg,#6366f1,#fbbf24)",emoji:(100-trash)>66?"😂":(100-trash)>33?"🙂":"😐"},
        {label:"Dunkel & Ernst",val:dark,set:setDark,low:"Hell & leicht",high:"Düster & tief",grad:"linear-gradient(90deg,#f472b6,#1e1b4b)",emoji:dark>66?"🌑":dark>33?"🌒":"☀️"},
      ].map(s=>{
        const pct=s.val;
        return(
        <div key={s.label} style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:14,color:"#f0ece4",fontFamily:"'DM Sans'",fontWeight:700}}>{s.label}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:18}}>{s.emoji}</span>
              <span style={{fontSize:12,color:"#c4a960",fontWeight:700,fontFamily:"'DM Sans'",background:"rgba(196,169,96,0.1)",padding:"2px 10px",borderRadius:20}}>{vibeLabel(s.val)}</span>
            </div>
          </div>
          <div style={{position:"relative",height:44,display:"flex",alignItems:"center"}}>
            {/* Track */}
            <div style={{position:"absolute",left:0,right:0,height:6,borderRadius:3,background:"#1e1e30"}}/>
            {/* Fill */}
            <div style={{position:"absolute",left:0,width:pct+"%",height:6,borderRadius:3,background:s.grad,transition:"width 0.1s"}}/>
            {/* Native input invisible overlay */}
            <input type="range" min="0" max="100" value={s.val}
              onChange={e=>s.set(Number(e.target.value))}
              style={{position:"absolute",left:0,right:0,width:"100%",opacity:0,height:44,cursor:"pointer",margin:0,padding:0}}/>
            {/* Custom thumb */}
            <div style={{position:"absolute",left:`calc(${pct}% - 14px)`,width:28,height:28,borderRadius:14,background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,0.6)",border:"3px solid #f0ece4",transition:"left 0.1s",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:8,height:8,borderRadius:4,background:s.grad}}/>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:10,color:"#555"}}>{s.low}</span>
            <span style={{fontSize:10,color:"#555"}}>{s.high}</span>
          </div>
        </div>
        );
      })}
      <button onClick={getVibeRecs} disabled={vibeLoading} style={{width:"100%",background:"linear-gradient(135deg,#e84393,#ff6b35)",border:"none",borderRadius:14,padding:"13px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,marginBottom:14}}>
        {vibeLoading?"Suche…":"Passende Titel finden →"}
      </button>
      {vibeResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {vibeResults[0]?._rateLimit?<RateLimitBanner emoji="🎛️" title="Die Vibes sind zu stark für heute" msg="Morgen wieder frisch!"/>
            :vibeResults.map((it,i)=><SpotlightCard key={it.id||i} item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>)}
        </div>
      )}
    </div>
  );

  if(mode==="bot")return(
    <div>
      {botMessages.length===0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:12,color:"#7a7488",marginBottom:8,fontFamily:"'DM Sans'"}}>Du könntest zum Beispiel fragen:</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {["Was läuft auf Netflix wie Breaking Bad?","Empfiehl mir einen Thriller für heute Abend","Was sind die besten Serien 2024?","Ich mag Inception — was noch?"].map(q=>(
              <button key={q} onClick={()=>setBotInput(q)}
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
              ?<div style={{width:"100%"}}><RateLimitBanner emoji="🍿" title="Der Guru hat heute Kinoabend" msg="Morgen ist er wieder für dich da!"/></div>
              :<>
                <div style={{background:m.role==="user"?"linear-gradient(135deg,#e84393,#ff6b35)":"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 14px",maxWidth:"85%",fontSize:13,color:"#f0ece4",lineHeight:1.6,border:m.role==="user"?"none":"1px solid rgba(255,255,255,0.08)"}}>
                  {m.role==="bot"?m.text.split(/(\*\*[^*]+\*\*)/).map((part,pi)=>part.startsWith("**")&&part.endsWith("**")?<strong key={pi} style={{color:"#f5e090"}}>{part.slice(2,-2)}</strong>:<span key={pi}>{part}</span>):m.text}
                </div>
                {m.role==="bot"&&m.titles&&m.titles.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
                    {m.titles.map((t,ti)=><BotTitleCard key={ti} title={t} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched}/>)}
                  </div>
                )}
              </>}
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

// ── SVG Icons ──
const SpotlightIcons = {
  deepdive: (color, size=32) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
      <path d="M11 8c0 0 1.5 1 1.5 3s-1.5 3-1.5 3"/><circle cx="11" cy="11" r="1" fill={color}/>
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
      <circle cx="9" cy="10" r="1" fill={color}/><circle cx="15" cy="10" r="1" fill={color}/>
    </svg>
  ),
  surprise: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
    </svg>
  ),
  oracle: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 3c4 4 4 14 0 18"/><path d="M3 12c4-4 14-4 18 0"/>
      <circle cx="12" cy="12" r="2" fill={color} opacity="0.5"/>
    </svg>
  ),
  personality: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

const StimmungIcons={
  action:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  comedy:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  thriller:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  drama:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  horror:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  scifi:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 3c4 4 4 14 0 18"/><path d="M3 12c4-4 14-4 18 0"/><circle cx="12" cy="12" r="2" fill={c} opacity="0.5"/></svg>,
  fantasy:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  mystery:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  doku:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  romance:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  krimi:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  abenteuer:(c,s=28)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4-4-4 4-4z"/></svg>,
};

// ── STIMMUNGEN mit zuverlässigen TMDB-Bildern ──
const STIMMUNGEN=[
  {id:"action",    label:"Action",        color:"#ff6b35", genres:[28]},
  {id:"comedy",    label:"Komödie",       color:"#f59e0b", genres:[35]},
  {id:"thriller",  label:"Thriller",      color:"#ef4444", genres:[53]},
  {id:"drama",     label:"Drama",         color:"#e84393", genres:[18]},
  {id:"horror",    label:"Horror",        color:"#6366f1", genres:[27]},
  {id:"scifi",     label:"Sci-Fi",        color:"#a78bfa", genres:[878]},
  {id:"fantasy",   label:"Fantasy",       color:"#4ade80", genres:[14]},
  {id:"mystery",   label:"Mystery",       color:"#22d3ee", genres:[9648]},
  {id:"doku",      label:"Doku",          color:"#34d399", genres:[99]},
  {id:"romance",   label:"Romantik",      color:"#f472b6", genres:[10749]},
  {id:"krimi",     label:"Krimi",         color:"#fb923c", genres:[80]},
  {id:"abenteuer", label:"Abenteuer",     color:"#60a5fa", genres:[12]},
];

// Genre-Bilder: wird beim Start dynamisch von TMDB geladen
// Fallback-Farben wenn Bild nicht lädt
const GENRE_IMAGES={};

async function loadGenreImages(){
  const cacheKey="sf_genre_images";
  try{
    const cached=localStorage.getItem(cacheKey);
    if(cached){
      const parsed=JSON.parse(cached);
      if(parsed&&Object.keys(parsed).length>0){
        Object.assign(GENRE_IMAGES,parsed);
        return;
      }
    }
  }catch{}
  // Lade für jedes Genre den populärsten Titel und nehme sein Backdrop
  const genres=[
    {id:28,type:"movie"},{id:35,type:"movie"},{id:53,type:"movie"},
    {id:18,type:"movie"},{id:27,type:"movie"},{id:878,type:"movie"},
    {id:14,type:"movie"},{id:9648,type:"movie"},{id:99,type:"tv"},
    {id:10749,type:"movie"},{id:80,type:"tv"},{id:12,type:"movie"},
  ];
  const results={};
  await Promise.all(genres.map(async({id,type})=>{
    try{
      const url=TMDB_BASE+"/discover/"+type+"?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=popularity.desc&with_genres="+id+"&vote_count.gte=500&page=1";
      const data=await fetch(url).then(r=>r.json());
      const items=(data.results||[]).filter(it=>it.backdrop_path||it.poster_path);
      if(items.length>0){
        const best=items[Math.floor(Math.random()*Math.min(3,items.length))];
        results[id]="https://image.tmdb.org/t/p/w500"+(best.backdrop_path||best.poster_path);
      }
    }catch{}
  }));
  Object.assign(GENRE_IMAGES,results);
  try{localStorage.setItem(cacheKey,JSON.stringify(results));localStorage.setItem(cacheKey+"_v","2");}catch{}
}
// Sofort laden
loadGenreImages();

// ── SpotlightTab ──
function SpotlightTab({profile,cardProps,onSelect}){
  const [activeFeature,setActiveFeature]=useState(null);
  const [bgImgs,setBgImgs]=useState([null,null,null]);
  const [activeStimmung,setActiveStimmung]=useState(null);
  const activeStimmungRef=useRef(null);
  const [genreImages,setGenreImages]=useState(GENRE_IMAGES);

  useEffect(()=>{
    // Genre-Bilder laden und State aktualisieren damit Kacheln neu rendern
    async function loadImages(){
      const cacheKey="sf_genre_images";
      try{
        const cached=localStorage.getItem(cacheKey);
        const cacheV=localStorage.getItem(cacheKey+"_v");
        if(cached&&cacheV==="2"){
          const parsed=JSON.parse(cached);
          if(parsed&&Object.keys(parsed).length>=10){
            setGenreImages({...parsed});return;
          }
        }
        // Alte Version oder leer -> neu laden
        localStorage.removeItem(cacheKey);
      }catch{}
      // Direkte Film-IDs für garantiert passende Genre-Bilder
      const genreMovies=[
        {genreId:28,  movieId:76341,  type:"movie"},  // Action: Mad Max Fury Road
        {genreId:35,  movieId:18785,  type:"movie"},  // Komödie: The Hangover
        {genreId:53,  movieId:274,    type:"movie"},  // Thriller: Silence of the Lambs
        {genreId:18,  movieId:238,    type:"movie"},  // Drama: The Godfather
        {genreId:27,  movieId:493922, type:"movie"},  // Horror: Hereditary
        {genreId:878, movieId:329865, type:"movie"},  // Sci-Fi: Arrival
        {genreId:14,  movieId:120,    type:"movie"},  // Fantasy: Lord of the Rings
        {genreId:9648,movieId:546554, type:"movie"},  // Mystery: Knives Out
        {genreId:99,  movieId:549559, type:"movie"},  // Doku: Free Solo
        {genreId:10749,movieId:597,   type:"movie"},  // Romantik: Titanic
        {genreId:80,  movieId:1396,   type:"tv"},     // Krimi: Breaking Bad
        {genreId:12,  movieId:85,     type:"movie"},  // Abenteuer: Indiana Jones
      ];
      const results={};
      await Promise.all(genreMovies.map(async({genreId,movieId,type})=>{
        try{
          const url=TMDB_BASE+"/"+type+"/"+movieId+"?api_key="+TMDB_API_KEY+"&language=de-DE";
          const data=await fetch(url).then(r=>r.json());
          if(data.backdrop_path){
            results[genreId]="https://image.tmdb.org/t/p/w500"+data.backdrop_path;
          } else if(data.poster_path){
            results[genreId]="https://image.tmdb.org/t/p/w500"+data.poster_path;
          }
        }catch{}
      }));
      setGenreImages({...results});
      try{localStorage.setItem(cacheKey,JSON.stringify(results));localStorage.setItem(cacheKey+"_v","2");}catch{}
    }
    loadImages();
  },[]);
  const [genreExpanded,setGenreExpanded]=useState(false);
  const [stimmungRecs,setStimmungRecs]=useState([]);
  const [personalRecs,setPersonalRecs]=useState([]);
  const [personalLoading,setPersonalLoading]=useState(false);
  const [stimmungLoading,setStimmungLoading]=useState(false);
  const [initialLoaded,setInitialLoaded]=useState(false);
  const shownTitles=useRef(new Set());
  const recReserve=useRef([]);
  const stimmungCache=useRef({});

  useEffect(()=>{
    function onSwipeDoneRefresh(){
      // Nach Swipe: stimmungCache leeren damit frische Genre-Recs geladen werden
      stimmungCache.current={};
      recReserve.current=[];
      // Spotlight-Recs aus localStorage laden (von KI nach Swipe)
      try{
        const stored=null; // deprecated
        if(stored){
          const recs=JSON.parse(stored);
          if(recs&&recs.length>0){
            if(activeStimmung){
              stimmungCache.current[activeStimmung]={recs:recs.slice(0,3),reserve:recs.slice(3)};
              setStimmungRecs(recs.slice(0,3));
            }
            localStorage.removeItem("sf_spotlight_recs");
          }
        }
      }catch{}
      // Genre-Recs neu laden
      setTimeout(()=>{
        if(activeStimmung){
          const st=STIMMUNGEN.find(s=>s.id===activeStimmung);
          if(st)loadFirstRecs(st);
        }
      },800);
    }
    function onWatched(e){
      const id=e.detail?.id;const title=titleKey(e.detail?.title||"");
      if(id)shownTitles.current.add(id);
      setStimmungRecs(prev=>{
        const filtered=prev.filter(it=>it.id!==id&&titleKey(it.title||it.name||"")!==title);
        if(filtered.length<prev.length&&recReserve.current.length>0){const next=recReserve.current.shift();shownTitles.current.add(next.id);return[...filtered,next];}
        return filtered;
      });
    }
    function onRated(e){
      if((e.detail?.stars||0)<=2){
        const title=titleKey(e.detail?.title||"");
        setStimmungRecs(prev=>{
          const filtered=prev.filter(it=>titleKey(it.title||it.name||"")!==title);
          if(filtered.length<prev.length&&recReserve.current.length>0){const next=recReserve.current.shift();shownTitles.current.add(next.id);return[...filtered,next];}
          return filtered;
        });
      }
    }
    function onReloadSpotlight(){
      try{
        const stored=null; // deprecated
        if(stored){const recs=JSON.parse(stored);if(recs.length>0)setPersonalRecs(recs);}
      }catch{}
    }
    window.addEventListener("sf_watched",onWatched);
    window.addEventListener("sf_rated",onRated);
    window.addEventListener("sf_reload_spotlight",onReloadSpotlight);
    return()=>{
      window.removeEventListener("sf_watched",onWatched);
      window.removeEventListener("sf_rated",onRated);
      window.removeEventListener("sf_reload_spotlight",onReloadSpotlight);
    };
  },[]);

  useEffect(()=>{
    if(initialLoaded)return;setInitialLoaded(true);
    const profileGenres=profile.genres||{};
    const bestMatch=STIMMUNGEN.find(s=>s.genres.some(g=>(profileGenres[g]||0)>0))||STIMMUNGEN[0];
    setActiveStimmung(bestMatch.id);
    activeStimmungRef.current=bestMatch.id;
    try{localStorage.setItem('sf_active_stimmung',bestMatch.id);}catch{}
    // Erst gecachte Recs aus localStorage laden (sofort, kein Flackern)
    try{
      const cacheKey="sf_spotlight_"+bestMatch.id;
      const cached=localStorage.getItem(cacheKey);
      if(cached){
        const recs=JSON.parse(cached);
        if(recs&&recs.length>0){
          stimmungCache.current[bestMatch.id]={recs:recs.slice(0,3),reserve:recs.slice(3)};
          setStimmungRecs(recs.slice(0,3));
          recReserve.current=recs.slice(3);
          setStimmungLoading(false);
          // Cache vorhanden -> direkt nehmen, kein Background-Reload
          // (wird nach Swipe automatisch aktualisiert)
          return;
        }
      }
    }catch{}
    loadFirstRecs(bestMatch);
  },[]);

  async function loadPersonalRecs(){
    const hasRatings=Object.keys(profile.ratings||{}).length>0;
    // Zuerst gecachte KI-Picks aus letztem Swipe zeigen
    try{
      const cached=localStorage.getItem("sf_spotlight_recs");
      if(cached){const cr=JSON.parse(cached);if(cr.length>0){setPersonalRecs(cr);setPersonalLoading(false);return;}}
    }catch{}
    setPersonalLoading(true);
    try{
      const ctx=buildCtx(profile);
      const allIds=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
      const watched=new Set((profile.watched||[]).map(w=>w.id));
      const blocked=new Set(profile.blocked_titles||[]);
      // TMDB-Kandidaten parallel holen
      const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([g])=>g);
      const genreStr=topGenres.length>0?topGenres.join("|"):null;
      const [r1,r2,r3]=await Promise.all([
        discoverTitles("serie",allIds,genreStr,1,"vote_average.desc",null),
        discoverTitles("film",allIds,genreStr,1,"vote_average.desc",null),
        discoverTitles("serie",allIds,null,2,"popularity.desc",null),
      ]);
      const candidates=[...(r1.results||[]).map(x=>({...x,media_type:"tv"})),...(r2.results||[]).map(x=>({...x,media_type:"movie"})),...(r3.results||[]).map(x=>({...x,media_type:"tv"}))]
        .filter(x=>x.poster_path&&!watched.has(x.id)&&!blocked.has(titleKey(x.title||x.name||"")))
        .sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
      if(!hasRatings){
        // Noch keine Bewertungen — Top-3 direkt aus TMDB
        setPersonalRecs(candidates.slice(0,3));
        setPersonalLoading(false);
        return;
      }
      // KI-Call: 3 persönliche Picks
      const titleList=candidates.slice(0,20).map(it=>(it.title||it.name||"")+" ("+(it.media_type==="tv"?"S":"F")+")").join(", ");
      const system=`Du bist Streaming-Kurator. Antworte NUR mit JSON-Array. Format: [{"title":"...","reason":"..."}]. reason = 1 Satz mit du — warum genau dieser Titel jetzt.`;
      const msg=`Wähle 3 perfekte Titel. Kandidaten: ${titleList}. Geschmack: ${ctx.taste||"unbekannt"}. Top: ${ctx.rated5||"keine"}. Mag nicht: ${ctx.rated2||"nichts"}. Nur aus Kandidaten.`;
      const text=await callAI([{role:"user",content:msg}],system);
      const picks=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=picks.map(p=>{
        const match=candidates.find(c=>titleKey(c.title||c.name||"")===titleKey(p.title||""));
        return match?{...match,_aiReason:p.reason}:null;
      }).filter(Boolean);
      setPersonalRecs(enriched.length>0?enriched:candidates.slice(0,3));
    }catch{
      // Fallback ohne KI
      try{
        const allIds2=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]);
        const r=await discoverTitles("film",allIds2,null,1,"vote_average.desc",null);
        setPersonalRecs((r.results||[]).filter(x=>x.poster_path).slice(0,3).map(x=>({...x,media_type:"movie"})));
      }catch{}
    }
    setPersonalLoading(false);
  }

  async function loadFirstRecs(stimmung){
    setStimmungLoading(true);setStimmungRecs([]);
    shownTitles.current=new Set([...(profile.watched||[]).map(w=>w.id)]);
    Object.entries(profile.ratings||{}).filter(([,v])=>v<=2).forEach(([k])=>shownTitles.current.add(k));
    const genre=stimmung.genres[0];
    const deP=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]).join("|")||"8|9|337|350";
    const page=Math.ceil(Math.random()*4)+1;
    try{
      const [fM,fT]=await Promise.all([
        fetch(TMDB_BASE+"/discover/movie?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=vote_average.desc&vote_count.gte=80&with_genres="+genre+"&watch_region=DE&with_watch_providers="+deP+"&with_watch_monetization_types=flatrate&page="+page).then(r=>r.json()),
        fetch(TMDB_BASE+"/discover/tv?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=vote_average.desc&vote_count.gte=40&with_genres="+genre+"&watch_region=DE&with_watch_providers="+deP+"&with_watch_monetization_types=flatrate&page="+page).then(r=>r.json()),
      ]);
      const all=[...(fM.results||[]).map(it=>({...it,media_type:"movie"})),...(fT.results||[]).map(it=>({...it,media_type:"tv"}))]
        .filter(it=>it.poster_path&&!shownTitles.current.has(it.id)).sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
      const toShow=all.slice(0,3);
      recReserve.current=all.slice(3,15);
      toShow.forEach(it=>shownTitles.current.add(it.id));
      stimmungCache.current[stimmung.id]={recs:toShow,reserve:recReserve.current};
      setStimmungRecs(toShow);setStimmungLoading(false);
      try{localStorage.setItem("sf_spotlight_"+stimmung.id,JSON.stringify([...toShow,...recReserve.current]));}catch{}
      // KI nachladen im Hintergrund
      try{
        const ctx=buildCtx(profile);
        const liked=Object.entries(profile.ratings||{}).filter(([,v])=>v>=4).map(([k])=>k).slice(0,5).join(", ");
        const sys=`Du bist Streaming-Experte. Nur JSON-Array. Format: [{"title":"...","reason":"...","type":"Serie/Film"}]. reason mit du.`;
        const msg=`8 Titel fur "${stimmung.label}". Mag: ${liked||"unbekannt"}. Plattformen: ${ctx.platforms}.`;
        const txt=await callAI([{role:"user",content:msg}],sys);
        const recs=JSON.parse(txt.replace(/```json|```/g,"").trim());
        const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
        const valid=enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason})).filter(it=>it.poster_path);
        if(valid.length>=2){
          const ai=valid.slice(0,3);
          recReserve.current=[...valid.slice(3),...recReserve.current].slice(0,15);
          stimmungCache.current[stimmung.id]={recs:ai,reserve:recReserve.current};
          setStimmungRecs(ai);
          try{localStorage.setItem("sf_spotlight_"+stimmung.id,JSON.stringify([...ai,...recReserve.current]));}catch{}
        }
      }catch{}
    }catch{setStimmungLoading(false);}
  }

  async function loadStimmungRecs(stimmung){
    if(stimmungCache.current[stimmung.id]){
      const cached=stimmungCache.current[stimmung.id];
      recReserve.current=[...cached.reserve];
      // Direkt setzen ohne Loading-State -> kein Flackern
      setStimmungRecs(cached.recs);return;
    }
    setStimmungRecs([]); // Clear erst wenn kein Cache
    setStimmungLoading(true);setStimmungRecs([]);
    try{
      const ctx=buildCtx(profile);
      const likedTitles=Object.entries(profile.ratings||{}).filter(([,v])=>v>=4).map(([k])=>k).slice(0,5).join(", ");
      const dislikedTitles=Object.entries(profile.ratings||{}).filter(([,v])=>v<=2).map(([k])=>k).slice(0,3).join(", ");
      const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, kein Markdown. Format: [{"title":"...","reason":"...","type":"Serie/Film"}].`;
      const msg=`Empfehle 4 Titel für Stimmung: "${stimmung.label}".\nMag gerne: ${likedTitles||"noch unbekannt"}\nMag nicht: ${dislikedTitles||"nichts"}\nPlattformen: ${ctx.platforms}`;
      const text=await callAI([{role:"user",content:msg}],system);
      const recs=JSON.parse(text.replace(/```json|```/g,"").trim());
      const enriched=await Promise.all(recs.map(r=>enrichWithTMDB({title:r.title,type:r.type},profile)));
      const valid=enriched.filter(Boolean).map((it,i)=>({...it,_aiReason:recs[i]?.reason}));
      const toShow=valid.slice(0,3);recReserve.current=valid.slice(3);
      stimmungCache.current[stimmung.id]={recs:toShow,reserve:valid.slice(3)};
      setStimmungRecs(toShow);
    }catch(e){
      try{
        const genre2=stimmung.genres[0];const page2=Math.ceil(Math.random()*5);
        const deP2=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]).join("|")||"8|9|337|350";
        const [res2m,res2t]=await Promise.all([
          fetch(TMDB_BASE+"/discover/movie?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=vote_average.desc&vote_count.gte=100&with_genres="+genre2+"&watch_region=DE&with_watch_providers="+deP2+"&with_watch_monetization_types=flatrate&page="+page2).then(r=>r.json()),
          fetch(TMDB_BASE+"/discover/tv?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=vote_average.desc&vote_count.gte=50&with_genres="+genre2+"&watch_region=DE&with_watch_providers="+deP2+"&with_watch_monetization_types=flatrate&page="+page2).then(r=>r.json()),
        ]);
        const items2=[...(res2m.results||[]).map(it=>({...it,media_type:"movie"})),...(res2t.results||[]).map(it=>({...it,media_type:"tv"}))]
          .filter(it=>it.poster_path&&(it.genre_ids||[]).includes(genre2)).sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
        const toShow2=items2.slice(0,3);recReserve.current=items2.slice(3);
        stimmungCache.current[stimmung.id]={recs:toShow2,reserve:items2.slice(3)};setStimmungRecs(toShow2);
      }catch{}
    }
    setStimmungLoading(false);
  }

  useEffect(()=>{
    const pool=[["Breaking Bad","Inception","Peaky Blinders"],["The Dark Knight","Interstellar","Ozark"],["Narcos","The Crown","Blade Runner 2049"],["Mindhunter","1917","Severance"],["Succession","Dune","True Detective"],["The Wire","Mad Max Fury Road","Westworld"]];
    const queries=pool[Math.floor(Math.random()*pool.length)];
    Promise.all(queries.map(async q=>{
      try{const r=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&query="+encodeURIComponent(q)).then(r=>r.json());const found=(r.results||[])[0];return found?.backdrop_path?"https://image.tmdb.org/t/p/w780"+found.backdrop_path:null;}catch{return null;}
    })).then(setBgImgs);
  },[]);

  const tiles=[
    {id:"deepdive",title:"Sag mir was mir gefällt…",hint:"Sag mir was du schaust — ich sag dir was dir gefällt. Versprochen.",color:"#c4a960",accentGrad:"linear-gradient(90deg,#c4a960,#ff6b35)"},
    {id:"vibe",title:"Vibe-Meter",hint:"Düster & tief? Leicht & locker? Wir finden den perfekten Titel.",color:"#e84393",accentGrad:"linear-gradient(90deg,#e84393,#c026d3)"},
    {id:"bot",title:"Frag den Popcorn-Guru",hint:"Stell jede Frage — er hat alle Antworten.",color:"#4ade80",accentGrad:"linear-gradient(90deg,#4ade80,#22d3ee)"},
  ];
  const extras=[
    {id:"surprise",title:"Überrasch mich",hint:"1 Klick. 1 perfekter Titel.",color:"#c4a960",icon:"surprise"},
    {id:"oracle",title:"Orakel",hint:"Die Kristallkugel weiß was du brauchst.",color:"#a78bfa",icon:"oracle"},
    {id:"personality",title:"Welcher Filmtyp bin ich?",hint:"Dein persönlicher Streaming-Typ.",color:"#e84393",icon:"personality"},
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
          <button onClick={()=>setActiveFeature(null)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 16px",cursor:"pointer",color:"#c4b8c8",fontSize:13,fontFamily:"'DM Sans'",fontWeight:600,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Zurück</button>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
            <div style={{width:48,height:48,borderRadius:15,background:(active?.color||"#c4a960")+"22",border:"1.5px solid "+(active?.color||"#c4a960")+"50",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px "+(active?.color||"#c4a960")+"35"}}>
              {SpotlightIcons[activeFeature]?.(active?.color||"#c4a960",26)}
            </div>
            <div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 4px",color:"#f5f0e8"}}>{active?.title}</h3>
              <p style={{fontSize:12,color:"#7a7488",margin:0,lineHeight:1.4}}>{active?.hint}</p>
            </div>
          </div>
          {isMain?<BrowseFeature mode={activeFeature} profile={profile} cardProps={cardProps} onSelect={onSelect}/>
            :<FunFeature mode={activeFeature} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched}/>}
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      <div style={{flexShrink:0,padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(124,58,237,0.45)",flexShrink:0}}>
          {SpotlightIcons.surprise("#fff",21)}
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#c4a960,#f5e090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Spotlight</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>KI-Assistent · Persönlich · Präzise</p>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 12px 8px"}}>
        {/* Deep Dive Hero */}
        <button onClick={()=>setActiveFeature("deepdive")} style={{height:160,background:"#080810",borderRadius:22,cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",border:"none",display:"flex",flexDirection:"column",width:"100%"}}>
          {bgImgs[0]?<img src={bgImgs[0]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:0.55}}/>:<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a1510,#0f0f20)"}}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 20%,rgba(0,0,0,0.95) 100%)"}}/>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:tiles[0].accentGrad,opacity:0.9}}/>
          <div style={{position:"absolute",top:14,left:14,width:40,height:40,borderRadius:12,background:"rgba(0,0,0,0.4)",border:"1.5px solid rgba(196,169,96,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)"}}>
            {SpotlightIcons.deepdive("#c4a960",22)}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"16px 18px 18px"}}>
            <div style={{fontFamily:"'Instrument Serif',serif",fontSize:26,color:"#ffffff",marginBottom:6,lineHeight:1.1,textShadow:"0 2px 16px rgba(0,0,0,0.8)"}}>{tiles[0].title}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.4,fontWeight:500}}>{tiles[0].hint}</div>
          </div>
          <div style={{position:"absolute",bottom:18,right:16,width:32,height:32,borderRadius:10,background:"rgba(196,169,96,0.2)",border:"1.5px solid rgba(196,169,96,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4a960" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
        {/* Vibe + Guru */}
        <div style={{height:130,display:"flex",gap:8}}>
          {tiles.slice(1).map((t,ri)=>(
            <button key={t.id} onClick={()=>setActiveFeature(t.id)} style={{flex:1,background:"#080810",borderRadius:20,cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",border:"none",display:"flex",flexDirection:"column"}}>
              {bgImgs[ri+1]?<img src={bgImgs[ri+1]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:0.5}}/>:<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a1020,#0f1020)"}}/>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 15%,rgba(0,0,0,0.92) 100%)"}}/>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:t.accentGrad,opacity:0.85}}/>
              <div style={{position:"absolute",top:12,left:12,width:36,height:36,borderRadius:10,background:"rgba(0,0,0,0.4)",border:"1.5px solid "+t.color+"55",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)"}}>
                {SpotlightIcons[t.id]?.(t.color,19)}
              </div>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px 14px"}}>
                <div style={{fontFamily:"'Instrument Serif',serif",fontSize:18,color:"#ffffff",marginBottom:4,lineHeight:1.15,textShadow:"0 2px 12px rgba(0,0,0,0.9)"}}>{t.title}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",lineHeight:1.3,fontWeight:500}}>{t.hint}</div>
              </div>
            </button>
          ))}
        </div>
        {/* Stimmungsleiste */}
        <div style={{flexShrink:0,marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"0.8px",textTransform:"uppercase"}}>Was schaust du heute?</p>
            <button onClick={()=>setGenreExpanded(v=>!v)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:10,color:"#7a7488",fontFamily:"'DM Sans'",fontWeight:600}}>{genreExpanded?"Weniger":"Alle anzeigen"}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7a7488" strokeWidth="2.5"><polyline points={genreExpanded?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,overflow:"hidden",maxHeight:genreExpanded?"500px":"88px",transition:"max-height 0.35s ease"}}>
            {STIMMUNGEN.map(m=>{
              const active=activeStimmung===m.id;
              return(
                <button key={m.id} onClick={()=>{if(m.id===activeStimmung){setActiveStimmung(null);setStimmungRecs([]);return;}setActiveStimmung(m.id);activeStimmungRef.current=m.id;try{localStorage.setItem('sf_active_stimmung',m.id);}catch{}loadStimmungRecs(m);}}
                  style={{position:"relative",borderRadius:14,overflow:"hidden",cursor:"pointer",border:"2px solid "+(active?m.color:"transparent"),transition:"all 0.25s",height:80,background:"#0a0a12",boxShadow:active?"0 0 20px "+m.color+"50":"none",padding:0}}>
                  <img key={GENRE_IMAGES[m.genres[0]]||m.id} src={GENRE_IMAGES[m.genres[0]]||""} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:active?0.7:0.4,transition:"opacity 0.25s"}} onError={e=>{e.target.style.display="none";}}/>
                  <div style={{position:"absolute",inset:0,background:active?"linear-gradient(to bottom,transparent 20%,"+m.color+"70)":"linear-gradient(to bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.75))"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"5px 5px 7px",textAlign:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#fff",fontFamily:"'DM Sans'",lineHeight:1.2,textShadow:"0 1px 6px rgba(0,0,0,0.9)",display:"block"}}>{m.label}</span>
                  </div>
                  {active&&<div style={{position:"absolute",top:5,right:5,width:7,height:7,borderRadius:"50%",background:m.color,boxShadow:"0 0 8px "+m.color}}/>}
                </button>
              );
            })}
          </div>
        </div>
        {/* Stimmungs-Empfehlungen */}
        {(activeStimmung||stimmungLoading)&&(
          <div style={{marginTop:4}}>
            {stimmungLoading&&!stimmungRecs.length&&<div style={{textAlign:"center",padding:"20px 0"}}><span style={{fontSize:22,animation:"spin 1s linear infinite",display:"inline-block"}}>✨</span><p style={{color:"#b0a8b8",fontSize:12,marginTop:6}}>Suche passende Titel…</p></div>}
            {stimmungRecs.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 2px 8px"}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(196,169,96,0.3),transparent)"}}/>
                  <span style={{fontSize:10,color:"#c4a960",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"'DM Sans'"}}>Deine Empfehlungen</span>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(196,169,96,0.3))"}}/>
                </div>
                {stimmungRecs.slice(0,3).map((it,i)=>(
                  <SwipeToBlock key={it.id||i} onBlock={async()=>{
                    // Block diesen Titel
                    shownTitles.current.add(it.id||titleKey(it.title||it.name||""));
                    const st=STIMMUNGEN.find(s=>s.id===activeStimmung);
                    // Sofort aus Liste entfernen und mit Reserve auffüllen
                    setStimmungRecs(prev=>{
                      const filtered=prev.filter((_,j)=>j!==i);
                      const needed=3-filtered.length;
                      const fills=[];
                      for(let n=0;n<needed&&recReserve.current.length>0;n++){
                        const next=recReserve.current.shift();
                        shownTitles.current.add(next.id);
                        fills.push(next);
                      }
                      const newRecs=[...filtered,...fills];
                      if(activeStimmung&&stimmungCache.current[activeStimmung]){
                        stimmungCache.current[activeStimmung]={recs:newRecs,reserve:[...recReserve.current]};
                      }
                      return newRecs;
                    });
                    // Reserve nachladen wenn unter 5
                    if(recReserve.current.length<5&&st){
                      try{
                        const genre=st.genres[0];
                        const deP=(profile.platforms||[]).flatMap(id=>PLATFORMS.find(p=>p.id===id)?.tmdbIds||[]).join("|")||"8|9|337|350";
                        const page=Math.floor(Math.random()*8)+1;
                        const sortBy=Math.random()>0.5?"vote_average.desc":"popularity.desc";
                        const [rm,rt]=await Promise.all([
                          fetch(TMDB_BASE+"/discover/movie?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by="+sortBy+"&vote_count.gte=30&with_genres="+genre+"&watch_region=DE&with_watch_providers="+deP+"&with_watch_monetization_types=flatrate&page="+page).then(r=>r.json()),
                          fetch(TMDB_BASE+"/discover/tv?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by="+sortBy+"&vote_count.gte=20&with_genres="+genre+"&watch_region=DE&with_watch_providers="+deP+"&with_watch_monetization_types=flatrate&page="+page).then(r=>r.json()),
                        ]);
                        const fresh=[...(rm.results||[]).map(x=>({...x,media_type:"movie"})),...(rt.results||[]).map(x=>({...x,media_type:"tv"}))]
                          .filter(x=>x.poster_path&&!shownTitles.current.has(x.id)&&(x.genre_ids||[]).includes(genre));
                        if(fresh.length===0){
                          // Fallback: ohne Provider-Filter
                          const [rm2,rt2]=await Promise.all([
                            fetch(TMDB_BASE+"/discover/movie?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=popularity.desc&vote_count.gte=20&with_genres="+genre+"&page="+Math.floor(Math.random()*10)+1).then(r=>r.json()),
                            fetch(TMDB_BASE+"/discover/tv?api_key="+TMDB_API_KEY+"&language=de-DE&sort_by=popularity.desc&vote_count.gte=10&with_genres="+genre+"&page="+Math.floor(Math.random()*10)+1).then(r=>r.json()),
                          ]);
                          const fresh2=[...(rm2.results||[]).map(x=>({...x,media_type:"movie"})),...(rt2.results||[]).map(x=>({...x,media_type:"tv"}))]
                            .filter(x=>x.poster_path&&!shownTitles.current.has(x.id));
                          fresh2.slice(0,8).forEach(x=>shownTitles.current.add(x.id));
                          recReserve.current=[...recReserve.current,...fresh2.slice(0,8)];
                        } else {
                          fresh.slice(0,8).forEach(x=>shownTitles.current.add(x.id));
                          recReserve.current=[...recReserve.current,...fresh.slice(0,8)];
                        }
                        // Wenn Liste immer noch unter 3: direkt auffüllen
                        setStimmungRecs(prev=>{
                          if(prev.length>=3)return prev;
                          const needed2=3-prev.length;
                          const fills2=[];
                          for(let n=0;n<needed2&&recReserve.current.length>0;n++){
                            const next=recReserve.current.shift();
                            fills2.push(next);
                          }
                          const newRecs2=[...prev,...fills2];
                          if(activeStimmung&&stimmungCache.current[activeStimmung]){
                            stimmungCache.current[activeStimmung]={recs:newRecs2,reserve:[...recReserve.current]};
                          }
                          return newRecs2;
                        });
                      }catch(e){}
                    }
                  }}>
                    <SpotlightCard item={it} profile={profile} onSelect={onSelect} onRate={cardProps.onRate} onLike={cardProps.onLike} onWatched={cardProps.onWatched} onBlock={cardProps.onBlock}/>
                  </SwipeToBlock>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Geschmack verfeinern */}
        <button onClick={()=>{window.dispatchEvent(new CustomEvent("sf_open_swipe"));}}
          style={{display:"flex",alignItems:"center",gap:10,background:"rgba(196,169,96,0.06)",border:"1px solid rgba(196,169,96,0.15)",borderRadius:14,padding:"12px 16px",cursor:"pointer",width:"100%",textAlign:"left",marginBottom:4}}>
          <div style={{width:36,height:36,borderRadius:10,background:"rgba(196,169,96,0.12)",border:"1px solid rgba(196,169,96,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a960" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:2}}>Geschmack verfeinern</div>
            <div style={{fontSize:11,color:"#7a7488"}}>Swipe durch neue Titel — bessere Empfehlungen 🎯</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4060" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        {/* Extras */}
        <div style={{height:100,display:"flex",gap:8}}>
          {extras.map((e,ei)=>{
            const bgs=["rgba(196,169,96,0.06)","rgba(167,139,250,0.06)","rgba(232,67,147,0.06)"];
            const borders=["rgba(196,169,96,0.18)","rgba(167,139,250,0.18)","rgba(232,67,147,0.18)"];
            return(
              <button key={e.id} onClick={()=>setActiveFeature(e.id)}
                style={{flex:1,background:bgs[ei],border:"1px solid "+borders[ei],borderRadius:18,cursor:"pointer",textAlign:"center",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 6px"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+e.color+"60,transparent)"}}/>
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

// ── BrowseTab ──
function BrowseTab({profile,cardProps,onSelect,onSwipe,onWatched}){
  const [activeSwipe,setActiveSwipe]=useState(null);
  const [showUniversal,setShowUniversal]=useState(false);
  const [allOpen,setAllOpen]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [searchRes,setSearchRes]=useState([]);
  const [searching,setSearching]=useState(false);
  const [browseType,setBrowseType]=useState("serie");
  const searchRef=useRef(null);

  useEffect(()=>{
    function onOpenSwipe(){setShowUniversal(true);}
    function onOpenAll(){setTimeout(()=>setAllOpen(true),100);}
    window.addEventListener("sf_open_swipe_inner",onOpenSwipe);
    window.addEventListener("sf_open_all_platforms",onOpenAll);
    return()=>{
      window.removeEventListener("sf_open_swipe_inner",onOpenSwipe);
      window.removeEventListener("sf_open_all_platforms",onOpenAll);
    };
  },[]);

  async function handleSearch(q){
    if(!q.trim()){setSearchRes([]);return;}
    if(searchRef.current)clearTimeout(searchRef.current);
    searchRef.current=setTimeout(async()=>{
      setSearching(true);
      const res=await fetch(TMDB_BASE+"/search/multi?api_key="+TMDB_API_KEY+"&language=de-DE&query="+encodeURIComponent(q)).then(r=>r.json());
      setSearchRes((res.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,8));
      setSearching(false);
    },400);
  }

  if(showUniversal){
    return(
      <div style={{padding:"0 18px 24px"}}>
        <button onClick={()=>setShowUniversal(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 16px",cursor:"pointer",color:"#c4b8c8",fontSize:13,fontFamily:"'DM Sans'",fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>← Zurück</button>
        <UniversalSwipe profile={profile} cardProps={cardProps} onSelect={onSelect} onDone={()=>{setShowUniversal(false);setAllOpen(true);onSwipe&&onSwipe();}}/>
      </div>
    );
  }

  if(activeSwipe){
    const platform=PLATFORMS.find(p=>p.id===activeSwipe);
    return(
      <div style={{padding:"0 18px 24px"}}>
        <button onClick={()=>setActiveSwipe(null)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 16px",cursor:"pointer",color:"#c4b8c8",fontSize:13,fontFamily:"'DM Sans'",fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>← Zurück</button>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {["serie","film"].map(t=>(
            <button key={t} onClick={()=>setBrowseType(t)} style={{flex:1,background:browseType===t?"rgba(232,67,147,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(browseType===t?"rgba(232,67,147,0.4)":"rgba(255,255,255,0.08)"),borderRadius:10,padding:"8px",cursor:"pointer",color:browseType===t?"#e84393":"#7a7488",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>
              {t==="serie"?"📺 Serien":"🎬 Filme"}
            </button>
          ))}
        </div>
        <PlatformSwipe platform={platform} profile={profile} browseType={browseType} onBlock={cardProps.onBlock} onLike={cardProps.onLike} onRate={cardProps.onRate} onSelect={onSelect}
          onDone={(freshProfile)=>{setActiveSwipe(null);onSwipe&&onSwipe(freshProfile);}}/>
      </div>
    );
  }

  const userPlats=PLATFORMS.filter(p=>(profile.platforms||[]).includes(p.id));

  return(
    <div>
      <div style={{padding:"14px 18px 8px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#1a6b4a,#0d4a30)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(26,107,74,0.45)",flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#4ade80,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Erkunden</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>Anbieter · Swipe · Suche</p>
        </div>
      </div>

      <div style={{padding:"6px 18px 12px"}}>
        <div style={{position:"relative"}}>
          <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);handleSearch(e.target.value);}}
            placeholder="Titel suchen…"
            style={{width:"100%",padding:"13px 16px 13px 40px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          <svg style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {searchQ&&<button onClick={()=>{setSearchQ("");setSearchRes([]);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:18,padding:4}}>✕</button>}
        </div>
        {searching&&<p style={{fontSize:12,color:"#b0a8b8",textAlign:"center",padding:12}}>Suche…</p>}
        {searchRes.length>0&&(
          <div style={{background:"#12121f",borderRadius:14,border:"1px solid #1e1e30",marginTop:8}}>
            {searchRes.map((r,i)=>(
              <div key={r.id} onClick={()=>{onSelect(r);setSearchQ("");setSearchRes([]);}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<searchRes.length-1?"1px solid #1e1e30":"none",cursor:"pointer"}}>
                {r.poster_path?<img src={TMDB_IMG+r.poster_path} alt="" style={{width:32,height:48,borderRadius:6,objectFit:"cover",flexShrink:0}}/>
                  :<div style={{width:32,height:48,borderRadius:6,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{r.media_type==="tv"?"📺":"🎬"}</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title||r.name}</div>
                  <div style={{display:"flex",gap:6,marginTop:2}}>
                    <span style={{fontSize:11,color:"#888"}}>{r.media_type==="tv"?"Serie":"Film"}</span>
                    {(r.release_date||r.first_air_date)&&<span style={{fontSize:11,color:"#555"}}>{(r.release_date||r.first_air_date).substring(0,4)}</span>}
                    {r.vote_average>0&&<span style={{fontSize:11,color:"#f5c518"}}>★ {Math.round(r.vote_average*10)/10}</span>}
                  </div>
                </div>
                <div onClick={e=>{e.stopPropagation();cardProps.onLike(r);}}
                  style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>
                  {(profile.liked||[]).includes(r.id)?"❤️":"🤍"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{padding:"0 18px 12px"}}>
        <button onClick={()=>setShowUniversal(true)} style={{width:"100%",background:"linear-gradient(135deg,rgba(232,67,147,0.12),rgba(255,107,53,0.08))",border:"1px solid rgba(232,67,147,0.25)",borderRadius:16,padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
          <div style={{width:42,height:42,borderRadius:12,background:"rgba(232,67,147,0.15)",border:"1px solid rgba(232,67,147,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>🎴</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:"#f0ece4",marginBottom:2}}>Persönliche Empfehlungen</div>
            <div style={{fontSize:11,color:"#9a94a8"}}>Swipe durch Titel · bessere Empfehlungen</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div style={{padding:"0 18px 24px"}}>
        {userPlats.length===0?<p style={{fontSize:13,color:"#b0a8b8",textAlign:"center",padding:20}}>Wähle zuerst deine Anbieter im Profil.</p>
          :userPlats.map(p=>(
            <PlatformCard key={p.id} platform={p} profile={profile} browseType={browseType} onSelect={onSelect} onBlock={cardProps.onBlock} onLike={cardProps.onLike} onRate={cardProps.onRate} onWatched={onWatched}/>
          ))}
      </div>
    </div>
  );
}

// ── CollapsibleBlocked ──
function CollapsibleBlocked({blocked,onUnblock}){
  const [open,setOpen]=useState(false);
  if(!blocked||blocked.length===0)return null;
  return(
    <div style={{marginTop:12}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:12,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,color:"#ef4444",fontWeight:700,fontFamily:"'DM Sans'"}}>🚫 Ausgeblendet ({blocked.length})</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points={open?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
      </button>
      {open&&(
        <div style={{background:"#0d0d1a",borderRadius:"0 0 12px 12px",border:"1px solid rgba(239,68,68,0.1)",borderTop:"none",padding:"8px 12px"}}>
          {blocked.map(t=>(
            <div key={t} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1e1e30"}}>
              <span style={{fontSize:12,color:"#b0a8b8"}}>{t}</span>
              <button onClick={()=>onUnblock(t)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#ef4444",fontFamily:"'DM Sans'"}}>Zurück</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HistoryList ──
function HistoryList({profile,onSelect,onRate,onUnblock}){
  const watched=profile.watched||[];
  const ratings=profile.ratings||{};
  if(watched.length===0)return(
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:40,marginBottom:12}}>📺</div>
      <p style={{color:"#b0a8b8",fontSize:14,fontWeight:700}}>Noch nichts gesehen</p>
      <p style={{color:"#555",fontSize:12}}>Markiere Titel als gesehen — sie tauchen hier auf.</p>
    </div>
  );
  return(
    <div style={{padding:"0 18px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0 12px",flexShrink:0}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#1a2a6b,#0d1a4a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(26,42,107,0.45)",flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#60a5fa,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Verlauf</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>{watched.length} Titel gesehen</p>
        </div>
      </div>
      {watched.slice().reverse().map((w,i)=>{
        const myRating=ratings[titleKey(w.title)]||0;
        const poster=w.poster_path?TMDB_IMG+w.poster_path:null;
        const ratingDot=myRating>=5?{c:"#4ade80",l:"Top"}:myRating>=3?{c:"#f59e0b",l:"Ok"}:myRating>=1?{c:"#ef4444",l:"Nope"}:null;
        return(
          <div key={i} onClick={()=>w.id&&onSelect({...w,media_type:w.media_type||"movie"})}
            style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid #1e1e30",cursor:"pointer",alignItems:"center"}}>
            {poster?<img src={poster} alt="" style={{width:38,height:57,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
              :<div style={{width:38,height:57,borderRadius:8,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎬</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:"#f0ece4",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.title}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:11,color:"#888"}}>{w.media_type==="tv"?"Serie":"Film"}</span>
                {w.watchedAt&&<span style={{fontSize:10,color:"#555"}}>{new Date(w.watchedAt).toLocaleDateString("de-DE")}</span>}
              </div>
            </div>
            {ratingDot&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:ratingDot.c,boxShadow:"0 0 8px "+ratingDot.c}}/>
                <span style={{fontSize:8,color:ratingDot.c,fontWeight:700}}>{ratingDot.l}</span>
              </div>
            )}
          </div>
        );
      })}
      <CollapsibleBlocked blocked={profile.blocked_titles||[]} onUnblock={onUnblock}/>
    </div>
  );
}

// ── GenreProfile ──
function GenreProfile({profile}){
  const genres=profile.genres||{};
  const ratings=profile.ratings||{};
  const total=Object.values(ratings).filter(v=>v>0).length;
  const avg=total>0?Math.round(Object.values(ratings).filter(v=>v>0).reduce((a,b)=>a+b,0)/total*10)/10:0;
  const top=Object.entries(genres).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,5);
  const maxV=top[0]?.[1]||1;
  return(
    <div style={{background:"#12121f",borderRadius:16,padding:"14px 16px",border:"1px solid #1e1e30",marginBottom:14}}>
      <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Dein Geschmacksprofil</p>
      <div style={{display:"flex",gap:16,marginBottom:12}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#f0ece4"}}>{total}</div>
          <div style={{fontSize:10,color:"#555"}}>Bewertet</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:900,color:avg>=4?"#4ade80":avg>=3?"#fbbf24":"#fb923c"}}>{avg||"–"}</div>
          <div style={{fontSize:10,color:"#555"}}>Ø Bewertung</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#f0ece4"}}>{(profile.liked||[]).length}</div>
          <div style={{fontSize:10,color:"#555"}}>Gemerkt</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#f0ece4"}}>{(profile.watched||[]).length}</div>
          <div style={{fontSize:10,color:"#555"}}>Gesehen</div>
        </div>
      </div>
      {top.length>0&&(
        <div>
          <p style={{fontSize:10,color:"#555",marginBottom:8}}>Lieblingsgenres:</p>
          {top.map(([gid,v])=>(
            <div key={gid} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:11,color:"#c4b8c8",width:70,flexShrink:0}}>{GENRE_EMOJI[gid]} {GENRES_TMDB[gid]||gid}</span>
              <div style={{flex:1,height:4,background:"#1a1a2e",borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${(v/maxV)*100}%`,height:"100%",background:"linear-gradient(90deg,#ff6b35,#e84393)",borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LikedTab ──
function LikedTab({profile,onSelect,onRate,onLike,onWatched,onUnblock}){
  const liked_items=profile.liked_items||[];
  const ratings=profile.ratings||{};
  if(liked_items.length===0)return(
    <div style={{padding:"0 18px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0 12px"}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#6b1a2a,#4a0d1a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(107,26,42,0.45)",flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#f87171,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Watchlist</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>Noch leer</p>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>🤍</div>
        <p style={{color:"#b0a8b8",fontSize:14,fontWeight:700}}>Noch nichts gemerkt</p>
        <p style={{color:"#555",fontSize:12}}>Tippe das Herz-Symbol bei einem Titel um ihn zu merken.</p>
      </div>
    </div>
  );
  return(
    <div style={{padding:"0 18px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0 12px"}}>
        <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#6b1a2a,#4a0d1a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(107,26,42,0.45)",flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </div>
        <div>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 1px",background:"linear-gradient(135deg,#f87171,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Watchlist</h2>
          <p style={{fontSize:10,color:"#5a5468",margin:0,letterSpacing:"1px",textTransform:"uppercase"}}>{liked_items.length} Titel gemerkt</p>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {liked_items.map((item,i)=>{
          const title=item.title||item.name||"";
          const myRating=ratings[titleKey(title)]||0;
          const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
          const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
          const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
          const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
          return(
            <div key={item.id||i} style={{background:"#12121f",borderRadius:16,overflow:"hidden",border:"1px solid #1e1e30"}}>
              <div onClick={()=>onSelect(item)} style={{display:"flex",gap:12,padding:12,cursor:"pointer",alignItems:"flex-start"}}>
                {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
                  :<div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🎬</div>}
                <div style={{flex:1,minWidth:0}}>
                  <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h3>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                    <span style={{fontSize:11,color:"#c4b8c8",background:"#1a1a2e",padding:"2px 8px",borderRadius:6,fontWeight:700}}>{item.media_type==="tv"?"Serie":"Film"}</span>
                    {score>0&&<div style={{display:"inline-flex",alignItems:"center",gap:2,background:`${scoreColor}18`,padding:"2px 8px",borderRadius:6}}>
                      <span style={{color:"#f5c518",fontSize:10}}>★</span><span style={{color:scoreColor,fontSize:11,fontWeight:900}}>{score}</span>
                    </div>}
                    {isWatched&&<span style={{fontSize:11,color:"#4ade80"}}>✓ Gesehen</span>}
                  </div>
                  {item.overview&&<p style={{margin:0,fontSize:12,color:"#a09aaa",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
                </div>
              </div>
              <div onClick={e=>e.stopPropagation()} style={{padding:"4px 12px 10px",display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>!isWatched&&onWatched(item)}
                  style={{background:isWatched?"rgba(74,222,128,0.12)":"rgba(255,255,255,0.05)",border:"1px solid "+(isWatched?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.1)"),borderRadius:8,padding:"5px 12px",cursor:isWatched?"default":"pointer",fontSize:11,color:isWatched?"#4ade80":"#888",fontFamily:"'DM Sans'",fontWeight:600}}>
                  {isWatched?"✓ Gesehen":"Gesehen"}
                </button>
                <button onClick={()=>onLike(item)}
                  style={{width:32,height:32,borderRadius:8,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>❤️</button>
                <div style={{flex:1}}/>
                <LedStrip itemTitle={title} profile={profile} onRate={onRate} genre_ids={item.genre_ids||[]}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TourModal ──
function TourModal({onClose}){
  const [step,setStep]=useState(0);
  const steps=[
    {emoji:"✨",title:"Willkommen bei StreamFinder!",text:"Dein persönlicher Streaming-Assistent. Er lernt deinen Geschmack und findet die perfekten Titel für dich."},
    {emoji:"🎬",title:"Spotlight",text:"Wähle eine Stimmung und bekomme sofort KI-Empfehlungen. Oder frag den Popcorn-Guru — er kennt alle Antworten."},
    {emoji:"🔍",title:"Erkunden",text:"Swipe durch Titel von deinen Anbietern. Je mehr du swiped, desto besser werden die Empfehlungen."},
    {emoji:"❤️",title:"Merken & Bewerten",text:"Tippe das Herz um Titel zu merken. Die 3 LED-Punkte (Nope · Ok · Top) beeinflussen alle künftigen Empfehlungen."},
  ];
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#12121f",borderRadius:24,padding:"28px 24px",maxWidth:360,width:"100%",border:"1px solid #2a2340",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>{s.emoji}</div>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,color:"#f0ece4",margin:"0 0 12px"}}>{s.title}</h2>
        <p style={{fontSize:14,color:"#b0a8b8",lineHeight:1.6,marginBottom:24}}>{s.text}</p>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {steps.map((_,i)=><div key={i} style={{width:i===step?20:7,height:7,borderRadius:4,background:i===step?"#e84393":"#2a2340",transition:"all 0.3s"}}/>)}
        </div>
        <div style={{display:"flex",gap:10}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"#1a1a2e",border:"1px solid #2a2340",borderRadius:12,padding:12,cursor:"pointer",color:"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:700}}>← Zurück</button>}
          <button onClick={()=>step<steps.length-1?setStep(s=>s+1):onClose()} style={{flex:2,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:12,padding:12,cursor:"pointer",color:"#fff",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14}}>
            {step<steps.length-1?"Weiter →":"Los geht's! 🍿"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding ──
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [selPlats,setSelPlats]=useState([]);
  const [selStimmungen,setSelStimmungen]=useState([]);
  const [showStartSwipe,setShowStartSwipe]=useState(false);
  // Hero hooks müssen auf Top-Level stehen (React-Regel)
  const heroImgs=[
    "https://image.tmdb.org/t/p/original/9faGSFi5jam6pDWGNd0p8JztGJY.jpg",
    "https://image.tmdb.org/t/p/original/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    "https://image.tmdb.org/t/p/original/xMKPuCcKFCEpUCP4YFfuKAIrfWY.jpg",
    "https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg",
    "https://image.tmdb.org/t/p/original/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg",
  ];
  const [heroIdx,setHeroIdx]=useState(()=>Math.floor(Math.random()*6));
  const heroImg=heroImgs[heroIdx%heroImgs.length];
  useEffect(()=>{
    if(step!==0)return;
    const t=setInterval(()=>setHeroIdx(i=>(i+1)%heroImgs.length),4000);
    return()=>clearInterval(t);
  },[step]);
  const sprueche=[
    {h:"Heute Abend\ngehört dir.",s:"Lehn dich zurück. Wir übernehmen ab hier."},,
    {h:"Kein Scrollen\nmehr.",s:"Dein nächster Lieblingstitel wartet schon."},
    {h:"Du weißt noch\nnicht was du schaust.",s:"Aber gleich schon."},
    {h:"Der perfekte\nAbend beginnt hier.",s:"Nicht auf Netflix suchen. Hier finden."},
    {h:"Endlich eine App\ndie dich kennt.",s:"Nicht alle. Nur dich."},
  ];
  const sp=sprueche[heroIdx%sprueche.length];
  function togglePlat(id){setSelPlats(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  function toggleStimmung(id){setSelStimmungen(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  function buildProfile(){
    const genres={};
    selStimmungen.forEach(sid=>{const s=STIMMUNGEN.find(x=>x.id===sid);if(s)s.genres.forEach(g=>{genres[g]=(genres[g]||0)+5;});});
    return{platforms:selPlats,genres,ratings:{},liked:[],liked_items:[],watched:[],blocked_titles:[],languages:[]};
  }
  function finish(){const p=buildProfile();sSet("sf_profile",p);onDone(p);}
  function goToSwipe(){const p=buildProfile();sSet("sf_profile",p);setShowStartSwipe(true);}
  if(showStartSwipe){
    const profile=buildProfile();
    if(!profile||!profile.platforms)return null;
    return(
      <div style={{minHeight:"100vh",background:"#09090f",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <StreamFinderLogo size={34} showText={true}/>
          <button onClick={finish} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"6px 14px",color:"#888",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'"}}>Überspringen</button>
        </div>
        <div style={{padding:"16px 20px 8px"}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,color:"#f0ece4",margin:"0 0 4px"}}>Erster Eindruck 🎴</h2>
          <p style={{fontSize:13,color:"#7a7488",margin:0}}>Swipe kurz durch ein paar Titel — StreamFinder lernt deinen Geschmack.</p>
        </div>
        <div style={{flex:1,padding:"0 18px",overflowY:"auto"}}>
          <UniversalSwipe profile={profile} cardProps={{onRate:()=>{},onLike:()=>{},onWatched:()=>{},onBlock:()=>{}}} onSelect={()=>{}} onDone={()=>{sSet("sf_profile",profile);onDone(profile);}}/>
        </div>
      </div>
    );
  }
  if(step===0){
    const sprueche=[
      {h:"Heute Abend\ngehört dir.",s:"Lehn dich zurück. Wir übernehmen ab hier."},
      {h:"Kein Scrollen\nmehr.",s:"Dein nächster Lieblingstitel wartet schon."},
      {h:"Du weißt noch\nnicht was du schaust.",s:"Aber gleich schon."},
      {h:"Der perfekte\nAbend beginnt hier.",s:"Nicht auf Netflix suchen. Hier finden."},
      {h:"Endlich eine App\ndie dich kennt.",s:"Nicht alle. Nur dich."},
    ];
    const sp=sprueche[Math.floor(Math.random()*sprueche.length)];
    return(
      <div style={{height:"100vh",maxHeight:"-webkit-fill-available",background:"#09090f",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
        {/* Filmbild */}
        {/* Crossfade zwischen Bildern */}
        {heroImgs.map((img,idx)=>(
          <img key={img} src={img} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 25%",opacity:heroImgs.indexOf(heroImg)===idx?1:0,transition:"opacity 1.5s ease",pointerEvents:"none"}} onError={e=>{e.target.style.display="none";}}/>
        ))}
        {/* Film-Grain entfernt */}
        {/* SVG data-URL entfernt wegen Build-Fehler */}
        {/* Dramatisches Vignette-Gradient */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.1) 30%,rgba(9,9,15,0.7) 62%,#09090f 88%)",zIndex:2}}/>
        {/* Seitliche Vignette */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.6) 100%)",zIndex:2,pointerEvents:"none"}}/>
        {/* Lila Kinostimmung oben */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(to bottom,rgba(60,20,100,0.4),transparent)",zIndex:2,pointerEvents:"none"}}/>
        {/* Leichtes Letterbox oben */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:28,background:"rgba(0,0,0,0.7)",zIndex:3}}/>
        {/* Leichtes Letterbox unten */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:28,background:"rgba(0,0,0,0.7)",zIndex:3}}/>
        {/* StreamFinder Logo — oben zentriert */}
        <div style={{position:"relative",zIndex:4,padding:"54px 0 0",display:"flex",justifyContent:"center"}}>
          <div style={{background:"rgba(0,0,0,0.35)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"10px 20px"}}>
            <StreamFinderLogo size={44} showText={true}/>
          </div>
        </div>
        {/* Content unten */}
        <div style={{position:"relative",zIndex:4,marginTop:"auto",padding:"0 28px 48px"}}>
          <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:50,lineHeight:1.05,color:"#fff",margin:"0 0 14px",textShadow:"0 2px 40px rgba(0,0,0,0.9),0 0 80px rgba(124,58,237,0.3)",whiteSpace:"pre-line"}}>{sp.h}</h1>
          <p style={{fontSize:16,color:"rgba(255,255,255,0.55)",lineHeight:1.55,margin:"0 0 32px",fontFamily:"'DM Sans'",fontWeight:400,textShadow:"0 1px 8px rgba(0,0,0,0.8)"}}>{sp.s}</p>
          <button onClick={()=>setStep(1)} style={{width:"100%",background:"linear-gradient(135deg,#7c3aed,#e84393)",border:"none",borderRadius:18,padding:"19px",color:"#fff",fontFamily:"'DM Sans'",fontWeight:800,fontSize:17,cursor:"pointer",boxShadow:"0 8px 40px rgba(124,58,237,0.55),0 0 0 1px rgba(255,255,255,0.1)"}}>
            Loslegen →
          </button>
        </div>
      </div>
    );
  }
  if(step===1){
    return(
      <div style={{height:"100vh",background:"linear-gradient(180deg,#09090f,#0d0d1a)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"36px 24px 16px",textAlign:"center",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <StreamFinderLogo size={46} showText={true}/>
          </div>
          <p style={{fontSize:11,color:"#5a5468",margin:0,letterSpacing:"1.5px",textTransform:"uppercase"}}>Schritt 1 von 2</p>
        </div>
        {/* Titel */}
        <div style={{padding:"0 20px 10px",flexShrink:0}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:24,color:"#f0ece4",margin:"0 0 4px"}}>Deine Anbieter</h2>
          <p style={{fontSize:13,color:"#7a7488",margin:0}}>Welche Streaming-Dienste nutzt du?</p>
        </div>
        {/* Grid — passt sich automatisch an, kein Scroll nötig */}
        <div style={{flex:1,padding:"0 16px",display:"flex",alignItems:"center",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,width:"100%"}}>
            {PLATFORMS.map(p=>{
              const sel=selPlats.includes(p.id);
              return(<button key={p.id} onClick={()=>togglePlat(p.id)} style={{background:sel?p.color+"22":"rgba(255,255,255,0.04)",border:"2px solid "+(sel?p.color:"rgba(255,255,255,0.08)"),borderRadius:14,padding:"clamp(8px,2vh,14px) 10px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",boxShadow:sel?"0 0 20px "+p.color+"44":"none",position:"relative"}}>
                {sel&&<div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:9,background:p.color,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg></div>}
                <div style={{fontSize:"clamp(18px,3vw,24px)",fontWeight:900,color:p.color,marginBottom:4}}>{p.icon}</div>
                <div style={{fontSize:"clamp(11px,1.8vw,13px)",fontWeight:700,color:sel?p.color:"#b0a8b8"}}>{p.name}</div>
              </button>);
            })}
          </div>
        </div>
        {/* Button — immer sichtbar */}
        <div style={{padding:"12px 20px 16px",display:"flex",gap:10,flexShrink:0,background:"linear-gradient(to top,#09090f 80%,transparent)"}}>
          <button onClick={()=>setStep(0)} style={{width:52,height:52,borderRadius:14,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",color:"#b0a8b8",fontSize:20,flexShrink:0}}>←</button>
          <button onClick={()=>setStep(2)} disabled={selPlats.length===0} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"14px",cursor:"pointer",color:"#fff",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,opacity:selPlats.length===0?0.4:1}}>
            Weiter → {selPlats.length>0&&`(${selPlats.length})`}
          </button>
        </div>
        <div style={{display:"flex",gap:5,justifyContent:"center",paddingBottom:16,flexShrink:0}}>
          {[0,1,2].map(i=><div key={i} style={{width:i===1?24:7,height:6,borderRadius:3,background:i===1?"#e84393":"#1e1e30",transition:"all 0.3s"}}/>)}
        </div>
      </div>
    );
  }
  if(step===2){
    return(
      <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#09090f,#0d0d1a)",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"40px 24px 16px",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <StreamFinderLogo size={46} showText={true}/>
          </div>
          <p style={{fontSize:11,color:"#5a5468",margin:0,letterSpacing:"1.5px",textTransform:"uppercase"}}>Schritt 2 von 2</p>
        </div>
        <div style={{flex:1,padding:"0 20px",overflowY:"auto"}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,color:"#f0ece4",margin:"0 0 6px"}}>Dein Geschmack</h2>
          <p style={{fontSize:13,color:"#7a7488",marginBottom:14}}>Was schaust du am liebsten?</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {STIMMUNGEN.map(m=>{
              const sel=selStimmungen.includes(m.id);
              return(<button key={m.id} onClick={()=>toggleStimmung(m.id)} style={{position:"relative",borderRadius:16,overflow:"hidden",cursor:"pointer",border:"2px solid "+(sel?m.color:"transparent"),transition:"all 0.2s",height:90,background:"#0a0a12",boxShadow:sel?"0 0 24px "+m.color+"50":"none",padding:0}}>
                <img key={GENRE_IMAGES[m.genres[0]]||m.id} src={GENRE_IMAGES[m.genres[0]]||""} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%",opacity:sel?0.9:0.55,transition:"opacity 0.2s"}} onError={e=>{e.target.style.display="none";}}/>
                <div style={{position:"absolute",inset:0,background:sel?"linear-gradient(to bottom,transparent 20%,"+m.color+"80)":"linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.8))"}}/>
                {sel&&<div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:9,background:m.color,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg></div>}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"5px 5px 8px",textAlign:"center"}}><span style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'DM Sans'",textShadow:"0 1px 6px rgba(0,0,0,0.9)",display:"block"}}>{m.label}</span></div>
              </button>);
            })}
          </div>
        </div>
        <div style={{padding:"16px 20px 16px",display:"flex",gap:10}}>
          <button onClick={()=>setStep(1)} style={{width:52,height:52,borderRadius:14,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",color:"#b0a8b8",fontSize:20,flexShrink:0}}>←</button>
          <button onClick={finish} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"14px",cursor:"pointer",color:"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>Direkt starten</button>
          <button onClick={goToSwipe} style={{flex:2,background:"linear-gradient(135deg,#c4a960,#ff6b35)",border:"none",borderRadius:14,padding:"14px",cursor:"pointer",color:"#fff",fontFamily:"'DM Sans'",fontWeight:800,fontSize:14,boxShadow:"0 6px 24px rgba(196,169,96,0.35)"}}>🎴 Erste Titel →</button>
        </div>
        <div style={{display:"flex",gap:5,justifyContent:"center",paddingBottom:20}}>
          {[0,1,2].map(i=><div key={i} style={{width:i===2?24:7,height:6,borderRadius:3,background:i===2?"#c4a960":"#1e1e30",transition:"all 0.3s"}}/>)}
        </div>
      </div>
    );
  }
  return null;
}

// ── ProfileModal ──
function ProfileModal({profile,onClose,onUpdate,onReset}){
  const [selPlats,setSelPlats]=useState(profile.platforms||[]);
  const [selLangs,setSelLangs]=useState(profile.languages||[]);
  const [showReset,setShowReset]=useState(false);
  const LANGS=[
    {code:"de",label:"Deutsch 🇩🇪"},{code:"en",label:"Englisch 🇬🇧"},
    {code:"fr",label:"Französisch 🇫🇷"},{code:"es",label:"Spanisch 🇪🇸"},
    {code:"ja",label:"Japanisch 🇯🇵"},{code:"ko",label:"Koreanisch 🇰🇷"},
  ];
  function save(){onUpdate({...profile,platforms:selPlats,languages:selLangs});onClose();}
  function togglePlat(id){setSelPlats(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  function toggleLang(code){setSelLangs(p=>p.includes(code)?p.filter(x=>x!==code):[...p,code]);}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxHeight:"90vh",overflowY:"auto",background:"#0d0d1a",borderRadius:"24px 24px 0 0",paddingBottom:40}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#2a2340"}}/>
        </div>
        <div style={{padding:"12px 20px 16px",borderBottom:"1px solid #1e1e30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,color:"#f0ece4",margin:0}}>Mein Profil</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:20,padding:0}}>✕</button>
        </div>
        <div style={{padding:"16px 20px"}}>
          <GenreProfile profile={profile}/>
          <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Meine Anbieter</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
            {PLATFORMS.map(p=>{
              const sel=selPlats.includes(p.id);
              return(
                <button key={p.id} onClick={()=>togglePlat(p.id)}
                  style={{background:sel?p.color+"22":"#12121f",border:"2px solid "+(sel?p.color:"#1e1e30"),borderRadius:14,padding:"12px",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
                  <div style={{fontSize:18,color:p.color,marginBottom:4}}>{p.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:sel?p.color:"#b0a8b8"}}>{p.name}</div>
                </button>
              );
            })}
          </div>
          <p style={{fontSize:11,color:"#b0a8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Originalsprachen</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
            {LANGS.map(l=>{
              const sel=selLangs.includes(l.code);
              return(
                <button key={l.code} onClick={()=>toggleLang(l.code)}
                  style={{background:sel?"rgba(196,169,96,0.15)":"rgba(255,255,255,0.05)",border:"1px solid "+(sel?"rgba(196,169,96,0.4)":"rgba(255,255,255,0.1)"),borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,color:sel?"#c4a960":"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:sel?700:400}}>
                  {l.label}
                </button>
              );
            })}
          </div>
          {selLangs.length===0&&<p style={{fontSize:11,color:"#555",fontStyle:"italic",marginBottom:20}}>Keine Einschränkung: Alle Sprachen</p>}
          <button onClick={save} style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:14,color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,marginBottom:10}}>
            Speichern ✓
          </button>

          {!showReset?(
            <button onClick={()=>setShowReset(true)} style={{width:"100%",background:"transparent",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:12,cursor:"pointer",color:"#ef4444",fontFamily:"'DM Sans'",fontWeight:600,fontSize:13}}>
              Profil zurücksetzen
            </button>
          ):(
            <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:14,padding:16}}>
              <p style={{color:"#ef4444",fontSize:13,textAlign:"center",marginBottom:12}}>⚠️ Wirklich alle Daten löschen?</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setShowReset(false)} style={{flex:1,background:"#1a1a2e",border:"1px solid #2a2340",borderRadius:10,padding:10,cursor:"pointer",color:"#b0a8b8",fontFamily:"'DM Sans'",fontWeight:700}}>Abbrechen</button>
                <button onClick={onReset} style={{flex:1,background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,padding:10,cursor:"pointer",color:"#ef4444",fontFamily:"'DM Sans'",fontWeight:700}}>Ja, löschen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StreamFinderLogo({size=40,showText=true}){
  const iconSize=size;
  return(
    <div style={{display:"flex",alignItems:"center",gap:showText?9:0}}>
      {/* SF Block — wie ein Stempel */}
      <div style={{
        width:iconSize,height:iconSize,
        borderRadius:Math.round(iconSize*0.28),
        background:"linear-gradient(145deg,#1a0533,#2d0a4e)",
        border:"1.5px solid rgba(196,169,96,0.5)",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        boxShadow:"0 0 12px rgba(196,169,96,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
        position:"relative",overflow:"hidden",
        flexShrink:0,
      }}>
        {/* Shimmer Line */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(196,169,96,0.6),transparent)"}}/>
        {/* SF Text */}
        <span style={{
          fontFamily:"'Instrument Serif',serif",
          fontSize:Math.round(iconSize*0.48),
          lineHeight:1,
          background:"linear-gradient(160deg,#f5e090,#c4a960,#e84393)",
          WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent",
          letterSpacing:"-1px",
          fontWeight:400,
        }}>SF</span>
      </div>
      {showText&&(
        <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
          <span style={{
            fontFamily:"'DM Sans',sans-serif",
            fontSize:Math.round(iconSize*0.38),
            fontWeight:800,
            letterSpacing:"0.5px",
            color:"#f0ece4",
            lineHeight:1.1,
          }}>Stream</span>
          <span style={{
            fontFamily:"'DM Sans',sans-serif",
            fontSize:Math.round(iconSize*0.28),
            fontWeight:400,
            letterSpacing:"2.5px",
            textTransform:"uppercase",
            background:"linear-gradient(90deg,#c4a960,#e84393)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            lineHeight:1.2,
          }}>Finder</span>
        </div>
      )}
    </div>
  );
}

// ── MainApp ──
function MainApp({initialProfile}){
  const [profile,setProfile]=useState(initialProfile);
  const [activeTab,setActiveTab]=useState("spotlight");
  const [selectedItem,setSelectedItem]=useState(null);
  const [showProfile,setShowProfile]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [showTour,setShowTour]=useState(false);
  const [showHelpHint,setShowHelpHint]=useState(()=>{
    // Nur beim allerersten Start zeigen
    try{return!localStorage.getItem('sf_help_hint_seen');}catch{return false;}
  });
  useEffect(()=>{
    if(showHelpHint){
      // Nach 5s automatisch ausblenden
      const t=setTimeout(()=>{
        setShowHelpHint(false);
        try{localStorage.setItem('sf_help_hint_seen','1');}catch{}
      },5000);
      return()=>clearTimeout(t);
    }
  },[showHelpHint]);
  const [browseAllOpen,setBrowseAllOpen]=useState(false);

  function saveProfile(p){setProfile(p);sSet("sf_profile",p);}

  useEffect(()=>{
    function onGotoBrowse(){
      setActiveTab("browse");
      // Alle Anbieter aufklappen via Event
      setTimeout(()=>window.dispatchEvent(new CustomEvent("sf_open_all_platforms")),200);
    }
    window.addEventListener("sf_swipe_done_goto_browse",onGotoBrowse);
    return()=>window.removeEventListener("sf_swipe_done_goto_browse",onGotoBrowse);
  },[]);

  useEffect(()=>{
    function onOpenSwipe(){
      setActiveTab("browse");
      setTimeout(()=>window.dispatchEvent(new CustomEvent("sf_open_swipe_inner")),150);
    }
    function onSwipeDone(e){
      // Nach Swipe: zu Erkunden wechseln + alle Anbieter aufklappen
      setActiveTab("browse");
      setBrowseAllOpen(true);
      // Spotlight-Empfehlungen aus localStorage laden falls KI neue berechnet hat
      if(e?.detail?.hasNewSpotlight){
        window.dispatchEvent(new CustomEvent("sf_reload_spotlight"));
      }
    }
    window.addEventListener("sf_open_swipe",onOpenSwipe);
    window.addEventListener("sf_swipe_done",onSwipeDone);
    return()=>{window.removeEventListener("sf_open_swipe",onOpenSwipe);window.removeEventListener("sf_swipe_done",onSwipeDone);};
  },[]);

  function handleRate(itemTitle,stars,genre_ids){
    const key=titleKey(itemTitle);
    const newRatings={...profile.ratings,[key]:stars};
    const newGenres={...profile.genres};
    if(genre_ids&&genre_ids.length>0){
      const boost=stars>=4?3:stars>=3?1:stars>0?-2:0;
      genre_ids.forEach(g=>{newGenres[g]=(newGenres[g]||0)+boost;});
    }
    const p={...profile,ratings:newRatings,genres:newGenres};
    saveProfile(p);
    window.dispatchEvent(new CustomEvent("sf_rated",{detail:{title:itemTitle,stars,genre_ids}}));
  }

  function handleLike(item){
    const liked=[...(profile.liked||[])];
    const liked_items=[...(profile.liked_items||[])];
    const idx=liked.indexOf(item.id);
    if(idx>=0){liked.splice(idx,1);const ii=liked_items.findIndex(x=>x.id===item.id);if(ii>=0)liked_items.splice(ii,1);}
    else{liked.push(item.id);if(!liked_items.find(x=>x.id===item.id))liked_items.push(item);}
    saveProfile({...profile,liked,liked_items});
  }

  function handleWatched(item){
    const watched=[...(profile.watched||[])];
    const already=watched.some(w=>w.id===item.id);
    if(!already){
      watched.push({id:item.id,title:item.title||item.name||"",media_type:item.media_type||"movie",poster_path:item.poster_path||null,genre_ids:item.genre_ids||[],watchedAt:Date.now()});
      const liked=[...(profile.liked||[])].filter(id=>id!==item.id);
      const liked_items=[...(profile.liked_items||[])].filter(x=>x.id!==item.id);
      saveProfile({...profile,watched,liked,liked_items});
      window.dispatchEvent(new CustomEvent("sf_watched",{detail:{id:item.id,title:item.title||item.name||""}}));
    }
  }

  function handleBlock(titleStr){
    const key=titleKey(titleStr);
    const blocked=[...(profile.blocked_titles||[])];
    if(!blocked.includes(key))blocked.push(key);
    saveProfile({...profile,blocked_titles:blocked});
    window.dispatchEvent(new CustomEvent("sf_blocked",{detail:{title:titleStr}}));
  }

  function handleUnblock(titleStr){
    const key=titleKey(titleStr);
    const blocked=(profile.blocked_titles||[]).filter(t=>t!==key);
    saveProfile({...profile,blocked_titles:blocked});
  }

  function handleReset(){
    sDel("sf_profile");
    PLATFORMS.forEach(p=>localStorage.removeItem("sf_plat_"+p.id));
    window.location.reload();
  }

  const cardProps={onRate:handleRate,onLike:handleLike,onWatched:handleWatched,onBlock:handleBlock};

  const TABS=[
    {id:"spotlight", icon:"✨", label:"Spotlight",  sub:"KI"},
    {id:"browse",    icon:"🔍", label:"Erkunden",   sub:"Swipe"},
    {id:"liked",     icon:"❤️", label:"Watchlist",  sub:"Gemerkt"},
    {id:"history",   icon:"🕐", label:"Verlauf",    sub:"Gesehen"},
  ];

  return(
    <div style={{maxWidth:820,margin:"0 auto",minHeight:"100vh",background:"#09090f",position:"relative",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{background:#09090f;color:#f0ece4;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input{-webkit-appearance:none;}
        ::-webkit-scrollbar{width:0px;}
      `}</style>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(9,9,15,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.05)",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <StreamFinderLogo size={46} showText={true}/>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>{setShowHelp(true);setShowHelpHint(false);try{localStorage.setItem('sf_help_hint_seen','1');}catch{}}}
            style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"6px 10px",cursor:"pointer",color:"#7a7488",fontSize:12,fontFamily:"'DM Sans'",fontWeight:600}}>
            <span style={{fontSize:13,fontWeight:700,color:"#b0a8b8"}}>?</span>
            <span>Hilfe</span>
          </button>
          <button onClick={()=>setShowProfile(true)} style={{width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>👤</button>
        </div>
      </div>

      {/* Dauerhafter dezenter Hilfe-Hinweis */}
      <div style={{background:"rgba(196,169,96,0.06)",borderBottom:"1px solid rgba(196,169,96,0.1)",padding:"5px 16px",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
        <span style={{fontSize:10,color:"rgba(196,169,96,0.6)"}}>💡</span>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans'"}}>Neu hier? Tippe</span>
        <span style={{fontSize:10,color:"rgba(196,169,96,0.6)",fontWeight:700,fontFamily:"'DM Sans'"}}>? Hilfe</span>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans'"}}>für eine Einführung.</span>
      </div>
      {/* Content */}
      <div style={{paddingBottom:80}}>
        <div style={{display:activeTab==="spotlight"?"block":"none"}}><SpotlightTab profile={profile} cardProps={cardProps} onSelect={setSelectedItem}/></div>
        {activeTab==="browse"&&<BrowseTab profile={profile} cardProps={cardProps} onSelect={setSelectedItem} onWatched={handleWatched} allOpen={browseAllOpen} onAllOpenDone={()=>setBrowseAllOpen(false)}/>}
        {activeTab==="liked"&&<LikedTab profile={profile} onSelect={setSelectedItem} onRate={handleRate} onLike={handleLike} onWatched={handleWatched} onUnblock={handleUnblock}/>}
        {activeTab==="history"&&<HistoryList profile={profile} onSelect={setSelectedItem} onRate={handleRate} onUnblock={handleUnblock}/>}
      </div>

      {/* Tab Bar mit Subtitles */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:820,background:"rgba(9,9,15,0.97)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(255,255,255,0.07)",zIndex:100,padding:"6px 0 calc(env(safe-area-inset-bottom) + 6px)"}}>
        <div style={{display:"flex"}}>
          {TABS.map(tab=>{
            const active=activeTab===tab.id;
            return(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"6px 4px 2px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative"}}>
                {active&&<div style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:"linear-gradient(90deg,#ff6b35,#e84393)",borderRadius:"0 0 2px 2px"}}/>}
                <span style={{fontSize:20,lineHeight:1,transition:"transform 0.2s",transform:active?"scale(1.15)":"scale(1)"}}>{tab.icon}</span>
                <span style={{fontSize:10,fontWeight:700,color:active?"#f0ece4":"#3a3344",fontFamily:"'DM Sans'",lineHeight:1,transition:"color 0.2s"}}>{tab.label}</span>
                <span style={{fontSize:8,color:active?"#c4a960":"#2a2240",fontFamily:"'DM Sans'",fontWeight:600,lineHeight:1}}>{tab.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {selectedItem&&<DetailModal item={selectedItem} profile={profile} onClose={()=>setSelectedItem(null)} onRate={handleRate} onLike={handleLike} onWatched={handleWatched} onBlock={handleBlock}/>}
      {showProfile&&<ProfileModal profile={profile} onClose={()=>setShowProfile(false)} onUpdate={p=>{saveProfile(p);}} onReset={handleReset}/>}
      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)} activeTab={activeTab}/>}
      {showTour&&<TourModal onClose={()=>setShowTour(false)}/>}
    </div>
  );
}

// ── StreamFinder Root ──
export default function StreamFinder(){
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const stored=sGet("sf_profile");
    if(stored&&stored.platforms&&stored.platforms.length>0){setProfile(stored);}
    setLoading(false);
  },[]);
  if(loading)return(
    <div style={{minHeight:"100vh",background:"#09090f",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:56,height:56,borderRadius:18,background:"linear-gradient(135deg,#7c3aed,#e84393)",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 2s infinite"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      </div>
      <span style={{fontFamily:"'Instrument Serif',serif",fontSize:28,background:"linear-gradient(135deg,#c4a960,#f5e090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>StreamFinder</span>
    </div>
  );
  if(!profile)return<Onboarding onDone={p=>{setProfile(p);}}/>;
  return<MainApp initialProfile={profile}/>;
}
