import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWeekRequest } from './handler';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleWeekRequest(req, res);
}
