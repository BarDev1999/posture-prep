import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L23',
  number: 23,
  topicId: 'python',
  sectionId: 1,
  title: 'Command injection, shell=False, and input validation',
  objective:
    'You will be able to call an external command with an argument list rather than a string, add validation that refuses anything that is not the shape you expect, and say why the two controls are separate.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F8', 'Q4.10', 'C#Section 4: Linux, Web Security, Containers'],

  steps: {
    vocabulary: [
      {
        term: 'subprocess',
        definition: 'The Python module for running another program. It can run one directly, or hand a whole line to the shell to interpret.',
      },
      {
        term: 'the shell',
        definition: 'A program that reads a line of text and decides what it means. Semicolons, pipes and backticks are instructions to it.',
      },
      {
        term: 'shell=True',
        definition: 'Tells subprocess to hand your string to the shell instead of running the program directly. It is not the default.',
      },
      {
        term: 'argument list',
        definition: 'The command and its arguments as separate items in a list. The operating system starts that program with exactly those arguments.',
      },
      {
        term: 'validation',
        definition: 'Checking that a value is the shape you expect before you use it, and refusing it when it is not.',
      },
    ],

    model: {
      narrative: [
        'This is the same shape as the last lesson, one layer down. In SQL, the mistake was putting a value into the query text. Here, the mistake is putting a value into a command line.',
        '',
        'The command line is a language too. A semicolon ends one command and starts another, a pipe feeds one into the next, and a dollar sign runs something and pastes the answer in. Those characters are instructions to the shell, and they are ordinary characters in a hostname field.',
        '',
        'Two separate controls fix this, and they fix different halves of it.',
        '',
        'The first is the argument list. `["ping", "-c", "1", host]` never becomes a line of text, so there is no shell to interpret it: the operating system starts ping with exactly four arguments, and the fourth is a strange looking hostname that ping will simply fail to resolve.',
        '',
        'The second is validation. The argument list stops the injection, and validation stops the nonsense: a value that is supposed to be an IP address should be checked as one, so bad input is refused at the door rather than passed to a program that will do something unpredictable with it.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The same hostname through both paths. On the left it is a line of text with two commands in it; on the right it is one strange argument.',
        left: {
          title: 'shell=True with a joined string',
          points: [
            'ping -c 1 8.8.8.8; cat /etc/passwd',
            'The shell reads the line and finds two commands.',
            'ping runs, then cat runs.',
            'The second one was never in your code.',
          ],
        },
        right: {
          title: 'an argument list, shell=False',
          points: [
            '["ping", "-c", "1", "8.8.8.8; cat /etc/passwd"]',
            'No shell involved. No line of text exists.',
            'ping is started with that whole string as one hostname.',
            'It fails to resolve it, and nothing else runs.',
          ],
        },
      },
      takeaway: 'A list of arguments never becomes a line of text, and only a line of text can hold a second command.',
    },

    worked: {
      task: 'Take the vulnerable ping helper from Q4.10 and fix it with both controls.',
      steps: [
        {
          label: 'read the vulnerable version and name the flaw',
          code: 'def ping(host):\n    return subprocess.check_output("ping -c 1 " + host, shell=True)',
          why: 'Two mistakes that only matter together: the value is concatenated into a string, and shell=True asks for that string to be interpreted rather than run.',
          prompt: {
            question: 'Which of the two is the bug?',
            answer:
              'Both, and either one alone is survivable. Concatenating into an argument list is harmless because no shell reads it. shell=True with a fixed string you wrote is also fine. It is the combination, attacker text inside a line the shell will interpret, that executes.',
          },
        },
        {
          label: 'validate the input before using it',
          code: 'ipaddress.ip_address(host)',
          why: 'It raises on anything that is not an IP address, which is what you want: a refusal, not a repair. Note that it is called for the exception, and the return value is not needed.',
          prompt: {
            question: 'Why validate at all, if the argument list already blocks the injection?',
            answer:
              'Because they answer different questions. The argument list makes injection impossible; validation makes the input meaningful. Without it you still pass junk to ping, wait for a DNS timeout, and log a failure that tells nobody anything. Controls that do different jobs do not replace each other.',
          },
        },
        {
          label: 'pass the command as a list of arguments',
          code: 'return subprocess.check_output(["ping", "-c", "1", host])',
          why: 'Command first, then each argument as its own item. shell=False is the default, so the safe path is the one you get by not asking for anything special.',
          prompt: {
            question: 'Why is "-c 1" split into two items?',
            answer:
              'Because the operating system takes the arguments exactly as given. "-c 1" as one item is a single strange argument, and ping will reject it. When a shell splits a line on spaces it does that job for you, and this is the one convenience you give up by not having one.',
          },
        },
        {
          label: 'assemble the fixed function',
          code: 'import subprocess, ipaddress\n\ndef ping(host):\n    ipaddress.ip_address(host)\n    return subprocess.check_output(["ping", "-c", "1", host])',
          why: 'Validation first so nothing runs on bad input, then the list form so nothing can run beyond what you named. This is the answer key to Q4.10 line for line.',
        },
      ],
      trace: {
        caption: 'Watch the string on line 2. That is where a hostname stops being a hostname.',
        language: 'python',
        code: [
          'host = "8.8.8.8; cat /etc/passwd"',
          'cmd = "ping -c 1 " + host',
          'print(cmd)',
          'args = ["ping", "-c", "1", host]',
          'print(args)',
        ],
        predict: {
          question: 'Before you step through it: what is the difference between cmd and args?',
          options: [
            {
              text: 'cmd is one line holding two commands; args is one command with a strange fourth argument.',
              correct: true,
            },
            { text: 'They are the same thing in two notations. subprocess treats them identically.', correct: false },
            { text: 'args is unsafe too, because the semicolon is still in it.', correct: false },
            { text: 'cmd raises a ValueError, because a command cannot contain a semicolon.', correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { host: '8.8.8.8; cat /etc/passwd' },
            note: 'Ordinary text from a form field. The semicolon means nothing yet.',
          },
          {
            line: 2,
            vars: { cmd: 'ping -c 1 8.8.8.8; cat /etc/passwd' },
            note: 'One string. There is now no boundary at all between what you wrote and what the user sent.',
          },
          {
            line: 3,
            vars: {},
            output: 'ping -c 1 8.8.8.8; cat /etc/passwd',
            note: 'Read it as the shell will: ping, then a semicolon, then a second command.',
          },
          {
            line: 4,
            vars: { args: '["ping", "-c", "1", "8.8.8.8; cat /etc/passwd"]' },
            note: 'Four items. The semicolon is inside the fourth one and there is nothing to interpret it.',
          },
          {
            line: 5,
            vars: {},
            output: "['ping', '-c', '1', '8.8.8.8; cat /etc/passwd']",
            note: 'The structure survived. That is the whole control: keeping the value in its own slot.',
          },
        ],
        conclusion:
          'The dangerous character never changed. What changed is whether anything was ever going to read it as an instruction. In the list form nothing does, so ping simply fails to resolve a very odd hostname, which is a bad request rather than a second program.',
      },
      result:
        'A helper that refuses anything which is not an IP address, and that could not run a second command even if the validation were removed.',
    },

    fadeLight: {
      task: 'Fix this helper, which runs a DNS lookup for a hostname supplied by the caller.',
      steps: [
        {
          label: 'name the work and its hole',
          code: 'def lookup(hostname):',
          why: 'One parameter, coming from outside, which is the only kind that matters here.',
        },
        {
          label: 'refuse anything that is not the shape you expect',
          code: 'if not re.fullmatch(r"[a-zA-Z0-9.-]+", hostname):\n    raise ValueError("not a hostname")',
          why: 'An allowlist of characters, not a list of the dangerous ones. fullmatch anchors it to the whole string, so a valid prefix is not enough.',
        },
        {
          label: 'run it without a shell',
          code: 'return subprocess.check_output(["dig", "+short", hostname])',
          why: 'Command first, then each argument separately. No shell means no line to inject into.',
          accept: ['return subprocess.check_output(["dig", "+short", hostname], shell=False)'],
        },
      ],
      blanks: 1,
      closing:
        'An allowlist is the right shape for validation. A blocklist of dangerous characters is a list you have to keep complete forever, against an attacker who only has to find one you forgot.',
    },

    fadeHeavy: {
      task: 'Write a helper that runs a whois lookup on an IP address supplied by the caller.',
      steps: [
        {
          label: 'name the work and its hole',
          code: 'def whois(ip):',
          why: 'The value comes from outside, so both controls apply.',
        },
        {
          label: 'refuse anything that is not an IP address',
          code: 'ipaddress.ip_address(ip)',
          why: 'It raises on bad input, which ends the function before anything is run. No repair, no cleaning up, just a refusal.',
        },
        {
          label: 'run it without a shell',
          code: 'return subprocess.check_output(["whois", ip])',
          why: 'Two items: the program and its one argument. shell=False is the default, so this is the shape you get by not asking for anything else.',
          accept: ['return subprocess.check_output(["whois", ip], shell=False)'],
        },
      ],
      blanks: 2,
      closing:
        'Validate, then run. Both lines are short and neither is optional: the first makes the input meaningful, the second makes injection impossible.',
    },

    parsons: {
      task: 'Order the blocks into a safe ping helper: validate the address, then run the command.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name the work and its hole', code: 'def ping(host):' },
        { id: 'p2', label: 'refuse anything that is not an IP', code: 'ipaddress.ip_address(host)', indent: 1 },
        {
          id: 'p3',
          label: 'run it without a shell',
          code: 'return subprocess.check_output(["ping", "-c", "1", host])',
          indent: 1,
        },
        {
          id: 'd1',
          label: 'run it without a shell',
          code: 'return subprocess.check_output("ping -c 1 " + host, shell=True)',
          indent: 1,
          distractor: true,
        },
        {
          id: 'd2',
          label: 'refuse anything that is not an IP',
          code: 'host = host.replace(";", "")',
          indent: 1,
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        'One block you left out is the original bug. The other strips semicolons, which is the same instinct as escaping quotes in the last lesson: it repairs the input rather than refusing it, it names one dangerous character out of many, and it leaves a pipe, a backtick and a dollar sign untouched.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks to make this helper safe. It runs a traceroute to an address supplied by the caller.',
      template:
        'import subprocess, ipaddress\n\ndef trace(address):\n    ipaddress.[[1]](address)\n    return subprocess.check_output([[[2]], "-m", "5", [[3]]])',
      blanks: [
        {
          answer: 'ip_address',
          hint: 'The function that raises unless the value is a valid IPv4 or IPv6 address.',
        },
        {
          answer: '"traceroute"',
          hint: 'The program to run, as the first item of the list, quoted as a string.',
          accept: ["'traceroute'"],
        },
        {
          answer: 'address',
          hint: 'The value from the caller, as its own item, unquoted so it is the variable and not the word.',
        },
      ],
      closing:
        'That is Q4.10 from the bank. Its answer key names both controls explicitly: shell=False with an argument list, and explicit input validation. Two controls, two different jobs, and the question expects both.',
      fallback: {
        task: 'Same problem, as blocks. A traceroute helper that validates then runs.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'name the work and its hole', code: 'def trace(address):' },
          { id: 'f2', label: 'refuse anything that is not an IP', code: 'ipaddress.ip_address(address)', indent: 1 },
          {
            id: 'f3',
            label: 'run it without a shell',
            code: 'return subprocess.check_output(["traceroute", "-m", "5", address])',
            indent: 1,
          },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Validate first, then the list form. Now write it with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-shell-true-concat',
      setup:
        'A helper that checks whether a host is reachable. The author knew about injection and added a check for a semicolon before building the command.',
      code: 'def reachable(host):\n    if ";" in host:\n        raise ValueError("bad host")\n    return subprocess.check_output("ping -c 1 " + host, shell=True)',
      language: 'python',
      question: 'The semicolon is blocked. What can a caller still do?',
      options: [
        { text: 'Nothing. The semicolon was the only way to add a second command.', correct: false },
        {
          text: 'Run any command they like, using a pipe, an ampersand, a newline or command substitution.',
          correct: true,
        },
        { text: 'Only read files, since ping cannot write anything.', correct: false },
        { text: 'Nothing, because shell=True only interprets the first word of the string.', correct: false },
      ],
      silently:
        'The check does exactly what it says and passes review because it visibly rejects the attack the author had in mind. Everything else the shell understands is still there: a pipe, a double ampersand, a newline, and command substitution with backticks or a dollar sign and brackets. The function keeps working for real hosts the whole time, so there is nothing failing to investigate.',
      explanation:
        'This is the shell version of the quoting fix from the last lesson, and it fails for the same reason: it treats a language as a list of characters. The shell has many ways to say run this next, and a blocklist has to enumerate all of them forever while an attacker needs one you missed. Stop building a line of text: the argument list has no shell to interpret anything, and validation refuses the input instead of trying to clean it. Fact 8 in the deck is the sentence to keep: shell=False, which is the default, plus explicit input validation, and never shell=True with concatenation.',
    },

    handoff: {
      canNow: [
        'Call an external command with an argument list instead of a string',
        'Add validation that refuses input rather than repairing it',
        'Explain why blocking one dangerous character is not a control',
      ],
      note: 'Q4.10 is this lesson exactly. It also ends the Python block: sections 2 to 5 are about systems rather than code, and every lesson in them finishes by writing a detection rule.',
    },
  },
}
