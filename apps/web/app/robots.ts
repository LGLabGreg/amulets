import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/new', '/cli-auth'],
    },
    sitemap: 'https://amulets.dev/sitemap.xml',
  }
}
