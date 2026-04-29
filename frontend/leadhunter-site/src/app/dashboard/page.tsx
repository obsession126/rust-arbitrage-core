"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  target_name: string;
  target_url: string;
  category: string;
  rank: string;
  status: string | null;
  created_at: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export default function Dashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterRank, setFilterRank] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchLeads = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard`, { 
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (res.ok) {
          const data = await res.json();
          setLeads(data);
        } else {
          console.error("Access denied or server error");
          if (res.status === 401) router.push("/login");
        }
      } catch (err) {
        console.error("Connection failed");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [router]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.target_name.toLowerCase().includes(search.toLowerCase()) || 
                          lead.target_url.toLowerCase().includes(search.toLowerCase());
    const matchesRank = filterRank === "all" || lead.rank.toLowerCase() === filterRank.toLowerCase();
    const matchesCategory = filterCategory === "all" || lead.category === filterCategory;
    return matchesSearch && matchesRank && matchesCategory;
  });

  const exportToTxt = () => {
    const content = filteredLeads.map(l => 
      `TARGET: ${l.target_name} | URL: ${l.target_url} | RANK: ${l.rank.toUpperCase()} | CAT: ${l.category} | STATUS: ${l.status || 'UNKNOWN'}`
    ).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-terminal animate-pulse uppercase tracking-widest text-sm">
      [ SYNCING_WITH_DATABASE... ]
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white font-mono p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">
              Access_<span className="text-terminal drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">Hub</span>
            </h1>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Authenticated Session / Secure Connection</p>
          </div>
          
          {leads.length > 0 && (
            <button 
              onClick={exportToTxt}
              className="bg-terminal text-black px-6 py-2 text-[10px] font-black uppercase hover:bg-white transition-all shadow-[0_0_10px_rgba(57,255,20,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            >
              Export_Filtered.txt
            </button>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="border border-white/5 p-20 text-center bg-[#080808]">
            <h2 className="text-xl font-bold uppercase mb-4 text-gray-500">No_Active_Leads_Detected</h2>
            <Link href="/catalog" className="inline-block bg-white text-black px-8 py-3 font-black uppercase text-xs hover:bg-terminal transition-all shadow-md">
              Initialize_First_Purchase
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input 
                type="text" 
                placeholder="SEARCH_TARGET..."
                className="bg-[#0D0D0D] border border-white/10 p-4 text-[10px] outline-none focus:border-terminal uppercase text-white transition-colors placeholder:text-gray-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              
              <select 
                className="bg-[#0D0D0D] border border-white/10 p-4 text-[10px] outline-none focus:border-terminal uppercase cursor-pointer text-white appearance-none transition-colors"
                value={filterRank}
                onChange={(e) => setFilterRank(e.target.value)}
              >
                <option value="all" className="bg-[#0D0D0D] text-white">Rank: All_Levels</option>
                <option value="platinum" className="bg-[#0D0D0D] text-white">Platinum</option>
                <option value="gold" className="bg-[#0D0D0D] text-white">Gold</option>
                <option value="silver" className="bg-[#0D0D0D] text-white">Silver</option>
                <option value="local_star" className="bg-[#0D0D0D] text-white">Local_Star</option>
              </select>

              <select 
                className="bg-[#0D0D0D] border border-white/10 p-4 text-[10px] outline-none focus:border-terminal uppercase cursor-pointer text-white appearance-none transition-colors"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all" className="bg-[#0D0D0D] text-white">Category: All_Niches</option>
                {Array.from(new Set(leads.map(l => l.category))).map(cat => (
                  <option key={cat} value={cat} className="bg-[#0D0D0D] text-white">{cat}</option>
                ))}
              </select>
            </div>

            <div className="bg-[#0D0D0D] border border-white/10 overflow-x-auto shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] uppercase text-gray-500 tracking-widest border-b border-white/10">
                    <th className="p-5 font-bold">Target_Identity</th>
                    <th className="p-5 font-bold">Niche</th>
                    <th className="p-5 font-bold">Rank & Status</th>
                    <th className="p-5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-terminal/5 transition-all group">
                      <td className="p-5">
                        <div className="font-black text-sm uppercase group-hover:text-terminal transition-colors">{lead.target_name}</div>
                        <a href={lead.target_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-gray-600 lowercase hover:text-white transition-colors">{lead.target_url}</a>
                      </td>
                      <td className="p-5 uppercase text-[10px] text-gray-400 font-bold">[{lead.category}]</td>
                      <td className="p-5">
                        <div className={`font-black text-[10px] uppercase ${
                          lead.rank.toLowerCase() === 'platinum' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 
                          lead.rank.toLowerCase() === 'gold' ? 'text-yellow-500' : 
                          'text-white'
                        }`}>
                          {lead.rank}
                        </div>
                        <div className="text-[8px] text-gray-600 uppercase mt-1">
                          {lead.status === "completed" ? <span className="text-terminal">OSINT_DONE</span> : lead.status || "PROCESSING"}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <Link 
                          href={`/dashboard/leads/${lead.id}`}
                          className="inline-block bg-white/5 border border-white/10 p-2 hover:border-terminal hover:bg-terminal/10 hover:text-terminal transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}