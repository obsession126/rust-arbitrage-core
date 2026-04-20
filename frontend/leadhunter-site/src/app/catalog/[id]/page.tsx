"use client";

export default function LeadIntelPage() {
  return (
    <main className="min-h-screen pt-20 bg-[#050505] text-white font-mono p-6 selection:bg-terminal">
      <div className="max-w-6xl mx-auto">
        
        {/* TOP STATUS BAR */}
        <div className="flex justify-between items-center mb-8 border border-white/10 p-4 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-[10px] uppercase">Entity_ID: 0x82FA4</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terminal animate-pulse"></span>
            <span className="text-terminal text-[10px] uppercase font-bold tracking-widest">Validated_Live</span>
          </div>
          <button className="text-[10px] border border-white/20 px-4 py-1 hover:bg-white/5 transition-all uppercase">
            Export_PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: CORE DATA */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 italic">SolarFlow_Solutions.io</h1>
              <p className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">Residential Solar Installation / Florida</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-white/5 p-4 bg-white/[0.02]">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Decision Maker (CEO)</span>
                  <span className="text-sm font-bold">Marcus V. Sterling</span>
                  <div className="flex gap-2 mt-2">
                    <a href="#" className="text-terminal hover:underline text-[9px] uppercase">[LinkedIn]</a>
                    <a href="#" className="text-terminal hover:underline text-[9px] uppercase">[Twitter]</a>
                  </div>
                </div>
                <div className="border border-white/5 p-4 bg-white/[0.02]">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Contact Intel</span>
                  <span className="text-sm font-bold text-terminal">+1 (305) 555-0192</span>
                  <span className="block text-xs text-gray-400 mt-1 italic">m.sterling@solarflow.io</span>
                </div>
              </div>
            </section>

            {/* AI ANALYTICS ENGINE - ЦЕ ТЕ, ЩО ТИ ХОТІВ */}
            <section className="border-l-2 border-terminal pl-8 py-4 bg-terminal/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-[10px] bg-terminal text-black px-2 py-0.5 font-black uppercase">AI_Refinery_Analysis</div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase mb-1">💰 Weakness / Pain Points:</h4>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    "Currently spending ~$12k/mo on Google Ads with 4.2s mobile load time. High bounce rate on 'Free Quote' page. Using outdated FB Pixel (v1.2). Direct competitor 'SunRun' is outbidding them in their local zip codes."
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase mb-1">🚀 Recommended Strategy:</h4>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    "Pitch: Website speed optimization + TikTok Ads retargeting. Their CEO is active on LinkedIn talking about 'Sustainability Tech' — use this for outreach."
                  </p>
                </div>
              </div>
            </section>

            {/* LINKS & INFRASTRUCTURE */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-white/10">
                <h5 className="text-[10px] text-gray-500 uppercase mb-3">Tech Stack Detect:</h5>
                <div className="flex flex-wrap gap-2">
                  {['Next.js', 'Clarity', 'FB-Pixel', 'Mailchimp', 'HubSpot'].map(t => (
                    <span key={t} className="text-[9px] bg-white/5 px-2 py-1 border border-white/5">{t}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 border border-white/10">
                <h5 className="text-[10px] text-gray-500 uppercase mb-3">Domain Intelligence:</h5>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between"><span>Authority:</span> <span className="text-white">42/100</span></div>
                  <div className="flex justify-between"><span>Backlinks:</span> <span className="text-white">1.2k</span></div>
                  <div className="flex justify-between"><span>Ads_Active:</span> <span className="text-terminal font-bold">TRUE</span></div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: ACTION & DEPLOYMENT */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0A0A0A] border border-terminal/20 p-6 relative overflow-hidden">
               {/* Grid background effect */}
               <div className="absolute inset-0 bg-[url('/grid.png')] opacity-10 pointer-events-none"></div>
               
               <h3 className="text-sm font-black uppercase mb-6 relative z-10 italic">Acquisition_Control</h3>
               
               <div className="space-y-4 mb-8 relative z-10">
                 <div className="flex justify-between text-[10px]">
                   <span className="text-gray-500">Asset Rank:</span>
                   <span className="text-terminal">Platinum</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                   <span className="text-gray-500">Data Exclusivity:</span>
                   <span className="text-white italic">1/1 (Unique)</span>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                   <div className="text-[9px] text-gray-500 mb-2">Purchase price:</div>
                   <div className="text-3xl font-black">$45.00</div>
                 </div>
               </div>

               <button className="w-full bg-terminal text-black font-black py-4 text-xs uppercase tracking-widest hover:scale-[1.02] transition-all relative z-10">
                 Claim_This_Lead
               </button>
               
               <p className="text-[8px] text-gray-600 mt-4 text-center uppercase">
                 Note: Upon purchase, this entity is removed from the global pool forever.
               </p>
            </div>

            <div className="p-4 border border-white/5 bg-black/20">
               <h5 className="text-[10px] uppercase text-gray-500 mb-3">Last Activity Log:</h5>
               <div className="space-y-2 font-mono text-[8px] text-gray-600">
                  <div className="flex gap-2"><span>[21:04]</span> <span>OSINT_Node_Delta updated phones...</span></div>
                  <div className="flex gap-2"><span>[18:22]</span> <span>Ads_Engine detected new FB Creative...</span></div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}