import Link from 'next/link';
import { ReactNode } from 'react';

interface CardProps {
  title: string;
  href: string;
  children: ReactNode;
}

export function Card({ title, href, children }: CardProps) {
  return (
    <Link href={href} className="block group">
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-blue-500 dark:group-hover:border-blue-400">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {title}
        </h3>
        <div className="text-gray-600 dark:text-gray-300 text-sm">
          {children}
        </div>
      </div>
    </Link>
  );
}

interface CardsProps {
  children: ReactNode;
}

export function Cards({ children }: CardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 my-8 not-prose">
      {children}
    </div>
  );
} 