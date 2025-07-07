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
          { title: 'Introduction', url: '#introduction', depth: 2 },
          { title: 'Quick Start', url: '#quick-start', depth: 2 },
          { title: 'What\'s Next?', url: '#whats-next', depth: 2 },
        ]}
        full={frontMatter.full}
        tableOfContent={{
          enabled: true,
        }}
      >
        <DocsBody>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {frontMatter.title}
          </h1>
          {frontMatter.description && (
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              {frontMatter.description}
            </p>
          )}
          <div className="mt-6 prose prose-gray dark:prose-invert max-w-none">
            <MDXRemote 
              source={content} 
              components={{ Card, Cards }} 
            />
          </div>
        </DocsBody>
      </DocsPage>
    );
  } catch (error) {
    notFound();
  }
}

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ['getting-started'] },
    { slug: ['features'] },
    { slug: ['api', 'reports'] },
    { slug: ['integrations'] },
  ];
} 