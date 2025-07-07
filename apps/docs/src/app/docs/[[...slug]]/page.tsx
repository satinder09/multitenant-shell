import { notFound } from 'next/navigation';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Card, Cards } from '@/components/mdx-components';

interface PageProps {
  params: {
    slug?: string[];
  };
}

export default async function Page({ params }: PageProps) {
  const slug = params.slug || [];
  const filePath = slug.length === 0 ? 'index.mdx' : `${slug.join('/')}.mdx`;
  
  try {
    const fullPath = path.join(process.cwd(), 'content', filePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data: frontMatter, content } = matter(fileContents);

    return (
      <DocsPage 
        toc={[
          { title: 'Overview', url: '#overview', depth: 2 },
          { title: 'Features', url: '#features', depth: 2 },
          { title: 'Getting Started', url: '#getting-started', depth: 2 },
        ]}
        full={frontMatter.full}
        tableOfContent={{
          enabled: true,
        }}
        lastUpdate={new Date()}
      >
        <DocsBody>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h1>{frontMatter.title}</h1>
            {frontMatter.description && (
              <p className="lead">{frontMatter.description}</p>
            )}
            <MDXRemote 
              source={content} 
              components={{ Card, Cards }} 
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
    { slug: [] }, // Introduction
    { slug: ['quick-start'] },
    { slug: ['api'] },
    { slug: ['api', 'authentication'] },
    { slug: ['api', 'tenants'] },
    { slug: ['api', 'users'] },
  ];
} 