import React, { useState, useMemo } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"

// 샘플 데이터 타입 정의
type Forecast = {
  predictedDate: string;
  predictedQuantity: number;
}

type ActualSales = {
  date: string;
  quantity: number;
}

type Company = {
  customerId: number | string;
  companyName: string | null;
  companySize: string | null;
}

// 차트 설정
const chartConfig = {
  predictedQuantity: { label: "예측 수량 (월별)", color: "#8884d8" },
  actualSalesMonthly: { label: "실제 수량 (월별)", color: "#82ca9d" },
}

// 샘플 데이터
const sampleCompanies: Company[] = [
  { customerId: 1, companyName: "삼성전자", companySize: "대기업" },
  { customerId: 2, companyName: "LG전자", companySize: "대기업" },
  { customerId: 3, companyName: "SK하이닉스", companySize: "대기업" },
  { customerId: 4, companyName: "현대자동차", companySize: "대기업" },
  { customerId: 5, companyName: "포스코", companySize: "중견기업" },
  { customerId: 6, companyName: "네이버", companySize: "중견기업" },
  { customerId: 7, companyName: "카카오", companySize: "중견기업" },
  { customerId: 8, companyName: "스타트업A", companySize: "중소기업" },
  { customerId: 9, companyName: "스타트업B", companySize: "중소기업" },
]

const sampleForecastData: Forecast[] = [
  { predictedDate: "2024-01-01T00:00:00", predictedQuantity: 1500 },
  { predictedDate: "2024-02-01T00:00:00", predictedQuantity: 1800 },
  { predictedDate: "2024-03-01T00:00:00", predictedQuantity: 2100 },
  { predictedDate: "2024-04-01T00:00:00", predictedQuantity: 1900 },
  { predictedDate: "2024-05-01T00:00:00", predictedQuantity: 2300 },
  { predictedDate: "2024-06-01T00:00:00", predictedQuantity: 2500 },
]

const sampleActualSales: ActualSales[] = [
  { date: "2024-01-15", quantity: 1200 },
  { date: "2024-01-20", quantity: 300 },
  { date: "2024-02-10", quantity: 1600 },
  { date: "2024-02-25", quantity: 400 },
  { date: "2024-03-05", quantity: 1800 },
  { date: "2024-03-18", quantity: 500 },
  { date: "2024-04-12", quantity: 1700 },
  { date: "2024-04-28", quantity: 350 },
  { date: "2024-05-08", quantity: 2000 },
  { date: "2024-05-22", quantity: 450 },
]

