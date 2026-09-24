'use client';

import React, { useRef } from 'react';
import { Image as ImageIcon, Video as VideoIcon, X, FileCheck, Film } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { toast } from 'sonner';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64Data: dataUrl, mimeType: 'image/jpeg' });
          return;
        }
        resolve({ base64Data: rawResult, mimeType: file.type || 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ base64Data: rawResult, mimeType: file.type || 'image/jpeg' });
      };
      img.src = rawResult;
    };
    reader.onerror = () => {
      resolve({ base64Data: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
}

export const MediaUploader: React.FC = () => {
  const { uploadedMedia, setUploadedMedia } = useChatStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, expectedType: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const maxSize = expectedType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      toast.error(`File size exceeds maximum limit of ${expectedType === 'image' ? '10MB' : '50MB'}.`);
      e.target.value = '';
      return;
    }

    const mime = file.type.toLowerCase();
    if (expectedType === 'image' && !mime.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPG, PNG, or WEBP).');
      e.target.value = '';
      return;
    }
    if (expectedType === 'video' && !mime.startsWith('video/')) {
      toast.error('Please upload a valid video file (MP4, WEBM, or MOV).');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (expectedType === 'image') {
      try {
        const { base64Data, mimeType } = await compressImage(file);
        setUploadedMedia({
          type: 'image',
          mimeType,
          data: base64Data,
          fileName: file.name,
          fileSize: file.size,
          previewUrl
        });
        toast.success(`Image "${file.name}" loaded for visual content creation.`);
      } catch (err) {
        toast.error('Failed to process image. Please try another file.');
      }
      e.target.value = '';
      return;
    }

    // Video reading
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = previewUrl;
      tempVideo.onloadedmetadata = () => {
        setUploadedMedia({
          type: 'video',
          mimeType: file.type || 'video/mp4',
          data: base64Data,
          fileName: file.name,
          fileSize: file.size,
          previewUrl,
          duration: Math.round(tempVideo.duration)
        });
        toast.success(`Video "${file.name}" loaded for media-aware generation.`);
      };
      tempVideo.onerror = () => {
        setUploadedMedia({
          type: 'video',
          mimeType: file.type || 'video/mp4',
          data: base64Data,
          fileName: file.name,
          fileSize: file.size,
          previewUrl
        });
        toast.success(`Video "${file.name}" loaded.`);
      };
    };

    reader.onerror = () => {
      toast.error('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    if (uploadedMedia?.previewUrl) {
      try {
        URL.revokeObjectURL(uploadedMedia.previewUrl);
      } catch (_) {}
    }
    setUploadedMedia(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pt-2">
      {/* Hidden native file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'video')}
      />

      {!uploadedMedia ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-all active:scale-95 shadow-xs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-all active:scale-95 shadow-xs"
          >
            <VideoIcon className="w-3.5 h-3.5 text-violet-500" />
            <span>Upload Video</span>
          </button>

          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            (Optional: Content will be customized to match your media)
          </span>
        </div>
      ) : (
        /* Preview Card */
        <div className="p-2.5 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/20 flex items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {uploadedMedia.type === 'image' ? (
              <img
                src={uploadedMedia.previewUrl}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover border border-violet-300/60 dark:border-violet-800 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-violet-300/60 dark:border-violet-800 flex items-center justify-center text-white shrink-0 shadow-xs relative overflow-hidden">
                <video
                  src={uploadedMedia.previewUrl}
                  className="w-full h-full object-cover opacity-80"
                  muted
                  preload="metadata"
                />
                <Film className="w-4 h-4 absolute text-white drop-shadow" />
              </div>
            )}

            <div className="overflow-hidden text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{uploadedMedia.fileName}</span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span className="uppercase font-medium text-[10px] px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                  {uploadedMedia.type}
                </span>
                <span>•</span>
                <span>{formatFileSize(uploadedMedia.fileSize)}</span>
                {uploadedMedia.duration ? (
                  <>
                    <span>•</span>
                    <span>{uploadedMedia.duration}s</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60"
            title="Remove Media"
            aria-label="Remove Media"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      )}
    </div>
  );
};
