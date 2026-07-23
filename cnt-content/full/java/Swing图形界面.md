---
order: 200
tags:
  - java
difficulty: intermediate
title: 'Java Swing 图形界面'
module: java
category: 'Java Basics'
description: 'Swing 组件体系、事件驱动与 GUI 应用开发。'
author: fanquanpp
updated: '2026-05-03'
related:
  - java/网络编程
  - java/SpringCloud微服务开发
  - 'java/项目示例-图书管理系统'
  - java/理论知识点
prerequisites:
  - java/概述与开发环境
---

## 1. Swing 概述 | Swing Overview

Swing 是 Java 提供的一个 GUI (图形用户界面) 工具包，是 AWT (Abstract Window Toolkit) 的增强版本。Swing 提供了丰富的组件和功能，用于创建跨平台的桌面应用程序。

### 1.1 Swing 的特点

- **纯 Java 实现**：Swing 组件完全由 Java 实现，不依赖于底层操作系统的 GUI 组件
- **跨平台**：相同的 Swing 代码可以在不同的操作系统上运行，保持一致的外观和行为
- **轻量级组件**：Swing 组件不依赖于本地平台的 GUI 组件，而是在 Java 中模拟实现
- **丰富的组件**：提供了大量的 GUI 组件，如按钮、文本框、列表、表格等
- **可定制性**：可以通过 Look and Feel 机制更改应用程序的外观
- **事件驱动**：基于事件处理模型，响应用户的操作

### 1.2 Swing 与 AWT 的区别

| 特性                 | AWT                        | Swing            |
| -------------------- | -------------------------- | ---------------- |
| 实现方式             | 依赖本地平台 GUI 组件      | 纯 Java 实现     |
| 组件类型             | 重量级组件                 | 轻量级组件       |
| 外观一致性           | 依赖平台，不同平台外观不同 | 跨平台一致的外观 |
| 组件丰富度           | 基础组件                   | 丰富的组件库     |
| 性能                 | 通常更快                   | 可能稍慢但更灵活 |
| ## 2. Swing 基础组件 | Basic Components           |

Swing 提供了丰富的 GUI 组件，以下是一些常用的基础组件：

### 2.1 顶层容器

- **JFrame**：主窗口，包含标题栏、最小化/最大化/关闭按钮
- **JDialog**：对话框窗口，通常用于显示消息或获取用户输入
- **JApplet**：小程序容器，用于在网页中运行 Java 应用

### 2.2 中间组件

- **JPanel**：面板，用于组织和布局其他组件
- **JScrollPane**：带滚动条的面板，用于显示超出容器大小的内容
- **JSplitPane**：分割面板，用于将容器分为两个可调整大小的部分
- **JTabbedPane**：选项卡面板，用于在同一区域显示多个面板

### 2.3 基本控件

- **JButton**：按钮，用于触发操作
- **JTextField**：文本输入框，用于输入单行文本
- **JTextArea**：文本区域，用于输入多行文本
- **JLabel**：标签，用于显示文本或图像
- **JCheckBox**：复选框，用于选择多个选项
- **JRadioButton**：单选按钮，用于从多个选项中选择一个
- **JComboBox**：下拉列表，用于从预定义选项中选择
- **JList**：列表，用于显示多个选项
- **JTable**：表格，用于显示二维数据
- **JSlider**：滑块，用于在范围内选择值
- **JProgressBar**：进度条，用于显示操作进度

## 3. 布局管理器 | Layout Managers

布局管理器负责组件在容器中的排列方式，Swing 提供了多种布局管理器：

### 3.1 FlowLayout

- **特点**：组件按照从左到右、从上到下的顺序排列
- **适用场景**：简单的组件排列，如按钮组
- **示例**：

```java
 JPanel panel = new JPanel();
 panel.setLayout(new FlowLayout());
 panel.add(new JButton("Button 1"));
 panel.add(new JButton("Button 2"));
 panel.add(new JButton("Button 3"));
```

### 3.2 BorderLayout

- **特点**：将容器分为东、西、南、北、中五个区域
- **适用场景**：主窗口布局，如菜单栏在北，状态栏在南，内容在中
- **示例**：

```java
 JFrame frame = new JFrame("BorderLayout Example");
 frame.setLayout(new BorderLayout());
 frame.add(new JButton("North"), BorderLayout.NORTH);
 frame.add(new JButton("South"), BorderLayout.SOUTH);
 frame.add(new JButton("East"), BorderLayout.EAST);
 frame.add(new JButton("West"), BorderLayout.WEST);
 frame.add(new JButton("Center"), BorderLayout.CENTER);
```

