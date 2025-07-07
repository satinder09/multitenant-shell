import { notFound } from 'next/navigation';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { OpenAPILoader } from '@/components/openapi/OpenAPILoader';
import { SimpleOpenAPIRenderer } from '@/components/openapi/SimpleOpenAPIRenderer';

interface PageProps {
  params: {
    slug?: string[];
  };
}

const mdxComponents = {
  OpenAPILoader,
  SimpleOpenAPIRenderer,
};

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
      <DocsPage toc={[]}>
        <DocsBody>
          <h1>{frontMatter.title}</h1>
          {frontMatter.description && (
            <p className="text-muted-foreground text-lg mb-8">
              {frontMatter.description}
            </p>
          )}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <MDXRemote 
              source={content}
              components={mdxComponents}
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

export async function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ['getting-started'] },
    { slug: ['api'] },
    { slug: ['api', 'users'] },
  ];
}

export function generateMetadata({ params }: PageProps) {
  const slug = params.slug || [];
  let filePath: string;
  
  if (slug.length === 0) {
    filePath = 'index.mdx';
  } else {
    filePath = `${slug.join('/')}.mdx`;
  }
  
  try {
    const fullPath = path.join(process.cwd(), 'content', filePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data: frontMatter } = matter(fileContents);
    
    return {
      title: frontMatter.title,
      description: frontMatter.description,
    };
  } catch (error) {
    return {
      title: 'Documentation',
      description: 'API Documentation',
    };
  }
} 