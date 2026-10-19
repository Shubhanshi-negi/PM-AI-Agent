import express from 'express';
import multer from 'multer';
import { readFile } from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import type { RequestHandler } from 'express';
import type { IProject } from '../models/Project.js';
import { createId, persistUploadedFile, readStore, removeUploadedFile, updateStore } from '../services/jsonStore.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const receiveUpload: RequestHandler = (req, res, next) => {
    upload.single('file')(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            res.status(status).json({ message: error.message });
            return;
        }
        if (error) {
            res.status(400).json({ message: 'Unable to receive uploaded file' });
            return;
        }
        next();
    });
};

const assetMetadata = (project: IProject) =>
    (project.assets || []).map(({ _id, name, type, size, uploadedAt }) => ({
        _id,
        name,
        type,
        size,
        uploadedAt,
    }));

// POST /api/upload/:projectId
router.post('/:projectId', receiveUpload, async (req, res) => {
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!['.pdf', '.txt', '.md', '.markdown'].includes(extension)) {
            res.status(415).json({ message: 'Only PDF, TXT, and Markdown files are supported' });
            return;
        }

        let extractedText: string;
        if (extension === '.pdf') {
            const parser = new PDFParse({ data: file.buffer });
            try {
                const result = await parser.getText();
                extractedText = result.text;
            } finally {
                await parser.destroy();
            }
        } else {
            extractedText = file.buffer.toString('utf8');
        }

        const { projects } = await readStore();
        if (!projects.some(project => project._id === projectId)) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }

        const storageName = await persistUploadedFile(file.buffer, extension);
        try {
            const project = await updateStore(store => {
                const target = store.projects.find(item => item._id === projectId);
                if (!target) return null;
                target.assets = target.assets || [];
                target.assets.push({
                    _id: createId(),
                    name: file.originalname,
                    type: file.mimetype,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    context: extractedText,
                    storageName,
                });
                const asset = target.assets[target.assets.length - 1];
                target.context = `${target.context || ''}\n\n--- Document: ${file.originalname} [${asset._id}] ---\n${extractedText}`;
                return target;
            });
            if (!project) {
                await removeUploadedFile(storageName);
                res.status(404).json({ message: 'Project not found' });
                return;
            }
            res.json({ message: 'File processed and context updated', assets: assetMetadata(project) });
        } catch (error) {
            await removeUploadedFile(storageName);
            throw error;
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        console.error('Upload Error:', message);
        res.status(500).json({ message: 'Failed to process file', error: message });
    }
});

router.delete('/:projectId/:assetId', async (req, res) => {
    const { projectId, assetId } = req.params;
    try {
        const result = await updateStore(store => {
            const project = store.projects.find(item => item._id === projectId);
            if (!project) return { error: 'Project not found' as const };
            const assetIndex = project.assets?.findIndex(asset => asset._id === assetId) ?? -1;
            if (assetIndex < 0) return { error: 'Asset not found' as const };
            const [asset] = project.assets!.splice(assetIndex, 1);
            const marker = `--- Document: ${asset.name} [${asset._id}] ---`;
            const sectionStart = project.context?.lastIndexOf(marker) ?? -1;
            if (sectionStart >= 0) {
                const nextSection = project.context!.indexOf('\n\n--- Document: ', sectionStart + marker.length);
                const sectionEnd = nextSection < 0 ? project.context!.length : nextSection;
                const removeFrom = sectionStart >= 2 && project.context!.slice(sectionStart - 2, sectionStart) === '\n\n'
                    ? sectionStart - 2
                    : sectionStart;
                project.context = project.context!.slice(0, removeFrom) + project.context!.slice(sectionEnd);
            }
            return { project, storageName: asset.storageName };
        });
        if ('error' in result) {
            res.status(404).json({ message: result.error });
            return;
        }
        await removeUploadedFile(result.storageName);
        res.json({ message: 'Asset removed', assets: assetMetadata(result.project) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown asset removal error';
        res.status(500).json({ message: 'Failed to remove asset', error: message });
    }
});

export default router;
