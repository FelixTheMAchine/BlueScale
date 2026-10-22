# Status verificável — 21/10/2026

## Fase 1 — Arquitetura

**Arquivos implementados:** `docs/ARCHITECTURE.md`, `docs/ALGORITHM.md`, `docs/SECURITY.md`, `prisma/schema.prisma` e migration SQL inicial.

## Fase 2 — MVP

| Item | Estado no código | Verificação nesta sessão |
|---|---|---|
| Login Auth.js + RBAC API | Escrito | Não executado em app real |
| Cadastro de membros + CSV/XLSX | Escrito | Não integrado contra PostgreSQL |
| Evento + postos + geração de turnos | Escrito | Não integrado contra PostgreSQL |
| Disponibilidade por evento | Escrito | Validador testado isoladamente |
| Geração determinística | Escrito | **16 testes Node passaram** |
| Edição manual + trava + revisão | Escrito | Não integrado contra PostgreSQL |
| Publicação e validação | Escrito | Não integrado contra PostgreSQL |
| Exportação XLSX com cinco abas | Escrito | Sem teste de arquivo com dependência ExcelJS |
| Persistência PostgreSQL + migration + seed | Arquivos escritos | Docker indisponível; migration não aplicada |
| Build, typecheck, lint, e2e | Scripts presentes | Bloqueados por dependências não instaláveis |

## Fases 3 a 5 — PENDENTES

- Motor CP-SAT, ótimo global, equidade histórica entre eventos, pesos configuráveis, diagnóstico avançado de inviabilidade.
- Trocas, confirmações, presença, notificações, permissões por evento mais granulares, desfazer/refazer, drag-and-drop, regeneração parcial sofisticada.
- Exportações CSV/PDF, relatórios avançados, filtros, edição em massa, gestão completa de usuários e convites.
- Autenticação reforçada (limites de tentativas), testes de integração com banco, suíte E2E abrangente, testes de carga, revisão de LGPD, monitoração e deploy validado.

**Importante:** os modelos dessas funcionalidades podem estar no banco para compatibilidade futura, mas isso não significa que existam fluxos completos no aplicativo.

## Critérios de aceitação do MVP

O código contém suporte para cadastrar 60 pessoas, criar evento/postos, enviar disponibilidade, gerar escala, validar cobertura, editar, exportar XLSX e persistir em PostgreSQL. Entretanto, a aceitação **ainda precisa ser validada ponta a ponta** em máquina com acesso às dependências e banco ativo. Não é correto classificar o MVP como produção pronta.

## Atualização mobile-first — 22/10/2026

- Implementados manifesto PWA e ícones válidos de 192/512px, `sw.js` com cache restrito aos assets públicos e fallback offline sem dados de usuários.
- Navegação inferior móvel + barra superior simplificada e guia `/ajuda` com instruções de instalação Android/iOS.
- Campos de configuração avançada do formulário de eventos recolhidos por padrão; escala abre no quadro por posto.
- Corrigido CTA do dashboard para não apresentar criação de eventos a usuários sem autorização.
- **Testes executados:** 16/16 do núcleo, 4/4 testes estáticos mobile, validação dos 18 modelos e oito enums, análise de sintaxe de 45 arquivos TS/TSX; `public/sw.js` passou no `node --check`.
- **Não executado:** build final, deploy, instalação em aparelhos reais, E2E e verificações da exportação usando dependências, pois `node_modules` e Docker continuam indisponíveis neste ambiente.
- **Não entregue ainda:** notificação push, offline real de escala, um fluxo de coleta pública de disponibilidade totalmente self-service e validação UX com voluntários.
