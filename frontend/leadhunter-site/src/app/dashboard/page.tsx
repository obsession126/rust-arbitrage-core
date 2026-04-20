// src/app/dashboard/page.tsx
"use client";
import { useState } from "react";

export default function Dashboard() {
  const [filter, setFilter] = useState("all");

  // Імітація куплених лідів
  const purchasedLeads = [
    { id: 1, target: "green-energy.co", rank: "platinum", status: "extracted", date: "2026-04-15" },
    { id: 2, target: "solar-roofs.io", rank: "gold", status: "processing", date: "2026-04-16" },
  ];

  return (
    <main className="min-h-screen p-8 transition-colors duration-300 dark:bg-[#050505] bg-[#f9f9f9] dark:text-white text-black">
      <div className="max-w-6xl mx-auto mt-10">
        
        {/* Analytics Mini-Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Total Assets", val: "24", sub: "Validated Leads" },
            { label: "Net Value", val: "$2,840", sub: "Est. ROI: 12x" },
            { label: "Extraction Rate", val: "98%", sub: "Node Efficiency" }
          ].map((stat, i) => (
            <div key={i} className="border dark:border-white/5 border-black/10 p-6 bg-white/[0.01] backdrop-blur-md">
              <div className="text-[10px] uppercase text-gray-500 mb-2">{stat.label}</div>
              <div className="text-3xl font-black text-terminal">{stat.val}</div>
              <div className="text-[9px] text-gray-400 mt-1 uppercase italic">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Lead Terminal Table */}
        <div className="border dark:border-white/10 border-black/10 overflow-hidden">
          <div className="p-4 border-b dark:border-white/5 border-black/5 flex justify-between items-center bg-black/5">
            <span className="text-xs font-bold uppercase tracking-widest">Active Inventory</span>
            <div className="flex gap-4">
              <select className="bg-transparent text-[10px] uppercase outline-none cursor-pointer border border-white/10 px-2 py-1">
                <option>Rank: All</option>
                <option>Platinum</option>
                <option>Gold</option>
              </select>
            </div>
          </div>
          
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="dark:bg-white/5 bg-black/5 uppercase text-gray-500">
              <tr>
                <th className="p-4">Target Domain</th>
                <th className="p-4">Class</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-black/5">
              {purchasedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-terminal/5 transition-colors group">
                  <td className="p-4 font-bold">{lead.target}</td>
                  <td className="p-4 uppercase text-terminal">{lead.rank}</td>
                  <td className="p-4 italic text-gray-500">{lead.status}</td>
                  <td className="p-4">
                    <button className="text-terminal border border-terminal/20 px-3 py-1 hover:bg-terminal hover:text-black transition-all">
                      OPEN_REPORT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}