const fs = require('fs');
const path = require('path');

// Configuration
const BLOGS_DIR = path.join(__dirname, 'src', 'data', 'blogs', 'posts');
const DESCRIPTION_LENGTH = 155;

// Helper to clean text
function cleanText(text) {
    // Remove Markdown headings
    text = text.replace(/^#+\s+/gm, '');
    // Remove images
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');
    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\(.*?\)/g, '$1');
    // Remove bold/italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    // Remove blockquotes
    text = text.replace(/^>\s+/gm, '');
    // Remove HTML tags
    text = text.replace(/<[^>]*>?/gm, '');
    // Remove frontmatter if passed separately, but here we act on body part
    
    // Replace newlines with spaces and condense spaces
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

// Helper to truncate text to length without breaking words
function truncateText(text, length) {
    if (text.length <= length) return text;
    const subString = text.substr(0, length - 1);
    return subString.substr(0, subString.lastIndexOf(" ")) + "...";
}

// Main processor
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Split frontmatter and body
        // Assuming frontmatter is betweeen first two ---
        const parts = content.split('---');
        if (parts.length < 3) {
            console.log(`Skipping (no frontmatter): ${filePath}`);
            return;
        }

        let frontMatter = parts[1];
        const bodyWithRest = parts.slice(2).join('---'); // Rejoin in case body has ---

        // Clean body to get description
        const cleanBody = cleanText(bodyWithRest);
        const newDescription = truncateText(cleanBody, DESCRIPTION_LENGTH);

        // Update description in frontmatter
        const descRegex = /^description:\s*".*?"/m;
        const descRegexSingle = /^description:\s*'.*?'/m;
        const descRegexPlain = /^description:\s*.*$/m;

        let newFrontMatter = frontMatter;
        const newDescLine = `description: "${newDescription.replace(/"/g, '\\"')}"`;

        if (descRegex.test(frontMatter)) {
            newFrontMatter = frontMatter.replace(descRegex, newDescLine);
        } else if (descRegexSingle.test(frontMatter)) {
            newFrontMatter = frontMatter.replace(descRegexSingle, newDescLine);
        } else if (descRegexPlain.test(frontMatter)) {
            newFrontMatter = frontMatter.replace(descRegexPlain, newDescLine);
        } else {
            // Add description if missing (append to end of frontmatter)
            newFrontMatter = frontMatter.trim() + `\n${newDescLine}\n`;
        }

        // Reconstruct file
        const newContent = `---${newFrontMatter}---${bodyWithRest}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${path.basename(filePath)}`);

    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

// Recursive walker
function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.md')) {
            processFile(filePath);
        }
    });
}

// Run
console.log('Starting SEO Description Update...');
walkDir(BLOGS_DIR);
console.log('Done.');
