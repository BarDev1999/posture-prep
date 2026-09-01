import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L19',
  number: 19,
  topicId: 'python',
  sectionId: 1,
  title: 'Classes and objects',
  objective:
    'You will be able to write a class with __init__ and a method, make two objects from it, and say which values belong to the object and which belong to the class.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['Q1.23', 'B#1E. Python, OOP and inheritance'],

  steps: {
    vocabulary: [
      {
        term: 'class',
        definition: 'A template for making things that hold the same fields and answer the same questions. Writing one creates nothing on its own.',
      },
      {
        term: 'object',
        definition: 'One thing made from a class. Also called an instance. Two objects from one class hold their own separate values.',
      },
      {
        term: '__init__',
        definition: 'The method that runs when an object is made. Its job is to set the fields the object will carry.',
      },
      {
        term: 'self',
        definition: 'The object the method was called on. It is the first parameter of every method and Python fills it in for you.',
      },
      {
        term: 'attribute',
        definition: 'A value stored on an object, reached with a dot: rule.severity. Set one that does not exist and it is created.',
      },
      {
        term: 'method',
        definition: 'A function defined inside a class. It is called on an object and receives that object as self.',
      },
    ],

    model: {
      narrative: [
        'You have been carrying the data for a posture rule in a dict for four lessons. A class is the same data with the behaviour attached: what this rule is, and what it does when it looks at a resource.',
        '',
        'The exam asks for this shape specifically, and it is the shape Checkov uses: every check is a class with an id, a severity, and a method that returns whether a resource violates it. That is not a coincidence; it is why the question is in the bank.',
        '',
        'Two ideas do all the work. `__init__` runs once per object and its job is to put values on `self`. `self` is not a keyword and not magic: it is the object, handed to the method as its first argument, and it is how a method reaches the data of the particular object it was called on.',
        '',
        'The line worth staring at is `self.rule_id = rule_id`. On the left is an attribute of the object, which survives the call. On the right is a parameter, which does not. They can share a name and usually do, which is exactly why the direction matters.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'One class, two objects. The template holds the behaviour; each object holds its own values, and neither can see the other.',
        layers: [
          {
            label: 'class Rule',
            note: 'Holds the methods: __init__ and evaluate. Written once, shared by everything made from it.',
            trust: 'trusted',
          },
          {
            label: 'first = Rule("CKV_S3_PUBLIC", "critical")',
            note: 'Its own rule_id and its own severity. Setting them changes nothing anywhere else.',
            trust: 'mixed',
          },
          {
            label: 'second = Rule("CKV_EC2_SSH", "high")',
            note: 'Same methods, different values. This separation is the whole point of making objects.',
            trust: 'mixed',
          },
        ],
      },
      takeaway: 'The class holds the behaviour, the object holds the values, and self is how a method reaches its own object.',
    },

    worked: {
      task: 'Write the Rule class the exam asks for: an id, a severity, and a method that says whether a resource violates it.',
      steps: [
        {
          label: 'name the template',
          code: 'class Rule:',
          why: 'Nothing exists yet. This line only says what the shape will be, and everything indented under it is part of that shape.',
        },
        {
          label: 'set the fields when an object is made',
          code: 'def __init__(self, rule_id, severity):\n    self.rule_id = rule_id\n    self.severity = severity',
          why: 'Two parameters come in and two attributes go onto self. Without the self. prefix these would be local names that vanish when __init__ returns.',
          prompt: {
            question: 'Why is self a parameter of __init__ when nobody passes it?',
            answer:
              'Python passes it. Writing Rule("CKV_1", "high") calls __init__ with the new object as the first argument and your two values after it. That is also why a method defined with no self cannot be called on an object.',
          },
        },
        {
          label: 'give the object something to do',
          code: 'def evaluate(self, resource):\n    return resource.get("resource_type") == "s3_bucket" and resource.get("is_public") is True',
          why: 'A method is a function that can reach its own object through self. This one does not need to yet, but the subclass in two lessons will.',
          prompt: {
            question: 'Why does evaluate take resource as a parameter rather than reading it from self?',
            answer:
              'Because the resource is not part of the rule. One rule object is evaluated against thousands of resources, so the resource is what changes per call and the rule is what stays. Data that belongs to the object goes on self; data the method is handed goes in the parameters.',
          },
        },
        {
          label: 'make objects and use them',
          code: 'bucket_rule = Rule("CKV_S3_PUBLIC", "critical")\nfor resource in resources:\n    if bucket_rule.evaluate(resource):\n        report(bucket_rule.rule_id, resource)',
          why: 'One object, many resources. The dot does both jobs: it reaches an attribute, and it calls a method on the object that owns the data.',
          prompt: {
            question: 'What would change if evaluate were a plain function taking the rule as a first argument?',
            answer:
              'Almost nothing today, and everything in two lessons. Once there are twenty rule types, the caller wants to loop over a list of rule objects and call evaluate on each without knowing which type it is. That only works when the behaviour travels with the object.',
          },
        },
      ],
      trace: {
        caption: 'Two objects from one class. Watch self hold a different object on each of the two passes through __init__.',
        language: 'python',
        code: [
          'class Rule:',
          '    def __init__(self, rule_id, severity):',
          '        self.rule_id = rule_id',
          '        self.severity = severity',
          '',
          'first = Rule("CKV_S3_PUBLIC", "critical")',
          'second = Rule("CKV_EC2_SSH", "high")',
          'print(first.severity, second.severity)',
        ],
        predict: {
          question: 'Before you step through it: what does this print?',
          options: [
            { text: 'critical high', correct: true },
            { text: 'high high', correct: false },
            { text: 'critical critical', correct: false },
            { text: 'It raises a TypeError, because self was never passed.', correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { Rule: '<class>' },
            note: 'The class body runs once, here, and binds the name. No object exists.',
          },
          {
            line: 6,
            vars: { Rule: '<class>' },
            note: 'A new empty object is made and handed to __init__ as self, along with the two values.',
          },
          {
            line: 3,
            vars: { self: '<Rule object A>', 'self.rule_id': '"CKV_S3_PUBLIC"', rule_id: '"CKV_S3_PUBLIC"' },
            note: 'The attribute on the left now exists. The parameter on the right is unchanged.',
          },
          {
            line: 4,
            vars: { self: '<Rule object A>', 'self.severity': '"critical"' },
            note: 'Object A now carries both fields. __init__ returns nothing, on purpose.',
          },
          {
            line: 6,
            vars: { first: '<Rule A: CKV_S3_PUBLIC, critical>' },
            note: 'The finished object is bound to first.',
          },
          {
            line: 7,
            vars: { first: '<Rule A: CKV_S3_PUBLIC, critical>' },
            note: 'Second call. A different empty object becomes self.',
          },
          {
            line: 3,
            vars: { self: '<Rule object B>', 'self.rule_id': '"CKV_EC2_SSH"' },
            note: 'Object A is untouched. Nothing about these two objects is shared.',
          },
          {
            line: 4,
            vars: { self: '<Rule object B>', 'self.severity': '"high"' },
            note: 'Same two lines, a different object underneath them.',
          },
          {
            line: 8,
            vars: { first: '<Rule A: critical>', second: '<Rule B: high>' },
            output: 'critical high',
            note: 'Two objects, two answers, from one class.',
          },
        ],
        conclusion:
          'The class body ran once. __init__ ran twice, with a different object as self each time, and that is the only reason first and second can hold different values while sharing every line of code.',
      },
      result: 'A class you can make as many rules from as you like, each one carrying its own id and severity, and all of them answering evaluate.',
    },

    fadeLight: {
      task: 'Write a Finding class holding a resource id and a severity, with a method that says whether it is serious.',
      steps: [
        {
          label: 'name the template',
          code: 'class Finding:',
          why: 'A noun, singular. One object is one finding.',
        },
        {
          label: 'set the fields when an object is made',
          code: 'def __init__(self, resource_id, severity):\n    self.resource_id = resource_id\n    self.severity = severity',
          why: 'Two parameters in, two attributes out onto self.',
        },
        {
          label: 'answer a question about the object',
          code: 'def is_serious(self):\n    return self.severity in {"critical", "high"}',
          why: 'No parameter beyond self, because everything it needs is already on the object. The membership test is the one from lesson 17.',
          accept: ['def is_serious(self):\n    return self.severity in {"high", "critical"}'],
        },
      ],
      blanks: 1,
      closing:
        'A method with only self is a question about the object. A method with more parameters is a question about the object and something else, which is what evaluate was.',
    },

    fadeHeavy: {
      task: 'Write an Account class holding an account id and an environment, with a method that says whether a given resource belongs to it.',
      steps: [
        {
          label: 'name the template',
          code: 'class Account:',
          why: 'Singular again. A list of these is a list of accounts.',
        },
        {
          label: 'set the fields when an object is made',
          code: 'def __init__(self, account_id, environment):\n    self.account_id = account_id\n    self.environment = environment',
          why: 'The direction matters: attribute on the left, parameter on the right.',
        },
        {
          label: 'answer a question about the object and something else',
          code: 'def owns(self, resource):\n    return resource.get("account_id") == self.account_id',
          why: 'The resource comes in as a parameter and the account id comes off self. That is the shape of every rule you are about to write.',
          accept: ['def owns(self, resource):\n    return self.account_id == resource.get("account_id")'],
        },
      ],
      blanks: 2,
      closing:
        'Notice how little a class adds over a dict here, and be honest about it: the payoff arrives in the next two lessons, when twenty of these have to answer the same question in twenty different ways.',
    },

    parsons: {
      task: 'Order the blocks into a Rule class with an id, a severity, and an evaluate method. Indentation counts.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name the template', code: 'class Rule:' },
        { id: 'p2', label: 'set the fields on creation', code: 'def __init__(self, rule_id, severity):', indent: 1 },
        { id: 'p3', label: 'store the first parameter', code: 'self.rule_id = rule_id', indent: 2 },
        { id: 'p4', label: 'store the second parameter', code: 'self.severity = severity', indent: 2 },
        { id: 'p5', label: 'answer a question about a resource', code: 'def evaluate(self, resource):', indent: 1 },
        { id: 'p6', label: 'return the answer', code: 'return resource.get("is_public") is True', indent: 2 },
        { id: 'd1', label: 'store the first parameter', code: 'rule_id = rule_id', indent: 2, distractor: true },
        { id: 'd2', label: 'answer a question about a resource', code: 'def evaluate(resource):', indent: 1, distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      closing:
        'The two blocks you left out are the two ways this goes wrong. Assigning to rule_id without self makes a local name that disappears when __init__ ends, so the object has no id and the error appears much later. Defining a method without self means the resource lands in the self slot, and the error message talks about arguments rather than about the missing word.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so this class stores its two fields and answers whether a resource is a public bucket.',
      template:
        'class BucketRule:\n    def __init__([[1]], rule_id, severity):\n        self.rule_id = rule_id\n        [[2]] = severity\n\n    def evaluate(self, resource):\n        return (resource.get("resource_type") == "s3_bucket"\n                and resource.get("is_public") [[3]] True)',
      blanks: [
        {
          answer: 'self',
          hint: 'The first parameter of every method: the object the call was made on. Four letters.',
        },
        {
          answer: 'self.severity',
          hint: 'The attribute being created on the object, so it survives after this method returns.',
        },
        {
          answer: 'is',
          hint: 'The explicit boolean test from lesson 16, the one that refuses the number one.',
        },
      ],
      closing:
        'That is the second half of Q1.23. The first half is the parent class it should inherit from, which is the next lesson.',
      fallback: {
        task: 'Same problem, as blocks. A BucketRule class with two fields and an evaluate method.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'name the template', code: 'class BucketRule:' },
          { id: 'f2', label: 'set the fields on creation', code: 'def __init__(self, rule_id, severity):', indent: 1 },
          { id: 'f3', label: 'store the id', code: 'self.rule_id = rule_id', indent: 2 },
          { id: 'f4', label: 'store the severity', code: 'self.severity = severity', indent: 2 },
          { id: 'f5', label: 'answer a question about a resource', code: 'def evaluate(self, resource):', indent: 1 },
          {
            id: 'f6',
            label: 'return the answer',
            code: 'return (resource.get("resource_type") == "s3_bucket"\n        and resource.get("is_public") is True)',
            indent: 2,
          },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
        closing: 'Class, init, fields, method. Now write it with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-class-attribute-shared',
      setup:
        'A rule that also keeps the findings it produced. It was written this way so that every rule starts with an empty list, and it passed its unit test, which makes one rule.',
      code: 'class Rule:\n    findings = []\n\n    def __init__(self, rule_id):\n        self.rule_id = rule_id\n\n    def record(self, finding):\n        self.findings.append(finding)\n\na = Rule("CKV_1")\nb = Rule("CKV_2")\na.record("f1")\nprint(len(b.findings))',
      language: 'python',
      question: 'What does the last line print?',
      options: [
        { text: '0, because b has recorded nothing.', correct: false },
        { text: '1, because both objects share the one list created in the class body.', correct: true },
        { text: 'It raises an AttributeError, because b.findings was never set.', correct: false },
        { text: '1, because record is defined on the class rather than on the object.', correct: false },
      ],
      silently:
        'Every rule object appends into the same list, so a scan across twenty rules ends with every rule reporting every finding. The counts are wrong in a direction nobody questions, upward, and the per rule report looks busy rather than broken. It survives testing because a test that creates one rule cannot show it, and it gets worse as the tool grows, because the list is never emptied between runs either.',
      explanation:
        'A name assigned in the class body belongs to the class, and every object made from that class sees the same one object behind it. For a number or a string that is nearly harmless, because rebinding on an object makes a fresh attribute; for a list or a dict it is not, because append changes the shared thing rather than rebinding anything. Anything an object should own goes in __init__ as self.findings = [], where a new list is made per object. This is the same shape as the misconception waiting in the next lesson: a value that looks like it belongs to the object, and does not.',
    },

    handoff: {
      canNow: [
        'Write a class with __init__ and set attributes on self',
        'Say what self is, and why every method takes it',
        'Explain why a list in the class body is shared by every object made from that class',
      ],
      note: 'Q1.23 in the bank is this lesson plus the next two: a parent class, a subclass, super(), and an override. Read the question now and come back to it after lesson 21.',
    },
  },
}
