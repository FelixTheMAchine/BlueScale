# Segurança e confiabilidade — revisão de código RC

A proteção depende de ambiente: HTTPS obrigatório, segredos fortes e banco acessível só pelo backend. O PWA não armazena dados privados no service worker. O wrapper Android bloqueia TLS inválido, mixed content e origens não autorizadas; não há bridge JavaScript. A autenticação do servidor usa bcrypt e NextAuth JWT; permissões são recalculadas pela base de dados em cada operação de API.

**Controle de acesso:** Admin cria logins e pode alterar permissões. GP cria e publica escalas. Coordenador precisa da tabela `EventCoordinator` para acessar operações específicas de um evento; não pode editar arbitrariamente escala ou acessar anotações de membros. Membro confirma apenas atribuições próprias, consulta seu histórico e solicita trocas exclusivamente sobre suas atribuições.

**Concorrência:** edição de rascunho exige revisão; publicação, swaps e alterações fazem operações transacionais. A função `validateSchedule` é executada antes da alteração de escala. Há checagem de locks e de status da versão. API retorna 409 para revisão antiga. Cenários reais com duas conexões PostgreSQL ainda requerem teste de integração.

**Autenticação:** limite persistente de oito falhas em janela de 15 minutos por HMAC de e-mail, com bloqueio temporário. Mitiga tentativas repetitivas, mas pode gerar bloqueio de terceiros para contas conhecidas; complementar com limite por IP/rede via gateway/WAF (e respeitar proxy confiável). Senha mínima de 12 caracteres; usuário pode trocá-la em Minha Conta.

**Dados pessoais:** exporta apenas nomes, diretorias, turnos e confirmações. Não exporta telefone, residência ou observações administrativas. `commute` é opcional, nunca localização precisa. Auditoria registra ações e IDs, sem credenciais.

**Pendências antes de produção:** política de retenção e exclusão LGPD, revisão formal de bases legais, proteção WAF/rate limit global, teste DAST/pen test, auditoria de pacotes CVE com dependências instaladas, validação de restore de backup, integrações contra ataques CSRF/XSS, todos os 20 testes E2E exigidos pelo escopo original, revisão de administração de contas e processo de recuperação de acesso.
