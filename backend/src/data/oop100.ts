import { ProblemDefinition, TestCase } from '../judge/types';

interface OopTemplateResult {
  topic: string;
  pattern: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;
  statement: string;
  constraints: string;
  functionSignature: string;
  paramTypes: string[];
  returnType: string;
  defaultCodeStub: string;
  solutionCode: string;
  complexity: string;
  cases: Array<{ input: string; expectedOutput: string; explanation?: string }>;
}

const OOP_SOLUTIONS = new Map<number, { complexity: string; code: string }>();
const OOP_PROBLEMS_INTERNAL: ProblemDefinition[] = [];

function makeSlug(id: number, title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `oop-${id}-${base}`;
}

function buildEncapsulationProblem(idx: number): OopTemplateResult {
  const domains = [
    { name: 'BankAccount', unit: 'balance', opInc: 'deposit', opDec: 'withdraw', init: 100, cap: 5000, diff: 'Easy' as const, fee: 0 },
    { name: 'BatteryCell', unit: 'charge percentage', opInc: 'charge', opDec: 'drain', init: 50, cap: 100, diff: 'Easy' as const, fee: 0 },
    { name: 'ThermostatUnit', unit: 'target temperature', opInc: 'heat', opDec: 'cool', init: 22, cap: 35, diff: 'Easy' as const, fee: 0 },
    { name: 'WarehouseSlot', unit: 'stock count', opInc: 'restock', opDec: 'ship', init: 25, cap: 200, diff: 'Easy' as const, fee: 0 },
    { name: 'PrepaidWallet', unit: 'wallet cents', opInc: 'topup', opDec: 'spend', init: 200, cap: 10000, diff: 'Medium' as const, fee: 5 },
    { name: 'FuelTank', unit: 'fuel liters', opInc: 'refuel', opDec: 'consume', init: 15, cap: 65, diff: 'Easy' as const, fee: 0 },
    { name: 'RateQuota', unit: 'available credits', opInc: 'grant', opDec: 'use', init: 10, cap: 120, diff: 'Medium' as const, fee: 1 },
    { name: 'ElevatorLoad', unit: 'cabin load kg', opInc: 'board', opDec: 'exit', init: 0, cap: 800, diff: 'Easy' as const, fee: 0 },
    { name: 'WaterReservoir', unit: 'water volume', opInc: 'pumpIn', opDec: 'release', init: 500, cap: 2500, diff: 'Medium' as const, fee: 10 },
    { name: 'EscrowVault', unit: 'held funds', opInc: 'fund', opDec: 'payout', init: 1000, cap: 50000, diff: 'Medium' as const, fee: 15 },
    { name: 'ServerConnectionCap', unit: 'active sockets', opInc: 'open', opDec: 'close', init: 4, cap: 64, diff: 'Easy' as const, fee: 0 },
    { name: 'PrinterTray', unit: 'sheet count', opInc: 'load', opDec: 'print', init: 40, cap: 250, diff: 'Easy' as const, fee: 0 },
    { name: 'AuctionBidBook', unit: 'escrow bid', opInc: 'add', opDec: 'withdraw', init: 300, cap: 15000, diff: 'Medium' as const, fee: 20 },
    { name: 'SmartDimmer', unit: 'brightness', opInc: 'brighten', opDec: 'dim', init: 60, cap: 100, diff: 'Easy' as const, fee: 0 },
    { name: 'AudioMixerGain', unit: 'gain level', opInc: 'boost', opDec: 'attenuate', init: 30, cap: 90, diff: 'Medium' as const, fee: 2 },
    { name: 'CacheMemoryQuota', unit: 'allocated MB', opInc: 'alloc', opDec: 'free', init: 128, cap: 1024, diff: 'Medium' as const, fee: 4 },
    { name: 'TokenBucketCell', unit: 'tokens', opInc: 'refill', opDec: 'consume', init: 20, cap: 80, diff: 'Hard' as const, fee: 1 },
    { name: 'LockerCapacity', unit: 'reserved parcels', opInc: 'store', opDec: 'pickup', init: 5, cap: 45, diff: 'Easy' as const, fee: 0 },
    { name: 'CloudComputeCredits', unit: 'credits', opInc: 'purchase', opDec: 'burn', init: 500, cap: 4000, diff: 'Hard' as const, fee: 25 },
    { name: 'SavingsPot', unit: 'savings', opInc: 'save', opDec: 'take', init: 150, cap: 3000, diff: 'Medium' as const, fee: 3 },
  ];
  const d = domains[idx];
  const minVal = 0;

  const evaluate = (ops: string[], vals: number[]): number[] => {
    let value = d.init;
    const out: number[] = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const v = vals[i] ?? 0;
      if (op === d.opInc) {
        if (v > 0) value = Math.min(d.cap, value + v);
      } else if (op === d.opDec) {
        const total = v + d.fee;
        if (v > 0 && value - total >= minVal) {
          value -= total;
        }
      } else if (op === 'query') {
        out.push(value);
      }
    }
    return out;
  };

  const seeds: Array<[string[], number[]]> = [
    [[d.opInc, d.opDec, 'query'], [30, 10, 0]],
    [[d.opDec, 'query', d.opInc, 'query'], [d.init + 500, 0, d.cap * 2, 0]],
    [[d.opInc, 'query', d.opDec, 'query'], [-20, 0, -5, 0]],
    [[d.opInc, d.opDec, d.opDec, 'query'], [25, 12, 15, 0]],
    [['query', d.opInc, d.opDec, 'query'], [0, 40, 20, 0]],
    [[d.opInc, d.opInc, d.opDec, 'query'], [d.cap, d.cap, 30, 0]],
    [[d.opDec, d.opInc, d.opDec, 'query'], [5, 18, 9, 0]],
    [[d.opInc, d.opDec, 'query', d.opInc, 'query'], [60, 45, 0, 10, 0]],
    [[d.opDec, d.opDec, d.opDec, 'query'], [10, 20, 30, 0]],
    [['query', d.opInc, d.opInc, d.opDec, 'query'], [0, 11, 29, 7, 0]],
  ];

  const cases = seeds.map(([ops, vals], i) => {
    const res = evaluate(ops, vals);
    return {
      input: `${JSON.stringify(ops)} | ${JSON.stringify(vals)}`,
      expectedOutput: JSON.stringify(res),
      explanation: i === 0 ? `Starts at ${d.init}, enforces cap=${d.cap} and withdrawal fee=${d.fee}.` : undefined,
    };
  });

  const feeNote = d.fee > 0 ? ` Each valid \`${d.opDec}(x)\` also deducts a fixed handling fee of \`${d.fee}\`, so the operation only commits if \`${d.unit} - (x + ${d.fee}) >= 0\`.` : '';
  const clsName = d.name;

  const defaultCodeStub = `class ${clsName} {
private:
    int value_;
    const int cap_;
public:
    explicit ${clsName}(int initial = ${d.init}, int cap = ${d.cap})
        : value_(min(cap, max(0, initial))), cap_(cap) {}

    void ${d.opInc}(int amount) {
        // Enforce positive amount and clamp at cap_
    }

    bool ${d.opDec}(int amount) {
        // Validate amount > 0, check invariant (including fee=${d.fee}), and update value_
        return false;
    }

    int getValue() const {
        return value_;
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        ${clsName} obj;
        vector<int> result;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "${d.opInc}") obj.${d.opInc}(vals[i]);
            else if (ops[i] == "${d.opDec}") obj.${d.opDec}(vals[i]);
            else if (ops[i] == "query") result.push_back(obj.getValue());
        }
        return result;
    }
};`;

  const solutionCode = `class ${clsName} {
private:
    int value_;
    const int cap_;
    static constexpr int kFee = ${d.fee};
public:
    explicit ${clsName}(int initial = ${d.init}, int cap = ${d.cap})
        : value_(min(cap, max(0, initial))), cap_(cap) {}

    void ${d.opInc}(int amount) {
        if (amount <= 0) return;
        value_ = min(cap_, value_ + amount);
    }

    bool ${d.opDec}(int amount) {
        if (amount <= 0) return false;
        long long total = static_cast<long long>(amount) + kFee;
        if (total > value_) return false;
        value_ -= static_cast<int>(total);
        return true;
    }

    int getValue() const {
        return value_;
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        ${clsName} obj;
        vector<int> result;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "${d.opInc}") {
                obj.${d.opInc}(vals[i]);
            } else if (ops[i] == "${d.opDec}") {
                obj.${d.opDec}(vals[i]);
            } else if (ops[i] == "query") {
                result.push_back(obj.getValue());
            }
        }
        return result;
    }
};`;

  return {
    topic: 'Encapsulation & Class Invariants',
    pattern: 'Private State + Guarded Mutators',
    difficulty: d.diff,
    title: `Encapsulated ${d.name} State Controller`,
    statement: `Design an encapsulated C++ class \`${clsName}\` managing a private \`${d.unit}\` initialized to \`${d.init}\` with a strict invariant \`0 <= value <= ${d.cap}\`.\n\nImplement:\n- \`${d.opInc}(x)\`: Ignores non-positive amounts (\`x <= 0\`), otherwise adds \`x\` clamped to \`${d.cap}\`.\n- \`${d.opDec}(x)\`: Ignores \`x <= 0\`; deducts only if state stays non-negative (atomic rollback on failure).${feeNote}\n- \`getValue() const\`: Returns the protected state on every \`"query"\` command.`,
    constraints: `1 <= ops.size() <= 500\nops[i] in {"${d.opInc}", "${d.opDec}", "query"}\nAll mutators must protect private state without exposing mutable references.`,
    functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& vals)',
    paramTypes: ['vector<string>', 'vector<int>'],
    returnType: 'vector<int>',
    defaultCodeStub,
    solutionCode,
    complexity: 'Time: O(N) | Space: O(1) auxiliary',
    cases,
  };
}

