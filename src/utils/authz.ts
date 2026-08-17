import serviceRepository from '../repository/serviceRepository.js';

export interface CurrentUser {
	id: string;
	role?: string;
	[key: string]: any;
}

// Admins da plataforma (super_admin/admin) têm acesso irrestrito a qualquer
// serviço/template/credencial, mesmo sem serem membros ou donos.
export function isPlatformAdmin(currentUser: CurrentUser): boolean {
	return currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
}

export interface ServiceAccess {
	service: any;
	role: 'owner' | 'member';
}

// Resolve o acesso de um usuário a um serviço. Se o usuário não for membro mas for
// admin da plataforma, trata como se fosse "owner" do serviço (acesso irrestrito).
// Retorna null quando não há acesso nenhum (nem membro, nem admin, nem serviço existe).
export async function resolveServiceAccess(
	serviceId: string,
	currentUser: CurrentUser,
): Promise<ServiceAccess | null> {
	const access = await serviceRepository.findServiceAndUserRole(serviceId, currentUser.id);
	if (access) return access as ServiceAccess;

	if (isPlatformAdmin(currentUser)) {
		const service = await serviceRepository.findById(serviceId);
		if (!service) return null;
		return { service, role: 'owner' };
	}

	return null;
}
