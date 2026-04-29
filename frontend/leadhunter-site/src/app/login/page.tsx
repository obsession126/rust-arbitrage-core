"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const BACKEND_URL = "http://127.0.0.1:8080";
  const GOOGLE_CLIENT_ID = "ТВІЙ_ID_ТУТ.apps.googleusercontent.com";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem("token", token);
    const pending = sessionStorage.getItem("pending_order");
    router.push(pending ? "/catalog" : "/dashboard");
  };

  const launchGoogleAuth = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          setLoading(true);
          try {
            const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: response.credential })
            });
            const data = await res.json();
            if (res.ok) handleAuthSuccess(data.token);
            else alert(data.message || "GOOGLE_AUTH_REVOKED");
          } catch (err) {
            alert("NODE_CONNECTION_ERROR");
          } finally { setLoading(false); }
        },
      });
      window.google.accounts.id.prompt();
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          name: email.split('@')[0] 
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        handleAuthSuccess(data.token);
      } else {
        const errorText = await res.text();
        alert(errorText || "ACCESS_DENIED");
      }
    } catch (err) {
      alert("DATABASE_OFFLINE");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white font-mono flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-terminal/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      <div className="w-full max-w-[500px] z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">
            Terminal <span className="text-terminal">Auth</span>
          </h1>
          <p className="text-[10px] text-gray-500 tracking-[0.4em] uppercase font-bold">
            {isRegister ? "[ Creating_New_Node ]" : "[ Requesting_Access_Protocol ]"}
          </p>
        </div>

        <div className="bg-[#0D0D0D] border border-white/10 p-10 shadow-2xl relative">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-terminal" />
          <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-terminal" />

          <div className="space-y-6">
          

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 uppercase ml-1 font-bold">Email_Node</label>
                <input 
                  type="email" 
                  placeholder="name@domain.com" 
                  required
                  className="w-full bg-black border border-white/10 p-5 text-sm font-bold focus:border-terminal outline-none transition-colors placeholder:text-gray-800"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 uppercase ml-1 font-bold">Security_Hash</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  className="w-full bg-black border border-white/10 p-5 text-sm font-bold focus:border-terminal outline-none transition-colors placeholder:text-gray-800"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-terminal text-gray font-black py-5 text-sm uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "PROCESSING..." : isRegister ? "Initialize_Account" : "Execute_Login"}
              </button>
            </form>

            <div className="pt-4 text-center">
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="text-[10px] text-gray-500 uppercase tracking-widest hover:text-terminal transition-colors font-bold"
              >
                {isRegister ? "> Already_In_System? Log_In" : "> No_Access_Key? Register_Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-8 flex justify-between items-center opacity-30 px-2">
          <div className="flex gap-4">
            <div className="text-[8px] uppercase font-bold tracking-tighter text-gray-400">SSL_ENCRYPTION_ACTIVE</div>
            <div className="text-[8px] uppercase font-bold tracking-tighter text-gray-400">AES_256_BIT</div>
          </div>
          <div className="text-[8px] uppercase font-bold tracking-tighter text-terminal">Node_Ready</div>
        </div>
      </div>
    </main>
  );
}

declare global {
  interface Window {
    google: any;
  }
}