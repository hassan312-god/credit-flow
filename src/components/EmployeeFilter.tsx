import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface EmployeeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function EmployeeFilter({ value, onChange, className }: EmployeeFilterProps) {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Only show for admin and directeur
  const canFilter = role === 'admin' || role === 'directeur';
  
  useEffect(() => {
    if (!canFilter) return;
    
    const fetchEmployees = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');
        
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, [canFilter]);
  
  if (!canFilter) return null;
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[200px] ${className || ''}`}>
        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Filtrer par employé" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les employés</SelectItem>
        {loading ? (
          <SelectItem value="loading" disabled>Chargement...</SelectItem>
        ) : (
          employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.full_name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
