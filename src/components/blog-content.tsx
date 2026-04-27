"use client";

import { useEffect, useRef } from "react";
import { useLightbox } from "@/context/lightbox-context";

import mermaid from "mermaid";

interface BlogContentProps {
    content: string;
}

export default function BlogContent({ content }: BlogContentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { openLightbox } = useLightbox();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initialize Mermaid
        const mermaidNodes = container.querySelectorAll('.mermaid');
        if (mermaidNodes.length > 0) {
            mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
            mermaid.run({ nodes: Array.from(mermaidNodes) as HTMLElement[] }).then(() => {
                // After Mermaid renders, attach listeners to the generated SVGs
                mermaidNodes.forEach((node, index) => {
                    const svg = node.querySelector('svg');
                    if (svg) {
                        // Serialize SVG to Data URL
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                        const url = URL.createObjectURL(svgBlob);

                        // We need to manage this URL for cleanup, but for now let's just create it
                        // Ideally we'd have a specialized Lightbox for components, but Data URL works
                        // Need to encode it properly if using simple string

                        // Better approach for Lightbox which expects URL:
                        // Convert to base64 data uri for maximum compatibility
                        const base64 = btoa(unescape(encodeURIComponent(svgData)));
                        const dataUrl = `data:image/svg+xml;base64,${base64}`;

                        node.addEventListener("click", () => {
                            openLightbox([dataUrl], 0, "Diagram");
                        });
                    }
                });
            });
        }

        const images = container.querySelectorAll("img");
        const imageUrls = Array.from(images).map((img) => img.src);

        const handleImageClick = (index: number) => () => {
            openLightbox(imageUrls, index, "Blog Image");
        };

        images.forEach((img, index) => {
            img.style.cursor = "zoom-in";
            img.addEventListener("click", handleImageClick(index));
        });

        return () => {
            images.forEach((img, index) => {
                img.removeEventListener("click", handleImageClick(index));
            });
            // Cleanup mermaid listeners if we tracked them, but they are inside the conditional promise
        };
    }, [content, openLightbox]);

    return (
        <div
            ref={containerRef}
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
