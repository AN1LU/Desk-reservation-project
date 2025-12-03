import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { supabase } from '../services/supabase-client';

interface GroupMember {
  id?: string;
  email: string;
  nombre?: string;
  fecha_agregado?: string;
  rol?: string;
  tipo_membresia?: string;
}

@Component({
  selector: 'app-group-management',
  standalone: true,
  templateUrl: './group-management.html',
  styleUrls: ['./group-management.css'],
  imports: [CommonModule, FormsModule, RouterLink]
})
export class GroupManagementComponent implements OnInit {
  loading = false;
  groupName = '';
  groupMembers: GroupMember[] = [];
  
  // Formulario para agregar miembro
  newMemberEmail = '';
  newMemberName = '';
  
  message = '';
  errorMessage = '';
  
  // Información del grupo
  membershipId: any = null;
  groupId: any = null;
  currentUser: any = null;

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.loadGroupInfo();
  }

  async loadGroupInfo() {
    this.loading = true;
    try {
      const { data: userData } = await supabase.auth.getUser();
      this.currentUser = userData?.user ?? null;
      
      if (!this.currentUser) {
        this.errorMessage = 'Debes iniciar sesión.';
        this.loading = false;
        return;
      }

      // Buscar membresía corporativa del usuario
      const { data: memberships, error: memError } = await supabase
        .from('membresias')
        .select('*')
        .eq('id_usuario_uuid', this.currentUser.id);

      if (memError || !memberships || memberships.length === 0) {
        this.errorMessage = 'No tienes una membresía corporativa activa.';
        this.loading = false;
        return;
      }

      // Buscar la membresía corporativa
      const corporateMembership = memberships.find((m: any) => 
        String(m.tipo_membresia || '').toLowerCase().includes('corporat')
      );

      if (!corporateMembership) {
        this.errorMessage = 'No tienes una membresía corporativa activa.';
        this.loading = false;
        return;
      }

      this.membershipId = corporateMembership.id || corporateMembership.id_membresia;
      this.groupId = corporateMembership.id_grupo;
      
      // Obtener el nombre del grupo desde la tabla grupos
      if (this.groupId) {
        const { data: groupData } = await supabase
          .from('grupos')
          .select('nombre')
          .eq('id_grupo', this.groupId)
          .single();
        
        if (groupData) {
          this.groupName = groupData.nombre;
        }
      } else {
        this.errorMessage = 'La membresía corporativa no tiene un grupo asignado.';
        this.loading = false;
        return;
      }

      await this.loadMembers();
    } catch (e: any) {
      console.error('Error loading group info:', e);
      this.errorMessage = 'Error al cargar información del grupo.';
    } finally {
      this.loading = false;
    }
  }

  async loadMembers() {
    try {
      console.log('[DEBUG] Loading members for group:', this.groupId);
      
      // Usar función RPC para obtener miembros con sus emails
      const { data: membersData, error: memberError } = await supabase.rpc('obtener_miembros_grupo', {
        p_id_grupo: this.groupId
      });

      if (memberError) {
        console.error('[DEBUG] Error loading members:', memberError);
        this.groupMembers = [];
        return;
      }

      console.log('[DEBUG] Members loaded from RPC:', membersData);

      // La función RPC retorna JSON, parsearlo si es string
      const members = Array.isArray(membersData) ? membersData : (membersData ? JSON.parse(membersData) : []);

      if (!members || members.length === 0) {
        this.groupMembers = [];
        return;
      }

      // Obtener usuario actual para identificarlo
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mapear miembros
      this.groupMembers = members.map((member: any) => {
        const isCurrentUser = user && user.id === member.id_usuario;
        
        return {
          id: member.id_usuario,
          email: member.email || 'Sin email',
          nombre: isCurrentUser ? 'Tú' : (member.nombre || 'Sin nombre'),
          fecha_agregado: member.fecha_agregado,
          tipo_membresia: member.tipo_membresia
        };
      });

      console.log('[DEBUG] Group members processed:', this.groupMembers);
    } catch (e) {
      console.error('[DEBUG] Error loading members:', e);
      this.groupMembers = [];
    }
  }

  async addMember() {
    this.message = '';
    this.errorMessage = '';

    if (!this.newMemberEmail || !this.newMemberEmail.trim()) {
      this.errorMessage = 'Debes ingresar un email.';
      return;
    }

    if (!this.newMemberName || !this.newMemberName.trim()) {
      this.errorMessage = 'Debes ingresar el nombre completo del miembro.';
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newMemberEmail)) {
      this.errorMessage = 'El email no tiene un formato válido.';
      return;
    }

    this.loading = true;

    try {
      // Llamar a la función RPC que crea automáticamente una membresía Premium
      const { data, error } = await supabase.rpc('agregar_miembro_grupo', {
        p_email: this.newMemberEmail.toLowerCase().trim(),
        p_nombre: this.newMemberName.trim(),
        p_id_grupo: this.groupId
      });

      console.log('[DEBUG] agregar_miembro_grupo response:', data);

      if (error) {
        throw error;
      }

      if (data && !data.success) {
        this.errorMessage = data.error || 'Error al agregar miembro';
      } else {
        this.message = `✓ Miembro agregado exitosamente con membresía Premium`;
        this.newMemberEmail = '';
        this.newMemberName = '';
        
        // Recargar miembros para mostrar el nuevo miembro
        await this.loadMembers();
        
        setTimeout(() => {
          this.message = '';
        }, 4000);
      }
    } catch (e: any) {
      console.error('Error adding member:', e);
      if (e.message && e.message.includes('no está registrado')) {
        this.errorMessage = 'El usuario debe registrarse en la plataforma primero antes de ser agregado al grupo.';
      } else if (e.message && e.message.includes('ya es miembro')) {
        this.errorMessage = 'Este usuario ya es miembro del grupo.';
      } else {
        this.errorMessage = 'Error al agregar miembro: ' + (e?.message || String(e));
      }
    } finally {
      this.loading = false;
    }
  }

  async removeMember(memberId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este miembro del grupo?')) {
      return;
    }

    this.loading = true;
    try {
      // Eliminar la membresía del usuario
      const { error } = await supabase
        .from('membresias')
        .delete()
        .eq('id_usuario_uuid', memberId)
        .eq('id_grupo', this.groupId);

      if (error) {
        this.errorMessage = 'Error al eliminar miembro: ' + error.message;
      } else {
        this.message = 'Miembro eliminado exitosamente.';
        await this.loadMembers();
        setTimeout(() => {
          this.message = '';
        }, 3000);
      }
    } catch (e: any) {
      this.errorMessage = 'Error: ' + (e?.message || String(e));
    } finally {
      this.loading = false;
    }
  }
}
