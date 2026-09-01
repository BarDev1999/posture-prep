import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L30',
  number: 30,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'RAG risks: poisoning, leakage, authorize before retrieval',
  objective:
    'You will be able to say why authorisation has to happen before retrieval rather than after it, and write the rule that finds a store where it happens after.',
  minutes: 13,
  difficulty: 'hard',
  sources: ['F17', 'Q2.12', 'Q2.13', 'F16'],

  steps: {
    vocabulary: [
      {
        term: 'authorize before retrieval',
        definition: 'Deciding what this user may see and building that limit into the query, so forbidden chunks are never fetched at all.',
      },
      {
        term: 'post filtering',
        definition: 'Fetching the closest chunks first and dropping the ones this user may not see afterwards. The data has already been in the context by then.',
      },
      {
        term: 'metadata filter',
        definition: 'A condition on a field stored beside the chunk, such as tenant id, applied inside the search rather than after it.',
      },
      {
        term: 'cross tenant leakage',
        definition: 'One customer data appearing in another customer answer. In a shared store it is a filtering mistake rather than a break in.',
      },
      {
        term: 'inference',
        definition: 'The model producing a summary or conclusion from text it saw. It is why removing a chunk from the result list is not the same as removing what it said.',
      },
    ],

    model: {
      narrative: [
        'This is one idea, and it is the highest value idea in the whole RAG section: the order of the filter and the fetch.',
        '',
        'Post filtering looks correct in a diagram. Search returns ten chunks, code drops the three this user may not see, seven go into the prompt. The user never receives the three, so nothing leaked. That is the argument, and it fails at one word: never.',
        '',
        'They were fetched. Whether they reach the model depends on where the filter sits in your code, and in most implementations the filter runs on the result list while the assembled prompt is built from the same list. Even where it does not, you have built a system whose safety depends on the ordering of two lines that anyone can reorder.',
        '',
        'Fact 17 puts the real reason plainly: if retrieval happens first, the data is already in the context and the model saw it, so filtering afterwards is cosmetic and content can still leak through a summary or an inference. That last part is what people miss. The model does not need to quote a chunk to leak it. A count, a comparison, a tone, an average, a name mentioned in passing, all of these carry information out of text that was supposed to be filtered away.',
        '',
        'Authorising before retrieval turns the whole thing into a database question you already know how to answer: the query itself carries the condition, so the rows you may not see are never selected.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption:
          'Ten chunks match the question. Post filtering on the left of the dashed line still put all ten in front of the model; the filter only trimmed the list afterwards.',
        stages: [
          { label: 'top k search, no filter', note: 'ten closest chunks, three of them another tenant', rows: 10 },
          { label: 'chunks assembled into the prompt', note: 'all ten, because the filter has not run yet', rows: 10 },
          { label: 'filter applied to the result list', note: 'three dropped, but the prompt was already built', rows: 7 },
          { label: 'model answers', note: 'from a context that held all ten', rows: 7 },
        ],
      },
      takeaway: 'Filtering after retrieval removes chunks from a list. It cannot remove them from the context the model already read.',
    },

    worked: {
      task:
        'Question 2.13: one vector store serves three tenants with tenant_id on every chunk, and the developers filter by tenant_id after retrieving the top k. Write the rule.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The retrieval code path, the vector store query API calls it makes, and the chunk metadata schema showing which fields exist to filter on.',
          why: 'The finding is an ordering inside code, so the code is the source. The schema matters because a filter you cannot express in the query is a different problem from one you did not.',
          prompt: {
            question: 'How would you detect this at scale, across twenty repositories?',
            answer:
              'Look for a search call whose arguments contain no filter or where clause, followed by a comprehension or loop over the results testing a tenant or user field. That pair is greppable, and it is a much better signal than trying to judge intent from the code.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A retrieval call that passes no tenant or user condition into the vector store query, where the same request path then filters the returned chunks on a tenant or user field.',
          why: 'Stated as a fact about two calls in a sequence rather than as a description of a design, which is what makes it detectable and arguable in the same way by two reviewers.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many tenants share the store, whether the chunk metadata carries a tenant field at all, whether the store supports a filter inside the query, and what the top k is.',
          why: 'If the store cannot filter inside the query, the remediation is not a code change but a separation into one store per tenant, and the ticket should say so.',
          prompt: {
            question: 'Why does the value of top k change the risk?',
            answer:
              'Because it decides how often another tenant chunk is fetched at all. With k of three and a well separated corpus it may be rare; with k of twenty it is routine. It does not change whether the design is wrong, but it does change how much has already been exposed.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a store holding data from more than one customer. High for a single tenant store where the filter separates internal permission levels.',
          why: 'Cross customer is a breach with a notification obligation. Cross department inside one company is serious and is not the same conversation.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Stores holding one tenant only, and stores where the filter exists in the query and the post filter is a second, redundant check. Verified by reading the query arguments rather than by asking.',
          why: 'A redundant post filter after a correct pre filter is good practice, and a rule that flags it teaches people to ignore the rule.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Move the tenant condition into the query as a metadata filter, derive the tenant from the authenticated session rather than from a request parameter, and separate tenants into their own stores where the product supports no filter.',
          why: 'The middle item is the one that gets missed: a filter on a tenant id the client sent is not authorisation, it is a request for the client to please be honest.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The retrieval call showing no filter argument, the post filter a few lines later, and one search result containing a chunk from another tenant.',
          why: 'Two lines of code and one result. The result is what turns a design argument into a demonstrated leak.',
        },
      ],
      result:
        'A rule that catches the most common serious mistake in production RAG systems, and whose evidence is two lines of code sitting near each other.',
    },

    fadeLight: {
      task: 'A rule for a corpus where documents from different permission levels are embedded into one store with no field to filter on.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The chunk metadata schema and the ingestion code that writes it.',
          why: 'A filter needs a field. If the field is absent the finding is in ingestion, not in retrieval.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A store holding documents of more than one classification or permission level, where chunks carry no field recording which.',
          why: 'The absence of a field is a precise, checkable condition and it is the root cause of the whole class.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether any ingested document is restricted, who queries the store, and whether re ingestion is feasible.',
          why: 'Re ingestion cost decides whether the remediation is a day or a quarter, and the ticket is more useful when it says which.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. No filter can be written at all until the field exists, so authorisation before retrieval is impossible by construction.',
          why: 'Impossible by construction is worth saying out loud: this is not a bug in the query, it is a gap in the data model.',
          choices: [
            'High. No filter can be written at all until the field exists, so authorisation before retrieval is impossible by construction.',
            'Medium, since a post filter on the document title can be used instead.',
            'Low, because all the documents belong to the same company.',
            'Critical, because every RAG finding is critical.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Notice the shape of that second option. A post filter on something derived from the text is the same mistake with more steps, and it is what teams reach for when the metadata is missing.',
    },

    fadeHeavy: {
      task: 'A rule for retrieval where the tenant id comes from a request parameter the client sends.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Where the tenant id in the query comes from, whether the session carries one, and whether any endpoint accepts it as a parameter.',
          why: 'The source of the identifier is the entire finding, and it is one line of code away from being correct.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. The filter is inside the query, which looks right, but the value is chosen by the caller, so any tenant can read any other tenant data by changing one field.',
          why: 'This scores higher than the post filter case, because it takes no inference and no persuasion: it is a parameter change.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Derive the tenant from the authenticated session on the server, ignore any tenant field in the request, and reject requests that carry one.',
          why: 'The third clause matters: silently ignoring a parameter leaves a client that thinks it works, and a rejection makes the contract explicit.',
          choices: [
            'Derive the tenant from the authenticated session on the server, ignore any tenant field in the request, and reject requests that carry one.',
            'Validate that the tenant id in the request is a well formed identifier before using it.',
            'Log every request where the tenant id does not match the session, and review the log weekly.',
            'Hash the tenant id so that guessing another one is harder.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The endpoint definition showing the tenant parameter, the query built from it, and one request with another tenant identifier returning that tenant chunks.',
          why: 'A single request with a changed field, and a response containing another tenant content, ends every discussion about likelihood.',
          choices: [
            'The endpoint definition showing the tenant parameter, the query built from it, and one request with another tenant identifier returning that tenant chunks.',
            'The number of tenants currently using the platform.',
            'A statement that the frontend always sends the correct tenant id.',
            'The store access logs for the last thirty days.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Guessable identifiers, hashed identifiers, validated identifiers: all of them miss the point in the same way. The problem is not the shape of the value, it is that the caller chose it.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for question 2.13, the post filtered multi tenant store. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'one vector store holds chunks belonging to more than one tenant' },
        { id: 'p2', label: 'the missing filter', code: 'and the search call passes no tenant condition into the query' },
        { id: 'p3', label: 'the false control', code: 'and the tenant filter is applied to the results afterwards' },
        { id: 'p4', label: 'the consequence', code: 'so another tenant chunks reach the context before being dropped' },
        { id: 'd1', label: 'the missing filter', code: 'and the top k is set higher than ten', distractor: true },
        { id: 'd2', label: 'the false control', code: 'and the chunks are not encrypted at rest', distractor: true },
        { id: 'd3', label: 'the consequence', code: 'so retrieval takes longer than it needs to', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Encryption at rest is the distractor worth pausing on, because it is a real control that is genuinely irrelevant here: the data is decrypted for anyone the store answers, and the store is answering.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An internal knowledge assistant retrieves from one store holding both general documents and HR case files. Every employee can query it. The application drops HR chunks from the results unless the caller is in the HR group. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The retrieval code, the chunk metadata schema, and the group membership check the application performs.',
          options: [
            'The retrieval code, the chunk metadata schema, and the group membership check the application performs.',
            'The HR case files themselves, reviewed for sensitivity.',
            'The identity provider group definitions and their owners.',
          ],
          why: 'The finding is where the group check sits relative to the search, so the code and the schema are what have to be read.',
        },
        {
          part: 'condition',
          answer:
            'A retrieval call that searches the whole store, followed by a group membership check that removes restricted chunks from the results.',
          options: [
            'A retrieval call that searches the whole store, followed by a group membership check that removes restricted chunks from the results.',
            'A store that holds HR case files alongside general documents.',
            'An assistant that every employee in the company can query.',
          ],
          why: 'The mixed store and the wide audience are context. The finding is the ordering: search everything, then filter.',
        },
        {
          part: 'context',
          answer:
            'What the HR chunks contain, how many employees can query the assistant, and whether answers are logged with the chunks that produced them.',
          options: [
            'What the HR chunks contain, how many employees can query the assistant, and whether answers are logged with the chunks that produced them.',
            'How many documents the HR team adds per month.',
            'Which embedding model was used for the corpus.',
          ],
          why: 'Content decides impact, audience decides exposure, and logging decides whether a past leak can be found at all.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Case files about named employees are fetched into the context for any colleague whose question is close enough, and a summary can carry the content out even when the chunk is dropped.',
          options: [
            'Critical. Case files about named employees are fetched into the context for any colleague whose question is close enough, and a summary can carry the content out even when the chunk is dropped.',
            'High, because the chunks are removed before the answer is shown.',
            'Medium, because employees would have to guess what to ask about.',
          ],
          why: 'The second option is the post filtering argument restated, and the third one assumes the attacker needs precision, which similarity search removes.',
        },
        {
          part: 'falsePositives',
          answer:
            'Assistants querying a store that holds no restricted classification at all, verified from the metadata rather than from the document titles.',
          options: [
            'Assistants querying a store that holds no restricted classification at all, verified from the metadata rather than from the document titles.',
            'Assistants used only by employees who have signed a confidentiality agreement.',
            'Assistants where the HR team has agreed to accept the risk in writing.',
          ],
          why: 'An exception has to be a checkable property of the system. An agreement is a decision about the finding, not a reason the finding does not apply.',
        },
        {
          part: 'remediation',
          answer:
            'Put the classification condition inside the query, derived from the caller group membership, or separate HR case files into their own store with its own access path.',
          options: [
            'Put the classification condition inside the query, derived from the caller group membership, or separate HR case files into their own store with its own access path.',
            'Move the group check earlier in the function, before the results are assembled into the prompt.',
            'Reduce top k so that HR chunks are less likely to be returned.',
          ],
          why: 'The second option is the tempting one and it is still post filtering: the search already returned the chunk. Only a condition inside the query, or a separate store, stops the fetch.',
        },
        {
          part: 'evidence',
          answer:
            'The search call with no classification filter, the group check that follows it, and one search result for a non HR caller containing an HR chunk.',
          options: [
            'The search call with no classification filter, the group check that follows it, and one search result for a non HR caller containing an HR chunk.',
            'The list of employees who are members of the HR group.',
            'A sample answer where the assistant correctly refused to discuss an HR case.',
          ],
          why: 'A refusal proves the model behaved well once, which is not the claim. The search result proves the chunk was fetched, which is.',
        },
      ],
      closing:
        'Read the remediation row once more. Moving the check earlier is not the fix, and that is the single most useful sentence in this lesson: the fetch is the event, not the assembly.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the HR case file store.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'one store holds general documents and restricted HR case files' },
          { id: 'f2', label: 'the missing filter', code: 'and the search runs over the whole store for every caller' },
          { id: 'f3', label: 'the false control', code: 'and restricted chunks are removed from the results afterwards' },
          { id: 'f4', label: 'the consequence', code: 'so restricted content reaches the context of a caller who may not see it' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, missing filter, false control, consequence. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'sec-filter-after-retrieval',
      setup:
        'The fix proposed after a cross tenant incident. The team moved the filter into a helper and applied it consistently everywhere, which they describe as the root cause fixed.',
      code:
        'chunks = store.search(embed(question), top_k=10)\nallowed = [c for c in chunks if c.metadata["tenant"] == session.tenant]\nprompt = SYSTEM + "\\n".join(c.text for c in allowed) + question',
      language: 'python',
      question: 'The filter is correct and applied before the prompt is built. What is still wrong?',
      options: [
        { text: 'Nothing. The chunks are filtered before they reach the prompt, so no other tenant data is sent.', correct: false },
        {
          text: 'The search already read and returned other tenant data into this process, and one reordering, one log line or one exception handler puts it back in front of the model.',
          correct: true,
        },
        { text: 'The comparison should use is rather than double equals for the tenant string.', correct: false },
        { text: 'The top k is too high, so the filter has too much to remove.', correct: false },
      ],
      silently:
        'This version genuinely does keep other tenant text out of the prompt today, which is what makes it so persuasive and so fragile. The data still crosses the tenant boundary into this process on every request, so it appears in memory dumps, in debug logging of the raw search result, in error reports, and in whatever the next developer writes above line two. The audit trail is worse than the leak: nothing records that another tenant chunks were read, because from the store point of view the query was legitimate.',
      explanation:
        'Fact 17 is stated in terms of the model, and the model is the strongest case: if retrieval happens first, the data is already in the context, and filtering afterwards is cosmetic because content can still leak through a summary or an inference. But the principle is broader than the model. Authorisation belongs in the query, so that data you may not see is never fetched, never in memory, never in a log and never one refactor away from being sent. The remediation is a metadata filter inside the search, with the tenant taken from the authenticated session, which is the same rule you already know from SQL: filter in the WHERE clause, not in the application.',
    },

    handoff: {
      canNow: [
        'Say why filtering after retrieval is cosmetic, in terms of both the context window and the process',
        'Detect the pattern in code: a search with no filter followed by a filter on the results',
        'Write the rule for a multi tenant store, and name the remediation that actually moves the boundary',
      ],
      note: 'Q2.12 asks for the principle and Q2.13 is the scenario you just wrote a rule for. Fact 17 is the sentence, and it is on the priority list.',
    },
  },
}
