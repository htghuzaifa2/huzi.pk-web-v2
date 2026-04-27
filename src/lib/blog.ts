import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"

const ROOT = path.join(process.cwd(), "src/data/blogs/posts")

export interface BlogPost {
    title: string
    description: string
    date: string
    content: string
    slug: string
    topic: string
    [key: string]: any
}

// Configure renderer once
const renderer = new marked.Renderer()
const linkRenderer = renderer.link
renderer.link = (token: any) => {
    const html = linkRenderer.call(renderer, token)
    const href = token.href
    // Add target="_blank" only for external links (not huzi.pk or localhost)
    if (href?.startsWith("http") && !href.includes("huzi.pk") && !href.includes("localhost")) {
        return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ')
    }
    return html
}

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

renderer.code = (token: any) => {
    if (token.lang === 'mermaid') {
        return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`
    }
    // Default rendering for other code blocks
    const lang = (token.lang || '').match(/\S*/)[0];
    const code = token.text.replace(/\n$/, '')

    if (!lang) {
        return '<pre><code>' + code + '</code></pre>\n';
    }

    return '<pre><code class="language-' + lang + '">' + code + '</code></pre>\n';
}

marked.setOptions({ renderer })

export function getBlogPost(topic: string, slug: string): BlogPost {
    const filePath = path.join(ROOT, topic, `${slug}.md`)
    console.log(`Attempting to read blog post: ${filePath}`)
    const file = fs.readFileSync(filePath, "utf-8")

    const { content, data } = matter(file)

    return {
        ...data,
        topic,
        slug,
        content: marked(content) as string
    } as BlogPost
}

export function getAllBlogRoutes() {
    if (!fs.existsSync(ROOT)) return []

    const topics = fs.readdirSync(ROOT)

    return topics.flatMap(topic => {
        const topicPath = path.join(ROOT, topic)
        if (!fs.statSync(topicPath).isDirectory()) return []

        const files = fs.readdirSync(topicPath)
        return files
            .filter(file => file.endsWith(".md"))
            .map(file => ({
                topic,
                slug: file.replace(".md", "")
            }))
    })
}

/**
 * Generate a unique slug for a blog post within a topic.
 * If the slug already exists, appends -2, -3, etc.
 */
export function generateUniqueSlug(topic: string, baseSlug: string): string {
    const topicPath = path.join(ROOT, topic)

    // Ensure topic directory exists
    if (!fs.existsSync(topicPath)) {
        fs.mkdirSync(topicPath, { recursive: true })
        return baseSlug
    }

    const existingFiles = fs.readdirSync(topicPath).filter(f => f.endsWith(".md"))
    const existingSlugs = existingFiles.map(f => f.replace(".md", ""))

    // If base slug doesn't exist, use it
    if (!existingSlugs.includes(baseSlug)) {
        return baseSlug
    }

    // Find the next available number
    let counter = 2
    let newSlug = `${baseSlug}-${counter}`

    while (existingSlugs.includes(newSlug)) {
        counter++
        newSlug = `${baseSlug}-${counter}`
    }

    return newSlug
}

/**
 * Create a URL-friendly slug from a title
 */
export function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .trim()
}

