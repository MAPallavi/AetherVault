class AIService {
  async extractOCR(fileId, buffer, mimeType) {
    console.log(`[AIService] Extracting OCR text for file: ${fileId} (${mimeType})`);
    return "This is a simulated OCR text extracted from the document.";
  }

  async generateEmbeddings(text) {
    console.log(`[AIService] Generating embeddings for query / text`);
    return Array.from({ length: 1536 }, () => Math.random());
  }

  async classifyFile(filename, ocrText) {
    console.log(`[AIService] Classifying file: ${filename}`);
    const nameLower = filename.toLowerCase();
    if (nameLower.includes('resume')) return 'Resume';
    if (nameLower.includes('invoice')) return 'Invoice';
    if (nameLower.includes('paper') || nameLower.includes('thesis')) return 'Research Paper';
    if (nameLower.includes('cert')) return 'Certificate';
    return 'Document';
  }

  async generateSummary(fileId) {
    console.log(`[AIService] Generating AI Summary for file: ${fileId}`);
    return "This is a simulated AI summary of the file content. It covers the core key points and highlights the main structural arguments.";
  }
}

module.exports = new AIService();
