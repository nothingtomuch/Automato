import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import { defineBlocks } from './blocks';
import { specToBlocklyState } from './decompiler';
import { AiPanel } from './AiPanel';
import './App.css';

// ─── Toolbox ──────────────────────────────────────────────────────────────────
const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    { kind: "category", name: "🎬 Video",      colour: "230", contents: [{ kind: "block", type: "video_spec" }] },
    { kind: "category", name: "🎭 Scenes",     colour: "160", contents: [
      { kind: "block", type: "scene" },
      { kind: "block", type: "include_spec" },
    ]},
    { kind: "category", name: "🐻 Characters", colour: "290", contents: [{ kind: "block", type: "character_state" }] },
    { kind: "category", name: "🍎 Grids",      colour: "210", contents: [
      { kind: "block", type: "grid_init" },
      { kind: "block", type: "grid_add"  },
      { kind: "block", type: "grid_destroy" },
    ]},
    { kind: "category", name: "✏️ Text",       colour: "20",  contents: [
      { kind: "block", type: "text_overlay" },
    ]},
    { kind: "category", name: "✨ Animation",  colour: "65",  contents: [
      { kind: "block", type: "action_glide" },
      { kind: "block", type: "action_wait"  },
    ]},
  ]
};

// ─── Scene Templates ──────────────────────────────────────────────────────────
const TEMPLATES = {
  intro: {
    type: 'scene', x: 80, y: 80,
    fields: { stepId:'scene_01_intro', audioFile:'scene_01_intro.wav', subtitle:'Hi! Let\'s learn something amazing today!', backgroundDropdown:'classroom_bg.png', backgroundCustom:'my_bg.png', confetti:'FALSE', autoNameAudio:'FALSE' },
    inputs: { CHARACTER_STATE: { block: { type:'character_state', fields:{pose:'walk'}, inputs:{ ACTIONS:{ block:{ type:'action_glide', fields:{duration:1.5,x:'0',y:'-1',scale:1.2,rotationX:0,rotationY:0,rotationZ:0} } } } } } }
  },
  counting: {
    type: 'scene', x: 80, y: 80,
    fields: { stepId:'scene_02_count', audioFile:'scene_02_count.wav', subtitle:'Let\'s count together!', backgroundDropdown:'classroom_bg.png', backgroundCustom:'my_bg.png', confetti:'FALSE', autoNameAudio:'FALSE' },
    inputs: {
      CHARACTER_STATE: { block: { type:'character_state', fields:{pose:'gesture-positive'}, inputs:{ ACTIONS:{ block:{ type:'action_glide', fields:{duration:0.5,x:'-4',y:'-1',scale:1.2,rotationX:0,rotationY:0,rotationZ:0} } } } } },
      GRID_ACTIONS: { block: { type:'grid_init', fields:{gridId:'items',initialCount:3,src:'apple.png',startX:400,startY:720,spacingX:200} } }
    }
  },
  celebrate: {
    type: 'scene', x: 80, y: 80,
    fields: { stepId:'scene_final', audioFile:'scene_final.wav', subtitle:'Amazing! You did it! 🎉', backgroundDropdown:'classroom_bg.png', backgroundCustom:'my_bg.png', confetti:'TRUE', autoNameAudio:'FALSE' },
    inputs: { CHARACTER_STATE: { block: { type:'character_state', fields:{pose:'dance'} } } }
  },
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '8px 14px', background: bg, color: '#fff', border: 'none',
  borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  boxShadow: '0 2px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
  transition: 'opacity 0.15s', ...extra,
});

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
  background: '#1a1a2e', border: '1px solid #333', borderRadius: 6,
  color: '#eee', fontSize: 13, outline: 'none',
};

