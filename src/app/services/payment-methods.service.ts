import { supabase } from './supabase-client';

export interface PaymentMethod {
  id?: string;
  usuario_id?: string;
  tipo: 'tarjeta';
  nombre_titular: string;
  ultimos_4_digitos: string;
  tipo_tarjeta: string; // visa, mastercard, etc.
  mes_expiracion: string;
  anio_expiracion: string;
  fecha_creacion?: string;
  is_default?: boolean;
}

export class PaymentMethodsService {
  
  /**
   * Obtener todas las formas de pago del usuario actual
   */
  static async getUserPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error('Usuario no autenticado');
      }

      const userId = userData.user.id;

      // Intentar con diferentes nombres de columna
      const candidates = ['usuario_id', 'user_id', 'id_usuario', 'id_usuario_uuid'];
      
      for (const col of candidates) {
        try {
          const { data, error } = await supabase
            .from('formas_pago')
            .select('*')
            .eq(col, userId)
            .order('is_default', { ascending: false })
            .order('fecha_creacion', { ascending: false });
          
          if (!error && data) {
            return data as PaymentMethod[];
          }
        } catch (e) {
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('Error obteniendo formas de pago:', error);
      return [];
    }
  }

  /**
   * Guardar una nueva forma de pago
   */
  static async savePaymentMethod(paymentMethod: Partial<PaymentMethod>): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const userId = userData.user.id;

      // Si es la primera tarjeta o se marca como predeterminada
      if (paymentMethod.is_default) {
        // Desmarcar todas las demás como predeterminadas
        await supabase
          .from('formas_pago')
          .update({ is_default: false })
          .eq('usuario_id', userId);
      }

      const newPaymentMethod = {
        usuario_id: userId,
        tipo: 'tarjeta',
        nombre_titular: paymentMethod.nombre_titular,
        ultimos_4_digitos: paymentMethod.ultimos_4_digitos,
        tipo_tarjeta: paymentMethod.tipo_tarjeta,
        mes_expiracion: paymentMethod.mes_expiracion,
        anio_expiracion: paymentMethod.anio_expiracion,
        is_default: paymentMethod.is_default || false,
        fecha_creacion: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('formas_pago')
        .insert([newPaymentMethod])
        .select();

      if (error) {
        console.error('Error guardando forma de pago:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data?.[0] };
    } catch (error: any) {
      console.error('Error inesperado guardando forma de pago:', error);
      return { success: false, error: error?.message || 'Error inesperado' };
    }
  }

  /**
   * Eliminar una forma de pago
   */
  static async deletePaymentMethod(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('formas_pago')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error inesperado' };
    }
  }

  /**
   * Establecer una forma de pago como predeterminada
   */
  static async setDefaultPaymentMethod(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const userId = userData.user.id;

      // Desmarcar todas las demás
      await supabase
        .from('formas_pago')
        .update({ is_default: false })
        .eq('usuario_id', userId);

      // Marcar la seleccionada
      const { error } = await supabase
        .from('formas_pago')
        .update({ is_default: true })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error inesperado' };
    }
  }

  /**
   * Simular un pago (emulación)
   */
  static async processPayment(paymentMethodId: string, amount: number): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Simulación de procesamiento de pago
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular éxito del pago (90% de éxito)
        const success = Math.random() > 0.1;
        
        if (success) {
          const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          resolve({ success: true, transactionId });
        } else {
          resolve({ success: false, error: 'Pago rechazado. Verifica los datos de tu tarjeta.' });
        }
      }, 1500); // Simular delay de procesamiento
    });
  }
}
