---
order: 240
title: Jest 入门
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 单元测试入门：describe/it/expect 三件套、常用匹配器、生命周期钩子、mock 函数最小集与 Vitest 的关系。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/250-JestMock'
  - 'software-testing/260-JestAsync'
  - 'software-testing/270-JestConfig'
  - 'software-testing/030-TestLevels'
prerequisites:
  - 'software-testing/030-TestLevels'
---

## 1. Jest 是什么，与 Vitest 什么关系

Jest 是 Meta 开源、由 OpenJS 基金会托管的 JavaScript 测试框架，「零配置
开箱即用」的路线让它长期是 React 生态的默认选择。需要了解的现状是：
Jest 29（2022）之后近三年没有大版本，社区一度担忧其维护节奏并大量转向
Vitest；2025-06 发布的 Jest 30 恢复了活跃迭代（速度与 ESM 支持明显改善）。
两者 API 高度相似——`describe/it/expect` 这套核心语法几乎可以原样迁移，
学一套两边通用；Vite 项目建议直接用 Vitest，存量 Jest 项目不必为迁移而
迁移。

前置知识：JavaScript 模块（import/export）、npm 基本使用、函数与箭头函数。

```bash
npm install --save-dev jest        # 安装
npx jest                           # 运行测试
```

## 2. 第一个测试：describe / it / expect

Jest 测试的骨架是三件套：`describe` 分组、`it`（别名 `test`）单条用例、
`expect` 断言。

```javascript
// string.test.js —— Jest 默认识别 *.test.js 文件
function slugify(input) {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

describe('slugify', () => {
  it('把空格转为连字符并转小写', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('去掉首尾空白', () => {
    expect(slugify('  Hi  ')).toBe('hi');
  });

  it('空字符串返回空字符串', () => {
    expect(slugify('')).toBe('');
  });
});
```

```bash
npx jest slugify.test.js --verbose
# PASS  slugify.test.js
#   slugify
#     √ 把空格转为连字符并转小写 (2 ms)
#     √ 去掉首尾空白
#     √ 空字符串返回空字符串
```

`describe` 只是组织结构，不影响执行逻辑；真正决定「测试是否要重新计算」
的是每条 `it` 的独立性——用例之间不要共享可变状态。

## 3. 常用匹配器

```javascript
// 精确性：三者的严格程度递增
expect({ a: 1 }).toEqual({ a: 1 });        // 深度相等（忽略 undefined 属性差异）
expect({ a: 1 }).toStrictEqual({ a: 1 });  // 深度相等 + 检查 undefined 属性与类
expect(1).toBe(1);                         // Object.is，适合原始值与引用比较

// 真值与数值
expect(name).toBeTruthy();       // 非假值（0/''/null/undefined/false）
expect(list).toHaveLength(3);
expect(price).toBeCloseTo(0.3, 5);  // 浮点比较必须用它：0.1+0.2 !== 0.3
expect(count).toBeGreaterThan(0);

// 集合与字符串
expect(tags).toContain('node');
expect(users).toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
expect(message).toMatch(/失败/);

// 异常
expect(() => JSON.parse('{')).toThrow();          // 抛异常即可
expect(() => parseAge(-1)).toThrow('年龄非法');    // 校验错误信息
```

每个匹配器都有 `not` 反义：`expect(x).not.toBeNull()`。匹配器选错是新手
最常见的问题——对象比较用了 `toBe`（比较引用，几乎必然失败），浮点用了
`toBe`（精度陷阱），记住三个对应关系：原始值 `toBe`、对象 `toEqual`、
浮点 `toBeCloseTo`。

## 4. 生命周期钩子

```javascript
describe('购物车', () => {
  let cart;

  beforeEach(() => {
    cart = new Cart();              // 每条用例前重建，保证互不影响
  });

  beforeAll(() => console.log('整组只跑一次，适合全局连接'));
  afterEach(() => console.log('每条用例后清理'));

  it('初始为空', () => expect(cart.count()).toBe(0));

  it('可以加入商品', () => {
    cart.add({ id: 1, price: 100 });
    expect(cart.count()).toBe(1);   // 因为 beforeEach，上一条不影响它
  });
});
```

