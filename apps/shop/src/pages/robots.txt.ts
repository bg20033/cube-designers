import type { APIRoute } from 'astro'
export const GET: APIRoute = () => {
  const production = import.meta.env.SEO_DEPLOYMENT === 'production' || import.meta.env.VERCEL_ENV === 'production'
  return new Response(production ? 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: https://shop.cube-designers.com/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
