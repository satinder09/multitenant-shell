import type { MDXComponents } from 'mdx/types';
import { Card, Cards } from './src/components/mdx-components';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Card,
    Cards,
    ...components,
  };
}

export default useMDXComponents; 