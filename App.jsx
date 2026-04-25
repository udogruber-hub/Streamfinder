import { useState, useEffect, useRef } from "react";

const DEFAULT_API_KEY = "7b1cb8c1071afbbf54d15e7724645086";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

const PLATFORMS = [
  { id: "netflix",   name: "Netflix",     color: "#E50914", icon: "N",  tmdbIds: [8] },
  { id: "prime",     name: "Prime Video", color: "#00A8E1", icon: "P",  tmdbIds: [9, 119] },
  { id: "appletv",   name: "Apple TV+",   color: "#A2AAAD", icon: "🍎", tmdbIds: [350] },
  { id: "disney",    name: "Disney+",     color: "#113CCF", icon: "D",  tmdbIds: [337] },
  { id: "wow",       name: "WOW",         color: "#00B4CC", icon: "W",  tmdbIds: [29, 30] },
  { id: "paramount", name: "Paramount+",  color: "#0064FF", icon: "P+", tmdbIds: [531, 1853] },
  { id: "hbomax",    name: "HBO Max",     color: "#9B59B6", icon: "H",  tmdbIds: [1899, 384] },
];

const MEDIATHEKEN = [
  { id: "ard",  name: "ARD Mediathek", color: "#004E8A", emoji: "🔵", url: "https://www.ardmediathek.de" },
  { id: "zdf",  name: "ZDF Mediathek", color: "#FA7D19", emoji: "🟠", url: "https://www.zdf.de/serien" },
  { id: "arte", name: "Arte",          color: "#C8102E", emoji: "🔴", url: "https://www.arte.tv/de/" },
  { id: "br",   name: "BR Mediathek",  color: "#009FE3", emoji: "🔷", url: "https://www.br.de/mediathek" },
  { id: "3sat", name: "3sat",          color: "#555",    emoji: "3️⃣", url: "https://www.3sat.de" },
  { id: "funk", name: "funk",          color: "#FF5F00", emoji: "⚡", url: "https://www.funk.net" },
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

var _mem = {};
function sGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return _mem[k]?JSON.parse(_mem[k]):null;}}
function sSet(k,v){var s=JSON.stringify(v);try{localStorage.setItem(k,s);}catch(e){_mem[k]=s;}}
function sDel(k){try{localStorage.removeItem(k);}catch(e){delete _mem[k];}}

function tmdbFetch(path,apiKey,params){
  var url=TMDB_BASE+path+"?api_key="+apiKey+"&language=de-DE&region=DE";
  if(params)Object.keys(params).forEach(k=>{url+="&"+k+"="+encodeURIComponent(params[k]);});
  return fetch(url).then(r=>r.json());
}
function discoverTitles(apiKey,type,providerIds,genreStr,page,sortBy){
  var mt=type==="serie"?"tv":"movie";
  var params={with_watch_providers:providerIds.join("|"),watch_region:"DE",with_watch_monetization_types:"flatrate",sort_by:sortBy||"popularity.desc",page:page||1,"vote_count.gte":20};
  if(genreStr)params.with_genres=genreStr;
  return tmdbFetch("/discover/"+mt,apiKey,params);
}
function getDetails(apiKey,mediaType,id){
  return tmdbFetch("/"+mediaType+"/"+id,apiKey,{append_to_response:"credits,watch/providers"});
}
function searchTitles(apiKey,query){return tmdbFetch("/search/multi",apiKey,{query});}
function getSimilar(apiKey,mediaType,id){return tmdbFetch("/"+mediaType+"/"+id+"/similar",apiKey,{});}
function getTrending(apiKey,mediaType){
  return fetch(TMDB_BASE+"/trending/"+mediaType+"/week?api_key="+apiKey+"&language=de-DE").then(r=>r.json());
}

async function callClaude(messages,systemPrompt){
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:systemPrompt,messages}),
  });
  const data=await res.json();
  if(data.content&&data.content[0])return data.content[0].text;
  throw new Error(data.error?.message||"API Fehler");
}

function buildUserContext(profile){
  const platforms=(profile.platforms||[]).map(id=>PLATFORMS.find(p=>p.id===id)?.name||id).join(", ");
  const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6).map(([gid])=>GENRES_TMDB[gid]||gid).join(", ");
  const watched=(profile.watched||[]).slice(0,8).map(w=>w.title).join(", ");
  const liked=(profile.liked_titles||[]).slice(0,5).join(", ");
  const dislikedGenres=Object.entries(profile.genres||{}).filter(([,v])=>v<0).sort(([,a],[,b])=>a-b).slice(0,3).map(([gid])=>GENRES_TMDB[gid]||gid).join(", ");
  return{platforms,topGenres,watched,liked,dislikedGenres};
}

async function getPersonalizedRecs(profile,platformId,count=3){
  const ctx=buildUserContext(profile);
  const platformName=PLATFORMS.find(p=>p.id===platformId)?.name||platformId;
  const system=`Du bist ein Streaming-Experte der ${platformName} sehr gut kennt. Antworte NUR mit einem JSON-Array, kein Text drumherum, keine Markdown-Backticks. Format: [{"title":"...","year":"...","type":"Film oder Serie","reason":"...","emoji":"..."}]`;
  const prompt=`Empfehle genau ${count} Titel die JETZT auf ${platformName} (Deutschland) verfügbar sind.\n\nNutzerprofil:\n- Lieblingsgenres: ${ctx.topGenres||"gemischt"}\n- Zuletzt geschaut: ${ctx.watched||"noch nichts"}\n- Gemochte Titel: ${ctx.liked||"noch keine"}\n${ctx.dislikedGenres?`- Mag nicht: ${ctx.dislikedGenres}`:""}\n\nWähle Titel die wirklich zum Geschmack passen. reason = 1 Satz warum genau dieser Nutzer das mögen wird. Max 15 Wörter. emoji = passendes Emoji.`;
  const text=await callClaude([{role:"user",content:prompt}],system);
  try{const clean=text.replace(/```json|```/g,"").trim();return JSON.parse(clean);}catch{return[];}
}

