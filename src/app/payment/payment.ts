import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { supabase } from '../services/supabase-client';

@Component({
	selector: 'app-payment',
	standalone: true,
	templateUrl: './payment.html',
	styleUrls: ['./payment.css'],
	imports: [NgFor, NgIf, RouterLink, FormsModule]
})
export class PaymentComponent {
	membership: any = null;
	successMessage = '';
	errorMessage = '';

	mostrarPopup = false;

	card = {
		nombre: '',
		numero: '',
		exp: '',
		cvv: ''
	};

	constructor(private route: ActivatedRoute) {
		this.route.queryParams.subscribe(params => {
			if (params['name'] && params['price'] && params['description'] && params['features']) {
				this.membership = {
					name: params['name'],
					price: params['price'],
					description: params['description'],
					features: params['features'] ? JSON.parse(params['features']) : []
				};

				const nameLower = String(this.membership.name || '').toLowerCase();
				if (nameLower === 'básica' || nameLower === 'basica') {
					this.membership.description = 'Acceso limitado a 5 escritorios.';
				}
			} else {
				this.membership = null;
			}
		});
	}

	abrirPopup() {
		this.mostrarPopup = true;
	}

	cerrarPopup() {
		this.mostrarPopup = false;
	}

	async confirmarPago() {
		this.errorMessage = '';

		if (!this.card.nombre || !this.card.numero || !this.card.exp || !this.card.cvv) {
			this.errorMessage = "Todos los campos de pago son obligatorios.";
			return;
		}

		this.mostrarPopup = false;

		// Ahora sí ejecutar tu función pagar()
		await this.pagar();
	}

	async pagar() {
		this.errorMessage = '';
		this.successMessage = '';

		if (!this.membership) {
			this.errorMessage = 'No hay una membresía seleccionada.';
			return;
		}

		let tipo = 'basica';
		const nameLower = String(this.membership.name || '').toLowerCase();
		if (nameLower.includes('corporat')) tipo = 'corporativa';
		else if (nameLower.includes('premium')) tipo = 'premium';

		const now = new Date();
		const addDays = (d: Date, days: number) => {
			const r = new Date(d);
			r.setDate(r.getDate() + days);
			return r;
		};

		const fecha_inicio = now.toISOString();
		const fecha_fin = addDays(now, 30).toISOString();

		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr || !userData.user) {
			this.errorMessage = 'Debes iniciar sesión para comprar una membresía.';
			return;
		}

		let grupoNombre: string | null = null;

		if (tipo === 'corporativa') {
			const groupInput = document.getElementById('groupName') as HTMLInputElement;
			grupoNombre = groupInput?.value?.trim() ?? '';
			if (!grupoNombre) {
				this.errorMessage = 'Debes indicar el nombre del grupo.';
				return;
			}
		}

		const beneficios = (this.membership.features || []).join(', ');

		try {
			const { data: rpcData, error: rpcError } = await supabase.rpc('insert_membresia', {
				p_tipo: tipo,
				p_beneficios: beneficios,
				p_grupo_nombre: grupoNombre
			});

			if (rpcError) {
				this.errorMessage = 'Error al guardar: ' + rpcError.message;
				return;
			}

			this.successMessage = 'Pago realizado con éxito.';

		} catch (e: any) {
			this.errorMessage = 'Error inesperado: ' + (e.message ?? e);
		}
	}
}
