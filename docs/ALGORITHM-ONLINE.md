# Motor de otimização online

Há duas implementações. A aplicação Next.js chama `src/lib/scheduler/optimize.ts`. Se `SOLVER_SERVICE_URL` e `SOLVER_SERVICE_TOKEN` estiverem configuradas, invoca o microserviço FastAPI privado com SciPy/HiGHS (`solver-service/`). Caso indisponível, roda a heurística determinística `core.ts` como fallback. **Toda resposta do solver é revalidada em TypeScript** com `validateSchedule`, inclusive travas e competências; nenhuma solução inválida é salva.

Variáveis MILP: `x[p,s]` binária apenas se pessoa é elegível ao turno e `u[s]` inteira para vagas mínimas descobertas; duas variáveis contínuas por pessoa linearizam o desvio absoluto de carga horária (histórico+evento). Restrições: cobertura mínima via `sum(x)+u>=min`, ideal via `sum(x)<=ideal`, limites de horas e quantidade de turnos, incompatibilidades de sobreposição/descanso, habilitações e disponibilidades, atribuições travadas como `x=1`.

O solver realiza duas otimizações sucessivas: 1) minimizar `sum(u)`; 2) fixar esse mínimo e minimizar penalidade de preferência de horário, deslocamento e equidade aproximada. Critério de justiça inclui carga histórica de eventos publicados anteriores. A otimização só promete ótima global se HiGHS concluir ambos os estágios em status ótimo. Timeout leva ao fallback seguro.

**Limitações:** pesos ainda codificados na heurística e no serviço; preferências de posto e dispersão de competências não modeladas como custo separado; diagnóstico de inviabilidade apresenta vagas faltantes, não um núcleo mínimo de conflitos; 18s por etapa pode ser insuficiente para instâncias grandes. Python depende de SciPy e deve rodar num container/serviço privado, não diretamente em Vercel Edge.
