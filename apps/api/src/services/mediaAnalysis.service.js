const contentCreatorService = require('./contentCreator.service');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

class MediaAnalysisService {
  /**
   * Validates and analyzes uploaded image/video to extract creative context
   * @param {Object} media - { type, mimeType, data, fileName, fileSize, duration }
   * @returns {Promise<Object>} Structured media context
   */
  async analyzeMedia(media) {
    if (!media || !media.data) {
      return null;
    }

    const { type = 'image', mimeType = '', fileSize = 0 } = media;

    // Strict validation maintaining backwards compatibility
    const cleanMime = (mimeType || '').toLowerCase().trim();
    if (type === 'image') {
      if (cleanMime && !ALLOWED_IMAGE_TYPES.has(cleanMime)) {
        throw new Error('Unsupported image format. Please upload JPG, PNG, or WEBP.');
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        throw new Error('Image size exceeds maximum limit of 10MB.');
      }
    } else if (type === 'video') {
      if (cleanMime && !ALLOWED_VIDEO_TYPES.has(cleanMime)) {
        throw new Error('Unsupported video format. Please upload MP4, WEBM, or MOV.');
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        throw new Error('Video size exceeds maximum limit of 50MB.');
      }
    }

    return await contentCreatorService.buildVisualContext(media);
  }

  /**
   * Contextual fallback if Gemini multimodal analysis times out or runs offline
   */
  getFallbackContext(type, fileName) {
    const cleanName = (fileName || '').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (type === 'video') {
      return {
        mediaType: 'video',
        scene: cleanName || 'dynamic video scene',
        objects: ['motion', 'visual elements'],
        mood: 'engaging, energetic',
        visualTheme: 'modern social media video',
        topic: cleanName || 'lifestyle and creative expression',
        summary: `Video clip (${cleanName || 'social content'}) with engaging visual progression.`
      };
    }

    return {
      mediaType: 'image',
      scene: cleanName || 'visual composition',
      objects: ['subject', 'environment'],
      mood: 'expressive, evocative',
      colors: ['rich hues', 'natural lighting'],
      activity: null,
      visualTheme: 'aesthetic creative scene',
      summary: `Image depicting ${cleanName || 'an evocative scene'} with captivating atmosphere.`
    };
  }
}

module.exports = new MediaAnalysisService();
