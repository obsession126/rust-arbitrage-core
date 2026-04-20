"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/5 p-4 px-8 flex justify-between items-center bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-2 h-2 bg-terminal rounded-full shadow-[0_0_10px_#39FF14] group-hover:scale-125 transition-transform"></div>
        <span className="font-bold tracking-tighter text-white uppercase">LeadHunter</span>
      </Link>
      
      <div className="hidden md:flex gap-6 text-[10px] text-gray-500 uppercase tracking-widest items-center">
        <Link 
          href="/catalog" 
          className={`hover:text-terminal transition-all ${pathname === '/catalog' ? 'text-terminal' : ''}`}
        >
          Catalog
        </Link>
        <a href="#pricing" className="hover:text-terminal transition-all">Pricing</a>
        
        <a href="/login" className="text-terminal border border-terminal/20 px-4 py-1 hover:bg-terminal/10 transition-all ml-4 inline-block">
          Login
        </a>
      </div>
    </nav>
  );
}