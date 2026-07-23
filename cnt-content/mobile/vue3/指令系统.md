# 内置指令 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 条件渲染指令

**v-if 条件渲染**
`v-if="<expression>"`
```vue
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>C</div>
```

**v-show 切换显示**
`v-show="<expression>"`
```vue
<h1 v-show="isVisible">Hello</h1>
```

**template + v-if**
```vue
<template v-if="ok">
  <h1>标题</h1>
  <p>段落</p>
</template>
```

---

## 列表渲染指令

**v-for 数组遍历**
`v-for="(<item>, [index]) in <list>" :key="<key>"`
```vue
<li v-for="(item, index) in items" :key="item.id">
  {{ index }}: {{ item.name }}
</li>
```

**v-for 对象遍历**
`v-for="(<value>, [key], [index]) in <object>"`
```vue
<li v-for="(value, key) in user" :key="key">{{ key }}: {{ value }}</li>
```

**v-for 数字范围**
`v-for="<n> in <number>"`
```vue
<span v-for="n in 10" :key="n">{{ n }} </span>
```

**v-for 与 v-if 优先级注意**
```vue
<!-- 推荐写法:用 computed 过滤 -->
<template v-for="item in visibleItems" :key="item.id">
  <li>{{ item.name }}</li>
</template>
```

---

## 属性与事件指令

**v-bind 属性绑定**
`v-bind:<attr>="<value>"` / `:<attr>="<value>"`
```vue
<img :src="url" :alt="altText" />
<button :disabled="isLoading">提交</button>
<div :class="{ active: isActive }" :style="{ color: theme }"></div>
```

**v-bind 动态属性**
`:[<attrExpr>]="<value>"`
```vue
<a :[attrName]="url">链接</a>
```

**v-bind 对象展开**
`v-bind="<object>"`
```vue
<div v-bind="attributeObject"></div>
```

**v-on 事件绑定**
`v-on:<event>[.<modifier>]="<handler>"` / `@<event>[.<modifier>]="<handler>"`
```vue
<button @click="onClick">点击</button>
<form @submit.prevent="onSubmit">提交</form>
<input @keyup.enter="onEnter" />
<a @click.stop="onLinkClick">链接</a>
```

---

## 双向绑定指令

**v-model 基础用法**
`v-model[.<modifier>]="<variable>"`
```vue
<input v-model="message" />
<input v-model.lazy="message" />
<input v-model.number="age" />
<input v-model.trim="text" />
<textarea v-model="content"></textarea>
```

**v-model 不同表单元素**
```vue
<input type="checkbox" v-model="checked" />
<input type="checkbox" value="A" v-model="checkedNames" />
<input type="radio" value="Yes" v-model="picked" />
<select v-model="selected">
  <option value="a">A</option>
</select>
<select v-model="multi" multiple></select>
```

**v-model 绑定到组件**
```vue
<MyInput v-model="text" />
<MyInput v-model:title="title" />
<MyInput v-model:show="isVisible" />
```

---

## 文本渲染指令

**v-text 设置文本**
`v-text="<expression>"`
```vue
<span v-text="message"></span>
```

**v-html 设置 HTML**
`v-html="<htmlString>"`
```vue
<div v-html="rawHtml"></div>
```

**Mustache 插值**
`{{ <expression> }}`
```vue
<span>{{ message }}</span>
<span>{{ count + 1 }}</span>
<span>{{ ok ? '是' : '否' }}</span>
```

---

## 性能优化指令

**v-once 一次性渲染**
`v-once`
```vue
<span v-once>{{ msg }}</span>
<div v-once>
  <h1>{{ title }}</h1>
  <p>{{ content }}</p>
</div>
```

**v-memo 依赖缓存**
`v-memo="[<dep1>, <dep2>, ...]"`
```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
  <span v-if="item.selected">已选</span>
</div>
```

**v-pre 跳过编译**
`v-pre`
```vue
<span v-pre>{{ this will not compile }}</span>
<div v-pre>
  <raw-content>{{ keepAsIs }}</raw-content>
</div>
```

**v-cloak 隐藏未编译**
`v-cloak`
```vue
<div v-cloak>{{ message }}</div>
<style>
[v-cloak] { display: none; }
</style>
```

---

## 指令缩写

**v-bind 缩写**
```vue
<!-- 完整 -->
<img v-bind:src="url" />
<!-- 缩写 -->
<img :src="url" />
<!-- 动态属性缩写 -->
<a :[attrName]="url" />
```

**v-on 缩写**
```vue
<!-- 完整 -->
<button v-on:click="onClick">点击</button>
<!-- 缩写 -->
<button @click="onClick">点击</button>
```