### 3.3 GridLayout

- **特点**：将容器分为规则的网格，每个单元格大小相同
- **适用场景**：需要整齐排列的组件，如计算器按钮
- **示例**：

```java
 JPanel panel = new JPanel();
 panel.setLayout(new GridLayout(3, 3)); // 3行3列
 for (int i = 1; i <= 9; i++) {
  panel.add(new JButton("" + i));
 }
```

### 3.4 GridBagLayout

- **特点**：灵活的网格布局，可以指定组件的位置、大小和权重
- **适用场景**：复杂的布局需求
- **示例**：

```java
 JPanel panel = new JPanel();
 panel.setLayout(new GridBagLayout());
 GridBagConstraints gbc = new GridBagConstraints();
 // 添加第一个组件
 JButton button1 = new JButton("Button 1");
 gbc.gridx = 0;
 gbc.gridy = 0;
 gbc.gridwidth = 1;
 gbc.gridheight = 1;
 gbc.fill = GridBagConstraints.HORIZONTAL;
 panel.add(button1, gbc);
 // 添加第二个组件
 JButton button2 = new JButton("Button 2");
 gbc.gridx = 1;
 gbc.gridy = 0;
 gbc.gridwidth = 2;
 gbc.fill = GridBagConstraints.HORIZONTAL;
 panel.add(button2, gbc);
```

### 3.5 CardLayout

- **特点**：在同一区域显示多个组件，但每次只显示一个
- **适用场景**：选项卡式界面，如向导或多步骤表单
- **示例**：

```java
 JPanel panel = new JPanel();
 CardLayout cardLayout = new CardLayout();
 panel.setLayout(cardLayout);
 // 添加卡片
 panel.add(new JButton("Card 1"), "card1");
 panel.add(new JButton("Card 2"), "card2");
 panel.add(new JButton("Card 3"), "card3");
 // 显示特定卡片
 cardLayout.show(panel, "card2");
```

## 4. 事件处理 | Event Handling

Swing 使用事件处理模型来响应用户的操作，主要包括以下几个部分：

### 4.1 事件类型

- **ActionEvent**：按钮点击、菜单项选择等操作
- **MouseEvent**：鼠标点击、移动、拖动等操作
- **KeyEvent**：键盘按键操作
- **WindowEvent**：窗口打开、关闭、最小化等操作
- **FocusEvent**：组件获得或失去焦点的操作

### 4.2 事件监听器

事件监听器是实现了特定接口的对象，用于处理特定类型的事件：

- **ActionListener**：处理 ActionEvent
- **MouseListener**：处理 MouseEvent
- **KeyListener**：处理 KeyEvent
- **WindowListener**：处理 WindowEvent
- **FocusListener**：处理 FocusEvent

### 4.3 事件处理示例

```java
 import javax.swing.*;
 import java.awt.event.*;
 public class EventHandlingExample {
  public static void main(String[] args) {
  JFrame frame = new JFrame("Event Handling Example");
  frame.setSize(300, 200);
  frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
  JPanel panel = new JPanel();
  JButton button = new JButton("Click Me");
  // 添加动作监听器
  button.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  JOptionPane.showMessageDialog(frame, "Button clicked!");
  }
  });
  panel.add(button);
  frame.add(panel);
  frame.setVisible(true);
  }
 }
```

### 4.4 适配器类

为了简化事件监听器的实现，Swing 提供了适配器类，这些类实现了相应的监听器接口，但所有方法都是空实现：

- **MouseAdapter**：实现 MouseListener 接口
- **KeyAdapter**：实现 KeyListener 接口
- **WindowAdapter**：实现 WindowListener 接口
- **FocusAdapter**：实现 FocusListener 接口
  使用适配器类可以只重写需要的方法，而不是实现所有方法：

```java
 button.addMouseListener(new MouseAdapter() {
  @Override
  public void mouseClicked(MouseEvent e) {
  System.out.println("Mouse clicked!");
  }
 }
```

## 5. Swing 高级特性 | Advanced Features

### 5.1 对话框 | Dialogs

Swing 提供了多种对话框，用于显示消息、获取用户输入等：

