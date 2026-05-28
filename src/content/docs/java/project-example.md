---
order: 210
tags:
  - 'java'
  - 'project'
  - 'oop'
difficulty: 'intermediate'
title: 'Java 项目示例：图书管理系统'
module: 'java'
description: '综合运用面向对象、集合框架与文件 I/O 的图书管理系统。'
---

| 用户管理 | 注册、登录、用户信息维护 |
| 借阅管理 | 借书、还书、借阅记录查询 |
| 搜索功能 | 按书名/作者/分类搜索，支持模糊匹配 |
| 统计报表 | 借阅排行、库存统计、用户借阅统计 |
| 数据持久化 | 对象序列化存储到文件 |
| 权限控制 | 管理员/普通用户角色区分 |

## 需求分析

### 数据需求

- 图书：ISBN、书名、作者、出版社、分类、库存数量、借出数量
- 用户：用户ID、用户名、密码、角色、注册日期
- 借阅记录：记录ID、用户ID、ISBN、借出日期、归还日期、状态

### 功能需求

- 管理员可执行所有操作，普通用户仅可借阅和查询
- 借阅数量限制：每人最多借 5 本
- 借阅期限：30 天，超期标记
- 图书搜索支持模糊匹配

### 非功能需求

- 数据通过对象序列化持久化
- 操作日志记录
- 输入合法性校验

## 技术选型

| 技术点   | 选型                                 | 理由                    |
| -------- | ------------------------------------ | ----------------------- |
| 数据模型 | POJO 类 + 封装                       | OOP 原则，信息隐藏      |
| 集合存储 | ArrayList + HashMap                  | 列表遍历 + 键值快速查找 |
| 文件存储 | ObjectOutputStream/ObjectInputStream | 对象序列化，简单直接    |
| 异常处理 | 自定义异常 + try-with-resources      | 精确的错误处理          |
| 搜索     | Stream API + 正则表达式              | 函数式风格，简洁高效    |
| 日志     | java.util.logging                    | 标准库，无需外部依赖    |

## 完整代码

### 实体类

```java
import java.io.Serializable;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

public class Book implements Serializable {
    private static final long serialVersionUID = 1L;

    private String isbn;
    private String title;
    private String author;
    private String publisher;
    private String category;
    private int totalCopies;
    private int borrowedCopies;

    public Book(String isbn, String title, String author,
                String publisher, String category, int totalCopies) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.publisher = publisher;
        this.category = category;
        this.totalCopies = totalCopies;
        this.borrowedCopies = 0;
    }

    public boolean isAvailable() {
        return borrowedCopies < totalCopies;
    }

    public int getAvailableCopies() {
        return totalCopies - borrowedCopies;
    }

    public void borrowCopy() {
        if (!isAvailable()) {
            throw new IllegalStateException("No available copies");
        }
        borrowedCopies++;
    }

    public void returnCopy() {
        if (borrowedCopies <= 0) {
            throw new IllegalStateException("No borrowed copies to return");
        }
        borrowedCopies--;
    }

    public String getIsbn() { return isbn; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getPublisher() { return publisher; }
    public String getCategory() { return category; }
    public int getTotalCopies() { return totalCopies; }
    public int getBorrowedCopies() { return borrowedCopies; }

    public void setTitle(String title) { this.title = title; }
    public void setAuthor(String author) { this.author = author; }
    public void setPublisher(String publisher) { this.publisher = publisher; }
    public void setCategory(String category) { this.category = category; }
    public void setTotalCopies(int totalCopies) { this.totalCopies = totalCopies; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Book book = (Book) o;
        return isbn.equals(book.isbn);
    }

    @Override
    public int hashCode() {
        return Objects.hash(isbn);
    }

    @Override
    public String toString() {
        return String.format("[%s] %s by %s (%d/%d available)",
                isbn, title, author, getAvailableCopies(), totalCopies);
    }
}
```

### 用户类

