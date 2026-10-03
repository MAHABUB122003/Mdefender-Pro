import { Router } from 'express';
import {
    getAllSections,
    getSectionByKey,
    updateSectionByKey,
    resetSectionByKey,
    resetAllSections,
    exportAll,
    importAll
} from '../controllers/sectionController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', getAllSections);
router.get('/export', protect, exportAll);
router.post('/import', protect, importAll);
router.post('/reset-all', protect, resetAllSections);
router.get('/:key', getSectionByKey);
router.put('/:key', protect, updateSectionByKey);
router.post('/:key/reset', protect, resetSectionByKey);

export default router;
