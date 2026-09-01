import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L43',
  number: 43,
  topicId: 'cloud',
  sectionId: 3,
  title: 'Posture: CSPM, CIEM, attack paths, toxic combinations',
  objective:
    'You will be able to define a toxic combination and give a four part example, describe how attack path analysis picks the hop to fix, and write the rule that finds the combination rather than its parts.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['F35', 'Q3.15', 'Q3.16', 'Q3.17', 'A#Core terms that keep showing up in questions'],

  steps: {
    vocabulary: [
      {
        term: 'toxic combination',
        definition: 'A set of findings that are each moderate alone and critical together, because together they form a usable path.',
      },
      {
        term: 'attack path analysis',
        definition: 'A graph algorithm over the security graph that finds paths actually exploitable, from entry point to target asset.',
      },
      {
        term: 'choke point',
        definition: 'A node many attack paths run through. One fix there gives the highest return of any single fix.',
      },
      {
        term: 'blast radius',
        definition: 'Everything an attacker can reach after taking over a given identity or asset.',
      },
      {
        term: 'agentless scanning',
        definition: 'Scanning through the provider API and disk snapshots. Broad and fast, and a point in time picture with no runtime visibility.',
      },
    ],

    model: {
      narrative: [
        'Everything in this topic has been a single finding on a single resource. This lesson is about the thing a posture team is actually paid for, which is noticing when several of them line up.',
        '',
        'File A gives the canonical example and question 3.15 asks for it: an internet facing workload, with a vulnerability that has a public exploit, with a broadly permissioned role, that reaches a bucket holding sensitive data. Four findings. Individually each one is a medium that a busy team will defer. Together they are a path from the internet to your data, and the only thing that changes between the two readings is whether anybody joined them up.',
        '',
        'Attack path analysis is that join, done as a graph. Nodes are assets and identities, edges are reachability and permission, and the algorithm looks for paths from an entry point to something worth reaching. Two outputs matter: the path itself, and the choke point, meaning the node that many paths run through, where one fix breaks the most chains.',
        '',
        'That reframes prioritisation completely, and it is what question 3.17 is really asking with its twelve thousand findings. Sorting by severity gives you the loudest findings. Sorting by path membership gives you the ones that are part of something, and then the choke points give you the order to fix them in.',
        '',
        'It also settles the agentless against agent question. Agentless gives you the graph: configuration and identities from the API, everything, quickly, with nothing installed. An agent gives you what is happening on the workload right now and the ability to stop it. Fact from file A: agentless for coverage and posture, agent for detection and prevention, and a good platform does both and correlates between them.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The four part toxic combination from file A. Each box on its own is a medium that gets deferred; the arrows are what make it critical.',
        nodes: [
          { label: 'an internet facing workload', note: 'Reachable from outside. On its own: expected, and by design.' },
          { label: 'with a vulnerability that has a public exploit', note: 'On its own: one of thousands in the backlog.' },
          {
            label: 'running with a broadly permissioned role',
            note: 'The choke point in most real graphs, because many paths run through it.',
            danger: true,
          },
          { label: 'whose role reaches a bucket with sensitive data', note: 'On its own: a normal grant somebody needed once.' },
          { label: 'a path from the internet to the data', note: 'Which is the finding, and it belongs to no single resource.' },
        ],
      },
      takeaway: 'A toxic combination is a path, not a resource. Fix the choke point, because that is where one change breaks many paths.',
    },

    worked: {
      task:
        'Write the rule for the four part toxic combination in file A, and make it produce one finding for the path rather than four for the parts.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Four joined sources: network reachability from the route tables and security groups, vulnerability findings with exploit availability, the role attached to the workload with its effective permissions, and data classification from DSPM.',
          why: 'Each source already exists and produces its own findings. The rule is the join, which is why the value is in the correlation rather than in any one scanner.',
          prompt: {
            question: 'Why not simply raise the severity of each of the four findings instead?',
            answer:
              'Because the severity of each one is honest and raising it makes every one of that kind loud, everywhere. The combination is rare and the parts are not. One finding for the path, with the four parts as its evidence, tells the team what to fix first and leaves the ordinary findings ranked correctly.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A workload reachable from the internet, running an image or package with a vulnerability that has a known public exploit, holding a role whose effective permissions reach a data store, where that store is classified as sensitive.',
          why: 'Four clauses joined by and, evaluated as a path. The order matters for reading: entry, weakness, identity, target.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the exploit is known to be used in the wild, whether the workload is in production, whether the role permissions have been used, and how many other paths run through the same role.',
          why: 'The last one is the choke point count, and it is what turns a list of paths into an order of work.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical, and stated as a path rather than as a resource: internet to workload to role to data. The four constituent findings keep their own lower severities.',
          why: 'This is the point file A makes about exposure: the same four facts are moderate individually and critical as a chain, and prioritisation should follow the chain.',
          prompt: {
            question: 'The workload is internet facing but the vulnerable package is not in the code path that serves traffic. Does the finding hold?',
            answer:
              'It weakens, and honest tooling says so. This is the difference between a vulnerability and an exposure: reachability of the package matters, not just its presence. If your data can tell, the finding should drop to high and say why; if it cannot, the finding should say that too.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Paths where a compensating control breaks a hop: a web application firewall blocking the known exploit, a permission boundary preventing the role from reaching the store, or the store holding only synthetic data. Each verified from configuration rather than from a claim.',
          why: 'A path finding has as many exception routes as it has hops, and each one has to be checkable. This is where a posture team earns trust, because a path that has already been broken and is still reported is the fastest way to lose it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Break the cheapest hop first, usually the role: narrow it to the data it actually uses. Then patch the vulnerability, then reconsider whether the workload needs to be internet facing.',
          why: 'Ordered by cost and by how many other paths the same fix breaks. Naming the choke point is the whole value of the finding.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The path drawn as four hops, each with the artefact behind it: the route and security group, the vulnerability with its exploit reference, the role policy with its effective permissions, and the classification of the target.',
          why: 'Four artefacts and one picture. The picture is what gets the meeting to agree, and the artefacts are what survive the argument afterwards.',
        },
      ],
      result:
        'One critical finding that no single scanner would produce, with a named choke point and a remediation order. This is the output that distinguishes a posture programme from a set of scanners.',
    },

    fadeLight: {
      task: 'A rule for the choke point itself: a role that appears in many attack paths.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The computed attack paths, with the identities and assets each one traverses.',
          why: 'A choke point is a property of the graph rather than of the role, so it can only be found after the paths exist.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An identity or asset that appears in more than a threshold number of distinct paths to a sensitive target.',
          why: 'A threshold rather than a description, so the rule is reproducible and the number can be tuned per environment.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many of those paths would break if this node were fixed, what fixing it costs, and who owns it.',
          why: 'Paths broken per fix is the return on the change, and it is the number that gets the work scheduled.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Inherited from the highest severity path it appears in, with the number of paths reported alongside so the return on fixing it is visible.',
          why: 'A choke point is not more dangerous than the worst path through it, and it is more valuable to fix than any single one.',
          choices: [
            'Inherited from the highest severity path it appears in, with the number of paths reported alongside so the return on fixing it is visible.',
            'Critical always, because a choke point by definition affects many paths.',
            'The sum of the severities of every path through it.',
            'Medium, since a choke point is an analysis artefact rather than a misconfiguration.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Summing severities is the tempting arithmetic and it produces numbers nobody can interpret. Report the worst path and the count, and let the reader do the comparison.',
    },

    fadeHeavy: {
      task: 'A rule for prioritising twelve thousand open findings, which is question 3.17.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'For every finding: is the resource reachable from the internet, does an exploit exist for the weakness, and does the resource or its identity reach classified data.',
          why: 'Three enrichments, applied to the whole set, are what turn a flat list into a ranked one. Each one is a filter that cuts the list by an order of magnitude.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Three stages: first keep what is reachable, then keep what is exploitable, then rank by what it reaches. Everything else is a backlog rather than a queue.',
          why: 'This is the three stage mechanism the question asks for, and each stage names the field that does the cutting.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Work the surviving set by choke point, so each change breaks the largest number of paths, and report the count of paths closed rather than the count of findings closed.',
          why: 'Findings closed rewards clearing the easy ones. Paths closed rewards fixing the ones that matter, and it is the number to put in front of a manager.',
          choices: [
            'Work the surviving set by choke point, so each change breaks the largest number of paths, and report the count of paths closed rather than the count of findings closed.',
            'Work the list in severity order from critical downwards until the backlog is empty.',
            'Assign findings to teams by resource owner and let each team prioritise its own.',
            'Close every finding older than ninety days as accepted risk.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The funnel: twelve thousand findings, the number surviving each of the three stages, and the paths the surviving set forms.',
          why: 'The funnel is the artefact that justifies ignoring most of the list, which is the decision the whole exercise exists to support.',
          choices: [
            'The funnel: twelve thousand findings, the number surviving each of the three stages, and the paths the surviving set forms.',
            'A spreadsheet of all twelve thousand findings sorted by severity.',
            'The trend of total findings over the last six months.',
            'The average time to close a finding per team.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'File A gives the number to remember here: alert volume reduced by a factor of twenty five using this kind of prioritisation. The reduction is not in the findings, it is in the ones anybody has to look at.',
    },

    parsons: {
      task:
        'Four of these belong in the toxic combination rule. Place them in the order the path runs and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the entry point', code: 'the workload is reachable from the internet' },
        { id: 'p2', label: 'the weakness', code: 'and it runs a package with a vulnerability that has a public exploit' },
        { id: 'p3', label: 'the identity', code: 'and it holds a role whose effective permissions reach a data store' },
        { id: 'p4', label: 'the target', code: 'and that store is classified as holding sensitive data' },
        { id: 'd1', label: 'the weakness', code: 'and its vulnerability has a CVSS score above 9.0', distractor: true },
        { id: 'd2', label: 'the identity', code: 'and its role was created by a user who has left the company', distractor: true },
        { id: 'd3', label: 'the target', code: 'and the data store is larger than one terabyte', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The CVSS distractor is the one this lesson exists to reject. A high score with no exploit and no reachability is a lower risk than a medium score with both, and building the score into the condition would put you back to sorting the twelve thousand by severity.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. Combine what you have learnt in this topic. An internet facing container runs an image with an exploitable library, the pod uses a service account with no restriction, the node role can read the data lake, and version one metadata is permitted. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'Network reachability, image vulnerability findings with exploit availability, the pod service account and node role permissions, the node metadata options, and data classification.',
          options: [
            'Network reachability, image vulnerability findings with exploit availability, the pod service account and node role permissions, the node metadata options, and data classification.',
            'The container runtime logs and the pod restart counts.',
            'The cluster audit log for the last thirty days.',
          ],
          why: 'Five joined sources, each of which already produces findings on its own. The rule is the join.',
        },
        {
          part: 'condition',
          answer:
            'An internet reachable pod running an image with a publicly exploitable vulnerability, on a node whose metadata service permits token free requests, where the node role reaches classified data.',
          options: [
            'An internet reachable pod running an image with a publicly exploitable vulnerability, on a node whose metadata service permits token free requests, where the node role reaches classified data.',
            'A pod running an image with a critical vulnerability.',
            'A node whose role can read the data lake.',
          ],
          why: 'The condition is the chain: entry, weakness, escalation, target. Either of the other two options is a single finding that thousands of resources will match.',
        },
        {
          part: 'context',
          answer:
            'Whether a network policy blocks the metadata address from pods, whether the vulnerable code path is reachable, and how many other pods share this node role.',
          options: [
            'Whether a network policy blocks the metadata address from pods, whether the vulnerable code path is reachable, and how many other pods share this node role.',
            'How many replicas of the pod are running and in which zones.',
            'Which registry the image came from and when it was built.',
          ],
          why: 'The first is a compensating control that would break the chain, the second is exposure rather than presence, and the third is the choke point count.',
        },
        {
          part: 'severity',
          answer:
            'Critical, stated as a path: internet to pod to node credentials to the data lake, with the metadata setting as the escalation hop.',
          options: [
            'Critical, stated as a path: internet to pod to node credentials to the data lake, with the metadata setting as the escalation hop.',
            'Critical, because the image contains a critical vulnerability.',
            'High, because container escape would still be required to reach the node role.',
          ],
          why: 'The third option contains a real misconception worth killing: reaching node credentials through metadata needs no escape at all, only a network request.',
        },
        {
          part: 'falsePositives',
          answer:
            'Clusters with a network policy blocking the metadata address from pods, or nodes with a hop limit of one, or pods using their own scoped identity, each verified from configuration.',
          options: [
            'Clusters with a network policy blocking the metadata address from pods, or nodes with a hop limit of one, or pods using their own scoped identity, each verified from configuration.',
            'Clusters managed by the platform team, which follows the hardening standard.',
            'Pods whose images are rebuilt weekly, so vulnerabilities are short lived.',
          ],
          why: 'Three separate compensating controls, each of which breaks the chain at a different hop. Following a standard is a claim, and weekly rebuilds do not remove a library that is still vulnerable.',
        },
        {
          part: 'remediation',
          answer:
            'Break the escalation hop first: block the metadata address from pods and set the hop limit to one. Then give the pod its own scoped identity, then patch the image.',
          options: [
            'Break the escalation hop first: block the metadata address from pods and set the hop limit to one. Then give the pod its own scoped identity, then patch the image.',
            'Patch the image and redeploy, since the vulnerability is the entry point.',
            'Remove the pod from the internet facing service.',
          ],
          why: 'The metadata change is cheap, immediate and breaks this path for every pod on every node, which is what makes it the choke point. Patching is necessary and slower, and it fixes one image.',
        },
        {
          part: 'evidence',
          answer:
            'The four hops with their artefacts: the ingress path, the vulnerability with its exploit reference, the node metadata options and role permissions, and the classification of the data lake.',
          options: [
            'The four hops with their artefacts: the ingress path, the vulnerability with its exploit reference, the node metadata options and role permissions, and the classification of the data lake.',
            'The image scan report in full.',
            'A demonstration of the exploit against the running pod.',
          ],
          why: 'Four artefacts, one path, no exploitation. A live demonstration against production is a conversation about your testing rather than their configuration.',
        },
      ],
      closing:
        'This is the end of the cloud topic, and it is deliberately a rule that reuses every lesson in it: routing, security groups, IAM, metadata and classification. The job is not knowing those five things separately. It is noticing when they meet.',
      fallback: {
        task: 'Same rule, as blocks. The four hops of the container path.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the entry point', code: 'the pod is reachable from the internet' },
          { id: 'f2', label: 'the weakness', code: 'and its image has a publicly exploitable vulnerability' },
          { id: 'f3', label: 'the escalation', code: 'and the node metadata service answers requests without a token' },
          { id: 'f4', label: 'the target', code: 'and the node role can read the classified data lake' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Entry, weakness, escalation, target. Four hops, one finding. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'cloud-severity-is-cvss',
      setup:
        'A vulnerability report with four thousand findings. The team sorts by CVSS score and starts at the top, planning to work down the list.',
      code:
        'Sorted backlog:\n1. CVSS 9.8, library in an internal batch image, no exploit known, no internet path\n2. CVSS 9.6, base image of a decommissioned service\n3. CVSS 6.5, library in the internet facing API, public exploit, role reaches customer data',
      language: 'text',
      question: 'What does sorting by CVSS get wrong here?',
      options: [
        {
          text: 'It puts the third finding last, although it is the only one with a complete path from the internet to customer data.',
          correct: true,
        },
        { text: 'Nothing. CVSS already accounts for exploitability in its temporal metrics.', correct: false },
        { text: 'It is wrong only because the second finding is on a decommissioned service.', correct: false },
        { text: 'It should be sorted by CVSS descending within each severity band instead.', correct: false },
      ],
      silently:
        'The team makes visible progress: two nine point findings closed in the first week, a chart that goes down, and a report that says the highest severity items are being handled first. Nothing about the process looks wrong, and the finding that is actually being exploited sits at position three thousand with a medium label. The failure only becomes visible as an incident, and the incident report shows that the finding was known, ranked and deferred by an agreed process.',
      explanation:
        'CVSS scores the weakness in isolation: how bad it would be if it were reachable and exploited. Exposure is the missing multiplier, and fact 35 puts it plainly: exposure is what turns a vulnerability from a CVSS number into real risk, and it is what drives prioritisation. The practical mechanism is the three stage funnel from question 3.17: keep what is reachable, keep what is exploitable, then rank by what it reaches. That is also the idea behind SmartScore, which prioritises by real world exposure and production behaviour rather than by theoretical severity.',
    },

    handoff: {
      canNow: [
        'Define a toxic combination and give the four part example from file A',
        'Explain attack path analysis and what a choke point is worth',
        'Prioritise a large backlog in three stages, naming the field that cuts at each one',
      ],
      note: 'Q3.15, Q3.16, Q3.17 and Q3.18 are all in this lesson, and they are the four highest value open questions in the cloud section. Fact 35 is on the priority list.',
    },
  },
}
