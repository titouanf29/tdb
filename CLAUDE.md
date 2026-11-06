## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- graphify-out/ is not committed (see .gitignore). If it is missing, build it first: `pip install graphifyy && graphify update .`
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Identité visuelle

Avant de toucher à un écran, lire `web/docs/identite.md` : la charte du site (Public Sans partout, sans italique, ambre pour marquer, ligne datée, sommaire, questions-réponses, pas de tirets cadratins ni d'allure de modèle de site).
