/**
 * Server-side proxy for the Lasso API.
 * Routes all /api/lasso/* requests through the Nitro server so the browser
 * never hits test1.lasso.io directly, eliminating CORS issues.
 *
 * The client forwards credentials via headers:
 *   LASSO-APIKEY      – the user's Lasso API key
 *   X-Lasso-Base-URL  – the Lasso base URL (e.g. https://test1.lasso.io/api/v1)
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const method = getMethod(event)

  const apiKey =
    getHeader(event, 'lasso-apikey') ??
    process.env.LASSO_API_KEY ??
    ''

  const baseUrl = (
    getHeader(event, 'x-lasso-base-url') ??
    process.env.LASSO_BASE_URL ??
    'https://test1.lasso.io/api/v1'
  ).replace(/\/$/, '')

  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'Missing LASSO-APIKEY' })
  }

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))
  ).toString()

  const url = `${baseUrl}/${path}${qs ? '?' + qs : ''}`

  const contentType = getHeader(event, 'content-type') ?? 'application/json'
  const isFormEncoded = contentType.includes('application/x-www-form-urlencoded')

  let body: string | Record<string, any> | undefined
  if (['GET', 'HEAD'].includes(method)) {
    body = undefined
  } else if (isFormEncoded) {
    // Read raw text so the form payload is forwarded to Lasso exactly as-is.
    body = await readRawBody(event, 'utf-8')
  } else {
    body = await readBody(event)
  }

  return await $fetch(url, {
    method: method as Parameters<typeof $fetch>[1]['method'],
    headers: {
      'LASSO-APIKEY': apiKey,
      'Content-Type': contentType,
    },
    body,
  })
})
