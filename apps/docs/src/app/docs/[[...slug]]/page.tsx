import { notFound } from 'next/navigation';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface PageProps {
  params: {
    slug?: string[];
  };
}

export default async function Page({ params }: PageProps) {
  const slug = params.slug || [];
  
  // Map slug to file path
  let filePath: string;
  if (slug.length === 0) {
    filePath = 'index.mdx';
  } else {
    filePath = `${slug.join('/')}.mdx`;
  }
  
  try {
    const fullPath = path.join(process.cwd(), 'content', filePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data: frontMatter, content } = matter(fileContents);

    return (
      <DocsPage 
        toc={[]}
        full={frontMatter.full}
        tableOfContent={{
          enabled: true,
        }}
        lastUpdate={new Date()}
      >
        <DocsBody>
          <h1>{frontMatter.title}</h1>
          {frontMatter.description && (
            <p className="lead text-lg text-muted-foreground mb-6">{frontMatter.description}</p>
          )}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <MDXRemote 
              source={content}
              options={{
                parseFrontmatter: true,
              }}
            />
          </div>
        </DocsBody>
      </DocsPage>
    );
  } catch (error) {
    console.error('Error loading page:', error);
    notFound();
  }
}

export function generateStaticParams() {
  return [
    { slug: [] }, // /docs
    { slug: ['getting-started'] }, // /docs/getting-started
    { slug: ['api'] }, // /docs/api
    { slug: ['api', 'users'] }, // /docs/api/users
  ];
} 