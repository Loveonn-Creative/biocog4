import { memo } from 'react';
import { parseContentToSections, type FormattedSection } from '@/lib/formatContent';

interface FormattedContentProps {
  content: string;
  className?: string;
}

/**
 * Renders formatted content without markdown artifacts
 * Provides clean, readable display of structured text
 */
export const FormattedContent = memo(({ content, className = '' }: FormattedContentProps) => {
  const sections = parseContentToSections(content);
  
  // Group consecutive list items
  const groupedSections: (FormattedSection | FormattedSection[])[] = [];
  let currentListItems: FormattedSection[] = [];
  
  for (const section of sections) {
    if (section.type === 'listItem') {
      currentListItems.push(section);
    } else {
      if (currentListItems.length > 0) {
        groupedSections.push([...currentListItems]);
        currentListItems = [];
      }
      groupedSections.push(section);
    }
  }
  
  if (currentListItems.length > 0) {
    groupedSections.push(currentListItems);
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {groupedSections.map((item, index) => {
        if (Array.isArray(item)) {
          // Render list
          return (
            <ul key={index} className="space-y-2 pl-4">
              {item.map((listItem, listIndex) => (
                <li key={listIndex} className="flex items-start gap-2 text-foreground/80">
                  <span className="text-primary mt-1.5 text-xs">●</span>
                  <span className="flex-1">{listItem.content}</span>
                </li>
              ))}
            </ul>
          );
        }
        
        const section = item as FormattedSection;
        
        switch (section.type) {
          case 'heading':
            return (
              <h3 key={index} className="font-semibold text-foreground mt-6 first:mt-0">
                {section.content}
              </h3>
            );
          case 'paragraph':
            return (
              <p key={index} className="text-foreground/80 leading-relaxed">
                {section.content}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
});

FormattedContent.displayName = 'FormattedContent';
