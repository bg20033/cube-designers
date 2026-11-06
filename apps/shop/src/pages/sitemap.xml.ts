import type { APIRoute } from 'astro'
import { getCatalog } from '../lib/catalog'
export const prerender = false
export const GET: APIRoute = async () => {
  const production = import.meta.env.SEO_DEPLOYMENT === 'production' || import.meta.env.VERCEL_ENV === 'production'
  const catalog = production ? await getCatalog() : []
  const paths = production ? ['/', '/foto', '/muri', '/smart-glass', ...catalog.filter((item) => !['foto', 'smart-film'].includes(item.id)).map((item) => `/${item.id}`)] : []
  const urls = [...new Set(paths)].map((path) => `<url><loc>https://shop.cube-designers.com${path}</loc></url>`).join('')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
