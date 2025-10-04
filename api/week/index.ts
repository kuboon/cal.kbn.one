import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWeekRequest } from '../../lib/week';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const { status, headers, body } = handleWeekRequest({ query: req.query });
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
