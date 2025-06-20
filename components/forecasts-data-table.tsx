// components/forecasts-data-table.tsx - 기존 파일을 새로운 구조로 업데이트

"use client"

import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  Edit,
  FileDown,
  GripVerticalIcon,
  MoreVerticalIcon,
  Trash2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ✨ 스키마에 companySize와 probability 추가
export const schema = z.object({
  cofId: z.number(),
  customerId: z.number(),
  companyName: z.string().nullable(),
  customerName: z.string().nullable(),
  companySize: z.string().nullable(), // ✨ 추가
  predictedDate: z.string(),
  predictedQuantity: z.number(),
  mape: z.number().nullable(),
  predictionModel: z.string(),
  probability: z.number().nullable(), // ✨ 추가
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

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="size-7 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing">
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// ✨ 편집 시트에 probability 필드 추가
function ForecastDetailSheet({
  isOpen,
  onOpenChange,
  item,
  onSave,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  item: Forecast | null
  onSave: (event: React.FormEvent<HTMLFormElement>, cofId: number) => void
}) {
  if (!item) return null;
  const sheetKey = item ? item.cofId : 'empty';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent key={sheetKey} side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>Edit Forecast: {item.cofId}</SheetTitle>
          <SheetDescription>Editing forecast for {item.companyName || item.customerName}.</SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => onSave(e, item.cofId)} className="flex flex-1 flex-col justify-between">
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="predictedDate">Predicted Date</Label>
                <Input name="predictedDate" defaultValue={new Date(item.predictedDate).toISOString().split("T")[0]} type="date" />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="predictedQuantity">Predicted Quantity</Label>
                <Input name="predictedQuantity" defaultValue={item.predictedQuantity} type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="mape">MAPE</Label>
                  <Input name="mape" defaultValue={item.mape ?? ''} type="number" step="0.0001" />
                </div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="predictionModel">Prediction Model</Label>
                  <Input name="predictionModel" defaultValue={item.predictionModel} />
                </div>
            </div>
            {/* ✨ 확률 필드 추가 */}
            <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="probability">Purchase Probability (0-1)</Label>
                  <Input name="probability" defaultValue={item.probability ?? ''} type="number" step="0.01" min="0" max="1" placeholder="0.0 - 1.0" />
                </div>
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full">Save Changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

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

function DraggableRow({ row }: { row: Row<Forecast> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.cofId,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  }

  return (
    <TableRow ref={setNodeRef} style={style} data-state={row.getIsSelected() && "selected"}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
  onRunForecast,
  isForecasting,
  selectedCustomerId = null,      // ✨ 새로운 props 추가 (기본값 설정)
  onCustomerSelect = () => {},    // ✨ 새로운 props 추가 (기본값 설정)
  selectedCompanySize = null,     // ✨ 새로운 props 추가 (기본값 설정)
}: {
  data: Forecast[];
  onRunForecast: () => Promise<void>;
  isForecasting: boolean;
  selectedCustomerId?: string | null;     // ✨ 선택적 props로 설정
  onCustomerSelect?: (customerId: string | null) => void;  // ✨ 선택적 props로 설정
  selectedCompanySize?: string | null;    // ✨ 선택적 props로 설정
}) {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 });
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedRowForEdit, setSelectedRowForEdit] = React.useState<Forecast | null>(null);

  // ✨ 새로운 기능: 커스터머별 요약 데이터 생성
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

  const handleOpenEditSheet = (row: Row<Forecast>) => {
    setSelectedRowForEdit(row.original);
    setIsSheetOpen(true);
  };

  const handleDeleteRow = async (cofId: number) => {
    if (!window.confirm(`정말로 ID ${cofId} 예측 데이터를 삭제하시겠습니까?`)) return;
    try {
      const response = await fetch(`/api/customer-forecast/${cofId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '삭제에 실패했습니다.');
      }
      setData(prevData => prevData.filter(row => row.cofId !== cofId));
    } catch (error) {
      alert(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  // ✨ 저장 함수에 probability 추가
  const handleSaveChanges = async (event: React.FormEvent<HTMLFormElement>, cofId: number) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedData = {
      predictedDate: formData.get('predictedDate') as string,
      predictedQuantity: Number(formData.get('predictedQuantity')),
      mape: formData.get('mape') ? Number(formData.get('mape')) : null,
      predictionModel: formData.get('predictionModel') as string,
      probability: formData.get('probability') ? Number(formData.get('probability')) : null,
    };

    try {
      const response = await fetch(`/api/customer-forecast/${cofId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (response.status === 204) {
        setData(prevData =>
          prevData.map(row =>
            row.cofId === cofId ? { ...row, ...updatedData, mape: updatedData.mape ?? row.mape, probability: updatedData.probability ?? row.probability } : row
          )
        );
        setIsSheetOpen(false);
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '수정에 실패했습니다.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  React.useEffect(() => { setData(initialData); }, [initialData]);

  // ✨ 커스터머 요약 테이블 컬럼 (완성)
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
        
        return (
          <div className="flex flex-col items-start">
            <span className="font-medium">{displayName}</span>
            {customer.companySize && (
              <Badge variant="outline" className="mt-1 text-xs">
                {customer.companySize}
              </Badge>
            )}
          </div>
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
            <Badge className={getModelBadgeClassName(modelName.split(' (')[0])}>
              {modelName}
            </Badge>
          </div>
        );
      },
    },
  ];
    // ... 나머지 컬럼들은 이전 아티팩트와 동일
  ];

  // ✨ 기존 상세 예측 데이터 테이블 컬럼들에 MAPE, 모델 등 추가
  const columns: ColumnDef<Forecast>[] = [
    { id: "drag", header: () => null, cell: ({ row }) => <DragHandle id={row.original.cofId} /> },
    {
      id: "select",
      header: ({ table }) => (<div className="flex justify-center items-center"><Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" /></div>),
      cell: ({ row }) => (<div className="flex justify-center items-center"><Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" /></div>),
      enableSorting: false, enableHiding: false,
    },
    {
      accessorKey: "companyName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          회사명
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Button variant="link" className="px-0 font-normal" onClick={() => handleOpenEditSheet(row)}>
          {row.original.companyName || row.original.customerName || row.original.customerId}
        </Button>
      ),
    },
    {
      accessorKey: "predictedDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Predicted Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue("predictedDate")).toLocaleDateString("ko-KR", {year: 'numeric', month: 'long', day: 'numeric'}),
    },
    {
      accessorKey: "predictedQuantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="w-full flex justify-end">
          Predicted Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right font-mono">{new Intl.NumberFormat().format(row.getValue("predictedQuantity"))}</div>,
    },
    // ✨ 확률 컬럼 추가
    {
      accessorKey: "probability",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Purchase Probability
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
            <Badge className={getModelBadgeClassName(modelName.split(' (')[0])}>
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
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreVerticalIcon className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleOpenEditSheet(row)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-100" onSelect={() => handleDeleteRow(row.original.cofId)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // ✨ 두 가지 테이블 중 어떤 것을 표시할지 결정 - 기본적으로 커스터머 요약 표시
  const showCustomerSummary = !selectedCustomerId;
  
  // ✨ 기본적으로 커스터머 요약 데이터를 표시, 필요시 기존 테이블 데이터도 사용 가능
  const tableData = React.useMemo(() => {
    if (showCustomerSummary) {
      return customerSummaries;
    } else {
      return selectedCustomerForecasts;
    }
  }, [showCustomerSummary, customerSummaries, selectedCustomerForecasts]);

  const tableColumns = React.useMemo(() => {
    if (showCustomerSummary) {
      return customerSummaryColumns;
    } else {
      return columns;
    }
  }, [showCustomerSummary, customerSummaryColumns, columns]);

  const table = useReactTable({
    data: tableData as any,
    columns: tableColumns as any,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    onSortingChange: setSorting,
    getRowId: (row) => showCustomerSummary ? (row as CustomerSummary).customerId.toString() : (row as Forecast).cofId.toString(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const dataIds = React.useMemo(() => 
    showCustomerSummary 
      ? customerSummaries.map(({ customerId }) => customerId)
      : selectedCustomerForecasts.map(({ cofId }) => cofId), 
    [showCustomerSummary, customerSummaries, selectedCustomerForecasts]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = dataIds.indexOf(active.id as number);
        const newIndex = dataIds.indexOf(over.id as number);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    let dataToExport: any[];
    let fileName: string;

    if (selectedCustomerId) {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      dataToExport = selectedRows.length > 0 
        ? selectedRows.map(row => row.original)
        : selectedCustomerForecasts;
      fileName = `customer_${selectedCustomerId}_forecasts_${new Date().toISOString()}`;
    } else {
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

      {/* 커스터머 요약 테이블 또는 상세 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {showCustomerSummary ? (
              <>
                <Building2 className="h-5 w-5" />
                고객별 예측 요약
                {selectedCompanySize && (
                  <Badge variant="outline" className="ml-2">
                    {selectedCompanySize}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <ChevronRight className="h-5 w-5" />
                {(() => {
                  const customer = customerSummaries.find(c => String(c.customerId) === selectedCustomerId);
                  const name = customer?.companyName || customer?.customerName || `Customer ${selectedCustomerId}`;
                  return `${name} - 1년간 예측 데이터`;
                })()}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {showCustomerSummary ? (
              <>
                고객을 클릭하면 해당 고객의 1년간 예측 데이터를 확인할 수 있습니다.
                {selectedCompanySize ? ` (${selectedCompanySize} 고객만 표시 중)` : ' (전체 고객 표시 중)'}
              </>
            ) : (
              "선택된 고객의 향후 1년간 예측 데이터입니다."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showCustomerSummary ? (
            <DndContext sensors={useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
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
            </DndContext>
          ) : (
            <DndContext sensors={useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
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
                    {table.getRowModel().rows?.length ? (
                      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                        {table.getRowModel().rows.map((row) => (
                          <DraggableRow key={row.id} row={row as any} />
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          해당 고객의 예측 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          )}

          <ForecastDetailSheet 
            isOpen={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            item={selectedRowForEdit}
            onSave={handleSaveChanges}
          />
          
          {/* 페이지네이션 */}
          <div className="flex items-center justify-between px-2 mt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {showCustomerSummary ? (
                `총 ${table.getFilteredRowModel().rows.length}개 고객`
              ) : (
                `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected.`
              )}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">페이지당 행 수</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 15, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                {table.getPageCount() > 0 ? (
                  <>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</>
                ) : (
                  "Page 0 of 0"
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  className="hidden h-8 w-8 p-0 lg:flex" 
                  onClick={() => table.setPageIndex(0)} 
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeftIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-8 w-8 p-0" 
                  onClick={() => table.previousPage()} 
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-8 w-8 p-0" 
                  onClick={() => table.nextPage()} 
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="hidden h-8 w-8 p-0 lg:flex" 
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)} 
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
