import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L50',
  number: 50,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'What a container actually is',
  objective:
    'You will be able to describe a container as a process with restricted views, say exactly how it differs from a virtual machine, and write the rule for an image that gives up those restrictions.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F48', 'Q4.15', 'Q4.17'],

  steps: {
    vocabulary: [
      {
        term: 'container',
        definition: 'An ordinary process on the host, given restricted views of the system and limits on what it may use. Nothing is virtualised.',
      },
      {
        term: 'namespace',
        definition: 'A restricted view of one kind of resource: process ids, network, mounts, users. It changes what the process can see.',
      },
      {
        term: 'cgroup',
        definition: 'A limit on how much of a resource a process may use: CPU, memory, input and output. It changes what the process can consume.',
      },
      {
        term: 'shared kernel',
        definition: 'Every container on a host runs on the same kernel. One kernel bug affects all of them, which is the whole difference from a virtual machine.',
      },
      {
        term: 'capability',
        definition: 'One slice of root power, granted separately. Binding a low port, changing file ownership and loading a module are three different capabilities.',
      },
    ],

    model: {
      narrative: [
        'A container is not a small machine. It is a process on the host, started with a different view of the world and some limits on what it may consume.',
        '',
        'The views are namespaces: its own process id space so it sees only its own processes, its own network stack, its own mount table, sometimes its own user id mapping. The limits are cgroups: this much memory, this much CPU. Both are kernel features applied to an ordinary process.',
        '',
        'That is the answer to question 4.15 and the whole of fact 48: a container shares the host kernel and is isolated by namespaces plus cgroups, while a virtual machine runs its own kernel on virtualised hardware. So one kernel bug breaks every container on that host, and the same bug in one virtual machine leaves its neighbours alone.',
        '',
        'The practical consequence is the one this topic keeps returning to: a container is a boundary that is real, useful and much thinner than people assume. Root inside a container is the same uid 0 as root on the host unless a user namespace remaps it, and every namespace shared with the host is one wall removed.',
        '',
        'So the posture question for an image or a pod is never is it isolated. It is: which of the walls are still standing.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The one structural difference, and everything else follows from it. This is question 4.15 in two columns.',
        left: {
          title: 'container',
          points: [
            'A process on the host kernel.',
            'Isolated by namespaces: pid, net, mnt, user.',
            'Limited by cgroups.',
            'One kernel bug reaches every container on the host.',
          ],
        },
        right: {
          title: 'virtual machine',
          points: [
            'Its own kernel, on virtualised hardware.',
            'Isolated by the hypervisor.',
            'Limited by the virtual hardware it was given.',
            'A guest kernel bug stays in that guest.',
          ],
        },
      },
      takeaway: 'A container is a process with restricted views on a shared kernel. The walls are namespaces and capabilities, and each one can be given away.',
    },

    worked: {
      task:
        'Write the image hardening rule, which is question 4.17: the checks worth enforcing as policy as code on every image.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The image configuration and layer metadata: the user it runs as, its capability set, the exposed ports, the base image, and the Dockerfile in the repository.',
          why: 'The image configuration is what the runtime uses and the Dockerfile is where it came from. Reporting only the image leaves the build to reintroduce it.',
          prompt: {
            question: 'Why is the base image part of the data source rather than a separate finding?',
            answer:
              'Because most of what an image contains was decided by its base. A finding about a package in a full distribution base is really a finding about choosing that base, and naming it turns fifty package tickets into one decision.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An image that runs as root, or adds capabilities beyond the default set, or is built on a full distribution base when a minimal one would do, or pins no base image digest, or bakes a secret into a layer.',
          why: 'Five checks, each independently reportable, which is what question 4.17 asks for. Any one firing is a real finding and the combination is a picture of the build.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the image runs in production, whether the workload is internet facing, whether the runtime overrides the user or the capabilities, and how many images share the same base.',
          why: 'A runtime that overrides the user makes the image finding less urgent, and the shared base count tells you where one fix pays for itself many times.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a secret in a layer. High for running as root in a production internet facing workload. Medium for a missing digest pin or an unnecessarily large base.',
          why: 'A secret in a layer is already leaked to everyone who can pull the image, which is a different class from a hardening gap.',
          prompt: {
            question: 'The pod security context sets runAsNonRoot, so the image running as root never takes effect. Does the finding stand?',
            answer:
              'It drops to medium and it stands. The image is a shared artefact and the next place it runs may not set that context. Report it with the compensating control named, which is both honest and the thing that gets the image fixed rather than argued about.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Images that genuinely need a capability, such as a network agent binding a low port, allowed per image with the capability named and no wildcard. Build images and test images excluded by their own tag.',
          why: 'Naming the specific capability is what keeps the exception narrow. An exception for capabilities in general is an exception for everything.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Add a non root user in the Dockerfile, drop all capabilities and add back only the ones needed, pin the base image by digest, move secrets to the runtime, and switch to a minimal base.',
          why: 'Five fixes matching the five checks, all in the Dockerfile, which is why this belongs in a pull request rather than in a runtime alert.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The image configuration showing the user and capability set, the Dockerfile lines responsible, the layer holding the secret if there is one, and the list of workloads using the image.',
          why: 'The workload list is what makes the priority obvious, and it is the part an image scanner on its own cannot tell you.',
        },
      ],
      result:
        'One rule with five independent checks, all fixable in the file that produced them, and a severity that separates a leaked secret from a hardening gap.',
    },

    fadeLight: {
      task: 'A rule for a container running as root in production.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The image configuration user field and the runtime security context of the workload.',
          why: 'Two places can decide the user and the runtime wins, so both have to be read.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A workload whose effective user is root, meaning the image runs as root and the runtime does not override it with a non root user.',
          why: 'Effective rather than declared, which is the same distinction as granted against effective permissions in the cloud topic.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the container has extra capabilities, whether the root filesystem is writable, and whether the workload processes untrusted input.',
          why: 'Root plus a writable filesystem plus untrusted input is the combination that makes an application bug into a foothold that survives.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the workload processes untrusted input, since root in the container is the starting position for every escape path in the next lesson.',
          why: 'Root is not an escape by itself and it is the precondition for most of them, which is exactly what high is for.',
          choices: [
            'High when the workload processes untrusted input, since root in the container is the starting position for every escape path in the next lesson.',
            'Critical always, because root in a container is root on the host.',
            'Low, because the container is isolated from the host by namespaces.',
            'Medium only if the container also has extra capabilities.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The second option overstates and the third understates, and both are common. Root in a container is the same uid as root on the host, restricted by namespaces and capabilities, which is why the next lesson is about what happens when those are given away.',
    },

    fadeHeavy: {
      task: 'A rule for a container with a writable root filesystem and no resource limits.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the workload writes at runtime, whether it needs a writable path at all, and how many containers share the node.',
          why: 'Most applications need one writable directory rather than a writable filesystem, and a mounted volume gives that without the rest.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium for the writable filesystem, and high with no limits on a shared node, since one container can consume the node and affect every workload on it.',
          why: 'Missing limits is a real availability finding and it belongs in a security report because a shared kernel means a shared failure.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Set the root filesystem read only and mount a small writable volume where one is needed, and set CPU and memory requests and limits.',
          why: 'Read only plus a named writable path is the pattern, and it also makes tampering visible because nothing else can be written.',
          choices: [
            'Set the root filesystem read only and mount a small writable volume where one is needed, and set CPU and memory requests and limits.',
            'Set the root filesystem read only and restart the workload if it fails.',
            'Add monitoring for disk writes inside the container.',
            'Move the workload to a dedicated node so it cannot affect others.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The security context showing the writable filesystem, the absence of limits, the node the workload shares, and the paths it actually writes to.',
          why: 'The list of paths it writes to is what makes the remediation concrete: it names the volume to mount.',
          choices: [
            'The security context showing the writable filesystem, the absence of limits, the node the workload shares, and the paths it actually writes to.',
            'The container resource usage graph for the last week.',
            'The full pod manifest.',
            'The node allocatable capacity.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'A dedicated node is a real answer to the noisy neighbour half and it does nothing about the writable filesystem, which is why the remediation names both.',
    },

    parsons: {
      task:
        'Four of these belong in the image hardening rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the user', code: 'the image declares no non root user, so it runs as root' },
        { id: 'p2', label: 'the capabilities', code: 'and it adds capabilities beyond the default set' },
        { id: 'p3', label: 'the base', code: 'and its base image is not pinned by digest' },
        { id: 'p4', label: 'the secret', code: 'and a credential is present in one of its layers' },
        { id: 'd1', label: 'the user', code: 'and the image is larger than five hundred megabytes', distractor: true },
        { id: 'd2', label: 'the base', code: 'and the base image has more than ten known vulnerabilities', distractor: true },
        { id: 'd3', label: 'the secret', code: 'and the image was built more than ninety days ago', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The vulnerability count distractor belongs to a different rule with a different owner and a different fix. Mixing image hardening with vulnerability management gives you a finding two teams both defer.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A team runs a build container on the shared cluster. It runs as root, mounts the container runtime socket so it can build images, and has no resource limits. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The pod specification with its volumes and security context, the image configuration, and the node the workload runs on.',
          options: [
            'The pod specification with its volumes and security context, the image configuration, and the node the workload runs on.',
            'The build logs for the pipeline that uses the container.',
            'The registry the built images are pushed to.',
          ],
          why: 'The mount and the security context are in the pod specification, and the node matters because everything on it shares the consequence.',
        },
        {
          part: 'condition',
          answer:
            'A pod mounting the container runtime socket, running as root, on a node shared with other workloads.',
          options: [
            'A pod mounting the container runtime socket, running as root, on a node shared with other workloads.',
            'A pod that builds container images.',
            'A pod with no resource limits.',
          ],
          why: 'The runtime socket is the finding: it is an API that can start a privileged container on the node, which makes the other walls irrelevant.',
        },
        {
          part: 'context',
          answer:
            'What else runs on that node, what the node identity can reach, and whether a rootless builder could do the same job.',
          options: [
            'What else runs on that node, what the node identity can reach, and whether a rootless builder could do the same job.',
            'How long a typical build takes and how often it runs.',
            'Which registry credentials the build uses.',
          ],
          why: 'The alternative is the remediation, and naming it in the finding is what makes the ticket acceptable to the team that needs to build images.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Access to the runtime socket is equivalent to root on the node, so any code in this container can take over every workload on it.',
          options: [
            'Critical. Access to the runtime socket is equivalent to root on the node, so any code in this container can take over every workload on it.',
            'High, because the build container only runs trusted pipeline code.',
            'Medium, because the socket is mounted read only.',
          ],
          why: 'Trusted pipeline code is code from every pull request that pipeline builds. Read only on a socket is not a restriction, because the API is used by writing requests to it.',
        },
        {
          part: 'falsePositives',
          answer:
            'Build workloads on a dedicated node pool with no other tenants, tagged as such, or builders that use a rootless daemonless mode with no socket mount.',
          options: [
            'Build workloads on a dedicated node pool with no other tenants, tagged as such, or builders that use a rootless daemonless mode with no socket mount.',
            'Build workloads owned by the platform team.',
            'Build workloads that have been running without incident for a year.',
          ],
          why: 'Isolation and a rootless builder are both real controls that a rule can verify. The others are ownership and history.',
        },
        {
          part: 'remediation',
          answer:
            'Replace the socket mount with a rootless image builder, or move builds to a dedicated node pool, and set resource limits either way.',
          options: [
            'Replace the socket mount with a rootless image builder, or move builds to a dedicated node pool, and set resource limits either way.',
            'Mount the socket read only and keep the current builder.',
            'Add an admission policy that logs when the socket is mounted.',
          ],
          why: 'Two acceptable outcomes, one of which the team will prefer, plus the limits. Logging a mount you have already found is not a fix.',
        },
        {
          part: 'evidence',
          answer:
            'The volume mount for the runtime socket, the security context showing root, the list of other workloads on the node, and the node identity permissions.',
          options: [
            'The volume mount for the runtime socket, the security context showing root, the list of other workloads on the node, and the node identity permissions.',
            'A demonstration of starting a privileged container from inside the build pod.',
            'The pipeline definition that runs the build.',
          ],
          why: 'Four configuration facts. The demonstration is unnecessary because the mount is the finding, and running a privileged container on a shared production node to prove it is worse than the finding.',
        },
      ],
      closing:
        'This is the last lesson before escape paths, and it is the right place to notice that the most dangerous container configurations are not exploits. They are features somebody needed, mounted deliberately, in a workload that also runs somebody else code.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the build container.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the mount', code: 'the pod mounts the container runtime socket' },
          { id: 'f2', label: 'the user', code: 'and it runs as root' },
          { id: 'f3', label: 'the sharing', code: 'and it runs on a node shared with other workloads' },
          { id: 'f4', label: 'the code it runs', code: 'and it builds code from pull requests' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Mount, user, sharing, code. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'sec-container-is-a-vm',
      setup:
        'A design review for a multi tenant platform. The proposal is to run each customer workload in its own container on shared nodes, described as equivalent isolation to a virtual machine per customer.',
      code:
        'Proposal: one container per customer, shared node pool\nIsolation claim: containers are isolated from each other,\nso this is equivalent to one VM per customer.\nDecision requested: approve for untrusted customer code.',
      language: 'text',
      question: 'Where does the equivalence break?',
      options: [
        {
          text: 'Every container on the node shares one kernel, so a single kernel bug reaches all of them. A virtual machine per customer does not have that shared surface.',
          correct: true,
        },
        { text: 'Nowhere. With namespaces and cgroups the isolation is equivalent in practice.', correct: false },
        { text: 'It breaks only if the containers run as root.', correct: false },
        { text: 'It breaks only for network isolation, which needs a separate network policy.', correct: false },
      ],
      silently:
        'The platform works and the isolation holds for everything except the case it was approved for. Namespaces do separate processes, filesystems and networks, so every ordinary test of the isolation passes, and customers cannot see each other. The shared kernel is invisible until a local privilege escalation is published, at which point every tenant on every node is exposed at once, and the decision that made it multi tenant was made in a review that recorded the isolation as equivalent.',
      explanation:
        'Fact 48 is the sentence to keep: a container shares the host kernel and is isolated by namespaces, meaning separated process, network, mount and user views, plus cgroups for resource limits, and one kernel bug breaks every container on that host. That is a real boundary and it is thinner than a hypervisor. For untrusted code from different tenants the honest options are a virtual machine per tenant, a sandboxed runtime with its own kernel, or dedicated node pools per tenant. Containers per tenant on shared nodes is a reasonable choice for workloads you wrote and a poor one for code you did not.',
    },

    handoff: {
      canNow: [
        'Describe a container as a process with namespaces and cgroups rather than a small machine',
        'State the one structural difference from a virtual machine and what follows from it',
        'Write an image hardening rule with five independent checks',
      ],
      note: 'Q4.15 is the definition and Q4.17 asks for five Dockerfile checks. Fact 48 is on the priority list and is worth memorising word for word.',
    },
  },
}
