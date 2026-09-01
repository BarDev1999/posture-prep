import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L36',
  number: 36,
  topicId: 'cloud',
  sectionId: 3,
  title: 'VPC, subnets, and route tables',
  objective:
    'You will be able to say exactly what makes a subnet public, explain why a private subnet with a NAT gateway still reaches the internet, and write the rule that finds a workload placed on the wrong side.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F26', 'F34', 'Q3.2', 'Q3.6', 'Q3.4'],

  steps: {
    vocabulary: [
      {
        term: 'VPC',
        definition: 'A private network you own inside the cloud provider. Nothing in it reaches the internet unless something you configured lets it.',
      },
      {
        term: 'subnet',
        definition: 'A slice of the VPC address range, tied to one availability zone. Resources are placed in a subnet, never in the VPC directly.',
      },
      {
        term: 'route table',
        definition: 'The list of where traffic for each destination range goes. Every subnet has exactly one, and it is what decides reachability.',
      },
      {
        term: 'internet gateway',
        definition: 'The component that connects a VPC to the internet, in both directions. A route to it is what makes a subnet public.',
      },
      {
        term: 'NAT gateway',
        definition: 'A one way door out. It lets connections started inside reach the internet and returns the answers, and accepts nothing started outside.',
      },
    ],

    model: {
      narrative: [
        'Question 3.2 asks what makes a subnet public and wants precision, so here it is: its route table has a route for 0.0.0.0/0 pointing at an internet gateway. That is the whole definition.',
        '',
        'Not the public IP on the instance. An instance with a public address in a subnet whose route table has no internet gateway route is unreachable, and the address is decoration. Not the security group either: a security group filters traffic that arrives, and traffic that has no route never arrives.',
        '',
        'The mirror image is the one people get wrong in the other direction. A private subnet with a NAT gateway has a route for 0.0.0.0/0 pointing at the NAT rather than at the gateway, and that is still a route to the internet. Connections started inside reach anything, and the answers come back. What NAT blocks is connections started outside.',
        '',
        'Question 3.6 is exactly this: a compromised instance in a private subnet talking to a command and control server. The traffic succeeds. Fact 34 says the same in one line: NAT allows any outbound connection initiated from inside, it only blocks inbound, and stopping the traffic needs egress filtering with a destination allowlist.',
        '',
        'So the route table is the first thing to read, and the direction of the question decides which route matters.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two subnets in the same VPC. Both have a route for 0.0.0.0/0, and the difference between them is the target of that one route.',
        left: {
          title: 'public subnet',
          points: [
            '0.0.0.0/0 goes to the internet gateway.',
            'Reachable from outside if a security group allows it.',
            'Outbound works too.',
            'This is the definition. Nothing else makes a subnet public.',
          ],
        },
        right: {
          title: 'private subnet with NAT',
          points: [
            '0.0.0.0/0 goes to the NAT gateway.',
            'Nothing started outside can reach in.',
            'Anything started inside reaches out, including C2.',
            'Private means no inbound, not no internet.',
          ],
        },
      },
      takeaway: 'A route for 0.0.0.0/0 to an internet gateway makes a subnet public. A route to a NAT gateway still reaches the internet, outbound only.',
    },

    worked: {
      task:
        'Write the rule for a workload placed in a public subnet when it has no reason to be there: an internal service reachable from the internet by construction.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The subnet route tables, the network interface configuration of each workload, and the tags or naming that say what the workload is for.',
          why: 'The route table is the fact, the interface says which subnet the workload sits in, and the tag says whether that was intended.',
          prompt: {
            question: 'Why read the route table rather than checking for a public IP on the instance?',
            answer:
              'Because the public IP is neither necessary nor sufficient. A workload can be reachable through a load balancer with no public address of its own, and it can carry a public address in a subnet with no gateway route and be unreachable. The route is the thing that decides.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A workload whose subnet route table has a 0.0.0.0/0 route to an internet gateway, and which carries no tag marking it as an intentionally internet facing service.',
          why: 'The route plus the absence of an intent marker. Without the second half this fires on every load balancer and web server in the account.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether a security group actually allows inbound traffic to it, whether it holds a public address, what role it carries, and whether it is in production.',
          why: 'The route makes it possible, the security group makes it actual, and the role decides what an attacker gets after arriving.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when a security group allows inbound from 0.0.0.0/0 and the workload carries a role with broad permissions. High when it is routable but no security group allows inbound. Medium in non production.',
          why: 'Two layers have to align for reachability, so a workload that is routable but not permitted is a real finding one rule change away from being live.',
          prompt: {
            question: 'Why is a routable but closed workload still high?',
            answer:
              'Because the distance to exploitable is one security group edit, made by anyone with network permissions, and often made in a hurry during an incident. The placement is the durable mistake and the security group is the temporary one.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Load balancers, bastion hosts and public web tiers, marked with an approved internet facing tag that names the owner and the reason.',
          why: 'Public subnets exist for a reason and the rule has to recognise it, or the first ten findings are all correct designs and nobody reads the eleventh.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Move the workload to a private subnet and place a load balancer in the public one, or if it must stay, restrict the security group to known sources and remove the public address.',
          why: 'The first is the real fix and the second is what to do this afternoon. Offering both makes the ticket actionable rather than aspirational.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The route table entry with its gateway target, the subnet the workload sits in, the security group rules, and the role attached to it.',
          why: 'Four lines that together say reachable, permitted and worth reaching. Each one on its own is arguable.',
        },
      ],
      result:
        'A rule that finds workloads exposed by placement rather than by an obviously wrong firewall rule, which is the class people stop looking for once the obvious ones are closed.',
    },

    fadeLight: {
      task: 'A rule for a private subnet whose egress is unrestricted, which is question 3.6.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The subnet route tables, the NAT gateway configuration, and any egress filtering in place such as a firewall or proxy.',
          why: 'The route says traffic can leave and the filtering, or its absence, says where it can go.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A subnet with a 0.0.0.0/0 route to a NAT gateway and no destination allowlist enforced on outbound traffic.',
          why: 'Precise about the missing control rather than describing the subnet as risky.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What runs in the subnet, whether those workloads hold credentials, and whether flow logs are enabled.',
          why: 'Flow logs matter here because they are the only way anyone would notice, and question 3.4 makes the point that they are not enough on their own.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. A compromised workload can reach any destination it likes, because NAT blocks inbound connections and nothing else.',
          why: 'This is fact 34, stated as a severity. The subnet being private is not a control against exfiltration.',
          choices: [
            'High. A compromised workload can reach any destination it likes, because NAT blocks inbound connections and nothing else.',
            'Low, because the subnet is private and has no internet gateway.',
            'Medium, because the NAT gateway logs every connection it makes.',
            'Informational, since egress filtering is an availability risk rather than a security control.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Question 3.6 asks whether the C2 traffic succeeds. It does, and the answer that gets the mark says why: NAT is a direction control, not a destination control.',
    },

    fadeHeavy: {
      task: 'A rule for a route table change that adds an internet gateway route to a subnet holding databases.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What sits in the affected subnet, whether any security group would now allow inbound, and who made the change.',
          why: 'This is a detection rule on a control plane event rather than a scan of a state, so the actor and the moment both matter.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the subnet holds data stores, because one route change makes every workload in it internet routable at once.',
          why: 'The blast radius of a route table edit is the whole subnet, which is what makes it a different class from a single security group change.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Revert the route, restrict who may modify route tables in production, and require infrastructure as code review for network changes.',
          why: 'Revert first, then reduce who can repeat it. The last clause moves the control to where it can be reviewed before it takes effect.',
          choices: [
            'Revert the route, restrict who may modify route tables in production, and require infrastructure as code review for network changes.',
            'Add a security group rule denying inbound traffic to the databases.',
            'Enable flow logs on the subnet so the traffic can be reviewed.',
            'Move the databases to a different availability zone.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The management trail entry for the route table change with the identity and timestamp, the resulting route table, and the list of resources now routable.',
          why: 'The list of affected resources is what makes the severity concrete for the team that has to act on it.',
          choices: [
            'The management trail entry for the route table change with the identity and timestamp, the resulting route table, and the list of resources now routable.',
            'The flow logs for the subnet since the change.',
            'The network diagram maintained by the platform team.',
            'A statement that the change was made during a maintenance window.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'A security group deny rule is the tempting answer and it is not possible: security groups hold allow rules only, which is the next lesson.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for a workload exposed by placement. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the workload runs on an interface in one subnet' },
        { id: 'p2', label: 'the routing fact', code: 'and that subnet route table sends 0.0.0.0/0 to an internet gateway' },
        { id: 'p3', label: 'the intent check', code: 'and the workload carries no approved internet facing tag' },
        { id: 'p4', label: 'the impact', code: 'and it holds a role with permissions beyond its own resources' },
        { id: 'd1', label: 'the routing fact', code: 'and the instance has a public IP address assigned', distractor: true },
        { id: 'd2', label: 'the intent check', code: 'and its security group allows traffic from 0.0.0.0/0', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the subnet is in a different availability zone from the load balancer', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The security group block is a distractor here for a subtle reason: it is a real and important condition, and it belongs in the context rows rather than in the condition. Putting it in the condition would silently narrow the rule to workloads that are already exploitable, and miss the ones that are one edit away.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A batch processing subnet has a route for 0.0.0.0/0 to a NAT gateway, workloads there hold a role that can read the data lake, and there is no egress filtering. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The subnet route table, the egress filtering configuration if any, and the roles attached to the workloads in that subnet.',
          options: [
            'The subnet route table, the egress filtering configuration if any, and the roles attached to the workloads in that subnet.',
            'The batch job schedules and their runtimes.',
            'The data lake bucket policies.',
          ],
          why: 'Route plus filtering says where traffic can go, and the roles say what a compromised workload would have to send.',
        },
        {
          part: 'condition',
          answer:
            'A subnet with an unrestricted outbound route and no destination allowlist, holding workloads whose role can read classified data.',
          options: [
            'A subnet with an unrestricted outbound route and no destination allowlist, holding workloads whose role can read classified data.',
            'A subnet whose workloads have public IP addresses.',
            'A subnet with more than fifty running workloads.',
          ],
          why: 'Unrestricted egress plus a role that can read what an attacker would want. The public address option describes a different finding entirely.',
        },
        {
          part: 'context',
          answer:
            'Whether flow logs are enabled, whether any workload there processes untrusted input, and how much of the data lake the role can reach.',
          options: [
            'Whether flow logs are enabled, whether any workload there processes untrusted input, and how much of the data lake the role can reach.',
            'Which instance types the workloads use and what they cost.',
            'How often the batch jobs fail and are retried.',
          ],
          why: 'Untrusted input is how the workload gets compromised in the first place, and the role scope is how much leaves once it is.',
        },
        {
          part: 'severity',
          answer:
            'High. There is a complete exfiltration path: read classified data with the role, send it anywhere over the NAT, with nothing filtering the destination.',
          options: [
            'High. There is a complete exfiltration path: read classified data with the role, send it anywhere over the NAT, with nothing filtering the destination.',
            'Low, because the subnet is private and unreachable from the internet.',
            'Medium, because the workloads are batch jobs rather than internet facing services.',
          ],
          why: 'Both wrong options mistake unreachable from outside for isolated. The path here runs outward, and inbound controls do nothing about it.',
        },
        {
          part: 'falsePositives',
          answer:
            'Subnets whose egress is already restricted to a provider endpoint or an allowlisted proxy, verified from the route table and firewall policy.',
          options: [
            'Subnets whose egress is already restricted to a provider endpoint or an allowlisted proxy, verified from the route table and firewall policy.',
            'Subnets used only for internal batch processing, since the jobs are written in house.',
            'Subnets where flow logs are enabled, since exfiltration would be visible.',
          ],
          why: 'Only the first names a control that removes the path. Flow logs are detection after the fact, and question 3.4 makes exactly that point.',
        },
        {
          part: 'remediation',
          answer:
            'Restrict egress to an allowlist of destinations through a firewall or proxy, use private endpoints for provider services, and narrow the workload role to the data it actually reads.',
          options: [
            'Restrict egress to an allowlist of destinations through a firewall or proxy, use private endpoints for provider services, and narrow the workload role to the data it actually reads.',
            'Remove the NAT gateway so the subnet has no outbound route at all.',
            'Enable flow logs and alert on connections to unknown addresses.',
          ],
          why: 'Removing NAT outright usually breaks patching and provider access, so it gets reverted within a week. A private endpoint is how you keep the access without the open path.',
        },
        {
          part: 'evidence',
          answer:
            'The route table showing 0.0.0.0/0 to the NAT, the absence of an egress filter, and the workload role with its read permissions on the data lake.',
          options: [
            'The route table showing 0.0.0.0/0 to the NAT, the absence of an egress filter, and the workload role with its read permissions on the data lake.',
            'A packet capture from one of the batch workloads.',
            'The data lake inventory and its total size.',
          ],
          why: 'Three configuration facts that spell out the path end to end, all readable from the API with nothing installed.',
        },
      ],
      closing:
        'A gateway endpoint for the provider service, which is what question 3.5 is about, is the usual way this gets fixed without breaking anything: the traffic never traverses the internet at all, so the allowlist has less to cover.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the batch subnet.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'workloads run in a private subnet with a NAT gateway' },
          { id: 'f2', label: 'the routing fact', code: 'and its 0.0.0.0/0 route means any outbound destination is reachable' },
          { id: 'f3', label: 'the missing control', code: 'and no destination allowlist is enforced on egress' },
          { id: 'f4', label: 'the impact', code: 'and the workload role can read classified data' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, route, missing control, impact. Read together they are an exfiltration path.',
      },
    },

    trap: {
      misconceptionId: 'sec-public-ip-makes-subnet-public',
      setup:
        'A review of a new environment. The team says the application subnet is private because none of the instances has a public IP address, and asks for the finding to be closed.',
      code:
        'Subnet: app-subnet-1\nRoute table: 0.0.0.0/0 -> igw-0a12b3\nInstances: no public IPv4 addresses assigned\nTeam response: no public IPs, so the subnet is private.',
      language: 'text',
      question: 'Is the subnet private?',
      options: [
        { text: 'Yes. Without a public address nothing can be reached from the internet.', correct: false },
        {
          text: 'No. The route table sends 0.0.0.0/0 to an internet gateway, which is the definition of a public subnet, whatever addresses the instances hold.',
          correct: true,
        },
        { text: 'Yes, as long as the security groups do not allow inbound traffic.', correct: false },
        { text: 'It depends on whether the instances have IPv6 addresses.', correct: false },
      ],
      silently:
        'Today, with no public addresses assigned, very little inbound traffic can arrive, and the team observation is not wrong about the current state. The subnet is nevertheless configured as public, so any instance launched with automatic address assignment, any load balancer placed there, or any interface given an address later becomes internet routable with no further change and no new review. The finding was closed on a property of the workloads rather than on a property of the network, and workloads change every day.',
      explanation:
        'Fact 26 is a definition and it is worth memorising word for word: a subnet is public when its route table has a route for 0.0.0.0/0 pointing at an internet gateway. Not the public IP, not the security group. The address and the security group decide whether a particular workload is reachable right now; the route decides what the subnet is. This distinction matters for posture because a route table is stable and a workload is not, so the durable finding is the one about the network.',
    },

    handoff: {
      canNow: [
        'Say precisely what makes a subnet public, and what does not',
        'Explain why a private subnet with a NAT gateway still reaches the internet outbound',
        'Write a rule for a workload exposed by placement, and one for unrestricted egress',
      ],
      note: 'Q3.2 wants the precise definition and Q3.6 is the NAT question. Facts 26 and 34 are both worth being able to say in one line.',
    },
  },
}
