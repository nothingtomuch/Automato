import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { execSync } from 'child_process'
import { jsonrepair } from 'jsonrepair'

// ─── Project System ────────────────────────────────────────────────────────────
const EDITOR_DIR    = __dirname
const AUTOMATO_ROOT = path.resolve(EDITOR_DIR, '..')
const PROJECTS_DIR  = path.resolve(AUTOMATO_ROOT, 'projects')
const AI_PROMPT     = path.resolve(AUTOMATO_ROOT, 'examples', 'AI_PROMPT.md')
const CURRENT_FILE  = path.resolve(AUTOMATO_ROOT, '.current_project')

function getCurrentProject(): string {
  try {
    if (fs.existsSync(CURRENT_FILE)) return fs.readFileSync(CURRENT_FILE, 'utf-8').trim() || 'default'
  } catch { /* ignore */ }
  return 'default'
}
function setCurrentProject(name: string) { fs.writeFileSync(CURRENT_FILE, name, 'utf-8') }
function getProjectRoot(name: string): string {
  const root = path.resolve(PROJECTS_DIR, name)
  fs.mkdirSync(path.resolve(root, 'public'), { recursive: true })
  return root
}
function listProjects(): string[] {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  return fs.readdirSync(PROJECTS_DIR).filter(f =>
    fs.statSync(path.resolve(PROJECTS_DIR, f)).isDirectory()
  )
}

// ─── HTTP helpers (pure Node, no fetch needed) ─────────────────────────────────
function readBody(req: any): Promise<string> {
  return new Promise(resolve => {
    let body = ''
    req.on('data', (c: Buffer) => { body += c.toString() })
    req.on('end', () => resolve(body))
  })
}
function readBinaryBody(req: any): Promise<Buffer> {
  return new Promise(resolve => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

/** Make an HTTPS POST using only Node built-ins. Returns parsed JSON. */
function httpsPost(url: string, payload: object, extraHeaders: Record<string,string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const body   = JSON.stringify(payload)
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function ok(res: any, data: any) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}
function fail(res: any, err: any) {
  console.error('[Automato API Error]', err)
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: false, error: String(err?.message || err) }))
}

