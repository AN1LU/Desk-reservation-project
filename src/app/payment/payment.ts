
import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { supabase } from '../services/supabase-client';
import { PaymentMethodsService, PaymentMethod } from '../services/payment-methods.service';

@Component({
	selector: 'app-payment',
	standalone: true,
	templateUrl: './payment.html',
	styleUrls: ['./payment.css'],
	imports: [NgFor, NgIf, RouterLink, FormsModule]
})
export class PaymentComponent implements OnInit {
	membership: any = null;
	successMessage = '';
	errorMessage = '';
	
	// Formas de pago
	paymentMethods: PaymentMethod[] = [];
	selectedPaymentMethodId: string | null | undefined = null;
	showAddCard = false;
	processingPayment = false;
	
	// Nueva tarjeta
	newCard = {
		nombre_titular: '',
		numero_tarjeta: '',
		mes_expiracion: '',
		anio_expiracion: '',
		cvv: '',
		tipo_tarjeta: 'visa',
		guardar: false
	};

	// Mensajes de validación
	cardNumberError = '';
	cvvError = '';
	monthError = '';
	yearError = '';
	showSuccessModal = false;
	corporateGroupName = '';

	constructor(private route: ActivatedRoute, private router: Router) {
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

	async ngOnInit() {
		await this.loadPaymentMethods();
	}

	async loadPaymentMethods() {
		this.paymentMethods = await PaymentMethodsService.getUserPaymentMethods();
		
		// Si hay una tarjeta predeterminada, seleccionarla
		const defaultCard = this.paymentMethods.find(pm => pm.is_default);
		if (defaultCard?.id) {
			this.selectedPaymentMethodId = defaultCard.id;
		} else if (this.paymentMethods.length > 0 && this.paymentMethods[0].id) {
			this.selectedPaymentMethodId = this.paymentMethods[0].id;
		}
		
		// Si no hay formas de pago, mostrar el formulario de nueva tarjeta
		if (this.paymentMethods.length === 0) {
			this.showAddCard = true;
		}
	}

	toggleAddCard() {
		this.showAddCard = !this.showAddCard;
		if (!this.showAddCard) {
			this.resetNewCardForm();
		}
	}

	resetNewCardForm() {
		this.newCard = {
			nombre_titular: '',
			numero_tarjeta: '',
			mes_expiracion: '',
			anio_expiracion: '',
			cvv: '',
			tipo_tarjeta: 'visa',
			guardar: false
		};
		this.cardNumberError = '';
		this.cvvError = '';
		this.monthError = '';
		this.yearError = '';
	}

	async saveNewCard() {
		// Reutilizar la validación existente
		if (!this.validateCardFields()) {
			return;
		}

		const ultimos4 = this.newCard.numero_tarjeta.slice(-4);
		
		const paymentMethod: Partial<PaymentMethod> = {
			nombre_titular: this.newCard.nombre_titular,
			ultimos_4_digitos: ultimos4,
			tipo_tarjeta: this.newCard.tipo_tarjeta,
			mes_expiracion: this.newCard.mes_expiracion,
			anio_expiracion: this.newCard.anio_expiracion,
			is_default: this.paymentMethods.length === 0 || this.newCard.guardar
		};

		const result = await PaymentMethodsService.savePaymentMethod(paymentMethod);
		
		if (result.success) {
			await this.loadPaymentMethods();
			this.showAddCard = false;
			this.resetNewCardForm();
			this.successMessage = 'Tarjeta guardada exitosamente.';
			setTimeout(() => this.successMessage = '', 3000);
		} else {
			this.errorMessage = result.error || 'Error al guardar la tarjeta.';
		}
	}

	onCardNumberInput() {
		// Limpiar caracteres no numéricos
		this.newCard.numero_tarjeta = this.newCard.numero_tarjeta.replace(/\D/g, '');
		
		// Validar longitud
		if (this.newCard.numero_tarjeta.length > 0 && this.newCard.numero_tarjeta.length < 16) {
			this.cardNumberError = `Faltan ${16 - this.newCard.numero_tarjeta.length} dígitos.`;
		} else if (this.newCard.numero_tarjeta.length === 16) {
			this.cardNumberError = '';
		}
	}

	onCvvInput() {
		// Limpiar caracteres no numéricos
		this.newCard.cvv = this.newCard.cvv.replace(/\D/g, '');
		
		// Validar longitud
		if (this.newCard.cvv.length > 0 && this.newCard.cvv.length < 3) {
			this.cvvError = `Faltan ${3 - this.newCard.cvv.length} dígitos.`;
		} else if (this.newCard.cvv.length === 3) {
			this.cvvError = '';
		}
	}

	onMonthInput() {
		// Limpiar caracteres no numéricos
		this.newCard.mes_expiracion = this.newCard.mes_expiracion.replace(/\D/g, '');
		
		// Validar mes
		if (this.newCard.mes_expiracion.length > 0) {
			const mes = parseInt(this.newCard.mes_expiracion);
			if (mes < 1 || mes > 12) {
				this.monthError = 'Debe ser entre 01 y 12.';
			} else {
				this.monthError = '';
				// Formatear con cero a la izquierda si es necesario
				if (this.newCard.mes_expiracion.length === 1 && mes >= 1 && mes <= 9) {
					// No formatear automáticamente mientras escribe
				} else if (this.newCard.mes_expiracion.length === 2) {
					this.newCard.mes_expiracion = mes.toString().padStart(2, '0');
				}
			}
		} else {
			this.monthError = '';
		}
	}

	onYearInput() {
		// Limpiar caracteres no numéricos
		this.newCard.anio_expiracion = this.newCard.anio_expiracion.replace(/\D/g, '');
		
		// Validar año
		if (this.newCard.anio_expiracion.length > 0) {
			const anio = parseInt(this.newCard.anio_expiracion);
			if (anio > 40) {
				this.yearError = 'No puede ser mayor a 40.';
			} else {
				this.yearError = '';
			}
		} else {
			this.yearError = '';
		}
	}

	async pagar() {
		// Validaciones
		this.errorMessage = '';
		this.successMessage = '';
		
		if (!this.membership) {
			this.errorMessage = 'No hay una membresía seleccionada.';
			return;
		}

		// Validar nombre de grupo para membresía corporativa ANTES de procesar pago
		const nameLower = String(this.membership.name || '').toLowerCase();
		if (nameLower.includes('corporat')) {
			if (!this.corporateGroupName || !this.corporateGroupName.trim()) {
				this.errorMessage = 'Debes indicar el nombre del grupo para una membresía corporativa.';
				return;
			}
		}

		// Si está usando una tarjeta guardada
		if (!this.showAddCard) {
			if (!this.selectedPaymentMethodId) {
				this.errorMessage = 'Por favor selecciona una forma de pago.';
				return;
			}

			// Procesar pago con tarjeta guardada
			await this.processPaymentWithSavedCard();
			return;
		}

		// Si está agregando una nueva tarjeta, SIEMPRE validar campos
		if (this.showAddCard) {
			// Validar todos los campos obligatorios
			if (!this.validateCardFields()) {
				return; // Los mensajes de error ya están establecidos
			}

			// Si quiere guardar la tarjeta, guardarla primero
			if (this.newCard.guardar) {
				await this.saveNewCard();
				if (this.errorMessage || this.cardNumberError || this.cvvError || this.monthError || this.yearError) {
					return; // Si hubo error al guardar, detener
				}
			}
		}

		// Continuar con el proceso de pago
		await this.completePurchase();
	}

	validateCardFields(): boolean {
		this.errorMessage = '';
		this.cardNumberError = '';
		this.cvvError = '';
		this.monthError = '';
		this.yearError = '';

		// Validar nombre del titular
		if (!this.newCard.nombre_titular || !this.newCard.nombre_titular.trim()) {
			this.errorMessage = 'El nombre del titular es obligatorio.';
			return false;
		}

		// Validar número de tarjeta
		if (!this.newCard.numero_tarjeta) {
			this.cardNumberError = 'El número de tarjeta es obligatorio.';
			return false;
		}

		if (this.newCard.numero_tarjeta.length !== 16) {
			this.cardNumberError = 'El número de tarjeta debe tener exactamente 16 dígitos.';
			return false;
		}

		// Validar mes
		if (!this.newCard.mes_expiracion) {
			this.monthError = 'El mes de expiración es obligatorio.';
			return false;
		}

		const mes = parseInt(this.newCard.mes_expiracion);
		if (isNaN(mes) || mes < 1 || mes > 12) {
			this.monthError = 'El mes debe ser un número entre 01 y 12.';
			return false;
		}

		// Validar año
		if (!this.newCard.anio_expiracion) {
			this.yearError = 'El año de expiración es obligatorio.';
			return false;
		}

		const anio = parseInt(this.newCard.anio_expiracion);
		if (isNaN(anio) || anio > 40) {
			this.yearError = 'El año no puede ser mayor a 40.';
			return false;
		}

		// Validar CVV
		if (!this.newCard.cvv) {
			this.cvvError = 'El CVV es obligatorio.';
			return false;
		}

		if (this.newCard.cvv.length !== 3) {
			this.cvvError = 'El CVV debe tener exactamente 3 dígitos.';
			return false;
		}

		return true;
	}

	async processPaymentWithSavedCard() {
		if (!this.selectedPaymentMethodId) return;

		// Validar nombre de grupo para membresía corporativa ANTES de procesar pago
		const nameLower = String(this.membership?.name || '').toLowerCase();
		if (nameLower.includes('corporat')) {
			if (!this.corporateGroupName || !this.corporateGroupName.trim()) {
				this.errorMessage = 'Debes indicar el nombre del grupo para una membresía corporativa.';
				return;
			}
		}

		this.processingPayment = true;
		this.errorMessage = '';
		this.successMessage = '';

		try {
			// Extraer el precio numérico de la membresía
			const priceStr = String(this.membership.price || '0').replace(/[^0-9.]/g, '');
			const amount = parseFloat(priceStr);

			// Simular procesamiento de pago
			const paymentResult = await PaymentMethodsService.processPayment(this.selectedPaymentMethodId, amount);

			if (paymentResult.success) {
				this.successMessage = `Pago procesado exitosamente. ID Transacción: ${paymentResult.transactionId}`;
				await this.completePurchase();
				
				// Mostrar modal de éxito
				this.showSuccessModal = true;
			} else {
				this.errorMessage = paymentResult.error || 'Error al procesar el pago.';
			}
		} catch (error: any) {
			this.errorMessage = 'Error inesperado al procesar el pago: ' + (error?.message || String(error));
		} finally {
			this.processingPayment = false;
		}
	}

	async completePurchase() {
		this.errorMessage = '';
		this.successMessage = '';
		
		if (!this.membership) {
			this.errorMessage = 'No hay una membresía seleccionada.';
			return;
		}

		// Mapear el nombre de la membresía al valor exacto que espera la DB
		let tipo = 'basica';
		const nameLower = String(this.membership.name || '').toLowerCase();
		if (nameLower.includes('corporat')) {
			tipo = 'corporativa';
		} else if (nameLower.includes('premium')) {
			tipo = 'premium';
		} else {
			tipo = 'basica';
		}

		// Ensure user is logged in
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
			grupoNombre = this.corporateGroupName?.trim() || null;
			if (!grupoNombre) {
				this.errorMessage = 'Debes indicar el nombre del grupo para una membresía corporativa.';
				return;
			}
		}

		// Call Postgres RPC that will create group (if needed) and insert membership in a single transaction
		try {
			console.log('[DEBUG] Calling insert_membresia with:', { tipo, beneficios, grupoNombre });
			const { data: rpcData, error: rpcError } = await supabase.rpc('insert_membresia', {
				p_tipo: tipo,
				p_beneficios: beneficios,
				p_grupo_nombre: grupoNombre
			});

			console.log('[DEBUG] RPC Response:', { rpcData, rpcError });

			if (rpcError) {
				console.error('[DEBUG] RPC Error:', rpcError);
				this.errorMessage = 'Error al guardar (RPC): ' + (rpcError.message ?? String(rpcError));
				return;
			}

			// rpcData es un array con {id_membresia, id_grupo}
			let idTexto = '';
			let grupoId = '';
			if (Array.isArray(rpcData) && rpcData.length > 0) {
				idTexto = String(rpcData[0].id_membresia ?? '');
				grupoId = String(rpcData[0].id_grupo ?? '');
				console.log('[DEBUG] Membership created:', { id_membresia: idTexto, id_grupo: grupoId });
			}
			
			this.successMessage = 'Pago completado con éxito.' + (idTexto ? (' ID membresía: ' + idTexto) : '') + (grupoId ? (' | Grupo ID: ' + grupoId) : '');
			
			// Mostrar modal de éxito
			this.showSuccessModal = true;
		} catch (e: any) {
			console.error('[DEBUG] Exception:', e);
			this.errorMessage = 'Error inesperado al llamar al servidor: ' + (e?.message ?? String(e));
		}
	}

	goToProfile() {
		this.router.navigate(['/profile']);
	}

	goToHome() {
		this.router.navigate(['/home']);
	}
}
