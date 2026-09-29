import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.godottie.cloud'

/** Public-page revision. Bump when indexed URLs change — do not use request time. */
const LAST_MODIFIED = '2026-09-24'

const PAGES: Array<{
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/signup', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/subscribe', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/guides', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/guides/mtd', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/guides/funded-hours', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/guides/funded-hours/2026-invoice-rules', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/guides/funded-hours/30-hours-9-month-rollout-2025', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? BASE_URL : `${BASE_URL}${path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency,
    priority,
  }))
}
