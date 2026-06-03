import axios from 'axios';
import crypto from 'crypto';
import chalk from 'chalk';
import { getTimestamp } from './helpers/dateUtils.js';

export async function dispatchWebhook(url: string, secret: string, payload: any) {
	try {
		const payloadString = JSON.stringify(payload);
		
		// Assina o payload
		const signature = crypto
			.createHmac('sha256', secret)
			.update(payloadString)
			.digest('hex');

		console.log(chalk.blue(`[${getTimestamp()}] [WEBHOOK] Disparando POST para ${url}`));

		const response = await axios.post(url, payloadString, {
			headers: {
				'Content-Type': 'application/json',
				'X-Hermes-Signature': signature
			},
			timeout: 5000 // 5 segundos
		});

		console.log(chalk.green(`[${getTimestamp()}] [WEBHOOK] Sucesso (${response.status})`));
		return response.data;
	} catch (error: any) {
		console.error(chalk.red(`[${getTimestamp()}] [WEBHOOK] Falha ao disparar webhook para ${url}: ${error.message}`));
		throw error;
	}
}
