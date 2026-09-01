import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L44',
  number: 44,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'Linux filesystem, users, and permission bits',
  objective:
    'You will be able to read a permission mode including setuid, say why 4755 is a privilege escalation question, and write the rule that finds the binaries worth looking at.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F36', 'F39', 'Q4.1', 'Q4.4'],

  steps: {
    vocabulary: [
      {
        term: 'permission mode',
        definition: 'Three digits for owner, group and others, each adding read as 4, write as 2 and execute as 1. So 755 is read and execute for everyone, write for the owner.',
      },
      {
        term: 'setuid',
        definition: 'A fourth digit of 4 in front of the mode. It makes the file run as its owner rather than as whoever started it.',
      },
      {
        term: 'uid 0',
        definition: 'The numeric user id of root. Any account with uid 0 is root, whatever it is called.',
      },
      {
        term: '/etc/passwd',
        definition: 'The account list: username, uid, group, home directory and shell. World readable, and it holds no password hash.',
      },
      {
        term: '/etc/shadow',
        definition: 'The password hashes, readable only by root. World readable shadow is critical, because hashes can be cracked offline.',
      },
    ],

    model: {
      narrative: [
        'A mode like 755 answers who may read, write and execute. A mode like 4755 answers something else entirely, and that is the whole of question 4.1.',
        '',
        'The leading 4 is setuid, and it changes the identity a program runs as. Normally a program runs as whoever started it. With setuid, it runs as the file owner. If the owner is root, then anyone permitted to execute it runs code as root for as long as the program is running.',
        '',
        'That is not a bug: it is how a normal system lets an ordinary user change their own password, which requires writing to a root only file. It is also the reason attackers enumerate setuid binaries first, with the find command from fact 36, because any bug in one of them is a privilege escalation rather than a crash.',
        '',
        'The other pair worth knowing cold is passwd and shadow. The account list is world readable and holds no secrets, so reading it is reconnaissance. The hash file is root only, so reading it is game over: hashes crack offline, on the attacker hardware, with no rate limit and no logging.',
        '',
        'So two findings come out of this lesson: setuid binaries that should not be, and file permissions on the small set of files whose permissions are load bearing.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The same executable, two modes. The only difference is the leading digit, and it decides which user the code runs as.',
        left: {
          title: 'mode 755',
          points: [
            'Owner root, readable and executable by all.',
            'Runs as the user who started it.',
            'A bug in it affects that user only.',
            'The ordinary case, and the safe one.',
          ],
        },
        right: {
          title: 'mode 4755',
          points: [
            'Same permissions, plus setuid.',
            'Runs as root, whoever started it.',
            'A bug in it is a root shell.',
            'Attackers enumerate these first.',
          ],
        },
      },
      takeaway: 'setuid means the program runs as its owner. Owner root plus one bug is privilege escalation.',
    },

    worked: {
      task:
        'Write the rule for unexpected setuid binaries on a host or in an image, which is the finding behind question 4.1.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The filesystem inventory from an image scan or a disk snapshot, listing every file with its mode and owner, plus the package manifest saying which package each file came from.',
          why: 'The package manifest is what separates a normal setuid binary from an added one. Without it the finding is a list of forty files that ship with every distribution.',
          prompt: {
            question: 'Why is a list of every setuid binary not a useful finding?',
            answer:
              'Because a normal system has dozens of them and they are all meant to be there. A finding has to name a difference from the expected set, or the owning team correctly reads it as noise and stops opening your tickets.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A file with the setuid bit set and owner root that is either not owned by any installed package, or is owned by a package but whose mode differs from the package declared mode.',
          why: 'Two shapes: a file nobody installed, and a file whose permissions were changed after installation. The second is the more interesting one and the easier to miss.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the binary is a known interpreter or shell, whether the host is internet facing, whether the image is used in production, and when the file was last modified.',
          why: 'A setuid interpreter or shell is the strongest case, because it needs no bug at all: it is a root shell by design once it is setuid.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a setuid shell or interpreter, or any setuid file not owned by a package. High for a package file whose mode was changed. Medium for a setuid binary owned by a package in an unusual location.',
          why: 'Ranked by how much work is left for the attacker: none, a bug, or a bug in something unusual.',
          prompt: {
            question: 'Why does an unpackaged setuid file rank with a setuid shell?',
            answer:
              'Because nobody can tell you what it does. A package file has a source, a version and a maintainer, and its behaviour is reviewable. A file that arrived some other way, owned by root, running as root, is an unknown with the highest possible privileges.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'The expected distribution set: password tools, mount helpers, ping and the scheduler. Maintained as an allowlist per base image, reviewed when the base image changes.',
          why: 'Per base image, because the expected set is a property of the distribution. One global list produces false positives on every image that is not the most common one.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the setuid bit where the function does not need it, remove the binary where nothing needs it, and rebuild the image with the correct mode rather than fixing running hosts.',
          why: 'The last clause is the same lesson as the launch template: fixing the running host leaves the image, and the image will produce the next host.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The file path with its mode and owner, the package that should own it or the absence of one, the declared mode from the package database, and the modification time.',
          why: 'The declared mode beside the actual mode is the finding in one line, and it is not arguable.',
        },
      ],
      result:
        'A rule that reports the difference from the expected set rather than the set, which is the difference between a finding and a file listing.',
    },

    fadeLight: {
      task: 'A rule for a world readable shadow file, which is question 4.4.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'File permissions for the small set of security relevant files, read from an image scan or a snapshot.',
          why: 'A short, fixed list of paths, which makes this one of the cheapest checks there is.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'The shadow file readable by group or others, or any file in the private key directories readable beyond its owner.',
          why: 'Named paths and named permission bits. There is no judgement in this condition, which is what makes it reliable.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the host allows shell access to non root users, how many accounts have hashes, and whether the same image runs elsewhere.',
          why: 'Shell access is the exploitation path. In a single process container with no other users the finding is still real and much less reachable.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when any non root user has shell access on the host, because the hashes can be copied and cracked offline with no rate limit and no logging.',
          why: 'Offline cracking is what makes hash disclosure different from a login attempt: nothing observes it and nothing throttles it.',
          choices: [
            'Critical when any non root user has shell access on the host, because the hashes can be copied and cracked offline with no rate limit and no logging.',
            'High, because modern hashing algorithms make cracking impractical.',
            'Medium, since the attacker still needs to guess each password.',
            'Low, because the account list in the passwd file is world readable anyway.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The last wrong option confuses the two files, which is exactly what question 4.4 is testing. The account list is reconnaissance and the hash file is credentials.',
    },

    fadeHeavy: {
      task: 'A rule for an account with uid 0 that is not root.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the account has a valid shell, whether it can authenticate, and when it was created relative to the image build.',
          why: 'An account created after the image build is a persistence mechanism, and the creation time is often the only thing that says so.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. A second account with uid 0 is a second root, usually created to look like a service account and to survive a password change on root.',
          why: 'Nothing legitimate needs a second uid 0, so there is no version of this that is ordinary.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the account, review the authentication logs for its use, and rebuild the host from a known image if it was created after the build.',
          why: 'The last clause is the honest one: an account created after the build means something else happened first, and the account is a symptom.',
          choices: [
            'Remove the account, review the authentication logs for its use, and rebuild the host from a known image if it was created after the build.',
            'Change the account uid to a non zero value and keep it.',
            'Disable the account password while leaving the account in place.',
            'Add the account to a monitoring list and alert on its logins.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The passwd entry with its uid, the creation time of the entry, the account shell, and any authentication events for it.',
          why: 'The uid beside the username is the whole finding, and the timestamps decide whether this is a misconfiguration or an incident.',
          choices: [
            'The passwd entry with its uid, the creation time of the entry, the account shell, and any authentication events for it.',
            'The full contents of the passwd file.',
            'A list of every account on every host in the fleet.',
            'The host uptime and last patch date.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Keeping the account with a different uid is the option that reads as reasonable and is not: if nobody can say why the account exists, changing its number does not answer the question.',
    },

    parsons: {
      task:
        'Four of these belong in the unexpected setuid rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the bit', code: 'a file has the setuid bit set' },
        { id: 'p2', label: 'the owner', code: 'and it is owned by root' },
        { id: 'p3', label: 'the difference', code: 'and it is not owned by an installed package, or its mode differs from the declared one' },
        { id: 'p4', label: 'the exception path', code: 'and it is not in the expected set for this base image' },
        { id: 'd1', label: 'the owner', code: 'and it is executable by others', distractor: true },
        { id: 'd2', label: 'the difference', code: 'and it was modified in the last thirty days', distractor: true },
        { id: 'd3', label: 'the exception path', code: 'and no vulnerability is known in the binary', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The last distractor inverts the logic in a way worth noticing: a setuid root binary with no known vulnerability is not safe, it is unexamined. The absence of a known bug is not a property to filter on.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A container image is built by copying a compiled helper into it, and the Dockerfile sets mode 4755 on that helper so it can bind to a low port. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The image layer contents with file modes and owners, and the Dockerfile or build definition that produced them.',
          options: [
            'The image layer contents with file modes and owners, and the Dockerfile or build definition that produced them.',
            'The running container process list.',
            'The registry metadata for the image, including its tags.',
          ],
          why: 'The image is where the bit is set and the build definition is where it will come back from, which is the same launch template lesson in a different form.',
        },
        {
          part: 'condition',
          answer:
            'An image containing a setuid root binary that came from a build step rather than from a package, in an image that runs as a non root user.',
          options: [
            'An image containing a setuid root binary that came from a build step rather than from a package, in an image that runs as a non root user.',
            'An image containing any setuid binary.',
            'An image whose Dockerfile contains a chmod instruction.',
          ],
          why: 'The last clause is what makes it interesting: the image drops privileges for the main process and then leaves a path back to root inside it.',
        },
        {
          part: 'context',
          answer:
            'What the helper does, whether a capability would achieve the same thing, whether the container is internet facing, and what the pod service account can reach.',
          options: [
            'What the helper does, whether a capability would achieve the same thing, whether the container is internet facing, and what the pod service account can reach.',
            'How large the image is and how long it takes to build.',
            'Which base image it was built from and when.',
          ],
          why: 'The capability question is the remediation: binding a low port is exactly what a single narrow capability exists for, so the setuid bit is unnecessary rather than merely risky.',
        },
        {
          part: 'severity',
          answer:
            'High. Any code execution in the container can run the helper as root, which undoes the non root user the image was careful to set.',
          options: [
            'High. Any code execution in the container can run the helper as root, which undoes the non root user the image was careful to set.',
            'Critical, because setuid root is always critical.',
            'Low, because the container is isolated from the host anyway.',
          ],
          why: 'The third option is the misconception the container lessons are built to remove, and it is coming in lesson 50. Root in a container is a real step towards root on the host.',
        },
        {
          part: 'falsePositives',
          answer:
            'Images where the setuid binary comes from the distribution package set and its mode matches the package declaration.',
          options: [
            'Images where the setuid binary comes from the distribution package set and its mode matches the package declaration.',
            'Images built by the platform team, which reviews its own Dockerfiles.',
            'Images that have passed a vulnerability scan with no critical findings.',
          ],
          why: 'The package declaration is checkable. Team ownership and a clean scan say nothing about the mode of a file the scan did not look at.',
        },
        {
          part: 'remediation',
          answer:
            'Remove the setuid bit and grant the single capability the helper needs instead, or bind the port outside the container and pass it in.',
          options: [
            'Remove the setuid bit and grant the single capability the helper needs instead, or bind the port outside the container and pass it in.',
            'Run the whole container as root so the setuid bit is unnecessary.',
            'Leave the bit and add a runtime policy that alerts when the helper is executed.',
          ],
          why: 'A narrow capability is the correct tool. Running everything as root removes the finding by making it worse, which is a fix worth naming as a trap.',
        },
        {
          part: 'evidence',
          answer:
            'The Dockerfile line setting the mode, the file in the image layer with its mode and owner, and the user the image runs as.',
          options: [
            'The Dockerfile line setting the mode, the file in the image layer with its mode and owner, and the user the image runs as.',
            'A shell session inside the running container showing root access.',
            'The image build log in full.',
          ],
          why: 'Three artefacts, all from the build, and the contradiction between the last two is the argument: a non root user with a setuid root helper beside it.',
        },
      ],
      closing:
        'Note how the finding was strengthened by something good in the image: because it drops to a non root user, the setuid binary is a contradiction rather than a detail. Findings are often strongest where a team was already careful.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the setuid helper in an image.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the bit', code: 'the image contains a file with the setuid bit set and owner root' },
          { id: 'f2', label: 'the origin', code: 'and that file came from a build step rather than from a package' },
          { id: 'f3', label: 'the contradiction', code: 'and the image otherwise runs as a non root user' },
          { id: 'f4', label: 'the alternative', code: 'and a single capability would achieve the same function' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Bit, origin, contradiction, alternative. The fourth is what makes the remediation easy to accept.',
      },
    },

    trap: {
      misconceptionId: 'linux-setuid-is-just-a-permission',
      setup:
        'A hardening review. Someone proposes tightening a helper binary from 4755 to 4750, so that only the owner group can execute it, and records the risk as reduced.',
      code:
        '-rwsr-xr-x  1 root root  /usr/local/bin/helper     # 4755, before\n-rwsr-x---  1 root ops   /usr/local/bin/helper     # 4750, after\nReview note: execute permission narrowed, risk reduced.',
      language: 'text',
      question: 'What has actually changed, and what has not?',
      options: [
        {
          text: 'Fewer users can start it, and every one of them still runs it as root, so a bug in it is still privilege escalation for anyone in that group.',
          correct: true,
        },
        { text: 'Nothing has changed, because setuid overrides the permission bits.', correct: false },
        { text: 'The risk is removed, since only trusted operators are in the ops group.', correct: false },
        { text: 'The setuid bit no longer applies once group execute is restricted.', correct: false },
      ],
      silently:
        'The change is real, the review is recorded as a hardening improvement, and the dangerous property is untouched. Anyone in the operations group, or anything running as a member of it, including a compromised service account, still executes code as root. Because the mode looks tighter and a review says so, the binary drops off the list of things worth examining, which is the opposite of what should have happened.',
      explanation:
        'The three permission digits answer who may run it. The leading 4 answers who it runs as, and that is a different question with a much bigger consequence. Narrowing execute access reduces how many principals can reach the escalation and does not change that it is an escalation. Fact 36 is the sentence to keep: setuid means the binary runs as its owner rather than as the invoker, so if the owner is root, any bug in it is privilege escalation, and attackers enumerate these first with a find over the whole filesystem.',
    },

    handoff: {
      canNow: [
        'Read a four digit permission mode and say what the leading digit changes',
        'Explain why the hash file and the account list are different classes of disclosure',
        'Write a rule that reports unexpected setuid binaries rather than all of them',
      ],
      note: 'Q4.1 and Q4.4 are both in this lesson, and facts 36 and 39 are the pair to be able to say in one line each.',
    },
  },
}
