import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/lib/constants/site';

/**
 * /sitemap.xml
 *
 * 로그인 없이 볼 수 있고 검색 유입 가치가 있는 페이지만 넣는다.
 * lastModified 는 넣지 않는다. 빌드할 때마다 값이 바뀌면
 * 내용이 그대로인데도 갱신된 것처럼 보이기 때문이다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_ORIGIN}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/demo`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
