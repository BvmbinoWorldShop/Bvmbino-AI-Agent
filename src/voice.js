/**
 * voice.js - Billy Live Voice Interface (SpeechRecognition & TTS)
 */

import { state, toast } from './core.js';
import { appendAiText, addUserMsg } from './render.js';

export const BillyLive = (() => {
  let active = false;
  let speaking = false;
  let recognition = null;
  let currentLang = 'en-US';

  const getSynth = () => window.speechSynthesis;
  
  const ui = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  async function think(text) {
    if (!text) return;
    ui('voice-status', 'THINKING…');
    const pulse = document.getElementById('voice-pulse-wrap');
    if (pulse) { pulse.classList.remove('v-listening'); pulse.classList.remove('v-speaking'); }
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: state.model,
          messages: [{ role: 'user', content: text }],
          system: "You are Billy speaking via voice. Be brief, powerful, and decisive."
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "AI channels offline.";
      
      ui('voice-billy-reply', reply.slice(0, 240));
      speakOut(reply);
    } catch (e) {
      ui('voice-status', 'ERROR');
      speakOut("Connection error, Boss.");
    }
  }

  function speakOut(text) {
    const s = getSynth();
    if (!s) return;
    s.cancel();
    speaking = true;
    ui('voice-status', 'SPEAKING…');
    const pulse = document.getElementById('voice-pulse-wrap');
    if (pulse) { pulse.classList.add('v-speaking'); pulse.classList.remove('v-listening'); }

    const clean = text.replace(/[*_`#>[\]]/g, '').slice(0, 500);
    const ut = new SpeechSynthesisUtterance(clean);
    ut.lang = currentLang;
    ut.onend = () => {
      speaking = false;
      ui('voice-status', 'LISTENING…');
      if (active) startListening();
    };
    s.speak(ut);
  }

  function startListening() {
    if (!active || speaking) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    recognition = new SR();
    recognition.lang = currentLang;
    recognition.onstart = () => {
      ui('voice-status', 'LISTENING…');
      const pulse = document.getElementById('voice-pulse-wrap');
      if (pulse) { pulse.classList.add('v-listening'); pulse.classList.remove('v-speaking'); }
    };
    recognition.onresult = e => {
      const last = e.results.length - 1;
      const trans = e.results[last][0].transcript;
      ui('voice-transcript', trans);
      if (e.results[last].isFinal) {
        recognition.stop();
        think(trans);
      }
    };
    recognition.onend = () => { if (active && !speaking) startListening(); };
    recognition.start();
  }

  return {
    open() {
      active = true;
      document.getElementById('voice-modal')?.classList.add('open');
      ui('voice-status', 'INITIALIZING…');
      startListening();
    },
    close() {
      active = false;
      speaking = false;
      if (recognition) recognition.stop();
      getSynth()?.cancel();
      const pulse = document.getElementById('voice-pulse-wrap');
      if (pulse) { pulse.classList.remove('v-listening'); pulse.classList.remove('v-speaking'); }
      document.getElementById('voice-modal')?.classList.remove('open');
    },
    setLang(l) { currentLang = l; }
  };
})();

// Attach to window for legacy onclick="BillyLive.open()"
window.BillyLive = BillyLive;
