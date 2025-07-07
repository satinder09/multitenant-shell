// Card component configuration for documentation
// These interfaces define the props structure for MDX usage

export interface CardsProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardProps {
  title: string;
  href: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

// Component configuration for documentation generation
export const cardsConfig = {
  name: 'Cards',
  props: {
    children: 'ReactNode',
    className: 'string (optional)'
  }
};

export const cardConfig = {
  name: 'Card',
  props: {
    title: 'string',
    href: 'string',
    children: 'ReactNode',
    className: 'string (optional)',
    icon: 'ReactNode (optional)'
  }
};

// Export component configurations
export default { Cards: cardsConfig, Card: cardConfig }; 