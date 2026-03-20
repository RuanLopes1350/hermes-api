## Legenda de Logs do Sistema (Padrão Chalk)

### Estrutura Padrão do Log

```txt
[HH:MM:SS] [TAG] Contexto/Mensagem - Dados Adicionais (opcional)
```

---

## 1. Níveis de Severidade e Avisos

| Tag      | Cor (Chalk)                | Uso                                                                 |
|----------|---------------------------|---------------------------------------------------------------------|
| **ERROR**   | Vermelho Negrito (`chalk.red.bold`)   | Erros críticos que interrompem o fluxo (ex: falhas de conexão, exceções não tratadas, status 500) |
| **WARN**    | Amarelo Negrito (`chalk.yellow.bold`) | Alertas de situações anormais que não quebram a API (ex: senha incorreta, funções depreciadas, retries) |
| **INFO**    | Azul/Ciano (`chalk.blue.bold` / `chalk.cyan.bold`) | Mudanças de estado do sistema e informações gerais (ex: servidor iniciado, serviços carregados) |
| **SUCCESS** | Verde Negrito (`chalk.green.bold`)    | Operações vitais concluídas com êxito (ex: conexão estabelecida, registros criados, migrações finalizadas) |

---

## 2. Contextos Específicos (Desenvolvimento)

| Tag      | Cor (Chalk)                | Uso                                                                 |
|----------|---------------------------|---------------------------------------------------------------------|
| **DB**      | Magenta/Roxo (`chalk.magenta.bold`)   | Execução de queries, sincronização de modelos, operações diretas de leitura/escrita no banco |
| **DEBUG**   | Cinza (`chalk.gray`)                  | Inspeção profunda de código, exibição de payloads, variáveis temporárias, rastreamento passo a passo |

---

## 3. Requisições HTTP (Roteamento)

**Estrutura:**

```txt
[MÉTODO] /caminho/da/rota - STATUS_CODE TempoDeResposta
```

**Cores por Status Code:**

- `2xx` (Sucesso): **Verde** (`chalk.green`)
- `3xx` (Redirecionamento): **Ciano** (`chalk.cyan`)
- `4xx` (Erro do Cliente): **Amarelo** (`chalk.yellow`)
- `5xx` (Erro do Servidor): **Vermelho** (`chalk.red`)