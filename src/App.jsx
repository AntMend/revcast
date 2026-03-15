import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  RadialBarChart, RadialBar, LineChart, Line,
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   REVCAST — Revenue Forecasting Engine  v3
   Monte Carlo · Scenario Planning · Capacity · Dual Reports
   ═══════════════════════════════════════════════════════════ */

// ── TOKENS ──
const T = {
  bg:"#07090f",surface:"#0c1018",card:"#111722",cardAlt:"#161d2a",
  border:"#1c2538",borderLight:"#2a3550",
  text:"#b0b8cc",muted:"#5a6478",bright:"#edf0f7",white:"#fff",
  accent:"#6366f1",accentDim:"rgba(99,102,241,.12)",accentMid:"rgba(99,102,241,.25)",
  green:"#22c55e",greenDim:"rgba(34,197,94,.10)",
  blue:"#3b82f6",blueDim:"rgba(59,130,246,.10)",
  amber:"#eab308",amberDim:"rgba(234,179,8,.10)",
  red:"#ef4444",redDim:"rgba(239,68,68,.10)",
  purple:"#a855f7",cyan:"#06b6d4",
  r:12,rs:8,rx:6,
  sh:"0 4px 24px rgba(0,0,0,.3)",
  tr:"all .25s cubic-bezier(.4,0,.2,1)",
};

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes si{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes sc{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.fu{animation:fu .45s ease both}.fi{animation:fi .35s ease both}
.si{animation:si .4s ease both}.sc{animation:sc .3s ease both}
*{box-sizing:border-box;margin:0;padding:0}
input:focus{outline:none;border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accentDim}!important}
input[type=number]::-webkit-inner-spin-button{opacity:0}
input[type=range]{-webkit-appearance:none;background:${T.border};height:4px;border-radius:2px;outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;border:2px solid ${T.bg}}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
button{cursor:pointer;font-family:inherit}button:active{transform:scale(.97)}
.ch:hover{border-color:${T.borderLight}!important;transform:translateY(-1px)}
.ch{transition:${T.tr}}
`;

const DS=[
  {id:1,name:"Discovery",deals:42,avgValue:18000,winRate:15,daysToClose:90},
  {id:2,name:"Qualification",deals:28,avgValue:22000,winRate:32,daysToClose:60},
  {id:3,name:"Proposal",deals:15,avgValue:25000,winRate:55,daysToClose:40},
  {id:4,name:"Negotiation",deals:8,avgValue:31000,winRate:74,daysToClose:18},
  {id:5,name:"Verbal Commit",deals:4,avgValue:28000,winRate:92,daysToClose:5},
];

// Pre-loaded scenarios for demo
const DEMO_SCENARIOS=[
  {name:"Current Pipeline",id:1,stages:DS},
  {name:"Aggressive Q4",id:2,stages:[
    {id:1,name:"Discovery",deals:60,avgValue:20000,winRate:18,daysToClose:85},
    {id:2,name:"Qualification",deals:38,avgValue:24000,winRate:35,daysToClose:55},
    {id:3,name:"Proposal",deals:20,avgValue:28000,winRate:58,daysToClose:35},
    {id:4,name:"Negotiation",deals:12,avgValue:33000,winRate:76,daysToClose:15},
    {id:5,name:"Verbal Commit",deals:6,avgValue:30000,winRate:94,daysToClose:4},
  ]},
  {name:"Conservative (Churn Risk)",id:3,stages:[
    {id:1,name:"Discovery",deals:30,avgValue:16000,winRate:12,daysToClose:100},
    {id:2,name:"Qualification",deals:18,avgValue:19000,winRate:28,daysToClose:70},
    {id:3,name:"Proposal",deals:10,avgValue:22000,winRate:48,daysToClose:50},
    {id:4,name:"Negotiation",deals:5,avgValue:27000,winRate:68,daysToClose:22},
    {id:5,name:"Verbal Commit",deals:3,avgValue:25000,winRate:88,daysToClose:7},
  ]},
];

// ── Monte Carlo v3: configurable months ──
const gr=(m=0,s=1)=>{const u=1-Math.random(),v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*s+m;};

function simulate(stages, months=6, n=2000){
  const moNames=Array.from({length:months},(_,i)=>`M${i+1}`);
  const iterCum=[], iterMo=[], iterTotals=[];

  for(let i=0;i<n;i++){
    const mR=new Array(months).fill(0);
    for(const s of stages){
      const shift=gr(0,.18);
      const rate=Math.max(.01,Math.min(.99,(s.winRate/100)*(1+shift)));
      for(let d=0;d<s.deals;d++){
        if(Math.random()<rate){
          const val=s.avgValue*Math.max(.4,1+gr(0,.15));
          const timeNoise=Math.exp(gr(0,.35));
          const days=Math.max(1,s.daysToClose*timeNoise);
          const mo=Math.min(months-1,Math.floor(days/30));
          mR[mo]+=val;
        }
      }
    }
    iterMo.push([...mR]);
    const cum=[];let run=0;
    for(let m=0;m<months;m++){run+=mR[m];cum.push(run);}
    iterCum.push(cum);
    iterTotals.push(run);
  }

  iterTotals.sort((a,b)=>a-b);
  const pct=(arr,p)=>arr[Math.floor(arr.length*p)]||0;

  const cumulative=moNames.map((name,m)=>{
    const vals=iterCum.map(c=>c[m]).sort((a,b)=>a-b);
    return{name,worst:pct(vals,.10),p20:pct(vals,.20),expected:pct(vals,.50),p80:pct(vals,.80),best:pct(vals,.90)};
  });
  const monthly=moNames.map((name,m)=>{
    const vals=iterMo.map(r=>r[m]).sort((a,b)=>a-b);
    return{name,worst:pct(vals,.10),p20:pct(vals,.20),expected:pct(vals,.50),p80:pct(vals,.80),best:pct(vals,.90)};
  });

  const weighted=stages.reduce((s,st)=>s+st.deals*st.avgValue*(st.winRate/100),0);
  const totalPipe=stages.reduce((s,st)=>s+st.deals*st.avgValue,0);

  const min=iterTotals[0],max=iterTotals[iterTotals.length-1];
  const bc=20,bw=(max-min)/bc||1;
  const histogram=Array.from({length:bc},(_,i)=>{
    const lo=min+i*bw,hi=lo+bw;
    const count=iterTotals.filter(v=>v>=lo&&(i===bc-1?v<=hi:v<hi)).length;
    return{range:`${fmt(lo)}`,count,lo,hi,pct:count/n*100};
  });

  return{
    worst:pct(iterTotals,.10),p20:pct(iterTotals,.20),
    expected:pct(iterTotals,.50),p80:pct(iterTotals,.80),
    best:pct(iterTotals,.90),
    weighted,totalPipe,monthly,cumulative,histogram,
    mean:iterTotals.reduce((a,b)=>a+b,0)/n,
    stdDev:Math.sqrt(iterTotals.reduce((a,v,_,arr)=>a+Math.pow(v-arr.reduce((a,b)=>a+b,0)/arr.length,2),0)/n),
    iterations:n,months,
  };
}

function sensitivity(stages,months=6){
  const base=simulate(stages,months,800).expected;
  return stages.map(s=>{
    const up=stages.map(st=>st.id===s.id?{...st,winRate:Math.min(99,st.winRate+10)}:st);
    const dn=stages.map(st=>st.id===s.id?{...st,winRate:Math.max(1,st.winRate-10)}:st);
    return{name:s.name,upside:simulate(up,months,800).expected-base,downside:simulate(dn,months,800).expected-base};
  });
}

// ── Format ──
const fmt=v=>v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${Math.round(v)}`;
const fmtFull=v=>`$${Math.round(v).toLocaleString()}`;
const fmtPct=v=>`${v.toFixed(1)}%`;

// ── Shared UI ──
const Card=({children,style,delay=0,cl="fu",h=false})=>(
  <div className={`${cl}${h?" ch":""}`} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.r,padding:20,animationDelay:`${delay}ms`,...style}}>{children}</div>
);
const Label=({children})=><div style={{fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{children}</div>;
const Inp=({value,onChange,type="number",style:s})=>(
  <input type={type} value={value} onChange={onChange} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${T.border}`,borderRadius:T.rx,color:T.bright,padding:"7px 10px",fontSize:13,width:"100%",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",transition:T.tr,...s}}/>
);

const MCard=({label,value,sub,color,delay=0,tip})=>{
  const[st,setSt]=useState(false);
  return(
  <Card delay={delay} h style={{padding:16,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <Label>{label}</Label>
      {tip&&<div style={{position:"relative"}}><button onMouseEnter={()=>setSt(true)} onMouseLeave={()=>setSt(false)} style={{background:"none",border:"none",color:T.muted,fontSize:12,padding:0,opacity:.5}}>?</button>
      {st&&<div style={{position:"absolute",right:0,top:18,background:T.cardAlt,border:`1px solid ${T.border}`,borderRadius:T.rx,padding:"8px 12px",fontSize:11,color:T.text,width:200,zIndex:50,boxShadow:T.sh,lineHeight:1.5}}>{tip}</div>}</div>}
    </div>
    <div style={{fontSize:22,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace",margin:"4px 0 2px",letterSpacing:"-.02em"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.muted}}>{sub}</div>}
  </Card>
);};

const ChTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rs,padding:"10px 14px",fontSize:12,boxShadow:T.sh}}>
    <div style={{color:T.muted,marginBottom:6,fontWeight:600}}>{label}</div>
    {payload.filter(p=>p.value>0).map((p,i)=>(
      <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:p.color||p.stroke,display:"inline-block"}}/>
        <span style={{color:T.text}}>{p.name}: <strong style={{color:T.bright}}>{fmt(p.value)}</strong></span>
      </div>
    ))}
  </div>);
};

const Ic={
  dash:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  scen:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  cap:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  rep:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  plus:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  save:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>,
  info:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  x:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ═══ ONBOARDING ═══
const OBS=[
  {t:"Welcome to RevCast",tx:"A probabilistic revenue forecasting engine for RevOps. Runs Monte Carlo simulations on your pipeline to generate forecasts with confidence intervals — not just weighted averages.",ic:"📊"},
  {t:"Pipeline Editor",tx:"Define stages with deals count, average deal value, win rate, and days to close. The visual funnel shows how deals flow through your pipeline with conversion rates between stages.",ic:"🔧"},
  {t:"Scenario Planning",tx:"Three demo scenarios are pre-loaded to show the comparison feature. Save your own configurations and compare up to 3 side by side.",ic:"📋"},
  {t:"Capacity Planning",tx:"Model your hiring needs with quota, attainment rates, ramp time, and cost per rep. See hiring timelines and budget impact for each forecast scenario.",ic:"👥"},
  {t:"Dual Reports",tx:"Executive: clean visual for board meetings. Technical: full data dump with histograms, per-stage tables, and model parameters.",ic:"📑"},
];

function Onboarding({onClose}){
  const[step,setStep]=useState(0);const s=OBS[step];
  return(
    <div className="fi" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(6,8,13,.88)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="sc" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:"36px 40px",maxWidth:460,width:"92%",textAlign:"center",position:"relative",boxShadow:"0 24px 80px rgba(0,0,0,.5)"}}>
        <div style={{fontSize:44,marginBottom:14}}>{s.ic}</div>
        <h2 style={{color:T.bright,fontSize:21,fontWeight:700,marginBottom:10}}>{s.t}</h2>
        <p style={{color:T.text,fontSize:14,lineHeight:1.7,marginBottom:26}}>{s.tx}</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:22}}>
          {OBS.map((_,i)=><div key={i} style={{width:i===step?22:8,height:8,borderRadius:4,background:i===step?T.accent:T.border,transition:T.tr}}/>)}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {step>0&&<button onClick={()=>setStep(step-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.rs,color:T.text,padding:"10px 20px",fontSize:14,fontWeight:600}}>Back</button>}
          <button onClick={step<OBS.length-1?()=>setStep(step+1):onClose} style={{background:T.accent,border:"none",borderRadius:T.rs,color:T.white,padding:"10px 24px",fontSize:14,fontWeight:600,boxShadow:`0 4px 16px ${T.accentDim}`}}>
            {step<OBS.length-1?"Next →":"Start Forecasting"}
          </button>
        </div>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"none",border:"none",color:T.muted,padding:4}}>{Ic.x}</button>
      </div>
    </div>
  );
}

// ═══ VISUAL FUNNEL ═══
function Funnel({stages}){
  const totalDeals=stages[0]?.deals||1;
  const colors=[T.accent,T.blue,T.green,T.amber,T.purple,T.cyan,T.red];
  return(
    <div style={{padding:"12px 0"}}>
      {stages.map((s,i)=>{
        const w=Math.max(25,s.deals/totalDeals*100);
        const convRate=i>0&&stages[i-1].deals>0?(s.deals/stages[i-1].deals*100).toFixed(0)+"%":"—";
        return(
          <div key={s.id}>
            {i>0&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:20,position:"relative"}}>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",width:1,height:"100%",background:T.border}}/>
                <div style={{background:T.cardAlt,border:`1px solid ${T.border}`,borderRadius:10,padding:"1px 8px",fontSize:10,color:colors[i%7],fontWeight:600,zIndex:1,fontFamily:"'JetBrains Mono',monospace"}}>
                  {convRate}
                </div>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
              <div style={{
                width:`${w}%`,height:32,
                background:`linear-gradient(90deg, ${colors[i%7]}22, ${colors[i%7]}11)`,
                border:`1px solid ${colors[i%7]}33`,
                borderRadius:6,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",
                transition:"width .4s ease",minWidth:180,
              }}>
                <span style={{fontSize:12,fontWeight:600,color:colors[i%7]}}>{s.name}</span>
                <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.bright,fontWeight:500}}>
                  {s.deals} deals · {fmt(s.deals*s.avgValue)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ STAGE EDITOR ═══
function StageEditor({stages,setStages}){
  const up=(id,f,v)=>setStages(p=>p.map(s=>s.id===id?{...s,[f]:f==="name"?v:(Number(v)||0)}:s));
  const add=()=>{const id=Math.max(0,...stages.map(s=>s.id))+1;setStages(p=>[...p,{id,name:`Stage ${id}`,deals:10,avgValue:20000,winRate:30,daysToClose:45}]);};
  const rm=id=>stages.length>1&&setStages(p=>p.filter(s=>s.id!==id));
  const wt=stages.reduce((s,st)=>s+st.deals*st.avgValue*(st.winRate/100),0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.bright}}>Pipeline Stages</h3>
        <button onClick={add} style={{display:"flex",alignItems:"center",gap:4,background:T.accentDim,border:`1px solid ${T.accentMid}`,borderRadius:T.rx,color:T.accent,fontSize:12,padding:"5px 12px",fontWeight:600}}>{Ic.plus} Add</button>
      </div>
      {stages.map((s,idx)=>{
        const w=s.deals*s.avgValue*s.winRate/100;
        return(
          <div key={s.id} className="si" style={{animationDelay:`${idx*50}ms`,background:T.cardAlt,borderRadius:T.rs,padding:14,border:`1px solid ${T.border}`,transition:T.tr}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <input value={s.name} onChange={e=>up(s.id,"name",e.target.value)} style={{background:"transparent",border:"none",color:T.bright,fontSize:14,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",flex:1,outline:"none"}}/>
              {stages.length>1&&<button onClick={()=>rm(s.id)} style={{background:"none",border:"none",color:T.muted,padding:2,opacity:.4}}>{Ic.trash}</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"Deals",f:"deals",v:s.deals},{l:"Win Rate %",f:"winRate",v:s.winRate},{l:"Avg Deal $",f:"avgValue",v:s.avgValue},{l:"Days to Close",f:"daysToClose",v:s.daysToClose}].map(f=>(
                <div key={f.f}><Label>{f.l}</Label><Inp value={f.v} onChange={e=>up(s.id,f.f,e.target.value)}/></div>
              ))}
            </div>
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginBottom:3}}>
                <span>Weighted</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{fmt(w)}</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${T.accent},${T.purple})`,width:`${Math.min(100,w/Math.max(1,wt)*100)}%`,transition:"width .4s ease"}}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ FORECAST CHART ═══
function ForecastChart({data,height=240}){
  return(
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{top:5,right:10,bottom:5,left:10}}>
        <defs>
          <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={.12}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient>
          <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.20}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)"/>
        <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmt} width={55}/>
        <Tooltip content={<ChTip/>}/>
        <Area type="monotone" dataKey="best" stroke="none" fill="url(#cG)" name="P90"/>
        <Area type="monotone" dataKey="worst" stroke="none" fill={T.bg} name="P10"/>
        <Area type="monotone" dataKey="p80" stroke={T.blue} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="P80" dot={false}/>
        <Area type="monotone" dataKey="p20" stroke={T.red} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="P20" dot={false}/>
        <Area type="monotone" dataKey="expected" stroke={T.green} fill="url(#mG)" strokeWidth={2.5} name="Expected (P50)" dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ═══ DASHBOARD ═══
