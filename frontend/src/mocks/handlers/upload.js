/**
 * MSW Handlers for File Upload API
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay } from '../config.js';

const UPLOAD_BASE_URL = `${API_BASE_URL}${API_PREFIX}/upload`;

let uploadedFiles = [];
let uploadCounter = 1;

async function handleFileUpload(req) {
  await delay(200);
  
  const formData = await req.request.formData();
  const files = collectFiles(formData);
  
  if (files.length === 0) {
    return HttpResponse.json(
      { message: 'No file provided', code: 'NO_FILE' },
      { status: 400 }
    );
  }
  
  const bucket = formData.get('bucket') || 'public-files';
  const resourceType = formData.get('resourceType') || 'general';
  const resourceId = formData.get('resourceId') || null;
  
  const storedFiles = files.map((file) => {
    const id = uploadCounter++;
    const storedName = `${Date.now()}_${id}_${file.name}`;
    const metadata = {
      id,
      originalName: file.name,
      storedName,
      bucket,
      resourceType,
      resourceId,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      url: `/uploads/mock/${bucket}/${storedName}`,
      uploadedAt: new Date().toISOString()
    };
    uploadedFiles.push(metadata);
    return metadata;
  });
  
  return HttpResponse.json({
    success: true,
    files: storedFiles,
    file: storedFiles[0]
  });
}

async function getUploadedFile(req) {
  await delay(100);
  const { id } = req.params;
  const file = uploadedFiles.find((item) => String(item.id) === id);
  
  if (!file) {
    return HttpResponse.json(
      { message: 'File not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
  
  return HttpResponse.json({ file });
}

async function deleteUploadedFile(req) {
  await delay(100);
  const { id } = req.params;
  const index = uploadedFiles.findIndex((item) => String(item.id) === id);
  
  if (index === -1) {
    return HttpResponse.json(
      { message: 'File not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
  
  const [removed] = uploadedFiles.splice(index, 1);
  return HttpResponse.json({ success: true, file: removed });
}

function collectFiles(formData) {
  const files = [];
  const singleFile = formData.get('file');
  if (singleFile instanceof File) {
    files.push(singleFile);
  }
  
  const multipleFiles = formData.getAll('files');
  multipleFiles
    .filter((item) => item instanceof File)
    .forEach((file) => files.push(file));
  
  return files;
}

export const uploadHandlers = [
  http.post(`${UPLOAD_BASE_URL}`, handleFileUpload),
  http.post(`${UPLOAD_BASE_URL}/public`, handleFileUpload),
  http.post(`${UPLOAD_BASE_URL}/private`, handleFileUpload),
  http.get(`${UPLOAD_BASE_URL}/:id`, getUploadedFile),
  http.delete(`${UPLOAD_BASE_URL}/:id`, deleteUploadedFile)
];



