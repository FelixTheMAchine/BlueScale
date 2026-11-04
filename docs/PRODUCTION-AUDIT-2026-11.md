# Auditoria de produção - 04/11/2026

## Escopo
Revisão de autenticação e permissões, dashboard, eventos, postos, membros,
geração/edição/publicação de escalas, presença, exportação, banco e monitoramento.

## Diagnósticos confirmados
- Render Free hiberna após 15 minutos sem solicitações, gerando cold start.
- GitHub Actions teve somente duas verificações agendadas em várias horas
  apesar do cron anterior de cinco minutos: os agendamentos não têm SLA.
- Telas de evento e escala buscavam duas páginas de 30 membros e cortavam
  silenciosamente a listagem de pessoas a partir do registro 61.
- A tela de escala repetia quatro consultas a cada 20 segundos, inclusive
  quando a aba não estava visível.
- A conexão Prisma não era reutilizada globalmente em produção.
- O dashboard buscava registros completos de atribuições para calcular
  contagens e podia incluir eventos cancelados na agenda.

## Correções
- Monitor HTTP a cada no máximo 14 minutos nos slots do cron do GitHub:
  3-59/14 * * * *, sujeito a atrasos e omissões do agendador.
- Rota /api/ping leve, pública e não cacheada, sem consulta ao PostgreSQL;
  /api/health segue consultando o banco para diagnóstico real.
- Diretório /api/members/active com apenas ID, nome e departamento,
  disponível para equipe autorizada, sem o corte de 60 membros.
- Redução de quatro para três chamadas na escala, atualização apenas
  enquanto a página estiver visível e intervalo ampliado para 60 segundos.
  Os formulários continuam atualizando imediatamente após uma edição.
- Pool de conexões Prisma reutilizado no processo e consultas do dashboard
  com seleção dos campos mínimos.
- Testes E2E adicionais para o ping e a exibição de mais de 60 membros.

## Limitações e alertas
- Não é possível garantir 100% de funcionamento apenas com os testes:
  use monitoramento externo de disponibilidade e teste real de usuários.
- GitHub Actions pode atrasar ou omitir agendamentos; um cron NÃO assegura
  operação 24/7 na hospedagem gratuita.
- Render Free tem limite mensal de 750 horas de instância por workspace
  e pode reiniciar o servidor por manutenção.
- A instância PostgreSQL gratuita vence em 21/11/2026. Keepalive NÃO
  prorroga o banco. Migre ou faça upgrade antes do vencimento, com backup.
- Alterações desta revisão não alteram o esquema nem apagam registros.

## Procedimento para verificar
Verifique os três grupos de CI: application (tipos, testes, build e
Playwright), optimizer e container. Depois verifique Render: status Live,
logs de inicialização, /api/ping e /api/health.

Os efeitos sobre a latência percebida não podem ser quantificados somente
pelos testes de integração; seria necessária medição de resposta externa.
