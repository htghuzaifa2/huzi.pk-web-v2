
import type { Metadata } from 'next';
import ProductDetailsLoader from './product-details-loader';
import productsData from '@/data/products.json';
import categoriesData from '@/data/categories.json';
import Script from 'next/script';

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return productsData.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = productsData.find((p) => p.slug === params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    };
  }
  
  // Find the full category name from the slug
  const primaryCategoryName = categoriesData.categories.find(c => c.slug === product.category[0])?.name || product.category[0];

  const description = `Shop the ${product.name}, a premium ${primaryCategoryName} at huzi.pk. ${product.description} Enjoy nationwide delivery in Pakistan.`.substring(0, 160);

  return {
    title: product.name,
    description: description,
    openGraph: {
      title: product.name,
      description: description,
      url: `/product/${product.slug}`,
      images: [
        {
          url: product.image.url,
          width: 800,
          height: 800,
          alt: product.image.alt,
        },
      ],
    },
  };
}

export default function ProductPage({ params }: PageProps) {
  const product = productsData.find((p) => p.slug === params.slug);
  
  if (!product) {
      // This should ideally not be reached if generateStaticParams is exhaustive
      return <ProductDetailsLoader slug={params.slug} />;
  }

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const availability = isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.url,
    sku: product.id.toString(),
    offers: {
      '@type': 'Offer',
      url: `https://huzi.pk/product/${product.slug}`,
      priceCurrency: 'PKR',
      price: product.price.toFixed(2),
      availability: availability,
    },
  };

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductDetailsLoader slug={params.slug} />
    </>
  );
}
