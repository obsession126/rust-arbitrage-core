"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import HeroVisualizer from "@/components/HeroVisualizer";

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs(["[SYSTEM]: LeadHunter OSINT Engine v1.0.4 Online..."]);
    const events = [
      "[SCANNER]: High-intent lead found: 'Solar Energy' (CA)",
      "[OSINT]: Validating domain authority...",
      "[SYSTEM]: 12 leads pushed to Telegram",
      "[DB]: Batch 'Roofing' locked for 24h",
      "[ALERT]: -$1,200/mo ad waste detected",
    ];
    const interval = setInterval(() => {
      setLogs((prev) => [...prev.slice(-4), events[Math.floor(Math.random() * events.length)]]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] text-white font-mono selection:bg-terminal selection:text-black">
      
      {/* HERO SECTION */}
      <section className="relative py-20 lg:py-32 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-terminal/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 border border-terminal/30 px-3 py-1 rounded-sm text-terminal text-[10px] uppercase tracking-[0.3em] mb-8 bg-terminal/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal"></span>
              </span>
              System_Online // OSINT_V3
            </div>
            
            <h1 className="text-7xl lg:text-9xl font-black tracking-tighter mb-8 leading-[0.8] uppercase italic">
              Stop fishing.<br />
              <span className="text-terminal drop-shadow-[0_0_15px_rgba(57,255,20,0.3)]">Start hunting.</span>
            </h1>
            
            <p className="text-gray-400 text-lg max-w-md mb-12 font-sans leading-relaxed border-l border-white/10 pl-6">
              Precision-targeted B2B leads. We bypass traditional scrapers to find companies with 
              <span className="text-white font-bold"> active demand </span> 
              while your competitors burn budget on dead lists.
            </p>

            <div className="flex flex-wrap gap-6">
              <Link href="/catalog" className="border border-white/20 bg-terminal text-white font-white px-12 py-5 text-sm hover:shadow-[0_0_40px_rgba(57,255,20,0.4)] transition-all uppercase tracking-widest active:scale-95">
                Open Terminal
              </Link>
              <button className="border border-white/20 bg-terminal text-white font-white px-12 py-5 text-sm hover:shadow-[0_0_40px_rgba(57,255,20,0.4)] transition-all uppercase tracking-widest active:scale-95">
                Manual_v1.pdf
              </button>
            </div>
          </div>

          <div className="relative h-[450px] w-full bg-black/40 border border-white/10 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
             <HeroVisualizer />
             {/* Overlay для капельки "інформативності" */}
             <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-terminal uppercase tracking-widest">Live_Feed</span>
                  <div className="flex gap-2 text-[9px] text-gray-500 uppercase">
                    <span>Inbound: 1.2gb/s</span>
                    <span>Nodes: 84</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-[9px] text-gray-400 truncate font-mono">
                      <span className="text-terminal/50 mr-2">{">"}</span> {log}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS */}
      <div className="border-y border-white/5 bg-white/[0.02] py-6 overflow-hidden">
        <div className="max-w-6xl mx-auto flex justify-around items-center opacity-60">
           <div className="text-center">
              <div className="text-2xl font-black text-white">4.2M</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest">Leads_Indexed</div>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="text-center">
              <div className="text-2xl font-black text-terminal">99.8%</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest">Accuracy_Rate</div>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="text-center">
              <div className="text-2xl font-black text-white">$0.25</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest">Entry_Price</div>
           </div>
        </div>
      </div>

      <footer className="py-12 px-8 border-t border-white/5 text-gray-600 text-[10px] uppercase tracking-[0.3em] flex justify-between max-w-6xl mx-auto">
          <div>LeadHunter // OSINT Automated</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-terminal transition-colors">Privacy</a>
            <a href="#" className="hover:text-terminal transition-colors">Github</a>
          </div>
      </footer>
    </main>
  );
}