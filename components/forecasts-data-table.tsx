// components/customer-forecasts-data-table.tsx - 커스터머별 그룹핑 수정본

"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FileDown,
  MoreVerticalIcon,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ✨ 스키마에 probability 추가
export const schema = z.object({
  cofId: z.number(),
  customerId: z.number(),
  companyName: z.string().nullable(),
  customerName: z.string().nullable(),
  companySize: z.string().nullable(),
  predictedDate: z.string(),
  predictedQuantity: z.number(),
  mape: z.number().nullable(),
  predictionModel: z.string(),
  probability: z.number().nullable(),
  forecastGenerationDate: z.string(),
})

export type Forecast = z.infer<typeof schema>;

// ✨ 커스터머 요약 데이터 타입
export type CustomerSummary = {
  customerId: number;
  companyName: string | null;
  customerName: string | null;
  companySize: string | null;
  totalForecasts: number;
  latestForecastDate: string;
  avgPredictedQuantity: number;
  avgProbability: number | null;
  avgMape: number | null;
  primaryModel: string;
};

// ✨ 모델 배지 스타일
const getModelBadgeClassName = (modelName: string): string => {
  const specificColors: { [key: string]: string } = {
    "Prophet": "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/80 dark:text-blue-50 dark:hover:bg-blue-900",
    "ARIMA": "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/80 dark:text-emerald-50 dark:hover:bg-emerald-900",
    "Event-Driven (Logistic)": "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/80 dark:text-purple-50 dark:hover:bg-purple-900",
    "Data Insufficient": "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/80 dark:text-gray-50 dark:hover:bg-gray-900",
    "Prediction Failed": "border-transparent bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/80 dark:text-red-50 dark:hover:bg-red-900",
  };

  if (specificColors[modelName]) {
    return specificColors[modelName];
  }

  const modelColorClasses = [
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/80 dark:text-amber-50 dark:hover:bg-amber-900",
  ];
  let hash = 0;
  for (let i = 0; i < modelName.length; i++) {
    hash = modelName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return modelColorClasses[Math.abs(hash % modelColorClasses.length)];
};

export function CustomerForecastsDataTable({
  data: initialData,
  onRunForecast,
  isForecasting,
  selectedCustomerId,
  onCustomerSelect,
  selectedCompanySize,
}: {
  data: Forecast[];
  onRunForecast: () => Promise<void>;
  isForecasting: boolean;
  selectedCustomerId: string | null;
  onCustomerSelect: (customerId: string | null) => void;
  selectedCompanySize: string | null;
}) {
  const [data] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 });

  // ✨ 커스터머별 요약 데이터 생성
  const customerSummaries = React.useMemo(() => {
    const customerMap = new Map<number, {
      forecasts: Forecast[];
      companyInfo: { name: string | null; customerName: string | null; size: string | null };
    }>();

    // 기업 규모별 필터링
    const filteredData = selectedCompanySize 
      ? data.filter(item => item.companySize === selectedCompanySize)
      : data;

    // 커스터머별로 그룹핑
    filteredData.forEach(forecast => {
      const existingCustomer = customerMap.get(forecast.customerId);
      if (existingCustomer) {
        existingCustomer.forecasts.push(forecast);
      } else {
        customerMap.set(forecast.customerId, {
          forecasts: [forecast],
          companyInfo: {
            name: forecast.companyName,
            customerName: forecast.customerName,
            size: forecast.companySize
          }
        });
      }
    });

    // 요약 데이터 생성
    const summaries: CustomerSummary[] = Array.from(customerMap.entries()).map(([customerId, { forecasts, companyInfo }]) => {
      const sortedForecasts = forecasts.sort((a, b) => new Date(b.predictedDate).getTime() - new Date(a.predictedDate).getTime());
      const latestForecast = sortedForecasts[0];
      
      const avgQuantity = forecasts.reduce((sum, f) => sum + f.predictedQuantity, 0) / forecasts.length;
      
      const probabilityValues = forecasts.filter(f => f.probability !== null && f.probability !== undefined).map(f => f.probability!);
      const avgProbability = probabilityValues.length > 0 
        ? probabilityValues.reduce((sum, p) => sum + p, 0) / probabilityValues.length 
        : null;
      
      const mapeValues = forecasts.filter(f => f.mape !== null && f.mape !== undefined).map(f => f.mape!);
      const avgMape = mapeValues.length > 0 
        ? mapeValues.reduce((sum, m) => sum + m, 0) / mapeValues.length 
        : null;
      
      // 가장 많이 사용된 모델 찾기
      const modelCounts = forecasts.reduce((acc, f) => {
        acc[f.predictionModel] = (acc[f.predictionModel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const primaryModel = Object.entries(modelCounts).sort(([,a], [,b]) => b - a)[0][0];

      return {
        customerId,
        companyName: companyInfo.name,
        customerName: companyInfo.customerName,
        companySize: companyInfo.size,
        totalForecasts: forecasts.length,
        latestForecastDate: latestForecast.predictedDate,
        avgPredictedQuantity: avgQuantity,
        avgProbability,
        avgMape,
        primaryModel,
      };
    });

    return summaries.sort((a, b) => {
      const aName = a.companyName || a.customerName || `Customer ${a.customerId}`;
      const bName = b.companyName || b.customerName || `Customer ${b.customerId}`;
      return aName.localeCompare(bName);
    });
  }, [data, selectedCompanySize]);

  // ✨ 선택된 고객의 상세 예측 데이터 (1년간)
  const selectedCustomerForecasts = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    
    const customerId = parseInt(selectedCustomerId);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    return data
      .filter(forecast => 
        forecast.customerId === customerId &&
        new Date(forecast.predictedDate) <= oneYearFromNow
      )
      .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }, [data, selectedCustomerId]);

  // ✨ 커스터머 요약 테이블 컬럼
  const customerSummaryColumns: ColumnDef<CustomerSummary>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex justify-center items-center">
          <Checkbox 
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} 
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} 
            aria-label="Select all" 
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center items-center">
          <Checkbox 
            checked={row.getIsSelected()} 
            onCheckedChange={(value) => row.toggleSelected(!!value)} 
            aria-label="Select row" 
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "companyName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          <Building2 className="mr-2 h-4 w-4" />
          회사명
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const customer = row.original;
        const displayName = customer.companyName || customer.customerName || `Customer ${customer.customerId}`;
        const isSelected = selectedCustomerId === String(customer.customerId);
        
        return (
          <Button 
            variant={isSelected ? "default" : "ghost"} 
            className="justify-start font-normal h-auto p-2"
            onClick={() => onCustomerSelect(isSelected ? null : String(customer.customerId))}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{displayName}</span>
              {customer.companySize && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {customer.companySize}
                </Badge>
              )}
            </div>
          </Button>
        );
      },
    },
    {
      accessorKey: "totalForecasts",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          예측 건수
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary">{row.getValue("totalForecasts")}</Badge>
        </div>
      ),
    },
    {
      accessorKey: "latestForecastDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          <Calendar className="mr-2 h-4 w-4" />
          최신 예측일
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {new Date(row.getValue("latestForecastDate")).toLocaleDateString("ko-KR", {
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
          })}
        </div>
      ),
    },
    {
      accessorKey: "avgPredictedQuantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          <TrendingUp className="mr-2 h-4 w-4" />
          평균 예측량
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {Math.round(row.getValue("avgPredictedQuantity")).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "avgProbability",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          평균 구매확률
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const probability = row.getValue("avgProbability") as number | null;
        if (probability === null || probability === undefined) {
          return <div className="flex justify-center"><Badge variant="secondary">N/A</Badge></div>;
        }
        
        const percentage = probability * 100;
        const variant = percentage >= 70 ? "default" : percentage >= 40 ? "secondary" : "destructive";
        
        return (
          <div className="flex justify-center">
            <Badge variant={variant}>{percentage.toFixed(1)}%</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "primaryModel",
      header: "주요 모델",
      cell: ({ row }) => {
        const modelName = String(row.getValue("primaryModel"));
        return (
          <div className="flex justify-center">
            <Badge className={getModelBadgeClassName(modelName)}>
              {modelName}
            </Badge>
          </div>
        );
      },
    },
  ];

  // ✨ 상세 예측 데이터 테이블 컬럼
  const detailForecastColumns: ColumnDef<Forecast>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex justify-center items-center">
          <Checkbox 
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} 
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} 
            aria-label="Select all" 
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center items-center">
          <Checkbox 
            checked={row.getIsSelected()} 
            onCheckedChange={(value) => row.toggleSelected(!!value)} 
            aria-label="Select row" 
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "predictedDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          예측일
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue("predictedDate")).toLocaleDateString("ko-KR", {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }),
    },
    {
      accessorKey: "predictedQuantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="w-full flex justify-end">
          예측 수량
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {new Intl.NumberFormat().format(row.getValue("predictedQuantity"))}
        </div>
      ),
    },
    {
      accessorKey: "probability",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          구매 확률
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const probability = row.getValue("probability") as number | null;
        if (probability === null || probability === undefined) {
          return <div className="flex justify-center"><Badge variant="secondary">N/A</Badge></div>;
        }
        
        const percentage = probability * 100;
        const variant = percentage >= 70 ? "default" : percentage >= 40 ? "secondary" : "destructive";
        
        return (
          <div className="flex items-center justify-center space-x-2">
            <Badge variant={variant}>{percentage.toFixed(1)}%</Badge>
            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  percentage >= 70 ? 'bg-green-500' : 
                  percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "mape",
      header: () => <div className="text-center">MAPE (%)</div>,
      cell: ({ row }) => {
        const mapeValue = row.getValue("mape");
        if (typeof mapeValue !== 'number' || isNaN(mapeValue)) {
          return <div className="flex justify-center"><Badge variant="secondary">N/A</Badge></div>;
        }
        const mape = mapeValue * 100;
        const variant = mape < 10 ? "secondary" : mape < 25 ? "outline" : "destructive";
        return (
          <div className="flex justify-center">
            <Badge variant={variant}>{mape.toFixed(2)}%</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "predictionModel",
      header: "예측 모델",
      cell: ({ row }) => {
        const modelName = String(row.getValue("predictionModel"));
        return (
          <div className="flex justify-center">
            <Badge className={getModelBadgeClassName(modelName)}>
              {modelName}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "forecastGenerationDate",
      header: "생성일시",
      cell: ({ row }) => new Date(row.getValue("forecastGenerationDate")).toLocaleString("ko-KR"),
    },
  ];

  // ✨ 커스터머 요약 테이블
  const customerSummaryTable = useReactTable({
    data: customerSummaries,
    columns: customerSummaryColumns,
    state: { sorting, columnVisibility, rowSelection: {}, columnFilters, pagination },
    onSortingChange: setSorting,
    getRowId: (row) => row.customerId.toString(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // ✨ 상세 예측 테이블
  const detailForecastTable = useReactTable({
    data: selectedCustomerForecasts,
    columns: detailForecastColumns,
    state: { sorting: [], columnVisibility, rowSelection, columnFilters: [], pagination: { pageIndex: 0, pageSize: 10 } },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.cofId.toString(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleExport = (format: 'csv' | 'json') => {
    let dataToExport: any[];
    let fileName: string;

    if (selectedCustomerId) {
      // 선택된 고객의 상세 데이터 내보내기
      const selectedRows = detailForecastTable.getFilteredSelectedRowModel().rows;
      dataToExport = selectedRows.length > 0 
        ? selectedRows.map(row => row.original)
        : selectedCustomerForecasts;
      fileName = `customer_${selectedCustomerId}_forecasts_${new Date().toISOString()}`;
    } else {
      // 커스터머 요약 데이터 내보내기
      dataToExport = customerSummaries;
      fileName = `customer_summary_${new Date().toISOString()}`;
    }

    if (dataToExport.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    
    let blob: Blob;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      fileName += '.json';
    } else {
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => JSON.stringify(row[header as keyof typeof row])).join(','))
      ].join('\n');
      blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      fileName += '.csv';
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 */}
      <div className="flex items-center gap-2">
        <Button onClick={onRunForecast} disabled={isForecasting}>
          {isForecasting ? "예측 실행 중..." : "새 예측 실행"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              <span>데이터 내보내기</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => handleExport('csv')}>CSV로 내보내기</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport('json')}>JSON으로 내보내기</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCustomerId && (
          <Button variant="outline" onClick={() => onCustomerSelect(null)}>
            <ChevronDown className="mr-2 h-4 w-4" />
            전체 고객 목록으로 돌아가기
          </Button>
        )}
      </div>

      {/* 커스터머 요약 테이블 */}
      {!selectedCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              고객별 예측 요약
              {selectedCompanySize && (
                <Badge variant="outline" className="ml-2">
                  {selectedCompanySize}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              고객을 클릭하면 해당 고객의 1년간 예측 데이터를 확인할 수 있습니다.
              {selectedCompanySize ? ` (${selectedCompanySize} 고객만 표시 중)` : ' (전체 고객 표시 중)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  {customerSummaryTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {customerSummaryTable.getRowModel().rows?.length ? (
                    customerSummaryTable.getRowModel().rows.map((row) => (
                      <TableRow 
                        key={row.id} 
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedCustomerId === String(row.original.customerId) && "bg-muted"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={customerSummaryColumns.length} className="h-24 text-center">
                        결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex items-center justify-between px-2 mt-4">
              <div className="flex-1 text-sm text-muted-foreground">
                총 {customerSummaryTable.getFilteredRowModel().rows.length}개 고객
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">페이지당 행 수</p>
                  <Select
                    value={`${customerSummaryTable.getState().pagination.pageSize}`}
                    onValueChange={(value) => customerSummaryTable.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={customerSummaryTable.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 15, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  {customerSummaryTable.getPageCount() > 0 ? (
                    <>Page {customerSummaryTable.getState().pagination.pageIndex + 1} of {customerSummaryTable.getPageCount()}</>
                  ) : (
                    "Page 0 of 0"
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    className="hidden h-8 w-8 p-0 lg:flex" 
                    onClick={() => customerSummaryTable.setPageIndex(0)} 
                    disabled={!customerSummaryTable.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-8 w-8 p-0" 
                    onClick={() => customerSummaryTable.previousPage()} 
                    disabled={!customerSummaryTable.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-8 w-8 p-0" 
                    onClick={() => customerSummaryTable.nextPage()} 
                    disabled={!customerSummaryTable.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="hidden h-8 w-8 p-0 lg:flex" 
                    onClick={() => customerSummaryTable.setPageIndex(customerSummaryTable.getPageCount() - 1)} 
                    disabled={!customerSummaryTable.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 선택된 고객의 상세 예측 데이터 */}
      {selectedCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5" />
              {(() => {
                const customer = customerSummaries.find(c => String(c.customerId) === selectedCustomerId);
                const name = customer?.companyName || customer?.customerName || `Customer ${selectedCustomerId}`;
                return `${name} - 1년간 예측 데이터`;
              })()}
            </CardTitle>
            <CardDescription>
              선택된 고객의 향후 1년간 예측 데이터입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  {detailForecastTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {detailForecastTable.getRowModel().rows?.length ? (
                    detailForecastTable.getRowModel().rows.map((row) => (
                      <TableRow 
                        key={row.id} 
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={detailForecastColumns.length} className="h-24 text-center">
                        해당 고객의 예측 데이터가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 상세 테이블 페이지네이션 */}
            <div className="flex items-center justify-between px-2 mt-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {detailForecastTable.getFilteredSelectedRowModel().rows.length} of {detailForecastTable.getFilteredRowModel().rows.length} row(s) selected.
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">페이지당 행 수</p>
                  <Select
                    value={`${detailForecastTable.getState().pagination.pageSize}`}
                    onValueChange={(value) => detailForecastTable.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={detailForecastTable.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[5, 10, 15, 20].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  {detailForecastTable.getPageCount() > 0 ? (
                    <>Page {detailForecastTable.getState().pagination.pageIndex + 1} of {detailForecastTable.getPageCount()}</>
                  ) : (
                    "Page 0 of 0"
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    className="hidden h-8 w-8 p-0 lg:flex" 
                    onClick={() => detailForecastTable.setPageIndex(0)} 
                    disabled={!detailForecastTable.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-8 w-8 p-0" 
                    onClick={() => detailForecastTable.previousPage()} 
                    disabled={!detailForecastTable.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-8 w-8 p-0" 
                    onClick={() => detailForecastTable.nextPage()} 
                    disabled={!detailForecastTable.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="hidden h-8 w-8 p-0 lg:flex" 
                    onClick={() => detailForecastTable.setPageIndex(detailForecastTable.getPageCount() - 1)} 
                    disabled={!detailForecastTable.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
