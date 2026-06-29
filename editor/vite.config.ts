import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { execSync } from 'child_process'

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
            const { apiKey, prompt, provider, model } = JSON.parse(await readBody(req))
            if (!apiKey) { fail(res, 'No API key provided. Open ⚙️ Settings to add one.'); return }
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
              // ── Groq (OpenAI-compatible) ──────────────────────────────────
              const mdl    = model || 'llama-3.3-70b-versatile'
              const result = await httpsPost(`https://api.groq.com/openai/v1/chat/completions`, {
                model: mdl,
                messages: [
                  { role: 'system', content: systemPrompt + jsonInstruction },
                  { role: 'user',   content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 8192,
                response_format: { type: 'json_object' }
              }, { Authorization: `Bearer ${apiKey}` })
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
                max_tokens: 8192
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
            const spec = JSON.parse(match[0])
            ok(res, { success: true, spec })
          } catch (err) { fail(res, err) }

        // ── Chat with AI (iterative edits) ────────────────────────────────
        } else if (url === '/api/chat' && req.method === 'POST') {
          try {
            const { apiKey, provider, model, messages, currentSpec } = JSON.parse(await readBody(req))
            if (!apiKey) { fail(res, 'No API key provided'); return }

            let systemPrompt = ''
            if (fs.existsSync(AI_PROMPT)) systemPrompt = fs.readFileSync(AI_PROMPT, 'utf-8')

            const specContext = currentSpec
              ? `\n\nThe user's CURRENT video spec is:\n\`\`\`json\n${JSON.stringify(currentSpec, null, 2)}\n\`\`\`\n\nIf the user asks you to make changes, return the COMPLETE updated spec as raw JSON (no markdown fences). If the user is just asking a question or chatting, reply in plain text.`
              : ''

            const sysMsg = systemPrompt + specContext

            const prov = provider || 'groq'
            let replyText = ''

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
                url2 = `https://api.groq.com/openai/v1/chat/completions`
                headers2 = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                body2 = { model: model || 'llama-3.3-70b-versatile', messages: apiMessages, max_tokens: 8192 }
              } else {
                url2 = 'https://openrouter.ai/api/v1/chat/completions'
                headers2 = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://automato.app' }
                body2 = { model: model || 'meta-llama/llama-3.1-8b-instruct:free', messages: apiMessages, max_tokens: 8192 }
              }
              const result = await httpsPost(url2, body2, headers2)
              if (result.status !== 200) { fail(res, `API error (${result.status}): ${result.body?.error?.message}`); return }
              replyText = result.body?.choices?.[0]?.message?.content || ''
            }

            // Check if the reply contains a JSON spec
            const jsonMatch = replyText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                const spec = JSON.parse(jsonMatch[0])
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
