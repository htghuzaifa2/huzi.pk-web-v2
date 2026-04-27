import "@/styles/blog.css"
import { getBlogPost, getAllBlogRoutes } from "@/lib/blog"
import { notFound } from "next/navigation"
import BlogRelatedProducts from "@/components/blog-related-products"
import BlogContent from "@/components/blog-content"

export async function generateStaticParams() {
    const routes = getAllBlogRoutes()
    return routes
}

export async function generateMetadata({ params }: { params: { topic: string; slug: string } }) {
    try {
        const post = getBlogPost(params.topic, params.slug)
        if (!post) return {}

        return {
            title: post.title,
            description: post.description,
            openGraph: {
                title: post.title,
                description: post.description,
                type: 'article',
                url: `https://huzi.pk/blog/${params.topic}/${params.slug}`,
                images: post.image ? [{ url: post.image }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: post.title,
                description: post.description,
                images: post.image ? [post.image] : undefined,
            },
        }
    } catch (error) {
        return {}
    }
}

export default async function BlogPost({ params }: { params: { topic: string; slug: string } }) {
    try {
        const decodedTopic = decodeURIComponent(params.topic)
        const decodedSlug = decodeURIComponent(params.slug)
        const post = getBlogPost(decodedTopic, decodedSlug)

        return (
            <>
                <article className="blog-post container mx-auto py-12">
                    <h1 className="blog-title text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-center">{post.title}</h1>

                    <div className="flex justify-center mb-12">
                        <span className="text-muted-foreground text-sm font-medium tracking-[0.2em] uppercase border-b border-border pb-1">
                            {decodedTopic}
                        </span>
                    </div>

                    <BlogContent content={post.content} />
                </article>

                {/* Related products section - outside blog-post to avoid CSS conflicts */}
                <div className="container mx-auto px-4 pb-16">
                    <BlogRelatedProducts />
                </div>
            </>
        )
    } catch (error) {
        console.error("Error loading blog post:", error)
        notFound()
    }
}

