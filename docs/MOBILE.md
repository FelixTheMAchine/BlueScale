# BlueScale mobile-first / PWA

## Objetivo de produto

Pessoa gestora sem conhecimento técnico deve conseguir: abrir pelo ícone, cadastrar um integrante, criar uma festa, definir postos, registrar disponibilidade, gerar uma escala, revisar cobertura e baixar um Excel. Evitar termos internos como SQL, solver, UUID ou API na UI.

## Implementado nesta iteração

- Manifesto Next App Router `src/app/manifest.ts` em português; ícones PWA de 192 e 512 px, máscara segura e ícone iOS.
- Meta tags e `viewport-fit=cover` para celular; app standalone após instalação.
- `public/sw.js`: **somente arquivos estáticos** e página de erro offline são armazenados em cache. Qualquer navegação busca a rede, sem cache de dados pessoais de usuários, membros, disponibilidade ou escala. Ausência de internet impede ações de gestão.
- Navegação inferior móvel adaptada ao papel do usuário; menu lateral mantido em desktop.
- `/ajuda`: guia em etapas por tipo de acesso + instruções Android/iOS e botão de instalação quando navegador permitir.
- Formulário de eventos com regras avançadas recolhidas, presets iniciais preservados.
- Quadro por postos como visualização inicial de escala, mais legível em telas estreitas; tabela disponível.
- Sem bibliotecas adicionais.

## Ainda necessário antes de lançar para toda a Gestão de Pessoas

1. Deploy HTTPS em provedor Next.js e PostgreSQL gerenciado com backup. Docker **não é necessário para os usuários nem necessariamente para o desenvolvedor** quando o banco está remoto.
2. Instalação validada em Android Chrome e iPhone Safari (manual "Adicionar à Tela de Início").
3. Testes ponta a ponta com os diversos perfis usando telefones reais e tecnologia assistiva; checagem de contraste e usabilidade.
4. Fluxo real de coleta de disponibilidade no próprio aparelho do membro e confirmações; no MVP existem limitações nesse fluxo, veja STATUS.md.
5. Revisão de segurança/autorização e LGPD antes de cadastrar dados reais.
6. Notificações push, uso offline para operações, QR de convites e publicação de loja são etapas futuras, não estão implementadas.
7. Rodar o build, o lint, Vitest e Playwright numa máquina com `npm install` e Postgres para comprovar executabilidade completa.

## Uso no celular após hospedagem

1. Acesse `https://DOMINIO-DO-PROJETO` no navegador.
2. Android Chrome: menu > Instalar app (se disponível). iPhone Safari: Compartilhar > Adicionar à Tela de Início.
3. Faça login e use as abas **Início**, **Eventos**, **Equipe** (GP), **Ajuda**.
4. Clique em um evento, gere, revise, publique e toque em **Excel**; o sistema devolve um arquivo `.xlsx` ao navegador.

## Advertência sobre arquivos Excel

O dispositivo precisa de um aplicativo capaz de abrir `.xlsx` (por exemplo, Excel ou outro visualizador). O BlueScale gera o arquivo; abrir/editar/compartilhar a planilha depende do sistema operacional e dos aplicativos presentes no aparelho.
