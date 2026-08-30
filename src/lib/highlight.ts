import { createLowlight } from 'lowlight'
import { visit } from 'unist-util-visit'
import type { Element, ElementContent, Root } from 'hast'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'

/**
 * Syntax highlighting for the four languages the source files actually contain,
 * plus shell for the crontab example.
 *
 * rehype-highlight would pull in highlight.js's whole common set, around
 * thirty grammars the app never renders. On a phone that download is real, so
 * the plugin is written out here against lowlight with an explicit registry.
 */

const lowlight = createLowlight({ bash, json, python, sql, yaml })

const ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  py: 'python',
  yml: 'yaml',
  postgresql: 'sql',
  sqlite: 'sql',
}

function languageOf(node: Element): string | null {
  const className = node.properties?.className
  const classes = Array.isArray(className) ? className : []
  for (const entry of classes) {
    const value = String(entry)
    if (!value.startsWith('language-')) continue
    const name = value.slice('language-'.length).toLowerCase()
    return ALIASES[name] ?? name
  }
  return null
}

function textOf(node: Element): string {
  let out = ''
  visit(node, 'text', (child) => {
    out += child.value
  })
  return out
}

/**
 * Rehype plugin. Highlights `<pre><code class="language-x">` blocks whose
 * language is registered, and leaves everything else exactly as written.
 */
export function rehypeHighlightSubset() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (node.tagName !== 'code') return
      const parentElement = parent as Element | undefined
      if (!parentElement || parentElement.type !== 'element' || parentElement.tagName !== 'pre') return

      const language = languageOf(node)
      if (!language || !lowlight.registered(language)) return

      const result = lowlight.highlight(language, textOf(node))
      node.properties = node.properties ?? {}
      const existing = node.properties.className
      const classes = Array.isArray(existing) ? existing.map(String) : []
      node.properties.className = [...classes, 'hljs']
      node.children = result.children as ElementContent[]
    })
  }
}
