export interface OopStudyModule {
  id: string;
  pillar: string;
  title: string;
  readTime: string;
  summary: string;
  keyRules: string[];
  codeExample: string;
  interviewTrap: string;
}

export interface OopMcqItem {
  id: string;
  subtopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  askedIn: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  shortcutTip: string;
}

export const OOPS_STUDY_MODULES: OopStudyModule[] = [
  {
    id: 'encapsulation',
    pillar: 'Pillar 1 • Encapsulation',
    title: 'Encapsulation, Class Invariants & Const-Correctness',
    readTime: '6 min',
    summary:
      'Encapsulation bundles state and validated operations inside a class boundary so callers cannot break class invariants.',
    keyRules: [
      'Keep mutable data members private; expose narrow validated mutators instead of raw setters.',
      'Mark observer methods as const so read-only references (const T&) can call them safely.',
      'Validate preconditions atomically before mutating member fields to maintain strong exception safety.',
    ],
    codeExample: `class BankAccount {
private:
    long long balanceCents_;
public:
    explicit BankAccount(long long initial = 0) : balanceCents_(max(0LL, initial)) {}

    bool withdraw(long long cents) {
        if (cents <= 0 || cents > balanceCents_) return false; // Atomic guard
        balanceCents_ -= cents;
        return true;
    }

    long long balance() const { return balanceCents_; }
};`,
    interviewTrap:
      'Returning a non-const reference (int& getBalance()) breaks encapsulation completely—callers can mutate private memory directly.',
  },
  {
    id: 'abstraction',
    pillar: 'Pillar 2 • Abstraction',
    title: 'Abstract Base Classes, Pure Virtual Interfaces & Coupling',
    readTime: '5 min',
    summary:
      'Abstraction hides internal implementation complexity behind pure behavioral contracts (= 0 interfaces) so high-level modules depend on abstractions rather than concretions.',
    keyRules: [
      'A class with at least one pure virtual function (= 0) is abstract and cannot be instantiated directly.',
      'Every polymorphic base class MUST declare a virtual destructor (virtual ~Base() = default;).',
      'Pass interfaces via reference or smart pointer (unique_ptr<Interface>), never by value (avoids object slicing).',
    ],
    codeExample: `class IPaymentRail {
public:
    virtual ~IPaymentRail() = default;
    virtual bool charge(int cents) = 0;
};

class UpiRail : public IPaymentRail {
public:
    bool charge(int cents) override { return cents > 0; }
};`,
    interviewTrap:
      'Deleting a Derived* through a Base* when ~Base() is non-virtual causes Undefined Behavior and leaks derived resources.',
  },
  {
    id: 'inheritance',
    pillar: 'Pillar 3 • Inheritance',
    title: 'Inheritance Access Modes, Diamond Problem & Virtual Bases',
    readTime: '7 min',
    summary:
      'Inheritance models strict is-a relationships (Liskov Substitution), whereas composition (has-a) is preferred whenever reuse without substitutability is intended.',
    keyRules: [
      'Base constructors run top-down (Base -> Member objects -> Derived); destructors run in exact reverse order.',
      'In public inheritance, public stays public and protected stays protected; private base members stay inaccessible to Derived.',
      'Diamond ambiguity (B : A, C : A, D : B, C) creates two A subobjects unless B and C use virtual public inheritance.',
    ],
    codeExample: `struct Device { int id = 1; };
struct Printer : virtual public Device {};
struct Scanner : virtual public Device {};
struct AllInOne : public Printer, public Scanner {}; // Single shared Device subobject`,
    interviewTrap:
      'Base classes inheriting non-virtual interfaces duplicate shared state in multiple inheritance and trigger ambiguous member lookup.',
  },
  {
    id: 'polymorphism',
    pillar: 'Pillar 4 • Polymorphism',
    title: 'Static vs Dynamic Polymorphism, VTables & Object Slicing',
    readTime: '8 min',
    summary:
      'Compile-time polymorphism resolves via overload resolution & templates (zero runtime overhead), whereas runtime polymorphism dispatches via per-class vtables and an object vptr.',
    keyRules: [
      'Each polymorphic object stores a hidden vptr (8 bytes on 64-bit) pointing to its class vtable of virtual function pointers.',
      'Constructors and destructors NEVER dispatch virtual functions dynamically to further-derived classes (they call the current class level).',
      'Always annotate overridden methods with override so signature mismatches fail at compile time instead of silently hiding.',
    ],
    codeExample: `class Shape {
public:
    virtual int sides() const { return 0; }
    virtual ~Shape() = default;
};
class Triangle : public Shape {
public:
    int sides() const override { return 3; }
};
// Shape s = Triangle(); -> Object SLICING! s.sides() prints 0.
// const Shape& ref = Triangle(); -> ref.sides() prints 3.`,
    interviewTrap:
      'Calling virtual functions inside Base() constructor does NOT reach Derived::override because the Derived subobject has not been constructed yet.',
  },
  {
    id: 'raii',
    pillar: 'Lifecycles & Memory',
    title: 'Constructors, Rule of 0 / 3 / 5 & RAII Smart Pointers',
    readTime: '7 min',
    summary:
      'Resource Acquisition Is Initialization (RAII) binds every resource (heap memory, file descriptors, locks) directly to an object lifetime so cleanup is deterministic and exception-safe.',
    keyRules: [
      'Rule of Three: if a class manages raw resources (custom dtor, copy ctor, or copy assignment), define all three.',
      'Rule of Five: add noexcept move constructor and move assignment to eliminate deep copies for temporaries.',
      'Rule of Zero: compose std::string, std::vector, unique_ptr so compiler-generated special members work automatically.',
    ],
    codeExample: `class Buffer {
    int* data_;
    size_t n_;
public:
    explicit Buffer(size_t n) : data_(new int[n]{}), n_(n) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& o) : data_(new int[o.n_]), n_(o.n_) { copy_n(o.data_, n_, data_); }
    Buffer(Buffer&& o) noexcept : data_(o.data_), n_(o.n_) { o.data_ = nullptr; o.n_ = 0; }
};`,
    interviewTrap:
      'Marking move constructors noexcept is critical—otherwise std::vector falls back to copying instead of moving during reallocation.',
  },
  {
    id: 'operators',
    pillar: 'Operators & Generics',
    title: 'Operator Overloading, Strict Weak Ordering & Functors',
    readTime: '5 min',
    summary:
      'Operator overloading lets domain types participate cleanly in STL containers and algorithms when algebraic and ordering axioms are respected.',
    keyRules: [
      'operator< used in std::sort, std::set, or std::map MUST satisfy strict weak ordering (irreflexive: !(a < a)).',
      'Prefer const member methods for binary operators that do not mutate the left operand.',
      'Function objects (operator()) carry state cleanly and inline better than raw function pointers.',
    ],
    codeExample: `struct Task {
    int priority, id;
    bool operator<(const Task& rhs) const {
        if (priority != rhs.priority) return priority > rhs.priority;
        return id < rhs.id;
    }
};`,
    interviewTrap:
      'Returning <= instead of < inside std::sort comparator violates irreflexivity and can cause out-of-bounds segfaults.',
  },
  {
    id: 'solid',
    pillar: 'Architecture • SOLID',
    title: 'SOLID Principles in Production C++ & System Design',
    readTime: '8 min',
    summary:
      'SOLID keeps growing object-oriented systems testable, modular, and resilient against cascading edits.',
    keyRules: [
      'S (Single Responsibility): separate domain logic, persistence, and formatting into distinct classes.',
      'O (Open/Closed): add new payment rails or discount policies via subclasses rather than editing giant if/else switches.',
      'L (Liskov Substitution): subtypes must honor base preconditions & postconditions (a Square breaking Rectangle setWidth/setHeight fails LSP).',
      'I (Interface Segregation) & D (Dependency Inversion): split fat interfaces and inject small abstractions.',
    ],
    codeExample: `class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void send(const string& msg) = 0;
};
class OrderService {
    Notifier& notifier_; // Depends on abstraction (DIP), not concrete EmailClient
public:
    explicit OrderService(Notifier& n) : notifier_(n) {}
};`,
    interviewTrap:
      'Throwing NotImplementedException inside a subclass override is a classic Liskov Substitution & Interface Segregation violation.',
  },
  {
    id: 'patterns',
    pillar: 'Design Patterns',
    title: 'GoF Behavioral, Creational & Structural Patterns',
    readTime: '7 min',
    summary:
      'Recognize recurring low-level design building blocks tested in LLD rounds (Parking Lot, Rate Limiter, Logging Pipeline, Vending Machine).',
    keyRules: [
      'Strategy swaps algorithms dynamically at runtime behind a common interface.',
      'Observer decouples event publishers from zero-to-many dynamically subscribed listeners.',
      'Command reifies operations as objects so execute()/undo() history stacks work cleanly.',
      'Thread-safe Meyers Singleton uses static local initialization guaranteed atomic since C++11.',
    ],
    codeExample: `class Registry {
    Registry() = default;
public:
    static Registry& instance() {
        static Registry singleton; // Thread-safe since C++11
        return singleton;
    }
    Registry(const Registry&) = delete;
    void operator=(const Registry&) = delete;
};`,
    interviewTrap:
      'Overusing Singleton hides dependencies and harms unit testing—prefer explicit dependency injection unless true process-wide uniqueness is required.',
  },
];

