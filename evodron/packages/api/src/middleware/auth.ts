import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
}

export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { isAdmin?: boolean };
    if (!payload.isAdmin) {
      reply.code(403).send({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
    }
  } catch {
    reply.code(401).send({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
}