// ─── Vite Plugin ───────────────────────────────────────────────────────────────
function automotoPlugin() {
  return {
    name: 'automato-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0]
        const qs  = new URLSearchParams(req.url?.split('?')[1] || '')

        // ── List projects ──────────────────────────────────────────────────
        if (url === '/api/projects' && req.method === 'GET') {
          ok(res, { success: true, projects: listProjects(), current: getCurrentProject() })

        // ── Create project ─────────────────────────────────────────────────
        } else if (url === '/api/create-project' && req.method === 'POST') {
          try {
            const { name } = JSON.parse(await readBody(req))
            if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
              fail(res, 'Invalid project name. Use letters, numbers, _ and - only.'); return
            }
            const root     = getProjectRoot(name)
            const specPath = path.resolve(root, 'video_spec.json')
            if (!fs.existsSync(specPath)) {
              fs.writeFileSync(specPath, JSON.stringify({
                meta: { videoId: name, targetAge: '6-7', hostCharacter: 'cat', themeColor: '#FF5733', fps: 30 },
                timeline: []
              }, null, 2))

              // Copy all shared background images into the new project's public/ folder
              const globalPublic  = path.resolve(AUTOMATO_ROOT, 'public')
              const projectPublic = path.resolve(root, 'public')
              fs.mkdirSync(projectPublic, { recursive: true })
              const bgFiles = fs.readdirSync(globalPublic).filter(f => f.endsWith('_bg.png'))
              for (const bg of bgFiles) {
                fs.copyFileSync(
                  path.resolve(globalPublic, bg),
                  path.resolve(projectPublic, bg)
                )
              }
              console.log(`[Automato] Copied ${bgFiles.length} backgrounds into project '${name}': ${bgFiles.join(', ')}`)
            }
            setCurrentProject(name)
            ok(res, { success: true, name, projects: listProjects() })
          } catch (err) { fail(res, err) }

        // ── Switch project ─────────────────────────────────────────────────
        } else if (url === '/api/switch-project' && req.method === 'POST') {
          try {
            const { name } = JSON.parse(await readBody(req))
            if (!listProjects().includes(name)) { fail(res, 'Project not found'); return }
            setCurrentProject(name)
            ok(res, { success: true, name })
          } catch (err) { fail(res, err) }

        // ── Current project ────────────────────────────────────────────────
        } else if (url === '/api/current-project' && req.method === 'GET') {
          const name = getCurrentProject()
          ok(res, { success: true, name })

        // ── List spec files ────────────────────────────────────────────────
        } else if (url === '/api/list-specs' && req.method === 'GET') {
          try {
            const root  = getProjectRoot(getCurrentProject())
            const files = fs.readdirSync(root).filter(f =>
              f === 'video_spec.json' || /^part\d+\.json$/.test(f)
            )
            ok(res, { success: true, files, project: getCurrentProject() })
          } catch (err) { fail(res, err) }

        // ── Load main spec ─────────────────────────────────────────────────
        } else if (url === '/api/load-spec' && req.method === 'GET') {
          try {
            const root     = getProjectRoot(getCurrentProject())
            const specPath = path.resolve(root, 'video_spec.json')
            if (!fs.existsSync(specPath)) {
              res.statusCode = 404; res.end(JSON.stringify({ success: false, error: 'No video_spec.json' })); return
            }
            ok(res, { success: true, spec: JSON.parse(fs.readFileSync(specPath, 'utf-8')) })
          } catch (err) { fail(res, err) }

        // ── Load part file ─────────────────────────────────────────────────
        } else if (url === '/api/load-part' && req.method === 'GET') {
          try {
            const filename = qs.get('file') || ''
            if (!filename || filename.includes('..')) { fail(res, 'Bad filename'); return }
            const root     = getProjectRoot(getCurrentProject())
            const filePath = path.resolve(root, filename)
            if (!fs.existsSync(filePath)) { fail(res, 'Not found'); return }
            ok(res, { success: true, spec: JSON.parse(fs.readFileSync(filePath, 'utf-8')), filename })
          } catch (err) { fail(res, err) }

        // ── Save spec or part ──────────────────────────────────────────────
        } else if (url === '/api/save' && req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req))
            const root = getProjectRoot(getCurrentProject())
            let targetPath: string, data: any
            if (body.filename && body.data !== undefined) {
              targetPath = path.resolve(root, body.filename); data = body.data
            } else {
              targetPath = path.resolve(root, 'video_spec.json'); data = body
            }
            fs.mkdirSync(path.dirname(targetPath), { recursive: true })
            fs.writeFileSync(targetPath, JSON.stringify(data, null, 2))
            ok(res, { success: true })
          } catch (err) { fail(res, err) }

        // ── Save audio recording ───────────────────────────────────────────
        } else if (url === '/api/save-audio' && req.method === 'POST') {
          try {
            const buffer   = await readBinaryBody(req)
            const filename = String(req.headers['x-filename'] || 'recording.wav')
            const pub      = path.resolve(getProjectRoot(getCurrentProject()), 'public')
            fs.mkdirSync(pub, { recursive: true })
            const outPath  = path.resolve(pub, filename)
            const tmpPath  = outPath + '.tmp.webm'
            fs.writeFileSync(tmpPath, buffer)
            try { execSync(`ffmpeg -y -i "${tmpPath}" -c:a pcm_s16le "${outPath}"`, { stdio: 'ignore' }) }
            finally { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) }
            ok(res, { success: true, filename })
          } catch (err) { fail(res, err) }

        // ── Generate spec (multi-provider) ────────────────────────────────
        } else if (url === '/api/generate' && req.method === 'POST') {
          try {
            let { apiKey, prompt, provider, model } = JSON.parse(await readBody(req))
            if (!apiKey) { fail(res, 'No API key provided. Open ⚙️ Settings to add one.'); return }
            apiKey = apiKey.trim()
            if (!prompt) { fail(res, 'No prompt provided'); return }

            let systemPrompt = ''
            if (fs.existsSync(AI_PROMPT)) systemPrompt = fs.readFileSync(AI_PROMPT, 'utf-8')
            const jsonInstruction = '\n\nRespond with ONLY valid JSON — no markdown fences, no explanation. Just the raw JSON object starting with {.'
            const fullPrompt = systemPrompt + '\n\n---\n\nUser request:\n' + prompt + jsonInstruction

            let rawText = ''
            const prov = provider || 'groq'

            if (prov === 'gemini') {
              // ── Gemini ────────────────────────────────────────────────────
              const mdl    = model || 'gemini-2.0-flash'
              const gUrl   = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`
              const result = await httpsPost(gUrl, {
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
              })
              if (result.status !== 200) {
                const msg = result.body?.error?.message || JSON.stringify(result.body)
                fail(res, `Gemini ${result.status}: ${msg}`); return
              }
              rawText = result.body?.candidates?.[0]?.content?.parts?.[0]?.text || ''

            } else if (prov === 'groq') {
              // ── Groq (OpenAI-compatible) with structured output ───────────
              const mdl    = model || 'llama-3.3-70b-versatile'
              const result = await httpsPost(`https://api.groq.com/openai/v1/chat/completions`, {
                model: mdl,
                messages: [
                  { role: 'system', content: systemPrompt + jsonInstruction },
                  { role: 'user',   content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 8000,
                response_format: { type: 'json_object' }
              }, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
              if (result.status !== 200) {
                const msg = result.body?.error?.message || JSON.stringify(result.body)
                fail(res, `Groq ${result.status}: ${msg}`); return
              }
              rawText = result.body?.choices?.[0]?.message?.content || ''

            } else if (prov === 'openrouter') {
              // ── OpenRouter (OpenAI-compatible) ────────────────────────────
              const mdl    = model || 'meta-llama/llama-3.1-8b-instruct:free'
              const result = await httpsPost(`https://openrouter.ai/api/v1/chat/completions`, {
                model: mdl,
                messages: [
                  { role: 'system', content: systemPrompt + jsonInstruction },
                  { role: 'user',   content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
              }, { Authorization: `Bearer ${apiKey}`, 'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'Automato Studio' })
              if (result.status !== 200) {
                const msg = result.body?.error?.message || JSON.stringify(result.body)
                fail(res, `OpenRouter ${result.status}: ${msg}`); return
              }
              rawText = result.body?.choices?.[0]?.message?.content || ''
            } else {
              fail(res, `Unknown provider: ${prov}`); return
            }

            // Strip fences in case model ignores the instruction
            rawText = rawText.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim()
            // Extract first JSON object if there's surrounding text
            const match = rawText.match(/\{[\s\S]*\}/)
            if (!match) { fail(res, 'No JSON object found in AI response'); return }
            // Use jsonrepair as a safety net for truncated/malformed output
            const repairedRaw = jsonrepair(match[0])
            const spec = JSON.parse(repairedRaw)
            ok(res, { success: true, spec })
          } catch (err) { fail(res, err) }

        // ── Chat with AI (iterative edits) ────────────────────────────────
        } else if (url === '/api/chat' && req.method === 'POST') {
          try {
            let { apiKey, provider, model, messages, currentSpec } = JSON.parse(await readBody(req))
            if (!apiKey) { fail(res, 'No API key provided'); return }
            apiKey = apiKey.trim()

            // ── ⚡ PROGRAMMATIC BULK COMMANDS (no AI needed) ─────────────────
            // Intercept bulk operations and execute them in code to avoid hallucination
            const userCmd: string = (messages[messages.length - 1]?.content || '').trim()

            // ── Resolve full timeline: if currentSpec only has 'includes', load all part files ──
            const projectRoot = getProjectRoot(getCurrentProject())
            let mergedTimeline: any[] | null = null
            let partFilesMap: { file: string, timeline: any[] }[] = []

            if (currentSpec?.includes?.length > 0) {
              // video_spec.json with part file references — load and merge all parts
              for (const partFile of currentSpec.includes) {
                const partPath = path.resolve(projectRoot, partFile)
                if (fs.existsSync(partPath)) {
                  const partData = JSON.parse(fs.readFileSync(partPath, 'utf-8'))
                  partFilesMap.push({ file: partFile, timeline: partData.timeline || [] })
                }
              }
              mergedTimeline = partFilesMap.flatMap(p => p.timeline)
            } else if (currentSpec?.timeline) {
              mergedTimeline = currentSpec.timeline
            }

            if (mergedTimeline) {
              // Build a working spec with the merged timeline
              const spec: any = { ...currentSpec, timeline: JSON.parse(JSON.stringify(mergedTimeline)) }
              const ANIMALS = ['beaver','bee','bunny','cat','caterpillar','chick','cow','crab','deer','dog','elephant','fish','fox','giraffe','hog','koala','lion','monkey','panda','parrot','penguin','pig','polar','tiger']
              const POSES   = ['idle','walk','run','dance','eat','gesture-positive','gesture-negative']

              // Helper to save changes back to original part files (or single file)
              const saveChangesBack = (updatedTimeline: any[]) => {
                if (partFilesMap.length > 0) {
                  // Re-distribute scenes back into the part files
                  let offset = 0
                  for (const part of partFilesMap) {
                    const count = part.timeline.length
                    part.timeline = updatedTimeline.slice(offset, offset + count)
                    offset += count
                    const partPath = path.resolve(projectRoot, part.file)
                    fs.writeFileSync(partPath, JSON.stringify({ timeline: part.timeline }, null, 2), 'utf-8')
                  }
                }
                // Return the full merged spec for the editor to load
                return { ...spec, timeline: updatedTimeline }
              }
              const BACKGROUNDS = ['classroom_bg.png','forest_bg.png','kitchen_bg.png','space_bg.png','ocean_bg.png','garden_bg.png','math_bg.png','desert_bg.png']
              const cmd = userCmd.toLowerCase()

              // Keyword detection — flexible, order-independent
              const mentionedAnimal  = ANIMALS.find(a => cmd.includes(a))
              const mentionedPose    = POSES.find(p => cmd.includes(p))
              const mentionedBg      = BACKGROUNDS.find(b => cmd.includes(b.replace('.png','').replace(/_/g,' ')) || cmd.includes(b.replace('.png','').replace('_bg','').replace(/_/g,' ')))
              const isBulk           = /\b(all|every|each|entire)\b/.test(cmd)
              const isAdd            = /\b(add|include|put|place|show|give|bring|insert)\b/.test(cmd)
              const isRemove         = /\b(remove|delete|hide|take out|get rid)\b/.test(cmd)
              const isChangePose     = /\b(pose|animation|animate|make.*do|doing)\b/.test(cmd)
              const isChangeBg       = /\b(background|bg|backdrop|scene background)\b/.test(cmd)
              const isContextual     = /\b(context|natural|smart|intelligent|appropriate|based on|according to|different|vary|various|each scene|per scene)\b/.test(cmd)

              // ── SMART ADD: context-aware poses per scene (uses AI minimally) ─
              // Triggered when user wants different poses per scene based on content
              if (mentionedAnimal && isAdd && (isBulk || cmd.includes('scene')) && isContextual) {
                // Only send a tiny scene summary to the AI — NOT the full spec
                const sceneSummaries = spec.timeline.map((s: any, i: number) => ({
                  index: i,
                  id: s.stepId,
                  subtitle: s.subtitle || '',
                  text: (s.textOverlays || []).map((t: any) => t.text).join(', ')
                }))
                // Ask for {"poses":[...]} format — compatible with Groq json_object mode
                const posePick = `You are a children's video animator. Pick the best pose for a "${mentionedAnimal}" character in each scene.

Available poses: idle, walk, run, dance, eat, gesture-positive, gesture-negative

Scenes (${sceneSummaries.length} total):
${sceneSummaries.map((s:any) => `${s.index+1}. [${s.id}] "${s.subtitle}" ${s.text ? '| text: '+s.text : ''}`).join('\n')}

Respond with exactly this JSON format: {"poses": ["pose1", "pose2", ...]} — one pose per scene in order, ${sceneSummaries.length} total.`

                let poseListText = ''
                try {
                  const prov2 = provider || 'groq'
                  let poseResult: any
                  if (prov2 === 'groq') {
                    poseResult = await httpsPost('https://api.groq.com/openai/v1/chat/completions', {
                      model: model || 'llama-3.3-70b-versatile',
                      messages: [{ role: 'user', content: posePick }],
                      temperature: 0.2,
                      max_tokens: 500,
                      response_format: { type: 'json_object' } // returns {"poses":[...]} which is compatible
                    }, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
                    poseListText = poseResult.body?.choices?.[0]?.message?.content || ''
                  } else if (prov2 === 'gemini') {
                    const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`
                    poseResult = await httpsPost(gemUrl, { contents: [{ parts: [{ text: posePick }] }] })
                    poseListText = poseResult.body?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                  } else {
                    poseResult = await httpsPost('https://openrouter.ai/api/v1/chat/completions', {
                      model: model || 'meta-llama/llama-3.1-8b-instruct:free',
                      messages: [{ role: 'user', content: posePick }],
                      temperature: 0.3,
                      max_tokens: 300
                    }, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://automato.app' })
                    poseListText = poseResult.body?.choices?.[0]?.message?.content || ''
                  }

                  // Parse the pose array — handle {"poses":[...]} or bare array
                  poseListText = poseListText.replace(/```json|```/gi,'').trim()
                  let poses: string[] = []
                  const parsed = JSON.parse(jsonrepair(poseListText))
                  if (Array.isArray(parsed)) {
                    poses = parsed
                  } else {
                    // Find the first array value in the object (handles {"poses":[...]} or any key)
                    const arrVal = Object.values(parsed).find((v: any) => Array.isArray(v))
                    poses = (arrVal as string[]) || []
                  }
                  // Ensure we have exactly the right number of poses
                  while (poses.length < spec.timeline.length) poses.push('idle')

                  // Inject character with AI-picked pose into each scene
                  let count = 0
                  const updatedTl = spec.timeline.map((scene: any, i: number) => {
                    if (!scene.characters) scene.characters = []
                    const already = scene.characters.some((c: any) => c.type === mentionedAnimal)
                    const chosenPose = POSES.includes(poses[i]) ? poses[i] : 'idle'
                    if (!already) { scene.characters.push({ type: mentionedAnimal, pose: chosenPose, actions: [] }); count++ }
                    else { scene.characters = scene.characters.map((c: any) => c.type === mentionedAnimal ? { ...c, pose: chosenPose } : c) }
                    return scene
                  })
                  const finalSpec = saveChangesBack(updatedTl)
                  ok(res, { success: true, type: 'spec', spec: finalSpec, reply: `✅ Added **${mentionedAnimal}** to ${count} scene(s) with context-aware poses:\n${poses.slice(0,updatedTl.length).map((p:string,i:number) => `• Scene ${i+1}: **${p}**`).join('\n')}` }); return
                } catch (e: any) {
                  // If AI fails for pose picking, fall back to idle
                  const fallbackTl = spec.timeline.map((scene: any) => {
                    if (!scene.characters) scene.characters = []
                    const already = scene.characters.some((c: any) => c.type === mentionedAnimal)
                    if (!already) scene.characters.push({ type: mentionedAnimal, pose: 'idle', actions: [] })
                    return scene
                  })
                  const finalSpec = saveChangesBack(fallbackTl)
                  ok(res, { success: true, type: 'spec', spec: finalSpec, reply: `✅ Added **${mentionedAnimal}** to all scenes (pose AI fallback: idle). Error: ${e.message}` }); return
                }
              }

              // ── ADD character to all scenes (same pose) ───────────────────
              if (mentionedAnimal && isAdd && (isBulk || cmd.includes('scene'))) {
                let count = 0
                const addedTl = spec.timeline.map((scene: any) => {
                  if (!scene.characters) scene.characters = []
                  const already = scene.characters.some((c: any) => c.type === mentionedAnimal)
                  if (!already) { scene.characters.push({ type: mentionedAnimal, pose: mentionedPose || 'idle', actions: [] }); count++ }
                  return scene
                })
                ok(res, { success: true, type: 'spec', spec: saveChangesBack(addedTl), reply: `✅ Added **${mentionedAnimal}** (pose: ${mentionedPose || 'idle'}) to ${count} scene(s). Done instantly!` }); return
              }

              // ── REMOVE character from all scenes ──────────────────────────
              if (mentionedAnimal && isRemove && (isBulk || cmd.includes('scene'))) {
                let count = 0
                const removedTl = spec.timeline.map((scene: any) => {
                  const before = (scene.characters || []).length
                  scene.characters = (scene.characters || []).filter((c: any) => c.type !== mentionedAnimal)
                  if (scene.characters.length < before) count++
                  return scene
                })
                ok(res, { success: true, type: 'spec', spec: saveChangesBack(removedTl), reply: `✅ Removed **${mentionedAnimal}** from ${count} scene(s). Done instantly!` }); return
              }

              // ── CHANGE POSE of character in all scenes ────────────────────
              if (mentionedAnimal && mentionedPose && isChangePose && (isBulk || cmd.includes('scene'))) {
                let count = 0
                const posedTl = spec.timeline.map((scene: any) => {
                  scene.characters = (scene.characters || []).map((c: any) => {
                    if (c.type === mentionedAnimal) { c.pose = mentionedPose; count++ }
                    return c
                  })
                  return scene
                })
                ok(res, { success: true, type: 'spec', spec: saveChangesBack(posedTl), reply: `✅ Changed **${mentionedAnimal}**'s pose to **${mentionedPose}** in ${count} scene(s). Done instantly!` }); return
              }

              // ── CHANGE BACKGROUND in all scenes ───────────────────────────
              if (mentionedBg && isChangeBg && (isBulk || cmd.includes('scene'))) {
                const bgFile = BACKGROUNDS.find(b => b.includes(mentionedBg.replace(' ','_'))) || mentionedBg + '.png'
                spec.timeline = spec.timeline.map((scene: any) => {
                  if (!scene.environment) scene.environment = {}
                  scene.environment.background = bgFile
                  return scene
                })
                ok(res, { success: true, type: 'spec', spec, reply: `✅ Changed background to **${bgFile}** in all ${spec.timeline.length} scenes. Done instantly without AI!` }); return
              }
            }
            // ── End of programmatic bulk commands ────────────────────────────
            // (if none matched, falls through to AI below)

            let systemPrompt = ''
            if (fs.existsSync(AI_PROMPT)) systemPrompt = fs.readFileSync(AI_PROMPT, 'utf-8')

            const prov = provider || 'groq'
            const lastUserMsg: string = (messages[messages.length - 1]?.content || '').toLowerCase()

            // ── Surgical scene edit: detect if user is editing a specific scene
            // Extract "scene N" or "scene_id" references from user message
            let targetSceneIndex = -1
            if (currentSpec?.timeline) {
              const sceneNumMatch = lastUserMsg.match(/scene[\s_-]*(\d+)/i)
              if (sceneNumMatch) {
                const idx = parseInt(sceneNumMatch[1]) - 1
                if (idx >= 0 && idx < currentSpec.timeline.length) targetSceneIndex = idx
              }
              // also match by stepId keyword
              if (targetSceneIndex === -1) {
                currentSpec.timeline.forEach((s: any, i: number) => {
                  if (s.stepId && lastUserMsg.includes(s.stepId.toLowerCase())) targetSceneIndex = i
                })
              }
            }

            let replyText = ''

            // ── If editing a single scene, only send that scene to the AI ──
            if (targetSceneIndex !== -1 && currentSpec?.timeline) {
              const targetScene = currentSpec.timeline[targetSceneIndex]
              const sceneEditSys = (systemPrompt || '') +
                `\n\nYou are a surgical JSON editor. The user wants to modify ONLY scene ${targetSceneIndex + 1} of their video.` +
                `\n\nThe CURRENT scene JSON is:\n${JSON.stringify(targetScene, null, 2)}` +
                `\n\nYour job: apply the user's requested change and return ONLY the updated scene object as raw JSON. No explanation, no markdown fences, just the JSON object.`

              const sceneMessages = [
                { role: 'system', content: sceneEditSys },
                ...messages
              ]

              let result: any
              if (prov === 'groq') {
                result = await httpsPost('https://api.groq.com/openai/v1/chat/completions', {
                  model: model || 'llama-3.3-70b-versatile',
                  messages: sceneMessages,
                  temperature: 0.1,
                  max_tokens: 2000,
                  response_format: { type: 'json_object' }
                }, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
                if (result.status !== 200) { fail(res, `Groq ${result.status}: ${result.body?.error?.message}`); return }
                replyText = result.body?.choices?.[0]?.message?.content || ''
              } else if (prov === 'gemini') {
                const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`
                result = await httpsPost(gemUrl, { contents: [{ role: 'user', parts: [{ text: sceneEditSys + '\n\nUser: ' + messages[messages.length-1]?.content }] }] })
                if (result.status !== 200) { fail(res, `Gemini error: ${result.body?.error?.message}`); return }
                replyText = result.body?.candidates?.[0]?.content?.parts?.[0]?.text || ''
              } else {
                result = await httpsPost('https://openrouter.ai/api/v1/chat/completions', {
                  model: model || 'meta-llama/llama-3.1-8b-instruct:free',
                  messages: sceneMessages,
                  temperature: 0.1,
                  max_tokens: 2000
                }, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://automato.app' })
                if (result.status !== 200) { fail(res, `OpenRouter error: ${result.body?.error?.message}`); return }
                replyText = result.body?.choices?.[0]?.message?.content || ''
              }

              // Parse the updated scene and re-inject into the original spec
              replyText = replyText.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim()
              const sceneMatch = replyText.match(/\{[\s\S]*\}/)
              if (sceneMatch) {
                try {
                  const updatedScene = JSON.parse(jsonrepair(sceneMatch[0]))
                  const updatedSpec = JSON.parse(JSON.stringify(currentSpec)) // deep clone
                  updatedSpec.timeline[targetSceneIndex] = updatedScene
                  ok(res, { success: true, type: 'spec', spec: updatedSpec, reply: `✅ Scene ${targetSceneIndex + 1} updated surgically.` }); return
                } catch { /* fall through to full spec mode */ }
              }
            }

            // ── Full spec edit (no specific scene detected) ──────────────────
            const specContext = currentSpec
              ? `\n\nThe user's CURRENT video spec is:\n${JSON.stringify(currentSpec, null, 2)}` +
                `\n\nCRITICAL: Return the ENTIRE, COMPLETE JSON spec with your changes applied. Every single scene must be present. No placeholders, no truncation. Raw JSON only.`
              : ''

            const sysMsg = (systemPrompt || '') + specContext

            if (prov === 'gemini') {
              const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`
              const contents = [
                { role: 'user', parts: [{ text: sysMsg + '\n\n---\n\n' + messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') }] }
              ]
              const result = await httpsPost(gemUrl, { contents })
              if (result.status !== 200) { fail(res, `Gemini error: ${result.body?.error?.message}`); return }
              replyText = result.body?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            } else {
              const apiMessages = [
                { role: 'system', content: sysMsg },
                ...messages
              ]
              let url2 = '', headers2: any = {}, body2: any = {}
              if (prov === 'groq') {
                url2 = 'https://api.groq.com/openai/v1/chat/completions'
                headers2 = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                body2 = { model: model || 'llama-3.3-70b-versatile', messages: apiMessages, temperature: 0.1, max_tokens: 8000, response_format: { type: 'json_object' } }
              } else {
                url2 = 'https://openrouter.ai/api/v1/chat/completions'
                headers2 = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://automato.app' }
                body2 = { model: model || 'meta-llama/llama-3.1-8b-instruct:free', messages: apiMessages, temperature: 0.1, max_tokens: 8000 }
              }
              const result = await httpsPost(url2, body2, headers2)
              if (result.status !== 200) { fail(res, `API error (${result.status}): ${result.body?.error?.message}`); return }
              replyText = result.body?.choices?.[0]?.message?.content || ''
            }

            // Parse the reply — try JSON first, fall back to text
            replyText = replyText.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim()
            const jsonMatch = replyText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                const spec = JSON.parse(jsonrepair(jsonMatch[0]))
                if (spec.meta && spec.timeline) {
                  ok(res, { success: true, type: 'spec', spec, reply: replyText }); return
                }
              } catch { /* not valid JSON, treat as text */ }
            }
            ok(res, { success: true, type: 'text', reply: replyText })
          } catch (err) { fail(res, err) }

        // ── Generate TTS via edge-tts ──────────────────────────────────────
        } else if (url === '/api/gen-tts' && req.method === 'POST') {
          try {
            const { text, filename, voice } = JSON.parse(await readBody(req))
            if (!text || !filename) { fail(res, 'Missing text or filename'); return }
            const pub = path.resolve(getProjectRoot(getCurrentProject()), 'public')
            fs.mkdirSync(pub, { recursive: true })
            const outPath   = path.resolve(pub, filename)
            const v         = voice || 'en-US-AriaNeural'
            const tmpScript = path.resolve(AUTOMATO_ROOT, '_tts_tmp.py')
            fs.writeFileSync(tmpScript, [
              'import asyncio, edge_tts, subprocess, os',
              `async def main():`,
              `    c = edge_tts.Communicate(${JSON.stringify(text)}, ${JSON.stringify(v)})`,
              `    tmp = ${JSON.stringify(outPath)} + '.mp3'`,
              `    await c.save(tmp)`,
              `    subprocess.run(['ffmpeg', '-y', '-i', tmp, '-c:a', 'pcm_s16le', ${JSON.stringify(outPath)}], check=True, capture_output=True)`,
              `    os.remove(tmp)`,
              `    print('done')`,
              `asyncio.run(main())`,
            ].join('\n'))
            execSync(`python "${tmpScript}"`, { timeout: 30000 })
            if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)
            ok(res, { success: true, filename })
          } catch (err) { fail(res, err) }

        // ── Generate image via Gemini Imagen 3 ────────────────────────────
        } else if (url === '/api/gen-image' && req.method === 'POST') {
          try {
            const { apiKey, prompt, filename, removeBackground } = JSON.parse(await readBody(req))
            if (!apiKey || !prompt || !filename) { fail(res, 'Missing apiKey, prompt or filename'); return }

            const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`
            const result = await httpsPost(imgUrl, {
              instances: [{ prompt }],
              parameters: { sampleCount: 1 }
            })

            if (result.status !== 200) {
              const errMsg = typeof result.body === 'object'
                ? (result.body?.error?.message || JSON.stringify(result.body))
                : String(result.body)
              fail(res, `Imagen API error (${result.status}): ${errMsg}`); return
            }

            const b64 = result.body?.predictions?.[0]?.bytesBase64Encoded
            if (!b64) { fail(res, 'No image data returned by Imagen'); return }

            const pub     = path.resolve(getProjectRoot(getCurrentProject()), 'public')
            fs.mkdirSync(pub, { recursive: true })
            const outPath = path.resolve(pub, filename)
            fs.writeFileSync(outPath, Buffer.from(b64, 'base64'))

            if (removeBackground) {
              const tmpScript = path.resolve(AUTOMATO_ROOT, '_rmbg_tmp.py')
              fs.writeFileSync(tmpScript, [
                'from PIL import Image',
                'import numpy as np',
                `img = Image.open(${JSON.stringify(outPath)}).convert('RGBA')`,
                'data = np.array(img)',
                'mask = (data[:,:,0] > 200) & (data[:,:,1] > 200) & (data[:,:,2] > 200)',
                'data[mask, 3] = 0',
                `Image.fromarray(data).save(${JSON.stringify(outPath)})`,
                "print('done')",
              ].join('\n'))
              execSync(`python "${tmpScript}"`, { timeout: 15000 })
              if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)
            }
            ok(res, { success: true, filename })
          } catch (err) { fail(res, err) }

        // ── List public assets ─────────────────────────────────────────────
        } else if (url === '/api/list-assets' && req.method === 'GET') {
          try {
            const pub = path.resolve(getProjectRoot(getCurrentProject()), 'public')
            fs.mkdirSync(pub, { recursive: true })
            const files = fs.readdirSync(pub).filter(f =>
              /\.(wav|mp3|png|jpg|jpeg|gif|webp)$/i.test(f)
            )
            ok(res, { success: true, files })
          } catch (err) { fail(res, err) }

        // ── Compile pipeline ───────────────────────────────────────────────
        } else if (url === '/api/compile' && req.method === 'POST') {
          try {
            const projectName = getCurrentProject()
            const root        = getProjectRoot(projectName)
            const scriptPath  = path.resolve(AUTOMATO_ROOT, 'compile_pipeline.py')
            const output      = execSync(
              `python "${scriptPath}" --project "${root}"`,
              { cwd: AUTOMATO_ROOT, timeout: 120000 }
            ).toString()
            ok(res, { success: true, output })
          } catch (err: any) {
            fail(res, err?.stderr?.toString() || err?.stdout?.toString() || err)
          }

        // ── Git push ───────────────────────────────────────────────────────
        } else if (url === '/api/git-push' && req.method === 'POST') {
          try {
            execSync('git add -A', { cwd: AUTOMATO_ROOT })
            execSync('git commit -m "Auto: update from block editor" --allow-empty', { cwd: AUTOMATO_ROOT })
            execSync('git push', { cwd: AUTOMATO_ROOT })
            ok(res, { success: true })
          } catch (err) { fail(res, err) }

        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), automotoPlugin()],
  server: { port: 5173 }
})