function buildConstructorRaiiProblem(idx: number): OopTemplateResult {
  const configs = [
    { name: 'ScopedCounterGuard', baseWeight: 1, copyPenalty: 2, diff: 'Easy' as const, focus: 'RAII Scope Tracking' },
    { name: 'DeepArrayWrapper', baseWeight: 3, copyPenalty: 1, diff: 'Medium' as const, focus: 'Rule of Three Copy Semantics' },
    { name: 'SessionLeasePool', baseWeight: 2, copyPenalty: 3, diff: 'Medium' as const, focus: 'Move vs Copy Ownership' },
    { name: 'MatrixBufferHandle', baseWeight: 4, copyPenalty: 2, diff: 'Medium' as const, focus: 'Deep Copy Isolation' },
    { name: 'ImmutableConfigSpec', baseWeight: 5, copyPenalty: 0, diff: 'Easy' as const, focus: 'Const Member Init Lists' },
    { name: 'ReferenceCountedBlob', baseWeight: 2, copyPenalty: 1, diff: 'Hard' as const, focus: 'Shared RefCount Lifecycle' },
    { name: 'TransactionRollbackGuard', baseWeight: 10, copyPenalty: 0, diff: 'Medium' as const, focus: 'Commit or Auto-Rollback' },
    { name: 'SocketLeaseTracker', baseWeight: 3, copyPenalty: 4, diff: 'Hard' as const, focus: 'Unique Handle Transfer' },
    { name: 'ArenaBlockAllocator', baseWeight: 8, copyPenalty: 2, diff: 'Hard' as const, focus: 'Destructor Cleanup Order' },
    { name: 'BuilderPipelineSpec', baseWeight: 1, copyPenalty: 0, diff: 'Easy' as const, focus: 'Fluent Constructor Builder' },
    { name: 'HistogramSnapshot', baseWeight: 2, copyPenalty: 2, diff: 'Medium' as const, focus: 'Copy Constructor Cloning' },
    { name: 'MutexLockMonitor', baseWeight: 1, copyPenalty: 5, diff: 'Medium' as const, focus: 'Scoped Lock Balance' },
    { name: 'BoundedRingBuffer', baseWeight: 4, copyPenalty: 1, diff: 'Medium' as const, focus: 'Constructor Invariant Check' },
    { name: 'DeferredCleanupStack', baseWeight: 2, copyPenalty: 1, diff: 'Hard' as const, focus: 'LIFO Destruction Order' },
    { name: 'ObjectLifecycleAudit', baseWeight: 1, copyPenalty: 3, diff: 'Easy' as const, focus: 'Ctor/Dtor Counter Parity' },
    { name: 'ZeroCopySliceView', baseWeight: 6, copyPenalty: 0, diff: 'Medium' as const, focus: 'Non-Owning View Constness' },
    { name: 'CopyOnWriteRegister', baseWeight: 3, copyPenalty: 2, diff: 'Hard' as const, focus: 'Detach on Mutation' },
    { name: 'ThreadLocalSlotSpec', baseWeight: 5, copyPenalty: 1, diff: 'Medium' as const, focus: 'Per-Instance Initialization' },
    { name: 'ResourceLedgerFrame', baseWeight: 7, copyPenalty: 2, diff: 'Hard' as const, focus: 'Exception-Safe Swap Idiom' },
    { name: 'SingletonMetricsRegistry', baseWeight: 1, copyPenalty: 0, diff: 'Easy' as const, focus: 'Deleted Copy + Single Instance' },
  ];
  const cfg = configs[idx];

  const evalCases = (ops: string[], vals: number[]): number[] => {
    let activeScore = 0;
    const stack: number[] = [];
    const results: number[] = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const v = vals[i] ?? 0;
      if (op === 'create') {
        const contribution = v * cfg.baseWeight;
        stack.push(contribution);
        activeScore += contribution;
      } else if (op === 'clone') {
        if (stack.length > 0) {
          const top = stack[stack.length - 1] + cfg.copyPenalty;
          stack.push(top);
          activeScore += top;
        }
      } else if (op === 'destroy') {
        if (stack.length > 0) {
          const popped = stack.pop()!;
          activeScore -= popped;
        }
      } else if (op === 'audit') {
        results.push(activeScore);
      }
    }
    return results;
  };

  const rawInputs: Array<[string[], number[]]> = [
    [['create', 'clone', 'audit', 'destroy', 'audit'], [4, 0, 0, 0, 0]],
    [['create', 'create', 'audit', 'destroy', 'audit'], [2, 5, 0, 0, 0]],
    [['destroy', 'audit', 'create', 'clone', 'destroy', 'audit'], [0, 0, 10, 0, 0, 0]],
    [['create', 'clone', 'clone', 'audit'], [3, 0, 0, 0]],
    [['create', 'destroy', 'destroy', 'audit'], [7, 0, 0, 0]],
    [['create', 'create', 'clone', 'destroy', 'destroy', 'audit'], [1, 6, 0, 0, 0, 0]],
    [['audit', 'create', 'audit', 'destroy', 'audit'], [0, 8, 0, 0, 0]],
    [['create', 'clone', 'destroy', 'create', 'audit'], [5, 0, 0, 9, 0]],
    [['create', 'create', 'create', 'destroy', 'audit'], [2, 3, 4, 0, 0]],
    [['create', 'clone', 'destroy', 'destroy', 'audit'], [12, 0, 0, 0, 0]],
  ];

  const cases = rawInputs.map(([ops, vals], i) => ({
    input: `${JSON.stringify(ops)} | ${JSON.stringify(vals)}`,
    expectedOutput: JSON.stringify(evalCases(ops, vals)),
    explanation: i === 0 ? `Create adds val*${cfg.baseWeight}; clone copies top + ${cfg.copyPenalty}; destroy pops in LIFO order.` : undefined,
  }));

  const defaultCodeStub = `class ${cfg.name} {
private:
    int weight_;
public:
    explicit ${cfg.name}(int w, int& tracker) : weight_(w) {
        tracker += weight_;
    }
    ${cfg.name}(const ${cfg.name}& other, int& tracker) : weight_(other.weight_ + ${cfg.copyPenalty}) {
        tracker += weight_;
    }
    // Implement clean lifecycle tracking for create/clone/destroy stack
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        // Track active constructed weight with baseWeight=${cfg.baseWeight} and copyPenalty=${cfg.copyPenalty}
        vector<int> output;
        return output;
    }
};`;

  const solutionCode = `struct ManagedResource {
    int weight;
    int* ledger;
    ManagedResource(int w, int* l) : weight(w), ledger(l) {
        *ledger += weight;
    }
    ManagedResource(const ManagedResource& other) : weight(other.weight + ${cfg.copyPenalty}), ledger(other.ledger) {
        *ledger += weight;
    }
    ManagedResource(ManagedResource&& other) noexcept : weight(other.weight), ledger(other.ledger) {
        other.weight = 0;
        other.ledger = nullptr;
    }
    ~ManagedResource() {
        if (ledger) *ledger -= weight;
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        int activeTotal = 0;
        vector<unique_ptr<ManagedResource>> liveStack;
        vector<int> audits;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "create") {
                liveStack.push_back(make_unique<ManagedResource>(vals[i] * ${cfg.baseWeight}, &activeTotal));
            } else if (ops[i] == "clone") {
                if (!liveStack.empty()) {
                    liveStack.push_back(make_unique<ManagedResource>(*liveStack.back()));
                }
            } else if (ops[i] == "destroy") {
                if (!liveStack.empty()) liveStack.pop_back();
            } else if (ops[i] == "audit") {
                audits.push_back(activeTotal);
            }
        }
        return audits;
    }
};`;

  return {
    topic: 'Constructors, RAII & Lifecycles',
    pattern: cfg.focus,
    difficulty: cfg.diff,
    title: `${cfg.name} (${cfg.focus})`,
    statement: `Model an RAII resource wrapper \`ManagedResource\` for **${cfg.name}** (${cfg.focus}) that maintains a live ledger of active resource weights across stack-based lifecycles.\n\nOperations:\n- \`"create"\` with argument \`v\`: Constructs a new instance with weight \`v * ${cfg.baseWeight}\` and adds it to the ledger.\n- \`"clone"\`: If at least one instance exists on top of the stack, copy-constructs a clone with weight \`top.weight + ${cfg.copyPenalty}\` and adds it to the ledger.\n- \`"destroy"\`: Pops and destroys the most recently constructed instance (deducting its weight via destructor).\n- \`"audit"\`: Appends the current total ledger weight to the result vector.`,
    constraints: `1 <= ops.size() <= 300\nMust use RAII / destructor semantics rather than manual leak-prone bookkeeping.`,
    functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& vals)',
    paramTypes: ['vector<string>', 'vector<int>'],
    returnType: 'vector<int>',
    defaultCodeStub,
    solutionCode,
    complexity: 'Time: O(N) | Space: O(N) live stack',
    cases,
  };
}

