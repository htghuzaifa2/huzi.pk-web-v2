import { Metadata } from 'next';
import FaqLoader from './faq-loader';

export const metadata: Metadata = {
    title: "Frequently Asked Questions (FAQ)",
    description: "Find answers to common questions about huzi.pk. Learn about shipping, payments, returns, and how to place an order. Your questions, answered.",
    openGraph: {
        title: "Frequently Asked Questions (FAQ)",
        description: "Find answers to common questions about huzi.pk. Learn about shipping, payments, returns, and how to place an order. Your questions, answered.",
        url: "/faq",
    }
};

export default function FaqPage() {
    return <FaqLoader />;
}
