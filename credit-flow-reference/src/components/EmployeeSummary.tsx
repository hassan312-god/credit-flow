import { FileText, UserCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface EmployeeStats {
  id: string
  full_name: string
  clientsCount: number
  loansCount: number
  totalAmount: number
}

export function EmployeeSummary() {
  const { role } = useAuth()
  const [stats, setStats] = useState<EmployeeStats[]>([])
  const [loading, setLoading] = useState(true)

  const canView = role === 'admin' || role === 'directeur'

  useEffect(() => {
    if (!canView)
      return

    const fetchStats = async () => {
      try {
        // Fetch all profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')

        if (!profiles) {
          setStats([])
          setLoading(false)
          return
        }

        // Fetch clients grouped by creator
        const { data: clients } = await supabase
          .from('clients')
          .select('created_by')

        // Fetch loans grouped by creator
        const { data: loans } = await supabase
          .from('loans')
          .select('created_by, amount')

        // Calculate stats per employee
        const employeeStats: EmployeeStats[] = profiles.map((profile) => {
          const employeeClients = clients?.filter(c => c.created_by === profile.id) || []
          const employeeLoans = loans?.filter(l => l.created_by === profile.id) || []
          const totalAmount = employeeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0)

          return {
            id: profile.id,
            full_name: profile.full_name,
            clientsCount: employeeClients.length,
            loansCount: employeeLoans.length,
            totalAmount,
          }
        })

        // Sort by loans count descending and filter out employees with no activity
        const activeEmployees = employeeStats
          .filter(e => e.clientsCount > 0 || e.loansCount > 0)
          .sort((a, b) => b.loansCount - a.loansCount)

        setStats(activeEmployees)
      }
      catch (error) {
        console.error('Error fetching employee stats:', error)
      }
      finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [canView])

  if (!canView)
    return null

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(amount)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <UserCheck className="w-5 h-5" />
          Activité par employé
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading
          ? (
              <div className="space-y-3">
                {[...Array.from({ length: 3 })].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            )
          : stats.length > 0
            ? (
                <div className="space-y-3">
                  {stats.map((employee, index) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white
                  ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-info' : 'bg-muted-foreground'}`}
                      >
                        {employee.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{employee.full_name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {employee.clientsCount}
                            {' '}
                            clients
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {employee.loansCount}
                            {' '}
                            prêts
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(employee.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            : (
                <div className="text-center py-6 text-muted-foreground">
                  <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              )}
      </CardContent>
    </Card>
  )
}
