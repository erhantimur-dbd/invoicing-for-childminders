import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/signup',
          '/login',
          '/subscribe',
          '/support',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard',
          '/children',
          '/invoices',
          '/expenses',
          '/reports',
          '/profile',
          '/onboarding',
          '/admin',
          '/api',
          '/invoice/',
          '/subscribe/success',
        ],
      },
    ],
    sitemap: 'https://www.dottie.cloud/sitemap.xml',
    host: 'https://www.dottie.cloud',
  }
}
