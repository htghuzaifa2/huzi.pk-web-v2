import type { Metadata } from 'next';
import AllProductsLoader from './all-products-loader';

export const metadata: Metadata = {
    title: "All Products - Shop Our Full Collection",
    description: "Browse the complete collection at huzi.pk. Shop for high-quality fashion, digital goods, and more. Physical delivery in Pakistan, digital worldwide.",
    openGraph: {
        title: "All Products - Shop Our Full Collection",
        description: "Browse the complete collection at huzi.pk. Shop for high-quality fashion, digital goods, and more. Physical delivery in Pakistan, digital worldwide.",
        url: "/all-products",
    }
};

export default function AllProductsPage() {
    return <AllProductsLoader />;
}
