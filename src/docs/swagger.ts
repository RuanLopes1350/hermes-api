import {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
	extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

extendZodWithOpenApi(z);

import {
	createCredentialSchema,
	updateCredentialSchema,
} from '../utils/validation/credentialValidation.js';
import { createEmailSchema, createBulkEmailSchema } from '../utils/validation/emailValidation.js';
import { createServiceSchema, updateServiceSchema } from '../utils/validation/serviceValidation.js';
import {
	createTemplateSchema,
	updateTemplateSchema,
} from '../utils/validation/templateValidation.js';
import {
	createUserSchema,
	updateUserSchema,
	adminUpdateUserSchema,
} from '../utils/validation/userValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registry = new OpenAPIRegistry();

// Security
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
	type: 'http',
	scheme: 'bearer',
	bearerFormat: 'JWT',
	description: 'Sessão Better-Auth',
});
const apiKeyAuth = registry.registerComponent('securitySchemes', 'apiKeyAuth', {
	type: 'apiKey',
	in: 'header',
	name: 'X-API-Key',
	description: 'Chave de API do Serviço',
});

// Common Responses and Requests
const res200 = { description: 'Sucesso' };
const res201 = { description: 'Criado com sucesso' };
const reqParamId = { params: z.object({ id: z.string() }) };
const reqParamSrvId = { params: z.object({ serviceId: z.string() }) };
const reqParamBoth = { params: z.object({ serviceId: z.string(), id: z.string() }) };

/* ================== SERVICES ================== */
registry.registerPath({
	method: 'post',
	path: '/api/services',
	tags: ['Serviços'],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { 'application/json': { schema: createServiceSchema } } } },
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services',
	tags: ['Serviços'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{id}',
	tags: ['Serviços'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'patch',
	path: '/api/services/{id}',
	tags: ['Serviços'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ id: z.string() }),
		body: { content: { 'application/json': { schema: updateServiceSchema } } },
	},
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'delete',
	path: '/api/services/{id}',
	tags: ['Serviços'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});

/* ================== CREDENTIALS ================== */
registry.registerPath({
	method: 'post',
	path: '/api/services/{serviceId}/credentials',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ serviceId: z.string() }),
		body: { content: { 'application/json': { schema: createCredentialSchema } } },
	},
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{serviceId}/credentials',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamSrvId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/credentials',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{serviceId}/credentials/{id}',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamBoth,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'patch',
	path: '/api/services/{serviceId}/credentials/{id}',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ serviceId: z.string(), id: z.string() }),
		body: { content: { 'application/json': { schema: updateCredentialSchema } } },
	},
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'delete',
	path: '/api/services/{serviceId}/credentials/{id}',
	tags: ['Credenciais'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamBoth,
	responses: { 200: res200 },
});

/* ================== EMAILS ================== */
registry.registerPath({
	method: 'post',
	path: '/api/emails',
	tags: ['E-mails'],
	security: [{ [apiKeyAuth.name]: [] }],
	request: { body: { content: { 'application/json': { schema: createEmailSchema } } } },
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'post',
	path: '/api/emails/bulk',
	tags: ['E-mails'],
	security: [{ [apiKeyAuth.name]: [] }],
	request: { body: { content: { 'application/json': { schema: createBulkEmailSchema } } } },
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{serviceId}/emails',
	tags: ['E-mails'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamSrvId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{serviceId}/emails/{id}',
	tags: ['E-mails'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamBoth,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'delete',
	path: '/api/services/{serviceId}/emails/{id}',
	tags: ['E-mails'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamBoth,
	responses: { 200: res200 },
});

/* ================== TEMPLATES ================== */
registry.registerPath({
	method: 'post',
	path: '/api/templates',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { 'application/json': { schema: createTemplateSchema } } } },
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'post',
	path: '/api/services/{serviceId}/templates',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ serviceId: z.string() }),
		body: { content: { 'application/json': { schema: createTemplateSchema } } },
	},
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'get',
	path: '/api/templates',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/templates/{id}',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'patch',
	path: '/api/templates/{id}',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ id: z.string() }),
		body: { content: { 'application/json': { schema: updateTemplateSchema } } },
	},
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'delete',
	path: '/api/templates/{id}',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/services/{serviceId}/templates',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamSrvId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'post',
	path: '/api/services/{serviceId}/templates/preview',
	tags: ['Templates'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamSrvId,
	responses: { 200: res200 },
});

/* ================== USERS ================== */
registry.registerPath({
	method: 'post',
	path: '/api/users',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { 'application/json': { schema: createUserSchema } } } },
	responses: { 201: res201 },
});
registry.registerPath({
	method: 'get',
	path: '/api/users',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/users/{id}',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'patch',
	path: '/api/users/{id}',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ id: z.string() }),
		body: { content: { 'application/json': { schema: updateUserSchema } } },
	},
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'delete',
	path: '/api/users/{id}',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	request: reqParamId,
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'patch',
	path: '/api/users/{id}/admin',
	tags: ['Usuários'],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: z.object({ id: z.string() }),
		body: { content: { 'application/json': { schema: adminUpdateUserSchema } } },
	},
	responses: { 200: res200 },
});

/* ================== DASHBOARD ================== */
registry.registerPath({
	method: 'get',
	path: '/api/dashboard/admin',
	tags: ['Dashboard'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/dashboard/user',
	tags: ['Dashboard'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});
registry.registerPath({
	method: 'get',
	path: '/api/dashboard/stream',
	tags: ['Dashboard'],
	security: [{ [bearerAuth.name]: [] }],
	responses: { 200: res200 },
});

// Build
const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
	openapi: '3.0.0',
	info: {
		version: '1.0.0',
		title: 'Hermes API',
		description: 'API de envio de e-mails transacionais (Gerada via Zod).',
	},
	servers: [{ url: 'http://localhost:3001/' }],
});

const outputPath = path.resolve(__dirname, '../swagger-output.json');
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
console.log('Documentação gerada com sucesso via Zod! ✨');
