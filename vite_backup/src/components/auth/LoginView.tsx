import React, { useState } from 'react';
import { useBvmbinoStore } from '../../store/useBvmbinoStore';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setVaultKey = useBvmbinoStore(state => state.setVaultKey);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Enter your credentials');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        // As per original logic: set v_key in sessionStorage and proceed
        sessionStorage.setItem('v_key', `${username}:${password}`);
        setVaultKey(`${username}:${password}`);
        // Redirect logic is handled by the parent App component re-rendering
      } else {
        setError('Access denied — invalid credentials');
      }
    } catch (err) {
      setError('Connection error — try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian-dark overflow-hidden font-head selection:bg-gold-500/30">
      <div className="w-full max-w-[340px] px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="text-6xl mb-6 block animate-float filter drop-shadow-[0_8px_24px_rgba(232,169,18,0.3)]">
          🤖
        </span>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-[4px] font-head uppercase text-gold-gradient">
            BVMBINO
          </h1>
          <span className="bg-gold-500/10 text-primary border border-primary/40 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
            PRO
          </span>
        </div>
        
        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-[2.5px] mb-10">
          Auteur Strategic Admin · v Elite
        </div>

        <form onSubmit={handleLogin} className="space-y-2.5">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3.5 bg-obsidian-elevated border border-primary/10 rounded-xl text-foreground text-sm focus:border-primary/40 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-muted-foreground/30"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 bg-obsidian-elevated border border-primary/10 rounded-xl text-foreground text-sm focus:border-primary/40 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-muted-foreground/30"
          />
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1.5 py-3.5 bg-gradient-to-br from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 active:scale-[0.98] disabled:opacity-50 text-obsidian-dark font-bold text-sm tracking-wide rounded-xl shadow-[0_4px_20px_rgba(232,169,18,0.15)] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-obsidian-dark rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-obsidian-dark rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-obsidian-dark rounded-full animate-bounce"></div>
              </div>
            ) : (
              'ENTER →'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 min-h-[1.5rem] text-[11px] font-mono text-destructive tracking-[0.3px] animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