// 회사 검색 콤보박스 컴포넌트
function CompanySearchCombobox({
  companies,
  value,
  onSelect,
}: {
  companies: Company[]
  value: string | null
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedCompany = companies.find(
    (company) => String(company.customerId) === value
  )

  const getDisplayValue = (company: Company | undefined) => {
    if (!company) return "회사를 선택하세요..."
    const name = company.companyName || `Customer ${company.customerId}`
    return company.companySize ? `${name} (${company.companySize})` : name
  }

  const filteredCompanies = companies.filter(company => {
    const searchText = `${company.companyName || ''} ${company.companySize || ''}`.toLowerCase()
    return searchText.includes(search.toLowerCase())
  })

  return (
    <div className="relative w-full md:w-56">
      <button
        onClick={() => setOpen(!open)}
        className="w-full justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
      >
        <span className="truncate">{getDisplayValue(selectedCompany)}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="회사명 또는 규모로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredCompanies.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredCompanies.map((company) => (
                <button
                  key={company.customerId}
                  onClick={() => {
                    onSelect(String(company.customerId))
                    setOpen(false)
                    setSearch("")
                  }}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                >
                  <Check
                    className={`mr-2 h-4 w-4 absolute left-2 ${
                      value === String(company.customerId) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span>{getDisplayValue(company)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 메인 예측 차트 컴포넌트
export default function ForecastChart() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>("1")
  const [period, setPeriod] = useState<string>("12months")
  const [sizeFilters, setSizeFilters] = useState<string[]>([])

  // 일별 매출을 월별로 집계
  const monthlyActualSales = useMemo(() => {
    if (!sampleActualSales || !Array.isArray(sampleActualSales)) {
      return []
    }

    const monthlyMap = new Map<string, number>()
    
    sampleActualSales.forEach(item => {
      const date = new Date(item.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      
      const currentSum = monthlyMap.get(monthKey) || 0
      monthlyMap.set(monthKey, currentSum + (item.quantity || 0))
    })

    return Array.from(monthlyMap.entries()).map(([date, quantity]) => ({
      date,
      quantity
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [])

  // 예측과 실제 매출을 모두 월별 기준으로 결합
  const combinedChartData = useMemo(() => {
    const dataMap = new Map<string, { predictedQuantity?: number; actualSalesMonthly?: number }>()

    // 예측 데이터 추가
    if (sampleForecastData && Array.isArray(sampleForecastData)) {
      sampleForecastData.forEach(item => {
        const dateKey = item.predictedDate.split('T')[0]
        dataMap.set(dateKey, { 
          ...dataMap.get(dateKey), 
          predictedQuantity: item.predictedQuantity 
        })
      })
    }

    // 월별 집계된 실제 매출 데이터 추가
    monthlyActualSales.forEach(item => {
      dataMap.set(item.date, { 
        ...dataMap.get(item.date), 
        actualSalesMonthly: item.quantity 
      })
    })

    return Array.from(dataMap.entries())
      .map(([date, values]) => ({
        date: date,
        predictedQuantity: values.predictedQuantity || 0,
        actualSalesMonthly: values.actualSalesMonthly || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [monthlyActualSales])

  // 기간별 필터링된 차트 데이터
  const filteredCombinedChartData = useMemo(() => {
    if (period === "all") {
      return combinedChartData
    }

    const today = new Date()
    let fromDate: Date
    let toDate: Date

    switch (period) {
      case "6months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate())
        break
      case "12months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate())
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate())
        break
      case "24months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 24, today.getDate())
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate())
        break
      default:
        return combinedChartData
    }

    const fromTime = fromDate.getTime()
    const toTime = toDate.getTime()

    return combinedChartData.filter(d => {
      const date = new Date(d.date).getTime()
      return date >= fromTime && date <= toTime
    })
  }, [combinedChartData, period])

  // 선택된 회사 정보 표시
  const selectedCompanyInfo = useMemo(() => {
    if (selectedCompanyId === "all") {
      if (!sizeFilters || sizeFilters.length === 0) {
        return "전체 회사"
      } else if (sizeFilters.length === 3) {
        return "전체 회사"
      } else {
        return `${sizeFilters.join(", ")} 회사`
      }
    }
    const company = sampleCompanies.find(c => String(c.customerId) === selectedCompanyId)
    if (!company) return "회사 정보 없음"
    
    const name = company.companyName || `Customer ${company.customerId}`
    return company.companySize ? `${name} (${company.companySize})` : name
  }, [selectedCompanyId, sizeFilters])

  const toggleSizeFilter = (size: string) => {
    setSizeFilters(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border shadow-sm">
        {/* 헤더 */}
        <div className="flex flex-col space-y-4 p-6 border-b">
          <div>
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              주문량 예측 추이 (월별 비교)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedCompanyInfo}의 월별 주문 예측 및 실제 수량 추이입니다. 
              실제 매출은 일별 데이터를 월별로 집계하여 표시됩니다.
            </p>
          </div>
          
          {/* 컨트롤 */}
          <div className="flex flex-col md:flex-row gap-2 md:ml-auto">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full md:w-44 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 기간</option>
              <option value="6months">최근 6개월</option>
              <option value="12months">최근 12개월</option>
              <option value="24months">최근 24개월</option>
            </select>

            <CompanySearchCombobox
              companies={sampleCompanies}
              value={selectedCompanyId}
              onSelect={setSelectedCompanyId}
            />
          </div>
          
          {/* 회사 규모 필터 */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              {["대기업", "중견기업", "중소기업"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSizeFilter(size)}
                  className={`px-4 py-2 text-sm font-medium border border-gray-200 first:rounded-l-lg last:rounded-r-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 ${
                    sizeFilters.includes(size)
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-white text-gray-900"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 차트 컨텐츠 */}
        <div className="p-6">
          <div className="w-full h-80">
            <AreaChart
              width={800}
              height={300}
              data={filteredCombinedChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="fillPredictedQuantity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig.predictedQuantity.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartConfig.predictedQuantity.color} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillActualSalesMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig.actualSalesMonthly.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartConfig.actualSalesMonthly.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'short' })}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long' })}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()}개`,
                  name === "predictedQuantity" ? "예측 수량 (월별)" : "실제 수량 (월별)"
                ]}
              />
              <Legend />
              <Area
                dataKey="predictedQuantity"
                type="monotone"
                stroke={chartConfig.predictedQuantity.color}
                fillOpacity={1}
                fill="url(#fillPredictedQuantity)"
                name={chartConfig.predictedQuantity.label}
              />
              <Area
                dataKey="actualSalesMonthly"
                type="monotone"
                stroke={chartConfig.actualSalesMonthly.color}
                fillOpacity={1}
                fill="url(#fillActualSalesMonthly)"
                name={chartConfig.actualSalesMonthly.label}
              />
            </AreaChart>
          </div>
        </div>
      </div>
    </div>
  )
}
