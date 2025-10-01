import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, due_date, status, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY due_date ASC, id DESC',
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('due_date').isISO8601().withMessage('due_date must be YYYY-MM-DD'),
    body('status').optional().isIn(['Pending', 'Completed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description = '', due_date, status = 'Pending' } = req.body;
    try {
      const [result] = await pool.query(
        'INSERT INTO tasks (user_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, title, description, due_date, status]
      );
      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('due_date').optional().isISO8601().withMessage('due_date must be YYYY-MM-DD'),
    body('status').optional().isIn(['Pending', 'Completed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid task id' });

    try {
      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
      if (!rows.length) return res.status(404).json({ message: 'Task not found' });

      const existing = rows[0];
      const { title = existing.title, description = existing.description, due_date = existing.due_date, status = existing.status } = req.body;

      await pool.query(
        'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ? AND user_id = ?',
        [title, description, due_date, status, id, req.user.id]
      );

      const [updated] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      return res.json(updated[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid task id' });

  try {
    const [rows] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Task not found' });

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
