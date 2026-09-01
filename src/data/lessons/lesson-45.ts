import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L45',
  number: 45,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'Processes, listening ports, and persistence locations',
  objective:
    'You will be able to list what is listening and what started it, name five persistence locations, and turn a single malicious cron line into detection logic.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F37', 'F38', 'Q4.2', 'Q4.3', 'Q4.5'],

  steps: {
    vocabulary: [
      {
        term: 'listening port',
        definition: 'A port a process has opened to accept connections. Every one of them is a way in, and something owns each one.',
      },
      {
        term: 'ss -tulpn',
        definition: 'The command listing listening sockets with their process: t for TCP, u for UDP, l for listening, p for process, n for no name resolution.',
      },
      {
        term: 'persistence',
        definition: 'Anything that makes attacker code run again after a reboot or a session ends. It is what separates an incident from a visit.',
      },
      {
        term: 'cron',
        definition: 'The scheduler that runs commands on a timetable, from user crontabs and from directories under /etc.',
      },
      {
        term: 'LD_PRELOAD',
        definition: 'An environment variable, or a file listing libraries, that forces a library to load into every program. A persistence and hooking mechanism.',
      },
    ],

    model: {
      narrative: [
        'Two questions describe a host almost completely. What is listening, and what will run again tomorrow.',
        '',
        'The first is one command, and question 4.2 asks for it: ss with the flags for TCP, UDP, listening, process and no resolution. The value is in the process column: a port with no owner you recognise is the finding, and a port you expected with an owner you did not is a bigger one.',
        '',
        'The second is a list, and fact 38 gives five: cron and the directories under /etc, systemd units, shell startup files such as the bash profile, the authorized keys file for SSH, and LD_PRELOAD or the preload configuration file.',
        '',
        'That list is worth memorising because the failure mode in an investigation is checking one place. An attacker who has read the same list uses the third one, and a team that checks only cron reports the host as clean.',
        '',
        'The reason this matters for posture rather than only for response is that all five are configuration. They can be read from a snapshot, compared against the image the host was built from, and reported as a difference. That is the same shape as the setuid rule in the last lesson: expected set, actual set, report the difference.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'The five persistence locations from fact 38. Checking one of them and reporting a host as clean is the ordinary mistake.',
        layers: [
          { label: 'cron and /etc/cron.*', note: 'Timetabled commands. The first place everybody looks, and the least used by anyone competent.', trust: 'untrusted' },
          { label: 'systemd units', note: 'Services and timers. Survives reboot, looks entirely legitimate in a unit file.', trust: 'untrusted' },
          { label: 'shell startup files', note: 'Runs on every interactive login, per user, and is rarely reviewed at all.', trust: 'untrusted' },
          { label: '~/.ssh/authorized_keys', note: 'A key added here is remote access with no password and no exploit.', trust: 'untrusted' },
          { label: 'LD_PRELOAD and /etc/ld.so.preload', note: 'Loads a library into every process. The hardest to spot and the most powerful.', trust: 'untrusted' },
        ],
      },
      takeaway: 'What is listening, and what runs again. Five persistence locations, and checking one of them proves nothing.',
    },

    worked: {
      task:
        'Question 4.5 gives a crontab line: every minute, fetch a script over plain HTTP from a bare address and pipe it into a shell. Extract detection logic from it.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Crontab contents and the files under the cron directories, plus systemd unit definitions, read from a snapshot or by an agent, and the process and network telemetry if an agent is present.',
          why: 'The configuration is where the line lives. The telemetry is where the behaviour lives, and the finding is stronger when both agree.',
          prompt: {
            question: 'Which three signals would you extract from that one line?',
            answer:
              'A scheduled task fetching from a bare address rather than a hostname, a download piped straight into a shell, and a schedule of every minute. Each one is unusual on its own and all three together are not a configuration mistake.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A scheduled task or unit whose command downloads content and pipes it into an interpreter, or fetches from a bare IP address, or runs at an interval under five minutes.',
          why: 'Three conditions joined by or, so each fires alone, because each one is independently worth a look and the combination is what raises the severity.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the destination address is known, whether the task was added after the image build, which user it runs as, and whether the same command appears on other hosts.',
          why: 'Appearing on other hosts is the enrichment that changes the response: one host is an investigation, twenty is an incident with a common cause.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the command pipes a remote download into a shell and the task was added after the build. High for a pipe to a shell from a known internal source. Medium for a bare address with no pipe.',
          why: 'Ranked by how close it is to unattended remote code execution, which is what the pipe into a shell actually is.',
          prompt: {
            question: 'Why does added after the build matter so much?',
            answer:
              'Because an image is reviewable and a change to a running host is not. A task present in the image came through a build somebody could have read; a task that appeared afterwards came from something that had access to the host, and that is the event worth investigating.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Configuration management and monitoring agents that legitimately fetch and run scripts, allowlisted by their exact command and their source host, reviewed when the agent version changes.',
          why: 'These exist and they look identical. Allowlisting the exact command rather than the pattern is what keeps the exception from covering the attack.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the task, rotate any credential the host held, rebuild from a known image, and add egress filtering so the fetch could not have succeeded.',
          why: 'The last clause is the preventive one, and it links back to the cloud lesson: the download only worked because outbound traffic was unrestricted.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The exact crontab line with its file and owner, the modification time of that file, the destination address with any reputation data, and the process and network records if an agent was present.',
          why: 'The line itself is the strongest evidence there is, and the modification time is what tells you when to start looking.',
        },
      ],
      result:
        'One line of a crontab turned into three reusable signals, with a severity that depends on when the line appeared rather than on what it says.',
    },

    fadeLight: {
      task: 'A rule for an unexpected listening port on a host.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The listening socket list with the owning process, and the expected port set for that host role.',
          why: 'The expected set is what makes this a finding rather than an inventory.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A process listening on a port that is not in the expected set for the host role, or an expected port owned by an unexpected process.',
          why: 'The second half is the interesting one: the right port with the wrong owner is a stronger signal than an unusual port.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the port is reachable from outside the host, what the process binary is and whether it came from a package, and when it started.',
          why: 'Reachability decides urgency and the package origin decides whether this is software or something somebody left behind.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the listening process is not from a package and the port is reachable from outside the host. High when it is unreachable, since something is still listening that nobody installed.',
          why: 'Same pattern as the setuid rule: an unpackaged binary with a network socket is an unknown with an entrance.',
          choices: [
            'Critical when the listening process is not from a package and the port is reachable from outside the host. High when it is unreachable, since something is still listening that nobody installed.',
            'Medium, because opening a port is a normal thing for software to do.',
            'Low unless the port is one of the well known service ports.',
            'Derived from the number of connections the port has received.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The process column is the whole value of the ss command. A list of ports is inventory; a list of ports with owners is a finding waiting to happen.',
    },

    fadeHeavy: {
      task: 'A rule for an SSH authorized keys file that has changed since the image was built.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which account the file belongs to, whether that account can escalate, whether the key comment matches a known engineer, and when the file changed.',
          why: 'A key on a service account is worse than a key on a personal one, because service accounts are rarely reviewed and often powerful.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. An added key is password free remote access that survives every credential rotation you might do in response to an incident.',
          why: 'This is the persistence mechanism that outlives the response, which is what makes it worse than a running process.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the key, rebuild the host from a known image, and move to short lived certificates or a session service so that a static key file is not the access mechanism at all.',
          why: 'The last clause removes the class: if nothing legitimate writes keys to that file, any change to it is unambiguous.',
          choices: [
            'Remove the key, rebuild the host from a known image, and move to short lived certificates or a session service so that a static key file is not the access mechanism at all.',
            'Change the SSH port so that automated scanners do not find it.',
            'Add the key to the expected set after asking the team whether it is theirs.',
            'Disable password authentication for SSH.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The key entry with its comment and fingerprint, the file modification time, the account it belongs to, and any SSH session authenticated by that key.',
          why: 'A session authenticated by the key turns a configuration difference into a confirmed access, and the fingerprint is what ties the two together.',
          choices: [
            'The key entry with its comment and fingerprint, the file modification time, the account it belongs to, and any SSH session authenticated by that key.',
            'The full contents of the authorized keys file.',
            'The SSH server configuration file.',
            'A list of every host with an authorized keys file.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Asking the team whether the key is theirs is not a remediation and it is also how this gets closed in practice. Somebody says yes, nobody checks the fingerprint, and the finding disappears.',
    },

    parsons: {
      task:
        'Four of these belong in the malicious cron rule from question 4.5. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the mechanism', code: 'a scheduled task or systemd unit runs a command on a timetable' },
        { id: 'p2', label: 'the download', code: 'and that command fetches content from a bare IP address over plain HTTP' },
        { id: 'p3', label: 'the execution', code: 'and pipes the downloaded content directly into a shell' },
        { id: 'p4', label: 'the timing', code: 'and the task was added after the host image was built' },
        { id: 'd1', label: 'the download', code: 'and the destination address is in a country outside our operating regions', distractor: true },
        { id: 'd2', label: 'the execution', code: 'and the command contains base64 encoded text', distractor: true },
        { id: 'd3', label: 'the timing', code: 'and the task runs outside working hours', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'All three distractors are signals real teams use and none of them belongs in this condition. Geography and working hours produce constant false positives from legitimate infrastructure, and encoded text is a heuristic that catches yesterday tooling.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A host has a systemd timer, added three days ago, that runs a binary from a temporary directory every ten minutes as root. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The systemd unit and timer definitions with their modification times, the binary path and its package ownership, and the process telemetry if an agent is present.',
          options: [
            'The systemd unit and timer definitions with their modification times, the binary path and its package ownership, and the process telemetry if an agent is present.',
            'The host authentication log for the last week.',
            'The network flow logs for the subnet.',
          ],
          why: 'The unit is the mechanism, its timestamp is the when, and the package ownership decides whether the binary is software or a leftover.',
        },
        {
          part: 'condition',
          answer:
            'A systemd unit or timer added after the image build that executes a binary from a world writable or temporary directory, running as root.',
          options: [
            'A systemd unit or timer added after the image build that executes a binary from a world writable or temporary directory, running as root.',
            'A systemd timer that runs more often than once an hour.',
            'A binary in a temporary directory.',
          ],
          why: 'Three properties together: added later, running from a directory anyone can write to, and privileged. Each alone appears legitimately.',
        },
        {
          part: 'context',
          answer:
            'Whether the binary is from a package, whether the same unit exists on other hosts, what the host role is, and what credentials it holds.',
          options: [
            'Whether the binary is from a package, whether the same unit exists on other hosts, what the host role is, and what credentials it holds.',
            'How much CPU the binary uses when it runs.',
            'Which systemd version the host uses.',
          ],
          why: 'Spread across hosts changes this from an investigation to an incident, and the credentials decide what has to be rotated.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Unpackaged code runs as root on a schedule, from a directory anyone can write to, and it was added after the host was built.',
          options: [
            'Critical. Unpackaged code runs as root on a schedule, from a directory anyone can write to, and it was added after the host was built.',
            'High, because a timer is less common than cron and therefore less likely to be malicious.',
            'Medium, until the binary has been analysed and confirmed as malicious.',
          ],
          why: 'Waiting for analysis before rating is how a live foothold sits in a queue. The configuration facts alone justify the rating.',
        },
        {
          part: 'falsePositives',
          answer:
            'Configuration management agents that install their own units, allowlisted by exact unit name and binary path, with the package or vendor named.',
          options: [
            'Configuration management agents that install their own units, allowlisted by exact unit name and binary path, with the package or vendor named.',
            'Units created by the platform team during an approved maintenance window.',
            'Units whose binaries are signed, whoever signed them.',
          ],
          why: 'Exact names and paths, tied to a named vendor. A maintenance window is a time range and an attacker can read the calendar too.',
        },
        {
          part: 'remediation',
          answer:
            'Disable and remove the unit, preserve the binary for analysis, rotate every credential the host held, and rebuild from a known image.',
          options: [
            'Disable and remove the unit, preserve the binary for analysis, rotate every credential the host held, and rebuild from a known image.',
            'Delete the binary and the unit and return the host to service.',
            'Move the binary to a non writable directory and keep the timer.',
          ],
          why: 'Preserve then rebuild. Deleting and returning to service loses the evidence and keeps whatever put it there, and the third option treats a foothold as a configuration preference.',
        },
        {
          part: 'evidence',
          answer:
            'The unit and timer files with their modification times, the binary path with its permissions and package status, and the execution records with the identity it ran as.',
          options: [
            'The unit and timer files with their modification times, the binary path with its permissions and package status, and the execution records with the identity it ran as.',
            'A screenshot of the systemd status output.',
            'The list of all timers on the host.',
          ],
          why: 'The timestamps and the package status carry the argument, and the execution records show it has already run.',
        },
      ],
      closing:
        'Note which persistence location this used. Not cron, which everybody checks, and it is one of the five in fact 38. The list is the point: an attacker only needs the one you skipped.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the systemd timer.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the mechanism', code: 'a systemd unit and timer run a binary on a schedule' },
          { id: 'f2', label: 'the timing', code: 'and both were added after the host image was built' },
          { id: 'f3', label: 'the location', code: 'and the binary sits in a temporary or world writable directory' },
          { id: 'f4', label: 'the privilege', code: 'and the unit runs as root' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Mechanism, timing, location, privilege. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'linux-persistence-is-only-cron',
      setup:
        'An investigation after a confirmed compromise. The responder checks the crontabs and the cron directories, finds nothing, and reports the host as clean of persistence.',
      code:
        'Checked: /var/spool/cron/crontabs/*, /etc/crontab, /etc/cron.d/*\nResult: no unexpected entries\nConclusion: no persistence found, host returned to service.',
      language: 'text',
      question: 'What has not been checked?',
      options: [
        {
          text: 'Systemd units and timers, shell startup files, the authorized keys files, and the library preload configuration.',
          correct: true,
        },
        { text: 'Nothing important. Cron is where scheduled persistence lives.', correct: false },
        { text: 'Only the user crontabs for accounts that were not logged in at the time.', correct: false },
        { text: 'The running process list, which would show any persistence mechanism.', correct: false },
      ],
      silently:
        'The host goes back into service and everything works. The next login runs the shell startup file, or the next reboot starts the unit, or the added SSH key is used at three in the morning, and the second incident is investigated as a new one because the first was closed as remediated. The most expensive part is the belief: the host is now on a list of hosts that were checked.',
      explanation:
        'Cron is the most obvious mechanism and therefore the least interesting one to an attacker who has read the same material as you. Fact 38 gives five locations for exactly this reason, and the useful habit is to treat them as a checklist rather than as examples: cron and its directories, systemd units and timers, shell startup files, authorized keys, and LD_PRELOAD or the preload configuration file. For posture rather than response, all five are readable from a snapshot and comparable against the image the host was built from, which turns persistence hunting into a difference report.',
    },

    handoff: {
      canNow: [
        'List what is listening with its owning process, and say why the process column is the point',
        'Name five persistence locations without pausing',
        'Turn one malicious scheduled command into three reusable detection signals',
      ],
      note: 'Q4.2, Q4.3 and Q4.5 are all in this lesson. Facts 37 and 38 are short and both come up often.',
    },
  },
}
