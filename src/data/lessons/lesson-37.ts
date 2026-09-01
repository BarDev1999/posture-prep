import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L37',
  number: 37,
  topicId: 'cloud',
  sectionId: 3,
  title: 'Security groups and NACLs, stateful versus stateless',
  objective:
    'You will be able to say which of the two is stateful, which can deny, and write a rule for an open management port that a team will actually act on.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F27', 'F34', 'Q3.1', 'Q3.3', 'Q3.6'],

  steps: {
    vocabulary: [
      {
        term: 'security group',
        definition: 'A firewall attached to a network interface. Allow rules only, and stateful: the reply to a connection it permitted is permitted too.',
      },
      {
        term: 'NACL',
        definition: 'A network access control list attached to a subnet. Allow and deny rules, evaluated in numeric order, and stateless.',
      },
      {
        term: 'stateful',
        definition: 'The firewall remembers the connections it allowed, so return traffic needs no rule of its own.',
      },
      {
        term: 'stateless',
        definition: 'Every packet is judged on its own. Return traffic needs its own rule, usually on the ephemeral port range.',
      },
      {
        term: 'ephemeral ports',
        definition: 'The high numbered ports a client picks for its side of a connection. A stateless list has to allow them for replies to arrive.',
      },
    ],

    model: {
      narrative: [
        'Question 3.1 is a two option question in disguise: security groups are stateful, NACLs are stateless. Everything else follows from that.',
        '',
        'Because a security group is stateful, one allow rule inbound is enough: the reply to a permitted connection is permitted. Because a NACL is stateless, an inbound allow on port 443 without an outbound allow on the ephemeral range gives you a connection that arrives and never answers. That is the classic NACL debugging story and it is worth recognising.',
        '',
        'The other difference is deny. A security group has allow rules only, so it cannot express a block: anything not allowed is denied, and there is no way to say allow this whole range except one address. A NACL has both, evaluated in numeric order with the first match winning, which is how you block a single address.',
        '',
        'Two attachment points, too. A security group is per interface, so it travels with the workload. A NACL is per subnet, so it applies to everything in it including things nobody remembered were there.',
        '',
        'And the direction lesson from last time still holds: neither of these is egress filtering by default. A security group whose outbound rule allows everything to 0.0.0.0/0, which is the default, is the reason fact 34 has to be said out loud.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The four differences worth holding: state, rule types, attachment point, and how order works. This is the whole of question 3.1.',
        left: {
          title: 'security group',
          points: [
            'Stateful: replies allowed automatically.',
            'Allow rules only, no deny.',
            'Attached to the network interface.',
            'All rules evaluated, order irrelevant.',
          ],
        },
        right: {
          title: 'NACL',
          points: [
            'Stateless: replies need their own rule.',
            'Allow and deny rules.',
            'Attached to the subnet.',
            'Numeric order, first match wins.',
          ],
        },
      },
      takeaway: 'Security group: stateful, allow only, per interface. NACL: stateless, allow and deny, per subnet, in numeric order.',
    },

    worked: {
      task:
        'Question 3.3: a security group allows 0.0.0.0/0 on port 22, and you find this on forty production instances. Rate it, and write the rule with the context that changes the rating.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Security group rules and their attachments, the route table of each attached interface subnet, and the role attached to each instance.',
          why: 'The rule alone is not reachability. A security group allowing the world on a workload in an unrouted subnet is a bad rule with no exposure, and the ticket should say so.',
          prompt: {
            question: 'Forty instances, one security group. Is that one finding or forty?',
            answer:
              'One finding with forty affected resources. The fix is one rule change, so a ticket per instance wastes the owning team time and makes the count look worse than the work. Report by the thing that gets fixed.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A security group rule allowing inbound from 0.0.0.0/0 or ::/0 to a management port, meaning 22, 3389, 5985, or a database port such as 3306, 5432 or 27017.',
          why: 'Named ports rather than the phrase sensitive port. The IPv6 range is included because it is the half everyone forgets, and it is a complete bypass of an IPv4 only rule.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the subnet route table reaches an internet gateway, whether the instance holds a public address, what role it carries, whether it is production, and whether any connection has arrived from outside.',
          why: 'These are the three context variables question 3.3 asks for: is it actually routable, what does the workload hold, and has anyone used it.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the subnet is public and the instance holds a role with broad permissions. High when public with a narrow role. Medium when the subnet is not internet routable, because the rule is wrong and unreachable.',
          why: 'Three ratings for the same rule, decided by reachability and by what is behind it. That is the answer question 3.3 is looking for rather than a single number.',
          prompt: {
            question: 'Why not report the unreachable case at all?',
            answer:
              'Because it is one route table change from being critical, and the route change will be made by a different team for an unrelated reason. Reporting it as medium is honest and it puts the fix in the backlog before the exposure arrives.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Bastion hosts with an approved tag, restricted to the corporate ranges rather than to the world, and time limited break glass rules recorded with an expiry.',
          why: 'A bastion with 0.0.0.0/0 is not an exception, it is the same finding. The exception is a bastion restricted to known sources, which is a different rule.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Replace the open rule with the corporate ranges or a session manager service that needs no inbound port at all, and add a NACL deny for the management ports on subnets that should never accept them.',
          why: 'The session manager option is the one that actually ends the class of finding, because it removes the port instead of narrowing it. The NACL is the defence in depth layer, and it is the one place a deny can be written.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The security group rule, the list of attached instances, the route table proving reachability, the roles attached, and any accepted connection from an external address in the flow logs.',
          why: 'The last one is the artefact that ends the discussion. An accepted connection from an unknown address turns a configuration argument into an incident question.',
        },
      ],
      result:
        'One finding, forty resources, three possible severities and a remediation that removes the port rather than moving it. This is the most common cloud finding there is, and how it is written decides whether anyone acts.',
    },

    fadeLight: {
      task: 'A rule for a security group whose outbound rules allow everything.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Security group egress rules and the roles attached to the interfaces they protect.',
          why: 'Outbound rules are the half nobody reads, because the default allows everything.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A security group with an egress rule allowing all protocols to 0.0.0.0/0, attached to a workload that holds credentials or reads classified data.',
          why: 'The second clause is what makes this worth reporting. Open egress on a workload with nothing to steal is noise.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the subnet has any egress filtering in front of it, whether the workload processes untrusted input, and whether flow logs are on.',
          why: 'A proxy or firewall in front changes the finding, so the rule has to look before it fires.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium on its own, and high when combined with a workload that processes untrusted input, since together they are an exfiltration path.',
          why: 'Honest, because the default is open and reporting every default as high would bury the environment in critical findings.',
          choices: [
            'Medium on its own, and high when combined with a workload that processes untrusted input, since together they are an exfiltration path.',
            'Critical always, because unrestricted egress allows data theft.',
            'Informational, since allowing all egress is the provider default.',
            'Low, because a security group cannot deny anything anyway.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Being the default is a reason to expect the finding everywhere, not a reason to stop reporting it. It is also a reason to rank it honestly, so the exceptions stand out.',
    },

    fadeHeavy: {
      task: 'A rule for a NACL that allows inbound on a port with no matching outbound rule for the ephemeral range.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which subnets the NACL is attached to, what runs there, and whether anyone has reported connectivity that hangs rather than fails.',
          why: 'The symptom of this mistake is a connection that establishes and never answers, which teams usually debug as an application problem.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Low as a security finding and high as a reliability one, so it is reported to the owning team rather than through the security queue.',
          why: 'Being honest about which queue a finding belongs in is what stops a posture team becoming the place tickets go to die.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Add the outbound allow for the ephemeral port range, or move the control to a security group where state removes the need for it.',
          why: 'The second option is usually better: use the stateful layer for connection level allowance and keep the stateless list for a small number of deny rules.',
          choices: [
            'Add the outbound allow for the ephemeral port range, or move the control to a security group where state removes the need for it.',
            'Add an outbound allow for all ports to 0.0.0.0/0 on the NACL.',
            'Remove the NACL entirely, since security groups cover the same ground.',
            'Change the application to use a fixed source port.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The NACL rules in numeric order, showing the inbound allow with no matching outbound entry, and the subnets it is attached to.',
          why: 'Numeric order matters in the evidence, because the first match wins and a later allow can be unreachable behind an earlier deny.',
          choices: [
            'The NACL rules in numeric order, showing the inbound allow with no matching outbound entry, and the subnets it is attached to.',
            'A packet capture showing the connection hanging.',
            'The security group rules for the same interfaces.',
            'The application logs from the affected service.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'A NACL that allows everything outbound is a NACL doing nothing outbound, which is often the honest answer: use the stateless list for a handful of denies and let the stateful layer do the rest.',
    },

    parsons: {
      task:
        'Four of these belong in the open management port rule from question 3.3. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the rule', code: 'a security group allows inbound from 0.0.0.0/0 or ::/0' },
        { id: 'p2', label: 'the port', code: 'to a management or database port such as 22, 3389 or 5432' },
        { id: 'p3', label: 'the reachability', code: 'and the attached interface sits in a subnet routed to an internet gateway' },
        { id: 'p4', label: 'the exception path', code: 'and the group carries no approved bastion tag' },
        { id: 'd1', label: 'the port', code: 'to any port at all, since any open port is a risk', distractor: true },
        { id: 'd2', label: 'the reachability', code: 'and the security group has a deny rule that is being overridden', distractor: true },
        { id: 'd3', label: 'the exception path', code: 'and the instance was launched more than a year ago', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The deny rule distractor is impossible: a security group has allow rules only, so there is no deny to override. Recognising that a condition cannot be true is as useful as knowing which conditions matter, and it is exactly what question 3.1 tests.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A database instance sits in a private subnet, but its security group allows inbound on 5432 from 0.0.0.0/0, and the subnet has a route to a NAT gateway. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The security group rules and attachments, the subnet route table, and the classification of the database contents.',
          options: [
            'The security group rules and attachments, the subnet route table, and the classification of the database contents.',
            'The database engine version and its known vulnerabilities.',
            'The connection logs from the application tier.',
          ],
          why: 'Rule plus route decides reachability and classification decides impact. The engine version is a vulnerability question and belongs to a different rule.',
        },
        {
          part: 'condition',
          answer:
            'A security group allowing inbound from 0.0.0.0/0 to a database port, attached to an instance in any subnet.',
          options: [
            'A security group allowing inbound from 0.0.0.0/0 to a database port, attached to an instance in any subnet.',
            'A database instance in a subnet with a route to a NAT gateway.',
            'A database instance whose security group allows inbound from the application subnet.',
          ],
          why: 'The wide rule is the finding wherever it is attached. A NAT route is normal and the application subnet allowance is the intended design.',
        },
        {
          part: 'context',
          answer:
            'Whether the subnet is internet routable, whether the instance holds a public address, and what the database contains.',
          options: [
            'Whether the subnet is internet routable, whether the instance holds a public address, and what the database contains.',
            'How many connections the database receives per second.',
            'Whether the database has automated backups enabled.',
          ],
          why: 'Reachability first, impact second. These are the two questions that separate a critical from a medium in this rule.',
        },
        {
          part: 'severity',
          answer:
            'Medium. The rule is wrong and the subnet has no internet gateway route, so the world cannot reach it, but anything inside the VPC can.',
          options: [
            'Medium. The rule is wrong and the subnet has no internet gateway route, so the world cannot reach it, but anything inside the VPC can.',
            'Critical, because 0.0.0.0/0 on a database port is always critical.',
            'Low, because the subnet is private and the NAT gateway blocks inbound traffic.',
          ],
          why: 'The honest answer is in the middle, and it is worth defending. The rule grants access to every workload in the VPC, including a compromised one, and it is one route change from the world.',
        },
        {
          part: 'falsePositives',
          answer:
            'None for a database port from 0.0.0.0/0. Legitimate access is expressed as the application security group or a specific range, which is a different rule.',
          options: [
            'None for a database port from 0.0.0.0/0. Legitimate access is expressed as the application security group or a specific range, which is a different rule.',
            'Databases in development accounts, which are excluded from network rules.',
            'Databases whose credentials are strong and rotated regularly.',
          ],
          why: 'Saying there are no exceptions is sometimes the right answer, and it is stronger than inventing one. Credential strength is a different control against a different failure.',
        },
        {
          part: 'remediation',
          answer:
            'Replace the source with the application security group, so only workloads in that group can connect, and keep the database out of any subnet with an internet gateway route.',
          options: [
            'Replace the source with the application security group, so only workloads in that group can connect, and keep the database out of any subnet with an internet gateway route.',
            'Add a NACL deny rule for 5432 from 0.0.0.0/0 on the subnet.',
            'Restrict the source to the VPC address range.',
          ],
          why: 'Referencing a security group as the source is the cloud native answer and it survives address changes. The NACL is a useful second layer and it does not fix the group; the VPC range is better than the world and still allows every workload.',
        },
        {
          part: 'evidence',
          answer:
            'The security group rule with its source and port, the instances it is attached to, the subnet route table showing no internet gateway, and the classification of the data.',
          options: [
            'The security group rule with its source and port, the instances it is attached to, the subnet route table showing no internet gateway, and the classification of the data.',
            'A successful connection attempt from a laptop on the corporate network.',
            'The list of every security group in the account for comparison.',
          ],
          why: 'Including the route table in the evidence is what makes the medium rating credible rather than looking like an oversight.',
        },
      ],
      closing:
        'Writing medium when the environment expects critical is the harder discipline, and the reason to do it is in the false positives row of every rule in this section: the rule that fires accurately keeps the attention it needs for the day something really is critical.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the open database port.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the rule', code: 'a security group allows inbound from 0.0.0.0/0' },
          { id: 'f2', label: 'the port', code: 'to a database port such as 5432' },
          { id: 'f3', label: 'the attachment', code: 'and it is attached to a database instance' },
          { id: 'f4', label: 'the reachability check', code: 'and the finding records whether that subnet is internet routable' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Rule, port, attachment, reachability. The fourth is what makes the severity defensible.',
      },
    },

    trap: {
      misconceptionId: 'sec-private-subnet-blocks-egress',
      setup:
        'An incident review. A workload in a private subnet was compromised and sent data to an external host for three weeks. The network team says this should not have been possible.',
      code:
        'Subnet: data-processing-1, no internet gateway route\nRoute table: 0.0.0.0/0 -> nat-0f91c2\nSecurity group egress: allow all traffic to 0.0.0.0/0\nNetwork team: the subnet is private, so there is no path out.',
      language: 'text',
      question: 'Where is the path out?',
      options: [
        {
          text: 'The NAT gateway. It allows any connection started inside the subnet and returns the replies, and the security group egress rule permits everything.',
          correct: true,
        },
        { text: 'There is no path. The traffic must have gone through a misconfigured peering connection.', correct: false },
        { text: 'The internet gateway attached to another subnet in the same VPC.', correct: false },
        { text: 'The NACL, which must have had an outbound allow rule that should not be there.', correct: false },
      ],
      silently:
        'Every control in the account is doing exactly what it was configured to do, which is why nobody found this for three weeks. No inbound rule was violated, no gateway was misconfigured, and the flow logs, if they were on, show ordinary outbound connections from a workload that makes outbound connections all day. The word private did the damage: it described the inbound direction and was read as isolation.',
      explanation:
        'Fact 34 answers this in one line: NAT allows any outbound connection initiated from inside, it only blocks inbound, and you need egress filtering with a destination allowlist. Private is a statement about who can start a connection, not about where traffic can go. The controls that actually restrict egress are a firewall or proxy with an allowlist, private endpoints for provider services so that traffic never leaves the network, and a security group egress rule narrower than the default. None of those is on by default, which is why this is one of the eight documented misconceptions.',
    },

    handoff: {
      canNow: [
        'Say which of security groups and NACLs is stateful, which can deny, and where each attaches',
        'Rate an open management port using reachability and impact rather than a single number',
        'Explain why a private subnet with NAT does not stop outbound traffic',
      ],
      note: 'Q3.1 is the pair, Q3.3 is the severity question with its three context variables, and fact 27 is the one line comparison.',
    },
  },
}
