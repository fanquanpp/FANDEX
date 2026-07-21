# 模板指令 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 文本插值

**Mustache 文本插值**
`{{ <expression> }}`
```vue
<template>
  <span>{{ message }}</span>
  <span>{{ count + 1 }}</span>
  <span>{{ reverseMessage() }}</span>
  <span>{{ user.name + ' - ' + user.age }}</span>
</template>
```

**v-text 设置元素文本**
`v-text="<expression>"`
```vue
<span v-text="message"></span>
```

**v-html 设置 HTML 内容**
`v-html="<htmlString>"`
```vue
<div v-html="rawHtml"></div>
```

---

## 属性绑定 v-bind

**v-bind 单属性绑定**
`v-bind:<attr>="<value>"` / `:<attr>="<value>"`
```vue
<img v-bind:src="imageUrl" />
<a :href="url" :title="title">链接</a>
<button :disabled="isDisabled">提交</button>
```

**动态属性名**
`:[<attrExpr>]="<value>"`
```vue
<a :[attrName]="url">动态属性</a>
```

**对象语法(多属性一次性绑定)**
`:<attr>="{ <key>: <value>, ... }"` / `v-bind="<object>"`
```vue
<div :class="{ active: isActive, 'has-error': hasError }"></div>
<div :style="{ color: activeColor, fontSize: size + 'px' }"></div>
<div v-bind="attributeObject"></div>
```

**数组语法(class/style)**
```vue
<div :class="[activeClass, errorClass]"></div>
<div :class="[isActive ? 'active' : '', errorClass]"></div>
<div :class="[{ active: isActive }, errorClass]"></div>
<div :style="[baseStyles, overridingStyles]"></div>
```

---

## 事件绑定 v-on

**v-on 事件绑定**
`v-on:<event>="<handler>"` / `@<event>="<handler>"`
```vue
<button v-on:click="handleClick">点击</button>
<button @click="count++">+1</button>
<input @input="onInput" @focus="onFocus" />
```

**内联调用与参数**
`@<event>="<handler>(<args>)"`
```vue
<button @click="say('hello', $event)">say</button>
<button @click="handle(item, index)">处理</button>
```

**事件修饰符**
`@<event>.<modifier>="<handler>"`
```vue
<a @click.stop="onClick">阻止冒泡</a>
<form @submit.prevent="onSubmit">阻止默认</form>
<div @click.capture="onClick">捕获模式</div>
<div @click.self="onSelf">仅自身触发</div>
<div @click.once="onClick">只触发一次</div>
<div @scroll.passive="onScroll">滚动优化</div>
```

**按键修饰符**
```vue
<input @keyup.enter="onEnter" />
<input @keyup.esc="onEsc" />
<input @keydown.page-down="onPageDown" />
```

**系统修饰符组合**
```vue
<input @keyup.ctrl.enter="onCtrlEnter" />
<div @click.ctrl="onCtrlClick">Ctrl+Click</div>
<div @click.exact="onExactClick">仅精确按键</div>
```

**鼠标按键修饰符**
```vue
<div @click.left="onLeft">左键</div>
<div @click.right="onRight">右键</div>
<div @click.middle="onMiddle">中键</div>
```

---

## 条件渲染 v-if

**v-if / v-else-if / v-else**
```vue
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>其他</div>
```

**v-show 切换 display**
`v-show="<expression>"`
```vue
<h1 v-show="isVisible">Hello</h1>
```

**template 包裹多元素条件**
```vue
<template v-if="ok">
  <h1>标题</h1>
  <p>段落</p>
</template>
```

---

## 列表渲染 v-for

**v-for 数组遍历**
`v-for="(<item>, [index]) in <array>"` / `v-for="(<item>, [index]) of <array>"`
```vue
<li v-for="(item, index) in items" :key="item.id">
  {{ index }} - {{ item.name }}
</li>
<li v-for="item of items" :key="item.id">{{ item }}</li>
```

**v-for 对象遍历**
`v-for="(<value>, [key], [index]) in <object>"`
```vue
<li v-for="(value, key) in user" :key="key">
  {{ key }}: {{ value }}
</li>
```

**v-for 数字范围**
`v-for="<n> in <number>"`
```vue
<span v-for="n in 10" :key="n">{{ n }}</span>
```

**template 多元素遍历**
```vue
<template v-for="item in items" :key="item.id">
  <li>{{ item.name }}</li>
  <li>{{ item.desc }}</li>
</template>
```

---

## 双向绑定 v-model

**v-model 基础用法**
`v-model="<variable>"`
```vue
<input v-model="message" placeholder="输入" />
<textarea v-model="text"></textarea>
<input type="checkbox" v-model="checked" />
<select v-model="selected"><option value="a">A</option></select>
```

**复选框绑定数组**
```vue
<input type="checkbox" value="A" v-model="checkedNames" />
<input type="checkbox" value="B" v-model="checkedNames" />
```

**单选按钮**
```vue
<input type="radio" value="One" v-model="picked" />
<input type="radio" value="Two" v-model="picked" />
```

**选择框多选**
```vue
<select v-model="multi" multiple>
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**v-model 修饰符**
```vue
<input v-model.lazy="message" />          <!-- 失焦或回车同步 -->
<input v-model.number="age" />            <!-- 转为数字 -->
<input v-model.trim="msg" />              <!-- 去除首尾空格 -->
```

**v-model 自定义组件(双向绑定)**
```vue
<MyInput v-model="searchText" />
<MyInput v-model:modelValue="val" />
<MyInput v-model:title="title" />
```

**组件内定义(defineModel - Vue 3.4+)**
```vue
<!-- Child.vue -->
<script setup>
const model = defineModel();
function update() {
  model.value = 'new value';
}
</script>
```

---

## 其他指令

**v-once 一次性渲染**
```vue
<span v-once>{{ msg }}</span>
<div v-once>
  <h1>静态内容</h1>
  <p>{{ computed }}</p>
</div>
```

**v-memo 性能优化缓存**
`v-memo="[<dep1>, <dep2>]"`
```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
</div>
```

**v-cloak 隐藏未编译模板**
```vue
<div v-cloak>{{ message }}</div>
<style>[v-cloak] { display: none; }</style>
```

**v-pre 跳过编译**
```vue
<span v-pre>{{ this will not be compiled }}</span>
```