// ─── New Project Modal ────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  const [err, setErr]   = useState('');
  const submit = () => {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) { setErr('Use only letters, numbers, _ and -'); return; }
    onCreate(name);
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:400, background:'#12121f', border:'1px solid #2a2a3e', borderRadius:14, padding:28 }}>
        <h3 style={{ margin:'0 0 6px', color:'#fff' }}>📁 New Project</h3>
        <p style={{ margin:'0 0 18px', color:'#555', fontSize:13 }}>Each project gets its own folder under <code style={{color:'#888'}}>projects/</code>.</p>
        <label style={{ color:'#888', fontSize:11, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase' }}>Project Name</label>
        <input style={{ ...inputSt, marginBottom:8 }} value={name} onChange={e => { setName(e.target.value); setErr(''); }}
          placeholder="my_counting_video" onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        {err && <p style={{ color:'#f87171', fontSize:12, margin:'0 0 8px' }}>{err}</p>}
        <p style={{ color:'#444', fontSize:11, margin:'0 0 18px' }}>Creates: <code style={{color:'#666'}}>projects/{name || '…'}/</code></p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={btn('#2a2a3e', { boxShadow:'none' })}>Cancel</button>
          <button onClick={submit} style={btn('#7c6af7')} disabled={!name}>✅ Create</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ onClose, apiKey, onSave }: { onClose:()=>void; apiKey:string; onSave:(k:string)=>void }) {
  const [key, setKey] = useState(apiKey);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:460, background:'#12121f', border:'1px solid #2a2a3e', borderRadius:14, padding:28 }}>
        <h3 style={{ margin:'0 0 6px', color:'#fff' }}>⚙️ Settings</h3>
        <p style={{ margin:'0 0 20px', color:'#555', fontSize:13 }}>Your API key is stored only in your browser.</p>
        <label style={{ color:'#888', fontSize:11, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase' }}>Google AI Studio API Key</label>
        <input type="password" style={{ ...inputSt, marginBottom:8 }} value={key} onChange={e => setKey(e.target.value)} placeholder="AIza…" />
        <p style={{ color:'#444', fontSize:11, margin:'0 0 20px' }}>
          Free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color:'#7c6af7' }}>aistudio.google.com</a>
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={btn('#2a2a3e', { boxShadow:'none' })}>Cancel</button>
          <button onClick={() => { onSave(key); onClose(); }} style={btn('#7c6af7')}>💾 Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recorder Panel ───────────────────────────────────────────────────────────
