import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: string;
  department: string | null;
  // Tambahan opsional bila nanti ditambahkan kolom department_id di user_roles
  department_id?: string | null;
}

interface Department {
  id: string;
  name: string;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUserRoles(), fetchDepartments()]);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAll();
    return () => { active = false; };
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
        // Coba ambil dengan department_id (jika belum ada akan error kolom tidak ditemukan)
        let userRoles: UserRole[] | null = null;
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, department, department_id')
          .eq('user_id', user.id);
        if (error) {
          // Jika error karena kolom tidak ada, fallback tanpa department_id
          if ((error as any).code === '42703' || (error as any).message?.includes('department_id')) {
            const { data: dataFallback, error: err2 } = await supabase
              .from('user_roles')
              .select('role, department')
              .eq('user_id', user.id);
            if (err2) throw err2;
            userRoles = dataFallback as UserRole[];
          } else {
            throw error;
          }
        } else {
          userRoles = data as UserRole[];
        }
        setRoles(userRoles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data: departmentsData, error } = await supabase
        .from('departments')
        .select('id, name');

      if (error) throw error;

      setDepartments(departmentsData || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const hasRole = (role: string): boolean => {
    return roles.some(r => r.role === role);
  };

  const isOwner = (): boolean => hasRole('owner');
  const isAdmin = (): boolean => hasRole('admin');
  const isHeadmaster = (): boolean => hasRole('headmaster');
  const isBorrower = (): boolean => hasRole('borrower');

  const getUserDepartment = (): string | null => {
    const ownerRole = roles.find(r => r.role === 'owner');
    return ownerRole?.department || null;
  };

  const getUserDepartmentId = (): string | null => {
    const ownerRole = roles.find(r => r.role === 'owner');
    if (!ownerRole) return null;
    if (ownerRole.department_id) return ownerRole.department_id; // gunakan jika tersedia
    if (!ownerRole.department) return null;
    const dept = departments.find(d => d.name === ownerRole.department);
    return dept?.id || null;
  };

  const canManageInventory = (): boolean => {
    return isAdmin() || isOwner();
  };

  const canApproveRequests = (): boolean => {
    return isAdmin() || isOwner() || isHeadmaster();
  };

  const getRoleLabels = (): string[] => {
    const roleMap: Record<string, string> = {
      borrower: 'Peminjam',
      owner: 'Pemilik Alat',
      headmaster: 'Kepala Sekolah',
      admin: 'Administrator'
    };

    return roles.map(r => roleMap[r.role] || r.role);
  };

  return {
    roles,
    departments,
    loading,
    error,
    hasRole,
    isOwner,
    isAdmin,
    isHeadmaster,
    isBorrower,
    getUserDepartment,
    getUserDepartmentId,
    canManageInventory,
    canApproveRequests,
    getRoleLabels,
    refetch: async () => {
      setLoading(true);
      await Promise.all([fetchUserRoles(), fetchDepartments()]);
      setLoading(false);
    }
  };
};