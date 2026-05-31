import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { requireAuth } from './middleware/auth.middleware';
import { requireRole } from './middleware/rbac.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Mock routes for Phase 5 RBAC Testing
app.get('/api/mock/protected', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({ message: 'Success', user: req.user });
});

app.post('/api/mock/admin-only', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({ message: 'Admin access granted', user: req.user });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
