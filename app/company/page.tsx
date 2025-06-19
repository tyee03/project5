"use client"

import { useEffect, useState } from "react"
import { CompanyDataTable } from "../../components/company-data-table"
import { PageHeader } from "../../components/page-header"

export default function CompanyPage() {
  const [companyData, setCompanyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompanyData() {
      try {
        setLoading(true)
        const response = await fetch("/api/customers")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setCompanyData(data)
      } catch (error) {
        console.error("Error fetching companies:", error)
        setError("Failed to load company data")
        setCompanyData([])
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyData()
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="Company" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading company data...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Company" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {error ? (
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
              </div>
            ) : (
              <CompanyDataTable data={companyData} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
