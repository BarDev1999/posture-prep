import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L52',
  number: 52,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'Kubernetes, service accounts, and RBAC',
  objective:
    'You will be able to read a role binding, say why a cluster admin binding for an application is critical, and write the rule that finds it along with the token that makes it reachable.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F50', 'Q4.18', 'F49'],

  steps: {
    vocabulary: [
      {
        term: 'service account',
        definition: 'The identity a pod runs as inside the cluster. Every pod has one, and by default its token is mounted into the pod filesystem.',
      },
      {
        term: 'Role',
        definition: 'A set of permitted verbs on resource kinds, inside one namespace. A ClusterRole is the same thing across the whole cluster.',
      },
      {
        term: 'RoleBinding',
        definition: 'The link that gives a role to a subject. A ClusterRoleBinding gives a cluster wide role, whichever namespace the subject is in.',
      },
      {
        term: 'cluster-admin',
        definition: 'The built in role that permits everything on everything. Bound to an application service account, it is cluster takeover on any code execution.',
      },
      {
        term: 'projected token',
        definition: 'The service account credential mounted into the pod, by default at a well known path, readable by the process running there.',
      },
    ],

    model: {
      narrative: [
        'Kubernetes access control is four objects and one habit worth forming: read the binding, not the role.',
        '',
        'A Role lists verbs on resources. A binding attaches it to a subject. The cluster wide versions of both exist, and the dangerous combination is a ClusterRoleBinding, which ignores namespaces entirely, attached to a service account that a pod uses.',
        '',
        'That matters because of the token. By default the service account credential is mounted into the pod, at a path any process in the container can read. So the question is never whether an attacker can obtain the identity: if they have code execution in the pod, they have the token. Question 4.18 puts the consequence plainly, and fact 50 states it: any remote code execution in that application equals cluster takeover, because the token is mounted inside the pod.',
        '',
        'Two habits follow. First, when reviewing a workload, look up its service account and then look up every binding that names it, because the interesting permission is rarely in the manifest you are reading. Second, turn off the automatic token mount for workloads that never call the cluster API, which is most of them.',
        '',
        'And the escape from the last lesson has its counterpart here. MITRE names the escape itself T1611, and cluster takeover through a binding needs no escape at all: it is an API call with a token from a file.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'From an application bug to the cluster. No escape, no privileged flag, no kernel bug: just a file and an API call.',
        nodes: [
          { label: 'code execution in the application pod', note: 'From a request handling bug, a dependency, or an injected instruction.' },
          {
            label: 'read the mounted service account token',
            note: 'A file at a known path. Mounted by default unless the workload turned it off.',
            danger: true,
          },
          { label: 'call the cluster API with it', note: 'From inside the cluster network, which the pod is already in.' },
          { label: 'the binding grants cluster-admin', note: 'Every verb on every resource in every namespace.' },
          { label: 'read every secret, run any workload', note: 'Including secrets holding cloud credentials, which leaves the cluster.' },
        ],
      },
      takeaway: 'The token is a file in the pod. Whatever the binding grants, an attacker with code execution already has.',
    },

    worked: {
      task:
        'Question 4.18: write the rule for a ClusterRoleBinding to cluster-admin for an application service account, and say how you would detect it.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The cluster role bindings and role bindings from the API, the service accounts they name, and the pod specifications that use those service accounts.',
          why: 'The join from binding to service account to pod is the finding. A binding with no pod using it is a smaller problem than the same binding attached to an internet facing workload.',
          prompt: {
            question: 'Why start from the bindings rather than from the pods?',
            answer:
              'Because a pod manifest usually says nothing about its permissions. It names a service account, and the grant lives in a separate object somebody else wrote, possibly in a different repository. Starting from the bindings is the only way to see the grants that nobody remembers making.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A ClusterRoleBinding naming cluster-admin, or any ClusterRole with wildcard verbs on wildcard resources, whose subject is a service account outside the system namespaces and used by an application workload.',
          why: 'Not just the named role: a custom ClusterRole with wildcards is the same power under a different name, and rules that check only for cluster-admin miss it.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the workload is internet facing, whether it processes untrusted input, whether the token is automatically mounted, and whether any secret in the cluster holds cloud credentials.',
          why: 'The token mount decides reachability, and the cloud credentials in secrets decide whether cluster takeover stays in the cluster.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the service account is used by a workload that handles untrusted input. High otherwise, because the grant is still cluster takeover on any code execution.',
          why: 'The floor is high because the binding is the finding. What the workload does decides how quickly somebody reaches it.',
          prompt: {
            question: 'The application is internal and behind a login. Does that reduce it?',
            answer:
              'It moves it from critical to high and no further. An internal application is reachable by every employee and every compromised laptop, and the grant means one bug in it is the whole cluster. The reduction is honest; the finding stays urgent.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Cluster operators and controllers that genuinely manage cluster resources, allowlisted by namespace and service account name, with the specific verbs they need documented.',
          why: 'Controllers exist and often need wide permissions. Documenting the verbs they actually need is what turns the exception into a plan to narrow it later.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Replace the binding with a Role scoped to the namespace and the specific verbs and resources needed, disable automatic token mounting for workloads that never call the API, and separate the controller identity from the application identity.',
          why: 'Two independent fixes: narrow the grant, and remove the credential from the pod. Either one alone breaks the path.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The binding with its role and subject, the pods using that service account, the token mount setting on those pods, and one secret in the cluster containing a cloud credential.',
          why: 'The last artefact is what makes the impact concrete for people who think of the cluster as a sandbox.',
        },
      ],
      result:
        'A rule that reports the grant with the workload it belongs to, so the severity reflects the exposure rather than the wording of the binding.',
    },

    fadeLight: {
      task: 'A rule for a service account token mounted into a workload that never calls the cluster API.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Pod specifications with their token mount settings, and the audit log of API calls by service account.',
          why: 'The audit log is what proves the workload does not use the API, which turns an opinion into a change nobody argues with.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A pod with automatic service account token mounting enabled whose service account has made no API call in the last thirty days.',
          why: 'A usage based condition, which is the same shape as unused permissions in the cloud topic.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the service account is permitted to do, whether the workload processes untrusted input, and whether it is internet facing.',
          why: 'An unused token on a powerful service account in an internet facing pod is the highest value version of this.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium on its own, and high when the service account holds meaningful permissions, since the credential is present in the pod for no reason.',
          why: 'A credential nobody uses is the easiest fix in security: removing it breaks nothing by definition.',
          choices: [
            'Medium on its own, and high when the service account holds meaningful permissions, since the credential is present in the pod for no reason.',
            'Critical, because any mounted token is a credential exposure.',
            'Low, because the default token has almost no permissions.',
            'Informational, since token mounting is the platform default.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Being the default is why this is everywhere and not a reason to leave it. Turning off the mount is one line and it removes the credential from every attack that starts inside the pod.',
    },

    fadeHeavy: {
      task: 'A rule for a role that permits reading secrets across a namespace.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which secrets are in that namespace, whether any hold cloud credentials or database passwords, and which workloads use the role.',
          why: 'Secrets read is only as bad as the secrets, and in most namespaces at least one of them leaves the cluster.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High, and critical when a secret in that namespace holds a cloud credential, because reading it turns cluster access into cloud access.',
          why: 'The escalation out of the cluster is what makes this worse than it looks on a permission list.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Scope the role to the specific secret names the workload needs, or move to a secret store with per workload identity so the cluster is not holding the credential at all.',
          why: 'Naming the secrets is the immediate fix and the external store is the durable one, because it removes the concentration of credentials in one namespace.',
          choices: [
            'Scope the role to the specific secret names the workload needs, or move to a secret store with per workload identity so the cluster is not holding the credential at all.',
            'Encrypt the secrets at rest in the cluster datastore.',
            'Rotate the secrets in that namespace more frequently.',
            'Move the workload to its own namespace and copy the secrets into it.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The role with its verbs and resources, the binding, the secrets present in the namespace, and which of them hold credentials for systems outside the cluster.',
          why: 'Listing which secrets leave the cluster is what turns a permission finding into a blast radius statement.',
          choices: [
            'The role with its verbs and resources, the binding, the secrets present in the namespace, and which of them hold credentials for systems outside the cluster.',
            'The decoded contents of the secrets.',
            'The namespace resource quota and its usage.',
            'A list of everyone with kubectl access to the namespace.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Encryption at rest is the same misconception as the bucket lesson, one layer down: it protects the datastore and does nothing about an identity the API will happily answer.',
    },

    parsons: {
      task:
        'Four of these belong in the cluster admin binding rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the grant', code: 'a ClusterRoleBinding grants cluster-admin or a wildcard ClusterRole' },
        { id: 'p2', label: 'the subject', code: 'to a service account outside the system namespaces' },
        { id: 'p3', label: 'the consumer', code: 'and an application workload runs with that service account' },
        { id: 'p4', label: 'the reachability', code: 'and its token is mounted into the pod' },
        { id: 'd1', label: 'the subject', code: 'to a human user in the cluster', distractor: true },
        { id: 'd2', label: 'the consumer', code: 'and the workload image has a critical vulnerability', distractor: true },
        { id: 'd3', label: 'the reachability', code: 'and the cluster API is reachable from the internet', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'A human with cluster-admin is a different finding with a different remediation, and a publicly reachable API server is a third. Each of them deserves its own rule rather than being folded into this one.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A logging sidecar runs in every pod in the cluster. Its service account is bound to a ClusterRole permitting get and list on pods and secrets in all namespaces, and the token is mounted. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The ClusterRole and its bindings, the service account, the workloads that use it, and the secrets present across the namespaces it covers.',
          options: [
            'The ClusterRole and its bindings, the service account, the workloads that use it, and the secrets present across the namespaces it covers.',
            'The logs the sidecar collects and where it ships them.',
            'The sidecar container image and its dependencies.',
          ],
          why: 'The grant, the consumer and the reachable secrets. Where the logs go is a separate data handling question.',
        },
        {
          part: 'condition',
          answer:
            'A ClusterRole permitting read on secrets across all namespaces, bound to a service account used by a workload that runs in every pod.',
          options: [
            'A ClusterRole permitting read on secrets across all namespaces, bound to a service account used by a workload that runs in every pod.',
            'A sidecar container that runs in every pod.',
            'A ClusterRole that permits get and list on pods.',
          ],
          why: 'Secrets across all namespaces is the grant that matters, and running everywhere is what makes it reachable from every workload in the cluster.',
        },
        {
          part: 'context',
          answer:
            'Whether the sidecar actually needs secret access, which secrets hold credentials for systems outside the cluster, and whether any pod it runs in handles untrusted input.',
          options: [
            'Whether the sidecar actually needs secret access, which secrets hold credentials for systems outside the cluster, and whether any pod it runs in handles untrusted input.',
            'How much log volume the sidecar produces per day.',
            'Which log aggregation product the cluster uses.',
          ],
          why: 'The first question is usually the whole finding: a log collector rarely needs to read secrets, and the grant is often copied from an example manifest.',
        },
        {
          part: 'severity',
          answer:
            'Critical. The sidecar runs beside every application, so code execution in any pod in the cluster reaches a token that can read every secret in it.',
          options: [
            'Critical. The sidecar runs beside every application, so code execution in any pod in the cluster reaches a token that can read every secret in it.',
            'High, because the sidecar is trusted infrastructure maintained by the platform team.',
            'Medium, because read only access cannot change anything in the cluster.',
          ],
          why: 'Read only on secrets is the maximum value read there is. The trust argument misses that the risk is the token being present next to untrusted code, not the sidecar behaviour.',
        },
        {
          part: 'falsePositives',
          answer:
            'Controllers that genuinely reconcile secrets, allowlisted by name with the specific resources they need, and sidecars whose role covers pods and events but not secrets.',
          options: [
            'Controllers that genuinely reconcile secrets, allowlisted by name with the specific resources they need, and sidecars whose role covers pods and events but not secrets.',
            'Workloads maintained by the platform team.',
            'Workloads whose service account token is rotated automatically.',
          ],
          why: 'Rotation shortens the life of a stolen token and does nothing about a token stolen and used immediately, which is the case here.',
        },
        {
          part: 'remediation',
          answer:
            'Remove secrets from the ClusterRole, keep only the resources the collector reads, and give the sidecar its own service account separate from the application.',
          options: [
            'Remove secrets from the ClusterRole, keep only the resources the collector reads, and give the sidecar its own service account separate from the application.',
            'Restrict the ClusterRole to the namespaces that contain no sensitive secrets.',
            'Encrypt the secrets so the sidecar cannot read their contents.',
          ],
          why: 'Remove the permission that is not needed. Namespace lists drift as namespaces are created, and encryption does not apply to a caller the API answers.',
        },
        {
          part: 'evidence',
          answer:
            'The ClusterRole rules, the binding, the pods running the sidecar, the token mount, and a list of secrets in scope that hold external credentials.',
          options: [
            'The ClusterRole rules, the binding, the pods running the sidecar, the token mount, and a list of secrets in scope that hold external credentials.',
            'A demonstration reading a secret using the sidecar token.',
            'The sidecar configuration file.',
          ],
          why: 'The names of the external credentials in scope carry the argument. Reading one to prove it is an action against production, and the configuration already tells you the grant.',
        },
      ],
      closing:
        'This is the last lesson of the topic, and the pattern it ends on is the one worth carrying: the permission was probably copied from an example, nobody needed it, and removing it costs nothing. Most cluster findings are like that.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the logging sidecar.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the grant', code: 'a ClusterRole permits reading secrets in all namespaces' },
          { id: 'f2', label: 'the subject', code: 'and it is bound to the logging sidecar service account' },
          { id: 'f3', label: 'the spread', code: 'and that sidecar runs in every pod in the cluster' },
          { id: 'f4', label: 'the reachability', code: 'and its token is mounted into each of those pods' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Grant, subject, spread, reachability. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'k8s-token-not-reachable',
      setup:
        'A review of a workload with a wide ClusterRoleBinding. The team argues that RBAC is configured outside the pod, so code running inside the container cannot make use of it.',
      code:
        'ClusterRoleBinding: app-sa -> cluster-admin\nPod: automountServiceAccountToken not set, so the default applies\nTeam response: RBAC is a control plane concern, the app cannot use it.',
      language: 'yaml',
      question: 'How does code inside the pod use the binding?',
      options: [
        {
          text: 'It reads the service account token mounted into the container filesystem and calls the cluster API with it.',
          correct: true,
        },
        { text: 'It cannot, unless the pod is privileged or mounts a host path.', correct: false },
        { text: 'It cannot, because the API server only accepts requests from kubectl.', correct: false },
        { text: 'Only if the container image includes a Kubernetes client library.', correct: false },
      ],
      silently:
        'Everything about the workload looks ordinary. The binding lives in a different file, often in a different repository, and the pod manifest that a reviewer reads says nothing about permissions at all. The token is mounted because that is the default, and it is a file with a well known path that any process in the container can read, which means the grant is available to whatever ends up running there.',
      explanation:
        'Fact 50 states the consequence directly: any remote code execution in that application equals cluster takeover, and the service account token is mounted inside the pod. That mount is what connects the two halves, and it is on by default. So the two habits are: when reviewing a workload, look up every binding naming its service account, because the grant is never in the manifest you are reading; and turn off automatic token mounting for the many workloads that never call the cluster API, which removes the credential from the pod entirely.',
    },

    handoff: {
      canNow: [
        'Read a binding and say what it grants and to whom',
        'Explain why a cluster admin binding on an application service account is cluster takeover on any code execution',
        'Write the rule, and name the second fix that breaks the path without touching the grant',
      ],
      note: 'Q4.18 is this lesson exactly, including how you would detect it. Fact 50 also names the MITRE technique for the escape itself, T1611.',
    },
  },
}
