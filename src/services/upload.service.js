import config from 'config';
import axios from 'axios';
import { statSync } from 'fs-extra';
import FormData from 'form-data';

const { storageProvider, fileUploadUrl } = config.get('general');

/**
 * Server storage implementation
 * Revealing pattern
 */
function ServerStorage() {
  function streamFile() {
    throw new Error('Not implemented');
  }

  function downloadFile() {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  function uploadFile(bucket = null, source, target = null) {
    return new Promise((resolve, reject) => {
      try {
        const formData = new FormData();

        if (typeof source === 'object') {
          if (typeof source.buffer === 'object') {
            Object.assign(source, { buffer: Buffer.from(new Uint8Array(source.buffer)) });
          }

          formData.append('image', source.buffer, {
            filename: source.originalname,
            knownLength: source.size,
          });
        } else {
          formData.append('image', source, {
            knownLength: statSync(source).size,
          });
        }

        const headers = {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync(),
        };

        axios
          .post(fileUploadUrl, formData, { headers })
          .then((res) => resolve(res.data))
          .catch((err) => {
            const errResp = err.response.data ? err.response.data : err.message;
            reject(errResp);
          });
      } catch (err) {
        return reject(new Error(err.message));
      }
    });
  }

  return { streamFile, downloadFile, uploadFile };
}

/**
 * Upload Service
 */
export default class UploadService {
  constructor(provider = storageProvider) {
    if (!provider) {
      throw new Error('Provider not specified');
    }

    switch (provider) {
      case 'local':
        this.provider = ServerStorage();
        break;

      default:
        throw new Error('Storage provider not available');
    }
  }

  streamFile(bucket, path) {
    return this.provider.streamFile(bucket, path);
  }

  async downloadFile(bucket, path) {
    return this.provider.downloadFile(bucket, path);
  }

  async uploadFile(bucket, source, target, isPublic = false) {
    return this.provider.uploadFile(bucket, source, target, isPublic);
  }
}
