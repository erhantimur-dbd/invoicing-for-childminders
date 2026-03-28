import { NextResponse } from 'next/server'

const BASE_URL = 'https://www.dottie.cloud'

const urls = [
  { loc: BASE_URL,                changefreq: 'weekly',  priority: '1.0' },
  { loc: `${BASE_URL}/signup`,    changefreq: 'monthly', priority: '0.9' },
  { loc: `${BASE_URL}/login`,     changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/subscribe`, changefreq: 'weekly',  priority: '0.8' },
  { loc: `${BASE_URL}/support`,   changefreq: 'monthly', priority: '0.6' },
  { loc: `${BASE_URL}/faq`,       changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/privacy`,   changefreq: 'yearly',  priority: '0.3' },
  { loc: `${BASE_URL}/terms`,     changefreq: 'yearly',  priority: '0.3' },
]

export async function GET() {
  const lastmod = new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