const STATIC_OOP_MCQS: OopMcqItem[] = [
  {
    id: 'oop-s1',
    subtopic: 'Polymorphism & VTables',
    difficulty: 'Medium',
    askedIn: 'Microsoft • Amazon • Qualcomm',
    question: 'Why must a C++ base class with virtual methods define a virtual destructor?',
    options: [
      'So deleting a derived object through a Base* invokes ~Derived() before ~Base()',
      'So the compiler allows creating stack objects of the base class',
      'To force derived classes to allocate on the heap instead of stack',
      'Because virtual destructors eliminate the vptr pointer overhead',
    ],
    correctIndex: 0,
    explanation: 'Without a virtual destructor, `delete basePtr;` calls only ~Base() (static binding), causing Undefined Behavior and leaking derived resources.',
    shortcutTip: 'Any class meant to be inherited polymorphically needs `virtual ~ClassName() = default;`.',
  },
  {
    id: 'oop-s2',
    subtopic: 'Object Slicing & Binding',
    difficulty: 'Medium',
    askedIn: 'Google • Adobe',
    question: 'What happens when a Derived object is passed by value to a function taking `void render(Base b)`?',
    options: [
      'Object slicing strips derived members and resets b’s vptr to Base',
      'Virtual dispatch still invokes Derived::draw() dynamically',
      'Compilation fails unless Base is a struct',
      'Move semantics automatically preserve Derived fields inside b',
    ],
    correctIndex: 0,
    explanation: 'Copying Derived into a Base value creates a pure Base object—extra Derived members are sliced off and Base’s vtable is bound.',
    shortcutTip: 'Pass polymorphic types as `const Base&` or `Base*` / `unique_ptr<Base>` to preserve dynamic dispatch.',
  },
  {
    id: 'oop-s3',
    subtopic: 'Constructors & Virtual Calls',
    difficulty: 'Hard',
    askedIn: 'Goldman Sachs • Bloomberg',
    question: 'If Base() calls a virtual function log() overridden in Derived, which implementation executes while constructing a Derived object?',
    options: [
      'Base::log(), because Derived is not yet constructed during Base()',
      'Derived::log() via late vtable binding',
      'Compile error: virtual calls are banned in constructors',
      'Both Base::log() and Derived::log() in sequence',
    ],
    correctIndex: 0,
    explanation: 'During Base construction, the dynamic type of *this is Base. Calling Derived::log() would access uninitialized Derived members.',
    shortcutTip: 'Never rely on polymorphic virtual dispatch inside constructors or destructors.',
  },
  {
    id: 'oop-s4',
    subtopic: 'Inheritance & Diamond Problem',
    difficulty: 'Medium',
    askedIn: 'TCS Digital • Infosys • Oracle',
    question: 'How does C++ resolve duplicate base subobjects in the diamond inheritance pattern (D inherits from B and C, both inheriting A)?',
    options: [
      'Declare B and C as inheriting A with `virtual` (`class B : virtual public A`)',
      'Make every method in class A static',
      'Use `private` inheritance for both B and C',
      'Mark class A with the `final` specifier',
    ],
    correctIndex: 0,
    explanation: 'Virtual inheritance shares a single common A subobject inside D, eliminating ambiguous member access.',
    shortcutTip: 'Virtual base classes are initialized directly by the most-derived constructor (D).',
  },
  {
    id: 'oop-s5',
    subtopic: 'Encapsulation & Access Control',
    difficulty: 'Easy',
    askedIn: 'Wipro • Cognizant • Zoho',
    question: 'What is the ONLY semantic difference between `class` and `struct` in C++?',
    options: [
      'Default member and base-class access is `private` for class vs `public` for struct',
      'Structs cannot declare virtual methods or destructors',
      'Structs are always allocated on stack while classes allocate on heap',
      'Classes support inheritance while structs do not',
    ],
    correctIndex: 0,
    explanation: 'In C++, both struct and class support inheritance, constructors, templates, and virtual functions; only default access visibility differs.',
    shortcutTip: 'Class defaults to private; struct defaults to public.',
  },
  {
    id: 'oop-s6',
    subtopic: 'Abstraction & Pure Virtuals',
    difficulty: 'Easy',
    askedIn: 'Amazon • Flipkart',
    question: 'Which statement makes a C++ class abstract so it cannot be directly instantiated?',
    options: [
      'Declaring at least one pure virtual member function (`= 0`)',
      'Making all data members private',
      'Marking the class constructor explicit',
      'Inheriting from two concrete classes',
    ],
    correctIndex: 0,
    explanation: 'At least one un-implemented pure virtual function (`virtual void run() = 0;`) turns the class into an abstract interface.',
    shortcutTip: 'Pure virtual (`= 0`) -> abstract class; final subclass must override all of them to instantiate.',
  },
  {
    id: 'oop-s7',
    subtopic: 'SOLID Principles',
    difficulty: 'Medium',
    askedIn: 'Atlassian • Uber • Razorpay',
    question: 'A `Bird` base class defines `fly()`, forcing `Penguin : public Bird` to throw `UnsupportedOperationException`. Which SOLID principle is violated?',
    options: [
      'Liskov Substitution Principle (LSP)',
      'Single Responsibility Principle (SRP)',
      'Singleton Creational Principle',
      'Operator Precedence Principle',
    ],
    correctIndex: 0,
    explanation: 'LSP requires every subclass to be safely substitutable for its base class without breaking behavioral contracts.',
    shortcutTip: 'Split FlyingBird interface from general Bird instead of throwing in overrides.',
  },
  {
    id: 'oop-s8',
    subtopic: 'SOLID Principles',
    difficulty: 'Easy',
    askedIn: 'Paytm • Swiggy',
    question: 'Adding a new discount tier by creating a subclass implementing `IDiscountPolicy` instead of editing a switch statement follows which principle?',
    options: [
      'Open/Closed Principle (OCP)',
      'Interface Multiplication Principle',
      'Static Binding Principle',
      'Rule of Three',
    ],
    correctIndex: 0,
    explanation: 'Software entities should be open for extension (new strategy subclass) and closed for modification (existing tested dispatcher untouched).',
    shortcutTip: 'Polymorphic extensions beat growing `if/else` or `switch` chains.',
  },
  {
    id: 'oop-s9',
    subtopic: 'RAII & Smart Pointers',
    difficulty: 'Medium',
    askedIn: 'Nvidia • Cisco • Arista',
    question: 'Which C++ smart pointer breaks reference cycles between parent and child nodes in an object graph?',
    options: [
      'std::weak_ptr',
      'std::unique_ptr',
      'std::auto_ptr',
      'std::raw_ptr',
    ],
    correctIndex: 0,
    explanation: 'Two `shared_ptr`s pointing at each other keep refcount >= 1 forever (memory leak). Making back-edges `weak_ptr` does not increment strong refcount.',
    shortcutTip: 'Cycle with shared_ptr -> break back-reference with `weak_ptr`.',
  },
  {
    id: 'oop-s10',
    subtopic: 'RAII & Move Semantics',
    difficulty: 'Hard',
    askedIn: 'Citadel • Tower Research • Google',
    question: 'Why should user-defined move constructors and move assignment operators be marked `noexcept`?',
    options: [
      'So containers like std::vector move elements instead of copying them during reallocation',
      'Because C++ forbids throwing exceptions in constructors',
      'To turn heap pointers into stack arrays',
      'Because move constructors cannot take rvalue references otherwise',
    ],
    correctIndex: 0,
    explanation: 'To maintain std::vector’s strong exception guarantee during resize, push_back only invokes move if move constructor is noexcept (otherwise it falls back to copying).',
    shortcutTip: 'Move operations = noexcept unless impossible.',
  },
  {
    id: 'oop-s11',
    subtopic: 'Design Patterns',
    difficulty: 'Medium',
    askedIn: 'Flipkart • PhonePe • Walmart',
    question: 'Which design pattern best fits supporting multi-level Undo/Redo inside a text editor or calculator?',
    options: [
      'Command Pattern',
      'Flyweight Pattern',
      'Adapter Pattern',
      'Singleton Pattern',
    ],
    correctIndex: 0,
    explanation: 'Command encapsulates each action with execute() and undo() methods inside an object that can be pushed onto history stacks.',
    shortcutTip: 'Action history / undo / queuing -> Command pattern.',
  },
  {
    id: 'oop-s12',
    subtopic: 'Design Patterns',
    difficulty: 'Easy',
    askedIn: 'SAP • Oracle',
    question: 'When multiple UI widgets and loggers must react automatically whenever a Model state updates, which pattern applies?',
    options: [
      'Observer Pattern',
      'Builder Pattern',
      'Bridge Pattern',
      'Prototype Pattern',
    ],
    correctIndex: 0,
    explanation: 'Observer defines a one-to-many dependency so all registered listeners are notified cleanly without tight coupling.',
    shortcutTip: 'Pub/Sub or event listeners = Observer Pattern.',
  },
  {
    id: 'oop-s13',
    subtopic: 'Overloading vs Overriding',
    difficulty: 'Easy',
    askedIn: 'Accenture • Capgemini',
    question: 'Which statement accurately contrasts method overloading and method overriding?',
    options: [
      'Overloading varies parameter signature at compile time; overriding redefines a virtual base signature at runtime',
      'Overloading requires virtual keyword; overriding forbids virtual keyword',
      'Overloading differs only by return type in the same class',
      'Overriding works only on static member functions',
    ],
    correctIndex: 0,
    explanation: 'Overloading is compile-time ad-hoc polymorphism within a scope; overriding is runtime subtype polymorphism across Base/Derived.',
    shortcutTip: 'Same name + different params = overload; identical virtual signature in subclass = override.',
  },
  {
    id: 'oop-s14',
    subtopic: 'Static & Friend',
    difficulty: 'Medium',
    askedIn: 'Cisco • Morgan Stanley',
    question: 'Why cannot a `static` member function in C++ be declared `const` or `virtual`?',
    options: [
      'It has no implicit `this` pointer bound to an object instance or vptr',
      'Static functions are compiled only inside header files',
      'Static functions cannot access private static variables',
      'C++ reserves virtual strictly for friend functions',
    ],
    correctIndex: 0,
    explanation: 'Both `const` qualification and virtual vtable dispatch rely on an instance `this` pointer, which static class methods lack.',
    shortcutTip: 'No `this` pointer -> cannot be const or virtual.',
  },
  {
    id: 'oop-s15',
    subtopic: 'Copy Semantics',
    difficulty: 'Medium',
    askedIn: 'DE Shaw • Samsung',
    question: 'Why MUST the parameter of a copy constructor be a reference (`const T&`), not passed by value (`T`)?',
    options: [
      'Passing by value would invoke the copy constructor infinitely to copy the argument itself',
      'C++ disallow passing structs to any constructor by value',
      'Reference parameters automatically convert deep pointers into weak pointers',
      'Because compilers optimize away reference parameters completely',
    ],
    correctIndex: 0,
    explanation: 'Copy-by-value creates a temporary parameter using the copy constructor, causing infinite compile-time recursion.',
    shortcutTip: 'Copy ctor signature: `ClassName(const ClassName& other)`.',
  },
  {
    id: 'oop-s16',
    subtopic: 'Design Patterns',
    difficulty: 'Medium',
    askedIn: 'Atlassian • Intuit',
    question: 'Which pattern attaches dynamic behaviors (compression, encryption, buffering) onto an InputStream without creating combinatorial subclasses?',
    options: [
      'Decorator Pattern',
      'Singleton Pattern',
      'Abstract Factory',
      'Mediator Pattern',
    ],
    correctIndex: 0,
    explanation: 'Decorator wraps components implementing the same interface, stacking responsibilities dynamically at runtime.',
    shortcutTip: 'Wrappers stacking orthogonal features at runtime = Decorator.',
  },
  {
    id: 'oop-s17',
    subtopic: 'Constructors & Init Lists',
    difficulty: 'Medium',
    askedIn: 'ServiceNow • VMWare',
    question: 'Which class members MUST be initialized in a C++ constructor member-initializer list rather than assigned inside the constructor body?',
    options: [
      'const members, reference members (T&), and subobjects without default constructors',
      'All public primitive ints and doubles',
      'Only static constexpr constants',
      'Virtual methods and pure virtual tables',
    ],
    correctIndex: 0,
    explanation: 'References and const members cannot be reassigned after creation; they must be bound during initialization.',
    shortcutTip: 'Const, reference (&), and non-default member objects require `: member(arg)` init lists.',
  },
  {
    id: 'oop-s18',
    subtopic: 'Order of Construction',
    difficulty: 'Medium',
    askedIn: 'Nvidia • Intel',
    question: 'In what order are class member fields initialized by a C++ constructor initializer list?',
    options: [
      'Order of declaration inside the class definition (NOT the order written in the initializer list)',
      'Exact left-to-right order written in the constructor initializer list',
      'Alphabetical order by member identifier',
      'Derived members first, then base subobjects',
    ],
    correctIndex: 0,
    explanation: 'C++ initializes non-static data members strictly in the order they appear in the class body so destruction occurs in exact reverse.',
    shortcutTip: 'Match initializer list order to declaration order (`-Wreorder` warns if mismatched).',
  },
  {
    id: 'oop-s19',
    subtopic: 'Design Patterns',
    difficulty: 'Easy',
    askedIn: 'Zomato • Meesho',
    question: 'You need to build a complex `HttpRequest` with 12 optional headers/timeouts cleanly without telescoping constructors. Which pattern fits best?',
    options: [
      'Builder Pattern',
      'Prototype Pattern',
      'Iterator Pattern',
      'Proxy Pattern',
    ],
    correctIndex: 0,
    explanation: 'Builder provides a fluent step-by-step configuration interface ending in `.build()`, avoiding hard-to-read multi-parameter constructors.',
    shortcutTip: 'Many optional constructor parameters -> Builder Pattern.',
  },
  {
    id: 'oop-s20',
    subtopic: 'C++ Keywords',
    difficulty: 'Easy',
    askedIn: 'TCS • Deloitte',
    question: 'What does marking a single-argument constructor `explicit` prevent in C++?',
    options: [
      'Unintended implicit type conversions from argument type to class type',
      'Heap allocation with new',
      'Subclass inheritance',
      'Copy construction from const references',
    ],
    correctIndex: 0,
    explanation: '`explicit Vector(int size)` prevents silent conversions like `fn(5)` from implicitly constructing a temporary `Vector(5)`.',
    shortcutTip: 'Default to `explicit` on 1-arg constructors unless implicit conversion is intentional.',
  },
];

