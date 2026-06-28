import React, { useState } from 'react';

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
}

interface TtsJob {
  text: string;
  filename: string;
  voice: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
}

export function AiPanel({ apiKey, onSpecGenerated, onStatusMsg }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'generate' | 'tts' | 'image'>('generate');

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

  // ─── Gemini AI Generate ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!apiKey) { onStatusMsg('❌ No API key set — open ⚙️ Settings first'); return; }
    if (!topic.trim()) { onStatusMsg('❌ Enter a topic first'); return; }
    setGenerating(true);
    onStatusMsg('🤖 Generating video spec with Gemini…');

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
      'The block editor will automatically split your long timeline into multiple part files (part1.json, part2.json) using the include system, so you should output ONE massive timeline array.',
      'Make the dialogue conversational and engaging — not just listing facts.',
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

  // ─── TTS Generation ────────────────────────────────────────────────────────
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

  // ─── Image Generation ──────────────────────────────────────────────────────
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

  // ─── Styles ────────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
    background: 'linear-gradient(180deg, #0f0f1a 0%, #12121f 100%)',
    borderLeft: '1px solid #2a2a3e', zIndex: 500,
    display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
    fontFamily: "'Inter', sans-serif",
  };

  const tabBtn = (t: string, active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', background: active ? '#1e1e38' : 'transparent',
    border: 'none', borderBottom: active ? '2px solid #7c6af7' : '2px solid transparent',
    color: active ? '#fff' : '#666', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
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
                <p style={{ margin: 0, color: '#555', fontSize: 12 }}>Generate, voice, and illustrate your video</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e' }}>
              <button style={tabBtn('generate', tab === 'generate')} onClick={() => setTab('generate')}>✨ Generate</button>
              <button style={tabBtn('tts', tab === 'tts')} onClick={() => setTab('tts')}>🔊 Audio TTS</button>
              <button style={tabBtn('image', tab === 'image')} onClick={() => setTab('image')}>🖼 Images</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            {/* ── Generate Tab ── */}
            {tab === 'generate' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <label style={labelStyle}>Provider</label>
                    <select style={inputStyle} value={provider} onChange={e => {
                      setProvider(e.target.value);
                      if (e.target.value === 'groq') setModel('llama-3.3-70b-versatile');
                      if (e.target.value === 'openrouter') setModel('meta-llama/llama-3.1-8b-instruct:free');
                      if (e.target.value === 'gemini') setModel('gemini-2.0-flash');
                    }}>
                      <option value="groq">Groq (Free, Fast)</option>
                      <option value="openrouter">OpenRouter (Free)</option>
                      <option value="gemini">Google Gemini (Rate limited)</option>
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={labelStyle}>Model</label>
                    <input style={inputStyle} value={model} onChange={e => setModel(e.target.value)} />
                  </div>
                </div>

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
                    Uses <strong>Gemini Imagen 3</strong> to generate backgrounds and sprites. Images are saved directly to <code style={{ color: '#aaa' }}>public/</code>.
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

                <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ margin: 0, color: '#8b949e', fontSize: 11 }}>
                    💡 <strong style={{ color: '#ccc' }}>For backgrounds:</strong> describe a wide scene, cartoon style, bright colors.<br />
                    💡 <strong style={{ color: '#ccc' }}>For sprites:</strong> describe a single object on white background, then enable "Remove background".
                  </p>
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
