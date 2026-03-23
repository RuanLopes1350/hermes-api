// Classe base para todos os erros de domínio da aplicação.
// O errorHandler global reconhece qualquer erro que possua
// `statusCode` e `errorCode`, portanto todos os Services devem
// estender (ou usar diretamente) esta classe.
export class DomainError extends Error {
	public readonly statusCode: number;
	public readonly errorCode: string;

	constructor(message: string, statusCode: number, errorCode: string) {
		super(message);
		this.name = 'DomainError';
		this.statusCode = statusCode;
		this.errorCode = errorCode;
	}
}