async function getPersonalizedFeed(profile,prompt){
  const ctx=buildUserContext(profile);
  const system=`Du bist ein persönlicher Streaming-Berater. Antworte auf Deutsch, enthusiastisch und konkret. Max 180 Wörter.`;
  const userMsg=`Mein Profil: Genres die ich mag: ${ctx.topGenres||"gemischt"}. Zuletzt gesehen: ${ctx.watched||"noch nichts"}. Gemerkte Titel: ${ctx.liked||"keine"}. Plattformen: ${ctx.platforms||"diverse"}.\n\nMeine Frage: ${prompt}`;
  return callClaude([{role:"user",content:userMsg}],system);
}

function TitleCard({item,profile,apiKey,onLike,onDislike,onWatched,onSimilar}){
  const [expanded,setExpanded]=useState(false);
  const [details,setDetails]=useState(null);
  const [loadingDet,setLoadingDet]=useState(false);
  const title=item.title||item.name||"Unbekannt";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":score>=5?"#fb923c":"#ef4444";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const genreIds=item.genre_ids||(item.genres?item.genres.map(g=>g.id):[]);
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;

  function handleExpand(){
    if(expanded){setExpanded(false);return;}
    setExpanded(true);
    if(!details&&apiKey){
      setLoadingDet(true);
      getDetails(apiKey,mediaType,item.id).then(d=>{setDetails(d);setLoadingDet(false);}).catch(()=>setLoadingDet(false));
    }
  }

  return(
    <div style={{background:"linear-gradient(145deg,#1a1525,#151020)",borderRadius:20,overflow:"hidden",border:expanded?"1px solid #ff6b3533":"1px solid #2a2340",transition:"all 0.3s",marginBottom:8}}>
      <div onClick={handleExpand} style={{padding:16,display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer"}}>
        {poster?<img src={poster} alt="" style={{width:56,height:84,borderRadius:12,objectFit:"cover",flexShrink:0,boxShadow:"0 4px 12px #00000066"}}/>:<div style={{width:56,height:84,borderRadius:12,flexShrink:0,background:"#1a1525",display:"flex",alignItems:"center",justifyContent:"center",color:"#444",fontSize:24}}>🎬</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
            <h3 style={{margin:0,fontSize:17,fontWeight:800,letterSpacing:"-0.3px",color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h3>
            {isLiked&&<span style={{fontSize:12}}>❤️</span>}
            {isWatched&&<span style={{fontSize:12}}>✅</span>}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:5}}>
            <span style={{fontSize:12,color:"#c4b8a8",background:"#1e1830",padding:"3px 10px",borderRadius:8,fontWeight:700}}>{mediaType==="tv"?"📺 Serie":"🎬 Film"}</span>
            {year&&<span style={{fontSize:12,color:"#8a7e6e",fontWeight:600}}>{year}</span>}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5}}>
            {genreIds.slice(0,3).map(gid=>GENRES_TMDB[gid]?<span key={gid} style={{fontSize:11,color:"#9a8e7e"}}>{GENRE_EMOJI[gid]||""} {GENRES_TMDB[gid]}</span>:null)}
          </div>
          {item.overview&&<p style={{margin:"0 0 6px",fontSize:13,color:"#8a7e6e",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
          <div style={{background:scoreColor+"18",padding:"3px 10px",borderRadius:8,display:"inline-flex",alignItems:"center",gap:4}}>
            <span style={{color:"#f5c518",fontSize:12,fontWeight:900}}>TMDB</span>
            <span style={{color:scoreColor,fontSize:15,fontWeight:900}}>{score}</span>
          </div>
        </div>
        <div style={{color:"#3a3545",fontSize:16,flexShrink:0,transition:"transform 0.3s",transform:expanded?"rotate(180deg)":"rotate(0)",marginTop:8}}>▾</div>
      </div>
      {expanded&&(
        <div style={{padding:"0 16px 18px",animation:"fadeUp 0.3s ease"}}>
          {item.overview&&<p style={{fontSize:14,color:"#999",lineHeight:1.7,marginBottom:14}}>{item.overview}</p>}
          {loadingDet&&<p style={{fontSize:12,color:"#555"}}>Lade Details...</p>}
          {details?.credits?.cast?.length>0&&<div style={{marginBottom:12}}><span style={{fontSize:11,color:"#555",fontWeight:700}}>🎭 Cast: </span><span style={{fontSize:12,color:"#888"}}>{details.credits.cast.slice(0,5).map(c=>c.name).join(", ")}</span></div>}
          {(()=>{
            if(!details?.["watch/providers"]?.results?.DE?.flatrate?.length)return null;
            return(<div style={{marginBottom:14,background:"#0d0d18",borderRadius:12,padding:"10px 14px",border:"1px solid #1a1a2e"}}>
              <div style={{fontSize:11,color:"#555",fontWeight:700,marginBottom:8}}>📺 Verfügbar bei</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {details["watch/providers"].results.DE.flatrate.map(prov=>{
                  const known=PLATFORMS.find(p=>p.tmdbIds.includes(prov.provider_id));
                  return(<div key={prov.provider_id} style={{display:"flex",alignItems:"center",gap:6,background:known?known.color+"22":"#1a1a2e",border:"1px solid "+(known?known.color+"44":"#2a2a3e"),borderRadius:10,padding:"5px 10px"}}>
                    {prov.logo_path&&<img src={"https://image.tmdb.org/t/p/w45"+prov.logo_path} alt="" style={{width:20,height:20,borderRadius:4}}/>}
                    <span style={{fontSize:11,fontWeight:700,color:known?known.color:"#888"}}>{prov.provider_name}</span>
                  </div>);
                })}
              </div>
            </div>);
          })()}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={e=>{e.stopPropagation();onLike(item);}} style={{flex:1,padding:"10px",borderRadius:12,background:isLiked?"#E5091422":"#0d0d18",border:isLiked?"1px solid #E5091455":"1px solid #1a1a2e",color:isLiked?"#E50914":"#666",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:12}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
            <button onClick={e=>{e.stopPropagation();onDislike(item.id);}} style={{padding:"10px 14px",borderRadius:12,background:"#0d0d18",border:"1px solid #1a1a2e",color:"#444",cursor:"pointer",fontSize:14}}>👎</button>
            <button onClick={e=>{e.stopPropagation();onWatched(item);}} style={{padding:"10px 14px",borderRadius:12,background:isWatched?"#3b82f622":"#0d0d18",border:isWatched?"1px solid #3b82f655":"1px solid #1a1a2e",color:isWatched?"#3b82f6":"#666",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:11}}>{isWatched?"✅ Gesehen":"👁 Gesehen"}</button>
            {onSimilar&&<button onClick={e=>{e.stopPropagation();onSimilar(item);}} style={{padding:"10px 14px",borderRadius:12,background:"#B01EFF11",border:"1px solid #e8439333",color:"#B01EFF",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:700}}>🔮 Ähnlich</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformCard({platform,profile,onPlatformClick}){
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const loaded=useRef(false);

  async function loadRecs(){
    if(loaded.current)return;
    loaded.current=true;
    setLoading(true);
    try{const data=await getPersonalizedRecs(profile,platform.id,3);setRecs(data);}
    catch{setRecs([]);}
    finally{setLoading(false);}
  }

  function handleExpand(){const next=!expanded;setExpanded(next);if(next)loadRecs();}

  return(
    <div style={{background:"linear-gradient(145deg,#1a1525,#151020)",borderRadius:20,overflow:"hidden",border:"1px solid #2a2340",marginBottom:12,transition:"all 0.3s"}}>
      <div style={{padding:"16px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:14,background:platform.color+"22",border:"1px solid "+platform.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:platform.color,flexShrink:0}}>{platform.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:17,fontWeight:800,color:"#f0ece4"}}>{platform.name}</div>
          <div style={{fontSize:11,color:"#555",marginTop:2}}>{recs?`${recs.length} KI-Empfehlungen für dich`:"Tippe für KI-Picks →"}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onPlatformClick(platform)} style={{background:platform.color+"22",border:"1px solid "+platform.color+"44",borderRadius:10,padding:"8px 12px",color:platform.color,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>Alle Titel</button>
          <button onClick={handleExpand} style={{background:expanded?"#ff6b3522":"#1e1830",border:expanded?"1px solid #ff6b3544":"1px solid #2a2340",borderRadius:10,padding:"8px 12px",color:expanded?"#ff6b35":"#555",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,whiteSpace:"nowrap"}}>{expanded?"▲ Zu":"🤖 KI-Top 3"}</button>
        </div>
      </div>
      {expanded&&(
        <div style={{padding:"0 16px 16px",animation:"fadeUp 0.3s ease"}}>
          <div style={{height:1,background:"#2a2340",marginBottom:14}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
            <span style={{fontSize:14}}>🤖</span>
            <span style={{fontSize:11,color:"#ff6b35",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Claude empfiehlt — basierend auf deinem Geschmack</span>
          </div>
          {loading&&<div style={{textAlign:"center",padding:20}}><div style={{fontSize:24,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🤖</div><p style={{fontSize:12,color:"#8a7e6e",marginTop:8}}>Analysiere deinen Geschmack…</p></div>}
          {!loading&&recs&&recs.length===0&&<p style={{fontSize:12,color:"#555",textAlign:"center",padding:10}}>Keine Empfehlungen verfügbar.</p>}
          {!loading&&recs&&recs.map((rec,i)=>(
            <div key={i} style={{background:"#0d0d18",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid #1a1a2e",display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:32,height:32,borderRadius:10,background:platform.color+"22",border:"1px solid "+platform.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{rec.emoji||"🎬"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>{rec.title}</span>
                  {rec.year&&<span style={{fontSize:10,color:"#555",background:"#1a1525",padding:"2px 7px",borderRadius:6}}>{rec.year}</span>}
                  <span style={{fontSize:10,color:"#777",background:"#1a1525",padding:"2px 7px",borderRadius:6}}>{rec.type}</span>
                </div>
                <p style={{fontSize:12,color:"#8a7e6e",margin:0,lineHeight:1.5,fontStyle:"italic"}}>"{rec.reason}"</p>
              </div>
              <div style={{fontSize:13,color:"#333",fontWeight:800}}>#{i+1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MediathekenGroup(){
  const [open,setOpen]=useState(false);
  return(
    <div style={{background:"linear-gradient(145deg,#1a1525,#151020)",borderRadius:20,overflow:"hidden",border:"1px solid #2a2340",marginBottom:12}}>
      <div onClick={()=>setOpen(!open)} style={{padding:16,display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
        <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#004E8A22,#FA7D1922)",border:"1px solid #004E8A44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📡</div>
        <div style={{flex:1}}>
          <div style={{fontSize:17,fontWeight:800,color:"#f0ece4"}}>Öffentlich-Rechtliche</div>
          <div style={{fontSize:11,color:"#555",marginTop:2}}>ARD · ZDF · Arte · BR · 3sat · funk</div>
        </div>
        <div style={{color:"#3a3545",fontSize:16,transition:"transform 0.3s",transform:open?"rotate(180deg)":"rotate(0)"}}>▾</div>
      </div>
      {open&&(
        <div style={{padding:"0 12px 12px",animation:"fadeUp 0.3s ease"}}>
          <div style={{height:1,background:"#2a2340",marginBottom:10}}/>
          {MEDIATHEKEN.map(m=>(
            <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:12,padding:"11px 10px",borderRadius:12,textDecoration:"none",color:"#c4b8a8"}}>
              <div style={{width:34,height:34,borderRadius:9,background:m.color+"22",border:"1px solid "+m.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.emoji}</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#f0ece4"}}>{m.name}</div><div style={{fontSize:11,color:"#555",marginTop:1}}>{m.url.replace("https://","")}</div></div>
              <div style={{color:"#3a3545",fontSize:14}}>›</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function OnboardingQuiz({onComplete}){
  const [step,setStep]=useState(0);
  const [plats,setPlats]=useState([]);
  const [ratings,setRatings]=useState({});
  const refTitles=[
    {title:"Breaking Bad",emoji:"🧪",genres:[18,80]},{title:"Titanic",emoji:"🚢",genres:[10749,18]},
    {title:"Game of Thrones",emoji:"⚔️",genres:[14,18]},{title:"Conjuring",emoji:"👻",genres:[27,53]},
    {title:"The Office",emoji:"😂",genres:[35]},{title:"Inception",emoji:"🌀",genres:[878,28]},
    {title:"Squid Game",emoji:"🎮",genres:[53,18]},{title:"Bridgerton",emoji:"💕",genres:[10749,18]},
    {title:"Planet Erde",emoji:"🌍",genres:[99]},{title:"The Boys",emoji:"💥",genres:[28,35]},
    {title:"Schindlers Liste",emoji:"📜",genres:[36,18]},{title:"Shrek",emoji:"🧅",genres:[16,35]},
    {title:"John Wick",emoji:"🔫",genres:[28,53]},{title:"Yellowstone",emoji:"🤠",genres:[37,18]},
  ];
  function finish(){
    const genreScores={};const loved=[];
    Object.keys(ratings).forEach(title=>{
      const ref=refTitles.find(r=>r.title===title);if(!ref)return;
      if(ratings[title]==="love"){loved.push(title);ref.genres.forEach(g=>{genreScores[g]=(genreScores[g]||0)+3;});}
      else if(ratings[title]==="ok"){ref.genres.forEach(g=>{genreScores[g]=(genreScores[g]||0)+1;});}
      else if(ratings[title]==="nope"){ref.genres.forEach(g=>{genreScores[g]=(genreScores[g]||0)-2;});}
    });
    onComplete({platforms:plats,genres:genreScores,liked:[],disliked:[],watched:[],liked_titles:loved,thumbsUp:[]});
  }
  const canNext=step===0?plats.length>0:Object.keys(ratings).length>=5;
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#121018,#0d0b14)",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:600}}>
        <div style={{display:"flex",gap:6,marginBottom:32}}>
          {[0,1].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"linear-gradient(90deg,#ff6b35,#e84393)":"#1e1830"}}/>)}
        </div>
        {step===0&&(
          <div>
            <div style={{fontSize:40,marginBottom:8}}>🍿</div>
            <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:32,margin:"0 0 8px",background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Willkommen!</h1>
            <p style={{color:"#8a7e6e",marginBottom:24}}>Welche Streaming-Dienste hast du?</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {PLATFORMS.map(p=>{const sel=plats.includes(p.id);return(
                <button key={p.id} onClick={()=>setPlats(sel?plats.filter(x=>x!==p.id):[...plats,p.id])} style={{background:sel?p.color+"22":"#1a1525",border:"2px solid "+(sel?p.color:"#2a2340"),borderRadius:14,padding:"12px 18px",cursor:"pointer",color:sel?p.color:"#6a5e4e",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{p.icon}</span>{p.name}
                </button>
              );})}
            </div>
          </div>
        )}
        {step===1&&(
          <div>
            <div style={{fontSize:36,marginBottom:8}}>🎬</div>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,marginBottom:6}}>Was ist dein Ding?</h2>
            <p style={{color:"#6a5e4e",fontSize:13,marginBottom:18}}>❤️ = Liebe es &nbsp; 👎 = Nicht meins &nbsp; ❓ = Kenn ich nicht — mind. 5 bewerten</p>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {refTitles.map(rt=>{const r=ratings[rt.title];return(
                <div key={rt.title} style={{background:r==="love"?"#ff6b3512":r==="nope"?"#ef444412":"#1a1525",borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid "+(r==="love"?"#ff6b3533":r==="nope"?"#ef444433":"#2a2340")}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{rt.emoji}</span><span style={{fontSize:14,fontWeight:700}}>{rt.title}</span></div>
                  <div style={{display:"flex",gap:5}}>
                    {[{v:"love",l:"❤️"},{v:"nope",l:"👎"},{v:"unknown",l:"❓"}].map(o=>(
                      <button key={o.v} onClick={()=>setRatings({...ratings,[rt.title]:o.v})} style={{width:38,height:38,borderRadius:10,background:r===o.v?"#2a2340":"transparent",border:r===o.v?"2px solid #ff6b3566":"2px solid transparent",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transform:r===o.v?"scale(1.2)":"scale(1)",transition:"all 0.15s"}}>{o.l}</button>
                    ))}
                  </div>
                </div>
              );})}
            </div>
            <p style={{color:"#555",fontSize:12,marginTop:10,textAlign:"center"}}>{Object.keys(ratings).length}/5 bewertet {Object.keys(ratings).length>=5?"✅":""}</p>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
          {step>0?<button onClick={()=>setStep(step-1)} style={{background:"transparent",border:"1px solid #2a2340",borderRadius:12,padding:"12px 24px",color:"#8a7e6e",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600}}>Zurück</button>:<div/>}
          <button onClick={()=>{if(step<1)setStep(step+1);else finish();}} disabled={!canNext} style={{background:canNext?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1525",border:"none",borderRadius:12,padding:"12px 28px",color:canNext?"#fff":"#444",cursor:canNext?"pointer":"default",fontFamily:"'DM Sans'",fontWeight:700,fontSize:15}}>
            {step<1?"Weiter →":"🤖 Starten"}
          </button>
        </div>
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}

function AITab({profile}){
  const [prompt,setPrompt]=useState("");
  const [response,setResponse]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const QUICK=[
    {label:"Was soll ich heute Abend schauen?",emoji:"🛋️"},
    {label:"Etwas Spannendes — Thriller oder Krimi",emoji:"🔍"},
    {label:"Etwas zum Lachen, gute Laune",emoji:"😂"},
    {label:"Nachdenkliches Drama, das bewegt",emoji:"🎭"},
    {label:"Sci-Fi oder Fantasy Abenteuer",emoji:"🚀"},
    {label:"Ähnlich wie das was ich zuletzt geschaut hab",emoji:"🎯"},
  ];
  async function handleAsk(p){
    const q=p||prompt;if(!q.trim())return;
    setLoading(true);setError("");setResponse("");
    try{const text=await getPersonalizedFeed(profile,q);setResponse(text);}
    catch(e){setError("KI-Fehler: "+e.message);}
    finally{setLoading(false);}
  }
  const ctx=buildUserContext(profile);
  return(
    <div style={{padding:"0 18px"}}>
      <div style={{background:"linear-gradient(135deg,#ff6b3512,#e8439312)",border:"1px solid #ff6b3525",borderRadius:20,padding:20,marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:38,marginBottom:8}}>🤖</div>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 6px",background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Deine persönliche Streaming-KI</h2>
        <p style={{fontSize:12,color:"#8a7e6e",margin:0}}>Kennt deinen Geschmack · Lernt aus was du schaust und merkst</p>
      </div>
      <div style={{background:"#12121f",border:"1px solid #1a1a2e",borderRadius:14,padding:14,marginBottom:18}}>
        <p style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Was ich über dich weiß</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ctx.topGenres&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#555",width:80,flexShrink:0}}>Genres</span><span style={{fontSize:12,color:"#c4b8a8"}}>{ctx.topGenres}</span></div>}
          {ctx.watched&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#555",width:80,flexShrink:0}}>Geschaut</span><span style={{fontSize:12,color:"#c4b8a8"}}>{ctx.watched}</span></div>}
          {ctx.liked&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#555",width:80,flexShrink:0}}>Gemerkt</span><span style={{fontSize:12,color:"#c4b8a8"}}>{ctx.liked}</span></div>}
          {ctx.platforms&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#555",width:80,flexShrink:0}}>Dienste</span><span style={{fontSize:12,color:"#c4b8a8"}}>{ctx.platforms}</span></div>}
          {!ctx.topGenres&&!ctx.watched&&<p style={{fontSize:12,color:"#444",margin:0}}>Noch wenig bekannt — je mehr du schaust und merkst, desto besser!</p>}
        </div>
      </div>
      <p style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Schnellfragen</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {QUICK.map(m=>(
          <button key={m.label} onClick={()=>handleAsk(m.label)} disabled={loading} style={{background:"#1a1525",border:"1px solid #2a2340",borderRadius:14,padding:12,cursor:loading?"default":"pointer",textAlign:"left",color:"#c4b8a8",opacity:loading?0.6:1}}>
            <div style={{fontSize:20,marginBottom:4}}>{m.emoji}</div>
            <div style={{fontSize:12,fontFamily:"'DM Sans'",fontWeight:600,lineHeight:1.3}}>{m.label}</div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAsk()} placeholder="Eigene Frage stellen…" disabled={loading} style={{flex:1,background:"#12121f",border:"1px solid #2a2a3e",borderRadius:14,padding:"12px 16px",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none"}}/>
        <button onClick={()=>handleAsk()} disabled={loading||!prompt.trim()} style={{background:prompt.trim()&&!loading?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1525",border:"none",borderRadius:14,padding:"12px 18px",color:prompt.trim()&&!loading?"#fff":"#444",cursor:prompt.trim()&&!loading?"pointer":"default",fontFamily:"'DM Sans'",fontWeight:700,fontSize:14}}>→</button>
      </div>
      {loading&&<div style={{background:"#12121f",border:"1px solid #2a2340",borderRadius:16,padding:24,textAlign:"center"}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🤖</div><p style={{fontSize:13,color:"#8a7e6e",marginTop:8}}>Claude analysiert deinen Geschmack…</p></div>}
      {error&&<div style={{background:"#E5091412",border:"1px solid #E5091433",borderRadius:14,padding:14}}><p style={{fontSize:12,color:"#E50914",margin:0}}>{error}</p></div>}
      {response&&!loading&&(
        <div style={{background:"linear-gradient(145deg,#1a1525,#151020)",border:"1px solid #ff6b3525",borderRadius:16,padding:20,animation:"fadeUp 0.4s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:14}}>✦</span>
            <span style={{fontSize:11,color:"#ff6b35",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Claude empfiehlt</span>
          </div>
          <p style={{fontSize:15,color:"#c4b8a8",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap"}}>{response}</p>
        </div>
      )}
    </div>
  );
}

function MainApp({apiKey,profile:initProfile,onReset}){
  const [profile,setProfile]=useState(initProfile);
  const [tab,setTab]=useState("platforms");
  const [filterPlatform,setFP]=useState(null);
  const [showSettings,setSS]=useState(false);
  const [searchQuery,setSearchQuery]=useState("");
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(false);
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const [similarItems,setSimilarItems]=useState([]);
  const [similarTitle,setSimilarTitle]=useState("");
  const [simLoading,setSimLoading]=useState(false);
  const [prevTab,setPrevTab]=useState("platforms");
  const searchTimeout=useRef(null);

  if(!profile.watched)profile.watched=[];
  if(!profile.liked_titles)profile.liked_titles=[];

  function updateProfile(fn){
    setProfile(prev=>{const next=fn(prev);sSet("sf_profile",next);return next;});
  }

  function handleLike(item){
    updateProfile(p=>{
      const id=item.id;const title=item.title||item.name||"";
      const isLiked=(p.liked||[]).includes(id);
      const liked=isLiked?p.liked.filter(x=>x!==id):[...p.liked,id];
      const liked_titles=isLiked?(p.liked_titles||[]).filter(t=>t!==title):[...(p.liked_titles||[]),title];
      const genres={...p.genres};
      if(!isLiked)(item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+2;});
      return{...p,liked,liked_titles,genres,disliked:p.disliked.filter(x=>x!==id)};
    });
  }

  function handleDislike(id){
    updateProfile(p=>{
      const item=items.concat(searchResults).concat(similarItems).find(i=>i.id===id);
      const genres={...p.genres};
      if(item&&!p.disliked.includes(id))(item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)-2;});
      return{...p,disliked:[...p.disliked,id],liked:p.liked.filter(x=>x!==id),genres};
    });
  }

  function handleWatched(item){
    updateProfile(p=>{
      const watched=p.watched||[];
      const exists=watched.some(w=>w.id===item.id);
      if(exists)return{...p,watched:watched.filter(w=>w.id!==item.id)};
      const entry={id:item.id,title:item.title||item.name||"?",poster_path:item.poster_path,genre_ids:item.genre_ids||[],vote_average:item.vote_average,media_type:item.media_type||"movie",addedAt:Date.now()};
      const genres={...p.genres};
      (item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+1;});
      return{...p,watched:[entry,...watched].slice(0,20),genres};
    });
  }

  function handleSimilar(item){
    const mt=item.media_type||"movie";
    setSimilarTitle(item.title||item.name||"?");
    setSimLoading(true);setSimilarItems([]);setPrevTab(tab);setTab("similar");
    getSimilar(apiKey,mt,item.id).then(data=>{
      const results=(data?.results||[]).map(r=>({...r,media_type:mt})).filter(r=>!profile.disliked.includes(r.id));
      setSimilarItems(results.slice(0,15));setSimLoading(false);
    }).catch(()=>setSimLoading(false));
  }

  function loadForPlatform(platformId){
    if(!platformId)return;
    const pl=PLATFORMS.find(p=>p.id===platformId);if(!pl)return;
    setLoading(true);
    const profileGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([gid])=>gid);
    const genreStr=profileGenres.length>0?profileGenres.join("|"):null;
    Promise.all([
      discoverTitles(apiKey,"serie",pl.tmdbIds,genreStr,1,"popularity.desc"),
      discoverTitles(apiKey,"film",pl.tmdbIds,genreStr,1,"popularity.desc"),
      getTrending(apiKey,"tv"),getTrending(apiKey,"movie"),
    ]).then(([ser,fil,tser,tfil])=>{
      const all=[...(ser.results||[]).map(r=>({...r,media_type:"tv"})),...(fil.results||[]).map(r=>({...r,media_type:"movie"})),...(tser.results||[]).map(r=>({...r,media_type:"tv"})),...(tfil.results||[]).map(r=>({...r,media_type:"movie"}))];
      const seen=new Set();const deduped=[];
      const watchedIds=new Set((profile.watched||[]).map(w=>w.id));
      all.forEach(item=>{if(!seen.has(item.id)&&!profile.disliked.includes(item.id)&&!watchedIds.has(item.id)){seen.add(item.id);deduped.push(item);}});
      deduped.forEach(item=>{let s=item.vote_average||0;(item.genre_ids||[]).forEach(g=>{s+=(profile.genres[g]||0)*0.3;});item._score=s;});
      deduped.sort((a,b)=>b._score-a._score);
      setItems(deduped.slice(0,25));setLoading(false);
    }).catch(()=>setLoading(false));
  }

  function handleSearch(q){
    setSearchQuery(q);
    if(searchTimeout.current)clearTimeout(searchTimeout.current);
    if(!q.trim()){setSearchResults([]);return;}
    searchTimeout.current=setTimeout(()=>{
      setSearching(true);
      searchTitles(apiKey,q).then(data=>{
        const results=(data?.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv");
        setSearchResults(results.slice(0,15));setSearching(false);
      }).catch(()=>setSearching(false));
    },400);
  }

  const userPlatforms=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
  const tabs=[
    {id:"platforms",label:"Dienste",icon:"📺"},
    {id:"browse",label:"Entdecken",icon:"🔍"},
    {id:"ai",label:"KI-Tipps",icon:"🤖"},
    {id:"liked",label:"Merkliste",icon:"❤️"},
    {id:"history",label:"Verlauf",icon:"📋"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#121018,#0d0b14,#0a0812)",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",paddingBottom:100}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif&display=swap" rel="stylesheet"/>
      <div style={{padding:"20px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:0,background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🍿 StreamFinder</h1>
        <button onClick={()=>setSS(!showSettings)} style={{background:"#1a1525",border:"1px solid #2a2340",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#888",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
      </div>
      {showSettings&&(
        <div style={{margin:"10px 18px",padding:14,background:"#12121f",borderRadius:14,border:"1px solid #1a1a2e"}}>
          <p style={{fontSize:12,color:"#777",margin:"0 0 10px"}}>Profil komplett zurücksetzen?</p>
          <button onClick={onReset} style={{background:"#E5091418",border:"1px solid #E5091444",borderRadius:10,padding:"9px 18px",color:"#E50914",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:12}}>🔄 Zurücksetzen</button>
        </div>
      )}

      <div style={{paddingTop:16}}>

        {tab==="platforms"&&(
          <div style={{padding:"0 18px"}}>
            <p style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:14}}>Deine Streaming-Dienste · KI-Top 3 per Klick</p>
            {userPlatforms.map(p=><PlatformCard key={p.id} platform={p} profile={profile} onPlatformClick={pl=>{setFP(pl.id);loadForPlatform(pl.id);setTab("browse");}}/>)}
            <MediathekenGroup/>
          </div>
        )}

        {tab==="browse"&&(
          <div style={{padding:"0 18px"}}>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12,marginBottom:4}}>
              <button onClick={()=>{setFP(null);setItems([]);}} style={{background:!filterPlatform?"#1e1e3a":"transparent",border:!filterPlatform?"1px solid #e8439333":"1px solid transparent",borderRadius:10,padding:"8px 14px",cursor:"pointer",color:!filterPlatform?"#ccc":"#555",fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Alle</button>
              {userPlatforms.map(p=>(
                <button key={p.id} onClick={()=>{setFP(p.id);loadForPlatform(p.id);}} style={{background:filterPlatform===p.id?p.color+"22":"transparent",border:filterPlatform===p.id?"1px solid "+p.color+"55":"1px solid transparent",borderRadius:10,padding:"8px 14px",cursor:"pointer",color:filterPlatform===p.id?p.color:"#555",fontFamily:"'DM Sans'",fontSize:12,fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>{p.icon} {p.name}</button>
              ))}
            </div>
            <input value={searchQuery} onChange={e=>handleSearch(e.target.value)} placeholder="Titel suchen…" style={{width:"100%",padding:"12px 16px",borderRadius:14,background:"#12121f",border:"1px solid #2a2a3e",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none",marginBottom:14}}/>
            {searchQuery?(
              <div>
                {searching&&<p style={{color:"#555",fontSize:13,textAlign:"center"}}>Suche…</p>}
                {searchResults.map(item=><TitleCard key={item.id} item={item} profile={profile} apiKey={apiKey} onLike={handleLike} onDislike={handleDislike} onWatched={handleWatched} onSimilar={handleSimilar}/>)}
              </div>
            ):(
              <div>
                {!filterPlatform&&items.length===0&&!loading&&<div style={{textAlign:"center",padding:40,color:"#444"}}><div style={{fontSize:40,marginBottom:10}}>📺</div><p style={{fontSize:14}}>Wähle oben einen Dienst oder suche nach Titeln.</p></div>}
                {loading&&<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,animation:"spin 2s linear infinite",display:"inline-block"}}>🍿</div><p style={{fontSize:14,color:"#c4b8a8",marginTop:10}}>Lade Titel…</p></div>}
                {!loading&&items.map(item=><TitleCard key={item.id} item={item} profile={profile} apiKey={apiKey} onLike={handleLike} onDislike={handleDislike} onWatched={handleWatched} onSimilar={handleSimilar}/>)}
              </div>
            )}
          </div>
        )}

        {tab==="ai"&&<AITab profile={profile}/>}

        {tab==="liked"&&(
          <div style={{padding:"0 18px"}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:14}}>❤️ Merkliste</h3>
            {profile.liked.length===0
              ?<div style={{textAlign:"center",padding:40,color:"#444"}}><div style={{fontSize:40,marginBottom:10}}>🤍</div><p>Noch nichts gemerkt.</p></div>
              :items.concat(searchResults).concat(similarItems).filter((item,idx,arr)=>profile.liked.includes(item.id)&&arr.findIndex(x=>x.id===item.id)===idx).map(item=><TitleCard key={item.id} item={item} profile={profile} apiKey={apiKey} onLike={handleLike} onDislike={handleDislike} onWatched={handleWatched} onSimilar={handleSimilar}/>)
            }
            {profile.liked.length>0&&<p style={{fontSize:12,color:"#444",textAlign:"center",marginTop:8}}>{profile.liked.length} gemerkt · Öffne Titel in "Entdecken" um sie hier zu sehen</p>}
          </div>
        )}

        {tab==="history"&&(
          <div style={{padding:"0 18px"}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:6}}>📋 Verlauf</h3>
            <p style={{fontSize:12,color:"#555",marginBottom:16}}>Die KI lernt aus deinem Verlauf — je mehr du markierst, desto besser die Empfehlungen.</p>
            {(profile.watched||[]).length===0
              ?<div style={{textAlign:"center",padding:40,color:"#444"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p>Noch keine Titel als gesehen markiert.</p><p style={{fontSize:12}}>Öffne einen Titel und tippe auf "👁 Gesehen".</p></div>
              :(profile.watched||[]).map(w=>(
                <div key={w.id} style={{background:"#12121f",borderRadius:14,padding:"12px 14px",border:"1px solid #1a1a2e",display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  {w.poster_path?<img src={TMDB_IMG+w.poster_path} alt="" style={{width:36,height:54,borderRadius:8,objectFit:"cover",flexShrink:0}}/>:<div style={{width:36,height:54,borderRadius:8,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎬</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.title}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{w.media_type==="tv"?"Serie":"Film"} · TMDB {w.vote_average?.toFixed(1)}</div>
                  </div>
                  <button onClick={()=>handleWatched(w)} style={{padding:"7px 10px",borderRadius:10,background:"#0d0d18",border:"1px solid #1a1a2e",color:"#555",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ))
            }
            {(()=>{
              const sorted=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6);
              if(!sorted.length)return null;
              const max=sorted[0][1];
              const colors=["linear-gradient(90deg,#E50914,#B01EFF)","#B01EFF","#E50914","#fbbf24","#4ade80","#00A8E1"];
              return(
                <div style={{marginTop:20,background:"#12121f",borderRadius:14,padding:16,border:"1px solid #1a1a2e"}}>
                  <p style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>🧠 Dein Geschmacksprofil</p>
                  {sorted.map(([gid,val],i)=>(
                    <div key={gid} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:16,width:24}}>{GENRE_EMOJI[gid]||"🎬"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{GENRES_TMDB[gid]||gid}</div>
                        <div style={{height:5,borderRadius:3,background:"#1a1a2e",overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:3,width:(val/max*100)+"%",background:colors[i]||"#B01EFF",transition:"width 0.5s"}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {tab==="similar"&&(
          <div style={{padding:"0 18px"}}>
            <button onClick={()=>setTab(prevTab)} style={{background:"transparent",border:"none",color:"#B01EFF",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,padding:0,marginBottom:10}}>← Zurück</button>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:14}}>🔮 Ähnlich wie "{similarTitle}"</h3>
            {simLoading?<div style={{textAlign:"center",padding:40}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>⏳</div></div>
              :similarItems.map(item=><TitleCard key={item.id} item={item} profile={profile} apiKey={apiKey} onLike={handleLike} onDislike={handleDislike} onWatched={handleWatched} onSimilar={handleSimilar}/>)
            }
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(180deg,transparent,#0d0b14 30%)",backdropFilter:"blur(20px)",borderTop:"1px solid #2a2340",display:"flex",padding:"10px 8px 16px",zIndex:100}}>
        {tabs.map(t=>{
          const isActive=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:isActive?"linear-gradient(135deg,#ff6b3518,#e8439318)":"transparent",border:isActive?"1px solid #ff6b3533":"1px solid transparent",borderRadius:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",color:isActive?"#ff6b35":"#6a5e4e",transition:"all 0.2s"}}>
              <span style={{fontSize:20}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:800,fontFamily:"'DM Sans'"}}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}

export default function StreamFinder(){
  const [apiKey,setApiKey]=useState(()=>sGet("sf_apikey"));
  const [profile,setProfile]=useState(()=>sGet("sf_profile"));
  function handleApiKey(key){sSet("sf_apikey",key);setApiKey(key);}
  function handleProfileComplete(p){sSet("sf_profile",p);setProfile(p);}
  function handleReset(){sDel("sf_apikey");sDel("sf_profile");setApiKey(null);setProfile(null);}
  useEffect(()=>{if(!apiKey&&DEFAULT_API_KEY){sSet("sf_apikey",DEFAULT_API_KEY);setApiKey(DEFAULT_API_KEY);}},[]);
  if(!apiKey)return null;
  if(!profile)return<OnboardingQuiz onComplete={handleProfileComplete}/>;
  return<MainApp apiKey={apiKey} profile={profile} onReset={handleReset}/>;
}
