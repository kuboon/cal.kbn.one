import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWeekRequest } from '../../lib/week';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const slug = req.query.slug;
  const segments = Array.isArray(slug) ? slug : typeof slug === 'string' ? [slug] : [];
  const { status, headers, body } = handleWeekRequest({ query: req.query, slugSegments: segments });
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.status(status);
  if (body !== undefined) {
    res.send(body);
  } else {
    res.end();
  }
}
