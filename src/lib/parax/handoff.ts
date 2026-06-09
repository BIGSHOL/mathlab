import crypto from 'crypto';

/**
 * mathlab → para-x 핸드오프 토큰 발급.
 * para-x 의 lib/handoff.js(verifyHandoffToken)와 정확히 동일한 알고리즘이어야 한다:
 *   token = base64url(JSON{tenantId,userId,role,exp}) + "." + base64url(HMAC_SHA256(payloadB64, HANDOFF_SHARED_SECRET))
 * exp 는 ms 타임스탬프. 기본 TTL 10분.
 */
export function mintHandoffToken(
  payload: { tenantId: string; userId: string; role: string },
  ttlMs = 10 * 60 * 1000,
): string {
  const secret = process.env.HANDOFF_SHARED_SECRET;
  if (!secret) throw new Error('HANDOFF_SHARED_SECRET 미설정');
  const body = { ...payload, exp: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/** para-x 체크아웃 URL(서명 토큰 포함) 생성. */
export function paraxCheckoutUrl(
  product: string,
  payload: { tenantId: string; userId: string; role: string },
): string {
  const base = process.env.NEXT_PUBLIC_PARAX_CHECKOUT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_PARAX_CHECKOUT_URL 미설정');
  const token = mintHandoffToken(payload);
  return `${base}?product=${encodeURIComponent(product)}&token=${encodeURIComponent(token)}`;
}
