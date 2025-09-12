// api/auth/validate.js
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../middleware/authMiddleware.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await authenticateUser(req);
  if (!authResult || authResult.status !== 200) {
    return res
      .status(authResult?.status || 401)
      .json({ error: authResult?.message || 'Unauthorized' });
  }

  const { user } = authResult;

  // Neues Token erstellen, um die Session zu verlängern
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isSupport: user.isSupport
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    data: {
      token,
      user
    }
  });
}