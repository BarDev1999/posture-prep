import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { rehypeHighlightSubset } from '../lib/highlight.ts'

/**
 * Renders content from the source files. GitHub flavoured markdown is required
 * because file A is full of tables, and highlighting is required because the
 * questions and answers carry real SQL, Python, JSON and YAML.
 *
 * Tables are wrapped in their own scroll container so a wide table scrolls
 * sideways inside the card instead of pushing the page out at 380px.
 */

const components: Components = {
  table({ node, ...props }) {
    return (
      <div className="table-scroll">
        <table {...props} />
      </div>
    )
  },
}

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`prose-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlightSubset]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
