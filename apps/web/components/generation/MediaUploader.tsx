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

function sampleVideoFrames(
  videoUrl: string,
  duration: number,
  maxFrames = 8,
  maxDim = 640,
  quality = 0.75
): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const safeDuration = Math.max(0.5, duration || 1);

    // Pick 4 to 8 sample timestamps across the video duration
    let timestamps: number[] = [];
    if (safeDuration <= 3) {
      timestamps = [0.2, safeDuration * 0.5, Math.max(0.3, safeDuration - 0.2)];
    } else if (safeDuration <= 8) {
      timestamps = [
        safeDuration * 0.1,
        safeDuration * 0.38,
        safeDuration * 0.65,
        safeDuration * 0.92
      ];
    } else if (safeDuration <= 20) {
      timestamps = [
        safeDuration * 0.06,
        safeDuration * 0.26,
        safeDuration * 0.50,
        safeDuration * 0.74,
        safeDuration * 0.94
      ];
    } else if (safeDuration <= 60) {
      timestamps = [
        safeDuration * 0.05,
        safeDuration * 0.22,
        safeDuration * 0.40,
        safeDuration * 0.60,
        safeDuration * 0.80,
        safeDuration * 0.95
      ];
    } else {
      timestamps = [
        safeDuration * 0.04,
        safeDuration * 0.16,
        safeDuration * 0.30,
        safeDuration * 0.45,
        safeDuration * 0.60,
        safeDuration * 0.75,
        safeDuration * 0.88,
        safeDuration * 0.96
      ];
    }

    timestamps = timestamps.slice(0, maxFrames);

    const frames: string[] = [];
    let previousLumaSum = -1;
    let currentIndex = 0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const timer = setTimeout(() => {
      resolve(frames);
    }, 4500);

    const seekNext = () => {
      if (currentIndex >= timestamps.length) {
        clearTimeout(timer);
        resolve(frames);
        return;
      }
      video.currentTime = timestamps[currentIndex];
    };

    video.onseeked = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);

          // Fast duplicate / black frame check via low-res 16x16 sample
          let isDuplicate = false;
          let isAllBlack = true;

          try {
            const sampleData = ctx.getImageData(0, 0, Math.min(width, 16), Math.min(height, 16)).data;
            let currentLumaSum = 0;
            for (let i = 0; i < sampleData.length; i += 4) {
              const luma = sampleData[i] * 0.299 + sampleData[i + 1] * 0.587 + sampleData[i + 2] * 0.114;
              currentLumaSum += luma;
              if (luma > 8) isAllBlack = false;
            }

            if (previousLumaSum >= 0 && Math.abs(currentLumaSum - previousLumaSum) / (previousLumaSum || 1) < 0.025 && frames.length >= 2) {
              isDuplicate = true;
            } else {
              previousLumaSum = currentLumaSum;
            }
          } catch (_) {}

          if (!isDuplicate && (!isAllBlack || frames.length === 0)) {
            const frameUrl = canvas.toDataURL('image/jpeg', quality);
            frames.push(frameUrl);
          }
        }
      } catch (_) {}

      currentIndex++;
      seekNext();
    };

    video.onerror = () => {
      clearTimeout(timer);
      resolve(frames);
    };

    video.onloadeddata = () => {
      seekNext();
    };
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
        const commaIndex = base64Data.indexOf(',');
        const rawChars = commaIndex !== -1 ? base64Data.slice(commaIndex + 1) : base64Data;
        const compressedBytes = Math.round(rawChars.length * 0.75);
        setUploadedMedia({
          type: 'image',
          mimeType,
          data: base64Data,
          fileName: file.name,
          fileSize: compressedBytes > 0 ? compressedBytes : file.size,
          previewUrl
        });
        toast.success(`Image "${file.name}" loaded for visual content creation.`);
      } catch (err) {
        toast.error('Failed to process image. Please try another file.');
      }
      e.target.value = '';
      return;
    }

    // Video: Extract metadata and sampled frames for real multimodal visual understanding
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = previewUrl;
    tempVideo.onloadedmetadata = async () => {
      const dur = Math.round(tempVideo.duration) || 0;
      toast.info('Sampling video frames for visual analysis...');
      
      let frames: string[] = [];
      try {
        frames = await sampleVideoFrames(previewUrl, dur);
      } catch (fErr) {
        console.warn('Frame sampling fallback:', fErr);
      }

      setUploadedMedia({
        type: 'video',
        mimeType: file.type || 'video/mp4',
        data: frames[0] || 'video',
        fileName: file.name,
        fileSize: file.size,
        previewUrl,
        duration: dur,
        frames: frames.length > 0 ? frames : undefined
      });

      if (frames.length > 0) {
        toast.success(`Video "${file.name}" loaded (${frames.length} frames ready for visual AI analysis).`);
      } else {
        toast.success(`Video "${file.name}" loaded.`);
      }
    };
    tempVideo.onerror = () => {
      setUploadedMedia({
        type: 'video',
        mimeType: file.type || 'video/mp4',
        data: 'video',
        fileName: file.name,
        fileSize: file.size,
        previewUrl
      });
      toast.success(`Video "${file.name}" loaded.`);
    };
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
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-stone-200/70 dark:border-zinc-700/80 transition-all active:scale-98 shadow-2xs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-stone-200/70 dark:border-zinc-700/80 transition-all active:scale-98 shadow-2xs"
          >
            <VideoIcon className="w-3.5 h-3.5 text-primary" />
            <span>Upload Video</span>
          </button>

          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            (Media-aware generation tailored to your upload)
          </span>
        </div>
      ) : (
        /* Preview Card */
        <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-3 overflow-hidden">
            {uploadedMedia.type === 'image' ? (
              <img
                src={uploadedMedia.previewUrl}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover border border-primary/20 shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-primary/20 flex items-center justify-center text-white shrink-0 shadow-2xs relative overflow-hidden">
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
                <span className="truncate max-w-[200px] sm:max-w-xs">{uploadedMedia.fileName}</span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span className="uppercase font-semibold text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary dark:text-primary-300">
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
                {uploadedMedia.frames?.length ? (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">{uploadedMedia.frames.length} frames analyzed</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60"
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
