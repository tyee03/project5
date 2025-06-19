"use client"

import { useEffect, useState } from "react"
import { DataTable } from "../../components/data-table"
import { PageHeader } from "../../components/page-header"

export default function ContactsPage() {
  const [contactsData, setContactsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContactsData() {
      try {
        setLoading(true)
        const response = await fetch("/api/contacts")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setContactsData(data)
      } catch (error) {
        console.error("Error fetching contacts:", error)
        setError("Failed to load contacts data")
        setContactsData([])
      } finally {
        setLoading(false)
      }
    }

    fetchContactsData()
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="Contacts" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading contacts data...</div>
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
      <PageHeader title="Contacts" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {error ? (
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
              </div>
            ) : (
              <DataTable data={contactsData} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
