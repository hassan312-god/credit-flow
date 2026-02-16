import { supabase } from '@/integrations/supabase/client'

/**
 * Mask sensitive data fields for exports
 */
export function maskSensitiveData(data: Record<string, any>[], fieldsToMask: string[]): Record<string, any>[] {
  return data.map((item) => {
    const maskedItem = { ...item }
    fieldsToMask.forEach((field) => {
      if (maskedItem[field]) {
        const value = String(maskedItem[field])
        if (field === 'email' && value.includes('@')) {
          // Mask email: j***@gmail.com
          const [local, domain] = value.split('@')
          maskedItem[field] = `${local.charAt(0)}***@${domain}`
        }
        else if (field === 'phone' && value.length > 4) {
          // Mask phone: ***1234
          maskedItem[field] = `***${value.slice(-4)}`
        }
        else if (field === 'id_number' && value.length > 4) {
          // Mask ID number: ****1234
          maskedItem[field] = `****${value.slice(-4)}`
        }
        else if (field === 'monthly_income') {
          // Mask income: show range instead
          const income = Number(value)
          if (income < 100000)
            maskedItem[field] = '< 100K'
          else if (income < 500000)
            maskedItem[field] = '100K-500K'
          else if (income < 1000000)
            maskedItem[field] = '500K-1M'
          else maskedItem[field] = '> 1M'
        }
        else if (field === 'address' && value.length > 10) {
          // Mask address: keep first 10 chars
          maskedItem[field] = `${value.substring(0, 10)}***`
        }
        else if (value.length > 4) {
          // Generic masking for other fields
          maskedItem[field] = `****${value.slice(-4)}`
        }
      }
    })
    return maskedItem
  })
}

/**
 * Log export activity to audit_logs table
 */
export async function logExportActivity(
  exportType: 'PDF' | 'XLSX' | 'CSV',
  dataScope: string,
  recordCount: number,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('Cannot log export: no authenticated user')
      return
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'DATA_EXPORT',
      table_name: 'exports',
      record_id: null,
      new_data: {
        export_type: exportType,
        data_scope: dataScope,
        record_count: recordCount,
        timestamp: new Date().toISOString(),
      },
      ip_address: null, // Client-side cannot reliably get IP
    })

    if (error) {
      console.error('Failed to log export activity:', error)
    }
  }
  catch (error) {
    console.error('Error logging export activity:', error)
  }
}

// Fields that should be masked in exports
export const SENSITIVE_FIELDS = [
  'email',
  'phone',
  'id_number',
  'monthly_income',
  'address',
]
