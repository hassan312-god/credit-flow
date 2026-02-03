import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Trophy } from 'lucide-react';

interface EmployeePerformance {
  name: string;
  clients: number;
  loans: number;
  amount: number;
  payments: number;
}

export function EmployeePerformanceChart() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmployeePerformance[]>([]);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (role !== 'admin' && role !== 'directeur') {
        setLoading(false);
        return;
      }

      try {
        // Get all profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name');

        if (!profiles) {
          setLoading(false);
          return;
        }

        // Get clients, loans and payments for each employee
        const performanceData: EmployeePerformance[] = [];

        for (const profile of profiles) {
          // Count clients created by this user
          const { count: clientsCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', profile.id);

          // Get loans created by this user
          const { data: loansData } = await supabase
            .from('loans')
            .select('amount')
            .eq('created_by', profile.id);

          // Get payments recorded by this user
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('amount')
            .eq('recorded_by', profile.id);

          const totalLoansAmount = loansData?.reduce((sum, l) => sum + Number(l.amount), 0) || 0;
          const totalPaymentsAmount = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

          // Only add employees who have some activity
          if ((clientsCount || 0) > 0 || (loansData?.length || 0) > 0 || (paymentsData?.length || 0) > 0) {
            performanceData.push({
              name: profile.full_name.split(' ')[0], // Use first name for shorter labels
              clients: clientsCount || 0,
              loans: loansData?.length || 0,
              amount: totalLoansAmount / 1000000, // Convert to millions for readability
              payments: totalPaymentsAmount / 1000000,
            });
          }
        }

        // Sort by total loans amount (descending)
        performanceData.sort((a, b) => b.amount - a.amount);

        setData(performanceData);
      } catch (error) {
        console.error('Error fetching employee performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [role]);

  if (role !== 'admin' && role !== 'directeur') {
    return null;
  }

  const formatCurrency = (value: number) => `${value.toFixed(1)}M`;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Performance par employé
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 bg-muted rounded animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Aucune donnée de performance disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                className="text-xs"
                tickFormatter={formatCurrency}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-xs" 
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Décaissements' || name === 'Recouvrements') {
                    return [`${value.toFixed(2)}M FCFA`, name];
                  }
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                dataKey="amount" 
                fill="hsl(217, 91%, 60%)" 
                name="Décaissements" 
                radius={[0, 4, 4, 0]} 
              />
              <Bar 
                dataKey="payments" 
                fill="hsl(160, 84%, 39%)" 
                name="Recouvrements" 
                radius={[0, 4, 4, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
