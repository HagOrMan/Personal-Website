export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type='application/ld+json'
      // Content is built from our own constants and blog frontmatter, never
      // from user input. Still: JSON.stringify + escape `<` so a title
      // containing "</script>" can't break out.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
