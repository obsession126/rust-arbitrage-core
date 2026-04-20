"use client";
import { useState, useEffect } from "react";

export default function OSINTPreloader({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const stageTimers = [
      setTimeout(() => setStage(1), 800),   // START: TARGET INITIALIZED
      setTimeout(() => setStage(2), 2000),  // OSINT: EXPANDING NODES
      setTimeout(() => setStage(3), 3500),  // LOGIC: CONNECTING LEADS
      setTimeout(() => setStage(4), 5000),  // VALIDATION: SUCCESS
      setTimeout(() => setFadeOut(true), 6000), // FADE OUT START
      setTimeout(() => onComplete(), 7000), // FINISH
    ];

    return () => stageTimers.forEach(clearTimeout);
  }, [onComplete]);

  // SVG для графа, який розширюється
  const GraphAnimation = () => (
    <svg width="400" height="400" viewBox="0 0 400 400" className="absolute opacity-40">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Центральна точка - Ціль */}
      <circle cx="200" cy="200" r="10" className="fill-terminal animate-pulse" filter="url(#glow)" />
      
      {/* Лінії, що розширюються (з'являються на Stage 2) */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = 200 + 150 * Math.cos(rad);
        const y2 = 200 + 150 * Math.sin(rad);
        return (
          <line 
            key={i} 
            x1="200" y1="200" x2={x2} y2={y2} 
            className={`stroke-terminal/40 stroke-1 transition-all duration-1000 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          />
        );
      })}

      {/* Зовнішні вузли (Stage 2) */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 200 + 150 * Math.cos(rad);
        const y = 200 + 150 * Math.sin(rad);
        return (
          <circle 
            key={i} 
            cx={x} cy={y} r="5" 
            className={`fill-black stroke-terminal stroke-1 transition-all duration-500 ${stage >= 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} 
            style={{ transitionDelay: `${800 + i * 150}ms` }}
          />
        );
      })}

      {/* Внутрішні зв'язки (Stage 3) */}
      {stage >= 3 && (
        <path 
          d="M200,200 L275,200 L325,250 M200,200 L125,125" 
          className="stroke-terminal stroke-2 opacity-80 animate-[dash_2s_ease-in-out_infinite]" 
          strokeDasharray="10 5" 
          fill="none" 
        />
      )}
    </svg>
  );

  const stagesData = [
    { code: "0x00", text: "INITIALIZING OSINT CORE..." },
    { code: "0x01", text: "TARGET: [SOLAR_ENERGY_USA] INIT..." },
    { code: "0x02", text: "DEEP SCAN: MAPPING DIGITAL FOOTPRINT..." },
    { code: "0x03", text: "APPLYING LEAD-OSINT LOGIC: CROSS-REFERENCING DATA..." },
    { code: "0x04", text: "VALIDATION COMPLETE: 12 HIGH-INTENT LEADS FOUND." },
  ];

  return (
    <div className={`fixed inset-0 bg-dark z-[100] flex flex-col items-center justify-center font-mono text-terminal transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      
      <div className="relative w-[400px] h-[400px] flex items-center justify-center mb-10">
        <GraphAnimation />
        
        {/* Центральний статус */}
        <div className="z-10 text-center bg-dark/80 px-4 py-2 backdrop-blur-sm">
          <div className="text-4xl font-black tracking-tighter animate-pulse">
            {stage === 4 ? "COMPLETE" : "SCANNING"}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            {stage === 4 ? "LEADS VALIDATED" : "OSINT ENGINE v1.0"}
          </div>
        </div>
      </div>

      {/* Термінальний лог знизу */}
      <div className="w-full max-w-xl px-10 space-y-2 border-t border-terminal/10 pt-8 mt-10">
        {stagesData.map((s, i) => (
          <div key={i} className={`flex gap-4 text-xs transition-opacity duration-500 ${stage >= i ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-gray-600">[{s.code}]</span>
            <span className={i === stage ? "text-white" : "text-terminal"}>{s.text}</span>
            {i === stage && i < 4 && <span className="animate-pulse">_</span>}
            {i < stage && <span className="text-terminal">✓</span>}
          </div>
        ))}
      </div>

      {/* Фоновий ефект радара */}
      <div className="absolute inset-0 z-[-1] opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(#39FF14_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>
    </div>
  );
}