import React, { useEffect, useState } from 'react';
import { useBvmbinoStore } from './store/useBvmbinoStore';
import { LoginView } from './components/auth/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { MemoryPanel } from './components/layout/MemoryPanel';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  const { 
    vaultKey, 
    setVaultKey,
    currentSessionId,
    createNewSession
  } = useBvmbinoStore();

  const [isLoaded, setIsLoaded] = useState(false);

  // Re-hydrate session state on mount
  useEffect(() => {
    const savedKey = sessionStorage.getItem('v_key');
    if (savedKey) {
      setVaultKey(savedKey);
    }
    
    // Initial session check
    if (!currentSessionId) {
      createNewSession();
    }
    
    setIsLoaded(true);
  }, [setVaultKey, currentSessionId, createNewSession]);

  if (!isLoaded) return null;

  // If not authenticated, show login
  if (!vaultKey) {
    return (
      <>
        <LoginView />
        <Toaster />
      </>
    );
  }

  // Main Dashboard
  return (
    <div className="flex h-screen bg-obsidian-dark text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative min-w-0">
        <ChatArea />
      </main>

      <MemoryPanel />
      
      <Toaster />
    </div>
  );
};

export default App;
