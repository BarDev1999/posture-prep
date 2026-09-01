import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L21',
  number: 21,
  topicId: 'python',
  sectionId: 1,
  title: 'Method overriding and NotImplementedError',
  objective:
    'You will be able to override a method in a subclass, keep the signature the parent promised, and use NotImplementedError to force every subclass to answer.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['Q1.23', 'B#1E. Python, OOP and inheritance'],

  steps: {
    vocabulary: [
      {
        term: 'override',
        definition: 'Defining a method in a subclass that the parent already has. The subclass version is the one that runs.',
      },
      {
        term: 'signature',
        definition: 'The name of a method plus the parameters it takes. It is the promise the caller relies on.',
      },
      {
        term: 'NotImplementedError',
        definition: 'An error a parent method raises on purpose, to say that a subclass was supposed to replace it and did not.',
      },
      {
        term: 'raise',
        definition: 'Stops the current work and reports an error upward. Nothing after it in that method runs.',
      },
      {
        term: 'TypeError',
        definition: 'The error raised when a call does not match the definition, for example when an argument is missing.',
      },
    ],

    model: {
      narrative: [
        'The point of the parent class is a promise: every rule answers `evaluate(resource)` and gives back True or False. The engine that runs the rules is written against that promise and nothing else. It holds a list of rule objects, calls the same method on each, and never asks what kind of rule it has.',
        '',
        'Overriding is how a subclass keeps the promise while doing its own thing. Same name, same parameters, different body.',
        '',
        'Two ways to break the promise, and the second is the dangerous one.',
        '',
        'The first is not implementing it at all. `raise NotImplementedError` in the parent turns that from a silent wrong answer into a loud stop the first time the rule runs: without it, the parent version returns something, and a rule that always says False looks exactly like a clean environment.',
        '',
        'The second is overriding with a different signature. Python allows it, because Python does not check signatures until the call. The engine calls `evaluate(resource)` on twenty rules, nineteen answer, and the twentieth raises a TypeError from inside a loop that was written years ago.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The same loop over a mixed list of rules. On the left every subclass kept the promise; on the right one changed the parameters.',
        left: {
          title: 'signature kept',
          points: [
            'BucketRule.evaluate(self, resource)',
            'SshRule.evaluate(self, resource)',
            'The engine calls rule.evaluate(resource) on both.',
            'Two answers, one loop, no special cases.',
          ],
        },
        right: {
          title: 'signature changed',
          points: [
            'BucketRule.evaluate(self, resource)',
            'SshRule.evaluate(self, resource, account)',
            'The engine still calls rule.evaluate(resource).',
            'TypeError, at run time, inside the engine.',
          ],
        },
      },
      takeaway: 'An override may change the body. Changing the parameters breaks every caller that trusted the parent.',
    },

    worked: {
      task: 'Give the parent an evaluate that refuses to answer, then override it in two subclasses and run both from one loop.',
      steps: [
        {
          label: 'make the parent refuse to answer',
          code: 'class Rule:\n    def __init__(self, rule_id):\n        self.rule_id = rule_id\n\n    def evaluate(self, resource):\n        raise NotImplementedError',
          why: 'The parent declares the method so callers can rely on it, and refuses to implement it because it has no idea what this rule is about. Any subclass that forgets to override now fails on its first run rather than quietly returning None.',
          prompt: {
            question: 'Why raise rather than return False?',
            answer:
              'Because False is an answer and this is not one. A subclass that returns False for everything reports a clean environment, which is the most expensive wrong answer a security tool can give. The raise turns a missing implementation into a bug you find in the first test run.',
          },
        },
        {
          label: 'override with the same signature',
          code: 'class BucketRule(Rule):\n    def evaluate(self, resource):\n        return resource.get("resource_type") == "s3_bucket" and resource.get("is_public") is True',
          why: 'Same name, same parameters, different body. The parent version is not called and not needed; this one replaces it entirely.',
        },
        {
          label: 'override it differently in another subclass',
          code: 'class SshRule(Rule):\n    def evaluate(self, resource):\n        return resource.get("port") == 22 and resource.get("is_public") is True',
          why: 'A different question about the same kind of thing. The two subclasses share their id, their reporting and their type, and differ only where they must.',
          prompt: {
            question: 'Both subclasses read is_public. Should that move to the parent?',
            answer:
              'Only if you can name the shared idea. Here it is publicly reachable, and a parent method called is_reachable(resource) would be a fair place for it. Moving code up because two subclasses happen to share a line, with no name for why, is how a parent class becomes a junk drawer.',
          },
        },
        {
          label: 'run them from one loop that knows neither',
          code: 'rules = [BucketRule("CKV_S3_PUBLIC"), SshRule("CKV_EC2_SSH")]\nfor rule in rules:\n    if rule.evaluate(resource):\n        report(rule.rule_id, resource)',
          why: 'This loop is the payoff for all three lessons. It never asks what kind of rule it holds, so adding a twenty first rule type changes nothing here.',
          prompt: {
            question: 'What does this loop do if one subclass takes an extra parameter?',
            answer:
              'It raises a TypeError at the call, on that rule only, at run time. Nothing warns you when the subclass is written, because Python checks the arguments when the call happens rather than when the method is defined.',
          },
        },
      ],
      trace: {
        caption: 'One loop, two objects, two different bodies. Watch which evaluate runs on each pass.',
        language: 'python',
        code: [
          'class Rule:',
          '    def evaluate(self, resource):',
          '        raise NotImplementedError',
          '',
          'class BucketRule(Rule):',
          '    def evaluate(self, resource):',
          '        return resource.get("resource_type") == "s3_bucket"',
          '',
          'class Unfinished(Rule):',
          '    pass',
          '',
          'for rule in [BucketRule(), Unfinished()]:',
          '    print(rule.evaluate({"resource_type": "s3_bucket"}))',
        ],
        predict: {
          question: 'Before you step through it: what happens?',
          options: [
            { text: 'It prints True, then stops with a NotImplementedError.', correct: true },
            { text: 'It prints True, then False.', correct: false },
            { text: 'It prints True, then None.', correct: false },
            { text: 'It stops immediately, because Unfinished defines no evaluate.', correct: false },
          ],
        },
        frames: [
          { line: 1, vars: { Rule: '<class>' }, note: 'The parent, with an evaluate that refuses.' },
          {
            line: 5,
            vars: { BucketRule: '<class, parent Rule>' },
            note: 'A subclass that defines its own evaluate. That definition hides the parent one for its objects.',
          },
          {
            line: 9,
            vars: { Unfinished: '<class, parent Rule>' },
            note: 'A subclass that defines nothing. pass is a body that does nothing at all.',
          },
          {
            line: 12,
            vars: { rule: '<BucketRule object>' },
            note: 'First pass. Python looks for evaluate on BucketRule and finds one.',
          },
          {
            line: 7,
            vars: { rule: '<BucketRule object>', resource: '{"resource_type": "s3_bucket"}' },
            note: 'The subclass body runs. The parent version is never consulted.',
          },
          {
            line: 13,
            vars: { rule: '<BucketRule object>' },
            output: 'True',
            note: 'One rule answered.',
          },
          {
            line: 12,
            vars: { rule: '<Unfinished object>' },
            note: 'Second pass. No evaluate on Unfinished, so Python looks at the parent and finds one there.',
          },
          {
            line: 3,
            vars: { rule: '<Unfinished object>' },
            note: 'The parent body runs and raises. This is the whole reason the raise is there.',
          },
        ],
        conclusion:
          'The second rule stopped the program at the first call, naming itself. Replace the raise with return False and the same run prints True then False, reports nothing for the second rule, and looks like a passing scan for as long as nobody checks.',
      },
      result: 'Two rules answering the same question in their own way, and a third that cannot pretend to answer it at all.',
    },

    fadeLight: {
      task: 'Override evaluate in an EncryptionRule so it flags any resource whose encrypted field is not exactly True.',
      steps: [
        {
          label: 'say what it is made of',
          code: 'class EncryptionRule(Rule):',
          why: 'Same parent, so the engine can hold it in the same list.',
        },
        {
          label: 'keep the signature the parent promised',
          code: 'def evaluate(self, resource):',
          why: 'Same name, same parameters. This is the line the whole design rests on.',
        },
        {
          label: 'answer the question this rule is about',
          code: 'return resource.get("encrypted") is not True',
          why: 'Not encrypted means anything that is not exactly True, including the field being missing, which for a rule about encryption is the right default.',
          accept: ['return not (resource.get("encrypted") is True)'],
        },
      ],
      blanks: 1,
      closing: 'One method, three lines, and it slots into a loop written before this rule existed.',
    },

    fadeHeavy: {
      task: 'Write a parent method that refuses to answer, and a subclass that overrides it for public buckets.',
      steps: [
        {
          label: 'declare the promise on the parent',
          code: 'class Rule:\n    def evaluate(self, resource):',
          why: 'The method has to exist on the parent for callers to rely on it.',
        },
        {
          label: 'refuse to answer it there',
          code: 'raise NotImplementedError',
          why: 'A subclass that forgets to override now fails loudly on its first run instead of reporting a clean environment.',
        },
        {
          label: 'override it in the subclass, unchanged signature',
          code: 'class BucketRule(Rule):\n    def evaluate(self, resource):\n        return resource.get("is_public") is True',
          why: 'Same name and same parameters, so every caller written against the parent keeps working.',
          accept: ['class BucketRule(Rule):\n    def evaluate(self, resource):\n        return True is resource.get("is_public")'],
        },
      ],
      blanks: 2,
      closing:
        'That is the third thing Q1.23 tests: NotImplementedError in the parent to force an implementation, and an override that keeps the signature.',
    },

    parsons: {
      task: 'Order the blocks into a parent that refuses to answer and a subclass that answers properly.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'the parent', code: 'class Rule:' },
        { id: 'p2', label: 'declare the promise', code: 'def evaluate(self, resource):', indent: 1 },
        { id: 'p3', label: 'refuse to answer it here', code: 'raise NotImplementedError', indent: 2 },
        { id: 'p4', label: 'the subclass', code: 'class BucketRule(Rule):' },
        { id: 'p5', label: 'keep the signature', code: 'def evaluate(self, resource):', indent: 1 },
        { id: 'p6', label: 'answer it', code: 'return resource.get("is_public") is True', indent: 2 },
        { id: 'd1', label: 'refuse to answer it here', code: 'return False', indent: 2, distractor: true },
        { id: 'd2', label: 'keep the signature', code: 'def evaluate(self, resource, account):', indent: 1, distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      closing:
        'The two blocks you left out are the two failures of this lesson. return False in the parent turns every unfinished rule into a clean result. The extra parameter in the override compiles, imports, and raises a TypeError inside a loop somebody else wrote.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so the parent forces an implementation and the subclass provides one for public buckets.',
      template:
        'class Rule:\n    def evaluate(self, resource):\n        [[1]] NotImplementedError\n\nclass PublicBucketRule(Rule):\n    def [[2]](self, resource):\n        return (resource.get("resource_type") == "s3_bucket"\n                and resource.get("is_public") [[3]] True)',
      blanks: [
        {
          answer: 'raise',
          hint: 'The keyword that stops the method and reports the error upward. Five letters.',
        },
        {
          answer: 'evaluate',
          hint: 'The method name has to match the parent exactly, or the override is a new method nobody calls.',
        },
        {
          answer: 'is',
          hint: 'The explicit boolean test, the one that refuses the number one.',
        },
      ],
      closing:
        'That is Q1.23 complete: super() in the constructor from the last lesson, this override with the signature kept, and NotImplementedError in the parent forcing it to exist.',
      fallback: {
        task: 'Same problem, as blocks. A parent that refuses and a subclass that answers.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'the parent', code: 'class Rule:' },
          { id: 'f2', label: 'declare the promise', code: 'def evaluate(self, resource):', indent: 1 },
          { id: 'f3', label: 'refuse to answer it here', code: 'raise NotImplementedError', indent: 2 },
          { id: 'f4', label: 'the subclass', code: 'class PublicBucketRule(Rule):' },
          { id: 'f5', label: 'keep the signature', code: 'def evaluate(self, resource):', indent: 1 },
          {
            id: 'f6',
            label: 'answer it',
            code: 'return (resource.get("resource_type") == "s3_bucket"\n        and resource.get("is_public") is True)',
            indent: 2,
          },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
        closing: 'Promise, refuse, inherit, keep the signature, answer. Now write it with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-signature-change-on-override',
      setup:
        'A new rule needs the account as well as the resource, so the author added a parameter to its evaluate. It was tested on its own and worked. The engine that runs every rule is unchanged.',
      code: 'class SshRule(Rule):\n    def evaluate(self, resource, account):\n        return resource.get("port") == 22 and account.get("environment") == "prod"\n\n# in the engine, unchanged for two years:\nfor rule in rules:\n    if rule.evaluate(resource):\n        report(rule.rule_id, resource)',
      language: 'python',
      question: 'What happens when the engine reaches this rule?',
      options: [
        { text: 'It works. Python fills the missing account with None.', correct: false },
        { text: 'A TypeError at the call, saying evaluate is missing a required argument.', correct: true },
        { text: 'A NotImplementedError, because the signature does not match the parent.', correct: false },
        { text: 'Python refuses to define the class, because the override changes the parameters.', correct: false },
      ],
      silently:
        'What is silent is everything before the call. The class defines cleanly, imports cleanly, and passes its own unit test, which of course calls it with two arguments. The failure only appears when the engine runs the mixed list, and by then the traceback points at a line in the engine rather than at the subclass that broke the promise, so the first instinct is to look in the wrong file. Worse, if the loop catches exceptions per rule and logs them, that rule is quietly never evaluated again.',
      explanation:
        'Python checks arguments at the call, not at the definition, so nothing stops an override from changing the parameters. The parent signature is a contract with every caller, and a subclass that needs more data has to get it another way: put the account on the object in __init__, or widen the parent signature and update every subclass together. Wanting an extra parameter is usually a sign the promise itself is wrong, and the honest fix is to change it deliberately rather than in one subclass.',
    },

    handoff: {
      canNow: [
        'Override a method while keeping the signature the parent promised',
        'Use raise NotImplementedError to force every subclass to implement a method',
        'Explain why one loop can run twenty different rule types without knowing any of them',
      ],
      note: 'Q1.23 is now fully within reach: inherit, call super(), override with the same signature, and NotImplementedError in the parent. Answer it before moving on to injection.',
    },
  },
}
