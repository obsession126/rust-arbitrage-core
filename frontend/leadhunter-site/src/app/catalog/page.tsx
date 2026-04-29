"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// 1. Строга типізація замість any (Рівень Senior)
interface Stock {
  silver: number;
  gold: number;
  platinum: number;
}

interface CatalogItem {
  category: string;
  stock: Stock;
}

const RANKS = [
  { 
    id: "silver", 
    label: "SILVER_PROXIMITY", 
    color: "text-gray-400", 
    border: "border-gray-500/20", 
    price: 0.25,
    specs: ["30+ Days Aged", "General Contact", "Basic OSINT"]
  },
  { 
    id: "gold", 
    label: "GOLD_VALIDATED", 
    color: "text-yellow-500", 
    border: "border-yellow-500/30", 
    price: 0.5,
    specs: ["1+ Year Aged", "Direct Management", "Pixel Active"]
  },
  { 
    id: "platinum", 
    label: "PLATINUM_CORE", 
    color: "text-terminal", 
    border: "border-terminal/40", 
    price: 1.0,
    specs: ["High-Trust Domains", "C-Level / Founders", "Full Ad-Intelligence"]
  },
];

export default function Catalog() {
  const [dbData, setDbData] = useState<CatalogItem[]>([]);
  const [activeNiche, setActiveNiche] = useState("");
  const [selectedRank, setSelectedRank] = useState("platinum");
  const [amount, setAmount] = useState(1);
  const [stock, setStock] = useState<Stock>({ silver: 0, gold: 0, platinum: 0 });
  
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // Додано для красивого виводу помилок

  const maxAvailable = stock[selectedRank as keyof Stock] || 0;
  const currentRank = RANKS.find(r => r.id === selectedRank);
  const unitPrice = currentRank?.price || 0;
  const totalPrice = amount * unitPrice;

  useEffect(() => {
    async function fetchStock() {
      try {
        // Використовуємо прямий IP для надійності
        const res = await fetch('http://127.0.0.1:8080/api/leads/catalog');
        
        if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
        
        const data: CatalogItem[] = await res.json();
        setDbData(data);
        
        if (data && data.length > 0) {
          // Встановлюємо нішу ТІЛЬКИ якщо вона ще не вибрана
          const targetNiche = activeNiche || data[0].category;
          
          if (!activeNiche) {
            setActiveNiche(targetNiche);
          }

          const currentNicheData = data.find((item) => item.category === targetNiche);
          if (currentNicheData) {
            setStock(currentNicheData.stock);
          }
        }
        setErrorMsg(null);
      } catch (err) {
        console.error("TERMINAL_LINK_FAILURE:", err);
        setErrorMsg("DATABASE_CONNECTION_FAILED");
      } finally {
        setLoading(false); 
      }
    }
    fetchStock();
  }, []); 

  // Додаємо окремий ефект для зміни стоку при кліку на кнопки категорій
  useEffect(() => {
    const currentNicheData = dbData.find((item) => item.category === activeNiche);
    if (currentNicheData) {
      setStock(currentNicheData.stock);
    }
  }, [activeNiche, dbData]);

  const updateAmount = (val: number) => {
    // Жорсткий санітайзинг (не даємо ввести фігню руками)
    if (isNaN(val)) return;
    const sanitized = Math.max(maxAvailable > 0 ? 1 : 0, Math.min(val, maxAvailable));
    setAmount(sanitized);
  };

  const handleOrder = async () => {
    if (amount <= 0 || amount > maxAvailable) return;
    setErrorMsg(null);
    
    const token = localStorage.getItem("token");
    if (!token) {
      sessionStorage.setItem("pending_order", JSON.stringify({ activeNiche, selectedRank, amount }));
      window.location.href = "/login";
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          niche: activeNiche, 
          rank: selectedRank, 
          qty: amount 
        })
      });

      if (!res.ok) {
        // Ловимо 400/500 помилки від Rust
        const errText = await res.text();
        throw new Error(errText || "Backend validation failed");
      }

      const data = await res.json();
      
      if (data.checkout_url || data.url) { 
        window.location.href = data.checkout_url || data.url; 
      } else {
        throw new Error("NO_CHECKOUT_URL_PROVIDED");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message.includes("NETWORK") ? "NETWORK_ERROR" : "TRANSACTION_REJECTED_BY_NODE");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center font-mono text-terminal animate-pulse text-sm tracking-[0.3em]">
      &gt; INITIALIZING_MARKET_PROTOCOL...
    </div>
  );

  return (
    <main className="min-h-screen bg-[#080808] text-white font-mono p-4 md:p-12 selection:bg-terminal selection:text-black">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-terminal/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/5 pb-8">
          <div>
            <div className="flex gap-3 text-[10px] text-gray-500 uppercase mb-2 tracking-[0.2em] font-bold">
              <Link href="/" className="hover:text-terminal transition-colors">Nodes</Link>
              <span>/</span>
              <span className="text-white">Terminal_Market</span>
            </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter italic leading-none text-white">
              Data <span className="text-terminal">Extraction</span>
            </h1>
          </div>
          <div className="text-right mt-4 md:mt-0 font-bold">
            <div className="text-[10px] text-terminal uppercase mb-1">Status: Operational</div>
            <div className="text-xl text-white tracking-tighter underline decoration-terminal/30 underline-offset-8">v3.42_STABLE</div>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-8 p-4 border border-red-500/50 bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-4 animate-pulse">
            <span className="text-lg">!</span> SYSTEM_ERROR: {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-10">
            <div>
              <h2 className="text-xs text-gray-400 uppercase mb-4 tracking-[0.3em] flex items-center gap-2 font-bold">
                <span className="w-2 h-2 bg-terminal rounded-full" /> 01. Select_Category
              </h2>
              <div className="flex flex-wrap gap-2">
                {dbData.map((item) => (
                  <button
                    key={item.category}
                    onClick={() => setActiveNiche(item.category)}
                    className={`px-6 py-3 text-xs uppercase font-black border transition-all ${
                      activeNiche === item.category 
                        ? "border-terminal text-terminal bg-terminal/10" 
                        : "border-white/5 text-gray-600 hover:border-white/20 hover:text-gray-300"
                    }`}
                  >
                    {item.category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs text-gray-400 uppercase mb-4 tracking-[0.3em] flex items-center gap-2 font-bold">
                <span className="w-2 h-2 bg-terminal rounded-full shadow-[0_0_8px_#39FF14]" /> 02. Select_Tier
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RANKS.map((rank) => (
                  <div
                    key={rank.id}
                    onClick={() => setSelectedRank(rank.id)}
                    className={`p-6 border cursor-pointer transition-all relative group h-full flex flex-col justify-between ${
                      selectedRank === rank.id 
                        ? rank.border + " bg-white/[0.04] ring-1 ring-inset " + rank.border
                        : "border-white/5 opacity-40 hover:opacity-100 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className={`text-xl font-black uppercase italic ${rank.color}`}>{rank.id}</h3>
                        <div className="text-[10px] font-bold text-white/50">${rank.price.toFixed(2)}</div>
                      </div>
                      <div className="space-y-2 mb-6">
                        {rank.specs.map((s, i) => (
                          <div key={i} className="text-[9px] text-gray-400 border-l border-terminal/30 pl-2 uppercase font-bold tracking-wider">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                      <span className="text-[10px] text-gray-600 uppercase">Stock:</span>
                      <span className={`text-sm font-black ${stock[rank.id as keyof Stock] === 0 ? 'text-red-500' : 'text-white'}`}>
                        {stock[rank.id as keyof Stock] || 0}
                      </span>
                    </div>
                    {selectedRank === rank.id && (
                       <div className="absolute top-0 right-0 p-1">
                         <div className="w-1.5 h-1.5 bg-terminal shadow-[0_0_10px_#39FF14]" />
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-5 border border-white/5 bg-white/[0.01] flex items-center gap-4">
                <span className="text-terminal text-lg font-black italic">!</span>
                <p className="text-[10px] text-gray-500 uppercase leading-relaxed font-bold">
                  <span className="text-white">Single_Owner_Policy:</span> Leads are sold strictly to 1 operator to prevent burn-out.
                </p>
              </div>
              <div className="p-5 border border-white/5 bg-white/[0.01] flex items-center gap-4">
                <span className="text-terminal text-lg font-black italic">#</span>
                <p className="text-[10px] text-gray-500 uppercase leading-relaxed font-bold">
                  <span className="text-white">Instant_Delivery:</span> Data clusters are released as encrypted CSV/JSON via Dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#0D0D0D] border border-white/10 p-8 sticky top-8 shadow-2xl ring-1 ring-terminal/10">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <h4 className="text-sm font-black uppercase text-white tracking-widest italic">Order_Finalize</h4>
                <span className="text-[10px] text-terminal font-bold animate-pulse tracking-widest">[ READY ]</span>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-3 font-bold">
                    <span>Batch_Size</span>
                    <span className="text-white">{maxAvailable} available</span>
                  </div>
                  <div className="flex items-center bg-black border border-white/10 group-focus-within:border-terminal transition-all">
                    <button 
                      onClick={() => updateAmount(amount - 1)}
                      disabled={isProcessing || amount <= 1}
                      className="w-16 h-16 text-2xl hover:bg-terminal hover:text-black transition-all font-black border-r border-white/10 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                    >-</button>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => updateAmount(Number(e.target.value))}
                      disabled={isProcessing}
                      className="bg-transparent w-full text-center text-xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                    />
                    <button 
                      onClick={() => updateAmount(amount + 1)}
                      disabled={isProcessing || amount >= maxAvailable}
                      className="w-16 h-16 text-2xl hover:bg-terminal hover:text-black transition-all font-black border-l border-white/10 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                    >+</button>
                  </div>
                </div>

                <div className="bg-white/5 p-6 space-y-4 border-l-2 border-terminal">
                  <div className="flex justify-between text-[11px] uppercase font-bold tracking-tighter">
                    <span className="text-gray-500 italic">Target:</span>
                    <span className="text-white">{activeNiche || "NONE"}</span>
                  </div>
                  <div className="flex justify-between text-[11px] uppercase font-bold tracking-tighter">
                    <span className="text-gray-500 italic">Class:</span>
                    <span className={`${currentRank?.color}`}>{selectedRank}</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-xs text-gray-400 font-bold uppercase">Total_Invoice</span>
                    <span className="text-4xl font-black text-terminal shadow-terminal shadow-[0_0_20px_rgba(57,255,20,0.15)] tracking-tighter">
                      ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleOrder}
                  disabled={amount <= 0 || maxAvailable === 0 || isProcessing}
                  className="w-full bg-terminal text-black font-black py-6 text-sm uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:scale-100 flex justify-center items-center gap-2"
                >
                  {isProcessing && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  {isProcessing ? "GENERATING_LINK..." : maxAvailable === 0 ? "Out_Of_Stock" : "Execute_Purchase"}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-3 text-[9px] text-gray-600 uppercase font-bold">
                   <div className="w-1 h-1 bg-terminal" /> Encrypted Transaction Node
                </div>
                <div className="flex items-center gap-3 text-[9px] text-gray-600 uppercase font-bold">
                   <div className="w-1 h-1 bg-terminal" /> OSINT Validation Active
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-20 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between text-[10px] text-gray-600 uppercase tracking-[0.2em] italic font-bold">
          <div className="flex gap-8 items-center">
            <span className="text-terminal">System_Status: Optimal</span>
            <span>Uptime: 2,401:12:08</span>
          </div>
          <div className="mt-4 md:mt-0">
            &copy; 2026 LeadHunter_Terminal. Confidential_Data_Access.
          </div>
        </footer>
      </div>
    </main>
  );
}