let mcqNonce = 0;
function nextOopId(prefix: string): string {
  mcqNonce++;
  return `${prefix}-${mcqNonce}-${Math.floor(Math.random() * 10000)}`;
}

function buildGeneratedOptions(correct: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const unique = Array.from(new Set([correct, ...distractors])).slice(0, 4);
  const copy = [...unique];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { options: copy, correctIndex: copy.indexOf(correct) };
}

function genVtableOutputMcq(): OopMcqItem {
  const baseVal = [2, 3, 5, 7][Math.floor(Math.random() * 4)];
  const mult = [4, 6, 8, 9][Math.floor(Math.random() * 4)];
  const add = [1, 3, 5][Math.floor(Math.random() * 3)];
  const isVirtual = Math.random() > 0.35;
  const isSliced = !isVirtual ? false : Math.random() > 0.65;

  let ans: number;
  let why: string;
  if (isSliced) {
    ans = baseVal + add;
    why = `Calling by value (` + '`void run(Base b)`' + `) slices the Derived object back to Base, so Base::eval() runs: ${baseVal} + ${add} = ${ans}.`;
  } else if (isVirtual) {
    ans = baseVal * mult;
    why = '`Base::eval` is `virtual` and passed via reference (`Base&`), so dynamic dispatch runs Derived::eval(): ' + `${baseVal} * ${mult} = ${ans}.`;
  } else {
    ans = baseVal + add;
    why = '`Base::eval` is NOT `virtual`, so static binding calls `Base::eval` despite holding a Derived reference: ' + `${baseVal} + ${add} = ${ans}.`;
  }

  const wrong1 = baseVal * mult;
  const wrong2 = baseVal + add;
  const wrong3 = baseVal * mult + add;
  const pool = [wrong1, wrong2, wrong3, baseVal + mult, 0].filter((x) => x !== ans).map(String);
  const { options, correctIndex } = buildGeneratedOptions(String(ans), pool);

  const sigParam = isSliced ? 'Base b' : 'Base& b';
  const qual = isVirtual ? 'virtual ' : '';
  const ov = isVirtual ? ' override' : '';

  return {
    id: nextOopId('oop-vt'),
    subtopic: 'Polymorphism & Binding Trace',
    difficulty: isSliced ? 'Hard' : 'Medium',
    askedIn: 'Microsoft • Amazon • Cisco',
    question: `What integer does this C++17 snippet print?\n\n\`\`\`cpp\nstruct Base {\n    ${qual}int eval(int x) const { return x + ${add}; }\n};\nstruct Derived : Base {\n    int eval(int x) const${ov} { return x * ${mult}; }\n};\nint invoke(${sigParam}) { return b.eval(${baseVal}); }\n// Call: Derived d; cout << invoke(d);\n\`\`\``,
    options,
    correctIndex,
    explanation: why,
    shortcutTip: 'Check TWO conditions for runtime polymorphism: (1) virtual in base AND (2) pointer/reference (not by-value slicing).',
  };
}

