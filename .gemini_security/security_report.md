# Security Audit Report

## VULN-001: Broken Access Control on Global Templates
**Vulnerability Type:** other
**Severity:** Critical
**Source Location:** `src/repository/templateRepository.ts`
**Line Content:** `or(eq(service.owner_id, userId), eq(template.global, true))`
**Description:** The template repository implementation allows any authenticated user to view, update, or delete any template marked as `global`. This occurs because the ownership check (checking if the user owns the service linked to the template) is bypassed if the `global` flag is true. Since templates can be created or updated as global by any user, and there is no record of which user created a global template, this leads to a complete lack of access control for these resources.
**Recommendation:** Implement a `creator_id` field in the `template` table to track ownership even for global templates. Update the repository logic to ensure that only the creator (or an admin) can update or delete global templates.

## VULN-002: Stored Cross-Site Scripting (XSS) in Template Preview
**Vulnerability Type:** other
**Severity:** High
**Source Location:** `src/controller/templateController.ts`
**Line Content:** `const result = await renderTemplate(mjml, variables || {});`
**Description:** The application allows users to create and preview MJML templates which are then rendered into HTML. Because templates can be shared globally (as identified in VULN-001), a malicious user can inject JavaScript into a global template. When another user or administrator previews this template in the dashboard, the injected script could execute in their browser context.
**Recommendation:** Sanitizar o HTML renderizado no backend antes de retorná-lo na API de preview, ou garantir que o frontend utilize um `iframe` com atributo `sandbox` rigoroso.

## VULN-003: Exposição de Metadados em Logs de Banco de Dados
**Vulnerability Type:** other
**Severity:** Low
**Source Location:** `src/config/dbConfig.ts`
**Line Content:** `const db_urlFiltered = "postgresql://" + db_login + ":****@" + db_host + ":" + db_port + "/" + db_name;`
**Description:** Embora o código mascare a senha, ele registra em log o host, a porta, o usuário e o nome do banco de dados em texto claro.
**Recommendation:** Remover o log detalhado da URL de conexão em produção ou registrar apenas o status de sucesso/falha sem detalhes do host.

## VULN-004: Risco de Negação de Serviço (DoS) no Motor de Renderização
**Vulnerability Type:** other
**Severity:** Medium
**Source Location:** `src/routes/templateRoutes.ts`
**Description:** O endpoint `/api/templates/preview` executa operações intensivas de CPU sem Rate Limiting dedicado.
**Recommendation:** Aplicar um middleware de rate limit específico e mais restritivo para as rotas de templates e renderização.