- **JOptionPane**：显示消息、确认、输入等对话框
- **JFileChooser**：文件选择对话框
- **JColorChooser**：颜色选择对话框
  示例：

```java
 // 显示消息对话框
 JOptionPane.showMessageDialog(frame, "Hello, Swing!");
 // 显示确认对话框
 int option = JOptionPane.showConfirmDialog(frame, "Are you sure?");
 if (option == JOptionPane.YES_OPTION) {
  System.out.println("User clicked Yes");
 }
 // 显示输入对话框
 String input = JOptionPane.showInputDialog(frame, "Enter your name:");
 System.out.println("User entered: " + input);
 // 显示文件选择对话框
 JFileChooser fileChooser = new JFileChooser();
 int result = fileChooser.showOpenDialog(frame);
 if (result == JFileChooser.APPROVE_OPTION) {
  System.out.println("Selected file: " + fileChooser.getSelectedFile());
 }
 // 显示颜色选择对话框
 Color color = JColorChooser.showDialog(frame, "Choose a color", Color.RED);
 System.out.println("Selected color: " + color);
```

### 5.2 菜单 | Menus

Swing 提供了完整的菜单系统，包括菜单栏、菜单和菜单项：

```java
 JFrame frame = new JFrame("Menu Example");
 frame.setSize(400, 300);
 frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
 // 创建菜单栏
 JMenuBar menuBar = new JMenuBar();
 // 创建文件菜单
 JMenu fileMenu = new JMenu("File");
 JMenuItem newItem = new JMenuItem("New");
 JMenuItem openItem = new JMenuItem("Open");
 JMenuItem saveItem = new JMenuItem("Save");
 JMenuItem exitItem = new JMenuItem("Exit");
 // 添加菜单项到文件菜单
 fileMenu.add(newItem);
 fileMenu.add(openItem);
 fileMenu.add(saveItem);
 fileMenu.addSeparator(); // 添加分隔线
 fileMenu.add(exitItem);
 // 创建编辑菜单
 JMenu editMenu = new JMenu("Edit");
 JMenuItem cutItem = new JMenuItem("Cut");
 JMenuItem copyItem = new JMenuItem("Copy");
 JMenuItem pasteItem = new JMenuItem("Paste");
 // 添加菜单项到编辑菜单
 editMenu.add(cutItem);
 editMenu.add(copyItem);
 editMenu.add(pasteItem);
 // 添加菜单到菜单栏
 menuBar.add(fileMenu);
 menuBar.add(editMenu);
 // 设置菜单栏
 frame.setJMenuBar(menuBar);
 // 添加退出菜单项的监听器
 exitItem.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  System.exit(0);
  }
 }
 frame.setVisible(true);
```

### 5.3 表格 | Tables

JTable 组件用于显示和编辑二维数据：

```java
 JFrame frame = new JFrame("Table Example");
 frame.setSize(500, 300);
 frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
 // 列名
 String[] columnNames = {"ID", "Name", "Age", "City"};
 // 数据
 Object[][] data = {
  {1, "John", 25, "New York"},
  {2, "Mary", 30, "London"},
  {3, "Bob", 35, "Paris"},
  {4, "Alice", 28, "Tokyo"}
 }
 // 创建表格
 JTable table = new JTable(data, columnNames);
 // 添加滚动条
 JScrollPane scrollPane = new JScrollPane(table);
 frame.add(scrollPane);
 frame.setVisible(true);
```

### 5.4 树 | Trees

JTree 组件用于显示层次结构数据：

```java
 JFrame frame = new JFrame("Tree Example");
 frame.setSize(400, 300);
 frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
 // 创建根节点
 defaultMutableTreeNode root = new DefaultMutableTreeNode("Root");
 // 创建子节点
 defaultMutableTreeNode node1 = new DefaultMutableTreeNode("Node 1");
 defaultMutableTreeNode node2 = new DefaultMutableTreeNode("Node 2");
 defaultMutableTreeNode node3 = new DefaultMutableTreeNode("Node 3");
 // 添加子节点到根节点
 root.add(node1);
 root.add(node2);
 root.add(node3);
 // 创建子子节点
 defaultMutableTreeNode node1_1 = new DefaultMutableTreeNode("Node 1.1");
 defaultMutableTreeNode node1_2 = new DefaultMutableTreeNode("Node 1.2");
 node1.add(node1_1);
 node1.add(node1_2);
 // 创建树
 JTree tree = new JTree(root);
 // 添加滚动条
 JScrollPane scrollPane = new JScrollPane(tree);
 frame.add(scrollPane);
 frame.setVisible(true);
```

