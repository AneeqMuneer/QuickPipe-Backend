exports.ExtractTitleAndLocation = (description) => {
    // Common job title patterns - improved to capture standalone titles
    const titlePatterns = [
        // Standalone common titles
        /\b(Developer|Engineer|Architect|Designer|Analyst|Specialist|Manager|Director|Consultant)\b/i,

        // C-level executives
        /\b(CEO|CTO|CFO|COO|CMO|CIO|CHRO|CSO)\b/i,

        // Chief titles
        /\b(Chief\s+[A-Za-z]+(\s+Officer)?)\b/i,

        // VP titles
        /\b(VP|Vice\s+President)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

        // Director titles
        /\b(Director)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

        // Head titles
        /\b(Head)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

        // Manager titles
        /\b(Manager)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

        // Specialized roles
        /\b([A-Za-z]+)\s+(Engineer|Developer|Architect|Designer|Analyst|Specialist)\b/i,

        // Engineer/Developer with specialization
        /\b(([A-Za-z]+(\s+[A-Za-z]+)?)\s+)?(Engineer|Developer)\b/i
    ];

    // Common location patterns (city, state, country)
    const locationPatterns = [
        /\b([A-Za-z\s]+),\s+([A-Za-z]{2})\b/i, // City, State abbreviation
        /\b([A-Za-z\s]+),\s+([A-Za-z\s]+)\b/i, // City, State/Country
        /\b(in|at|from)\s+([A-Za-z\s]+),\s+([A-Za-z\s]+)\b/i, // in/at/from City, State/Country
        /\b(in|at|from)\s+([A-Za-z\s]+)\b/i // in/at/from Location
    ];

    let title = null;
    let location = null;

    // Extract title
    for (const pattern of titlePatterns) {
        const match = description.match(pattern);
        if (match) {
            title = match[0].trim();
            break;
        }
    }

    // Extract location
    for (const pattern of locationPatterns) {
        const match = description.match(pattern);
        if (match) {
            // If the pattern includes a preposition (in/at/from), grab the location part
            if (match[1] && (match[1].toLowerCase() === 'in' || match[1].toLowerCase() === 'at' || match[1].toLowerCase() === 'from')) {
                location = match.slice(2).join(', ').trim();
            } else {
                location = match[0].trim();
            }
            break;
        }
    }

    return { title, location };
}