钩子作用域限定在所在 `describe` 块内，`beforeAll` 共享状态时要小心用例
间污染——默认建议 `beforeEach`。

## 5. Mock 函数最小集

完整的 Mock 体系（模块模拟、定时器）见「Jest Mock 模拟」，这里只给最小集：

```javascript
// 用 jest.fn() 验证「副作用发生了」——行为验证
test('支付失败时调用通知服务', async () => {
  const notify = jest.fn();
  const gateway = { charge: jest.fn().mockResolvedValue({ ok: false }) };

  await checkout(gateway, notify);

  expect(gateway.charge).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith(expect.stringContaining('失败'));
});
```

## 6. 完整示例：一个自包含的测试套件

被测模块是密码校验器，测试覆盖正常路径、每条规则一个非法路径、边界：

```javascript
// password.test.js —— npx jest password.test.js 可直接运行
const MIN = 8;

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN) {
    return { ok: false, reason: `长度不足 ${MIN} 位` };
  }
  if (!/[A-Z]/.test(pw)) return { ok: false, reason: '缺少大写字母' };
  if (!/[0-9]/.test(pw)) return { ok: false, reason: '缺少数字' };
  return { ok: true, reason: '' };
}

describe('validatePassword', () => {
  // 正常路径
  it('接受合法强密码', () => {
    expect(validatePassword('Passw0rd2026')).toMatchObject({ ok: true });
  });

  // 每条规则一个非法路径，断言到具体 reason
  it.each([
    ['short1A', `长度不足 ${MIN} 位`],     // 边界外：7 位
    ['password2026', '缺少大写字母'],       // 无大写
    ['PASSWORDABC', '缺少数字'],            // 无数字
  ])('拒绝 %j 并提示 %s', (input, reason) => {
    expect(validatePassword(input)).toEqual({ ok: false, reason });
  });

  // 边界：恰好 8 位应通过
  it('接受恰好 8 位的强密码', () => {
    expect(validatePassword('Abcdefg1').ok).toBe(true);
  });
});
```

这个套件展示了单元测试的标准形态：**正常路径 + 每条规则一条拒绝路径 +
边界值**，失败时 `it.each` 的参数化标题直接指明是哪条规则出了问题。

## 7. 命令行与工作流

```bash
npx jest                        # 全量运行
npx jest --watch                # 监视模式：只跑改动相关的测试
npx jest --coverage             # 输出覆盖率报告
npx jest -t "去掉首尾空白"       # 按名称过滤单条用例
npx jest --bail=1               # 首次失败即停止
```

日常节奏：`--watch` 常驻终端写码即测；提交前全量跑一遍。CI 中建议加
`--ci` 禁用 watch 的自动探测。

## 8. 常见陷阱

- **用例间共享可变状态**：模块顶层 `let list = []` 再在用例里 push，
  执行顺序一变就红。状态放 `beforeEach` 里重建。
- **浮点用 `toBe`**：`expect(0.1 + 0.2).toBe(0.3)` 必挂，用 `toBeCloseTo`。
- **异步忘了 await**：`it('test', () => { await fetchX(); })` 缺 `async`，
  断言在测试结束后才执行，测试假绿（详见「Jest 异步测试」）。
- **断言放在回调里不执行**：`expect` 写进某个不会被调用的分支，测试通过
  但什么都没验证；可以用 `expect.assertions(1)` 声明断言数量兜底。
- **只测 happy path**：每写一条正常路径用例，至少补一条非法输入用例。
- **测试依赖真实时间/网络**：时间用假定时器、网络用 Mock（后两篇展开），
  否则 CI 上必现偶发失败。

## 小结

- 初学者要点：`describe/it/expect` 三件套 + `beforeEach` 重建状态，就能
  覆盖大多数单元测试；匹配器三对应——原始值 `toBe`、对象 `toEqual`、
  浮点 `toBeCloseTo`；用 `--watch` 建立即改即测的节奏。
- 进阶注意：Jest 30（2025-06）已恢复大版本迭代，与 Vitest 核心 API 同构，
  新项目按技术栈选（Vite 系选 Vitest）；`expect.assertions` 防空断言；
  测试独立性优先于测试顺序，任何依赖顺序的用例都是定时炸弹。
