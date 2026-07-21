# Java IO 流与文件操作

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 字节流

**基本写法：FileInputStream 创建**
`FileInputStream <变量> = new FileInputStream("<文件路径>");`
```java
// 创建字节输入流
FileInputStream fis = new FileInputStream("input.txt");
```

---

**基本写法：读取单字节**
`<fis>.read()`
```java
// 读取一个字节返回 -1 表示结束
int data = fis.read();
```

---

**基本写法：读取多字节**
`<fis>.read(byte[] <缓冲区>)`
```java
// 读取多个字节到缓冲区
byte[] buffer = new byte[1024];
int len = fis.read(buffer);
```

---

**基本写法：FileOutputStream 创建**
`FileOutputStream <变量> = new FileOutputStream("<文件路径>");`
```java
// 创建字节输出流
FileOutputStream fos = new FileOutputStream("output.txt");
```

---

**基本写法：写入字节**
`<fos>.write(<字节>)`
```java
// 写入单个字节
fos.write(65);
```

---

**基本写法：写入字节数组**
`<fos>.write(byte[] <数据>)`
```java
// 写入字节数组
fos.write(buffer);
```

---

**基本写法：关闭流**
`<流>.close();`
```java
// 关闭流释放资源
fis.close();
```

---

## 字符流

**基本写法：FileReader 创建**
`FileReader <变量> = new FileReader("<文件路径>");`
```java
// 创建字符输入流
FileReader fr = new FileReader("input.txt");
```

---

**基本写法：读取单字符**
`<fr>.read()`
```java
// 读取一个字符
int ch = fr.read();
```

---

**基本写法：读取多字符**
`<fr>.read(char[] <缓冲区>)`
```java
// 读取多个字符到缓冲区
char[] buffer = new char[1024];
int len = fr.read(buffer);
```

---

**基本写法：FileWriter 创建**
`FileWriter <变量> = new FileWriter("<文件路径>");`
```java
// 创建字符输出流
FileWriter fw = new FileWriter("output.txt");
```

---

**基本写法：写入字符串**
`<fw>.write("<字符串>")`
```java
// 写入字符串
fw.write("Hello, World!");
```

---

**基本写法：追加写入**
`FileWriter <变量> = new FileWriter("<文件路径>", true);`
```java
// 创建追加模式的 FileWriter
FileWriter fw = new FileWriter("log.txt", true);
```

---

## 缓冲流

**基本写法：BufferedReader 创建**
`BufferedReader <变量> = new BufferedReader(new FileReader("<文件>"));`
```java
// 创建带缓冲的字符输入流
BufferedReader br = new BufferedReader(new FileReader("input.txt"));
```

---

**基本写法：读取一行**
`<br>.readLine()`
```java
// 读取一行文本返回 null 表示结束
String line = br.readLine();
```

---

**基本写法：BufferedWriter 创建**
`BufferedWriter <变量> = new BufferedWriter(new FileWriter("<文件>"));`
```java
// 创建带缓冲的字符输出流
BufferedWriter bw = new BufferedWriter(new FileWriter("output.txt"));
```

---

**基本写法：写入并换行**
`<bw>.write("<字符串>"); <bw>.newLine();`
```java
// 写入字符串并换行
bw.write("Hello");
bw.newLine();
```

---

## try-with-resources

**基本写法：自动关闭资源**
`try (<资源声明>) { }`
```java
// 自动关闭实现 AutoCloseable 的资源
try (FileReader fr = new FileReader("file.txt")) {
}
```

---

**换行写法：多个资源自动关闭**
`try (<资源1>; <资源2>) { }`
```java
// 多个资源按声明逆序自动关闭
try (
    BufferedReader br = new BufferedReader(new FileReader("in.txt"));
    BufferedWriter bw = new BufferedWriter(new FileWriter("out.txt"))
) {
}
```

---

## File 类

**基本写法：创建 File 对象**
`File <变量> = new File("<路径>");`
```java
// 创建 File 对象
File file = new File("test.txt");
```

---

**基本写法：判断文件存在**
`<file>.exists()`
```java
// 判断文件或目录是否存在
boolean exists = file.exists();
```

---

**基本写法：判断是文件**
`<file>.isFile()`
```java
// 判断是否为文件
boolean isFile = file.isFile();
```

