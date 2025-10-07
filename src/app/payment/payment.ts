
import { Component } from '@angular/core';
import { JsonPipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { supabase } from '../services/supabase-client';

@Component({
	selector: 'app-payment',
	standalone: true,
	templateUrl: './payment.html',
	styleUrls: ['./payment.css'],
			imports: [JsonPipe, NgIf, RouterLink]
})
export class PaymentComponent {
	membership: any = null;
	successMessage = '';

	constructor(private route: ActivatedRoute) {
		this.route.queryParams.subscribe(params => {
			if (params['name'] && params['price'] && params['description'] && params['features']) {
				this.membership = {
					name: params['name'],
					price: params['price'],
					description: params['description'],
					features: params['features'] ? JSON.parse(params['features']) : []
				};
			} else {
				this.membership = null;
			}
		});
	}

		async pagar() {
			// Guardar la membresía en la tabla 'membresias'
						// Mapear el nombre de la membresía al valor permitido por el constraint
						let tipo = 'mensual';
						if (this.membership.name.toLowerCase() === 'corporativa') {
							tipo = 'corporativa';
						} else if (this.membership.name.toLowerCase() === 'evento') {
							tipo = 'evento';
						} else {
							tipo = 'mensual';
						}
						const { data, error } = await supabase.from('membresias').insert([
							{
								tipo_membresia: tipo,
								fecha_inicio: new Date().toISOString(),
								fecha_fin: null,
								beneficios: this.membership.features.join(', ')
							}
						]);
			if (error) {
				this.successMessage = 'Error al guardar: ' + error.message;
			} else {
				this.successMessage = 'Pagado con éxito y guardado en la base de datos.';
			}
		}
}
