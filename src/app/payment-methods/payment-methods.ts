import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaymentMethodsService, PaymentMethod } from '../services/payment-methods.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  templateUrl: './payment-methods.html',
  styleUrls: ['./payment-methods.css'],
  imports: [CommonModule, RouterLink, FormsModule]
})
export class PaymentMethodsComponent implements OnInit {
  paymentMethods: PaymentMethod[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  showAddCard = false;

  // Mensajes de validación
  cardNumberError = '';
  cvvError = '';
  monthError = '';
  yearError = '';

  // Nueva tarjeta
  newCard = {
    nombre_titular: '',
    numero_tarjeta: '',
    mes_expiracion: '',
    anio_expiracion: '',
    cvv: '',
    tipo_tarjeta: 'visa'
  };

  async ngOnInit() {
    await this.loadPaymentMethods();
  }

  async loadPaymentMethods() {
    this.loading = true;
    try {
      this.paymentMethods = await PaymentMethodsService.getUserPaymentMethods();
    } catch (error: any) {
      this.errorMessage = 'Error cargando formas de pago: ' + (error?.message || String(error));
    } finally {
      this.loading = false;
    }
  }

  toggleAddCard() {
    this.showAddCard = !this.showAddCard;
    if (!this.showAddCard) {
      this.resetNewCardForm();
    }
    this.message = '';
    this.errorMessage = '';
    this.cardNumberError = '';
    this.cvvError = '';
    this.monthError = '';
    this.yearError = '';
  }

  resetNewCardForm() {
    this.newCard = {
      nombre_titular: '',
      numero_tarjeta: '',
      mes_expiracion: '',
      anio_expiracion: '',
      cvv: '',
      tipo_tarjeta: 'visa'
    };
    this.cardNumberError = '';
    this.cvvError = '';
    this.monthError = '';
    this.yearError = '';
  }

  async saveNewCard() {
    this.errorMessage = '';
    this.message = '';
    this.cardNumberError = '';
    this.cvvError = '';
    this.monthError = '';
    this.yearError = '';

    // Validar que todos los campos estén completos
    if (!this.newCard.nombre_titular || !this.newCard.nombre_titular.trim()) {
      this.errorMessage = 'El nombre del titular es obligatorio.';
      return;
    }

    if (!this.newCard.numero_tarjeta) {
      this.cardNumberError = 'El número de tarjeta es obligatorio.';
      return;
    }

    if (this.newCard.numero_tarjeta.length !== 16) {
      this.cardNumberError = 'El número de tarjeta debe tener exactamente 16 dígitos.';
      return;
    }

    if (!this.newCard.mes_expiracion) {
      this.monthError = 'El mes de expiración es obligatorio.';
      return;
    }

    // Validar mes
    const mes = parseInt(this.newCard.mes_expiracion);
    if (isNaN(mes) || mes < 1 || mes > 12) {
      this.monthError = 'El mes debe ser un número entre 01 y 12.';
      return;
    }

    if (!this.newCard.anio_expiracion) {
      this.yearError = 'El año de expiración es obligatorio.';
      return;
    }

    // Validar año
    const anio = parseInt(this.newCard.anio_expiracion);
    if (isNaN(anio) || anio > 40) {
      this.yearError = 'El año no puede ser mayor a 40.';
      return;
    }

    if (!this.newCard.cvv) {
      this.cvvError = 'El CVV es obligatorio.';
      return;
    }

    if (this.newCard.cvv.length !== 3) {
      this.cvvError = 'El CVV debe tener exactamente 3 dígitos.';
      return;
    }

    this.loading = true;
    const ultimos4 = this.newCard.numero_tarjeta.slice(-4);

    const paymentMethod: Partial<PaymentMethod> = {
      nombre_titular: this.newCard.nombre_titular,
      ultimos_4_digitos: ultimos4,
      tipo_tarjeta: this.newCard.tipo_tarjeta,
      mes_expiracion: this.newCard.mes_expiracion,
      anio_expiracion: this.newCard.anio_expiracion,
      is_default: this.paymentMethods.length === 0
    };

    const result = await PaymentMethodsService.savePaymentMethod(paymentMethod);

    if (result.success) {
      await this.loadPaymentMethods();
      this.showAddCard = false;
      this.resetNewCardForm();
      this.message = 'Tarjeta guardada exitosamente.';
      setTimeout(() => this.message = '', 3000);
    } else {
      this.errorMessage = result.error || 'Error al guardar la tarjeta.';
    }

    this.loading = false;
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
        if (this.newCard.mes_expiracion.length === 2) {
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

  async deleteCard(id: string | undefined) {
    if (!id) return;

    const confirm = window.confirm('¿Estás seguro de que deseas eliminar esta tarjeta?');
    if (!confirm) return;

    this.loading = true;
    const result = await PaymentMethodsService.deletePaymentMethod(id);

    if (result.success) {
      await this.loadPaymentMethods();
      this.message = 'Tarjeta eliminada exitosamente.';
      setTimeout(() => this.message = '', 3000);
    } else {
      this.errorMessage = result.error || 'Error al eliminar la tarjeta.';
    }

    this.loading = false;
  }

  async setDefault(id: string | undefined) {
    if (!id) return;

    this.loading = true;
    const result = await PaymentMethodsService.setDefaultPaymentMethod(id);

    if (result.success) {
      await this.loadPaymentMethods();
      this.message = 'Tarjeta predeterminada actualizada.';
      setTimeout(() => this.message = '', 3000);
    } else {
      this.errorMessage = result.error || 'Error al actualizar tarjeta predeterminada.';
    }

    this.loading = false;
  }

  getCardIcon(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'visa': return '💳 VISA';
      case 'mastercard': return '💳 Mastercard';
      case 'amex': return '💳 American Express';
      default: return '💳';
    }
  }
}