```java
public enum UserRole {
    ADMIN, USER
}

public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String userId;
    private String username;
    private String password;
    private UserRole role;
    private LocalDate registerDate;
    private int maxBorrowLimit;

    public User(String userId, String username, String password, UserRole role) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.registerDate = LocalDate.now();
        this.maxBorrowLimit = (role == UserRole.ADMIN) ? Integer.MAX_VALUE : 5;
    }

    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    public boolean checkPassword(String input) {
        return password.equals(input);
    }

    public String getUserId() { return userId; }
    public String getUsername() { return username; }
    public UserRole getRole() { return role; }
    public LocalDate getRegisterDate() { return registerDate; }
    public int getMaxBorrowLimit() { return maxBorrowLimit; }

    public void setPassword(String password) { this.password = password; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return userId.equals(user.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }
}
```

### 借阅记录类

```java
public enum BorrowStatus {
    BORROWED, RETURNED, OVERDUE
}

public class BorrowRecord implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final int BORROW_DAYS = 30;

    private String recordId;
    private String userId;
    private String isbn;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private BorrowStatus status;

    public BorrowRecord(String recordId, String userId, String isbn) {
        this.recordId = recordId;
        this.userId = userId;
        this.isbn = isbn;
        this.borrowDate = LocalDate.now();
        this.dueDate = borrowDate.plusDays(BORROW_DAYS);
        this.status = BorrowStatus.BORROWED;
    }

    public void returnBook() {
        this.returnDate = LocalDate.now();
        this.status = BorrowStatus.RETURNED;
    }

    public boolean isOverdue() {
        return status == BorrowStatus.BORROWED && LocalDate.now().isAfter(dueDate);
    }

    public long getOverdueDays() {
        if (!isOverdue()) return 0;
        return ChronoUnit.DAYS.between(dueDate, LocalDate.now());
    }

    public void markOverdue() {
        if (isOverdue()) {
            this.status = BorrowStatus.OVERDUE;
        }
    }

    public String getRecordId() { return recordId; }
    public String getUserId() { return userId; }
    public String getIsbn() { return isbn; }
    public LocalDate getBorrowDate() { return borrowDate; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDate getReturnDate() { return returnDate; }
    public BorrowStatus getStatus() { return status; }
}
```

### 自定义异常

```java
public class LibraryException extends Exception {
    public LibraryException(String message) {
        super(message);
    }
    public LibraryException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class BookNotFoundException extends LibraryException {
    public BookNotFoundException(String isbn) {
        super("Book not found: " + isbn);
    }
}

public class UserNotFoundException extends LibraryException {
    public UserNotFoundException(String userId) {
        super("User not found: " + userId);
    }
}

public class BorrowLimitExceededException extends LibraryException {
    public BorrowLimitExceededException(String userId, int limit) {
        super("User " + userId + " exceeded borrow limit of " + limit);
    }
}

public class BookNotAvailableException extends LibraryException {
    public BookNotAvailableException(String isbn) {
        super("Book not available: " + isbn);
    }
}
```

### 图书管理服务