function buildInheritancePolymorphismProblem(idx: number): OopTemplateResult {
  const specs = [
    { base: 'Shape', d1: 'Square', d2: 'Rectangle', k1: 1, k2: 2, diff: 'Easy' as const },
    { base: 'EmployeePayroll', d1: 'FullTimeDev', d2: 'ContractDev', k1: 2, k2: 3, diff: 'Easy' as const },
    { base: 'ShippingRate', d1: 'StandardShip', d2: 'ExpressShip', k1: 3, k2: 5, diff: 'Easy' as const },
    { base: 'TaxPolicy', d1: 'FlatTax', d2: 'LuxuryTax', k1: 1, k2: 4, diff: 'Medium' as const },
    { base: 'NotificationCost', d1: 'SmsAlert', d2: 'PushAlert', k1: 4, k2: 1, diff: 'Easy' as const },
    { base: 'DiscountEngine', d1: 'MemberCut', d2: 'VipCut', k1: 2, k2: 5, diff: 'Medium' as const },
    { base: 'VehicleToll', d1: 'SedanPass', d2: 'FreightTruck', k1: 2, k2: 6, diff: 'Easy' as const },
    { base: 'StorageTier', d1: 'WarmTier', d2: 'HotNvmeTier', k1: 3, k2: 7, diff: 'Medium' as const },
    { base: 'CloudInstance', d1: 'MicroNode', d2: 'GpuCluster', k1: 2, k2: 9, diff: 'Medium' as const },
    { base: 'InsurancePremium', d1: 'BasicPlan', d2: 'Comprehensive', k1: 4, k2: 8, diff: 'Medium' as const },
    { base: 'CodecEncoder', d1: 'LossyCodec', d2: 'LosslessCodec', k1: 3, k2: 4, diff: 'Easy' as const },
    { base: 'PaymentGateway', d1: 'UpiRail', d2: 'WireSwift', k1: 1, k2: 6, diff: 'Medium' as const },
    { base: 'CompressionStream', d1: 'Lz4Fast', d2: 'ZstdHigh', k1: 2, k2: 5, diff: 'Hard' as const },
    { base: 'BillingCalculator', d1: 'SeatPlan', d2: 'UsagePlan', k1: 5, k2: 3, diff: 'Medium' as const },
    { base: 'GridMovementCost', d1: 'WalkTile', d2: 'ClimbTile', k1: 1, k2: 4, diff: 'Easy' as const },
    { base: 'PriorityScorer', d1: 'NormalTask', d2: 'CriticalTask', k1: 2, k2: 10, diff: 'Medium' as const },
    { base: 'EnergyTariff', d1: 'OffPeak', d2: 'PeakHour', k1: 3, k2: 6, diff: 'Easy' as const },
    { base: 'AuditRuleCheck', d1: 'WarnRule', d2: 'BlockerRule', k1: 1, k2: 8, diff: 'Hard' as const },
    { base: 'RenderPassCost', d1: 'ShadowPass', d2: 'RaytracePass', k1: 4, k2: 12, diff: 'Hard' as const },
    { base: 'SensorFusion', d1: 'LidarFrame', d2: 'RadarFrame', k1: 5, k2: 3, diff: 'Hard' as const },
  ];
  const s = specs[idx];
  const bonus2 = 5;

  const evalPolymorphic = (types: string[], units: number[]): number => {
    let total = 0;
    for (let i = 0; i < types.length; i++) {
      const u = units[i] ?? 0;
      if (types[i] === s.d1) total += u * s.k1;
      else if (types[i] === s.d2) total += u * s.k2 + bonus2;
    }
    return total;
  };

  const sampleCases: Array<[string[], number[]]> = [
    [[s.d1, s.d2], [10, 4]],
    [[s.d1, s.d1, s.d2], [3, 5, 2]],
    [[s.d2], [7]],
    [[s.d1], [0]],
    [[s.d2, s.d1, s.d2], [1, 8, 6]],
    [[], []],
    [[s.d1, s.d2, s.d1, s.d2], [2, 3, 4, 5]],
    [[s.d2, s.d2], [10, 20]],
    [[s.d1, s.d1, s.d1], [11, 22, 33]],
    [[s.d1, s.d2, s.d1], [15, 0, 12]],
  ];

  const cases = sampleCases.map(([t, u], i) => ({
    input: `${JSON.stringify(t)} | ${JSON.stringify(u)}`,
    expectedOutput: JSON.stringify(evalPolymorphic(t, u)),
    explanation: i === 0 ? `${s.d1}(10) -> 10*${s.k1}; ${s.d2}(4) -> 4*${s.k2}+${bonus2}.` : undefined,
  }));

  const defaultCodeStub = `class ${s.base} {
public:
    virtual ~${s.base}() = default;
    virtual int compute(int units) const = 0;
};

class ${s.d1} : public ${s.base} {
public:
    int compute(int units) const override {
        // units * ${s.k1}
        return 0;
    }
};

class ${s.d2} : public ${s.base} {
public:
    int compute(int units) const override {
        // units * ${s.k2} + ${bonus2}
        return 0;
    }
};

class Solution {
public:
    int solve(vector<string>& kinds, vector<int>& units) {
        vector<unique_ptr<${s.base}>> items;
        int total = 0;
        // Instantiate derived objects polymorphically and sum compute(units[i])
        return total;
    }
};`;

  const solutionCode = `class ${s.base} {
public:
    virtual ~${s.base}() = default;
    virtual int compute(int units) const = 0;
};

class ${s.d1} : public ${s.base} {
public:
    int compute(int units) const override {
        return units * ${s.k1};
    }
};

class ${s.d2} : public ${s.base} {
public:
    int compute(int units) const override {
        return units * ${s.k2} + ${bonus2};
    }
};

class Solution {
public:
    int solve(vector<string>& kinds, vector<int>& units) {
        int total = 0;
        for (size_t i = 0; i < kinds.size(); ++i) {
            unique_ptr<${s.base}> node;
            if (kinds[i] == "${s.d1}") node = make_unique<${s.d1}>();
            else if (kinds[i] == "${s.d2}") node = make_unique<${s.d2}>();
            if (node) total += node->compute(units[i]);
        }
        return total;
    }
};`;

  return {
    topic: 'Inheritance & Virtual Polymorphism',
    pattern: 'Abstract Base Class + Virtual Dispatch',
    difficulty: s.diff,
    title: `Polymorphic ${s.base} Dispatch (${s.d1} / ${s.d2})`,
    statement: `Implement an abstract base class \`${s.base}\` with a virtual destructor and a pure virtual method \`virtual int compute(int units) const = 0;\`.\n\nCreate two derived concrete classes:\n1. \`${s.d1}\`: overrides \`compute(units)\` returning \`units * ${s.k1}\`.\n2. \`${s.d2}\`: overrides \`compute(units)\` returning \`units * ${s.k2} + ${bonus2}\`.\n\nInside \`Solution::solve\`, instantiate the appropriate derived class via \`unique_ptr<${s.base}>\` for each \`kinds[i]\` and return the accumulated polymorphic total.`,
    constraints: `0 <= kinds.size() == units.size() <= 1000\n0 <= units[i] <= 10000\nMust use virtual override polymorphism (no manual type-switch math bypassing ${s.base}).`,
    functionSignature: 'int solve(vector<string>& kinds, vector<int>& units)',
    paramTypes: ['vector<string>', 'vector<int>'],
    returnType: 'int',
    defaultCodeStub,
    solutionCode,
    complexity: 'Time: O(N) | Space: O(1)',
    cases,
  };
}

