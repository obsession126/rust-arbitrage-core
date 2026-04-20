"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const RANKS = [
  { id: "silver", label: "Silver", color: "text-gray-400", border: "border-gray-500/30", price: 0.25, desc: "Standard scraping, basic contact data." },
  { id: "gold", label: "Gold", color: "text-yellow-500", border: "border-yellow-500/30", price: 0.5, desc: "Verified emails + LinkedIn profiles." },
  { id: "platinum", label: "Platinum", color: "text-terminal", border: "border-terminal/40", price: 1.0, desc: "High-intent leads with direct phone numbers." },
];

export default function Catalog() {
  const [dbData, setDbData] = useState<any[]>([]);
  const [activeNiche, setActiveNiche] = useState("");
  const [selectedRank, setSelectedRank] = useState("platinum");
  const [amount, setAmount] = useState(10);
  const [stock, setStock] = useState({ silver: 0, gold: 0, platinum: 0 });
  const [loading, setLoading] = useState(true);

  // Визначаємо максимум для обраного рангу
  const maxAvailable = stock[selectedRank as keyof typeof stock] || 0;

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch('/api/leads/catalog');
        const data = await res.json();
        setDbData(data);
        if (data.length > 0) {
          const currentCategory = activeNiche || data[0].category;
          if (!activeNiche) setActiveNiche(currentCategory);
          const currentNicheData = data.find((item: any) => item.category === currentCategory);
          if (currentNicheData) {
            const total = currentNicheData.available_count;
            setStock({
              silver: Math.floor(total * 0.5),
              gold: Math.floor(total * 0.3),
              platinum: Math.floor(total * 0.2),
            });
          }
        }
      } catch (err) {
        setStock({ silver: 240, gold: 112, platinum: 45 }); // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchStock();
  }, [activeNiche]);

  // Валідація кількості при зміні рангу або стоку
  useEffect(() => {
    if (amount > maxAvailable && maxAvailable > 0) {
      setAmount(maxAvailable);
    } else if (maxAvailable === 0 && !loading) {
      setAmount(0);
    } else if (amount === 0 && maxAvailable > 0) {
      setAmount(1);
    }
  }, [selectedRank, maxAvailable, loading]);

  const updateAmount = (val: number) => {
    const sanitized = Math.max(maxAvailable > 0 ? 1 : 0, Math.min(val, maxAvailable));
    setAmount(sanitized);
  };

  const currentRank = RANKS.find(r => r.id === selectedRank);
  const unitPrice = currentRank?.price || 0;
  const totalPrice = amount * unitPrice;

  // У твоєму Catalog.tsx зміні функцію handleOrder:
  const handleOrder = async () => {
    if (amount <= 0 || amount > maxAvailable) return;

    const token = localStorage.getItem("token");

    if (!token) {
      // Зберігаємо вибір користувача
      const pendingOrder = { activeNiche, selectedRank, amount, totalPrice };
      sessionStorage.setItem("pending_order", JSON.stringify(pendingOrder));
      
      // Редірект на логін
      window.location.href = "/login";
      return;
    }


    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Додаємо JWT токен
        },
        body: JSON.stringify({
          niche: activeNiche,
          rank: selectedRank,
          qty: amount,
        })
      });
      
      const data = await res.json();
      if (data.url) {

        sessionStorage.removeItem("pending_order");
        window.location.href = data.url; 
      }
    } catch (e) {
      alert("CRITICAL: PAYMENT_GATEWAY_OFFLINE");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center font-mono text-terminal animate-pulse uppercase text-xs tracking-[0.5em]">
      [ Accessing_Database_Cluster... ]
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0C0C0C] text-white font-mono p-8 selection:bg-terminal selection:text-black relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-terminal/5 blur-[100px] rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex justify-between items-start mb-16">
          <div className="border-l-4 border-terminal pl-8">
            <div className="flex gap-2 text-[9px] text-gray-600 uppercase mb-4 tracking-[0.2em]">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-gray-400 font-bold underline underline-offset-4">Terminal_Catalog</span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Market / Leads</h1>
            <p className="text-gray-500 text-[10px] mt-4 uppercase tracking-[0.3em]">Querying nodes for: <span className="text-terminal">USA_REGION_DATA</span></p>
          </div>
          <div className="text-right hidden md:block border border-white/5 bg-white/[0.02] p-4 rounded-sm">
            <div className="text-[9px] text-gray-600 uppercase mb-1">Session_ID</div>
            <div className="text-xs text-white uppercase tracking-widest font-bold">LH-v3-{Math.floor(Math.random() * 99999)}</div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-[10px] text-gray-500 uppercase mb-4 tracking-[0.4em] font-bold">01. Select_Target_Niche</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {dbData.map((item) => (
              <button
                key={item.category}
                onClick={() => setActiveNiche(item.category)}
                className={`px-8 py-4 text-[11px] uppercase font-black border transition-all shrink-0 ${
                  activeNiche === item.category ? "border-terminal text-terminal bg-terminal/10 shadow-[0_0_20px_rgba(57,255,20,0.1)]" : "border-white/5 text-gray-600 hover:border-white/20"
                }`}
              >
                {item.category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-[10px] text-gray-500 uppercase mb-4 tracking-[0.4em] font-bold">02. Select_Tier</h2>
            <div className="space-y-6">
              {RANKS.map((rank) => (
                <div
                  key={rank.id}
                  onClick={() => setSelectedRank(rank.id)}
                  className={`p-8 border cursor-pointer transition-all relative group bg-[#111111] ${
                    selectedRank === rank.id ? rank.border + " border-l-8 bg-white/[0.03]" : "border-white/5 opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h3 className={`text-2xl font-black uppercase mb-1 ${rank.color}`}>{rank.label}</h3>
                      <p className="text-gray-500 text-[10px] uppercase max-w-sm leading-relaxed">{rank.desc}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-gray-600 uppercase mb-1 font-bold tracking-widest">Availability</div>
                      <div className={`font-black text-2xl italic ${stock[rank.id as keyof typeof stock] === 0 ? 'text-red-500' : 'text-white'}`}>
                        {stock[rank.id as keyof typeof stock] || 0}
                      </div>
                      <div className="text-[9px] text-terminal mt-1 font-bold">${rank.price.toFixed(2)} / unit</div>
                    </div>
                  </div>
                  {selectedRank === rank.id && (
                    <div className="absolute inset-0 bg-terminal/5 pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <h2 className="text-[10px] text-gray-500 uppercase mb-4 tracking-[0.4em] font-bold">03. Deployment</h2>
            <div className="bg-[#0A0A0A] border-t-4 border-terminal p-8 sticky top-24 shadow-2xl shadow-black/80 ring-1 ring-white/10">
              <h4 className="text-xs text-white font-black uppercase tracking-[0.1em] mb-8 flex justify-between">
                <span>Deployment_Summary</span>
                <span className="text-terminal">V3.4</span>
              </h4>

              <div className="mb-8">
                <label className="text-[10px] text-gray-500 uppercase mb-4 block font-black flex justify-between">
                  <span>Quantity_Input</span>
                  {maxAvailable === 0 && <span className="text-red-500 font-bold">[OUT_OF_STOCK]</span>}
                </label>
                <div className={`flex items-center gap-1 bg-black p-1 border ${maxAvailable === 0 ? 'border-red-500/50' : 'border-white/10'}`}>
                  <button
                    onClick={() => updateAmount(amount - 1)}
                    disabled={amount <= 1 || maxAvailable === 0}
                    className="w-12 h-12 bg-white/5 hover:bg-terminal hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all font-black text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => updateAmount(Number(e.target.value))}
                    className="bg-transparent w-full text-center font-black focus:outline-none text-white text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => updateAmount(amount + 1)}
                    disabled={amount >= maxAvailable || maxAvailable === 0}
                    className="w-12 h-12 bg-white/5 hover:bg-terminal hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all font-black text-lg"
                  >
                    +
                  </button>
                </div>
                {maxAvailable > 0 && (
                   <p className="text-[8px] text-gray-600 mt-2 uppercase italic text-right">Max_Limit: {maxAvailable} units</p>
                )}
              </div>

              <div className="space-y-5 mb-10 border-y border-white/5 py-8">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
                  <span className="text-gray-600">Niche_ID</span>
                  <span className="text-white underline decoration-terminal">{activeNiche || "NULL"}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
                  <span className="text-gray-600">Tier_Class</span>
                  <span className={`px-2 py-0.5 border ${currentRank?.border} ${currentRank?.color}`}>{selectedRank}</span>
                </div>
                <div className="flex justify-between text-2xl font-black uppercase pt-4">
                  <span className="text-white italic tracking-[-0.1em]">Total_Bill</span>
                  <span className="text-terminal shadow-glow-small">${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                disabled={amount <= 0 || maxAvailable === 0}
                className="w-full bg-terminal text-white font-white py-6 text-[12px] uppercase tracking-[0.3em] hover:brightness-110 active:scale-[0.97] transition-all shadow-[0_0_30px_rgba(57,255,20,0.25)] disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {maxAvailable === 0 ? "Insufficient_Stock" : "Execute_Purchase"}
              </button>

              <div className="mt-6 flex flex-col gap-2 opacity-50">
                <div className="flex items-center gap-2 text-[8px] uppercase text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-terminal" /> End-to-end OSINT validation active
                </div>
                <div className="flex items-center gap-2 text-[8px] uppercase text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-terminal" /> Delivery via encrypted .CSV
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 border-t border-white/5 pt-8 text-[10px] text-gray-700 uppercase tracking-[0.4em] flex justify-between items-center italic">
          <div className="flex gap-8 items-center">
            <span className="text-terminal font-black animate-pulse tracking-widest underline">Nodes_Status: Optimal</span>
            <span>Uptime_Counter: 1042:43:01</span>
          </div>
          <span>Ref: {activeNiche || "system"}_SEC_LOGS</span>
        </div>
      </div>
    </main>
  );
}