```java
import java.util.*;
import java.util.stream.Collectors;

public class BookService {
    private final Map<String, Book> bookMap;
    private final List<Book> bookList;

    public BookService() {
        this.bookMap = new HashMap<>();
        this.bookList = new ArrayList<>();
    }

    public void addBook(Book book) throws LibraryException {
        if (bookMap.containsKey(book.getIsbn())) {
            throw new LibraryException("Book with ISBN " + book.getIsbn() + " already exists");
        }
        bookMap.put(book.getIsbn(), book);
        bookList.add(book);
    }

    public void removeBook(String isbn) throws BookNotFoundException {
        Book book = bookMap.remove(isbn);
        if (book == null) {
            throw new BookNotFoundException(isbn);
        }
        bookList.remove(book);
    }

    public void updateBook(String isbn, String title, String author,
                           String publisher, String category, int totalCopies)
            throws BookNotFoundException {
        Book book = getBook(isbn);
        if (title != null) book.setTitle(title);
        if (author != null) book.setAuthor(author);
        if (publisher != null) book.setPublisher(publisher);
        if (category != null) book.setCategory(category);
        if (totalCopies >= 0) book.setTotalCopies(totalCopies);
    }

    public Book getBook(String isbn) throws BookNotFoundException {
        Book book = bookMap.get(isbn);
        if (book == null) {
            throw new BookNotFoundException(isbn);
        }
        return book;
    }

    public List<Book> searchByTitle(String keyword) {
        String lower = keyword.toLowerCase();
        return bookList.stream()
                .filter(b -> b.getTitle().toLowerCase().contains(lower))
                .collect(Collectors.toList());
    }

    public List<Book> searchByAuthor(String keyword) {
        String lower = keyword.toLowerCase();
        return bookList.stream()
                .filter(b -> b.getAuthor().toLowerCase().contains(lower))
                .collect(Collectors.toList());
    }

    public List<Book> searchByCategory(String category) {
        return bookList.stream()
                .filter(b -> b.getCategory().equalsIgnoreCase(category))
                .collect(Collectors.toList());
    }

    public List<Book> getAllBooks() {
        return Collections.unmodifiableList(bookList);
    }

    public List<Book> getAvailableBooks() {
        return bookList.stream()
                .filter(Book::isAvailable)
                .collect(Collectors.toList());
    }

    public Map<String, Long> getCategoryStats() {
        return bookList.stream()
                .collect(Collectors.groupingBy(Book::getCategory, Collectors.counting()));
    }

    public List<Book> getMostBorrowed(int n) {
        return bookList.stream()
                .sorted(Comparator.comparingInt(Book::getBorrowedCopies).reversed())
                .limit(n)
                .collect(Collectors.toList());
    }

    public Collection<Book> getBookMapValues() {
        return bookMap.values();
    }
}
```

### 借阅管理服务

```java
public class BorrowService {
    private final List<BorrowRecord> records;
    private final BookService bookService;
    private final UserService userService;
    private int recordCounter;

    public BorrowService(BookService bookService, UserService userService) {
        this.records = new ArrayList<>();
        this.bookService = bookService;
        this.userService = userService;
        this.recordCounter = 0;
    }

    private String generateRecordId() {
        return "BR" + String.format("%06d", ++recordCounter);
    }

    public BorrowRecord borrowBook(String userId, String isbn)
            throws LibraryException {
        User user = userService.getUser(userId);
        Book book = bookService.getBook(isbn);

        long activeBorrows = records.stream()
                .filter(r -> r.getUserId().equals(userId))
                .filter(r -> r.getStatus() == BorrowStatus.BORROWED
                          || r.getStatus() == BorrowStatus.OVERDUE)
                .count();

        if (activeBorrows >= user.getMaxBorrowLimit()) {
            throw new BorrowLimitExceededException(userId, user.getMaxBorrowLimit());
        }

        if (!book.isAvailable()) {
            throw new BookNotAvailableException(isbn);
        }

        book.borrowCopy();
        BorrowRecord record = new BorrowRecord(generateRecordId(), userId, isbn);
        records.add(record);
        return record;
    }

    public BorrowRecord returnBook(String recordId) throws LibraryException {
        BorrowRecord record = records.stream()
                .filter(r -> r.getRecordId().equals(recordId))
                .findFirst()
                .orElseThrow(() -> new LibraryException("Record not found: " + recordId));

        if (record.getStatus() == BorrowStatus.RETURNED) {
            throw new LibraryException("Book already returned");
        }

        record.returnBook();
        try {
            Book book = bookService.getBook(record.getIsbn());
            book.returnCopy();
        } catch (BookNotFoundException e) {
            // 书已被删除，但仍需完成归还
        }
        return record;
    }

    public List<BorrowRecord> getUserRecords(String userId) {
        return records.stream()
                .filter(r -> r.getUserId().equals(userId))
                .collect(Collectors.toList());
    }

    public List<BorrowRecord> getOverdueRecords() {
        return records.stream()
                .peek(BorrowRecord::markOverdue)
                .filter(r -> r.getStatus() == BorrowStatus.OVERDUE)
                .collect(Collectors.toList());
    }

    public List<BorrowRecord> getAllRecords() {
        return Collections.unmodifiableList(records);
    }

    public void setRecordCounter(int counter) {
        this.recordCounter = counter;
    }

    public int getRecordCounter() {
        return recordCounter;
    }
}
```

