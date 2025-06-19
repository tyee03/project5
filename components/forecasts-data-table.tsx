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

export const schema = z.object({
  cofId: z.number(),
  customerId: z.number(),
  companyName: z.string().nullable(),
  customerName: z.string().nullable(),
  predictedDate: z.string(),
  predictedQuantity: z.number(),
  mape: z.number().nullable(),
  predictionModel: z.string(),
  forecastGenerationDate: z.string(),
})

export type Forecast = z.infer<typeof schema>;

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="size-7 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing">
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

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
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full">Save Changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

const getModelBadgeClassName = (modelName: string): string => {
  const modelColorClasses = [
    "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/80 dark:text-blue-50 dark:hover:bg-blue-900",
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/80 dark:text-emerald-50 dark:hover:bg-emerald-900",
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

// ✨ 1. DataTable의 props 인터페이스에 onRunForecast와 isForecasting을 추가
export function DataTable({
  data: initialData,
  onRunForecast,
  isForecasting,
}: {
  data: Forecast[];
  onRunForecast: () => Promise<void>;
  isForecasting: boolean;
}) {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 });
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedRowForEdit, setSelectedRowForEdit] = React.useState<Forecast | null>(null);

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

  const handleSaveChanges = async (event: React.FormEvent<HTMLFormElement>, cofId: number) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedData = {
      predictedDate: formData.get('predictedDate') as string,
      predictedQuantity: Number(formData.get('predictedQuantity')),
      mape: formData.get('mape') ? Number(formData.get('mape')) : null,
      predictionModel: formData.get('predictionModel') as string,
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
            row.cofId === cofId ? { ...row, ...updatedData, mape: updatedData.mape ?? row.mape } : row
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
    {
      accessorKey: "mape",
      header: () => <div className="text-center">MAPE (%)</div>,
      cell: ({ row }) => {
        const mapeValue = row.getValue("mape");
        if (typeof mapeValue !== 'number' || isNaN(mapeValue)) return <div className="flex justify-center"><Badge variant="secondary">N/A</Badge></div>;
        const mape = mapeValue * 100;
        const variant = mape < 10 ? "secondary" : mape < 25 ? "outline" : "destructive";
        return <div className="flex justify-center"><Badge variant={variant}>{mape.toFixed(2)}%</Badge></div>
      },
    },
    {
      accessorKey: "predictionModel",
      header: "Prediction Model",
      cell: ({ row }) => {
        const modelName = String(row.getValue("predictionModel"));
        return <div className="flex justify-center"><Badge className={getModelBadgeClassName(modelName)}>{modelName}</Badge></div>
      },
    },
    { accessorKey: "forecastGenerationDate", header: "Generated At", cell: ({ row }) => new Date(row.getValue("forecastGenerationDate")).toLocaleString("ko-KR") },
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

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    onSortingChange: setSorting,
    getRowId: (row) => row.cofId.toString(),
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

  const dataIds = React.useMemo(() => data.map(({ cofId }) => cofId), [data]);

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
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    let dataToExport: Forecast[];

    if (selectedRows.length > 0) {
      dataToExport = selectedRows.map(row => row.original);
    } else {
      dataToExport = table.getRowModel().rows.map(row => row.original);
    }

    if (dataToExport.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    
    let blob: Blob;
    let fileName: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      fileName = `forecast_export_${new Date().toISOString()}.json`;
    } else {
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => JSON.stringify(row[header as keyof Forecast])).join(','))
      ].join('\n');
      blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      fileName = `forecast_export_${new Date().toISOString()}.csv`;
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
    <div className="space-y-4">
      {/* ✨ 2. '새 예측 실행' 버튼을 'Export' 버튼 옆에 추가 */}
      <div className="flex items-center gap-2">
        <Button onClick={onRunForecast} disabled={isForecasting}>
          {isForecasting ? "예측 실행 중..." : "새 예측 실행"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              <span>
                {table.getFilteredSelectedRowModel().rows.length > 0
                  ? `Export ${table.getFilteredSelectedRowModel().rows.length} item(s)`
                  : "Export All"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport('json')}>Export as JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    
      <DndContext sensors={useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>

                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">결과가 없습니다.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <ForecastDetailSheet 
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        item={selectedRowForEdit}
        onSave={handleSaveChanges}
      />
      
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
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
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><span className="sr-only">Go to first page</span><ChevronsLeftIcon className="h-4 w-4" /></Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><span className="sr-only">Go to previous page</span><ChevronLeftIcon className="h-4 w-4" /></Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><span className="sr-only">Go to next page</span><ChevronRightIcon className="h-4 w-4" /></Button>
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><span className="sr-only">Go to last page</span><ChevronsRightIcon className="h-4 w-4" /></Button>
            </div>
        </div>
      </div>
    </div>
  );
}