function RecorderPanel({ onSaved }: { onSaved: (f:string)=>void }) {
  const [open, setOpen]       = useState(false);
  const [recording, setRec]   = useState(false);
  const [audioUrl, setAUrl]   = useState<string|null>(null);
  const [filename, setFname]  = useState('scene_01.wav');
  const [status, setStatus]   = useState('');
  const [level, setLevel]     = useState(0);
  const mediaRef    = useRef<MediaRecorder|null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const animRef     = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode|null>(null);

  const tick = useCallback(() => {
    if (analyserRef.current) {
      const d = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(d);
      let max = 0;
      for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]-128));
      setLevel(Math.min(1, max/64));
    }
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext(), src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an); analyserRef.current = an;
      const mr = new MediaRecorder(stream, { mimeType:'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        setAUrl(URL.createObjectURL(new Blob(chunksRef.current, { type:'audio/webm' })));
        stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(animRef.current); setLevel(0);
      };
      mr.start(100); mediaRef.current = mr; setRec(true); setAUrl(null); setStatus('');
      animRef.current = requestAnimationFrame(tick);
    } catch { setStatus('❌ Microphone access denied.'); }
  };

  const stop  = () => { mediaRef.current?.stop(); setRec(false); };
  const save  = async () => {
    if (!chunksRef.current.length) return;
    const blob = new Blob(chunksRef.current, { type:'audio/webm' });
    setStatus('Saving…');
    const res  = await fetch('/api/save-audio', { method:'POST', headers:{'Content-Type':'audio/webm','x-filename':filename}, body:blob });
    const json = await res.json();
    if (json.success) { setStatus(`✅ Saved ${filename}`); onSaved(filename); }
    else setStatus(`❌ ${json.error}`);
  };

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={btn('#6c3fc5')}>🎙️ Record</button>
      {open && (
        <div style={{ position:'absolute', top:44, right:0, width:290, background:'#1e1e2e', border:'1px solid #444', borderRadius:10, padding:16, boxShadow:'0 8px 30px rgba(0,0,0,0.5)', zIndex:200 }}>
          <p style={{ margin:'0 0 10px', fontWeight:700, color:'#ccc', fontSize:13 }}>🎙️ Voice Recorder</p>
          <div style={{ height:36, background:'#111', borderRadius:6, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {recording
              ? <div style={{ width:`${Math.max(4,level*100)}%`, height:'60%', background:'linear-gradient(90deg,#6c3fc5,#FF5733)', borderRadius:4, transition:'width 0.05s' }} />
              : <span style={{ color:'#555', fontSize:11 }}>{audioUrl ? '✅ Ready' : 'Press Start'}</span>}
          </div>
          <input style={{ ...inputSt, marginBottom:8, fontSize:12 }} value={filename} onChange={e => setFname(e.target.value)} placeholder="scene_01.wav" />
          <div style={{ display:'flex', gap:8 }}>
            {!recording ? <button onClick={start} style={btn('#e53935')}>⏺ Start</button>
                        : <button onClick={stop}  style={btn('#555')}>⏹ Stop</button>}
          </div>
          {audioUrl && !recording && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
              <audio src={audioUrl} controls style={{ width:'100%' }} />
              <button onClick={save} style={{ ...btn('#2e7d32'), width:'100%', textAlign:'center' }}>💾 Save to Project</button>
            </div>
          )}
          {status && <p style={{ marginTop:8, fontSize:12, color:status.startsWith('❌')?'#f87171':'#69f0ae' }}>{status}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Templates Menu ───────────────────────────────────────────────────────────
function TemplatesMenu({ workspace, onClose }: { workspace:Blockly.WorkspaceSvg; onClose:()=>void }) {
  const insert = (key: keyof typeof TEMPLATES) => {
    const tpl = TEMPLATES[key] as any;
    const block = Blockly.serialization.blocks.append(tpl, workspace);
    block.moveBy(40 + Math.random()*80, 40 + Math.random()*80);
    workspace.scrollBlockIntoView(block.id);
    onClose();
  };
  return (
    <div style={{ position:'absolute', top:44, left:0, width:230, background:'#1e1e2e', border:'1px solid #333', borderRadius:10, padding:'6px 0', boxShadow:'0 8px 30px rgba(0,0,0,0.5)', zIndex:200 }}>
      <p style={{ margin:0, padding:'0 14px 8px', fontSize:11, color:'#555', fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid #1e1e2e' }}>Insert Template</p>
      {([
        ['intro',    '🚀 Intro Scene',       'Character walks in & greets'],
        ['counting', '🔢 Counting Scene',    'Grid of 3 items appears'],
        ['celebrate','🎉 Celebration Scene', 'Dance + confetti burst'],
      ] as const).map(([key, label, desc]) => (
        <button key={key} onClick={() => insert(key)}
          style={{ display:'block', width:'100%', padding:'10px 14px', border:'none', background:'transparent', textAlign:'left', cursor:'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background='rgba(124,106,247,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
          <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>{label}</div>
          <div style={{ color:'#666', fontSize:11 }}>{desc}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  projects, currentProject, specFiles, currentFile,
  onSelectProject, onCreateProject, onSelectFile, onNewPart,
}: {
  projects: string[]; currentProject: string;
  specFiles: string[]; currentFile: string;
  onSelectProject: (p:string)=>void;
  onCreateProject: ()=>void;
  onSelectFile: (f:string)=>void;
  onNewPart: ()=>void;
}) {
  return (
    <div style={{ width:210, background:'#0b0b15', borderRight:'1px solid #1a1a2e', display:'flex', flexDirection:'column', flexShrink:0, fontFamily:"'Inter',sans-serif" }}>
      {/* Project selector */}
      <div style={{ padding:'14px 12px 10px', borderBottom:'1px solid #1a1a2e' }}>
        <p style={{ margin:'0 0 8px', color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>Project</p>
        <select
          value={currentProject}
          onChange={e => onSelectProject(e.target.value)}
          style={{ ...inputSt, fontSize:12, padding:'7px 10px', cursor:'pointer' }}
        >
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
          {projects.length === 0 && <option disabled>No projects yet</option>}
        </select>
        <button onClick={onCreateProject} style={{
          width:'100%', marginTop:6, padding:'7px', background:'transparent',
          border:'1px dashed #2a2a3e', borderRadius:6, color:'#555', fontSize:11,
          cursor:'pointer', transition:'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#7c6af7'; e.currentTarget.style.color='#7c6af7'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#2a2a3e'; e.currentTarget.style.color='#555'; }}
        >+ New Project</button>
      </div>

      {/* Spec files */}
      <div style={{ padding:'10px 0 4px', borderBottom:'1px solid #1a1a2e' }}>
        <p style={{ margin:'0 0 4px', padding:'0 12px', color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>Spec Files</p>
        {specFiles.length === 0 && <p style={{ color:'#2a2a3e', fontSize:11, padding:'6px 12px', margin:0 }}>No files yet</p>}
        {specFiles.map(f => (
          <button key={f} onClick={() => onSelectFile(f)} style={{
            display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px',
            border:'none', textAlign:'left',
            background: currentFile === f ? 'rgba(124,106,247,0.12)' : 'transparent',
            borderLeft: currentFile === f ? '3px solid #7c6af7' : '3px solid transparent',
            color: currentFile === f ? '#fff' : '#666', fontSize:12, cursor:'pointer', transition:'all 0.15s',
          }}>
            <span style={{ fontSize:14 }}>{f === 'video_spec.json' ? '🎬' : '📄'}</span>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f}</span>
          </button>
        ))}
      </div>
      <div style={{ padding:'8px 12px' }}>
        <button onClick={onNewPart} style={{
          width:'100%', padding:'7px', background:'transparent',
          border:'1px dashed #2a2a3e', borderRadius:6, color:'#555', fontSize:11,
          cursor:'pointer', transition:'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#7c6af7'; e.currentTarget.style.color='#7c6af7'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#2a2a3e'; e.currentTarget.style.color='#555'; }}
        >+ New Part File</button>
      </div>

      {/* Spacer */}
      <div style={{ flex:1 }} />

      {/* Project path hint */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #1a1a2e' }}>
        <p style={{ margin:0, color:'#333', fontSize:10, wordBreak:'break-all', lineHeight:1.5 }}>
          projects/<span style={{ color:'#555' }}>{currentProject}</span>/
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const blocklyDiv   = useRef<HTMLDivElement>(null);
  const workspace    = useRef<Blockly.WorkspaceSvg|null>(null);
  const generatorRef = useRef<Blockly.Generator|null>(null);

  const [jsonCode,      setJsonCode]      = useState('');
  const [statusMsg,     setStatusMsg]     = useState('');
  const [loading,       setLoading]       = useState(true);

  const [projects,      setProjects]      = useState<string[]>([]);
  const [currentProject,setCurrentProject] = useState('default');
  const [specFiles,     setSpecFiles]     = useState<string[]>([]);
  const [currentFile,   setCurrentFile]   = useState('video_spec.json');

  const [showSettings,  setShowSettings]  = useState(false);
  const [showNewProject,setShowNewProject]= useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [apiKey,        setApiKey]        = useState(() => localStorage.getItem('automato_api_key') || '');
  const [compiling,     setCompiling]     = useState(false);

  const saveApiKey = (k: string) => { setApiKey(k); localStorage.setItem('automato_api_key', k); };

  // ── Auto-clear status ────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(''), 4000);
    return () => clearTimeout(t);
  }, [statusMsg]);

  // ── Load project list ─────────────────────────────────────────────────────
  const refreshProjects = useCallback(async () => {
    const res  = await fetch('/api/projects');
    const data = await res.json();
    if (data.success) { setProjects(data.projects); setCurrentProject(data.current); }
  }, []);

  // ── Load spec file list for current project ───────────────────────────────
  const refreshFiles = useCallback(async () => {
    const res  = await fetch('/api/list-specs');
    const data = await res.json();
    if (data.success) setSpecFiles(data.files);
  }, []);

  // ── Load a file into the canvas ───────────────────────────────────────────
  const loadFile = useCallback(async (filename: string) => {
    if (!workspace.current) return;
    const isMain = filename === 'video_spec.json';
    const url    = isMain ? '/api/load-spec' : `/api/load-part?file=${encodeURIComponent(filename)}`;
    const res    = await fetch(url);
    const data   = await res.json();
    if (!data.success) { setStatusMsg(`❌ Could not load ${filename}`); return; }
    try {
      const state = specToBlocklyState(data.spec);
      workspace.current.clear();
      Blockly.serialization.workspaces.load(state, workspace.current);
      setCurrentFile(filename);
      setStatusMsg(`✅ Loaded ${filename}`);
    } catch (e: any) { setStatusMsg(`❌ Decompile error: ${e.message}`); }
  }, []);

  // ── Switch project ────────────────────────────────────────────────────────
  const switchProject = useCallback(async (name: string) => {
    await fetch('/api/switch-project', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name }) });
    setCurrentProject(name);
    setCurrentFile('video_spec.json');
    await refreshFiles();
    await loadFile('video_spec.json');
  }, [refreshFiles, loadFile]);

  // ── Create project ────────────────────────────────────────────────────────
  const createProject = useCallback(async (name: string) => {
    const res  = await fetch('/api/create-project', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name }) });
    const data = await res.json();
    if (!data.success) { setStatusMsg(`❌ ${data.error}`); return; }
    setProjects(data.projects);
    setCurrentProject(name);
    setCurrentFile('video_spec.json');
    setShowNewProject(false);
    await refreshFiles();
    if (workspace.current) workspace.current.clear();
    setStatusMsg(`✅ Created project: ${name}`);
  }, [refreshFiles]);

  // ── New part file ─────────────────────────────────────────────────────────
  const newPart = useCallback(async () => {
    const partNums = specFiles.filter(f => /^part\d+\.json$/.test(f)).map(f => parseInt(f.match(/\d+/)![0]));
    const next     = partNums.length > 0 ? Math.max(...partNums)+1 : 1;
    const filename = `part${next}.json`;
    await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename, data:{ timeline:[] } }) });
    await refreshFiles();
    await loadFile(filename);
  }, [specFiles, refreshFiles, loadFile]);

  // ── Blockly init ──────────────────────────────────────────────────────────
  useEffect(() => {
    generatorRef.current = defineBlocks();
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: TOOLBOX,
        theme: Blockly.Theme.defineTheme('automato_dark', {
          name: 'automato_dark', base: Blockly.Themes.Classic,
          componentStyles: {
            workspaceBackgroundColour: '#13131e',
            toolboxBackgroundColour: '#0b0b15',
            toolboxForegroundColour: '#f0f0f0',
            flyoutBackgroundColour: '#10101a',
            flyoutForegroundColour: '#ccc',
            flyoutOpacity: 1,
            scrollbarColour: '#2a2a3e',
            insertionMarkerColour: '#7c6af7',
            insertionMarkerOpacity: 0.5,
            scrollbarOpacity: 0.4,
            cursorColour: '#7c6af7',
          }
        }),
        grid:  { spacing:24, length:4, colour:'#1c1c28', snap:true },
        zoom:  { controls:true, wheel:true, startScale:1.0, maxScale:3, minScale:0.3, scaleSpeed:1.2 },
        trashcan: true,
      });

      workspace.current.addChangeListener((e: Blockly.Events.Abstract) => {
        if (!e.isUiEvent && workspace.current && generatorRef.current) {
          const root = workspace.current.getTopBlocks(true).find(b => b.type === 'video_spec');
          if (root) { try { setJsonCode(String(generatorRef.current.blockToCode(root))); } catch { } }
        }
      });

      // Initial load
      Promise.all([refreshProjects(), refreshFiles()])
        .then(() => fetch('/api/load-spec').then(r => r.json()))
        .then(data => {
          if (data.success && data.spec && workspace.current) {
            try { Blockly.serialization.workspaces.load(specToBlocklyState(data.spec), workspace.current); } catch { }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else { setLoading(false); }
    return () => { if (workspace.current) { workspace.current.dispose(); workspace.current = null; } };
  }, []);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = (spec: any): string | null => {
    if (!spec.meta) return 'Missing Video Spec block.';
    if (spec.includes?.length > 0) return null;
    const tl = spec.timeline;
    if (!tl || tl.length === 0) return 'Timeline needs at least one Scene or Include block.';
    for (let i = 0; i < tl.length; i++) {
      if (!tl[i].stepId)    return `Scene ${i+1} missing Scene ID.`;
      if (!tl[i].audioFile) return `Scene ${i+1} missing Audio File.`;
    }
    return null;
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonCode], { type:'application/json' }));
    a.download = currentFile; a.click();
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportJson = async () => {
    try {
      const parsed = JSON.parse(jsonCode);
      const err = validate(parsed);
      if (err) { setStatusMsg(`❌ ${err}`); return; }
      setStatusMsg('Exporting…');
      const { meta, timeline, includes } = parsed;
      const PER_FILE = 5;

      if (currentFile !== 'video_spec.json') {
        // Saving a part file
        const r = await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename:currentFile, data:{ timeline:timeline??[] } }) });
        const d = await r.json();
        setStatusMsg(d.success ? `✅ Saved ${currentFile}` : `❌ ${d.error}`);
      } else if (includes?.length > 0) {
        // Has include blocks
        await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename:'video_spec.json', data:{ meta, includes } }) });
        setStatusMsg(`✅ Saved with ${includes.length} part references`);
      } else if (timeline?.length > PER_FILE) {
        // Auto-split
        const parts: string[] = [];
        for (let i = 0; i < timeline.length; i += PER_FILE) {
          const pName = `part${Math.floor(i/PER_FILE)+1}.json`;
          parts.push(pName);
          await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename:pName, data:{ timeline:timeline.slice(i,i+PER_FILE) } }) });
        }
        await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename:'video_spec.json', data:{ meta, includes:parts } }) });
        setStatusMsg(`✅ Split into ${parts.length} part files`);
      } else {
        const r = await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(parsed) });
        const d = await r.json();
        setStatusMsg(d.success ? '✅ Saved video_spec.json' : `❌ ${d.error}`);
      }
      await refreshFiles();
    } catch (e: any) { setStatusMsg(`❌ ${e.message}`); }
  };

  // ── Compile pipeline ──────────────────────────────────────────────────────
  const compile = async () => {
    setCompiling(true);
    setStatusMsg('⚙️ Compiling pipeline…');
    const res  = await fetch('/api/compile', { method:'POST' });
    const data = await res.json();
    setCompiling(false);
    setStatusMsg(data.success ? '✅ Compiled! Remotion Studio updated.' : `❌ Compile error: ${data.error}`);
  };

  // ── AI spec generated ──────────────────────────────────────────────────────
  const onSpecGenerated = (spec: any) => {
    if (!workspace.current) return;
    try {
      workspace.current.clear();
      Blockly.serialization.workspaces.load(specToBlocklyState(spec), workspace.current);
    } catch (e: any) { setStatusMsg(`❌ Load error: ${e.message}`); }
  };

  // ── Get current spec from canvas (for AI chat context) ────────────────────
  const getCurrentSpec = (): any => {
    if (!workspace.current || !jsonGenerator.current) return null;
    try {
      const topBlocks = workspace.current.getTopBlocks(true);
      const specBlock = topBlocks.find((b: any) => b.type === 'video_spec');
      if (!specBlock) return null;
      const code = jsonGenerator.current.blockToCode(specBlock) as string;
      return JSON.parse(code);
    } catch { return null; }
  };

  // ── Git push ───────────────────────────────────────────────────────────────
  const gitPush = async () => {
    setStatusMsg('🚀 Pushing to GitHub…');
    const res  = await fetch('/api/git-push', { method:'POST' });
    const data = await res.json();
    setStatusMsg(data.success ? '✅ Pushed! GitHub Actions will render.' : `❌ ${data.error}`);
  };

  // ── Auto-generate all TTS audio for the entire project ────────────────────
  const generateAllAudio = async () => {
    setStatusMsg('💾 Saving blocks to disk first...');
    await exportJson(); // Force sync canvas to disk so we don't read old files!
    
    setStatusMsg('🗣️ Gathering scenes from all parts...');
    try {
      // 1. Load the main spec to check for includes
      const specRes = await fetch('/api/load-spec');
      const specData = await specRes.json();
      if (!specData.success) { setStatusMsg('❌ Could not load video_spec.json'); return; }

      let allScenes: any[] = [];
      const spec = specData.spec;

      // 2. Resolve includes or use inline timeline
      if (spec.includes && spec.includes.length > 0) {
        for (const partFile of spec.includes) {
          const partRes = await fetch(`/api/load-part?file=${encodeURIComponent(partFile)}`);
          const partData = await partRes.json();
          if (partData.success && partData.spec.timeline) {
            allScenes.push(...partData.spec.timeline);
          }
        }
      } else if (spec.timeline) {
        allScenes = spec.timeline;
      }

      if (allScenes.length === 0) { setStatusMsg('❌ No scenes found in project'); return; }

      // 3. Generate audio for all collected scenes
      let successCount = 0;
      setStatusMsg(`🗣️ Generating audio for ${allScenes.length} scenes...`);
      for (const scene of allScenes) {
        if (!scene.subtitle || !scene.audioFile) continue;
        try {
          const res = await fetch('/api/gen-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: scene.subtitle, filename: scene.audioFile, voice: 'en-US-AriaNeural' })
          });
          const data = await res.json();
          if (data.success) successCount++;
        } catch (e) {
          console.error('TTS error for', scene.audioFile, e);
        }
      }
      setStatusMsg(`✅ Generated ${successCount}/${allScenes.length} audio files!`);
    } catch (e: any) {
      setStatusMsg(`❌ Audio gen error: ${e.message}`);
    }
  };

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter',sans-serif", background:'#13131e', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <Sidebar
        projects={projects}
        currentProject={currentProject}
        specFiles={specFiles}
        currentFile={currentFile}
        onSelectProject={switchProject}
        onCreateProject={() => setShowNewProject(true)}
        onSelectFile={loadFile}
        onNewPart={newPart}
      />

      {/* ── Canvas ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>

        {/* Loading */}
        {loading && (
          <div style={{ position:'absolute', inset:0, zIndex:9999, background:'rgba(11,11,21,0.96)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div style={{ fontSize:52 }}>🎬</div>
            <div style={{ color:'#f0f0f0', fontSize:20, fontWeight:700 }}>Automato Studio</div>
            <div style={{ color:'#444', fontSize:14 }}>Loading workspace…</div>
          </div>
        )}

        {/* Blockly canvas */}
        <div ref={blocklyDiv} style={{ position:'absolute', inset:0 }} />

        {/* Toolbar */}
        <div style={{ position:'absolute', top:14, right:14, zIndex:100, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>

          {/* Status banner */}
          {statusMsg && (
            <div style={{
              background: statusMsg.startsWith('❌') ? 'rgba(185,28,28,0.92)' : statusMsg.startsWith('⚙️') || statusMsg.startsWith('🚀') ? 'rgba(30,58,138,0.92)' : 'rgba(20,83,45,0.92)',
              backdropFilter:'blur(8px)', color:'#fff', padding:'9px 16px', borderRadius:8,
              fontWeight:700, fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
              maxWidth:360, animation:'fadeIn 0.2s ease',
            }}>
              {statusMsg}
            </div>
          )}

          {/* Button row */}
          <div style={{ display:'flex', gap:8, alignItems:'flex-start', flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button onClick={() => setShowSettings(true)} style={btn('#1e1e38', { padding:'8px 10px' })} title="Settings">⚙️</button>

            <div style={{ position:'relative' }}>
              <button onClick={() => setShowTemplates(o => !o)} style={btn('#1565c0')}>📋 Templates</button>
              {showTemplates && workspace.current && (
                <TemplatesMenu workspace={workspace.current} onClose={() => setShowTemplates(false)} />
              )}
            </div>

            <RecorderPanel onSaved={f => setStatusMsg(`✅ Audio saved: ${f}`)} />

            <AiPanel apiKey={apiKey} onSpecGenerated={onSpecGenerated} onStatusMsg={setStatusMsg} getCurrentSpec={getCurrentSpec} />
            <button onClick={generateAllAudio} style={btn('#5e35b1')} title="Generate TTS audio for all scene subtitles">🗣️ Auto-Gen Audio</button>

            <div style={{ width:1, height:34, background:'#1e1e38', alignSelf:'center' }} />

            <button onClick={download} style={btn('#374151')}>⬇ Download</button>
            <button onClick={exportJson} style={btn('#c2410c')}>📤 Export JSON</button>
            <button onClick={compile} style={btn('#065f46', { opacity:compiling?0.6:1 })} disabled={compiling}>
              {compiling ? '⏳ Compiling…' : '⚙️ Compile'}
            </button>
            <button onClick={gitPush} style={btn('#14532d')} title="Push to GitHub & trigger render">🚀 Publish</button>
          </div>

          {/* Current file pill */}
          <div style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', padding:'4px 12px', borderRadius:20, fontSize:11, color:'#555' }}>
            <span style={{ color:'#444' }}>{currentProject}/</span>
            <span style={{ color:'#7c6af7', fontWeight:700 }}>{currentFile}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSettings  && <SettingsModal apiKey={apiKey} onSave={saveApiKey} onClose={() => setShowSettings(false)} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreate={createProject} />}
    </div>
  );
}