### 数据持久化

```java
import java.io.*;

public class DataPersistence {
    private static final String BOOKS_FILE = "books.dat";
    private static final String USERS_FILE = "users.dat";
    private static final String RECORDS_FILE = "records.dat";

    @SuppressWarnings("unchecked")
    public static void saveBooks(Collection<Book> books) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(
                new FileOutputStream(BOOKS_FILE))) {
            oos.writeObject(new ArrayList<>(books));
        }
    }

    @SuppressWarnings("unchecked")
    public static List<Book> loadBooks() throws IOException, ClassNotFoundException {
        File file = new File(BOOKS_FILE);
        if (!file.exists()) return new ArrayList<>();
        try (ObjectInputStream ois = new ObjectInputStream(
                new FileInputStream(BOOKS_FILE))) {
            return (List<Book>) ois.readObject();
        }
    }

    @SuppressWarnings("unchecked")
    public static void saveUsers(Collection<User> users) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(
                new FileOutputStream(USERS_FILE))) {
            oos.writeObject(new ArrayList<>(users));
        }
    }

    @SuppressWarnings("unchecked")
    public static List<User> loadUsers() throws IOException, ClassNotFoundException {
        File file = new File(USERS_FILE);
        if (!file.exists()) return new ArrayList<>();
        try (ObjectInputStream ois = new ObjectInputStream(
                new FileInputStream(USERS_FILE))) {
            return (List<User>) ois.readObject();
        }
    }

    public static void saveRecords(List<BorrowRecord> records, int counter)
            throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(
                new FileOutputStream(RECORDS_FILE))) {
            oos.writeInt(counter);
            oos.writeObject(new ArrayList<>(records));
        }
    }

    @SuppressWarnings("unchecked")
    public static RecordData loadRecords()
            throws IOException, ClassNotFoundException {
        File file = new File(RECORDS_FILE);
        if (!file.exists()) return new RecordData(new ArrayList<>(), 0);
        try (ObjectInputStream ois = new ObjectInputStream(
                new FileInputStream(RECORDS_FILE))) {
            int counter = ois.readInt();
            List<BorrowRecord> records = (List<BorrowRecord>) ois.readObject();
            return new RecordData(records, counter);
        }
    }

    public static class RecordData {
        public final List<BorrowRecord> records;
        public final int counter;
        public RecordData(List<BorrowRecord> records, int counter) {
            this.records = records;
            this.counter = counter;
        }
    }
}
```

### 主程序

