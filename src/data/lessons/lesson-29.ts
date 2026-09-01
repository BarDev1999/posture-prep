import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L29',
  number: 29,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'What RAG is and how retrieval works',
  objective:
    'You will be able to describe the four steps of retrieval augmented generation, say where the untrusted text enters, and write a rule against a retrieval corpus with an open write path.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F16', 'Q2.11', 'Q2.13', 'F21'],

  steps: {
    vocabulary: [
      {
        term: 'RAG',
        definition: 'Retrieval augmented generation: fetching relevant text at request time and putting it into the prompt, so the model can answer from it.',
      },
      {
        term: 'embedding',
        definition: 'A list of numbers standing for the meaning of a piece of text. Two texts about the same thing end up with similar numbers.',
      },
      {
        term: 'chunk',
        definition: 'One piece of a document, embedded and stored on its own. Retrieval returns chunks, not whole documents.',
      },
      {
        term: 'vector store',
        definition: 'The database holding the chunks and their embeddings, which can find the closest ones to a query quickly.',
      },
      {
        term: 'top k',
        definition: 'How many of the closest chunks are fetched and put into the prompt. It is a number somebody chose, usually between three and ten.',
      },
    ],

    model: {
      narrative: [
        'RAG has four steps and none of them involve the model until the last one.',
        '',
        'First, at build time, documents are split into chunks and each chunk is embedded and stored. Second, at request time, the question is embedded the same way. Third, the store returns the top k chunks whose numbers are closest to the question. Fourth, those chunks are pasted into the prompt above the question, and the model answers.',
        '',
        'Two consequences matter for security, and both come from step three.',
        '',
        'Closest does not mean true, and it does not mean allowed. The store is answering a similarity question, not a permission question. It has no idea who is asking unless somebody wrote that in, and the chunk it returns is whatever text was put into it.',
        '',
        'And the retrieved chunk lands in the prompt as ordinary text. Whoever wrote the source document has now written part of the prompt. That is the whole of RAG poisoning, which fact 16 defines as injecting hostile documents into the source that retrieval pulls from: it needs no access to the model, and it persists for exactly as long as the document sits in the corpus.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The four steps. The dangerous hop is the third, where text somebody else wrote is selected by similarity and handed to the prompt builder.',
        nodes: [
          { label: 'documents are chunked and embedded', note: 'At build time. Whoever can write a document decides what is in the corpus.' },
          { label: 'the question is embedded', note: 'At request time. Same model, same number space.' },
          {
            label: 'the store returns the top k closest chunks',
            note: 'Similarity only. Not truth, and not permission, unless the query was written to filter on it.',
            danger: true,
          },
          { label: 'the chunks are pasted into the prompt', note: 'Above the question. Now they are instructions as far as the model can tell.' },
          { label: 'the model answers', note: 'From text it was given, some of which it was never meant to obey.' },
        ],
      },
      takeaway: 'Retrieval answers a similarity question. Truth and permission are not part of it unless you made them part of the query.',
    },

    worked: {
      task:
        'Write the rule for a retrieval corpus that anyone can write into: the precondition for RAG poisoning, which is the finding you want before an incident rather than after one.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The vector store inventory and its ingestion pipeline configuration: which sources feed it, on what schedule, and what authentication is required to write into each source.',
          why: 'The corpus itself is not the finding. The path into it is, and that lives in the ingestion configuration rather than in the store.',
          prompt: {
            question: 'Why look at the ingestion pipeline rather than scanning the documents for hostile text?',
            answer:
              'Because scanning is the sanitisation misconception again: a hostile chunk is a fluent sentence, and you cannot reliably tell it from a legitimate one. The write path is a configuration fact you can check exactly, today, and it stays true tomorrow.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A vector store whose ingestion includes a source that unauthenticated or external parties can write to, such as a public web crawl, a support inbox, a ticket queue or a shared drive with open write access.',
          why: 'Named sources rather than the phrase untrusted, so two different reviewers reach the same answer about the same corpus.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which applications query this store, whether any of them holds tools, whether chunks carry a provenance field, and whether the store serves more than one tenant.',
          why: 'One corpus can feed several applications, and the severity is set by the most dangerous consumer rather than by the store itself.',
          prompt: {
            question: 'Why does a provenance field on the chunk matter to a rule about the write path?',
            answer:
              'Because it decides whether anything downstream can tell where a sentence came from. With provenance, the prompt can mark the chunk as third party content and an incident can be traced to a document. Without it, every chunk is anonymous text and the investigation starts from nothing.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when a consumer of the store holds tools and the write path is open to anonymous parties. High when writes need an account. Medium when the source is internal and write restricted.',
          why: 'Reachability of the write path, multiplied by what the consumer can do. The store on its own is never the impact.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Corpora built only from published company content with a reviewed write path, allowed by tag with the reviewing team named. Never granted to a whole account or to a store that any new pipeline can write into.',
          why: 'The exception has to name who reviews the writes, because that is the only thing making it safe, and it has to be revisited when a new source is added.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Authorise retrieval per user before the query rather than filtering after it, mark provenance on every chunk, separate tenants into their own stores or enforce the tenant filter inside the query, and review new ingestion sources before they are enabled.',
          why: 'The first item is the next lesson and the most important control in RAG. The rest make the corpus attributable and keep tenants apart.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The ingestion configuration showing the open source, one chunk in the store traceable to an external writer, and the list of applications querying the store with their tool manifests.',
          why: 'A chunk in the store that came from outside is the proof that the path is real rather than theoretical, and it usually takes one query to find.',
        },
      ],
      result:
        'A rule that finds the corpora where poisoning is possible, before anything has been poisoned, ranked by what the consuming applications can do.',
    },

    fadeLight: {
      task: 'A rule for a multi tenant vector store where one filter is the only thing keeping tenants apart.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The vector store configuration, the retrieval code, and the chunk metadata schema.',
          why: 'The filter lives in the retrieval code, so that is where the finding is.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A store serving more than one tenant where the tenant filter is applied to the results after retrieval rather than inside the query.',
          why: 'The distinction is the whole finding: before or after. Question 2.13 describes exactly this design.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many tenants share the store, whether chunks carry a tenant field at all, and whether the top k is large enough that the filter usually removes something.',
          why: 'If the filter routinely removes results, the retrieval quality is already degraded and the team has a reason to fix it beyond security.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. Another tenant chunk is fetched into the context before the filter runs, so the model has already read it and can be asked to summarise it.',
          why: 'This is fact 17 in one sentence, applied to tenancy: filtering after retrieval is cosmetic because the data is already in the context.',
          choices: [
            'Critical. Another tenant chunk is fetched into the context before the filter runs, so the model has already read it and can be asked to summarise it.',
            'High, since the filter does remove the chunk before the answer is returned to the user.',
            'Medium, because the chunks are stored as numbers rather than as text.',
            'Low while no cross tenant leak has been reported.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The filter removes the chunk from the result list. It cannot remove it from the context window, and the context window is what the model answered from.',
    },

    fadeHeavy: {
      task: 'A rule for an ingestion pipeline that embeds documents from a public web crawl.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which applications query the corpus, whether any holds tools, and whether crawled pages are reviewed before they are embedded.',
          why: 'The crawl is the write path, and it is open to everyone on the internet by definition.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when a consumer holds tools, because a page anyone can publish becomes an instruction inside a system that can act.',
          why: 'The write path could not be more open, so the severity is decided entirely by what the consumer can do.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Restrict the crawl to an allowlist of domains you control, mark every crawled chunk as third party in the prompt, and remove tools from any application that reads this corpus.',
          why: 'Narrow the write path, mark what cannot be narrowed, and reduce what an obeyed instruction can reach.',
          choices: [
            'Restrict the crawl to an allowlist of domains you control, mark every crawled chunk as third party in the prompt, and remove tools from any application that reads this corpus.',
            'Filter crawled pages for suspicious instruction phrases before embedding them.',
            'Re embed the corpus weekly so that poisoned entries expire.',
            'Increase the top k so that a poisoned chunk is outnumbered by legitimate ones.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The crawl source list, one chunk from a domain nobody at the company controls, and the tool manifest of each consuming application.',
          why: 'One chunk from an uncontrolled domain proves the path in a single query result.',
          choices: [
            'The crawl source list, one chunk from a domain nobody at the company controls, and the tool manifest of each consuming application.',
            'The total number of chunks in the corpus and its storage size.',
            'The embedding model name and version.',
            'A sample answer showing the assistant citing a crawled page correctly.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The third option in that remediation list is worth naming: outnumbering a poisoned chunk does not work, because the model is not voting. One instruction in one chunk is enough.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for a poisonable corpus. Place those four in a reading order and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the vector store feeds at least one production application' },
        { id: 'p2', label: 'the write path', code: 'and one of its ingestion sources accepts writes from outside the company' },
        { id: 'p3', label: 'the missing marking', code: 'and chunks carry no provenance field identifying their source' },
        { id: 'p4', label: 'the impact', code: 'and a consuming application registers at least one tool' },
        { id: 'd1', label: 'the write path', code: 'and the store holds more than one million chunks', distractor: true },
        { id: 'd2', label: 'the missing marking', code: 'and the embedding model is more than a year old', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and retrieval latency is above two hundred milliseconds', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'All three distractors are facts about the store that a dashboard would happily show you. None of them changes who can write into it or what the reader can do, which are the only two questions this rule is asking.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An internal assistant answers HR questions from a corpus built out of a shared drive folder that every employee can write to. The assistant has no tools and its answers are shown as plain text. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The ingestion configuration for the corpus, the permissions on the shared drive folder, and the consuming application manifest.',
          options: [
            'The ingestion configuration for the corpus, the permissions on the shared drive folder, and the consuming application manifest.',
            'The HR policy documents themselves, reviewed for accuracy.',
            'The assistant conversation logs for the last month.',
          ],
          why: 'The write path is a permission on a folder, and the impact is in the manifest. Reviewing the documents finds today content, not tomorrow content.',
        },
        {
          part: 'condition',
          answer:
            'A corpus ingesting from a location any employee can write to, feeding an assistant whose answers are presented as authoritative HR guidance.',
          options: [
            'A corpus ingesting from a location any employee can write to, feeding an assistant whose answers are presented as authoritative HR guidance.',
            'A corpus containing documents that have not been updated in over a year.',
            'A corpus whose documents are longer than the chunk size, so they are split.',
          ],
          why: 'An open internal write path plus an authoritative presentation. Staleness and chunking are quality concerns rather than security ones.',
        },
        {
          part: 'context',
          answer:
            'How many people can write to the folder, whether documents are reviewed before ingestion, and whether the assistant answer cites the chunk it came from.',
          options: [
            'How many people can write to the folder, whether documents are reviewed before ingestion, and whether the assistant answer cites the chunk it came from.',
            'Whether the vector store is hosted in the same region as the application.',
            'How often the corpus is re embedded.',
          ],
          why: 'Citation is the enrichment that decides whether a wrong answer can be traced back to a document, which is the difference between a fixable incident and a rumour.',
        },
        {
          part: 'severity',
          answer:
            'Medium. There are no tools and no external write path, so the impact is misinformation given with authority to employees rather than an action taken.',
          options: [
            'Medium. There are no tools and no external write path, so the impact is misinformation given with authority to employees rather than an action taken.',
            'Critical, because the corpus can be poisoned by anyone with write access.',
            'Low, because employees are trusted and HR guidance is not a security control.',
          ],
          why: 'Honest severity is what makes a posture team credible. An insider only path into a tool free assistant is real and it is not critical, and calling it critical costs you the next argument.',
        },
        {
          part: 'falsePositives',
          answer:
            'Corpora built from a folder with a reviewed write path, where a named team approves changes before ingestion, tagged with that team as the owner.',
          options: [
            'Corpora built from a folder with a reviewed write path, where a named team approves changes before ingestion, tagged with that team as the owner.',
            'Corpora used only by internal assistants, since employees are already trusted.',
            'Corpora smaller than one thousand chunks, which are easy to review by hand.',
          ],
          why: 'The exception names the control that removes the risk. Size and internal use are not controls, and hand review of a thousand chunks is a promise nobody keeps.',
        },
        {
          part: 'remediation',
          answer:
            'Restrict write access on the source folder to the HR team, require review before ingestion, and cite the source document in every answer.',
          options: [
            'Restrict write access on the source folder to the HR team, require review before ingestion, and cite the source document in every answer.',
            'Add a disclaimer to every answer saying it may be inaccurate.',
            'Move the corpus to a different vector store product with better access controls.',
          ],
          why: 'Narrow the write path, review the writes, and make every answer traceable. A disclaimer transfers responsibility without changing anything.',
        },
        {
          part: 'evidence',
          answer:
            'The folder permissions showing company wide write access, the ingestion schedule, and one answer quoting a chunk with no reviewer attached to it.',
          options: [
            'The folder permissions showing company wide write access, the ingestion schedule, and one answer quoting a chunk with no reviewer attached to it.',
            'A list of everyone who has ever written to the folder.',
            'The vector store vendor security certification.',
          ],
          why: 'The permission and one unreviewed answer make the path concrete. A list of past writers is a personnel record and proves nothing about the configuration.',
        },
      ],
      closing:
        'This one is medium, and saying so is the point. A rule that returns critical for everything gets muted within a week, and the next real critical arrives inside a muted channel.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the HR assistant corpus.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the corpus feeds an assistant that answers HR questions' },
          { id: 'f2', label: 'the write path', code: 'and it ingests from a folder every employee can write to' },
          { id: 'f3', label: 'the missing review', code: 'and no one reviews a document before it is ingested' },
          { id: 'f4', label: 'the missing marking', code: 'and answers do not cite the document they came from' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, write path, missing review, missing marking. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-retrieved-text-is-trusted',
      setup:
        'A design review for a support assistant. The team explains that retrieved content is safe because it comes from their own vector store rather than from the user.',
      code:
        'prompt = SYSTEM + "\\n\\nReference material:\\n" + retrieved + "\\n\\nUser question: " + question\n# retrieved comes from our own store, so it is trusted\n# question comes from the user, so it is sanitised',
      language: 'python',
      question: 'What is wrong with the comment on the second line?',
      options: [
        { text: 'Nothing. Content from your own store is under your control.', correct: false },
        {
          text: 'The store is not the author. Whoever could write into the ingested sources wrote that text, and it now sits above the user question in the prompt.',
          correct: true,
        },
        { text: 'It is wrong because embeddings can be reversed, so the store cannot be trusted with the data.', correct: false },
        { text: 'It is wrong only if the store is hosted by a third party.', correct: false },
      ],
      silently:
        'The assistant works, cites real internal documents, and gives good answers all day. The trust boundary was drawn around the wrong thing: around the storage system rather than around the people who can write into it. Because retrieved text is placed above the user question, an instruction inside a chunk is read before the question and is the material the model treats as reference, which is the most authoritative position in the whole prompt.',
      explanation:
        'Owning the database is not the same as owning the content. Retrieval is a similarity search over text somebody wrote, and the security question is who that somebody could be: the crawl, the ticket queue, the shared folder, the vendor feed. Fact 16 defines RAG poisoning exactly this way, injecting hostile documents into the source that retrieval pulls from, and it notes the two properties that make it attractive: it needs no access to the model, and it persists as long as the document is there. Trust follows the write path, never the storage system.',
    },

    handoff: {
      canNow: [
        'Describe the four steps of retrieval and say which one selects untrusted text',
        'Explain why closest is not the same as true or allowed',
        'Write a rule against a corpus with an open write path, ranked by what its consumers can do',
      ],
      note: 'Q2.11 is the definition of RAG poisoning and Q2.13 is the multi tenant filter, which is the next lesson. Fact 16 is the one to be able to say cold.',
    },
  },
}
