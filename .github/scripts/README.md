# .github/scripts

Deploy Worker（`.github/workflows/deploy-worker.yml`）用的辅助脚本，来自上游 aozorae/Edgechat，一般不用手动运行：

- `ensure-cloudflare-resources.mjs` — 检查/创建 D1、KV、R2 资源
- `generate-schema-manifest.mjs` — 构建 Worker 前生成 schema manifest
- `generate-admin-bootstrap-sql.mjs` — 用 Secrets 里的管理员账号生成初始化 SQL
- `prepare-d1-migrations.mjs` — 计算并校验 D1 迁移（`--verify` 校验 schema 契约）
- `prepare-worker-encryption-secret.mjs` — 生成/轮换 Worker 加密密钥
- `*.test.mjs` — 对应脚本的测试

> 本文件由 fork 添加，用于首次触发部署流程。