function buildOperatorOverloadingProblem(idx: number): OopTemplateResult {
  const valueTypes = [
    { cls: 'Vector2D', mode: 'add_norm', title: 'Vector2D Operator+ & Manhattan Norm', diff: 'Easy' as const },
    { cls: 'ComplexInt', mode: 'mul_real', title: 'ComplexInt Operator* Multiplication Chain', diff: 'Medium' as const },
    { cls: 'TimeDuration', mode: 'add_norm', title: 'TimeDuration Operator+ Total Minutes', diff: 'Easy' as const },
    { cls: 'ScorePair', mode: 'cmp_sort', title: 'ScorePair Operator< Custom Leaderboard Sort', diff: 'Medium' as const },
    { cls: 'MoneyCents', mode: 'add_norm', title: 'MoneyCents Safe Operator+ Accumulator', diff: 'Easy' as const },
    { cls: 'FractionValue', mode: 'cmp_sort', title: 'FractionValue Cross-Multiply Operator<', diff: 'Hard' as const },
    { cls: 'IntervalSpan', mode: 'cmp_sort', title: 'IntervalSpan Lexicographic Operator<', diff: 'Medium' as const },
    { cls: 'Matrix2x2', mode: 'mul_real', title: 'Complex-Style Pair Operator* Determinant Trace', diff: 'Hard' as const },
    { cls: 'LinearWeight', mode: 'functor_dot', title: 'LinearWeight Functor Operator() Weighted Sum', diff: 'Easy' as const },
    { cls: 'PointOffset', mode: 'add_norm', title: 'PointOffset Operator+ Net Displacement', diff: 'Easy' as const },
    { cls: 'PolynomialTerm', mode: 'functor_dot', title: 'PolynomialTerm Functor Operator() Evaluation', diff: 'Medium' as const },
    { cls: 'PriorityJob', mode: 'cmp_sort', title: 'PriorityJob Operator< Dual-Key Ranking', diff: 'Medium' as const },
    { cls: 'GridCoord', mode: 'cmp_sort', title: 'GridCoord Operator< Row-Major Ordering', diff: 'Easy' as const },
    { cls: 'SignalSample', mode: 'add_norm', title: 'SignalSample Operator+ Peak Magnitude', diff: 'Medium' as const },
    { cls: 'AffineMapper', mode: 'functor_dot', title: 'AffineMapper Functor Operator() Transform', diff: 'Easy' as const },
    { cls: 'Quaternion2D', mode: 'mul_real', title: 'Rotor2D Operator* Composition Real Part', diff: 'Hard' as const },
    { cls: 'SalaryBand', mode: 'cmp_sort', title: 'SalaryBand Operator< Tier Comparison', diff: 'Easy' as const },
    { cls: 'BatchAccumulator', mode: 'functor_dot', title: 'BatchAccumulator Functor Operator() Fold', diff: 'Medium' as const },
    { cls: 'ColorRgbPair', mode: 'add_norm', title: 'ChannelPair Operator+ Combined Intensity', diff: 'Easy' as const },
    { cls: 'DualNumber', mode: 'mul_real', title: 'ComplexProd Operator* Real Projection', diff: 'Hard' as const },
  ];
  const vt = valueTypes[idx];
  const scale = (idx % 5) + 1;

  const evalOp = (nums: number[]): number => {
    if (vt.mode === 'add_norm') {
      let sx = 0;
      let sy = 0;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        sx += nums[i];
        sy += nums[i + 1];
      }
      return Math.abs(sx) + Math.abs(sy) * scale;
    }
    if (vt.mode === 'mul_real') {
      let rx = 1;
      let ry = 0;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const ax = nums[i];
        const ay = nums[i + 1];
        const nx = rx * ax - ry * ay;
        const ny = rx * ay + ry * ax;
        rx = nx;
        ry = ny;
      }
      return rx + ry * scale;
    }
    if (vt.mode === 'cmp_sort') {
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        pairs.push([nums[i], nums[i + 1]]);
      }
      pairs.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
      if (pairs.length === 0) return 0;
      return pairs[pairs.length - 1][0] * scale + pairs[0][1];
    }
    // functor_dot
    let total = 0;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      total += nums[i] * scale + nums[i + 1];
    }
    return total;
  };

  const sampleLists: number[][] = [
    [1, 2, 3, 4],
    [-2, 5, 4, -1],
    [0, 0, 5, 3],
    [2, 1, 1, 2, 3, -1],
    [6, 4],
    [],
    [-3, -4, -1, 2],
    [5, 2, 5, 1, 5, 9],
    [1, 0, 0, 1, -1, 0],
    [4, 3, 2, 7, 9, 1],
  ];

  const cases = sampleLists.map((arr, i) => ({
    input: JSON.stringify(arr),
    expectedOutput: JSON.stringify(evalOp(arr)),
    explanation: i === 0 ? `Applies overloaded operator semantics over flat (a,b) pairs with factor=${scale}.` : undefined,
  }));

  let statement = '';
  let stubBody = '';
  let solBody = '';

  if (vt.mode === 'add_norm') {
    statement = `Implement value class \`${vt.cls}\` storing \`int x, y\` and overload \`${vt.cls} operator+(const ${vt.cls}& rhs) const\` to return component-wise sum \`(x + rhs.x, y + rhs.y)\`.\n\nGiven an even-length vector \`nums\` representing pairs \`(nums[2i], nums[2i+1])\`, fold them using \`operator+\` from \`(0, 0)\` and return \`abs(total.x) + abs(total.y) * ${scale}\`.`;
    stubBody = `struct ${vt.cls} {
    int x, y;
    ${vt.cls}(int x = 0, int y = 0) : x(x), y(y) {}
    ${vt.cls} operator+(const ${vt.cls}& rhs) const {
        return ${vt.cls}(x + rhs.x, y + rhs.y);
    }
};`;
    solBody = `${stubBody}

class Solution {
public:
    int solve(vector<int>& nums) {
        ${vt.cls} total(0, 0);
        for (size_t i = 0; i + 1 < nums.size(); i += 2) {
            total = total + ${vt.cls}(nums[i], nums[i + 1]);
        }
        return abs(total.x) + abs(total.y) * ${scale};
    }
};`;
  } else if (vt.mode === 'mul_real') {
    statement = `Implement value class \`${vt.cls}\` storing \`int a, b\` (representing \`a + bi\`) and overload \`operator*\` so \`(a + bi) * (c + di) = (ac - bd) + (ad + bc)i\`.\n\nGiven pairs \`(nums[2i], nums[2i+1])\`, fold them with \`operator*\` starting from identity \`(1, 0)\` and return \`res.a + res.b * ${scale}\`.`;
    stubBody = `struct ${vt.cls} {
    int a, b;
    ${vt.cls}(int a = 0, int b = 0) : a(a), b(b) {}
    ${vt.cls} operator*(const ${vt.cls}& rhs) const {
        return ${vt.cls}(a * rhs.a - b * rhs.b, a * rhs.b + b * rhs.a);
    }
};`;
    solBody = `${stubBody}

class Solution {
public:
    int solve(vector<int>& nums) {
        ${vt.cls} acc(1, 0);
        for (size_t i = 0; i + 1 < nums.size(); i += 2) {
            acc = acc * ${vt.cls}(nums[i], nums[i + 1]);
        }
        return acc.a + acc.b * ${scale};
    }
};`;
  } else if (vt.mode === 'cmp_sort') {
    statement = `Implement comparable class \`${vt.cls}\` storing \`int first, second\` and overload \`bool operator<(const ${vt.cls}& rhs) const\` using strict ascending lexicographic order \`(first, second)\`.\n\nGiven pairs \`(nums[2i], nums[2i+1])\`, sort them with \`std::sort\` using your overloaded \`operator<\` and return \`sorted.back().first * ${scale} + sorted.front().second\` (or \`0\` if empty).`;
    stubBody = `struct ${vt.cls} {
    int first, second;
    bool operator<(const ${vt.cls}& rhs) const {
        if (first != rhs.first) return first < rhs.first;
        return second < rhs.second;
    }
};`;
    solBody = `${stubBody}

class Solution {
public:
    int solve(vector<int>& nums) {
        vector<${vt.cls}> items;
        for (size_t i = 0; i + 1 < nums.size(); i += 2) {
            items.push_back({nums[i], nums[i + 1]});
        }
        if (items.empty()) return 0;
        sort(items.begin(), items.end());
        return items.back().first * ${scale} + items.front().second;
    }
};`;
  } else {
    statement = `Implement function object (functor) \`${vt.cls}\` storing factor \`k = ${scale}\` and overload \`int operator()(int a, int b) const\` returning \`a * k + b\`.\n\nAccumulate \`fn(nums[2i], nums[2i+1])\` across all pairs in \`nums\`.`;
    stubBody = `struct ${vt.cls} {
    int k;
    explicit ${vt.cls}(int factor = ${scale}) : k(factor) {}
    int operator()(int a, int b) const {
        return a * k + b;
    }
};`;
    solBody = `${stubBody}

class Solution {
public:
    int solve(vector<int>& nums) {
        ${vt.cls} fn(${scale});
        int sum = 0;
        for (size_t i = 0; i + 1 < nums.size(); i += 2) {
            sum += fn(nums[i], nums[i + 1]);
        }
        return sum;
    }
};`;
  }

  return {
    topic: 'Operator Overloading & Value Types',
    pattern: 'Overloaded C++ Operators & Functors',
    difficulty: vt.diff,
    title: vt.title,
    statement,
    constraints: `0 <= nums.size() <= 100 (even length pairs)\n-20 <= nums[i] <= 20`,
    functionSignature: 'int solve(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `${stubBody}\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Use ${vt.cls} operator here\n        return 0;\n    }\n};`,
    solutionCode: solBody,
    complexity: vt.mode === 'cmp_sort' ? 'Time: O(N log N) | Space: O(N)' : 'Time: O(N) | Space: O(1)',
    cases,
  };
}

