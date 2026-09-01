import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L51',
  number: 51,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'Container escape, privileged mode, and host mounts',
  objective:
    'You will be able to name the four manifest settings that make a pod dangerous, explain what privileged mode actually grants, and reproduce the privileged pod rule from file A.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['F40', 'F49', 'Q4.6', 'Q4.16', 'A#Full example 3: privileged pod with a mount to the host root'],

  steps: {
    vocabulary: [
      {
        term: 'privileged',
        definition: 'A pod setting that effectively grants every capability and removes most restrictions. It is not a slightly stronger container, it is an unrestricted process.',
      },
      {
        term: 'hostPath',
        definition: 'A volume that mounts a directory from the node into the container. A mount of the host root gives the container the node filesystem.',
      },
      {
        term: 'hostPID',
        definition: 'Sharing the node process namespace, so the container sees and can signal every process on the node.',
      },
      {
        term: 'CAP_SYS_ADMIN',
        definition: 'The capability that covers mounting, namespace operations and much else. Holding it is close to being root on the host.',
      },
      {
        term: 'container escape',
        definition: 'Reaching the host from inside a container. MITRE names it T1611, Escape to Host.',
      },
    ],

    model: {
      narrative: [
        'The last lesson said a container is a process with restricted views. This one is about the settings that hand those restrictions back.',
        '',
        'Fact 49 names four: privileged set to true, a hostPath mount to a sensitive path, hostPID or hostNetwork, and allowPrivilegeEscalation not set to false. It also names three that should be present and usually are not: run as non root, a read only root filesystem, and resource limits.',
        '',
        'Privileged is the one people underestimate. It effectively grants every capability, including CAP_SYS_ADMIN, which fact 40 calls out as the capability that makes a container equivalent to root on the host. From a privileged container you can mount the host filesystem yourself; you do not need anyone to mount it for you.',
        '',
        'A hostPath mount to the host root is the direct version of the same thing. Write to the right file on the node and you have persistence, or credentials, or a shell as root at the next reboot.',
        '',
        'And this is where the cloud topic joins up. File A third full example puts IMDS reachability from inside the pod in the evidence, because the path does not stop at the node: node identity, then whatever that role can reach. Escape is a step, not a destination.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The escape path from file A third example. Each hop is a setting somebody chose, and the last hop leaves the cluster entirely.',
        nodes: [
          { label: 'code execution inside the pod', note: 'From an application bug, a dependency, or a build that runs untrusted code.' },
          {
            label: 'privileged, or a hostPath mount to the node',
            note: 'The escape. With privileged the container can mount the host itself; with hostPath it is already mounted.',
            danger: true,
          },
          { label: 'write to the node filesystem', note: 'Credentials, a systemd unit, an authorized key. Persistence on the node.' },
          { label: 'use the node identity', note: 'Through the metadata service, which the pod can usually reach.' },
          { label: 'reach whatever that role reaches', note: 'Which is the cloud account, not the cluster. This is where the topics meet.' },
        ],
      },
      takeaway: 'Privileged and host mounts are not hardening gaps, they are the escape. The node is a step towards the cloud identity.',
    },

    worked: {
      task:
        'Reproduce the third full example from file A: the rule for a privileged pod with a mount to the host root. It is the canonical Kubernetes posture finding.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Kubernetes manifests in the repository, the cluster API for what is actually running, and the admission logs.',
          why: 'Three sources for three moments: what was written, what is running, and what was accepted. A cluster where the manifest and the running pod disagree is its own finding.',
          prompt: {
            question: 'Why include admission logs rather than just the running state?',
            answer:
              'Because they show what was attempted and admitted, including pods that have since exited. A privileged pod that ran for four minutes in the middle of the night does not appear in the running state at all, and it is the most interesting thing on the cluster.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'securityContext.privileged set to true, or a hostPath pointing at a sensitive path, or hostPID, or hostNetwork, or allowPrivilegeEscalation not set to false, or capabilities adding SYS_ADMIN.',
          why: 'Straight from file A, and it is a list of ors on purpose: each one alone is enough to matter, and a rule requiring several would miss the single setting that was actually used.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Does the pod service account have broad RBAC, and does the node carry a strong cloud identity.',
          why: 'The two questions that decide what an escape is worth. The pod own permissions, and the ones it inherits by standing on the node.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. This is a direct container escape path followed by node takeover.',
          why: 'File A states it without qualification, and the reason is that no further vulnerability is needed: the settings themselves are the mechanism.',
          prompt: {
            question: 'The pod is a monitoring agent that genuinely needs host access. Still critical?',
            answer:
              'The finding is still true and it moves to the exception path rather than being downgraded. That is the difference between a false positive and an accepted risk: the rule fired correctly, the workload is legitimate, and the allowlist records who decided and when.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Legitimate monitoring and networking daemonsets. Allowlist by namespace and workload name.',
          why: 'These genuinely need host access to do their job. Allowlisting by name and namespace is narrow enough to be safe and specific enough to review.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Pod Security Admission in restricted mode, remove the mount, minimal capabilities, read only root filesystem.',
          why: 'Admission is the durable control: it moves the check to the moment of creation so the next manifest cannot introduce it. The rest is what this pod needs today.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The manifest, the service account permissions, and IMDS reachability from inside the pod.',
          why: 'The third item is what makes the severity concrete: it shows the escape does not end at the node, and it takes one command from inside the pod to demonstrate.',
        },
      ],
      result:
        'The canonical KSPM finding, with an exception path narrow enough that the legitimate daemonsets do not force the rule to be switched off.',
    },

    fadeLight: {
      task: 'A rule for a pod sharing the node process namespace.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The pod specifications from the cluster API, looking at the host namespace settings.',
          why: 'A single boolean field, which makes this one of the cheapest checks in the cluster.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A pod with hostPID or hostIPC set to true, outside the allowlisted system namespaces.',
          why: 'Named fields and a named exception scope, so the rule is mechanical.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the pod also runs as root, what other workloads run on the same node, and whether the pod processes untrusted input.',
          why: 'Seeing the node processes is reconnaissance; being root while seeing them is the ability to inspect and signal them.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. The pod can see and signal every process on the node, including reading their command lines, which frequently hold credentials.',
          why: 'Command lines with secrets in them are extremely common, and the process namespace is the cheapest way to harvest them.',
          choices: [
            'High. The pod can see and signal every process on the node, including reading their command lines, which frequently hold credentials.',
            'Low, because seeing processes is not the same as controlling them.',
            'Medium, because the pod still cannot write to the host filesystem.',
            'Critical, because sharing any host namespace is a container escape.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The last option overstates in a way worth avoiding in a real report: sharing the process namespace is not itself an escape, and calling it one costs you the argument when a reviewer notices.',
    },

    fadeHeavy: {
      task: 'A rule for a hostPath mount to a sensitive node directory.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which path is mounted, whether it is read only, what credentials live under it, and whether the pod runs as root.',
          why: 'The path decides everything. A mount of a log directory and a mount of the kubelet credentials directory are the same setting with entirely different consequences.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a writable mount of the host root, the container runtime socket, or the node credential directories. High for a read only mount of the same paths.',
          why: 'Read only still reads the node credentials, which is enough to become the node without writing anything.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the mount, or narrow it to a specific subdirectory and mark it read only, and enforce the allowed path list through admission.',
          why: 'Admission again, because a narrowed mount in one manifest does not stop the next one.',
          choices: [
            'Remove the mount, or narrow it to a specific subdirectory and mark it read only, and enforce the allowed path list through admission.',
            'Keep the mount and set the container to run as a non root user.',
            'Keep the mount and add file integrity monitoring on the node.',
            'Move the pod to a node that runs nothing else.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The volume definition with its path and read only flag, the security context, the credentials present under that path on the node, and the pod service account permissions.',
          why: 'Naming the specific credentials under the mounted path is what turns a configuration line into an impact statement.',
          choices: [
            'The volume definition with its path and read only flag, the security context, the credentials present under that path on the node, and the pod service account permissions.',
            'A directory listing from inside the container.',
            'The node kubelet configuration.',
            'A list of every pod using hostPath mounts in the cluster.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Running as non root with a host root mount is barely a mitigation: most of what is worth taking on a node is readable by any user, and file permissions inside the mount are the node permissions.',
    },

    parsons: {
      task:
        'Four of these belong in the privileged pod rule from file A. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the escape setting', code: 'the pod sets privileged true, or adds SYS_ADMIN, or mounts a sensitive host path' },
        { id: 'p2', label: 'the missing hardening', code: 'or does not set allowPrivilegeEscalation to false' },
        { id: 'p3', label: 'the cluster impact', code: 'and its service account holds broad RBAC' },
        { id: 'p4', label: 'the cloud impact', code: 'and the node carries a strong cloud identity reachable from the pod' },
        { id: 'd1', label: 'the missing hardening', code: 'or does not set a memory limit', distractor: true },
        { id: 'd2', label: 'the cluster impact', code: 'and the image has a critical vulnerability', distractor: true },
        { id: 'd3', label: 'the cloud impact', code: 'and the node is in a public subnet', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The image vulnerability distractor is the most tempting because it feels like the entry point. It belongs in a different rule: this finding is about what an attacker gets after code execution, whatever gave them the code execution.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario, from question 4.16. A manifest sets privileged true, mounts the host root at a path inside the container, and the pod service account is bound to a role that can read secrets in its namespace. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The pod manifest, the role bindings for its service account, and the node cloud identity.',
          options: [
            'The pod manifest, the role bindings for its service account, and the node cloud identity.',
            'The container image scan results.',
            'The application logs from the pod.',
          ],
          why: 'Three artefacts covering the escape, the cluster blast radius and the cloud blast radius.',
        },
        {
          part: 'condition',
          answer:
            'A pod with privileged true or a hostPath mount to a sensitive node path, outside the allowlisted system namespaces.',
          options: [
            'A pod with privileged true or a hostPath mount to a sensitive node path, outside the allowlisted system namespaces.',
            'A pod whose service account can read secrets.',
            'A pod that runs as root.',
          ],
          why: 'The escape settings are the condition and the service account is context. Reading secrets in one namespace is ordinary; escaping to the node is not.',
        },
        {
          part: 'context',
          answer:
            'What the service account can reach in the cluster, what the node identity can reach in the cloud account, and whether the pod runs untrusted code.',
          options: [
            'What the service account can reach in the cluster, what the node identity can reach in the cloud account, and whether the pod runs untrusted code.',
            'How many replicas of the pod are running.',
            'Which namespace the pod is in and who owns it.',
          ],
          why: 'Cluster reach and cloud reach are the two impact questions, and the third decides how easily an attacker gets the initial execution.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Code execution in this pod is a direct escape to the node, and from the node to the cloud identity it carries.',
          options: [
            'Critical. Code execution in this pod is a direct escape to the node, and from the node to the cloud identity it carries.',
            'High, because escaping still requires an application vulnerability first.',
            'Medium, because the service account can only read secrets in its own namespace.',
          ],
          why: 'The second option is true and does not lower the rating: every finding of this class assumes code execution, and the finding is about what happens next.',
        },
        {
          part: 'falsePositives',
          answer:
            'Monitoring and networking daemonsets that need host access, allowlisted by namespace and workload name with an owner recorded.',
          options: [
            'Monitoring and networking daemonsets that need host access, allowlisted by namespace and workload name with an owner recorded.',
            'Pods in namespaces owned by the platform team.',
            'Pods that have been running unchanged for more than six months.',
          ],
          why: 'File A names exactly this exception, by namespace and workload name, which is narrow enough to review and specific enough to be safe.',
        },
        {
          part: 'remediation',
          answer:
            'Enforce Pod Security Admission in restricted mode for the namespace, remove the privileged flag and the mount, drop capabilities to the minimum, and set a read only root filesystem.',
          options: [
            'Enforce Pod Security Admission in restricted mode for the namespace, remove the privileged flag and the mount, drop capabilities to the minimum, and set a read only root filesystem.',
            'Add a runtime policy that alerts when the pod writes to the host mount.',
            'Move the pod to a dedicated node pool.',
          ],
          why: 'Admission is the control that stops the next manifest as well as this one. Alerting is detection after the escape, and a dedicated node pool moves the blast radius without removing it.',
        },
        {
          part: 'evidence',
          answer:
            'The manifest with the privileged flag and the mount, the service account role bindings, and a demonstration that the metadata service answers from inside the pod.',
          options: [
            'The manifest with the privileged flag and the mount, the service account role bindings, and a demonstration that the metadata service answers from inside the pod.',
            'A shell session showing the host filesystem from inside the container.',
            'The cluster audit log for the namespace.',
          ],
          why: 'File A names these three exactly. The metadata check is a single harmless request, while browsing the host filesystem from inside a production pod is an action rather than evidence.',
        },
      ],
      closing:
        'This rule is worth being able to write from memory. It is the most cited Kubernetes posture finding, it appears in file A in full, and it is the one that connects the container topic to the cloud one.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the privileged pod.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the escape setting', code: 'the pod sets privileged true or mounts a sensitive host path' },
          { id: 'f2', label: 'the exception check', code: 'and it is not an allowlisted system workload' },
          { id: 'f3', label: 'the cluster impact', code: 'and its service account holds meaningful RBAC' },
          { id: 'f4', label: 'the cloud impact', code: 'and the node identity is reachable from inside the pod' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Escape, exception, cluster impact, cloud impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'container-privileged-is-just-convenience',
      setup:
        'A pull request. A workload needs to read a device, and rather than granting the specific capability the author sets privileged true, describing it in the review as turning on a few extra permissions.',
      code:
        'securityContext:\n  privileged: true      # needed to read /dev/nvidia0\n# reviewer: fine, it only needs device access',
      language: 'yaml',
      question: 'What has privileged actually granted?',
      options: [
        {
          text: 'Effectively every capability including SYS_ADMIN, plus access to host devices, which is close to root on the node.',
          correct: true,
        },
        { text: 'Access to host devices only, which is what the comment says.', correct: false },
        { text: 'The same as adding the specific device capability, with a simpler syntax.', correct: false },
        { text: 'Nothing extra unless the pod also runs as root.', correct: false },
      ],
      silently:
        'The workload works, which is what the change was for, and nothing else about the pod looks different from outside. The reviewer comment is recorded as the justification, so the next audit reads a device access requirement rather than an unrestricted container. The pod can now mount the host filesystem, load kernel modules and read every device on the node, and none of that appears anywhere except in the one word in the manifest.',
      explanation:
        'Privileged is not a larger set of permissions, it is the removal of the restrictions that make a container a container. Fact 40 names CAP_SYS_ADMIN as the capability that makes a container equivalent to root on the host, and privileged grants effectively all of them, plus device access and the ability to mount. Fact 49 lists it first among the four settings that make a pod dangerous. The correct fix in this case is the narrow one: add the specific device to the container and grant the single capability it needs, which is a two line change and leaves every other wall standing.',
    },

    handoff: {
      canNow: [
        'Name the four manifest settings that make a pod dangerous, and the three that should be present',
        'Explain what privileged grants and why a host mount is the same escape by another route',
        'Reproduce the file A privileged pod rule, including its exception path',
      ],
      note: 'Q4.6 is the capability question, Q4.16 is the manifest, and facts 40 and 49 are the pair. The rule itself is in file A and is worth knowing by heart.',
    },
  },
}
