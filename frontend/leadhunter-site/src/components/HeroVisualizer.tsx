"use client";
import { useState, useEffect } from "react";

const nodes = [
  { id: 1, label: "target_v01.com", type: "root", x: 200, y: 200 },
  { id: 2, label: "MX_RECORDS_CHECK", type: "scan", x: 100, y: 100, delay: 1000 },
  { id: 3, label: "FB_AD_LIBRARY", type: "scan", x: 300, y: 100, delay: 2000 },
  { id: 4, label: "LXP_DOMAIN_AUTH", type: "scan", x: 100, y: 300, delay: 3000 },
  { id: 5, label: "CRITICAL_ERROR", type: "pain", x: 300, y: 300, detail: "-$1,050/mo Waste", delay: 4500 },
  { id: 6, label: "HIGH_INTENT_LEAD", type: "lead", x: 350, y: 200, delay: 5500 },
];

export default function HeroVisualizer() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Запускаємо анімацію появи вузлів
    const timers = nodes.map((node) => {
      return setTimeout(() => {
        setActiveNodes((prev) => [...prev, node.id]);
      }, node.delay || 0);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Захист від Hydration Error
  if (!mounted) return <div className="w-full h-[500px] bg-black/40 rounded-xl" />;

  return (
    <div className="relative w-full h-[500px] bg-black/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm group">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#39FF14_1px,transparent_1px)] [background-size:20px_20px]"></div>
      
      <svg className="absolute inset-0 w-full h-full">
        {activeNodes.map((id) => {
          const node = nodes.find(n => n.id === id);
          if (!node || node.type === 'root') return null;
          return (
            <line
              key={`line-${id}`}
              x1="50%" y1="50%" 
              x2={`calc(50% + ${node.x - 200}px)`} 
              y2={`calc(50% + ${node.y - 200}px)`}
              className="stroke-terminal/20 stroke-1 animate-dash"
              strokeDasharray="5,5"
            />
          );
        })}
      </svg>

      <div className="relative w-full h-full flex items-center justify-center">
        {nodes.map((node) => {
          const isActive = activeNodes.includes(node.id);
          return (
            <div
              key={node.id}
              className={`absolute p-2 border transition-all duration-700 transform 
                ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                ${node.type === 'root' ? 'border-terminal bg-terminal/10 z-20 shadow-[0_0_20px_#39FF14]' : 
                  node.type === 'pain' ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                  node.type === 'lead' ? 'border-blue-400 bg-blue-400/10' : 'border-white/20 bg-black'}
              `}
              style={{ 
                left: `calc(50% + ${node.x - 200}px)`, 
                top: `calc(50% + ${node.y - 200}px)` 
              }}
            >
              <div className="flex flex-col min-w-[100px]">
                <span className={`text-[9px] uppercase tracking-tighter ${node.type === 'pain' ? 'text-red-400' : 'text-gray-500'}`}>
                  {node.type}
                </span>
                <span className="text-[11px] font-bold truncate">
                  {node.label}
                </span>
                {node.detail && (
                  <span className="text-[10px] text-red-500 animate-pulse font-black mt-1">
                    {node.detail}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute top-4 left-4 border-l border-terminal/30 pl-3">
        <div className="text-[10px] text-terminal/60 uppercase tracking-widest">Live OSINT Stream</div>
        <div className="text-[9px] text-gray-600 uppercase">Threads: 128 Active</div>
      </div>
    </div>
  );
}