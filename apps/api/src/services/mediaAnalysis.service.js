const { GoogleGenerativeAI } = require('@google/generative-ai');
const keyPool = require('./keyPool');
const { env } = require('../config/env');

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

    const { type = 'image', mimeType = '', data = '', fileName = '', fileSize = 0 } = media;

    // 1. Validation
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

    // Extract raw base64 string
    let rawBase64 = data;
    if (data.includes(';base64,')) {
      rawBase64 = data.split(';base64,')[1];
    }

    // 2. Perform multimodal Gemini analysis
    try {
      const keyEntry = keyPool.getKey();
      if (!keyEntry || !keyEntry.key || keyEntry.key === 'demo-dev-key') {
        return this.getFallbackContext(type, fileName);
      }

      const genAI = new GoogleGenerativeAI(keyEntry.key);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-3.6-flash'
      });

      const analysisPrompt = type === 'image'
        ? `You are an expert multimodal visual analyst for creative writing and social media content creation.
Analyze this image carefully. Extract essential visual themes, mood, setting, dominant objects, and colors.
Return ONLY a valid JSON object matching this schema:
{
  "mediaType": "image",
  "scene": "short description of environment / setting",
  "objects": ["key visual elements or subjects"],
  "mood": "emotional atmosphere and tone",
  "colors": ["dominant color palette"],
  "activity": "action taking place or null",
  "visualTheme": "aesthetic vibe (e.g. minimalist, serene, energetic, dramatic)",
  "summary": "1-2 sentence vivid description of what is depicted"
}`
        : `You are an expert video analyst for creative writing and social media content creation.
Analyze this video for social media storytelling and creative content.
Return ONLY a valid JSON object matching this schema:
{
  "mediaType": "video",
  "scene": "setting / location",
  "objects": ["main subjects / elements"],
  "mood": "mood and energy",
  "actions": ["key actions or movements"],
  "visualTheme": "visual aesthetic",
  "topic": "main topic or theme",
  "summary": "1-2 sentence overview of the video's core essence"
}`;

      const resolvedMime = cleanMime || (type === 'image' ? 'image/jpeg' : 'video/mp4');

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: resolvedMime,
            data: rawBase64
          }
        },
        analysisPrompt
      ]);

      const responseText = result.response.text();
      keyPool.reportSuccess(keyEntry);

      // Parse JSON from response with resilient fallback
      let parsed = null;
      try {
        let cleanJson = responseText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        }
        parsed = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn('[MediaAnalysisService] JSON parse fallback to response text:', parseErr.message);
        parsed = {
          mediaType: type,
          scene: responseText.slice(0, 150),
          objects: [type === 'image' ? 'visual elements' : 'video footage'],
          mood: 'evocative and expressive',
          visualTheme: 'creative media composition',
          summary: responseText.slice(0, 250)
        };
      }

      return {
        ...parsed,
        mediaType: type,
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('[MediaAnalysisService] Multimodal analysis fallback:', err.message);
      return this.getFallbackContext(type, fileName);
    }
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