function genLifecycleTraceMcq(): OopMcqItem {
  const ctorVal = [1, 2, 3, 5][Math.floor(Math.random() * 4)];
  const derivedVal = [10, 20, 30, 40][Math.floor(Math.random() * 4)];
  const opKind = Math.floor(Math.random() * 3);

  if (opKind === 0) {
    const ans = `Base(${ctorVal}) -> Derived(${derivedVal}) -> ~Derived -> ~Base`;
    const { options, correctIndex } = buildGeneratedOptions(ans, [
      `Derived(${derivedVal}) -> Base(${ctorVal}) -> ~Derived -> ~Base`,
      `Base(${ctorVal}) -> Derived(${derivedVal}) -> ~Base -> ~Derived`,
      `Derived(${derivedVal}) -> Base(${ctorVal}) -> ~Base -> ~Derived`,
    ]);
    return {
      id: nextOopId('oop-lc'),
      subtopic: 'Constructor & Destructor Order',
      difficulty: 'Easy',
      askedIn: 'TCS • Infosys • Qualcomm',
      question: `In C++, when \`Derived obj(${derivedVal})\` inherits \`public Base\` (whose constructor logs \`Base(${ctorVal})\`) enters and exits a local block scope, in what exact order do logs execute?`,
      options,
      correctIndex,
      explanation: 'Construction runs top-down (Base before Derived), and stack unwinding/destruction reverses cleanly (Derived before Base).',
      shortcutTip: 'Construct Top-Down (Base -> Derived); Destruct Bottom-Up (~Derived -> ~Base).',
    };
  }

  if (opKind === 1) {
    const k = [100, 200, 300][Math.floor(Math.random() * 3)];
    const ans = String(k + 5);
    const { options, correctIndex } = buildGeneratedOptions(ans, [
      String(k),
      String(k + 10),
      'Compile Error',
    ]);
    return {
      id: nextOopId('oop-ref'),
      subtopic: 'Shared Ownership & RefCount',
      difficulty: 'Medium',
      askedIn: 'Google • Morgan Stanley',
      question: `Given \`shared_ptr<int> p1 = make_shared<int>(${k}); shared_ptr<int> p2 = p1; *p2 += 5;\`, what is \`*p1\` after p2 goes out of scope (assuming p1 stays alive)?`,
      options,
      correctIndex,
      explanation: 'p1 and p2 share ownership of the same heap integer (use_count reaches 2, then drops to 1 when p2 exits). Mutating *p2 mutates the shared int.',
      shortcutTip: 'shared_ptr shares one control block and pointee until the LAST strong owner is destroyed.',
    };
  }

  const x0 = [3, 5, 7][Math.floor(Math.random() * 3)];
  const delta = [4, 6, 8][Math.floor(Math.random() * 3)];
  const ans = `${x0}, ${x0 + delta}`;
  const { options, correctIndex } = buildGeneratedOptions(ans, [
    `${x0 + delta}, ${x0 + delta}`,
    `${x0}, ${x0}`,
    `0, ${delta}`,
  ]);
  return {
    id: nextOopId('oop-dc'),
    subtopic: 'Deep vs Shallow Copy',
    difficulty: 'Medium',
    askedIn: 'Adobe • Samsung',
    question: `A custom class \`Box\` implements a proper deep-copy constructor. If \`Box a(${x0}); Box b = a; b.add(${delta});\`, what do \`a.val()\` and \`b.val()\` print?`,
    options,
    correctIndex,
    explanation: 'Deep copy allocates independent internal state for `b`, so mutating `b` never corrupts `a`.',
    shortcutTip: 'Deep copy clones owned heap buffers; shallow copy aliases pointers (danger of double-free).',
  };
}