---

**基本写法：判断是目录**
`<file>.isDirectory()`
```java
// 判断是否为目录
boolean isDir = file.isDirectory();
```

---

**基本写法：创建文件**
`<file>.createNewFile()`
```java
// 创建新文件
boolean created = file.createNewFile();
```

---

**基本写法：创建目录**
`<file>.mkdir()`
```java
// 创建单层目录
boolean created = file.mkdir();
```

---

**基本写法：创建多层目录**
`<file>.mkdirs()`
```java
// 创建多层目录
boolean created = file.mkdirs();
```

---

**基本写法：删除文件**
`<file>.delete()`
```java
// 删除文件或目录
boolean deleted = file.delete();
```

---

**基本写法：获取文件名**
`<file>.getName()`
```java
// 获取文件名
String name = file.getName();
```

---

**基本写法：获取路径**
`<file>.getPath()`
```java
// 获取路径字符串
String path = file.getPath();
```

---

**基本写法：获取绝对路径**
`<file>.getAbsolutePath()`
```java
// 获取绝对路径
String absPath = file.getAbsolutePath();
```

---

**基本写法：获取文件大小**
`<file>.length()`
```java
// 获取文件字节数
long size = file.length();
```

---

**基本写法：列出目录文件**
`<file>.listFiles()`
```java
// 列出目录下的文件数组
File[] files = dir.listFiles();
```

---

## NIO Path

**基本写法：创建 Path**
`Path <变量> = Paths.get("<路径>");`
```java
// 创建 Path 对象
Path path = Paths.get("test.txt");
```

---

**基本写法：判断文件存在**
`Files.exists(<path>)`
```java
// 判断路径是否存在
boolean exists = Files.exists(path);
```

---

**基本写法：创建文件**
`Files.createFile(<path>)`
```java
// 创建新文件
Files.createFile(path);
```

---

**基本写法：创建目录**
`Files.createDirectory(<path>)`
```java
// 创建目录
Files.createDirectory(path);
```

---

**基本写法：删除文件**
`Files.delete(<path>)`
```java
// 删除文件不存在则抛异常
Files.delete(path);
```

---

**基本写法：复制文件**
`Files.copy(<源路径>, <目标路径>)`
```java
// 复制文件
Files.copy(source, target);
```

---

**基本写法：移动文件**
`Files.move(<源路径>, <目标路径>)`
```java
// 移动或重命名文件
Files.move(source, target);
```

---

## NIO 文件读写

**基本写法：读取所有字节**
`Files.readAllBytes(<path>)`
```java
// 读取文件所有字节
byte[] data = Files.readAllBytes(path);
```

---

**基本写法：读取所有行**
`Files.readAllLines(<path>)`
```java
// 读取文件所有行
List<String> lines = Files.readAllLines(path);
```

---

**基本写法：写入字节**
`Files.write(<path>, <字节数组>)`
```java
// 写入字节数组到文件
Files.write(path, data);
```

---

**基本写法：写入字符串**
`Files.writeString(<path>, "<字符串>")`
```java
// Java 11+ 写入字符串到文件
Files.writeString(path, "Hello");
```

---

**基本写法：读取字符串**
`Files.readString(<path>)`
```java
// Java 11+ 读取文件为字符串
String content = Files.readString(path);
```

---

## 对象序列化

**基本写法：实现 Serializable**
`class <类名> implements Serializable { }`
```java
// 类实现序列化接口
public class User implements Serializable {
}
```

---

**基本写法：序列化对象**
`new ObjectOutputStream(new FileOutputStream("<文件>")).writeObject(<对象>)`
```java
// 将对象写入文件
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("user.dat"))) {
    oos.writeObject(user);
}
```

---

**基本写法：反序列化对象**
`new ObjectInputStream(new FileInputStream("<文件>")).readObject()`
```java
// 从文件读取对象
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user.dat"))) {
    User user = (User) ois.readObject();
}
```

---

**基本写法：transient 关键字**
`transient <类型> <字段名>;`
```java
// 标记字段不参与序列化
private transient String password;
```

---

**基本写法：serialVersionUID**
`private static final long serialVersionUID = <值>L;`
```java
// 定义序列化版本号
private static final long serialVersionUID = 1L;
```
