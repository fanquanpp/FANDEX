/**
 * Vitest 全局测试初始化
 *
 * 注册 @testing-library/jest-dom 的自定义匹配器（如 toBeInTheDocument、toHaveAttribute 等），
 * 使所有测试用例无需逐个 import 即可使用。
 */
import '@testing-library/jest-dom/vitest';