```java
import java.util.Scanner;

public class LibraryApp {
    private static BookService bookService = new BookService();
    private static UserService userService = new UserService();
    private static BorrowService borrowService = new BorrowService(bookService, userService);
    private static User currentUser = null;
    private static Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        loadData();
        addDefaultAdmin();

        while (true) {
            if (currentUser == null) {
                showLoginMenu();
            } else if (currentUser.isAdmin()) {
                showAdminMenu();
            } else {
                showUserMenu();
            }
        }
    }

    private static void loadData() {
        try {
            for (Book b : DataPersistence.loadBooks()) {
                bookService.addBook(b);
            }
            for (User u : DataPersistence.loadUsers()) {
                userService.addUser(u);
            }
            DataPersistence.RecordData rd = DataPersistence.loadRecords();
            for (BorrowRecord r : rd.records) {
                // restore records
            }
            borrowService.setRecordCounter(rd.counter);
            System.out.println("Data loaded successfully.");
        } catch (Exception e) {
            System.out.println("No existing data, starting fresh.");
        }
    }

    private static void saveData() {
        try {
            DataPersistence.saveBooks(bookService.getBookMapValues());
            DataPersistence.saveUsers(userService.getAllUsers());
            DataPersistence.saveRecords(borrowService.getAllRecords(),
                    borrowService.getRecordCounter());
        } catch (IOException e) {
            System.out.println("Error saving data: " + e.getMessage());
        }
    }

    private static void addDefaultAdmin() {
        try {
            userService.register("admin", "admin", "admin123", UserRole.ADMIN);
        } catch (LibraryException e) {
            // admin already exists
        }
    }

    private static void showLoginMenu() {
        System.out.println("\n=== Library Management System ===");
        System.out.println("1. Login");
        System.out.println("2. Register");
        System.out.println("3. Search Books");
        System.out.println("0. Exit");
        System.out.print("Choice: ");

        int choice = scanner.nextInt();
        scanner.nextLine();

        switch (choice) {
            case 1: login(); break;
            case 2: register(); break;
            case 3: searchBooks(); break;
            case 0: saveData(); System.exit(0);
        }
    }

    private static void login() {
        System.out.print("Username: ");
        String username = scanner.nextLine();
        System.out.print("Password: ");
        String password = scanner.nextLine();

        try {
            currentUser = userService.login(username, password);
            System.out.println("Welcome, " + currentUser.getUsername() + "!");
        } catch (LibraryException e) {
            System.out.println("Login failed: " + e.getMessage());
        }
    }

    private static void register() {
        System.out.print("Username: ");
        String username = scanner.nextLine();
        System.out.print("Password: ");
        String password = scanner.nextLine();

        try {
            User user = userService.register(username, password, password, UserRole.USER);
            System.out.println("Registered successfully. User ID: " + user.getUserId());
        } catch (LibraryException e) {
            System.out.println("Registration failed: " + e.getMessage());
        }
    }

    private static void searchBooks() {
        System.out.print("Search keyword: ");
        String keyword = scanner.nextLine();
        System.out.println("\nResults by title:");
        bookService.searchByTitle(keyword).forEach(System.out::println);
        System.out.println("Results by author:");
        bookService.searchByAuthor(keyword).forEach(System.out::println);
    }

    private static void showAdminMenu() {
        System.out.println("\n=== Admin Menu ===");
        System.out.println("1. Add Book");
        System.out.println("2. Remove Book");
        System.out.println("3. Update Book");
        System.out.println("4. List All Books");
        System.out.println("5. Search Books");
        System.out.println("6. View Borrow Records");
        System.out.println("7. View Overdue Records");
        System.out.println("8. Statistics");
        System.out.println("9. Logout");
        System.out.print("Choice: ");

        int choice = scanner.nextInt();
        scanner.nextLine();

        switch (choice) {
            case 1: addBook(); break;
            case 2: removeBook(); break;
            case 3: updateBook(); break;
            case 4: bookService.getAllBooks().forEach(System.out::println); break;
            case 5: searchBooks(); break;
            case 6: borrowService.getAllRecords().forEach(System.out::println); break;
            case 7: borrowService.getOverdueRecords().forEach(System.out::println); break;
            case 8: showStatistics(); break;
            case 9: currentUser = null; break;
        }
    }

    private static void showUserMenu() {
        System.out.println("\n=== User Menu ===");
        System.out.println("1. Search Books");
        System.out.println("2. Borrow Book");
        System.out.println("3. Return Book");
        System.out.println("4. My Borrow Records");
        System.out.println("5. Logout");
        System.out.print("Choice: ");

        int choice = scanner.nextInt();
        scanner.nextLine();

        switch (choice) {
            case 1: searchBooks(); break;
            case 2: borrowBook(); break;
            case 3: returnBook(); break;
            case 4:
                borrowService.getUserRecords(currentUser.getUserId())
                        .forEach(System.out::println);
                break;
            case 5: currentUser = null; break;
        }
    }

    private static void addBook() {
        System.out.print("ISBN: "); String isbn = scanner.nextLine();
        System.out.print("Title: "); String title = scanner.nextLine();
        System.out.print("Author: "); String author = scanner.nextLine();
        System.out.print("Publisher: "); String publisher = scanner.nextLine();
        System.out.print("Category: "); String category = scanner.nextLine();
        System.out.print("Total copies: "); int copies = scanner.nextInt();

        try {
            bookService.addBook(new Book(isbn, title, author, publisher, category, copies));
            System.out.println("Book added successfully.");
        } catch (LibraryException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private static void removeBook() {
        System.out.print("ISBN to remove: ");
        String isbn = scanner.nextLine();
        try {
            bookService.removeBook(isbn);
            System.out.println("Book removed.");
        } catch (BookNotFoundException e) {
            System.out.println(e.getMessage());
        }
    }

    private static void updateBook() {
        System.out.print("ISBN to update: "); String isbn = scanner.nextLine();
        System.out.print("New title (or empty): "); String title = scanner.nextLine();
        System.out.print("New author (or empty): "); String author = scanner.nextLine();
        try {
            bookService.updateBook(isbn,
                    title.isEmpty() ? null : title,
                    author.isEmpty() ? null : author,
                    null, null, -1);
            System.out.println("Book updated.");
        } catch (BookNotFoundException e) {
            System.out.println(e.getMessage());
        }
    }

    private static void borrowBook() {
        System.out.print("ISBN to borrow: ");
        String isbn = scanner.nextLine();
        try {
            BorrowRecord record = borrowService.borrowBook(currentUser.getUserId(), isbn);
            System.out.println("Borrowed successfully. Record ID: " + record.getRecordId());
            System.out.println("Due date: " + record.getDueDate());
        } catch (LibraryException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private static void returnBook() {
        System.out.print("Record ID to return: ");
        String recordId = scanner.nextLine();
        try {
            BorrowRecord record = borrowService.returnBook(recordId);
            System.out.println("Returned successfully. Return date: " + record.getReturnDate());
        } catch (LibraryException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private static void showStatistics() {
        System.out.println("\n=== Statistics ===");
        System.out.println("Total books: " + bookService.getAllBooks().size());
        System.out.println("Available books: " + bookService.getAvailableBooks().size());
        System.out.println("\nCategory distribution:");
        bookService.getCategoryStats().forEach((cat, count) ->
                System.out.printf("  %s: %d%n", cat, count));
        System.out.println("\nMost borrowed:");
        bookService.getMostBorrowed(5).forEach(System.out::println);
    }
}
```

