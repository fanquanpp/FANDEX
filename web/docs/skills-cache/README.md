# Skills 缓存目录

此目录用于缓存从 skillsmp.com 检索的远程 Skill 元数据，避免重复请求。

## 文件命名规则

- `local-skills.json` — 本地 Skills 元数据快照（可选）
- `remote-<hash>.json` — 按 query 哈希命名的远程检索缓存

## 缓存策略

- 有效期：24 小时（由 `scripts/skills-search.mjs` 的 `CACHE_TTL_MS` 控制）
- 超期自动重新检索
- 文件可随时手动删除以强制刷新

## 注意

- 此目录下的 JSON 文件可能包含远程 API 返回的元数据
- 不应包含敏感凭证（API Key 仅在请求头中传递，不写入缓存）
- 如发现敏感信息泄露，请立即删除相关文件并审计