function genSolidPatternMcq(): OopMcqItem {
  const scenarios: Array<{
    sub: string;
    diff: 'Easy' | 'Medium' | 'Hard';
    q: string;
    ans: string;
    wrongs: string[];
    exp: string;
    tip: string;
  }> = [
    {
      sub: 'Interface Segregation (ISP)',
      diff: 'Easy',
      q: 'Splitting a monolithic `IMachine` interface (`print()`, `scan()`, `fax()`) into `IPrinter`, `IScanner`, `IFax` so simple printers are not forced to stub `fax()` applies:',
      ans: 'Interface Segregation Principle (ISP)',
      wrongs: ['Rule of Five', 'Dependency Amplification', 'Flyweight Sharing'],
      exp: 'ISP states clients should not be forced to depend upon interfaces they do not use.',
      tip: 'Many small role-focused interfaces > one fat interface.',
    },
    {
      sub: 'Dependency Inversion (DIP)',
      diff: 'Medium',
      q: 'Instead of `ReportService` instantiating `new MySqlRepository()` inside its constructor, it accepts `IRepository&` via constructor parameter. What architecture benefit is gained?',
      ans: 'Dependency Inversion & unit testability with mock repositories',
      wrongs: ['Eliminates all heap allocations across the process', 'Converts runtime polymorphism into macro expansion', 'Enforces multiple diamond inheritance'],
      exp: 'High-level business logic depends on the `IRepository` abstraction rather than low-level concrete DB drivers.',
      tip: 'Inject interfaces (`IRepo&` / `unique_ptr<IRepo>`) rather than hardcoding concrete dependencies.',
    },
    {
      sub: 'Strategy Pattern',
      diff: 'Easy',
      q: 'A shipping module switches between `AirFreightRate`, `SeaFreightRate`, and `DroneExpressRate` at runtime cleanly. Which pattern is this?',
      ans: 'Strategy Pattern',
      wrongs: ['Singleton Pattern', 'Composite Pattern', 'Memento Pattern'],
      exp: 'Strategy encapsulates interchangeable algorithms behind a common interface and delegates execution cleanly.',
      tip: 'Interchangeable runtime algorithms -> Strategy.',
    },
    {
      sub: 'State Pattern',
      diff: 'Medium',
      q: 'A vending machine behaves differently on `insertCoin()` and `dispense()` depending on whether it is in `Idle`, `HasMoney`, or `SoldOut`. Which pattern eliminates nested state flags?',
      ans: 'State Pattern',
      wrongs: ['Prototype Pattern', 'Flyweight Pattern', 'Visitor Pattern'],
      exp: 'State delegates state-specific transitions and handlers into dedicated state classes implementing an IState interface.',
      tip: 'Behavior & transitions change by lifecycle phase -> State Pattern.',
    },
    {
      sub: 'Factory Method',
      diff: 'Easy',
      q: 'You hide concrete database driver creation (`PostgresConn` vs `SqliteConn`) behind `DriverFactory::create(config)`. Which creational pattern is this?',
      ans: 'Factory Pattern',
      wrongs: ['Observer Pattern', 'Iterator Pattern', 'Decorator Pattern'],
      exp: 'Factory centralizes instantiation logic behind an interface so callers remain decoupled from concrete constructors.',
      tip: 'Centralized polymorphic creation by config/key -> Factory.',
    },
    {
      sub: 'Adapter Pattern',
      diff: 'Medium',
      q: 'Your app expects `JsonAnalytics::track(json)`, but a third-party vendor library only provides `LegacyXmlSink::pushXml(xml)`. Which wrapper bridges them without editing vendor code?',
      ans: 'Adapter Pattern',
      wrongs: ['Builder Pattern', 'Singleton Pattern', 'Mediator Pattern'],
      exp: 'Adapter converts one incompatible interface into another interface expected by client code.',
      tip: 'Incompatible interface translation wrapper = Adapter.',
    },
  ];
  const pick = scenarios[Math.floor(Math.random() * scenarios.length)];
  const { options, correctIndex } = buildGeneratedOptions(pick.ans, pick.wrongs);
  return {
    id: nextOopId('oop-sd'),
    subtopic: pick.sub,
    difficulty: pick.diff,
    askedIn: 'Uber • Atlassian • Flipkart',
    question: pick.q,
    options,
    correctIndex,
    explanation: pick.exp,
    shortcutTip: pick.tip,
  };
}

export function generateOopMcq(): OopMcqItem {
  const r = Math.random();
  if (r < 0.45) {
    return { ...STATIC_OOP_MCQS[Math.floor(Math.random() * STATIC_OOP_MCQS.length)], id: nextOopId('oop-c') };
  }
  if (r < 0.7) {
    return genVtableOutputMcq();
  }
  if (r < 0.85) {
    return genLifecycleTraceMcq();
  }
  return genSolidPatternMcq();
}

export function generateOopMcqBatch(count = 20): OopMcqItem[] {
  const results: OopMcqItem[] = [];
  const usedQuestions = new Set<string>();
  let guard = 0;
  while (results.length < count && guard < count * 5) {
    guard++;
    const item =
      results.length < STATIC_OOP_MCQS.length
        ? { ...STATIC_OOP_MCQS[results.length], id: nextOopId('oop-s') }
        : generateOopMcq();
    if (!usedQuestions.has(item.question)) {
      usedQuestions.add(item.question);
      results.push(item);
    }
  }
  return results;
}