function buildDesignPatternProblem(idx: number): OopTemplateResult {
  // 20 OOP Design Pattern coding challenges: Strategy, Observer, Command Undo, State Machine, Cache/Limiter, Factory
  const patterns = [
    { name: 'CommandUndoCounter', kind: 'undo', diff: 'Medium' as const, p: 'Command Pattern' },
    { name: 'StrategyPricingEngine', kind: 'strategy', diff: 'Easy' as const, p: 'Strategy Pattern' },
    { name: 'ObserverScoreBroadcaster', kind: 'observer', diff: 'Medium' as const, p: 'Observer Pattern' },
    { name: 'TicketVendingState', kind: 'state', diff: 'Medium' as const, p: 'State Pattern' },
    { name: 'MiniLruKeyCache', kind: 'lru', diff: 'Hard' as const, p: 'Cache + Encapsulation' },
    { name: 'CircuitBreakerPolicy', kind: 'breaker', diff: 'Hard' as const, p: 'State Machine Pattern' },
    { name: 'DecoratorTaxPipeline', kind: 'strategy', diff: 'Medium' as const, p: 'Decorator Pattern' },
    { name: 'TextActionHistory', kind: 'undo', diff: 'Medium' as const, p: 'Memento / Command' },
    { name: 'EventBusSubscriberSum', kind: 'observer', diff: 'Medium' as const, p: 'Pub/Sub Pattern' },
    { name: 'OrderFulfillmentFsm', kind: 'state', diff: 'Medium' as const, p: 'Finite State Machine' },
    { name: 'WindowedHitLimiter', kind: 'lru', diff: 'Hard' as const, p: 'Encapsulated Cache' },
    { name: 'AlertSeverityChain', kind: 'strategy', diff: 'Easy' as const, p: 'Chain of Responsibility' },
    { name: 'SpreadsheetUndoStack', kind: 'undo', diff: 'Hard' as const, p: 'Command + Redo' },
    { name: 'TelemetryMetricObserver', kind: 'observer', diff: 'Easy' as const, p: 'Observer Pattern' },
    { name: 'TrafficSignalController', kind: 'state', diff: 'Easy' as const, p: 'State Pattern' },
    { name: 'EvictionSlotCache', kind: 'lru', diff: 'Hard' as const, p: 'LRU Policy Object' },
    { name: 'RetryBackoffBreaker', kind: 'breaker', diff: 'Hard' as const, p: 'Resilience State Pattern' },
    { name: 'PluginFilterPipeline', kind: 'strategy', diff: 'Easy' as const, p: 'Strategy Composition' },
    { name: 'TurnstileGateFsm', kind: 'state', diff: 'Easy' as const, p: 'State Pattern' },
    { name: 'ServiceRegistryBroker', kind: 'observer', diff: 'Hard' as const, p: 'Observer + Registry' },
  ];

  const pt = patterns[idx];
  const param = (idx % 4) + 2;

  if (pt.kind === 'undo') {
    const evalUndo = (ops: string[], vals: number[]): number[] => {
      let curr = 0;
      const undoStack: number[] = [];
      const out: number[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === 'add') {
          undoStack.push(vals[i]);
          curr += vals[i];
        } else if (ops[i] === 'undo') {
          if (undoStack.length > 0) curr -= undoStack.pop()!;
        } else if (ops[i] === 'get') {
          out.push(curr);
        }
      }
      return out;
    };
    const inputs: Array<[string[], number[]]> = [
      [['add', 'add', 'undo', 'get'], [10, 25, 0, 0]],
      [['undo', 'get', 'add', 'get'], [0, 0, 7, 0]],
      [['add', 'add', 'undo', 'undo', 'get'], [5, 8, 0, 0, 0]],
      [['add', 'undo', 'add', 'get'], [12, 0, 9, 0]],
      [['add', 'add', 'add', 'get', 'undo', 'get'], [1, 2, 3, 0, 0, 0]],
      [['get', 'add', 'get', 'undo', 'get'], [0, 50, 0, 0, 0]],
      [['add', 'add', 'undo', 'add', 'undo', 'get'], [4, 6, 0, 10, 0, 0]],
      [['undo', 'undo', 'add', 'undo', 'get'], [0, 0, 30, 0, 0]],
      [['add', 'get'], [-15, 0]],
      [['add', 'add', 'get', 'undo', 'undo', 'undo', 'get'], [100, 200, 0, 0, 0, 0, 0]],
    ];
    return {
      topic: 'Design Patterns & SOLID Systems',
      pattern: pt.p,
      difficulty: pt.diff,
      title: `${pt.name} (${pt.p})`,
      statement: `Implement the **${pt.p}** using a \`Command\` interface and a receiver value initialized to \`0\`.\n\nCommands:\n- \`"add"\` with \`val\`: executes an add command (+val) and pushes it onto the undo history.\n- \`"undo"\`: reverts the most recent un-reverted command cleanly (no-op if history is empty).\n- \`"get"\`: appends the receiver's current value to the result vector.`,
      constraints: `1 <= ops.size() <= 400`,
      functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& vals)',
      paramTypes: ['vector<string>', 'vector<int>'],
      returnType: 'vector<int>',
      defaultCodeStub: `class ICommand {
public:
    virtual ~ICommand() = default;
    virtual void execute(int& state) = 0;
    virtual void undo(int& state) = 0;
};

class AddCommand : public ICommand {
    int delta_;
public:
    explicit AddCommand(int delta) : delta_(delta) {}
    void execute(int& state) override { state += delta_; }
    void undo(int& state) override { state -= delta_; }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        int state = 0;
        vector<unique_ptr<ICommand>> history;
        vector<int> res;
        // Dispatch commands and support undo()
        return res;
    }
};`,
      solutionCode: `class ICommand {
public:
    virtual ~ICommand() = default;
    virtual void execute(int& state) = 0;
    virtual void undo(int& state) = 0;
};

class AddCommand : public ICommand {
    int delta_;
public:
    explicit AddCommand(int delta) : delta_(delta) {}
    void execute(int& state) override { state += delta_; }
    void undo(int& state) override { state -= delta_; }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        int state = 0;
        vector<unique_ptr<ICommand>> history;
        vector<int> res;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "add") {
                auto cmd = make_unique<AddCommand>(vals[i]);
                cmd->execute(state);
                history.push_back(move(cmd));
            } else if (ops[i] == "undo") {
                if (!history.empty()) {
                    history.back()->undo(state);
                    history.pop_back();
                }
            } else if (ops[i] == "get") {
                res.push_back(state);
            }
        }
        return res;
    }
};`,
      complexity: 'Time: O(N) | Space: O(N) command history',
      cases: inputs.map(([o, v]) => ({ input: `${JSON.stringify(o)} | ${JSON.stringify(v)}`, expectedOutput: JSON.stringify(evalUndo(o, v)) })),
    };
  }

  if (pt.kind === 'observer') {
    const evalObs = (ops: string[], vals: number[]): number[] => {
      let subscribers = param;
      let totalNotifs = 0;
      const out: number[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === 'sub') subscribers++;
        else if (ops[i] === 'unsub') subscribers = Math.max(0, subscribers - 1);
        else if (ops[i] === 'emit') totalNotifs += subscribers * vals[i];
        else if (ops[i] === 'read') out.push(totalNotifs);
      }
      return out;
    };
    const inputs: Array<[string[], number[]]> = [
      [['emit', 'sub', 'emit', 'read'], [10, 0, 5, 0]],
      [['sub', 'unsub', 'emit', 'read'], [0, 0, 4, 0]],
      [['unsub', 'unsub', 'unsub', 'unsub', 'unsub', 'emit', 'read'], [0, 0, 0, 0, 0, 99, 0]],
      [['emit', 'read', 'sub', 'sub', 'emit', 'read'], [2, 0, 0, 0, 3, 0]],
      [['read', 'emit', 'read'], [0, 10, 0]],
      [['sub', 'emit', 'unsub', 'emit', 'read'], [0, 5, 0, 5, 0]],
      [['emit', 'emit', 'read'], [1, 2, 0]],
      [['sub', 'sub', 'sub', 'emit', 'read'], [0, 0, 0, 4, 0]],
      [['unsub', 'emit', 'read'], [0, 7, 0]],
      [['sub', 'emit', 'unsub', 'unsub', 'emit', 'read'], [0, 6, 0, 0, 8, 0]],
    ];
    return {
      topic: 'Design Patterns & SOLID Systems',
      pattern: pt.p,
      difficulty: pt.diff,
      title: `${pt.name} (${pt.p})`,
      statement: `Model an **${pt.p}** broker initialized with \`${param}\` active subscribers.\n\nOperations:\n- \`"sub"\`: attaches 1 subscriber.\n- \`"unsub"\`: detaches 1 subscriber (clamped at 0).\n- \`"emit"\` with payload \`v\`: broadcasts \`v\` to every currently subscribed observer (adding \`activeSubscribers * v\` to total delivered score).\n- \`"read"\`: outputs current total delivered score.`,
      constraints: `1 <= ops.size() <= 300`,
      functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& vals)',
      paramTypes: ['vector<string>', 'vector<int>'],
      returnType: 'vector<int>',
      defaultCodeStub: `class IObserver {
public:
    virtual ~IObserver() = default;
    virtual void onEvent(int payload) = 0;
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        // Initialize ${param} observers and dispatch pub/sub commands
        return {};
    }
};`,
      solutionCode: `class IObserver {
public:
    virtual ~IObserver() = default;
    virtual void onEvent(int payload) = 0;
};

class LedgerObserver : public IObserver {
    int& total_;
public:
    explicit LedgerObserver(int& total) : total_(total) {}
    void onEvent(int payload) override { total_ += payload; }
};

class EventBroker {
    vector<unique_ptr<IObserver>> subs_;
public:
    void subscribe(unique_ptr<IObserver> obs) { subs_.push_back(move(obs)); }
    void unsubscribe() { if (!subs_.empty()) subs_.pop_back(); }
    void emit(int payload) {
        for (const auto& s : subs_) s->onEvent(payload);
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        int total = 0;
        EventBroker broker;
        for (int i = 0; i < ${param}; ++i) broker.subscribe(make_unique<LedgerObserver>(total));
        vector<int> out;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "sub") broker.subscribe(make_unique<LedgerObserver>(total));
            else if (ops[i] == "unsub") broker.unsubscribe();
            else if (ops[i] == "emit") broker.emit(vals[i]);
            else if (ops[i] == "read") out.push_back(total);
        }
        return out;
    }
};`,
      complexity: 'Time: O(N * K) | Space: O(K)',
      cases: inputs.map(([o, v]) => ({ input: `${JSON.stringify(o)} | ${JSON.stringify(v)}`, expectedOutput: JSON.stringify(evalObs(o, v)) })),
    };
  }

  if (pt.kind === 'strategy') {
    const evalStrat = (ops: string[], vals: number[]): number[] => {
      let mode = 'standard'; // standard: *1, bulk: *param, half: /2
      let total = 0;
      const out: number[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === 'mode_bulk') mode = 'bulk';
        else if (ops[i] === 'mode_half') mode = 'half';
        else if (ops[i] === 'mode_std') mode = 'standard';
        else if (ops[i] === 'apply') {
          const x = vals[i];
          if (mode === 'bulk') total += x * param;
          else if (mode === 'half') total += Math.trunc(x / 2);
          else total += x;
          out.push(total);
        }
      }
      return out;
    };
    const inputs: Array<[string[], number[]]> = [
      [['apply', 'mode_bulk', 'apply', 'mode_half', 'apply'], [10, 0, 5, 0, 9]],
      [['mode_bulk', 'apply', 'mode_std', 'apply'], [0, 4, 0, 4]],
      [['mode_half', 'apply', 'apply'], [0, 11, 20]],
      [['apply', 'apply', 'apply'], [3, 6, 9]],
      [['mode_bulk', 'mode_std', 'mode_half', 'apply'], [0, 0, 0, 14]],
      [['mode_bulk', 'apply', 'mode_bulk', 'apply'], [0, 7, 0, 3]],
      [['mode_std', 'apply', 'mode_half', 'apply'], [0, 100, 0, 15]],
      [['apply', 'mode_bulk', 'apply'], [0, 0, 0]],
      [['mode_half', 'apply', 'mode_bulk', 'apply'], [0, 1, 0, 8]],
      [['mode_bulk', 'apply', 'mode_half', 'apply', 'mode_std', 'apply'], [0, 6, 0, 7, 0, 2]],
    ];
    return {
      topic: 'Design Patterns & SOLID Systems',
      pattern: pt.p,
      difficulty: pt.diff,
      title: `${pt.name} (${pt.p})`,
      statement: `Design a swappable **${pt.p}** context with three concrete \`IPolicy\` strategies:\n- \`"mode_std"\` (initial): transforms \`x -> x\`\n- \`"mode_bulk"\`: transforms \`x -> x * ${param}\`\n- \`"mode_half"\`: transforms \`x -> x / 2\` (integer division)\n\nWhenever \`"apply"\` with argument \`x\` runs, apply the active strategy, add to running total, and push the updated total into the output.`,
      constraints: `1 <= ops.size() <= 400`,
      functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& vals)',
      paramTypes: ['vector<string>', 'vector<int>'],
      returnType: 'vector<int>',
      defaultCodeStub: `class IPolicy {
public:
    virtual ~IPolicy() = default;
    virtual int evaluate(int x) const = 0;
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        // Swap strategy instances dynamically on mode_* commands
        return {};
    }
};`,
      solutionCode: `class IPolicy {
public:
    virtual ~IPolicy() = default;
    virtual int evaluate(int x) const = 0;
};

class StdPolicy : public IPolicy {
public:
    int evaluate(int x) const override { return x; }
};

class BulkPolicy : public IPolicy {
public:
    int evaluate(int x) const override { return x * ${param}; }
};

class HalfPolicy : public IPolicy {
public:
    int evaluate(int x) const override { return x / 2; }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& vals) {
        unique_ptr<IPolicy> policy = make_unique<StdPolicy>();
        int total = 0;
        vector<int> out;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "mode_std") policy = make_unique<StdPolicy>();
            else if (ops[i] == "mode_bulk") policy = make_unique<BulkPolicy>();
            else if (ops[i] == "mode_half") policy = make_unique<HalfPolicy>();
            else if (ops[i] == "apply") {
                total += policy->evaluate(vals[i]);
                out.push_back(total);
            }
        }
        return out;
    }
};`,
      complexity: 'Time: O(N) | Space: O(1)',
      cases: inputs.map(([o, v]) => ({ input: `${JSON.stringify(o)} | ${JSON.stringify(v)}`, expectedOutput: JSON.stringify(evalStrat(o, v)) })),
    };
  }

  if (pt.kind === 'state' || pt.kind === 'breaker') {
    const threshold = param;
    const evalState = (events: string[]): number[] => {
      // States: 0 = LOCKED/OPEN, 1 = READY/CLOSED
      let unlocked = pt.kind === 'breaker' ? 1 : 0;
      let passCount = 0;
      let streakFails = 0;
      const out: number[] = [];
      for (const e of events) {
        if (pt.kind === 'breaker') {
          if (e === 'req') {
            if (unlocked === 1) passCount++;
          } else if (e === 'fail') {
            streakFails++;
            if (streakFails >= threshold) unlocked = 0;
          } else if (e === 'reset') {
            unlocked = 1;
            streakFails = 0;
          } else if (e === 'stat') {
            out.push(passCount);
          }
        } else {
          if (e === 'coin') unlocked = 1;
          else if (e === 'push') {
            if (unlocked === 1) {
              passCount += threshold;
              unlocked = 0;
            }
          } else if (e === 'stat') {
            out.push(passCount);
          }
        }
      }
      return out;
    };

    const casesRaw: string[][] =
      pt.kind === 'breaker'
        ? [
            ['req', 'fail', 'fail', 'req', 'stat'],
            ['req', 'fail', 'fail', 'fail', 'fail', 'fail', 'req', 'stat'],
            ['fail', 'fail', 'fail', 'fail', 'fail', 'reset', 'req', 'stat'],
            ['req', 'req', 'stat', 'fail', 'reset', 'req', 'stat'],
            ['stat', 'req', 'stat'],
            ['fail', 'req', 'fail', 'req', 'stat'],
            ['reset', 'req', 'req', 'stat'],
            ['fail', 'fail', 'fail', 'fail', 'fail', 'req', 'reset', 'req', 'stat'],
            ['req', 'fail', 'reset', 'fail', 'req', 'stat'],
            ['req', 'req', 'req', 'fail', 'fail', 'fail', 'fail', 'fail', 'req', 'stat'],
          ]
        : [
            ['push', 'coin', 'push', 'stat'],
            ['coin', 'coin', 'push', 'push', 'stat'],
            ['stat', 'coin', 'push', 'stat'],
            ['coin', 'push', 'coin', 'push', 'stat'],
            ['push', 'push', 'stat'],
            ['coin', 'push', 'push', 'coin', 'push', 'stat'],
            ['coin', 'stat', 'push', 'stat'],
            ['push', 'coin', 'coin', 'push', 'coin', 'push', 'stat'],
            ['coin', 'push', 'coin', 'stat'],
            ['push', 'push', 'coin', 'push', 'push', 'stat'],
          ];

    return {
      topic: 'Design Patterns & SOLID Systems',
      pattern: pt.p,
      difficulty: pt.diff,
      title: `${pt.name} (${pt.p})`,
      statement:
        pt.kind === 'breaker'
          ? `Implement a **Circuit Breaker State Machine** (\`Closed\` vs \`Open\`) starting in \`Closed\` state (accepting requests).\n- \`"req"\`: increments \`acceptedCount\` only while \`Closed\`.\n- \`"fail"\`: increments consecutive failure streak; transitions to \`Open\` once failures reach \`${threshold}\`.\n- \`"reset"\`: closes the circuit and resets consecutive failures to 0.\n- \`"stat"\`: records \`acceptedCount\`.`
          : `Implement a **${pt.name} State Pattern** starting in \`Locked\` state.\n- \`"coin"\`: transitions to \`Unlocked\`.\n- \`"push"\`: if \`Unlocked\`, adds \`${threshold}\` credits to \`passScore\` and transitions back to \`Locked\`; if \`Locked\`, does nothing.\n- \`"stat"\`: records \`passScore\`.`,
      constraints: `1 <= events.size() <= 300`,
      functionSignature: 'vector<int> solve(vector<string>& events)',
      paramTypes: ['vector<string>'],
      returnType: 'vector<int>',
      defaultCodeStub: `class State {
public:
    virtual ~State() = default;
};

class Solution {
public:
    vector<int> solve(vector<string>& events) {
        // Model explicit State transitions
        return {};
    }
};`,
      solutionCode:
        pt.kind === 'breaker'
          ? `class Solution {
    bool isOpen_ = false;
    int fails_ = 0;
    int accepted_ = 0;
public:
    vector<int> solve(vector<string>& events) {
        vector<int> out;
        isOpen_ = false;
        fails_ = 0;
        accepted_ = 0;
        for (const string& ev : events) {
            if (ev == "req") {
                if (!isOpen_) accepted_++;
            } else if (ev == "fail") {
                fails_++;
                if (fails_ >= ${threshold}) isOpen_ = true;
            } else if (ev == "reset") {
                isOpen_ = false;
                fails_ = 0;
            } else if (ev == "stat") {
                out.push_back(accepted_);
            }
        }
        return out;
    }
};`
          : `class Solution {
    bool unlocked_ = false;
    int score_ = 0;
public:
    vector<int> solve(vector<string>& events) {
        vector<int> out;
        unlocked_ = false;
        score_ = 0;
        for (const string& ev : events) {
            if (ev == "coin") unlocked_ = true;
            else if (ev == "push") {
                if (unlocked_) {
                    score_ += ${threshold};
                    unlocked_ = false;
                }
            } else if (ev == "stat") {
                out.push_back(score_);
            }
        }
        return out;
    }
};`,
      complexity: 'Time: O(N) | Space: O(1)',
      cases: casesRaw.map((ev) => ({ input: JSON.stringify(ev), expectedOutput: JSON.stringify(evalState(ev)) })),
    };
  }

  // LRU cache / bounded cache class design
  const cap = param;
  const evalLru = (ops: string[], args: number[]): number[] => {
    const order: number[] = [];
    const map = new Map<number, number>();
    const out: number[] = [];
    for (let i = 0; i < ops.length; i++) {
      const k = args[i];
      if (ops[i] === 'put') {
        const val = k * 10 + 1;
        const idxExisting = order.indexOf(k);
        if (idxExisting !== -1) order.splice(idxExisting, 1);
        else if (order.length >= cap) {
          const evicted = order.shift()!;
          map.delete(evicted);
        }
        order.push(k);
        map.set(k, val);
      } else if (ops[i] === 'get') {
        if (!map.has(k)) {
          out.push(-1);
        } else {
          const idxExisting = order.indexOf(k);
          if (idxExisting !== -1) order.splice(idxExisting, 1);
          order.push(k);
          out.push(map.get(k)!);
        }
      }
    }
    return out;
  };

  const inputs: Array<[string[], number[]]> = [
    [['put', 'put', 'get', 'put', 'get'], [1, 2, 1, 3, 2]],
    [['put', 'put', 'put', 'put', 'put', 'put', 'get', 'get'], [1, 2, 3, 4, 5, 6, 1, 6]],
    [['get', 'put', 'get'], [9, 9, 9]],
    [['put', 'put', 'get', 'put', 'get', 'get'], [10, 20, 10, 30, 20, 10]],
    [['put', 'get', 'put', 'get'], [5, 5, 5, 5]],
    [['put', 'put', 'put', 'get', 'put', 'get'], [1, 2, 3, 1, 4, 2]],
    [['put', 'get', 'get', 'put', 'get'], [7, 7, 8, 9, 7]],
    [['put', 'put', 'put', 'put', 'get', 'get', 'get'], [1, 2, 3, 4, 1, 2, 4]],
    [['get', 'get'], [1, 2]],
    [['put', 'put', 'get', 'put', 'put', 'get', 'get'], [2, 4, 2, 6, 8, 4, 2]],
  ];

  return {
    topic: 'Design Patterns & SOLID Systems',
    pattern: pt.p,
    difficulty: pt.diff,
    title: `${pt.name} (Capacity ${cap})`,
    statement: `Design an encapsulated **${pt.name}** class with capacity \`${cap}\`.\n- \`"put"\` with key \`k\`: inserts or updates key \`k\` storing derived value \`k * 10 + 1\`, evicting the least recently used key if full.\n- \`"get"\` with key \`k\`: promotes \`k\` to most recently used and pushes its stored value (or \`-1\` if absent) to the result.`,
    constraints: `Capacity = ${cap}\n1 <= ops.size() <= 200`,
    functionSignature: 'vector<int> simulate(vector<string>& ops, vector<int>& keys)',
    paramTypes: ['vector<string>', 'vector<int>'],
    returnType: 'vector<int>',
    defaultCodeStub: `class ${pt.name} {
    int capacity_;
    list<int> lru_;
    unordered_map<int, pair<int, list<int>::iterator>> cache_;
public:
    explicit ${pt.name}(int cap = ${cap}) : capacity_(cap) {}
    int get(int key) {
        return -1;
    }
    void put(int key) {
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& keys) {
        ${pt.name} cache(${cap});
        vector<int> res;
        return res;
    }
};`,
    solutionCode: `class ${pt.name} {
    int capacity_;
    list<int> lru_;
    unordered_map<int, pair<int, list<int>::iterator>> cache_;
public:
    explicit ${pt.name}(int cap = ${cap}) : capacity_(cap) {}
    int get(int key) {
        auto it = cache_.find(key);
        if (it == cache_.end()) return -1;
        lru_.splice(lru_.end(), lru_, it->second.second);
        return it->second.first;
    }
    void put(int key) {
        int value = key * 10 + 1;
        auto it = cache_.find(key);
        if (it != cache_.end()) {
            it->second.first = value;
            lru_.splice(lru_.end(), lru_, it->second.second);
            return;
        }
        if (static_cast<int>(cache_.size()) >= capacity_) {
            int oldest = lru_.front();
            lru_.pop_front();
            cache_.erase(oldest);
        }
        lru_.push_back(key);
        auto tail = prev(lru_.end());
        cache_[key] = {value, tail};
    }
};

class Solution {
public:
    vector<int> simulate(vector<string>& ops, vector<int>& keys) {
        ${pt.name} cache(${cap});
        vector<int> res;
        for (size_t i = 0; i < ops.size(); ++i) {
            if (ops[i] == "put") cache.put(keys[i]);
            else if (ops[i] == "get") res.push_back(cache.get(keys[i]));
        }
        return res;
    }
};`,
    complexity: 'Time: O(1) average per op | Space: O(capacity)',
    cases: inputs.map(([o, v]) => ({ input: `${JSON.stringify(o)} | ${JSON.stringify(v)}`, expectedOutput: JSON.stringify(evalLru(o, v)) })),
  };
}

