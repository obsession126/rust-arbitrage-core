"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  const BACKEND_URL = "http://127.0.0.1:8080";
  const GOOGLE_CLIENT_ID = "ТВІЙ_ID_ТУТ.apps.googleusercontent.com";


  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem("token", token);
    const pending = sessionStorage.getItem("pending_order");
    if (pending) {
      router.push("/catalog");
    } else {
      router.push("/dashboard");
    }
  };


  const handleGoogleCallback = async (response: any) => {
    try {
      console.log("Encoded JWT ID token:", response.credential);

      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: response.credential 
        })
      });

      const data = await res.json();
      if (res.ok) {
        handleAuthSuccess(data.token);
      } else {
        alert(data.message || "Google Auth failed on backend");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Could not connect to backend server");
    }
  };

  // 3. Функція виклику вікна Google
  const launchGoogleAuth = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.prompt(); // Викликає спливаюче вікно
    } else {
      alert("Google script not loaded yet. Please wait a second.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: email.split('@')[0] })
      });
      
      const data = await res.json();
      if (res.ok) {
        handleAuthSuccess(data.token);
      } else {
        alert(data.message || "Auth failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-mono flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-white/10 bg-black/40 p-8 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase italic mb-8 border-l-4 border-terminal pl-4">
          {isRegister ? "Establish_Identity" : "Authorize_Access"}
        </h1>

        {/* Кнопка Google */}
        <button 
          type="button"
          onClick={launchGoogleAuth}
          className="w-full border border-white/20 py-4 mb-6 hover:bg-white/5 transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
        >
          <img src="/google-icon.svg" className="w-4 h-4" alt="" />
          Continue with Google
        </button>

        <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[9px] text-gray-600 uppercase">OR_USE_EMAIL</span>
            <div className="flex-grow border-t border-white/5"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input 
            type="email" placeholder="EMAIL_ADDRESS" 
            className="w-full bg-white/5 border border-white/10 p-4 text-xs focus:border-terminal outline-none"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="PASSWORD_HASH" 
            className="w-full bg-white/5 border border-white/10 p-4 text-xs focus:border-terminal outline-none"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-terminal text-white-500 font-black py-4 uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all">
            {isRegister ? "Create_Account" : "Execute_Login"}
          </button>
        </form>

        <p className="mt-6 text-[9px] text-gray-500 uppercase text-center cursor-pointer hover:text-white" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have access? Login" : "No credentials? Register"}
        </p>
      </div>
    </main>
  );
}

// Додаємо типізацію для window.google, щоб TypeScript не сварився
declare global {
  interface Window {
    google: any;
  }
}