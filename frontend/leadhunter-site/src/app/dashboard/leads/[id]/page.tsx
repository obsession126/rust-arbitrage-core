"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export default function LeadIntelPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.status === 403 || res.status === 401) {
          setError("ACCESS_DENIED: Lead not purchased or session expired.");
          return;
        }

        if (!res.ok) throw new Error("ENTITY_NOT_FOUND");

        const data = await res.json();
        setLead(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLeadData();
  }, [id, router]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-terminal text-sm font-mono uppercase tracking-widest animate-pulse">[ DOWNLOADING_OSINT_DATA... ]</div>;
  
  if (error) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
      <div className="border border-red-500/50 p-8 bg-red-500/5 text-red-500 text-center">
        <h2 className="text-xl font-black uppercase mb-2">Security_Breach_Detected</h2>
        <p className="text-xs uppercase tracking-widest">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="mt-6 border border-red-500/50 px-4 py-2 hover:bg-red-500/10 text-[10px] uppercase transition-all">RETURN_TO_SAFE_ZONE</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen pt-20 bg-[#050505] text-white font-mono p-6 selection:bg-terminal selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* TOP STATUS BAR */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 border border-white/10 p-4 bg-[#0A0A0A] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-[10px] uppercase">Entity_ID: 0x{id?.toString().slice(0,8)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terminal animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)]"></span>
            <span className="text-terminal text-[10px] uppercase font-bold tracking-widest">Validated_Live</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/dashboard')} className="text-[10px] border border-white/20 px-4 py-1 hover:bg-white/5 transition-all uppercase text-gray-400 hover:text-white">
              Back_To_Hub
            </button>
            <button onClick={() => window.print()} className="text-[10px] border border-terminal/50 text-terminal px-4 py-1 hover:bg-terminal/10 transition-all uppercase">
              Export_PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: CORE DATA */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2 italic">
                {lead.company_name}
              </h1>
              <div className="flex gap-4 items-center mb-6">
                <p className="text-gray-500 text-xs uppercase tracking-[0.3em]">
                  {lead.industry}
                </p>
                <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-terminal text-[10px] lowercase border border-terminal/30 px-2 hover:bg-terminal/10 transition-colors">
                  {lead.url}
                </a>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-white/5 p-4 bg-[#0D0D0D] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Decision Maker (CEO)</span>
                  <span className="text-sm font-bold text-gray-600 italic">[{lead.contact_name || "OSINT_PENDING"}]</span>
                  <div className="flex gap-2 mt-2">
                    <span className="text-gray-600 text-[9px] uppercase">LinkedIn: [ENCRYPTED]</span>
                  </div>
                </div>
                
                <div className="border border-white/5 p-4 bg-[#0D0D0D]">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Direct Communications</span>
                  <span className={`text-sm font-bold block ${lead.phone !== "N/A" ? "text-terminal" : "text-gray-600"}`}>
                    {lead.phone}
                  </span>
                  <span className={`block text-xs mt-1 ${lead.email !== "N/A" ? "text-white italic" : "text-gray-600"}`}>
                    {lead.email}
                  </span>
                </div>
              </div>
            </section>

            {/* AI ANALYTICS ENGINE */}
            <section className="border-l-2 border-terminal pl-6 py-4 bg-gradient-to-r from-terminal/5 to-transparent">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-[10px] bg-terminal text-black px-2 py-0.5 font-black uppercase">AI_Refinery_Analysis</div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase mb-1 text-gray-400">Target Weakness:</h4>
                  <p className="text-sm text-white leading-relaxed font-bold">
                    {lead.intel?.pain_points || "No specific vulnerabilities detected. Custom approach required."}
                  </p>
                </div>
              </div>
            </section>

            {/* LINKS & INFRASTRUCTURE */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-white/10 bg-[#0A0A0A]">
                <h5 className="text-[10px] text-gray-500 uppercase mb-3 border-b border-white/10 pb-2">Digital Footprint (Socials)</h5>
                <div className="space-y-2 text-[10px] uppercase">
                  {Object.keys(lead.socials || {}).length === 0 ? (
                    <span className="text-gray-600">NO_SOCIAL_DATA_FOUND</span>
                  ) : (
                    Object.entries(lead.socials).map(([platform, status]) => (
                      <div key={platform} className="flex justify-between">
                        <span>{platform}:</span> 
                        <span className={status === "Active" ? "text-terminal" : "text-gray-500"}>{String(status)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="p-4 border border-white/10 bg-[#0A0A0A]">
                <h5 className="text-[10px] text-gray-500 uppercase mb-3 border-b border-white/10 pb-2">Domain Intelligence</h5>
                <div className="space-y-2 text-[10px] uppercase">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Domain Age:</span> 
                    <span className="text-white">{lead.intel?.domain_age ? `${lead.intel.domain_age} days` : "UNKNOWN"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ads Activity:</span> 
                    <span className={lead.intel?.ads_active ? "text-terminal font-bold" : "text-gray-500"}>
                      {lead.intel?.ads_active ? "DETECTED" : "CLEAN"}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: ACTION & DEPLOYMENT */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0A0A0A] border border-terminal/30 p-6 relative overflow-hidden group">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"></div>
               <h3 className="text-sm font-black uppercase mb-6 relative z-10 italic flex items-center gap-2">
                 <svg className="w-4 h-4 text-terminal" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.95 11.95 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                 Ownership_Status
               </h3>
               
               <div className="space-y-4 mb-8 relative z-10">
                 <div className="flex justify-between items-end border-b border-white/10 pb-2">
                   <span className="text-[10px] text-gray-500 uppercase">Asset Rank</span>
                   <span className={`text-xs font-black uppercase ${
                          lead.rank.toLowerCase() === 'platinum' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 
                          lead.rank.toLowerCase() === 'gold' ? 'text-yellow-500' : 
                          'text-white'
                        }`}>
                     {lead.rank}
                   </span>
                 </div>
                 <div className="flex justify-between items-end border-b border-white/10 pb-2">
                   <span className="text-[10px] text-gray-500 uppercase">Security</span>
                   <span className="text-xs text-white uppercase tracking-widest">Verified_Access</span>
                 </div>
               </div>
               
               <div className="relative z-10 text-[9px] text-terminal/80 uppercase p-3 border border-terminal/20 bg-terminal/5 leading-relaxed">
                 &gt; DATA UNLOCKED. <br/>
                 &gt; You are the sole owner of this lead in the system. Contacts are primed for cold outreach.
               </div>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}