function registerOopProblem(id: number, spec: OopTemplateResult): void {
  const testCases: TestCase[] = spec.cases.map((c, idx) => ({
    id: idx + 1,
    input: c.input,
    expectedOutput: c.expectedOutput,
    isHidden: idx >= 2,
  }));

  OOP_PROBLEMS_INTERNAL.push({
    id,
    slug: makeSlug(id, spec.title),
    title: spec.title,
    difficulty: spec.difficulty,
    category: 'OOP',
    topic: spec.topic,
    pattern: spec.pattern,
    statement: spec.statement,
    constraints: spec.constraints,
    examples: spec.cases.slice(0, 2).map((c) => ({
      input: c.input,
      output: c.expectedOutput,
      explanation: c.explanation,
    })),
    functionSignature: spec.functionSignature,
    paramTypes: spec.paramTypes,
    returnType: spec.returnType,
    defaultCodeStub: spec.defaultCodeStub,
    sampleTestCases: testCases.slice(0, 2),
    hiddenTestCases: testCases.slice(2),
  });

  OOP_SOLUTIONS.set(id, {
    complexity: spec.complexity,
    code: spec.solutionCode,
  });
}

// Seed 100 OOP Problems cleanly (#631 - #730): 20 per pillar
for (let i = 0; i < 20; i++) {
  registerOopProblem(631 + i, buildEncapsulationProblem(i));
  registerOopProblem(651 + i, buildConstructorRaiiProblem(i));
  registerOopProblem(671 + i, buildInheritancePolymorphismProblem(i));
  registerOopProblem(691 + i, buildOperatorOverloadingProblem(i));
  registerOopProblem(711 + i, buildDesignPatternProblem(i));
}

export const OOP_100_PROBLEMS: ProblemDefinition[] = OOP_PROBLEMS_INTERNAL.sort((a, b) => a.id - b.id);

export function getOopSolution(problemId: number): { complexity: string; code: string } | null {
  return OOP_SOLUTIONS.get(problemId) || null;
}
