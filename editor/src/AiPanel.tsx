import React, { useState, useRef, useEffect } from 'react';

const VOICES = [
  ["Aria (Female, US)", "en-US-AriaNeural"],
  ["Guy (Male, US)", "en-US-GuyNeural"],
  ["Jenny (Female, US)", "en-US-JennyNeural"],
  ["Sonia (Female, UK)", "en-GB-SoniaNeural"],
  ["Ryan (Male, UK)", "en-GB-RyanNeural"],
  ["Natasha (Female, AU)", "en-AU-NatashaNeural"],
];

const CHARACTERS = [
  "beaver","bee","bunny","cat","caterpillar","chick","cow","crab",
  "deer","dog","elephant","fish","fox","giraffe","hog","koala",
  "lion","monkey","panda","parrot","penguin","pig","polar","tiger"
];

interface Props {
  apiKey: string;
  onSpecGenerated: (spec: any) => void;
  onStatusMsg: (msg: string) => void;
  getCurrentSpec: () => any;
}

interface TtsJob {
  text: string;
  filename: string;
  voice: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isSpec?: boolean;
}

export function AiPanel({ apiKey, onSpecGenerated, onStatusMsg, getCurrentSpec }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'generate' | 'chat' | 'tts' | 'image'>('generate');

  // Generate tab state
  const [topic, setTopic]         = useState('');
  const [age, setAge]             = useState('3-5');
  const [character, setCharacter] = useState('bunny');
  const [duration, setDuration]   = useState('2 minutes');
  const [background, setBackground] = useState('AI will choose');
  const [extra, setExtra]         = useState('');
  const [generating, setGenerating] = useState(false);
  const [provider, setProvider]     = useState('groq');
  const [model, setModel]           = useState('llama-3.3-70b-versatile');

  // Chat tab state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your Automato AI assistant. I can help you:\n\n• **Generate** a new video from scratch\n• **Edit** your current video spec — just tell me what to change!\n• **Explain** what any part of your video does\n\nTry: *\"Change scene 3 to use the forest background\"* or *\"Add a text overlay showing 2+2=4 to scene 2\"*" }
  ]);
  const [chatInput, setChatInput]     = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // TTS tab state
  const [ttsJobs, setTtsJobs] = useState<TtsJob[]>([
    { text: '', filename: 'scene_01.wav', voice: 'en-US-AriaNeural', status: 'idle' }
  ]);

  // Image tab state
  const [imgPrompt, setImgPrompt]     = useState('');
  const [imgFilename, setImgFilename] = useState('sprite.png');
  const [imgRemoveBg, setImgRemoveBg] = useState(false);
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResult, setImgResult]     = useState('');

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── AI Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!apiKey) { onStatusMsg('❌ No API key set — open ⚙️ Settings first'); return; }
    if (!topic.trim()) { onStatusMsg('❌ Enter a topic first'); return; }
    setGenerating(true);
    onStatusMsg('🤖 Generating video spec with AI…');

    const prompt = [
      `Topic: ${topic}`,
      `Target age: ${age} years`,
      `Host character: ${character}`,
      `Desired duration: ${duration}`,
      background !== 'AI will choose' ? `Background: ${background}` : '',
      extra ? `Extra instructions: ${extra}` : '',
      'CRITICAL DURATION RULES:',
      '- Each scene lasts about 5 seconds.',
      '- For a 1 minute video, you MUST generate exactly 12 scenes.',
      '- For a 2 minute video, you MUST generate exactly 24 scenes.',
      '- For a 3 minute video, you MUST generate exactly 36 scenes.',
      `The user requested ${duration}. YOU MUST generate enough scenes to fulfill this duration! Do not cut the story short.`,
      'Output ONE massive timeline array. The block editor auto-splits into part files.',
      'Make the dialogue conversational and engaging.',
      'Use textOverlays for any math equations or labels — not subtitles.',
      'Each scene should have meaningful audio dialogue.',
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt, provider, model })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSpecGenerated(data.spec);
      onStatusMsg('✅ AI generated spec — loaded into canvas!');
      setOpen(false);
    } catch (e: any) {
      onStatusMsg(`❌ Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Chat ────────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!apiKey) { onStatusMsg('❌ No API key set — open ⚙️ Settings first'); return; }
    if (!chatInput.trim() || chatSending) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatSending(true);

    try {
      const currentSpec = getCurrentSpec();
      // Send only the actual conversation (exclude the initial greeting)
      const apiMessages = newMessages
        .filter(m => !(m.role === 'assistant' && m === chatMessages[0]))
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider, model, messages: apiMessages, currentSpec })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.type === 'spec') {
        onSpecGenerated(data.spec);
        setChatMessages(m => [...m, {
          role: 'assistant',
          content: '✅ Done! I\'ve updated your video spec and loaded it into the canvas. Click **⚙️ Compile** to preview the changes.',
          isSpec: true
        }]);
        onStatusMsg('✅ AI updated spec — loaded into canvas!');
      } else {
        setChatMessages(m => [...m, { role: 'assistant', content: data.reply }]);
      }
    } catch (e: any) {
      setChatMessages(m => [...m, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    } finally {
      setChatSending(false);
    }
  };

  // ─── TTS Generation ──────────────────────────────────────────────────────────
  const addTtsJob = () => {
    const nextNum = ttsJobs.length + 1;
    setTtsJobs(j => [...j, {
      text: '', filename: `scene_${String(nextNum).padStart(2,'0')}.wav`,
      voice: 'en-US-AriaNeural', status: 'idle'
    }]);
  };
  const removeTtsJob = (i: number) => setTtsJobs(j => j.filter((_, idx) => idx !== i));
  const updateTtsJob = (i: number, patch: Partial<TtsJob>) => {
    setTtsJobs(j => j.map((job, idx) => idx === i ? { ...job, ...patch } : job));
  };
  const generateTts = async (i: number) => {
    const job = ttsJobs[i];
    if (!job.text.trim()) { onStatusMsg('❌ Enter text for audio line ' + (i+1)); return; }
    updateTtsJob(i, { status: 'generating' });
    try {
      const res = await fetch('/api/gen-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: job.text, filename: job.filename, voice: job.voice })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      updateTtsJob(i, { status: 'done' });
      onStatusMsg(`✅ Saved ${job.filename}`);
    } catch (e: any) {
      updateTtsJob(i, { status: 'error', error: e.message });
      onStatusMsg(`❌ TTS failed: ${e.message}`);
    }
  };
  const generateAllTts = async () => {
    for (let i = 0; i < ttsJobs.length; i++) {
      if (ttsJobs[i].text.trim()) await generateTts(i);
    }
  };

  // ─── Image Generation ────────────────────────────────────────────────────────
  const handleGenImage = async () => {
    if (!apiKey) { onStatusMsg('❌ No API key set — open ⚙️ Settings first'); return; }
    if (!imgPrompt.trim() || !imgFilename.trim()) { onStatusMsg('❌ Enter a prompt and filename'); return; }
    setImgGenerating(true);
    onStatusMsg('🖼 Generating image…');
    try {
      const res = await fetch('/api/gen-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt: imgPrompt, filename: imgFilename, removeBackground: imgRemoveBg })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setImgResult(imgFilename);
      onStatusMsg(`✅ Image saved to public/${imgFilename}`);
    } catch (e: any) {
      onStatusMsg(`❌ Image gen failed: ${e.message}`);
    } finally {
      setImgGenerating(false);
    }
  };

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
    background: 'linear-gradient(180deg, #0f0f1a 0%, #12121f 100%)',
    borderLeft: '1px solid #2a2a3e', zIndex: 500,
    display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
    fontFamily: "'Inter', sans-serif",
  };
  const tabBtn = (t: string, active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', background: active ? '#1e1e38' : 'transparent',
    border: 'none', borderBottom: active ? '2px solid #7c6af7' : '2px solid transparent',
    color: active ? '#fff' : '#666', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
  });
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
    color: '#eee', fontSize: 13, marginBottom: 10, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 4, display: 'block',
  };
  const primaryBtn: React.CSSProperties = {
    width: '100%', padding: '12px', background: 'linear-gradient(135deg, #7c6af7, #a855f7)',
    border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700,
    fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,106,247,0.4)',
    transition: 'opacity 0.15s',
  };
  const secondaryBtn: React.CSSProperties = {
    padding: '7px 14px', background: '#1e1e38', border: '1px solid #3a3a5c',
    borderRadius: 6, color: '#aaa', fontSize: 12, cursor: 'pointer',
  };

  // Simple markdown-lite renderer for chat messages
  const renderMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      const italic = bold.replace(/\*(.+?)\*/g, '<em>$1</em>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: italic || '&nbsp;' }} style={{ minHeight: '1em' }} />;
    });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '9px 16px', background: open ? '#7c6af7' : 'linear-gradient(135deg, #7c6af7, #a855f7)',
          border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700,
          fontSize: 13, cursor: 'pointer', boxShadow: '0 3px 12px rgba(124,106,247,0.4)',
          whiteSpace: 'nowrap', transition: 'all 0.2s',
        }}
      >
        🤖 AI Studio
      </button>

      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 700 }}>🤖 AI Studio</h2>
                <p style={{ margin: 0, color: '#555', fontSize: 12 }}>Generate, chat, voice, and illustrate your video</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            {/* Provider row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={provider} onChange={e => {
                setProvider(e.target.value);
                if (e.target.value === 'groq') setModel('llama-3.3-70b-versatile');
                if (e.target.value === 'openrouter') setModel('meta-llama/llama-3.1-8b-instruct:free');
                if (e.target.value === 'gemini') setModel('gemini-2.0-flash');
              }}>
                <option value="groq">Groq (Free, Fast)</option>
                <option value="openrouter">OpenRouter (Free)</option>
                <option value="gemini">Google Gemini</option>
              </select>
              <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={model} onChange={e => setModel(e.target.value)} placeholder="model name" />
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e' }}>
              <button style={tabBtn('generate', tab === 'generate')} onClick={() => setTab('generate')}>✨ Generate</button>
              <button style={tabBtn('chat', tab === 'chat')} onClick={() => setTab('chat')}>💬 Chat</button>
              <button style={tabBtn('tts', tab === 'tts')} onClick={() => setTab('tts')}>🔊 TTS</button>
              <button style={tabBtn('image', tab === 'image')} onClick={() => setTab('image')}>🖼 Images</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: tab === 'chat' ? 'hidden' : 'auto', padding: tab === 'chat' ? 0 : '20px', display: 'flex', flexDirection: 'column' }}>

            {/* ── Generate Tab ── */}
            {tab === 'generate' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={labelStyle}>Topic / Concept</label>
                  <input style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. counting to 10, addition with apples, shapes..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Age Group</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={age} onChange={e => setAge(e.target.value)}>
                      <option value="3-5">3–5 Years</option>
                      <option value="6-7">6–7 Years</option>
                      <option value="8-10">8–10 Years</option>
                      <option value="11+">11+ Years</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Duration</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={duration} onChange={e => setDuration(e.target.value)}>
                      <option>1 minute</option>
                      <option>2 minutes</option>
                      <option>3 minutes</option>
                      <option>4 minutes</option>
                      <option>5 minutes</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Host Character</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={character} onChange={e => setCharacter(e.target.value)}>
                      {CHARACTERS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Background</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={background} onChange={e => setBackground(e.target.value)}>
                      <option>AI will choose</option>
                      <option>forest_bg.png</option>
                      <option>classroom_bg.png</option>
                      <option>kitchen_bg.png</option>
                      <option>space_bg.png</option>
                      <option>ocean_bg.png</option>
                      <option>garden_bg.png</option>
                      <option>math_bg.png</option>
                    </select>
                  </div>
                </div>

                <label style={labelStyle}>Extra Instructions (optional)</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  value={extra} onChange={e => setExtra(e.target.value)}
                  placeholder="e.g. use bananas as the counting objects, make it funny..." />

                <button style={{ ...primaryBtn, opacity: generating ? 0.6 : 1 }}
                  onClick={handleGenerate} disabled={generating}>
                  {generating ? '⏳ Generating…' : '✨ Generate Video Script'}
                </button>

                <p style={{ color: '#444', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
                  The generated spec will be loaded directly into the canvas
                </p>
              </div>
            )}

            {/* ── Chat Tab ── */}
            {tab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '88%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #7c6af7, #a855f7)'
                          : msg.isSpec ? 'rgba(74,222,128,0.1)' : '#1a1a2e',
                        border: msg.role === 'assistant' ? (msg.isSpec ? '1px solid rgba(74,222,128,0.3)' : '1px solid #2a2a3e') : 'none',
                        color: '#e8e8f0',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}>
                        {renderMessage(msg.content)}
                      </div>
                    </div>
                  ))}
                  {chatSending && (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#666', fontSize: 13 }}>
                        <span style={{ animation: 'pulse 1.5s infinite' }}>⏳ Thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2e', background: '#0f0f1a', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      style={{
                        flex: 1, padding: '10px 12px', background: '#1a1a2e',
                        border: '1px solid #333', borderRadius: 10, color: '#eee',
                        fontSize: 13, resize: 'none', outline: 'none',
                        fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 120,
                        minHeight: 42, boxSizing: 'border-box',
                      }}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder="Ask me to change anything… (Enter to send)"
                      rows={1}
                    />
                    <button
                      onClick={sendChat}
                      disabled={chatSending || !chatInput.trim()}
                      style={{
                        padding: '10px 16px', background: 'linear-gradient(135deg, #7c6af7, #a855f7)',
                        border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700,
                        fontSize: 14, cursor: chatSending ? 'not-allowed' : 'pointer',
                        opacity: chatSending || !chatInput.trim() ? 0.5 : 1,
                        flexShrink: 0, alignSelf: 'flex-end',
                        transition: 'opacity 0.15s',
                      }}
                    >↑</button>
                  </div>
                  <p style={{ color: '#333', fontSize: 10, margin: '6px 0 0', textAlign: 'center' }}>
                    Shift+Enter for new line · Enter to send
                  </p>
                </div>
              </div>
            )}

            {/* ── TTS Tab ── */}
            {tab === 'tts' && (
              <div>
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, color: '#86efac', fontSize: 12 }}>
                    Uses <strong>edge-tts</strong> to generate WAV audio files saved directly to <code style={{ color: '#aaa' }}>public/</code>. Add one row per scene.
                  </p>
                </div>

                {ttsJobs.map((job, i) => (
                  <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>Scene {i + 1}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {job.status === 'done' && <span style={{ color: '#4ade80', fontSize: 11 }}>✅ done</span>}
                        {job.status === 'generating' && <span style={{ color: '#facc15', fontSize: 11 }}>⏳ generating…</span>}
                        {job.status === 'error' && <span style={{ color: '#f87171', fontSize: 11 }}>❌ error</span>}
                        <button onClick={() => removeTtsJob(i)} style={{ ...secondaryBtn, padding: '3px 8px', color: '#f87171' }}>✕</button>
                      </div>
                    </div>
                    <textarea
                      style={{ ...inputStyle, height: 60, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }}
                      placeholder="Enter the voiceover text for this scene…"
                      value={job.text} onChange={e => updateTtsJob(i, { text: e.target.value, status: 'idle' })}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>Filename</label>
                        <input style={{ ...inputStyle, marginBottom: 0 }} value={job.filename}
                          onChange={e => updateTtsJob(i, { filename: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>Voice</label>
                        <select style={{ ...inputStyle, marginBottom: 0 }} value={job.voice}
                          onChange={e => updateTtsJob(i, { voice: e.target.value })}>
                          {VOICES.map(([label, val]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button
                      style={{ ...secondaryBtn, width: '100%', textAlign: 'center', padding: '8px', opacity: job.status === 'generating' ? 0.5 : 1 }}
                      onClick={() => generateTts(i)} disabled={job.status === 'generating'}>
                      🔊 Generate Audio
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...secondaryBtn, flex: 1, textAlign: 'center', padding: '10px' }} onClick={addTtsJob}>
                    + Add Scene
                  </button>
                  <button style={{ ...primaryBtn, flex: 1, padding: '10px' }} onClick={generateAllTts}>
                    ⚡ Generate All
                  </button>
                </div>
              </div>
            )}

            {/* ── Image Tab ── */}
            {tab === 'image' && (
              <div>
                <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, color: '#fdba74', fontSize: 12 }}>
                    Uses <strong>Gemini Imagen</strong> to generate backgrounds and sprites. Images are saved directly to <code style={{ color: '#aaa' }}>public/</code>.
                  </p>
                </div>

                <label style={labelStyle}>Image Prompt</label>
                <textarea style={{ ...inputStyle, height: 90, resize: 'vertical', fontFamily: 'inherit' }}
                  value={imgPrompt} onChange={e => setImgPrompt(e.target.value)}
                  placeholder="e.g. A bright sunny garden background for a children's educational video, cartoon style, 1920x1080..." />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Save As (filename)</label>
                    <input style={{ ...inputStyle, marginBottom: 0 }} value={imgFilename}
                      onChange={e => setImgFilename(e.target.value)} placeholder="background.png" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#ccc', fontSize: 13, marginBottom: 10 }}>
                      <input type="checkbox" checked={imgRemoveBg} onChange={e => setImgRemoveBg(e.target.checked)}
                        style={{ width: 16, height: 16 }} />
                      Remove background (sprite mode)
                    </label>
                  </div>
                </div>

                <button style={{ ...primaryBtn, opacity: imgGenerating ? 0.6 : 1 }}
                  onClick={handleGenImage} disabled={imgGenerating}>
                  {imgGenerating ? '⏳ Generating…' : '🖼 Generate Image'}
                </button>

                {imgResult && (
                  <div style={{ marginTop: 12, background: '#0d2818', border: '1px solid #1a4a2e', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: 0, color: '#4ade80', fontSize: 12 }}>
                      ✅ Saved as <code style={{ color: '#86efac' }}>{imgResult}</code> in public/
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
