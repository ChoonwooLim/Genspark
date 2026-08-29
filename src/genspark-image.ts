import type { Context } from 'hono'

const ALLOWED_MODELS = new Set([
  'nano-banana-2-flash-lite',
  'nano-banana-2',
  'nano-banana-pro',
  'gpt-image-2',
  'qwen-image-3',
  'fal-ai/bytedance/seedream/v5/lite',
  'fal-ai/bytedance/seedream/v5/pro',
  'xai/grok-imagine-image',
])

export type GensparkConfig = {
  apiKey?: string
  baseUrl?: string
  accessToken?: string
}

type GenerateLogoRequest = {
  prompt?: string
  brandName?: string
  style?: string
  model?: string
}

function parseFinalResult(raw: string) {
  let result: unknown = null
  for (const line of raw.trim().split('\n')) {
    const value = line.trim()
    if (!value.startsWith('{')) continue
    try {
      const parsed = JSON.parse(value)
      if (parsed.status || parsed.version === undefined) result = parsed
    } catch {
      // Ignore heartbeat or malformed lines and continue to the final result.
    }
  }
  return result
}

function findImageUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    return /^https?:\/\//.test(value) && /(?:image|blob|file|cdn|storage|generated|output)/i.test(value)
      ? value
      : null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrl(item)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferredKeys = ['image_url', 'url', 'original_url', 'download_url', 'file_url']
    for (const key of preferredKeys) {
      const candidate = record[key]
      if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate
    }
    for (const candidate of Object.values(record)) {
      const found = findImageUrl(candidate)
      if (found) return found
    }
  }
  return null
}

function buildPrompt({ prompt, brandName, style }: GenerateLogoRequest) {
  const cleanPrompt = prompt?.trim() || ''
  const cleanName = brandName?.trim() || ''
  const cleanStyle = style?.trim() || 'minimal futuristic symbol'
  return [
    'Create one professional brand logo asset on a fully transparent background.',
    cleanName ? `Brand name: "${cleanName}".` : '',
    `Visual direction: ${cleanStyle}.`,
    cleanPrompt,
    'Centered composition, crisp silhouette, production-ready edges, no mockup, no paper, no wall, no extra objects.',
    'Return a square logo image with transparent alpha. Preserve exact brand text spelling if text is included.',
  ].filter(Boolean).join(' ')
}

export async function generateLogoWithGenspark(
  c: Context,
  config: GensparkConfig,
) {
  const env = c.env as Record<string, string | undefined> | undefined
  const requiredAccessToken = config.accessToken || env?.STUDIO_ADMIN_TOKEN
  if (requiredAccessToken && c.req.header('X-Studio-Token') !== requiredAccessToken) {
    return c.json({
      error: 'AI 생성 접근 코드가 필요합니다.',
      code: 'STUDIO_AUTH_REQUIRED',
    }, 401)
  }

  const body = await c.req.json<GenerateLogoRequest>().catch(() => null)
  if (!body) return c.json({ error: '올바른 생성 요청이 필요합니다.' }, 400)

  const prompt = buildPrompt(body)
  if (prompt.length < 30 || prompt.length > 4000) {
    return c.json({ error: '프롬프트 길이를 확인해 주세요.' }, 400)
  }

  const apiKey = config.apiKey || env?.GSK_API_KEY
  const baseUrl = (
    config.baseUrl ||
    env?.GSK_API_BASE_URL ||
    'https://www.genspark.ai'
  ).replace(/\/$/, '')

  if (!apiKey) {
    return c.json({
      error: 'Genspark AI 연결이 설정되지 않았습니다.',
      code: 'GENSPARK_NOT_CONFIGURED',
      setup: 'Orbitron 환경변수 GSK_API_KEY를 등록해 주세요.',
    }, 503)
  }

  const requestedModel = body.model || 'nano-banana-2-flash-lite'
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'nano-banana-2-flash-lite'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  try {
    const response = await fetch(`${baseUrl}/api/tool_cli/image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-GSK-CLI-Caps': 'streaming_v1',
      },
      body: JSON.stringify({
        query: prompt,
        model,
        image_urls: [],
        aspect_ratio: '1:1',
        image_size: '1k',
        task_summary: `Generate a transparent logo for ${body.brandName || 'a new brand'}`,
      }),
      signal: controller.signal,
    })

    const raw = await response.text()
    if (!response.ok) {
      return c.json({ error: `Genspark 생성 요청 실패 (${response.status})` }, 502)
    }

    const result = parseFinalResult(raw) as { status?: string; message?: string; data?: unknown } | null
    if (!result || result.status === 'error') {
      return c.json({ error: result?.message || 'Genspark에서 생성 결과를 받지 못했습니다.' }, 502)
    }

    const imageUrl = findImageUrl(result.data ?? result)
    if (!imageUrl) {
      return c.json({ error: '생성 결과에서 이미지 URL을 찾지 못했습니다.' }, 502)
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return c.json({ error: '생성 이미지를 가져오지 못했습니다.' }, 502)
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    const bytes = await imageResponse.arrayBuffer()
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Genspark-Model': model,
      },
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Genspark 이미지 생성 시간이 초과되었습니다.'
      : 'Genspark 이미지 생성 중 오류가 발생했습니다.'
    return c.json({ error: message }, 502)
  } finally {
    clearTimeout(timeout)
  }
}
