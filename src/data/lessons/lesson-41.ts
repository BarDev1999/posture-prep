import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L41',
  number: 41,
  topicId: 'cloud',
  sectionId: 3,
  title: 'IMDS, and why SSRF reaches it',
  objective:
    'You will be able to describe the metadata service and the difference between its two versions, trace the SSRF path to stolen role credentials, and write the rule that closes it.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F28', 'F29', 'F45', 'Q3.8', 'Q3.5'],

  steps: {
    vocabulary: [
      {
        term: 'IMDS',
        definition: 'The instance metadata service, reachable from inside an instance at 169.254.169.254, returning metadata and credentials for the attached role.',
      },
      {
        term: 'link local address',
        definition: 'An address that is only meaningful on the local link and is never routed. 169.254.169.254 is one, which is why it is reachable only from inside.',
      },
      {
        term: 'SSRF',
        definition: 'Server side request forgery: persuading a server to make a request to an address the attacker chose, from inside the network.',
      },
      {
        term: 'IMDSv1',
        definition: 'The original version. A plain GET returns credentials, which is why one SSRF bug is enough to steal them.',
      },
      {
        term: 'IMDSv2',
        definition: 'Requires a PUT to obtain a token, that token in a header on every request, and a hop limit, so a naive SSRF fails.',
      },
    ],

    model: {
      narrative: [
        'Every instance needs to know things about itself, and anything with a role needs credentials for it. Both come from the metadata service at 169.254.169.254, an address that is reachable from inside the instance and routed nowhere else.',
        '',
        'The credentials part is what matters here. A role attached to an instance is not a file on disk: the instance asks the metadata service, receives temporary credentials, and uses them. Any code running on that instance can do the same, and so can any code that can make the instance issue a request on its behalf.',
        '',
        'That is why server side request forgery matters so much more in cloud than it used to. Question 4.12 and fact 45 spell out the path: the user supplies a URL pointing at 169.254.169.254, the server fetches it from inside the network, receives the temporary credentials for the attached role, and returns them in the response.',
        '',
        'Version two closes the naive version of this. A caller must first send a PUT to obtain a token, then present that token in a header on every request, and a hop limit stops the response travelling further than the instance itself. A request forgery that can only make a simple GET now gets nothing.',
        '',
        'So fact 29 gives the rule in one line: require tokens, meaning HttpTokens set to required, and set the hop limit to 1. That is the finding to write.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The SSRF to credential theft path from fact 45. Nothing here is a break in: the server is doing exactly what it was written to do, from a place the attacker cannot reach directly.',
        nodes: [
          { label: 'the user supplies a URL for a preview', note: 'An ordinary feature. Fetch a page and show a thumbnail.' },
          {
            label: 'the URL is 169.254.169.254/latest/meta-data/iam/security-credentials/',
            note: 'A link local address, unreachable from the internet, reachable from the server.',
            danger: true,
          },
          { label: 'the server fetches it from inside', note: 'With no token, if version one is permitted. A plain GET is enough.' },
          { label: 'the metadata service returns credentials', note: 'Temporary credentials for whatever role is attached to the instance.' },
          { label: 'the response is shown to the user', note: 'Or logged, or cached, or included in an error message.' },
        ],
      },
      takeaway: 'Metadata answers anything on the instance, including credentials. Require the token and set the hop limit to 1.',
    },

    worked: {
      task:
        'Write the rule for instances that still permit version one of the metadata service, which is the direct answer to question 3.8.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Instance metadata options from the provider API, meaning HttpTokens and HttpPutResponseHopLimit, plus the launch template or scaling group each instance came from.',
          why: 'The instance setting is the finding and the launch template is where it will come back from. Fixing running instances without fixing the template means the finding returns on the next scale out.',
          prompt: {
            question: 'Why include the launch template rather than just the instances?',
            answer:
              'Because instances are replaced constantly and templates are not. A remediation applied to fifty running instances is undone by the next deployment, and the rule then reports the same finding next week, which is how a team learns to ignore it.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An instance with HttpTokens set to optional, or with a hop limit greater than 1, or a launch template with either of those.',
          why: 'Named fields with named values, which makes the rule mechanical. Optional means version one still answers, and the name is misleading enough to be worth stating.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What role is attached to the instance and what it can reach, whether the instance runs anything that fetches a URL supplied by a user, and whether it is internet facing.',
          why: 'The role decides what stolen credentials are worth, and a workload that fetches user supplied URLs is the difference between a weakness and an exploitable path.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the instance runs a service that fetches user supplied URLs and holds a role with broad permissions. High when the role is broad without that path. Medium when the role is narrow.',
          why: 'Same shape as the whole section: reachability of the weakness, multiplied by the value of what it protects.',
          prompt: {
            question: 'The instance has no public address and no user supplied URL feature. Why is this still worth reporting?',
            answer:
              'Because the metadata service does not care where the request came from, only that it came from the instance. Any code execution on that instance, from a dependency, a container image or a pipeline step, gets credentials with a single GET. Version two raises the bar for all of those, not just for request forgery.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Legacy workloads with an agent or software development kit too old to send the token, allowed by tag with an owner and an upgrade date. No exception without a date.',
          why: 'This is a genuine compatibility problem in old images, and the honest exception is a scheduled upgrade rather than a permanent allowance.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Set HttpTokens to required and the hop limit to 1 on the instance and in the launch template, and where a workload has no need for a role at all, remove the role.',
          why: 'Fact 29 gives the first half. The second half is the stronger fix that people forget: credentials that are not there cannot be stolen.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The metadata options for the instance, the launch template showing where it came from, the attached role with its effective permissions, and any request in the access log to the metadata address.',
          why: 'A logged request to 169.254.169.254 from an application, if it exists, moves the finding from a configuration argument to an incident.',
        },
      ],
      result:
        'A rule that closes the most reliable credential theft path in cloud, with the remediation applied where it will not be undone by the next deployment.',
    },

    fadeLight: {
      task: 'A rule for an application feature that fetches a URL supplied by a user.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application code paths that make outbound requests from a user supplied address, and the egress rules of the subnet they run in.',
          why: 'The feature is in the code and the reach is in the network, so both are needed.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A request built from a user supplied URL with no destination allowlist, no block on link local and private ranges, and no revalidation after a redirect.',
          why: 'Three missing controls, and the redirect one is the most commonly missing: a public URL can redirect to 169.254.169.254 on the second hop.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the response is returned to the user, whether the instance permits version one metadata, and what role it holds.',
          why: 'Returning the response to the user makes exfiltration trivial. Without that, a blind request forgery is still useful and much harder to exploit.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the response is returned to the user and version one metadata is permitted, since that is the complete path from a form field to role credentials.',
          why: 'Two ordinary findings compose into a credential theft path, which is the definition of a toxic combination.',
          choices: [
            'Critical when the response is returned to the user and version one metadata is permitted, since that is the complete path from a form field to role credentials.',
            'High, because request forgery only allows reading pages that the server can already read.',
            'Medium, because the attacker cannot choose which role is attached to the instance.',
            'Low while the application has no public users.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Fact 45 lists exactly these controls: enforce version two, allowlist outbound destinations and block link local ranges, and check again after every redirect.',
    },

    fadeHeavy: {
      task: 'A rule for a container workload where the pod can reach the node metadata service.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What role the node carries, whether any network policy blocks the metadata address from pods, and whether pods run untrusted code.',
          why: 'A pod that can reach node metadata inherits the node identity, which is almost always broader than the pod own service account.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the node role can reach classified data or create identities, because any pod on the node can assume the node identity.',
          why: 'This is the container version of the same path, and it is the reason file A includes IMDS reachability in the evidence for the privileged pod example.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Block the metadata address from pods with a network policy, set the hop limit to 1 so the response cannot leave the node, and use per pod identities rather than the node role.',
          why: 'The hop limit is the control that makes this specific: a hop limit of one means a response cannot travel from the node into a pod network namespace.',
          choices: [
            'Block the metadata address from pods with a network policy, set the hop limit to 1 so the response cannot leave the node, and use per pod identities rather than the node role.',
            'Rotate the node role credentials more frequently.',
            'Run the pods as a non root user.',
            'Move the workload to a node pool with a smaller instance type.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The node role and its permissions, the absence of a network policy blocking the metadata address, the hop limit setting, and a request from inside a pod that returns credentials.',
          why: 'The request from inside a pod is the demonstration, and it takes one command in a debug container.',
          choices: [
            'The node role and its permissions, the absence of a network policy blocking the metadata address, the hop limit setting, and a request from inside a pod that returns credentials.',
            'The list of pods currently running on the node.',
            'The container image scan results for the workload.',
            'The cluster version and its upgrade history.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Running as non root is a real control against several things and it does nothing here: the metadata service does not ask which user is calling.',
    },

    parsons: {
      task:
        'Four of these belong in the version one metadata rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the setting', code: 'an instance has HttpTokens set to optional' },
        { id: 'p2', label: 'the second setting', code: 'or a metadata hop limit greater than one' },
        { id: 'p3', label: 'the source of truth', code: 'and the launch template it came from carries the same setting' },
        { id: 'p4', label: 'the impact', code: 'and the attached role can reach data or identities beyond this instance' },
        { id: 'd1', label: 'the setting', code: 'and the instance metadata service is enabled at all', distractor: true },
        { id: 'd2', label: 'the source of truth', code: 'and the instance operating system is out of support', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the instance has a public IP address', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The first distractor would match every instance in the fleet, because metadata is how an instance learns anything about itself. And the public address one is the trap on this lesson: reachability of the instance from the internet is not what makes metadata reachable.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A document conversion service accepts a URL, downloads the file, converts it and returns the result. It runs on instances with version one metadata permitted and a role that can read the whole document bucket. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The service code path that fetches the URL, the instance metadata options, and the role attached to those instances.',
          options: [
            'The service code path that fetches the URL, the instance metadata options, and the role attached to those instances.',
            'The converted documents and their access logs.',
            'The service uptime and error rate metrics.',
          ],
          why: 'The three artefacts of the path: the feature that makes the request, the setting that answers it, and the identity it returns.',
        },
        {
          part: 'condition',
          answer:
            'A service that fetches a user supplied URL with no allowlist and no link local block, running on an instance where HttpTokens is optional.',
          options: [
            'A service that fetches a user supplied URL with no allowlist and no link local block, running on an instance where HttpTokens is optional.',
            'A service that accepts a URL from a user.',
            'An instance where HttpTokens is optional.',
          ],
          why: 'Either half alone is a finding elsewhere in this lesson. Together they are one path, and reporting them together is what makes the severity honest.',
        },
        {
          part: 'context',
          answer:
            'Whether the fetched content or an error containing it is returned to the user, what the attached role can reach, and whether redirects are followed.',
          options: [
            'Whether the fetched content or an error containing it is returned to the user, what the attached role can reach, and whether redirects are followed.',
            'What document formats the service supports.',
            'How large the documents typically are.',
          ],
          why: 'Returned content is exfiltration, and following redirects is the bypass for an allowlist checked only on the first hop.',
        },
        {
          part: 'severity',
          answer:
            'Critical. A form field reaches the metadata service and the response comes back to the caller, yielding credentials for the whole document bucket.',
          options: [
            'Critical. A form field reaches the metadata service and the response comes back to the caller, yielding credentials for the whole document bucket.',
            'High, because the attacker still has to know the metadata address and path.',
            'Medium, because the credentials are temporary and expire within hours.',
          ],
          why: 'The address is documented and the path is well known. Temporary credentials last long enough to copy a bucket, and hours is not a control.',
        },
        {
          part: 'falsePositives',
          answer:
            'Services whose outbound requests go through a proxy with a destination allowlist, and instances with tokens required, verified from the proxy configuration and the metadata options.',
          options: [
            'Services whose outbound requests go through a proxy with a destination allowlist, and instances with tokens required, verified from the proxy configuration and the metadata options.',
            'Services that have been penetration tested in the last year.',
            'Services whose users are all authenticated employees.',
          ],
          why: 'Two checkable controls, either of which breaks the path. A test last year says nothing about the configuration today.',
        },
        {
          part: 'remediation',
          answer:
            'Require metadata tokens and set the hop limit to 1, send outbound fetches through a proxy with an allowlist, block link local and private ranges, and revalidate after every redirect.',
          options: [
            'Require metadata tokens and set the hop limit to 1, send outbound fetches through a proxy with an allowlist, block link local and private ranges, and revalidate after every redirect.',
            'Validate that the submitted URL is well formed and uses HTTPS.',
            'Rate limit the conversion endpoint so bulk extraction is slow.',
          ],
          why: 'Fix both ends and the redirect. A well formed HTTPS URL can point at the metadata address, and rate limiting slows a theft that only needs to succeed once.',
        },
        {
          part: 'evidence',
          answer:
            'The code line that fetches the user supplied URL, the metadata options showing tokens optional, the role permissions, and one request to the metadata address in the outbound logs.',
          options: [
            'The code line that fetches the user supplied URL, the metadata options showing tokens optional, the role permissions, and one request to the metadata address in the outbound logs.',
            'A screenshot of the conversion service working correctly.',
            'The list of every URL submitted to the service this month.',
          ],
          why: 'Four artefacts tracing the path from the form field to the credentials, three of them configuration and one of them observed.',
        },
      ],
      closing:
        'This is the composition question 3.17 is really about: two findings that are each medium alone and critical together. Every posture tool can list version one instances; the value you add is noticing which of them also fetch URLs for strangers.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the conversion service.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the feature', code: 'the service fetches a URL supplied by the user' },
          { id: 'f2', label: 'the missing control', code: 'and no allowlist or link local block applies to that fetch' },
          { id: 'f3', label: 'the setting', code: 'and the instance permits version one metadata requests' },
          { id: 'f4', label: 'the impact', code: 'and the attached role can read the whole document bucket' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Feature, missing control, setting, impact. Read together they are the fact 45 path.',
      },
    },

    trap: {
      misconceptionId: 'cloud-imds-needs-public-ip',
      setup:
        'A finding is raised for version one metadata on a fleet of instances. The team replies that the instances are in a private subnet with no public addresses, so nothing external can reach the metadata service.',
      code:
        'Instances: no public IPv4, private subnet, no internet gateway route\nMetadata options: HttpTokens = optional, HopLimit = 2\nTeam response: unreachable from the internet, closing as not applicable.',
      language: 'text',
      question: 'Why does the private placement not close this?',
      options: [
        {
          text: 'The request comes from inside the instance. Anything running there, or anything that can make the instance issue a request, reaches metadata without touching the internet.',
          correct: true,
        },
        { text: 'It does close it, unless the instance also has an IPv6 address.', correct: false },
        { text: 'It does not close it because the metadata address is publicly routable.', correct: false },
        { text: 'It closes it for version one but not for version two.', correct: false },
      ],
      silently:
        'The reasoning is about the wrong direction and the conclusion holds only against an attacker outside the network. Meanwhile the instance runs application code, a dependency tree somebody else wrote, a container image built by a pipeline and an agent updated automatically, and any one of those reaching the metadata address with a plain GET receives credentials. Nothing logs it as unusual, because a request to the metadata service is what a healthy instance makes all day.',
      explanation:
        'The metadata address is link local: it is never routed and it is always reachable from inside. So the threat model for version one is not somebody on the internet reaching it, it is anything at all with a foothold on the instance, including a server side request forgery bug in your own application, which lets an attacker outside borrow the inside position. Fact 29 sets the requirement independently of network placement: HttpTokens required and hop limit 1. A private subnet is a good control against a different threat.',
    },

    handoff: {
      canNow: [
        'Describe what the metadata service returns and why the address is only reachable from inside',
        'State the difference between the two versions and the setting that enforces the second',
        'Trace the request forgery path to stolen credentials and write the rule for both ends of it',
      ],
      note: 'Q3.8 asks for the version difference and Q4.12 walks the whole path. Facts 28, 29 and 45 are all on the priority list, which tells you how often this comes up.',
    },
  },
}
