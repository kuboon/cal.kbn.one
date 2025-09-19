import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWeekRequest } from './handler';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = req.query.slug;
  const segments = Array.isArray(slug) ? slug : typeof slug === 'string' ? [slug] : [];
  await handleWeekRequest(req, res, segments);
}
