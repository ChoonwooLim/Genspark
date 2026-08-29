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
  logoType?: string
  palette?: string
  style?: string
  originality?: 'safe' | 'balanced' | 'bold'
  avoid?: string
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

function buildPrompt({
  prompt,
  brandName,
  logoType,
  palette,
  style,
  originality,
  avoid,
}: GenerateLogoRequest) {
  const cleanPrompt = prompt?.trim() || ''
  const cleanName = brandName?.trim() || ''
  const cleanType = logoType?.trim() || 'standalone abstract symbol with no lettering'
  const cleanPalette = palette?.trim() || 'a distinctive color palette selected for this new brand'
  const cleanStyle = style?.trim() || 'minimal flat geometric identity'
  const cleanAvoid = avoid?.trim() || ''
  const originalityDirection = originality === 'safe'
    ? 'Keep the concept clear and commercially safe, while remaining original.'
    : originality === 'balanced'
      ? 'Balance immediate readability with a distinctive original concept.'
      : 'Explore a bold, unexpected concept with a silhouette unlike common technology logos.'

  return [
    'Start from a blank slate and create one entirely new professional brand identity logo.',
    'Do not imitate, reconstruct, or reuse the existing PLAZION logo, its purple metallic treatment, Z-flame silhouette, wing shape, voxel styling, or any logo that may be visible elsewhere in the product interface.',
    `New brand name: "${cleanName}". Never write "PLAZION" unless that is exactly the new brand name.`,
    `Logo construction: ${cleanType}.`,
    `Design language: ${cleanStyle}.`,
    `Color direction: ${cleanPalette}.`,
    originalityDirection,
    cleanPrompt ? `Brand brief: ${cleanPrompt}` : '',
    cleanAvoid ? `Strictly avoid: ${cleanAvoid}.` : '',
    'Create a flat logo asset, not a VFX frame. No glow, no metallic 3D extrusion, no animation effects, no mockup, no paper, no wall, no extra objects.',
    'Use a centered composition, crisp silhouette, production-ready edges, and a fully transparent background.',
    'Return one square logo image with transparent alpha. Preserve the exact new brand spelling only when the chosen logo construction includes lettering.',
  ].filter(Boolean).join(' ')
}

function hasValidStudioToken(c: Context, config: GensparkConfig) {
  const env = c.env as Record<string, string | undefined> | undefined
  const requiredAccessToken = config.accessToken || env?.STUDIO_ADMIN_TOKEN
  return !requiredAccessToken || c.req.header('X-Studio-Token') === requiredAccessToken
}

function isAllowedGensparkHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized === 'genspark.ai' || normalized.endsWith('.genspark.ai')
}

export async function importGensparkImage(
  c: Context,
  config: GensparkConfig,
) {
  if (!hasValidStudioToken(c, config)) {
    return c.json({
      error: 'Genspark 결과 가져오기 접근 코드가 필요합니다.',
      code: 'STUDIO_AUTH_REQUIRED',
    }, 401)
  }

  const body = await c.req.json<{ url?: string }>().catch(() => null)
  if (!body?.url) return c.json({ error: 'Genspark 이미지 주소를 입력해 주세요.' }, 400)

  let sourceUrl: URL
  try {
    sourceUrl = new URL(body.url.trim())
  } catch {
    return c.json({ error: '올바른 Genspark 이미지 주소가 아닙니다.' }, 400)
  }

  if (sourceUrl.protocol !== 'https:' || !isAllowedGensparkHost(sourceUrl.hostname)) {
    return c.json({
      error: '보안을 위해 https://*.genspark.ai 이미지 주소만 가져올 수 있습니다.',
      code: 'GENSPARK_URL_NOT_ALLOWED',
    }, 400)
  }

  const env = c.env as Record<string, string | undefined> | undefined
  const apiKey = config.apiKey || env?.GSK_API_KEY
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60 * 1000)

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'image/png,image/webp,image/jpeg,image/svg+xml;q=0.8,*/*;q=0.1',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
      // Do not follow redirects: an allowed Genspark URL must not be able to
      // redirect the server-side proxy to an untrusted/internal destination.
      redirect: 'manual',
      signal: controller.signal,
    })

    if (response.status === 401 || response.status === 403) {
      return c.json({
        error: '이 링크는 Genspark 로그인 세션이 필요한 비공개 공유 링크입니다. 생성 결과에서 “이미지 주소 복사”로 얻은 직접 이미지 주소를 사용하거나 이미지를 다운로드해 업로드해 주세요.',
        code: 'GENSPARK_LINK_PRIVATE',
      }, 422)
    }
    if (!response.ok) {
      return c.json({ error: `Genspark 이미지를 가져오지 못했습니다. (${response.status})` }, 502)
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!contentType.startsWith('image/')) {
      return c.json({
        error: '입력한 주소가 이미지 파일이 아닙니다. Genspark 결과 이미지에서 “이미지 주소 복사”를 사용해 주세요.',
        code: 'GENSPARK_URL_NOT_IMAGE',
      }, 422)
    }

    const declaredSize = Number(response.headers.get('content-length') || 0)
    if (declaredSize > 20 * 1024 * 1024) {
      return c.json({ error: '가져올 이미지는 20MB 이하여야 합니다.' }, 413)
    }

    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 20 * 1024 * 1024) {
      return c.json({ error: '가져올 이미지는 20MB 이하여야 합니다.' }, 413)
    }

    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
        'X-Imported-From': sourceUrl.hostname,
      },
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Genspark 이미지 가져오기 시간이 초과되었습니다.'
      : 'Genspark 이미지 가져오기 중 오류가 발생했습니다.'
    return c.json({ error: message }, 502)
  } finally {
    clearTimeout(timeout)
  }
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
