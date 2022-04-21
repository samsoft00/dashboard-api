import config from 'config';
import multer, { memoryStorage } from 'multer';

// pdf, image:png,jpeg txt, doc-x,
const allowedFileExt = [
  'application/pdf',
  'image/png',
  'image/jpg',
  'text/plain',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_UPLOAD_FILE_SIZE = config.get('general.maxUploadFileSize');

export default multer({
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (allowedFileExt.indexOf(file.mimetype) <= -1) {
      return cb(new Error('Invalid file type, only txts, images and pdf files are allowed'));
    }
    cb(null, true);
  },
});