function Dashboard({stages,setStages,months,setMonths}){
  const res=useMemo(()=>simulate(stages,months),[stages,months]);
  const sens=useMemo(()=>sensitivity(stages,months),[stages,months]);
  const[cm,setCm]=useState("cumulative");
  const[showMeth,setShowMeth]=useState(false);
  const cov=res.totalPipe>0?res.totalPipe/res.expected:0;
  const cd=cm==="monthly"?res.monthly:res.cumulative;

  return(
    <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:16}}>
      <div style={{overflowY:"auto",maxHeight:"calc(100vh - 120px)",paddingRight:4,display:"flex",flexDirection:"column",gap:12}}>
        {/* Month slider */}
        <Card style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Label>Forecast Horizon</Label>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,color:T.accent}}>{months} months</span>
          </div>
          <input type="range" min={3} max={12} value={months} onChange={e=>setMonths(Number(e.target.value))} style={{width:"100%"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginTop:4}}>
            <span>3mo</span><span>12mo</span>
          </div>
        </Card>

        {/* Funnel */}
        <Card>
          <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:4}}>Pipeline Funnel</h3>
          <Funnel stages={stages}/>
        </Card>

        <Card><StageEditor stages={stages} setStages={setStages}/></Card>

        <Card>
          <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:12}}>Summary</h3>
          {[{l:"Total Deals",v:stages.reduce((s,st)=>s+st.deals,0)},{l:"Total Pipeline",v:fmtFull(res.totalPipe)},{l:"Weighted",v:fmtFull(res.weighted)},{l:`Expected (${months}mo)`,v:fmtFull(res.expected)},{l:"Range (P10—P90)",v:`${fmt(res.worst)} — ${fmt(res.best)}`}].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<4?`1px solid rgba(255,255,255,.04)`:"none",fontSize:13}}>
              <span style={{color:T.muted}}>{r.l}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.bright,fontWeight:500}}>{r.v}</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {showMeth&&(
          <Card cl="sc" style={{background:"rgba(99,102,241,.04)",borderColor:"rgba(99,102,241,.15)",fontSize:13,lineHeight:1.75}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <strong style={{color:T.accent}}>Methodology</strong>
              <button onClick={()=>setShowMeth(false)} style={{background:"none",border:"none",color:T.muted,fontSize:11}}>Close</button>
            </div>
            <p style={{marginBottom:6}}>Each deal simulated independently. Win rates: Gaussian noise (σ=18%). Values: ±15%. Timing: <strong style={{color:T.bright}}>log-normal</strong> (right-skewed — delays more common).</p>
            <p style={{marginBottom:6}}>Cumulative revenue computed per iteration, then percentiles taken across iterations. This produces realistic S-curves with widening uncertainty cones.</p>
            <p style={{color:T.muted,fontStyle:"italic",fontSize:12}}>2,000 iterations · {months}-month horizon · P10/P90 outer cone · P20/P80 inner band</p>
          </Card>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          <MCard label="Conservative" sub="P10" value={fmt(res.worst)} color={T.red} tip="90% of simulations beat this. Your planning floor."/>
          <MCard label="Expected" sub="P50" value={fmt(res.expected)} color={T.green} delay={50} tip="Median outcome across 2,000 simulations."/>
          <MCard label="Optimistic" sub="P90" value={fmt(res.best)} color={T.blue} delay={100} tip="Only 10% of simulations beat this. Stretch target."/>
          <MCard label="Coverage" sub="Pipe÷Expected" value={`${cov.toFixed(1)}×`} color={cov>=3?T.green:cov>=2?T.amber:T.red} delay={150} tip="Total pipeline ÷ expected. 3×+ is healthy."/>
        </div>

        <Card delay={80} style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <h3 style={{fontSize:14,fontWeight:700,color:T.bright}}>Revenue Forecast — {months} Month</h3>
              <button onClick={()=>setShowMeth(!showMeth)} style={{display:"flex",alignItems:"center",gap:3,background:"none",border:`1px solid ${T.border}`,borderRadius:T.rx,color:T.muted,padding:"3px 8px",fontSize:11}}>{Ic.info} Method</button>
            </div>
            <div style={{display:"flex",gap:3,background:T.surface,borderRadius:8,padding:2}}>
              {["monthly","cumulative"].map(m=><button key={m} onClick={()=>setCm(m)} style={{background:cm===m?"rgba(255,255,255,.07)":"transparent",border:"none",borderRadius:6,padding:"4px 12px",color:cm===m?T.bright:T.muted,fontSize:12,fontWeight:600,textTransform:"capitalize",transition:T.tr}}>{m}</button>)}
            </div>
          </div>
          <ForecastChart data={cd}/>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8,fontSize:11,color:T.muted}}>
            <span><span style={{display:"inline-block",width:20,height:2,background:T.green,verticalAlign:"middle",marginRight:4}}/>Expected</span>
            <span style={{borderBottom:`2px dashed ${T.blue}`,paddingBottom:1}}>P80</span>
            <span style={{borderBottom:`2px dashed ${T.red}`,paddingBottom:1}}>P20</span>
            <span><span style={{display:"inline-block",width:12,height:12,background:T.accentDim,verticalAlign:"middle",marginRight:4,borderRadius:2}}/>Cone</span>
          </div>
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card delay={150} h>
            <h3 style={{fontSize:13,fontWeight:700,color:T.bright,marginBottom:12}}>Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stages.map(s=>({name:s.name,total:s.deals*s.avgValue,weighted:s.deals*s.avgValue*s.winRate/100}))} margin={{top:5,right:5,bottom:5,left:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)"/>
                <XAxis dataKey="name" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmt} width={50}/>
                <Tooltip content={<ChTip/>}/>
                <Bar dataKey="total" name="Total" fill="rgba(255,255,255,.06)" radius={[3,3,0,0]}/>
                <Bar dataKey="weighted" name="Weighted" radius={[3,3,0,0]}>
                  {stages.map((_,i)=><Cell key={i} fill={[T.accent,T.green,T.amber,T.purple,T.cyan][i%5]} fillOpacity={.7}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card delay={200} h>
            <h3 style={{fontSize:13,fontWeight:700,color:T.bright,marginBottom:4}}>Sensitivity</h3>
            <p style={{fontSize:11,color:T.muted,marginBottom:10}}>±10pp win rate shift</p>
            {sens.map((s,i)=>{
              const mx=Math.max(...sens.map(x=>Math.max(Math.abs(x.upside),Math.abs(x.downside))))||1;
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                    <span style={{color:T.text,fontWeight:500}}>{s.name}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.muted}}>{fmt(s.downside)} / +{fmt(s.upside)}</span>
                  </div>
                  <div style={{display:"flex",height:14,alignItems:"center",gap:1}}>
                    <div style={{flex:1,display:"flex",justifyContent:"flex-end"}}><div style={{height:12,background:`linear-gradient(90deg,transparent,${T.red})`,opacity:.5,borderRadius:"3px 0 0 3px",width:`${Math.abs(s.downside)/mx*100}%`,transition:"width .4s"}}/></div>
                    <div style={{width:1.5,height:14,background:T.border}}/>
                    <div style={{flex:1}}><div style={{height:12,background:`linear-gradient(90deg,${T.green},transparent)`,opacity:.5,borderRadius:"0 3px 3px 0",width:`${Math.abs(s.upside)/mx*100}%`,transition:"width .4s"}}/></div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══ SCENARIOS ═══
function Scenarios({stages,setStages,months}){
  const[scenarios,setScenarios]=useState(DEMO_SCENARIOS.map(s=>({...s,stages:JSON.parse(JSON.stringify(s.stages))})));
  const[newName,setNewName]=useState("");
  const[comparing,setComparing]=useState([1,2,3]); // Pre-compare all demos
  const save=()=>{const nm=newName.trim()||`Scenario ${scenarios.length+1}`;setScenarios(p=>[...p,{name:nm,stages:JSON.parse(JSON.stringify(stages)),id:Date.now()}]);setNewName("");};
  const load=sc=>setStages(JSON.parse(JSON.stringify(sc.stages)));
  const del=id=>{setScenarios(p=>p.filter(s=>s.id!==id));setComparing(p=>p.filter(c=>c!==id));};
  const tog=id=>setComparing(p=>p.includes(id)?p.filter(c=>c!==id):p.length<3?[...p,id]:p);
  const compData=useMemo(()=>comparing.map(id=>{const sc=scenarios.find(s=>s.id===id);if(!sc)return null;const r=simulate(sc.stages,months,1200);return{...r,name:sc.name};}).filter(Boolean),[comparing,scenarios,months]);

  return(
    <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:16}}>
      <div>
        <Card>
          <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:12}}>Save Current Pipeline</h3>
          <div style={{display:"flex",gap:8}}>
            <Inp type="text" value={newName} onChange={e=>setNewName(e.target.value)} style={{textAlign:"left",fontFamily:"'Plus Jakarta Sans',sans-serif",flex:1}}/>
            <button onClick={save} style={{display:"flex",alignItems:"center",gap:4,background:T.accent,border:"none",borderRadius:T.rx,color:T.white,padding:"8px 14px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{Ic.save} Save</button>
          </div>
        </Card>
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
          {scenarios.map((sc,idx)=>{
            const r=simulate(sc.stages,months,500);const ic=comparing.includes(sc.id);
            return(
              <Card key={sc.id} delay={idx*60} h style={{borderColor:ic?T.accent:T.border,background:ic?"rgba(99,102,241,.04)":T.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.bright}}>{sc.name}</span>
                  <button onClick={()=>tog(sc.id)} style={{background:ic?T.accentDim:"transparent",border:`1px solid ${ic?T.accent:T.border}`,borderRadius:T.rx,color:ic?T.accent:T.muted,fontSize:11,padding:"3px 8px",fontWeight:600}}>{ic?"✓":"Compare"}</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:12}}>
                  {[{l:"P10",v:fmt(r.worst),c:T.red},{l:"P50",v:fmt(r.expected),c:T.green},{l:"P90",v:fmt(r.best),c:T.blue}].map((x,j)=>(
                    <div key={j}><Label>{x.l}</Label><span style={{color:x.c,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>{x.v}</span></div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6,marginTop:10}}>
                  <button onClick={()=>load(sc)} style={{flex:1,background:"rgba(255,255,255,.04)",border:`1px solid ${T.border}`,borderRadius:T.rx,color:T.text,fontSize:11,padding:"6px 0",fontWeight:600}}>Load</button>
                  {scenarios.length>1&&<button onClick={()=>del(sc.id)} style={{background:T.redDim,border:`1px solid rgba(239,68,68,.2)`,borderRadius:T.rx,color:T.red,fontSize:11,padding:"6px 10px",fontWeight:600}}>{Ic.trash}</button>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <div>
        {compData.length===0?(
          <Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16,opacity:.3}}>📊</div>
            <h3 style={{color:T.muted,fontSize:16,fontWeight:600,marginBottom:8}}>No scenarios selected</h3>
            <p style={{color:T.muted,fontSize:13}}>Click "Compare" on 2-3 scenarios</p>
          </Card>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card>
              <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:16}}>Cumulative Forecast Comparison</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart margin={{top:5,right:10,bottom:5,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)"/>
                  <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} allowDuplicatedCategory={false}/>
                  <YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmt} width={55}/>
                  <Tooltip content={<ChTip/>}/>
                  {compData.map((sc,i)=><Line key={sc.name} data={sc.cumulative} type="monotone" dataKey="expected" name={sc.name} stroke={[T.accent,T.green,T.amber][i%3]} strokeWidth={2.5} dot={false}/>)}
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${compData.length},1fr)`,gap:12}}>
              {compData.map((sc,i)=>(
                <Card key={sc.name} delay={i*80} h>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:[T.accent,T.green,T.amber][i%3]}}/>
                    <span style={{fontSize:14,fontWeight:700,color:T.bright}}>{sc.name}</span>
                  </div>
                  {[{l:"P10",v:fmt(sc.worst),c:T.red},{l:"P50",v:fmt(sc.expected),c:T.green},{l:"P90",v:fmt(sc.best),c:T.blue},{l:"Pipeline",v:fmt(sc.totalPipe),c:T.text},{l:"Weighted",v:fmt(sc.weighted),c:T.amber}].map((r,j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:j<4?`1px solid rgba(255,255,255,.04)`:"none",fontSize:12}}>
                      <span style={{color:T.muted}}>{r.l}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",color:r.c,fontWeight:500}}>{r.v}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ CAPACITY — DEEPER ═══
function Capacity({stages,months}){
  const[quota,setQuota]=useState(250000);
  const[att,setAtt]=useState(75);
  const[ramp,setRamp]=useState(3);
  const[reps,setReps]=useState(6);
  const[costPerRep,setCostPerRep]=useState(85000);
  const res=useMemo(()=>simulate(stages,months,1500),[stages,months]);

  const eq=quota*(att/100);
  const need=Math.ceil(res.expected/eq);
  const needBest=Math.ceil(res.best/eq);
  const gap=Math.max(0,need-reps);
  const cap=reps*eq;
  const covPct=res.expected>0?cap/res.expected*100:0;
  const gauge=[{value:Math.min(100,covPct),fill:covPct>=100?T.green:covPct>=70?T.amber:T.red}];

  // Hiring timeline: when each new rep reaches full productivity
  const hiringTimeline=Array.from({length:Math.min(gap,8)},(_,i)=>({
    rep:`Rep ${reps+i+1}`,
    hireMonth:i+1,
    rampEnd:i+1+ramp,
    fullQuotaMonth:Math.min(months,i+1+ramp),
    monthsProductive:Math.max(0,months-(i+1+ramp)),
    contribution:Math.max(0,months-(i+1+ramp))/months*eq,
  }));

  const totalHiringCost=gap*costPerRep;
  const additionalCapacity=hiringTimeline.reduce((s,h)=>s+h.contribution,0);
  const newTotalCapacity=cap+additionalCapacity;
  const newCovPct=res.expected>0?newTotalCapacity/res.expected*100:0;

  // Ramp curve data
  const rampCurve=Array.from({length:months},(_,m)=>{
    let existing=reps*eq/12; // monthly
    let newCap=0;
    for(const h of hiringTimeline){
      const monthsSinceHire=m+1-h.hireMonth;
      if(monthsSinceHire>0){
        const rampPct=Math.min(1,monthsSinceHire/ramp);
        newCap+=rampPct*eq/12;
      }
    }
    return{name:`M${m+1}`,existing,newReps:newCap,total:existing+newCap,needed:res.monthly[m]?.expected||0};
  });

  return(
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:16}}>Rep Parameters</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><Label>Annual Quota ($)</Label><Inp value={quota} onChange={e=>setQuota(Number(e.target.value)||0)}/></div>
            <div><Label>Attainment %</Label><Inp value={att} onChange={e=>setAtt(Number(e.target.value)||0)}/></div>
            <div><Label>Ramp (months)</Label><Inp value={ramp} onChange={e=>setRamp(Number(e.target.value)||0)}/></div>
            <div><Label>Current Reps</Label><Inp value={reps} onChange={e=>setReps(Number(e.target.value)||0)}/></div>
            <div style={{gridColumn:"span 2"}}><Label>Annual Cost per Rep ($)</Label><Inp value={costPerRep} onChange={e=>setCostPerRep(Number(e.target.value)||0)}/></div>
          </div>
        </Card>
        <Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <ResponsiveContainer width={180} height={180}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={gauge} barSize={14}>
              <RadialBar background={{fill:"rgba(255,255,255,.04)"}} dataKey="value" cornerRadius={7}/>
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{textAlign:"center",marginTop:-40}}>
            <div style={{fontSize:28,fontWeight:800,color:T.bright,fontFamily:"'JetBrains Mono',monospace"}}>{covPct.toFixed(0)}%</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>Current Capacity</div>
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MCard label="Reps Needed" sub="For P50" value={need} color={T.accent}/>
        <MCard label="Hiring Gap" sub={gap>0?"Need to hire":"Covered"} value={gap>0?`+${gap}`:"0"} color={gap>0?T.amber:T.green} delay={50}/>
        <MCard label="Hiring Cost" sub="Total investment" value={fmt(totalHiringCost)} color={T.purple} delay={100}/>
        <MCard label="After Hiring" sub="New coverage" value={`${newCovPct.toFixed(0)}%`} color={newCovPct>=90?T.green:T.amber} delay={150}/>
      </div>

      {/* Ramp Curve Chart */}
      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:4}}>Capacity Ramp Timeline</h3>
        <p style={{fontSize:12,color:T.muted,marginBottom:14}}>Monthly capacity from existing + new reps vs. expected revenue</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={rampCurve} margin={{top:5,right:10,bottom:5,left:10}}>
            <defs>
              <linearGradient id="rE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.blue} stopOpacity={.25}/><stop offset="100%" stopColor={T.blue} stopOpacity={0}/></linearGradient>
              <linearGradient id="rN" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.25}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)"/>
            <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmt} width={55}/>
            <Tooltip content={<ChTip/>}/>
            <Area type="monotone" dataKey="existing" stackId="cap" stroke={T.blue} fill="url(#rE)" strokeWidth={2} name="Existing Reps"/>
            <Area type="monotone" dataKey="newReps" stackId="cap" stroke={T.green} fill="url(#rN)" strokeWidth={2} name="New Reps (Ramping)"/>
            <Line type="monotone" dataKey="needed" stroke={T.amber} strokeWidth={2} strokeDasharray="5 5" name="Expected Revenue" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Scenarios reps */}
      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:16}}>Reps per Scenario</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          {[{l:"Conservative",v:res.worst,c:T.red,r:Math.ceil(res.worst/eq)},{l:"Expected",v:res.expected,c:T.green,r:need},{l:"Optimistic",v:res.best,c:T.blue,r:needBest}].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:16,background:"rgba(255,255,255,.02)",borderRadius:T.rs,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,color:T.muted,marginBottom:6}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.v)}</div>
              <div style={{fontSize:28,fontWeight:800,color:T.bright,margin:"8px 0 4px"}}>{s.r}</div>
              <div style={{fontSize:11,color:T.muted}}>reps · {fmt(s.r*costPerRep)} cost</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Hiring Timeline Table */}
      {gap>0&&(
        <Card>
          <h3 style={{fontSize:14,fontWeight:700,color:T.bright,marginBottom:12}}>Hiring Timeline</h3>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Hire","Start Month","Full Ramp","Productive Months","Expected Contribution"].map(h=>(
                <th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.muted,fontSize:10,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {hiringTimeline.map((h,i)=>(
                <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,.03)`}}>
                  <td style={{padding:"10px 12px",color:T.bright,fontWeight:600}}>{h.rep}</td>
                  <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>M{h.hireMonth}</td>
                  <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>M{h.rampEnd}</td>
                  <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:h.monthsProductive>0?T.green:T.red}}>{h.monthsProductive}</td>
                  <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:T.green}}>{fmt(h.contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ramp>0&&(
            <div style={{marginTop:14,padding:14,background:T.amberDim,borderRadius:T.rs,border:`1px solid rgba(234,179,8,.15)`,fontSize:13,color:T.amber}}>
              ⚠️ With {ramp}-month ramp, {hiringTimeline.filter(h=>h.monthsProductive===0).length} of {gap} new hires won't contribute within the forecast window. Hire earlier or shorten ramp with better onboarding.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══ REPORTS ═══
function Reports({stages,months}){
  const[mode,setMode]=useState("executive");
  const res=useMemo(()=>simulate(stages,months,2000),[stages,months]);
  const sens=useMemo(()=>sensitivity(stages,months),[stages,months]);
  const cov=res.totalPipe>0?res.totalPipe/res.expected:0;

  const modeToggle=(
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <div style={{display:"flex",gap:3,background:T.surface,borderRadius:8,padding:2,border:`1px solid ${T.border}`}}>
        {["executive","technical"].map(m=><button key={m} onClick={()=>setMode(m)} style={{background:mode===m?"rgba(255,255,255,.07)":"transparent",border:"none",borderRadius:6,padding:"6px 16px",color:mode===m?T.bright:T.muted,fontSize:12,fontWeight:600,textTransform:"capitalize",transition:T.tr}}>{m}</button>)}
      </div>
    </div>
  );

  if(mode==="executive") return(
    <div style={{maxWidth:960,margin:"0 auto"}}>
      {modeToggle}
      <div className="fu" style={{textAlign:"center",marginBottom:32,padding:"32px 0",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",marginBottom:8}}>Revenue Forecast · {months} Month Horizon</div>
        <div style={{fontSize:52,fontWeight:800,color:T.bright,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-.03em"}}>{fmt(res.expected)}</div>
        <div style={{fontSize:14,color:T.muted,marginTop:6}}>Expected revenue · {stages.reduce((s,st)=>s+st.deals,0)} active deals · 2,000 simulations</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:28}}>
        {[{l:"Conservative",sub:"P10 — 90% confidence floor",v:fmt(res.worst),c:T.red,bg:T.redDim},{l:"Expected",sub:"P50 — Most likely",v:fmt(res.expected),c:T.green,bg:T.greenDim},{l:"Optimistic",sub:"P90 — Stretch target",v:fmt(res.best),c:T.blue,bg:T.blueDim}].map((s,i)=>(
          <div key={i} className="fu" style={{animationDelay:`${i*100}ms`,background:s.bg,border:`1px solid ${s.c}22`,borderRadius:T.r,padding:24,textAlign:"center"}}>
            <div style={{fontSize:12,color:s.c,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{s.l}</div>
            <div style={{fontSize:32,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace",margin:"8px 0"}}>{s.v}</div>
            <div style={{fontSize:11,color:T.muted}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <Card delay={150} style={{marginBottom:28}}>
        <h3 style={{fontSize:15,fontWeight:700,color:T.bright,marginBottom:16}}>Cumulative Projection — Uncertainty Cone</h3>
        <ForecastChart data={res.cumulative} height={300}/>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[{l:"Total Pipeline",v:fmt(res.totalPipe),c:T.text},{l:"Weighted Pipeline",v:fmt(res.weighted),c:T.amber},{l:"Coverage",v:`${cov.toFixed(1)}×`,c:cov>=3?T.green:T.amber},{l:"Range",v:`${fmt(res.worst)} — ${fmt(res.best)}`,c:T.accent}].map((m,i)=>(
          <Card key={i} delay={250+i*60} style={{textAlign:"center",padding:20}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{m.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:m.c,fontFamily:"'JetBrains Mono',monospace"}}>{m.v}</div>
          </Card>
        ))}
      </div>
      <div style={{textAlign:"center",marginTop:24,fontSize:11,color:T.muted}}>Monte Carlo · 2,000 iterations · Log-normal timing</div>
    </div>
  );

  // TECHNICAL
  return(
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {modeToggle}
      <h2 style={{fontSize:20,fontWeight:800,color:T.bright,marginBottom:4}}>Technical Report</h2>
      <p style={{fontSize:13,color:T.muted,marginBottom:20}}>Full model output · {months}-month horizon</p>

      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Model Parameters</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,fontSize:13}}>
          {[{l:"Iterations",v:"2,000"},{l:"Win Rate σ",v:"18%"},{l:"Value σ",v:"15%"},{l:"Timing",v:"Log-normal"},{l:"Timing σ",v:"35%"},{l:"Horizon",v:`${months} months`}].map((p,i)=>(
            <div key={i} style={{padding:10,background:"rgba(255,255,255,.02)",borderRadius:T.rx}}>
              <div style={{fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{p.l}</div>
              <div style={{color:T.bright,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>{p.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Distribution</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,fontSize:13,marginBottom:16}}>
          {[{l:"P10",v:fmtFull(res.worst),c:T.red},{l:"P20",v:fmtFull(res.p20),c:T.red},{l:"P50",v:fmtFull(res.expected),c:T.green},{l:"P80",v:fmtFull(res.p80),c:T.blue},{l:"P90",v:fmtFull(res.best),c:T.blue}].map((p,i)=>(
            <div key={i} style={{textAlign:"center",padding:12,background:"rgba(255,255,255,.02)",borderRadius:T.rx}}>
              <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:4}}>{p.l}</div>
              <div style={{fontSize:16,fontWeight:700,color:p.c,fontFamily:"'JetBrains Mono',monospace"}}>{p.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[{l:"Mean",v:fmtFull(res.mean)},{l:"Std Dev",v:fmtFull(res.stdDev)},{l:"CV",v:fmtPct(res.mean>0?res.stdDev/res.mean*100:0)}].map((p,i)=>(
            <div key={i} style={{padding:10,background:"rgba(255,255,255,.02)",borderRadius:T.rx,fontSize:13}}>
              <div style={{fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{p.l}</div>
              <div style={{color:T.bright,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>{p.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Histogram</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={res.histogram} margin={{top:5,right:10,bottom:5,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)"/>
            <XAxis dataKey="range" tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} interval={3}/>
            <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip content={({active,payload})=>{
              if(!active||!payload?.length)return null;const d=payload[0].payload;
              return<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rs,padding:"8px 12px",fontSize:12,boxShadow:T.sh}}>
                <div style={{color:T.muted}}>Range: {fmt(d.lo)} — {fmt(d.hi)}</div>
                <div style={{color:T.bright,fontWeight:600}}>{d.count} sims ({d.pct.toFixed(1)}%)</div>
              </div>;
            }}/>
            <Bar dataKey="count" radius={[2,2,0,0]}>
              {res.histogram.map((d,i)=><Cell key={i} fill={d.lo<=res.expected&&d.hi>=res.expected?T.green:T.accent} fillOpacity={d.lo<=res.expected&&d.hi>=res.expected?.8:.4}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Per-Stage Breakdown</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Stage","Deals","Avg $","Win %","Days","Exp Wins","Exp Revenue","% Total"].map(h=>(
                <th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.muted,fontSize:10,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {stages.map((s,i)=>{
                const ew=Math.round(s.deals*s.winRate/100),er=s.deals*s.avgValue*s.winRate/100;
                const pctT=res.weighted>0?er/res.weighted*100:0;
                return(
                  <tr key={s.id} style={{borderBottom:`1px solid rgba(255,255,255,.03)`}}>
                    <td style={{padding:"10px 12px",color:T.bright,fontWeight:600}}>{s.name}</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{s.deals}</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.avgValue)}</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{s.winRate}%</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{s.daysToClose}d</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:T.green}}>{ew}</td>
                    <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:T.green}}>{fmt(er)}</td>
                    <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:6,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:[T.accent,T.green,T.amber,T.purple,T.cyan][i%5],width:`${pctT}%`,borderRadius:3}}/></div>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.muted,minWidth:36}}>{pctT.toFixed(1)}%</span>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Sensitivity (±10pp)</h3>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
            {["Stage","−10pp","Current","+ 10pp","Leverage"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.muted,fontSize:10,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{sens.map((s,i)=>{
            const lev=Math.abs(s.upside)+Math.abs(s.downside);const mx=Math.max(...sens.map(x=>Math.abs(x.upside)+Math.abs(x.downside)));
            return(
              <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,.03)`}}>
                <td style={{padding:"10px 12px",color:T.bright,fontWeight:600}}>{s.name}</td>
                <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:T.red}}>{fmt(s.downside)}</td>
                <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{stages.find(st=>st.name===s.name)?.winRate}%</td>
                <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",color:T.green}}>+{fmt(s.upside)}</td>
                <td style={{padding:"10px 12px"}}><div style={{height:6,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:T.accent,width:`${lev/mx*100}%`,borderRadius:3}}/></div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      <Card>
        <h3 style={{fontSize:14,fontWeight:700,color:T.accent,marginBottom:12}}>Monthly Cumulative Forecast</h3>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
            {["Month","P10","P20","P50","P80","P90"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"right",color:T.muted,fontSize:10,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{res.cumulative.map((m,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,.03)`}}>
              <td style={{padding:"10px 12px",color:T.bright,fontWeight:600,textAlign:"right"}}>{m.name}</td>
              <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",color:T.red}}>{fmtFull(m.worst)}</td>
              <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",color:T.red}}>{fmtFull(m.p20)}</td>
              <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",color:T.green,fontWeight:700}}>{fmtFull(m.expected)}</td>
              <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",color:T.blue}}>{fmtFull(m.p80)}</td>
              <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",textAlign:"right",color:T.blue}}>{fmtFull(m.best)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      <div style={{textAlign:"center",marginTop:24,fontSize:11,color:T.muted}}>RevCast Technical Report · {res.iterations} iterations · {months}-month horizon</div>
    </div>
  );
}

// ═══ MAIN ═══
const TABS=[
  {id:"dashboard",label:"Dashboard",icon:Ic.dash},
  {id:"scenarios",label:"Scenarios",icon:Ic.scen},
  {id:"capacity",label:"Capacity",icon:Ic.cap},
  {id:"reports",label:"Reports",icon:Ic.rep},
];

export default function RevCast(){
  const[tab,setTab]=useState("dashboard");
  const[stages,setStages]=useState(DS);
  const[months,setMonths]=useState(6);
  const[showOB,setShowOB]=useState(true);

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif"}}>
      <style>{CSS}</style>
      {showOB&&<Onboarding onClose={()=>setShowOB(false)}/>}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 24px",borderBottom:`1px solid ${T.border}`,background:"rgba(7,9,15,.8)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:T.white}}>R</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.bright,letterSpacing:"-.02em"}}>RevCast</div>
            <div style={{fontSize:10,color:T.muted}}>Revenue Forecasting Engine</div>
          </div>
        </div>
        <div style={{display:"flex",gap:3,background:T.surface,borderRadius:10,padding:3,border:`1px solid ${T.border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:6,background:tab===t.id?T.card:"transparent",border:tab===t.id?`1px solid ${T.border}`:"1px solid transparent",borderRadius:8,padding:"7px 14px",color:tab===t.id?T.bright:T.muted,fontSize:13,fontWeight:600,transition:T.tr}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowOB(true)} style={{display:"flex",alignItems:"center",gap:4,background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.rs,color:T.muted,padding:"6px 12px",fontSize:12,fontWeight:500}}>{Ic.info} Help</button>
      </nav>
      <div key={tab} className="fi" style={{padding:"20px 24px"}}>
        {tab==="dashboard"&&<Dashboard stages={stages} setStages={setStages} months={months} setMonths={setMonths}/>}
        {tab==="scenarios"&&<Scenarios stages={stages} setStages={setStages} months={months}/>}
        {tab==="capacity"&&<Capacity stages={stages} months={months}/>}
        {tab==="reports"&&<Reports stages={stages} months={months}/>}
      </div>
    </div>
  );
}
