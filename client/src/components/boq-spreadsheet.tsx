import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Save, Plus, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BOQItem {
  id?: string;
  boqId: string;
  parentId?: string | null;
  type: string; // 'section', 'subsection', 'item', 'subtotal', 'grandtotal'
  no?: string | null;
  description: string;
  unit?: string | null;
  qty?: string | null;
  rate?: string | null;
  amount?: string | null;
  order?: number;
}

interface BOQSpreadsheetProps {
  boqId: string;
}

export default function BOQSpreadsheet({ boqId }: BOQSpreadsheetProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<BOQItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch BOQ with items
  const { data: boqData, isLoading } = useQuery({
    queryKey: ["/api/boqs", boqId],
    queryFn: async () => {
      const res = await fetch(`/api/boqs/${boqId}`);
      if (!res.ok) throw new Error("Failed to fetch BOQ");
      return res.json();
    },
  });

  // Initialize items from fetched data
  useEffect(() => {
    if (boqData?.items) {
      // Sort items by order
      const sortedItems = [...boqData.items].sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(sortedItems);
      setHasChanges(false);
    }
  }, [boqData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (items: BOQItem[]) => {
      const res = await apiRequest("PATCH", `/api/boqs/${boqId}`, { items });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boqs", boqId] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "BOQ saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save BOQ",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Recalculate amounts before saving
    const updatedItems = items.map(item => {
      if (item.type === 'item' && item.qty && item.rate) {
        const qty = parseFloat(item.qty);
        const rate = parseFloat(item.rate);
        if (!isNaN(qty) && !isNaN(rate)) {
          return { ...item, amount: (qty * rate).toFixed(2) };
        }
      }
      return item;
    });
    
    saveMutation.mutate(updatedItems);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate amount if qty or rate changes
    if ((field === 'qty' || field === 'rate') && updatedItems[index].type === 'item') {
      const qty = parseFloat(updatedItems[index].qty || '0');
      const rate = parseFloat(updatedItems[index].rate || '0');
      if (!isNaN(qty) && !isNaN(rate)) {
        updatedItems[index].amount = (qty * rate).toFixed(2);
      }
    }
    
    setItems(updatedItems);
    setHasChanges(true);
  };

  const handleAddItem = (type: string, afterIndex?: number) => {
    const newItem: BOQItem = {
      boqId,
      type,
      description: "",
      order: items.length,
    };
    
    // Set default values based on type
    if (type === 'item') {
      newItem.unit = "";
      newItem.qty = "0";
      newItem.rate = "0";
      newItem.amount = "0";
    }
    
    const newItems = [...items];
    if (afterIndex !== undefined) {
      newItems.splice(afterIndex + 1, 0, newItem);
      // Update order for subsequent items
      newItems.forEach((item, idx) => {
        item.order = idx;
      });
    } else {
      newItems.push(newItem);
    }
    
    setItems(newItems);
    setHasChanges(true);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      const newItems = items.filter((_, idx) => idx !== index);
      // Update order
      newItems.forEach((item, idx) => {
        item.order = idx;
      });
      setItems(newItems);
      setHasChanges(true);
    }
  };

  // Calculate indentation based on item type
  const getIndentation = (type: string) => {
    switch (type) {
      case 'section':
        return 'pl-2';
      case 'subsection':
        return 'pl-8';
      case 'item':
        return 'pl-16';
      case 'subtotal':
        return 'pl-8';
      case 'grandtotal':
        return 'pl-2';
      default:
        return 'pl-0';
    }
  };

  // Get styling based on item type
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'section':
        return 'font-bold text-lg bg-muted/50';
      case 'subsection':
        return 'font-semibold bg-muted/30';
      case 'subtotal':
      case 'grandtotal':
        return 'font-bold bg-primary/10';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading BOQ...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{boqData?.name || 'BOQ'}</CardTitle>
          {boqData?.description && (
            <p className="text-sm text-muted-foreground mt-1">{boqData.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-row">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAddItem('section')}>
                Section
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddItem('subsection')}>
                Subsection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddItem('item')}>
                Item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddItem('subtotal')}>
                Subtotal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-boq"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="boq-table">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 w-12"></th>
                <th className="text-left p-2 w-24">No.</th>
                <th className="text-left p-2 flex-1 min-w-[300px]">Description</th>
                <th className="text-left p-2 w-20">Unit</th>
                <th className="text-right p-2 w-32">Quantity</th>
                <th className="text-right p-2 w-32">Rate</th>
                <th className="text-right p-2 w-32">Amount</th>
                <th className="text-center p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No items yet. Click "Add Row" to add items to this BOQ.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`border-b hover:bg-muted/20 ${getTypeStyle(item.type)}`}
                    data-testid={`boq-row-${index}`}
                  >
                    {/* Type selector */}
                    <td className="p-2">
                      <Select
                        value={item.type}
                        onValueChange={(value) => handleUpdateItem(index, 'type', value)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs" data-testid={`select-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="section">Sec</SelectItem>
                          <SelectItem value="subsection">Sub</SelectItem>
                          <SelectItem value="item">Item</SelectItem>
                          <SelectItem value="subtotal">Sub-T</SelectItem>
                          <SelectItem value="grandtotal">Total</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    
                    {/* Item number */}
                    <td className="p-2">
                      <Input
                        value={item.no || ''}
                        onChange={(e) => handleUpdateItem(index, 'no', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="No."
                        data-testid={`input-no-${index}`}
                      />
                    </td>
                    
                    {/* Description with indentation */}
                    <td className="p-2">
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        className={`h-8 text-sm ${getIndentation(item.type)}`}
                        placeholder="Description"
                        data-testid={`input-description-${index}`}
                      />
                    </td>
                    
                    {/* Unit */}
                    <td className="p-2">
                      {item.type === 'item' ? (
                        <Input
                          value={item.unit || ''}
                          onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Unit"
                          data-testid={`input-unit-${index}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    
                    {/* Quantity */}
                    <td className="p-2">
                      {item.type === 'item' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.qty || ''}
                          onChange={(e) => handleUpdateItem(index, 'qty', e.target.value)}
                          className="h-8 text-sm text-right"
                          placeholder="0.00"
                          data-testid={`input-qty-${index}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground text-right block">—</span>
                      )}
                    </td>
                    
                    {/* Rate */}
                    <td className="p-2">
                      {item.type === 'item' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate || ''}
                          onChange={(e) => handleUpdateItem(index, 'rate', e.target.value)}
                          className="h-8 text-sm text-right"
                          placeholder="0.00"
                          data-testid={`input-rate-${index}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground text-right block">—</span>
                      )}
                    </td>
                    
                    {/* Amount */}
                    <td className="p-2">
                      <div className="text-right text-sm font-medium" data-testid={`text-amount-${index}`}>
                        {item.amount ? Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${index}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAddItem('item', index)}>
                            Insert Row Below
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteItem(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Row
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