## 运行说明

### 编译

```bash
javac -d out src/**/*.java
```

### 运行

```bash
java -cp out LibraryApp
```

### 默认管理员

- 用户名：admin
- 密码：admin123

### 数据文件

- `books.dat` -- 图书数据
- `users.dat` -- 用户数据
- `records.dat` -- 借阅记录数据

## 扩展方向

1. **数据库存储** -- 使用 JDBC 连接 MySQL/SQLite 替代文件序列化
2. **GUI 界面** -- 使用 JavaFX 或 Swing 构建图形界面
3. **网络版** -- 使用 Socket 实现客户端/服务器架构
4. **REST API** -- 使用 Spring Boot 提供 RESTful 接口
5. **密码加密** -- 使用 BCrypt 替代明文存储
6. **预约功能** -- 图书不可借时支持预约排队
7. **罚款计算** -- 超期归还自动计算罚款

---

## 关键代码速查

### 集合操作

```java
List<Book> books = new ArrayList<>();
Map<String, Book> bookMap = new HashMap<>();
books.stream().filter(b -> b.isAvailable()).collect(Collectors.toList());
books.stream().sorted(Comparator.comparingInt(Book::getBorrowedCopies).reversed());
Collectors.groupingBy(Book::getCategory, Collectors.counting());
```

### 对象序列化

```java
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("data.dat"))) {
    oos.writeObject(list);
}
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("data.dat"))) {
    @SuppressWarnings("unchecked")
    List<Book> list = (List<Book>) ois.readObject();
}
```

### 自定义异常

```java
public class LibraryException extends Exception {
    public LibraryException(String message) { super(message); }
}
```

### 枚举类型

```java
public enum UserRole { ADMIN, USER }
public enum BorrowStatus { BORROWED, RETURNED, OVERDUE }
```

### 日期操作

```java
LocalDate.now();
LocalDate.now().plusDays(30);
ChronoUnit.DAYS.between(startDate, endDate);
```
