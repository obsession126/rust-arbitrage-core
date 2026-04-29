"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuth(!!token);
  }, [pathname]);

  const handleLogout = () => {
    const confirmed = window.confirm("ATTENTION: Terminate secure session?");
    if (confirmed) {
      localStorage.removeItem("token");
      setIsAuth(false);
      router.push("/");
    }
  };

  return (
    <nav className="border-b border-white/5 p-4 px-4 md:px-8 flex justify-between items-center bg-black/50 backdrop-blur-xl sticky top-0 z-50 font-mono">
      {/* Лого - завжди зліва */}
      <Link href="/" className="flex items-center gap-2 group shrink-0">
        <div className="w-2 h-2 bg-terminal rounded-full shadow-[0_0_10px_#39FF14] group-hover:scale-125 transition-transform"></div>
        <span className="hidden sm:inline font-bold tracking-tighter text-white uppercase italic text-sm md:text-base">LeadHunter</span>
      </Link>
      
      {/* Контейнер кнопок - тепер адаптивний */}
      <div className="flex gap-3 md:gap-8 text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest items-center">
        
        <Link 
          href="/catalog" 
          className={`hover:text-terminal transition-all font-bold ${pathname === '/catalog' ? 'text-terminal' : ''}`}
        >
          {/* На зовсім малих екранах можна лишити тільки текст, на великих - повну назву */}
          Catalog
        </Link>

        {isAuth && (
          <Link 
            href="/dashboard" 
            className={`hover:text-terminal transition-all font-bold ${pathname === '/dashboard' ? 'text-terminal' : ''}`}
          >
            <span className="hidden xs:inline">Access_</span>Hub
          </Link>
        )}
        
        {isAuth ? (
          <button 
            onClick={handleLogout}
            className="text-red-500 border border-red-500/20 px-2 md:px-4 py-1.5 hover:bg-red-500/10 transition-all font-bold tracking-tighter text-[8px] md:text-[10px]"
          >
            [ <span className="hidden sm:inline">TERMINATE</span> EXIT ]
          </button>
        ) : (
          <Link 
            href="/login" 
            className="text-terminal border border-terminal/20 px-3 md:px-6 py-1.5 hover:bg-terminal/10 transition-all font-bold shadow-[0_0_15px_rgba(57,255,20,0.1)] text-[8px] md:text-[10px]"
          >
            AUTH<span className="hidden sm:inline">ORIZE</span>
          </Link>
        )}
      </div>
    </nav>
  );
}