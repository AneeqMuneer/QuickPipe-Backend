exports.CleanExtractedText = (text) => {
    if (!text) {
        return '';
    }

    return text
        // Remove special characters and formatting
        .replace(/[|:\n\s\/]+/g, ' ') // Remove pipes, colons, excessive newlines, slashes
        .replace(/[•\-\*]+/g, ' ') // Remove bullet points and dashes
        .replace(/www\.enhancv\.com.*$/g, '') // Remove website URLs
        .replace(/Powered by.*$/g, '') // Remove "Powered by" text
        .replace(/https?:\/\/[^\s]+/g, '') // Remove all URLs
        .replace(/linkedin\.com\/[^\s]+/g, '') // Remove LinkedIn URLs
        .replace(/github\.com\/[^\s]+/g, '') // Remove GitHub URLs

        // Clean up whitespace
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace

        // Remove empty lines
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n')

        // Final cleanup
        .trim();
}