
import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { supabase } from '../services/supabase-client';

@Component({
	selector: 'app-payment',
	standalone: true,
	templateUrl: './payment.html',
	styleUrls: ['./payment.css'],
			imports: [NgFor, NgIf, RouterLink]
})
export class PaymentComponent {
	membership: any = null;
	successMessage = '';
	errorMessage = '';

	constructor(private route: ActivatedRoute) {
		this.route.queryParams.subscribe(params => {
			if (params['name'] && params['price'] && params['description'] && params['features']) {
				this.membership = {
					name: params['name'],
					price: params['price'],
					description: params['description'],
					features: params['features'] ? JSON.parse(params['features']) : []
				};

				// Force correct description for known memberships (ensure correct wording)
				const nameLower = String(this.membership.name || '').toLowerCase();
				if (nameLower === 'básica' || nameLower === 'basica') {
					this.membership.description = 'Acceso limitado a 5 escritorios.';
				}
			} else {
				this.membership = null;
			}
		});
	}

		async pagar() {
			// Validaciones
			this.errorMessage = '';
			this.successMessage = '';
			if (!this.membership) {
				this.errorMessage = 'No hay una membresía seleccionada.';
				return;
			}

			// NOTE: DB/auth integration removed from this component for now.
			// The real save to DB and user validation will be implemented in a dedicated service.

			// Mapear el nombre de la membresía al valor exacto que espera la DB
			// (la columna tipo_membresia está restringida con ANY(ARRAY['basica','premium','corporativa']))
			let tipo = 'basica';
			const nameLower = String(this.membership.name || '').toLowerCase();
			if (nameLower.includes('corporat')) {
				tipo = 'corporativa';
			} else if (nameLower.includes('premium')) {
				tipo = 'premium';
			} else {
				tipo = 'basica';
			}

			// Calcular fechas: fecha_inicio = ahora, fecha_fin según tipo (por defecto 30 días para individuales)
			const now = new Date();
			function addDays(d: Date, days: number) {
				const r = new Date(d);
				r.setDate(r.getDate() + days);
				return r;
			}

			let duracionDias = 30; // default 30 días para membresías mensuales
			// Si en el futuro añades tipos de evento, ajusta aquí la duración.
			const fecha_inicio = now.toISOString();
			const fecha_fin = addDays(now, duracionDias).toISOString();

			// For now we don't create groups or write to DB from this component.
			// If the membership is corporativa, validate that a group name was provided (UI validation only).
			let grupoId: any = null;
			if (tipo === 'corporativa') {
				const groupInput = document.getElementById('groupName') as HTMLInputElement | null;
				const groupName = groupInput?.value?.trim() ?? '';
				if (!groupName) {
					this.errorMessage = 'Debes indicar el nombre del grupo para una membresía corporativa.';
					return;
				}
				// keep grupoId null; actual DB creation will be handled later by a server/service
			}

			// Preparar payload de membresía según esquema actual de la tabla
			// Simulate payment success — DB saving will be implemented later
			// Ensure user is logged in (RPC will use auth.uid() on server side)
			const { data: userData, error: userErr } = await supabase.auth.getUser();
			if (userErr) {
				this.errorMessage = 'Error al obtener usuario: ' + (userErr.message ?? String(userErr));
				return;
			}
			const user = userData?.user ?? null;
			if (!user) {
				this.errorMessage = 'Debes iniciar sesión para comprar una membresía.';
				return;
			}

			// Prepare RPC params
			const beneficios = (this.membership.features || []).join(', ');
			let grupoNombre: string | null = null;
			if (tipo === 'corporativa') {
				const groupInput = document.getElementById('groupName') as HTMLInputElement | null;
				grupoNombre = groupInput?.value?.trim() ?? null;
				if (!grupoNombre) {
					this.errorMessage = 'Debes indicar el nombre del grupo para una membresía corporativa.';
					return;
				}
			}

			// Call Postgres RPC that will create group (if needed) and insert membership in a single transaction
			try {
				const { data: rpcData, error: rpcError } = await supabase.rpc('insert_membresia', {
					p_tipo: tipo,
					p_beneficios: beneficios,
					p_grupo_nombre: grupoNombre
				});

				if (rpcError) {
					this.errorMessage = 'Error al guardar (RPC): ' + (rpcError.message ?? String(rpcError));
					return;
				}

				// rpcData puede ser un número (id devuelto por la función) o un array/obj
				let idTexto = '';
				if (typeof rpcData === 'number') {
					idTexto = String(rpcData);
				} else if (Array.isArray(rpcData) && rpcData.length > 0) {
					idTexto = String(rpcData[0].id_membresia ?? rpcData[0].id ?? '');
				} else if (rpcData && (rpcData as any).id_membresia) {
					idTexto = String((rpcData as any).id_membresia);
				}
				this.successMessage = 'Pagado con éxito.' + (idTexto ? (' ID membresía: ' + idTexto) : '');
			} catch (e: any) {
				this.errorMessage = 'Error inesperado al llamar al servidor: ' + (e?.message ?? String(e));
			}
		}
}
