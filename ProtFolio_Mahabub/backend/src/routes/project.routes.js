import { Router } from 'express';
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', protect, createProject);
router.put('/reorder', protect, reorderProjects);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

export default router;
