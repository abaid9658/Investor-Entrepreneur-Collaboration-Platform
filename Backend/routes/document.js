import express from 'express';
import { 
  uploadDocument, 
  uploadNewVersion, 
  getDocuments, 
  getDocumentById, 
  shareDocument, 
  signDocument, 
  deleteDocument,
  getDocumentVersions
} from '../controllers/documentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/upload.js';
import { 
  shareDocumentValidator, 
  signatureValidator 
} from '../validators/documentValidator.js';

const router = express.Router();

router.use(protect);

router.post('/', upload.single('document'), uploadDocument);
router.post('/:id/version', upload.single('document'), uploadNewVersion);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/versions', getDocumentVersions);
router.post('/:id/share', shareDocumentValidator, shareDocument);
router.post('/:id/sign', signatureValidator, signDocument);
router.delete('/:id', deleteDocument);

export default router;
