const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// OCR Service for extracting text from images
class OCRService {
    constructor() {
        // Initialize OCR workers lazily to avoid startup performance issues
        this.workers = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize OCR worker for a specific language
     * @param {string} lang - Language code (default: 'eng')
     */
    async initializeWorker(lang = 'eng') {
        if (this.workers.has(lang)) {
            return this.workers.get(lang);
        }

        try {
            // Dynamic import to avoid loading Tesseract at startup
            const { createWorker } = await import('tesseract.js');
            
            const worker = await createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress (${lang}): ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            this.workers.set(lang, worker);
            console.log(`OCR worker initialized for language: ${lang}`);
            
            return worker;
        } catch (error) {
            console.error(`Failed to initialize OCR worker for ${lang}:`, error);
            throw new Error(`OCR initialization failed: ${error.message}`);
        }
    }

    /**
     * Preprocess image for better OCR results
     * @param {string} imagePath - Path to the image file
     * @returns {Buffer} - Preprocessed image buffer
     */
    async preprocessImage(imagePath) {
        try {
            // Use Sharp to preprocess the image for better OCR results
            const processedBuffer = await sharp(imagePath)
                .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
                .grayscale()
                .normalize()
                .sharpen()
                .png()
                .toBuffer();

            console.log('Image preprocessed for OCR');
            return processedBuffer;
        } catch (error) {
            console.error('Image preprocessing failed:', error);
            // Return original file if preprocessing fails
            return fs.readFileSync(imagePath);
        }
    }

    /**
     * Extract text from image using OCR
     * @param {string} imagePath - Path to the image file
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result with text and confidence
     */
    async extractTextFromImage(imagePath, options = {}) {
        const {
            lang = 'eng',
            psm = '3', // Page segmentation mode
            preprocessing = true,
            confidence_threshold = 30
        } = options;

        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        console.log(`Starting OCR extraction for: ${path.basename(imagePath)}`);
        const startTime = Date.now();

        try {
            // Initialize worker for the specified language
            const worker = await this.initializeWorker(lang);

            // Preprocess image if enabled
            const imageBuffer = preprocessing 
                ? await this.preprocessImage(imagePath)
                : fs.readFileSync(imagePath);

            // Set OCR parameters
            await worker.setParameters({
                tessedit_pageseg_mode: psm,
                tessedit_char_whitelist: '', // Allow all characters
                preserve_interword_spaces: '1'
            });

            // Perform OCR
            const { data } = await worker.recognize(imageBuffer);
            
            const processingTime = Date.now() - startTime;
            console.log(`OCR completed in ${processingTime}ms`);
            
            // Filter results by confidence
            const filteredText = this.filterByConfidence(data, confidence_threshold);
            
            return {
                text: filteredText.text,
                confidence: data.confidence,
                words: filteredText.words,
                lines: data.lines?.length || 0,
                paragraphs: data.paragraphs?.length || 0,
                processingTime: processingTime,
                language: lang,
                preprocessing: preprocessing
            };

        } catch (error) {
            console.error('OCR extraction failed:', error);
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    /**
     * Filter OCR results by confidence level
     * @param {Object} data - OCR data from Tesseract
     * @param {number} threshold - Confidence threshold (0-100)
     * @returns {Object} Filtered results
     */
    filterByConfidence(data, threshold) {
        const filteredWords = [];
        let filteredText = '';

        if (data.words) {
            for (const word of data.words) {
                if (word.confidence >= threshold) {
                    filteredWords.push(word);
                    filteredText += word.text + ' ';
                }
            }
        }

        return {
            text: filteredText.trim(),
            words: filteredWords
        };
    }

    /**
     * Extract text from multiple images
     * @param {string[]} imagePaths - Array of image file paths
     * @param {Object} options - OCR options
     * @returns {Promise<Object[]>} Array of OCR results
     */
    async extractTextFromMultipleImages(imagePaths, options = {}) {
        console.log(`Processing ${imagePaths.length} images for OCR`);
        
        const results = [];
        const { concurrent = 2 } = options; // Process 2 images at a time by default

        // Process images in batches to avoid overwhelming the system
        for (let i = 0; i < imagePaths.length; i += concurrent) {
            const batch = imagePaths.slice(i, i + concurrent);
            const batchPromises = batch.map(async (imagePath, index) => {
                try {
                    const result = await this.extractTextFromImage(imagePath, options);
                    return {
                        path: imagePath,
                        filename: path.basename(imagePath),
                        index: i + index,
                        ...result
                    };
                } catch (error) {
                    return {
                        path: imagePath,
                        filename: path.basename(imagePath),
                        index: i + index,
                        error: error.message,
                        text: '',
                        confidence: 0
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            console.log(`Completed batch ${Math.floor(i / concurrent) + 1}/${Math.ceil(imagePaths.length / concurrent)}`);
        }

        return results;
    }

    /**
     * Auto-detect language in the image
     * @param {string} imagePath - Path to the image file
     * @returns {Promise<string>} Detected language code
     */
    async detectLanguage(imagePath) {
        try {
            const worker = await this.initializeWorker('osd'); // Orientation and Script Detection
            const { data } = await worker.recognize(imagePath);
            
            // Extract the most confident script/language
            const scripts = data.scripts || [];
            if (scripts.length > 0) {
                const topScript = scripts.reduce((max, script) => 
                    script.confidence > max.confidence ? script : max
                );
                return topScript.script || 'eng';
            }
            
            return 'eng'; // Default to English
        } catch (error) {
            console.error('Language detection failed:', error);
            return 'eng'; // Default to English on failure
        }
    }

    /**
     * Get supported languages
     * @returns {string[]} Array of supported language codes
     */
    getSupportedLanguages() {
        return [
            'eng', // English
            'fra', // French
            'deu', // German
            'spa', // Spanish
            'ita', // Italian
            'por', // Portuguese
            'nld', // Dutch
            'rus', // Russian
            'chi_sim', // Chinese Simplified
            'chi_tra', // Chinese Traditional
            'jpn', // Japanese
            'kor', // Korean
            'ara', // Arabic
            'hin', // Hindi
            'sin', // Sinhala (for Sri Lankan documents)
            'tam' // Tamil
        ];
    }

    /**
     * Clean up OCR workers
     */
    async cleanup() {
        console.log('Cleaning up OCR workers...');
        
        for (const [lang, worker] of this.workers) {
            try {
                await worker.terminate();
                console.log(`OCR worker terminated for language: ${lang}`);
            } catch (error) {
                console.error(`Failed to terminate OCR worker for ${lang}:`, error);
            }
        }
        
        this.workers.clear();
        this.isInitialized = false;
        console.log('OCR cleanup completed');
    }

    /**
     * Get OCR statistics
     * @returns {Object} OCR service statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            activeWorkers: this.workers.size,
            supportedLanguages: this.getSupportedLanguages().length,
            languages: Array.from(this.workers.keys())
        };
    }
}

// Singleton instance
const ocrService = new OCRService();

// Cleanup on process exit
process.on('SIGINT', async () => {
    await ocrService.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await ocrService.cleanup();
    process.exit(0);
});

module.exports = ocrService;