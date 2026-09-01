import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L20',
  number: 20,
  topicId: 'python',
  sectionId: 1,
  title: 'Inheritance and super()',
  objective:
    'You will be able to write a subclass that reuses its parent, call super().__init__ to set the inherited fields, and say what breaks when you set them by hand instead.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['Q1.23', 'B#1E. Python, OOP and inheritance'],

  steps: {
    vocabulary: [
      {
        term: 'inheritance',
        definition: 'Making a class out of another one. The new class gets everything the old one had, and can add to it or replace parts.',
      },
      {
        term: 'parent class',
        definition: 'The class being inherited from, written in brackets after the new name. Also called the base class.',
      },
      {
        term: 'subclass',
        definition: 'The new class. Every object of it is also an object of the parent, which is what lets one loop handle a mixed list.',
      },
      {
        term: 'super()',
        definition: 'A way to call the parent version of a method from inside the subclass, without naming the parent again.',
      },
      {
        term: 'AttributeError',
        definition: 'The error raised when you reach for a field an object does not have. It fires where the field is used, not where it was forgotten.',
      },
    ],

    model: {
      narrative: [
        'Twenty posture rules share almost everything: an id, a severity, whether they are enabled, how they report. What differs is one method, the one that decides whether a resource violates the rule.',
        '',
        'Inheritance is for exactly that shape. The parent holds what they share, each subclass holds what it alone does, and the loop that runs them does not have to know which is which.',
        '',
        'The mechanical part is one line. `class BucketRule(Rule):` says that a BucketRule is a Rule, and everything Rule can do it can do. The part that goes wrong is the constructor: the subclass needs its own `__init__` to take different arguments, and the parent still has to run so that the fields it sets exist.',
        '',
        '`super().__init__(...)` is what runs it. It is not a formality. The parent constructor is code, it can normalise a value, set a field the subclass never mentions, or register the object somewhere, and none of that happens if the subclass sets two attributes by hand instead.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption: 'One call to BucketRule(). The subclass constructor runs first, hands over to the parent, then adds its own.',
        nodes: [
          { label: 'rule = BucketRule()', note: 'No arguments here. The subclass knows its own id and severity.' },
          { label: 'BucketRule.__init__(self)', note: 'Runs first. Nothing is set on the object yet.' },
          { label: 'super().__init__("CKV_S3_PUBLIC", "critical")', note: 'The parent runs, on the same object, and sets the shared fields.' },
          { label: 'self.tag = "storage"', note: 'Back in the subclass. Its own field, added after the shared ones exist.' },
          { label: 'the object is finished', note: 'It carries both sets of fields and answers both sets of methods.' },
        ],
      },
      takeaway: 'A subclass constructor runs instead of the parent, not as well as it. super() is what puts the parent back.',
    },

    worked: {
      task: 'Turn the Rule class into a parent, and write a BucketRule subclass that fills in its own id and severity.',
      steps: [
        {
          label: 'keep the shared work in the parent',
          code: 'class Rule:\n    def __init__(self, rule_id, severity):\n        self.rule_id = rule_id\n        self.severity = severity',
          why: 'Unchanged from the last lesson. It knows nothing about buckets, and that is what makes it reusable.',
        },
        {
          label: 'say what the new class is made of',
          code: 'class BucketRule(Rule):',
          why: 'The name in brackets is the parent. From here on a BucketRule object is also a Rule object, which matters to any loop that holds a mixed list.',
          prompt: {
            question: 'The subclass defines no evaluate method yet. Can you call evaluate on it?',
            answer:
              'Yes, and it runs the parent version. Anything the subclass does not define is looked for on the parent, which is the whole mechanism. Defining it in the subclass is what replaces it, and that is the next lesson.',
          },
        },
        {
          label: 'give the subclass its own constructor',
          code: 'def __init__(self):\n    super().__init__("CKV_S3_PUBLIC", "critical")',
          why: 'The caller no longer passes an id or a severity, because a bucket rule knows both. super() runs the parent constructor on the same object, so rule_id and severity end up set exactly as before.',
          prompt: {
            question: 'What happens to the parent constructor if the subclass defines its own and never calls super()?',
            answer:
              'It does not run at all. The subclass constructor replaces it rather than adding to it. Whatever the parent set is simply missing, and nothing complains until something reaches for one of those fields.',
          },
        },
        {
          label: 'add what only this subclass has',
          code: 'self.tag = "storage"',
          why: 'After the super() call, not before. The object is fully a Rule by that point, so this line is adding rather than racing.',
          prompt: {
            question: 'Does the order of these two lines matter?',
            answer:
              'Here it happens not to, but make it a habit anyway. If the parent constructor ever sets the same field, or reads one, calling super() first is the only order that gives a predictable result.',
          },
        },
      ],
      trace: {
        caption: 'One constructor call, two constructors run. Watch the jump into the parent and back.',
        language: 'python',
        code: [
          'class Rule:',
          '    def __init__(self, rule_id, severity):',
          '        self.rule_id = rule_id',
          '        self.severity = severity',
          '',
          'class BucketRule(Rule):',
          '    def __init__(self):',
          '        super().__init__("CKV_S3_PUBLIC", "critical")',
          '        self.tag = "storage"',
          '',
          'rule = BucketRule()',
          'print(rule.rule_id, rule.severity, rule.tag)',
        ],
        predict: {
          question: 'Before you step through it: what does this print?',
          options: [
            { text: 'CKV_S3_PUBLIC critical storage', correct: true },
            { text: 'It raises an AttributeError, because BucketRule never sets rule_id.', correct: false },
            { text: 'None None storage', correct: false },
            { text: 'It raises a TypeError, because BucketRule() was called with no arguments.', correct: false },
          ],
        },
        frames: [
          { line: 1, vars: { Rule: '<class>' }, note: 'The parent exists.' },
          {
            line: 6,
            vars: { Rule: '<class>', BucketRule: '<class, parent Rule>' },
            note: 'The subclass exists and remembers its parent. Still no objects.',
          },
          {
            line: 11,
            vars: {},
            note: 'A new empty object is made. Python looks for __init__ on BucketRule and finds one, so the parent version is not called.',
          },
          {
            line: 8,
            vars: { self: '<BucketRule object, empty>' },
            note: 'Inside the subclass constructor. The object carries no fields at all yet.',
          },
          {
            line: 3,
            vars: { self: '<BucketRule object>', 'self.rule_id': '"CKV_S3_PUBLIC"', rule_id: '"CKV_S3_PUBLIC"' },
            note: 'Now inside the parent constructor, on the same object. super() did not make a second object.',
          },
          {
            line: 4,
            vars: { self: '<BucketRule object>', 'self.severity': '"critical"' },
            note: 'The parent has finished its two lines and returns to where super() was called.',
          },
          {
            line: 9,
            vars: { self: '<BucketRule object>', 'self.tag': '"storage"' },
            note: 'Back in the subclass. The object now has three fields, from two constructors.',
          },
          {
            line: 12,
            vars: { rule: '<BucketRule: CKV_S3_PUBLIC, critical, storage>' },
            output: 'CKV_S3_PUBLIC critical storage',
            note: 'Two of these fields came from a class that has never heard of buckets.',
          },
        ],
        conclusion:
          'One object, two constructors, one after the other. Take out the super() line and the first two fields are never created: the object is finished, valid, and missing half of itself.',
      },
      result: 'A BucketRule that takes no arguments, carries the parent fields, and can be used anywhere a Rule can.',
    },

    fadeLight: {
      task: 'Write an SshRule subclass of Rule with the id CKV_EC2_SSH and severity high.',
      steps: [
        {
          label: 'say what it is made of',
          code: 'class SshRule(Rule):',
          why: 'The parent in brackets. Everything Rule has, SshRule now has.',
        },
        {
          label: 'give it a constructor with no arguments',
          code: 'def __init__(self):',
          why: 'The caller should not have to know the id of a rule that only exists to be that rule.',
        },
        {
          label: 'run the parent with this rule values',
          code: 'super().__init__("CKV_EC2_SSH", "high")',
          why: 'The two values the parent expects, in the order it expects them. This is the line that makes the fields exist.',
          accept: ['super().__init__(rule_id="CKV_EC2_SSH", severity="high")'],
        },
      ],
      blanks: 1,
      closing: 'Two lines of subclass, and it inherits every method the parent has. That is the return on inheritance.',
    },

    fadeHeavy: {
      task: 'Write a PublicBucketRule subclass whose id and severity have defaults the caller can still override.',
      steps: [
        {
          label: 'say what it is made of',
          code: 'class PublicBucketRule(Rule):',
          why: 'Same parent, a more specific name.',
        },
        {
          label: 'take the values, with defaults',
          code: 'def __init__(self, rule_id="CKV_S3_PUBLIC", severity="critical"):',
          why: 'A default makes the argument optional. The caller can accept the id or pass their own, which is what the answer key to Q1.23 does.',
        },
        {
          label: 'pass them straight through to the parent',
          code: 'super().__init__(rule_id, severity)',
          why: 'The parent still does the storing. The subclass only decided what the defaults are.',
          accept: ['super().__init__(rule_id=rule_id, severity=severity)'],
        },
      ],
      blanks: 2,
      closing:
        'This is exactly the constructor in the answer key for Q1.23, and the reason it is written that way: defaults for the normal case, and the parent still doing the work of storing them.',
    },

    parsons: {
      task: 'Order the blocks into a subclass that sets its own defaults, runs the parent constructor, and then adds a field of its own.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'say what it is made of', code: 'class PublicBucketRule(Rule):' },
        {
          id: 'p2',
          label: 'take the values, with defaults',
          code: 'def __init__(self, rule_id="CKV_S3_PUBLIC", severity="critical"):',
          indent: 1,
        },
        { id: 'p3', label: 'run the parent first', code: 'super().__init__(rule_id, severity)', indent: 2 },
        { id: 'p4', label: 'add the field only this class has', code: 'self.tag = "storage"', indent: 2 },
        { id: 'd1', label: 'run the parent first', code: 'Rule.__init__(rule_id, severity)', indent: 2, distractor: true },
        {
          id: 'd2',
          label: 'set the inherited fields',
          code: 'self.rule_id = rule_id',
          indent: 2,
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'One block you left out calls the parent by name and forgets to pass the object, so rule_id lands in the self slot. The other sets an inherited field by hand, which is the trap on this lesson: it looks equivalent and it silently skips everything else the parent constructor does.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so PublicBucketRule inherits from Rule, defaults its own id and severity, and lets the parent set them.',
      template:
        'class PublicBucketRule([[1]]):\n    def __init__(self, rule_id="CKV_S3_PUBLIC", severity="critical"):\n        [[2]].__init__(rule_id, [[3]])',
      blanks: [
        {
          answer: 'Rule',
          hint: 'The class this one is made out of, named in the task. Capital letter, no quotes.',
        },
        {
          answer: 'super()',
          hint: 'The call that reaches the parent version of a method without naming the parent again. Include the brackets.',
        },
        {
          answer: 'severity',
          hint: 'The second value the parent constructor expects, passed straight through from this one.',
        },
      ],
      closing:
        'Three blanks, and every one of them is a place this goes wrong in practice: inheriting from nothing, calling the parent by name and losing self, and passing the arguments in the wrong order.',
      fallback: {
        task: 'Same problem, as blocks. A subclass with defaults that calls the parent constructor.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'say what it is made of', code: 'class PublicBucketRule(Rule):' },
          {
            id: 'f2',
            label: 'take the values, with defaults',
            code: 'def __init__(self, rule_id="CKV_S3_PUBLIC", severity="critical"):',
            indent: 1,
          },
          { id: 'f3', label: 'let the parent store them', code: 'super().__init__(rule_id, severity)', indent: 2 },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Parent in brackets, defaults in the signature, super() doing the storing. Now write it out.',
      },
    },

    trap: {
      misconceptionId: 'py-redefining-parent-attributes',
      setup:
        'The parent constructor was extended last month: it now lower cases the severity and sets an enabled flag. This subclass was written before that and sets the two fields by hand, which was equivalent at the time.',
      code: 'class Rule:\n    def __init__(self, rule_id, severity):\n        self.rule_id = rule_id\n        self.severity = severity.lower()\n        self.enabled = True\n\nclass BucketRule(Rule):\n    def __init__(self):\n        self.rule_id = "CKV_S3_PUBLIC"\n        self.severity = "Critical"',
      language: 'python',
      question: 'What is wrong with the subclass now?',
      options: [
        { text: 'Nothing. Both fields end up set, which is all the parent constructor did.', correct: false },
        {
          text: 'The parent constructor never runs, so enabled does not exist and severity keeps its capital letter.',
          correct: true,
        },
        { text: 'It raises a TypeError, because BucketRule.__init__ takes no severity argument.', correct: false },
        { text: 'The subclass cannot set inherited fields directly, so both assignments are ignored.', correct: false },
      ],
      silently:
        'Two failures with different timing. The severity is now "Critical" rather than "critical", so every comparison against the lower case value quietly says no and the rule reports nothing, which reads like a clean environment. The missing enabled field is worse: it raises an AttributeError, but only in the code that reads it, which may be a scheduler running at three in the morning and a long way from this class.',
      explanation:
        'Setting the same two attributes looks equivalent because, on the day it was written, it was. That is what makes this misconception stick: it is not wrong until the parent changes, and then it is wrong everywhere, silently, in a subclass nobody edited. A subclass constructor replaces the parent constructor; super() is what turns replacement back into extension. The rule to carry: if you write __init__ in a subclass, the first line is super().__init__(...) unless you can say exactly why not.',
    },

    handoff: {
      canNow: [
        'Write a subclass and say what it inherits',
        'Call super().__init__ and explain what would be missing without it',
        'Give a subclass constructor defaults the caller can still override',
      ],
      note: 'Q1.23 tests three things and you now have two of them: inheriting, and calling super() rather than redefining. The third is overriding a method, which is the next lesson.',
    },
  },
}
