# Java 数组详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 数组声明

**基本写法：声明数组**
`<类型>[] <变量名>;`
```java
// 声明整型数组
int[] numbers;
```

---

**基本写法：C 风格声明**
`<类型> <变量名>[];`
```java
// C 风格声明数组
int numbers[];
```

---

## 数组创建

**基本写法：指定长度创建**
`<变量名> = new <类型>[<长度>];`
```java
// 创建长度为 5 的数组
numbers = new int[5];
```

---

**基本写法：声明并创建**
`<类型>[] <变量名> = new <类型>[<长度>];`
```java
// 声明并创建数组
int[] numbers = new int[5];
```

---

**基本写法：静态初始化**
`<类型>[] <变量名> = { <元素1>, <元素2>, ... };`
```java
// 声明并初始化数组
int[] numbers = {1, 2, 3, 4, 5};
```

---

**基本写法：new 关键字初始化**
`<类型>[] <变量名> = new <类型>[]{ <元素1>, <元素2> };`
```java
// 使用 new 关键字初始化
int[] numbers = new int[]{1, 2, 3};
```

---

## 数组访问

**基本写法：访问元素**
`<数组>[<索引>]`
```java
// 获取索引为 0 的元素
int first = numbers[0];
```

---

**基本写法：修改元素**
`<数组>[<索引>] = <值>;`
```java
// 修改索引为 0 的元素
numbers[0] = 100;
```

---

**基本写法：获取长度**
`<数组>.length`
```java
// 获取数组长度
int len = numbers.length;
```

---

## 数组遍历

**基本写法：for 循环遍历**
`for (int i = 0; i < <数组>.length; i++) { }`
```java
// 使用索引遍历数组
for (int i = 0; i < numbers.length; i++) {
    int num = numbers[i];
}
```

---

**基本写法：增强 for 循环遍历**
`for (<类型> <变量> : <数组>) { }`
```java
// 使用增强 for 循环遍历
for (int num : numbers) {
}
```

---

## 多维数组

**基本写法：二维数组声明**
`<类型>[][] <变量名> = new <类型>[<行>][<列>];`
```java
// 创建 3 行 4 列的二维数组
int[][] matrix = new int[3][4];
```

---

**基本写法：二维数组初始化**
`<类型>[][] <变量名> = { {<元素>}, {<元素>} };`
```java
// 静态初始化二维数组
int[][] matrix = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
```

---

**基本写法：访问二维数组元素**
`<数组>[<行>][<列>]`
```java
// 获取第二行第三列的元素
int element = matrix[1][2];
```

---

**基本写法：遍历二维数组**
`for (int i = 0; i < <数组>.length; i++) { for (int j = 0; j < <数组>[i].length; j++) { } }`
```java
// 嵌套循环遍历二维数组
for (int i = 0; i < matrix.length; i++) {
    for (int j = 0; j < matrix[i].length; j++) {
        int element = matrix[i][j];
    }
}
```

---

## 不规则数组

**基本写法：创建不规则数组**
`<类型>[][] <变量名> = new <类型>[<行>][];`
```java
// 创建不规则二维数组
int[][] jagged = new int[3][];
jagged[0] = new int[2];
jagged[1] = new int[3];
jagged[2] = new int[4];
```

---

## 数组排序

**基本写法：升序排序**
`Arrays.sort(<数组>);`
```java
// 对数组进行升序排序
int[] numbers = {5, 2, 8, 1, 9};
Arrays.sort(numbers);
```

---

**基本写法：部分排序**
`Arrays.sort(<数组>, <起始索引>, <结束索引>);`
```java
// 对数组指定范围排序
int[] numbers = {5, 2, 8, 1, 9};
Arrays.sort(numbers, 1, 4);
```

---

**基本写法：降序排序**
`Arrays.sort(<数组>, Collections.reverseOrder());`
```java
// 对 Integer 数组降序排序
Integer[] numbers = {5, 2, 8, 1, 9};
Arrays.sort(numbers, Collections.reverseOrder());
```

---

## 数组搜索

**基本写法：二分查找**
`Arrays.binarySearch(<数组>, <目标值>);`
```java
// 在已排序数组中二分查找
int[] numbers = {1, 2, 3, 4, 5};
int index = Arrays.binarySearch(numbers, 3);
```

---

## 数组复制

**基本写法：copyOf 复制**
`Arrays.copyOf(<原数组>, <新长度>);`
```java
// 复制数组并指定新长度
int[] original = {1, 2, 3};
int[] copy = Arrays.copyOf(original, 5);
```

---

**基本写法：copyOfRange 复制**
`Arrays.copyOfRange(<原数组>, <起始>, <结束>);`
```java
// 复制数组指定范围
int[] original = {1, 2, 3, 4, 5};
int[] copy = Arrays.copyOfRange(original, 1, 4);
```

---

**基本写法：System.arraycopy**
`System.arraycopy(<源数组>, <源位置>, <目标数组>, <目标位置>, <长度>);`
```java
// 系统级数组复制
int[] src = {1, 2, 3, 4, 5};
int[] dest = new int[3];
System.arraycopy(src, 1, dest, 0, 3);
```

---

## 数组转换

**基本写法：数组转字符串**
`Arrays.toString(<数组>);`
```java
// 将数组转换为字符串表示
int[] numbers = {1, 2, 3};
String str = Arrays.toString(numbers);
```

---

**基本写法：二维数组转字符串**
`Arrays.deepToString(<数组>);`
```java
// 将多维数组转换为字符串
int[][] matrix = {{1, 2}, {3, 4}};
String str = Arrays.deepToString(matrix);
```

---

**基本写法：数组转 List**
`Arrays.asList(<数组>);`
```java
// 将数组转换为固定大小的 List
String[] arr = {"a", "b", "c"};
List<String> list = Arrays.asList(arr);
```

---

**基本写法：数组转可变 List**
`new ArrayList<>(Arrays.asList(<数组>));`
```java
// 将数组转换为可修改的 ArrayList
String[] arr = {"a", "b", "c"};
List<String> list = new ArrayList<>(Arrays.asList(arr));
```

---

## 数组填充

**基本写法：填充所有元素**
`Arrays.fill(<数组>, <值>);`
```java
// 用指定值填充整个数组
int[] numbers = new int[5];
Arrays.fill(numbers, 0);
```

---

**基本写法：填充指定范围**
`Arrays.fill(<数组>, <起始>, <结束>, <值>);`
```java
// 用指定值填充数组指定范围
int[] numbers = new int[5];
Arrays.fill(numbers, 1, 3, 9);
```

---

## 数组比较

**基本写法：一维数组比较**
`Arrays.equals(<数组1>, <数组2>);`
```java
// 比较两个一维数组内容是否相同
int[] a = {1, 2, 3};
int[] b = {1, 2, 3};
boolean result = Arrays.equals(a, b);
```

---

**基本写法：多维数组比较**
`Arrays.deepEquals(<数组1>, <数组2>);`
```java
// 比较两个多维数组内容是否相同
int[][] a = {{1, 2}, {3, 4}};
int[][] b = {{1, 2}, {3, 4}};
boolean result = Arrays.deepEquals(a, b);
```