## 6. 外观与感觉 | Look and Feel

Swing 允许通过 Look and Feel (L&F) 机制更改应用程序的外观：

### 6.1 内置的 Look and Feel

- **Metal**：默认的跨平台外观
- **Nimbus**：现代的跨平台外观
- **Windows**：Windows 风格的外观
- **Windows Classic**：经典 Windows 风格的外观
- **Motif**：Unix/Linux 风格的外观
- **Mac OS X**：Mac 风格的外观（仅在 Mac 系统上可用）

### 6.2 设置 Look and Feel

```java
 import javax.swing.*;
 import javax.swing.plaf.nimbus.NimbusLookAndFeel;
 public class LookAndFeelExample {
  public static void main(String[] args) {
  try {
  // 设置 Nimbus Look and Feel
  UIManager.setLookAndFeel(new NimbusLookAndFeel());
  // 或者使用系统默认的 Look and Feel
  // UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
  } catch (Exception e) {
  e.printStackTrace();
  }
  // 创建并显示 GUI
  JFrame frame = new JFrame("Look and Feel Example");
  frame.setSize(300, 200);
  frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
  JPanel panel = new JPanel();
  panel.add(new JButton("Button"));
  panel.add(new JTextField(20));
  panel.add(new JCheckBox("Check Box"));
  frame.add(panel);
  frame.setVisible(true);
  }
 }
```

## 7. 实战示例 | Practical Examples

### 7.1 简单的计算器

```java
 import javax.swing.*;
 import java.awt.*;
 import java.awt.event.*;
 public class Calculator {
  private JFrame frame;
  private JTextField textField;
  private String operator = "";
  private double firstNumber = 0;
  private boolean start = true;
  public Calculator() {
  frame = new JFrame("Calculator");
  frame.setSize(300, 400);
  frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
  frame.setLayout(new BorderLayout());
  // 创建文本框
  textField = new JTextField();
  textField.setFont(new Font("Arial", Font.PLAIN, 24));
  textField.setHorizontalAlignment(JTextField.RIGHT);
  frame.add(textField, BorderLayout.NORTH);
  // 创建按钮面板
  JPanel buttonPanel = new JPanel();
  buttonPanel.setLayout(new GridLayout(4, 4, 5, 5));
  // 按钮标签
  String[] buttons = {
  "7", "8", "9", "/",
  "4", "5", "6", "*",
  "1", "2", "3", "-",
  "C", "0", "=", "+"
  };
  // 创建并添加按钮
  for (String button : buttons) {
  JButton btn = new JButton(button);
  btn.setFont(new Font("Arial", Font.PLAIN, 18));
  btn.addActionListener(new ButtonClickListener());
  buttonPanel.add(btn);
  }
  frame.add(buttonPanel, BorderLayout.CENTER);
  frame.setVisible(true);
  }
  private class ButtonClickListener implements ActionListener {
  @Override
  public void actionPerformed(ActionEvent e) {
  String command = e.getActionCommand();
  if (command.charAt(0) >= '0' && command.charAt(0) <= '9' || command.equals(".")) {
  if (start) {
  textField.setText("");
  start = false;
  }
  textField.setText(textField.getText() + command);
  } else if (command.equals("C")) {
  textField.setText("");
  operator = "";
  firstNumber = 0;
  start = true;
  } else if (command.equals("=")) {
  double secondNumber = Double.parseDouble(textField.getText());
  double result = 0;
  switch (operator) {
  case "+":
  result = firstNumber + secondNumber;
  break;
  case "-":
  result = firstNumber - secondNumber;
  break;
  case "*":
  result = firstNumber * secondNumber;
  break;
  case "/":
  result = firstNumber / secondNumber;
  break;
  }
  textField.setText(String.valueOf(result));
  operator = "";
  start = true;
  } else {
  if (!start) {
  firstNumber = Double.parseDouble(textField.getText());
  operator = command;
  start = true;
  }
  }
  }
  }
  public static void main(String[] args) {
  new Calculator();
  }
 }
```

### 7.2 简单的文本编辑器

