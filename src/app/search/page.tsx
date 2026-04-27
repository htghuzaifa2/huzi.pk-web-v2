import type { Metadata } from 'next';
import SearchLoader from './search-loader';

export const metadata: Metadata = {
    title: "Search Products",
    description: "Search for products at huzi.pk. Find the fashion and digital goods you're looking for with our powerful and easy-to-use search.",
    openGraph: {
        title: "Search Products",
        description: "Search for products at huzi.pk. Find the fashion and digital goods you're looking for with our powerful and easy-to-use search.",
        url: "/search",
    }
};

export default function SearchPage() {
  return <SearchLoader />;
}
