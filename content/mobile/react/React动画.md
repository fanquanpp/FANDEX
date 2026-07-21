# 动画 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## CSS Transitions

**transition 基础**
`transition: <property> <duration> [<timing-function>] [<delay>];`
```tsx
<div style={{
  transition: 'transform 0.3s ease, opacity 0.2s',
}} />
```

**transition-property 多属性**
```tsx
const style: React.CSSProperties = {
  transitionProperty: 'transform, opacity',
  transitionDuration: '300ms, 200ms',
  transitionTimingFunction: 'ease-in-out',
  transitionDelay: '0s, 100ms',
};
```

---

## CSS Animations

**@keyframes**
```tsx
const spin = `@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;

<div style={{ animation: 'spin 1s linear infinite' }} />;
```

**animation 简写**
`animation: <name> <duration> <timing> <delay> <count> <direction> <fill-mode>;`
```tsx
<div style={{
  animation: 'fade-in 0.5s ease-out 0s 1 normal forwards',
}} />;
```

---

## React Transition API

**useTransition**
`const [<isPending>, <startTransition>] = useTransition();`
```tsx
import { useTransition } from 'react';

function Tabs() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  const onChange = (next: string) => {
    startTransition(() => setTab(next));
  };

  return (
    <>
      <button onClick={() => onChange('profile')} disabled={isPending}>
        {isPending ? '加载中...' : '个人资料'}
      </button>
      <Content tab={tab} />
    </>
  );
}
```

**useDeferredValue**
`const <deferred> = useDeferredValue(<value>);`
```tsx
import { useDeferredValue, useMemo } from 'react';

function Search({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  return <List items={results} />;
}
```

---

## Transition 组件 (react-transition-group)

**CSSTransition**
`<CSSTransition in={<bool>} timeout={<ms>} classNames=<name>>`
```tsx
import { CSSTransition } from 'react-transition-group';

<CSSTransition
  in={isVisible}
  timeout={300}
  classNames="fade"
  unmountOnExit
>
  <div className="modal">...</div>
</CSSTransition>
```

**classNames 对象形式**
```tsx
<CSSTransition
  in={show}
  timeout={300}
  classNames={{
    enter: 'fade-enter',
    enterActive: 'fade-enter-active',
    exit: 'fade-exit',
    exitActive: 'fade-exit-active',
  }}
>
  <div />
</CSSTransition>
```

**SwitchTransition**
```tsx
import { SwitchTransition, CSSTransition } from 'react-transition-group';

<SwitchTransition mode="out-in">
  <CSSTransition key={currentId} timeout={300} classNames="fade">
    <div>{current.name}</div>
  </CSSTransition>
</SwitchTransition>
```

**TransitionGroup**
```tsx
import { TransitionGroup, CSSTransition } from 'react-transition-group';

<TransitionGroup>
  {items.map(item => (
    <CSSTransition key={item.id} timeout={300} classNames="item">
      <li>{item.text}</li>
    </CSSTransition>
  ))}
</TransitionGroup>
```

---

## framer-motion API

**motion 组件**
`import { motion } from 'framer-motion';`
```tsx
import { motion } from 'framer-motion';

<motion.div
  animate={{ opacity: 1, x: 0 }}
  initial={{ opacity: 0, x: -100 }}
  transition={{ duration: 0.3 }}
/>
```

**animate 属性**
`animate={{ <prop>: <value> }}`
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  animate={{ rotate: isRotated ? 180 : 0 }}
/>
```

**variants 变体**
```tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.3 }}
/>;
```

**stagger 子元素序列**
```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map(i => (
    <motion.li key={i.id} variants={item}>{i.text}</motion.li>
  ))}
</motion.ul>;
```

**AnimatePresence 退场动画**
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

**useAnimation 控制器**
```tsx
import { useAnimation } from 'framer-motion';

function Box() {
  const controls = useAnimation();
  return (
    <>
      <motion.div animate={controls} />
      <button onClick={() => controls.start({ x: 100 })}>移动</button>
    </>
  );
}
```

**useInView 视图触发**
```tsx
import { useInView } from 'framer-motion';
import { useRef } from 'react';

function Section() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return <motion.div ref={ref} animate={{ opacity: inView ? 1 : 0 }} />;
}
```

**drag 拖拽**
```tsx
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  onDragEnd={(e, info) => console.log(info.offset.x, info.offset.y)}
/>
```

**layout 动画**
```tsx
<motion.div layout>内容</motion.div>
<motion.div layoutId="shared">共享布局</motion.div>
```

---

## requestAnimationFrame

**rAF 动画循环**
`const <id> = requestAnimationFrame(<callback>);`
```tsx
useEffect(() => {
  let rafId: number;
  const tick = () => {
    setAngle(a => (a + 1) % 360);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}, []);
```

---

## Web Animations API

**element.animate**
`<el>.animate(<keyframes>, <options>);`
```tsx
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = ref.current;
  if (!el) return;
  const anim = el.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: 'translateX(100px)' },
    ],
    { duration: 500, iterations: Infinity, easing: 'ease-in-out' }
  );
  return () => anim.cancel();
}, []);
```