```java
 import javax.swing.*;
 import java.awt.*;
 import java.awt.event.*;
 import java.io.*;
 public class TextEditor {
  private JFrame frame;
  private JTextArea textArea;
  private JMenuBar menuBar;
  private JMenu fileMenu;
  private JMenuItem newItem, openItem, saveItem, exitItem;
  private File currentFile = null;
  public TextEditor() {
  frame = new JFrame("Text Editor");
  frame.setSize(600, 400);
  frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
  // 创建文本区域
  textArea = new JTextArea();
  textArea.setFont(new Font("Arial", Font.PLAIN, 14));
  JScrollPane scrollPane = new JScrollPane(textArea);
  frame.add(scrollPane, BorderLayout.CENTER);
  // 创建菜单栏
  menuBar = new JMenuBar();
  // 创建文件菜单
  fileMenu = new JMenu("File");
  // 创建菜单项
  newItem = new JMenuItem("New");
  openItem = new JMenuItem("Open");
  saveItem = new JMenuItem("Save");
  exitItem = new JMenuItem("Exit");
  // 添加菜单项到文件菜单
  fileMenu.add(newItem);
  fileMenu.add(openItem);
  fileMenu.add(saveItem);
  fileMenu.addSeparator();
  fileMenu.add(exitItem);
  // 添加文件菜单到菜单栏
  menuBar.add(fileMenu);
  // 设置菜单栏
  frame.setJMenuBar(menuBar);
  // 添加事件监听器
  newItem.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  textArea.setText("");
  currentFile = null;
  frame.setTitle("Text Editor");
  }
  });
  openItem.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  JFileChooser fileChooser = new JFileChooser();
  int result = fileChooser.showOpenDialog(frame);
  if (result == JFileChooser.APPROVE_OPTION) {
  currentFile = fileChooser.getSelectedFile();
  try {
  BufferedReader reader = new BufferedReader(new FileReader(currentFile));
  textArea.read(reader, null);
  reader.close();
  frame.setTitle("Text Editor - " + currentFile.getName());
  } catch (IOException ex) {
  ex.printStackTrace();
  }
  }
  }
  });
  saveItem.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  if (currentFile == null) {
  JFileChooser fileChooser = new JFileChooser();
  int result = fileChooser.showSaveDialog(frame);
  if (result == JFileChooser.APPROVE_OPTION) {
  currentFile = fileChooser.getSelectedFile();
  } else {
  return;
  }
  }
  try {
  BufferedWriter writer = new BufferedWriter(new FileWriter(currentFile));
  textArea.write(writer);
  writer.close();
  frame.setTitle("Text Editor - " + currentFile.getName());
  } catch (IOException ex) {
  ex.printStackTrace();
  }
  }
  });
  exitItem.addActionListener(new ActionListener() {
  @Override
  public void actionPerformed(ActionEvent e) {
  System.exit(0);
  }
  });
  frame.setVisible(true);
  }
  public static void main(String[] args) {
  new TextEditor();
  }
 }
```

## 8. 最佳实践 | Best Practices

### 8.1 性能优化

- **使用合适的布局管理器**：根据界面需求选择合适的布局管理器
- **避免过度使用重量级组件**：重量级组件可能影响性能
- **使用 SwingUtilities.invokeLater**：确保 GUI 操作在事件分发线程中执行
- **合理使用组件**：只创建必要的组件，避免创建过多组件

### 8.2 代码组织

- **使用 MVC 模式**：将模型、视图和控制器分离
- **模块化设计**：将功能划分为模块，提高代码可维护性
- **命名规范**：使用清晰的命名规范，提高代码可读性
- **注释**：添加适当的注释，说明代码的功能和逻辑

### 8.3 用户体验

- **响应式设计**：确保界面在不同大小的窗口中都能正常显示
- **合理的布局**：使用合理的布局，使界面美观易用
- **适当的反馈**：对用户操作提供适当的反馈，如进度条、消息框等
- **快捷键**：为常用操作提供快捷键，提高用户操作效率

## 9. 总结 | Summary

Swing 是 Java 提供的功能强大的 GUI 工具包，通过它可以创建跨平台的桌面应用程序。Swing 提供了丰富的组件和功能，包括各种控件、布局管理器、事件处理机制等。
通过学习 Swing，你可以创建各种类型的桌面应用程序，从简单的计算器到复杂的文本编辑器。在实际开发中，应根据具体需求选择合适的组件和布局管理器，并遵循相关的最佳实践，以创建美观、高效、用户友好的应用程序。
