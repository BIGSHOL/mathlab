import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/lib/constants/site';

/**
 * /robots.txt
 *
 * 공개 대상은 랜딩(/)과 데모(/demo) 뿐이다.
 * 나머지는 로그인 뒤 화면이라 크롤러가 훑을 이유가 없다.
 * (/entitlements 계열은 307 로 자체 보호되지만, 크롤링 예산을
 *  랜딩·데모에 몰아주기 위해 여기서도 막는다)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/login',
          '/admin',
          '/billing',
          '/entitlements',
          '/exam-analysis',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
