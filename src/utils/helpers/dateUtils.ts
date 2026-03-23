export function getTimestamp() {
	return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}
