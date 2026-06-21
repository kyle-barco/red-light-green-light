import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: object; expiry: number }>()
const CACHE_TTL = 3_600_000

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')
  const q = req.nextUrl.searchParams.get('q')

  if (!lat && !lon && !q) {
    return NextResponse.json({ error: 'Provide lat/lon or q' }, { status: 400 })
  }

  const cacheKey = q ? `q:${q}` : `g:${lat},${lon}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: { 'X-Cache': 'HIT' },
    })
  }

  let url: string
  if (q) {
    url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`
  } else {
    url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ilLUMENate/1.0 (municipal lighting map)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocode failed' }, { status: res.status })
    }
    const data = await res.json()
    cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL })
    return NextResponse.json(data, {
      status: 200,
      headers: { 'X-Cache': 'MISS' },
    })
  } catch {
    return NextResponse.json({ error: 'Geocode API unreachable' }, { status: 502 })
  }
}
