# BlueScale — Motor de escalas (MVP)

## Sem promessas de otimalidade

O MVP usa um **heurístico determinístico de raridade + custo**. Ele não é um solver CP-SAT e pode deixar uma vaga sem cobertura mesmo existindo uma solução global. Escolhemos primeiro provar a segurança das atribuições e preparar os contratos para um otimizador exato na Fase 3.

## Entrada

`MemberInput[]`, `SlotInput[]`, `Rules`, `locked[]`. Horários sempre ISO UTC. Pessoas incluem status, habilidades, janelas disponíveis e preferências de turno. Turnos têm mínimos, ideais, habilidades obrigatórias e prioridade operacional.

## Restrições rígidas

Para atribuir pessoa `p` ao turno `t`, `assignmentError` exige:

1. Membro ativo e com **intervalo positivo que contenha todo o turno**.
2. Nenhuma indisponibilidade explícita intersectando o turno.
3. Todas as habilidades exigidas no posto.
4. Nenhum turno sobreposto ou violação do intervalo mínimo de descanso.
5. Duração acumulada dentro de `maxMinutesPerMember`.
6. Quantidade de turnos dentro de `maxShiftsPerMember`.
7. Atribuição não duplicada; capacidade ideal não ultrapassada.

## Algoritmo implementado

```text
verificar atribuições travadas (erro se alguma inválida)
ordenar turnos por quantidade de pessoas individualmente aptas,
  prioridade do posto e início (desempate determinístico pelo id)
para cada turno, preencher até a cobertura mínima:
  selecionar pessoa apta e ainda válida com menor custo
após tentar todos os mínimos, preencher vagas opcionais até o ideal
calcular lacunas com razão e quantidade individualmente elegível
validar todas as atribuições; retornar escala parcial e diagnóstico
```

Custo atual aproximado: penalidade por período de preferência, inconveniência de deslocamento **somente se voluntariamente fornecida** e carga acumulada nesta escala. O peso histórico é suportado como campo de entrada, mas ainda não é alimentado com histórico real no adaptador. Logo, **35/25/20/15/5 ainda não é uma configuração implementada**.

A prioridade é: preservar todas as restrições rígidas, tentar mínimos e só então preencher vagas até o ideal. A geração nunca modifica demanda, competências nem disponibilidade para fechar a escala.

## Exemplo de diagnóstico

"Portaria, 22h–23h30: mínimo 6, atribuídos 4, elegíveis individuais 5. Há escassez após verificar habilitação, disponibilidade e conflitos."

Elegibilidade individual não considera conflitos com outras escolhas; ela é distinta da capacidade conjunta. Para o diagnóstico avançado de infeasibilidade, a Fase 3 deverá provar inviabilidade no CP-SAT e fornecer sugestões separadas, nunca ocultar conflito.

## Futuro CP-SAT

Variáveis `x[p,s] ∈ {0,1}`. Restrições para disponibilidade, competências, duração máxima, não sobreposição e descanso. Cobertura mínima/ideal como metas lexicográficas. Etapa 1 maximiza cobertura *sem relaxar segurança*, informando lacunas quando necessário; etapa 2 otimiza equidade histórica e preferências. Travamentos viram igualdades. Registrar seed determinística, tempo máximo, gap, status do solver e explicações. OR-Tools pode rodar em serviço Python isolado com timeout, autenticação de serviço e DTO JSON.

## Testabilidade

`npm run test:core` cobre cenários sem banco. `npm run test` executa propriedades amostradas determinísticas com Vitest. Nenhuma escala deve ir para publicação se `validateSchedule` retornar qualquer erro; isso acontece em `POST /api/events/:id/schedule/publish`.
