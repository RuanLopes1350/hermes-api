// Pequenos utilitários compartilhados entre os arquivos de seed — nada
// determinístico (seed de RNG), só o suficiente pra gerar volume variado
// sem repetir bootstrap de aleatoriedade em cada arquivo.

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice<T>(items: T[]): T {
	return items[randomInt(0, items.length - 1)];
}

// Sorteio ponderado: [[valor, peso], ...] — pesos não precisam somar 1.
export function weightedChoice<T>(options: Array<[T, number]>): T {
	const total = options.reduce((sum, [, weight]) => sum + weight, 0);
	let roll = Math.random() * total;
	for (const [value, weight] of options) {
		roll -= weight;
		if (roll <= 0) return value;
	}
	return options[options.length - 1][0];
}

export function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function hoursAgo(n: number): Date {
	return new Date(Date.now() - n * 60 * 60 * 1000);
}

export function minutesAgo(n: number): Date {
	return new Date(Date.now() - n * 60 * 1000);
}

export function minutesFromNow(n: number): Date {
	return new Date(Date.now() + n * 60 * 1000);
}

export function daysFromNow(n: number): Date {
	return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

// Desloca uma data-base por N dias atrás e soma um horário aleatório dentro
// do dia (0h-23h59) — usado pra espalhar volume de e-mail dentro do dia.
export function atRandomTimeOnDay(daysBack: number): Date {
	const base = daysAgo(daysBack);
	base.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59), 0);
	return base;
}
