import { serializeJsonLd } from "@/lib/seo";

/**
 * One `<script type="application/ld+json">` in the server HTML. Server component, no JS. Every value in `data` must
 * also be visible text on the page (seo.ts), and `<` is escaped by `serializeJsonLd`.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
