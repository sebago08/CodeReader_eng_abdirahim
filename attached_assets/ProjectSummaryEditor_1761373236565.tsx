import { useState } from 'react';
import { Plus, Trash, ArrowUp, ArrowDown, FileSpreadsheet, X } from 'lucide-react';
import { BOQ, ProjectSummary, SummaryAdjustment, SummaryAdjustmentType } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner@2.0.3';

interface ProjectSummaryEditorProps {
  boqs: BOQ[];
  projectSummary?: ProjectSummary;
  onSave: (summary: ProjectSummary) => void;
  projectName?: string;
}

export function ProjectSummaryEditor({ boqs, projectSummary, onSave, projectName }: ProjectSummaryEditorProps) {
  const [summaryAdjustments, setSummaryAdjustments] = useState<SummaryAdjustment[]>(
    projectSummary?.adjustments || []
  );
  const [showBaseSubtotal, setShowBaseSubtotal] = useState(projectSummary?.showBaseSubtotal ?? true);
  const [editingAdjustment, setEditingAdjustment] = useState<{ id: string; field: string } | null>(null);

  // Calculate grand total for a single BOQ
  const calculateBOQGrandTotal = (boq: BOQ): number => {
    // If BOQ has summary adjustments, use the final grand total from those
    if (boq.summaryAdjustments && boq.summaryAdjustments.length > 0) {
      const baseTotal = calculateBOQBaseTotal(boq);
      return calculateBOQFinalGrandTotal(boq, baseTotal);
    }
    // Otherwise, just sum all items
    return boq.items
      .filter(i => i.type === 'item')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // Calculate base total for a BOQ (sum of all items or sum of subtotals)
  const calculateBOQBaseTotal = (boq: BOQ): number => {
    const subtotals = boq.items.filter(i => i.type === 'subtotal');
    if (subtotals.length > 0) {
      // Calculate each subtotal
      return subtotals.reduce((sum, subtotal) => {
        const subtotalIndex = boq.items.findIndex(item => item.id === subtotal.id);
        let subtotalSum = 0;
        for (let i = subtotalIndex - 1; i >= 0; i--) {
          const item = boq.items[i];
          if (item.type === 'subtotal') break;
          if (item.type === 'item') subtotalSum += item.amount || 0;
        }
        return sum + subtotalSum;
      }, 0);
    }
    return boq.items
      .filter(i => i.type === 'item')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // Calculate final grand total for a BOQ with adjustments
  const calculateBOQFinalGrandTotal = (boq: BOQ, baseTotal: number): number => {
    const adjustments = boq.summaryAdjustments || [];
    
    for (let i = adjustments.length - 1; i >= 0; i--) {
      if (adjustments[i].type === 'subtotal') {
        return calculateBOQAdjustmentAmount(boq, adjustments[i], baseTotal, i);
      }
    }
    
    const adjustmentsTotal = adjustments.reduce((sum, adj, index) => {
      if (adj.type !== 'subtotal') {
        return sum + calculateBOQAdjustmentAmount(boq, adj, baseTotal, index);
      }
      return sum;
    }, 0);
    return baseTotal + adjustmentsTotal;
  };

  // Calculate adjustment amount for a BOQ adjustment
  const calculateBOQAdjustmentAmount = (boq: BOQ, adjustment: SummaryAdjustment, baseTotal: number, adjIndex: number): number => {
    const adjustments = boq.summaryAdjustments || [];
    
    if (adjustment.type === 'subtotal') {
      let previousSubtotalAmount = baseTotal;
      let startIndex = 0;
      
      for (let i = adjIndex - 1; i >= 0; i--) {
        if (adjustments[i].type === 'subtotal') {
          previousSubtotalAmount = calculateBOQAdjustmentAmount(boq, adjustments[i], baseTotal, i);
          startIndex = i + 1;
          break;
        }
      }
      
      let adjustmentSum = 0;
      for (let i = startIndex; i < adjIndex; i++) {
        const adj = adjustments[i];
        if (adj.type !== 'subtotal') {
          adjustmentSum += calculateBOQAdjustmentAmount(boq, adj, baseTotal, i);
        }
      }
      
      return previousSubtotalAmount + adjustmentSum;
    }
    
    if (adjustment.isPercentage) {
      const qtyAmount = getSubtotalForBOQAdjustment(boq, adjIndex, baseTotal);
      return qtyAmount * (adjustment.rate / 100);
    }
    return adjustment.qty * adjustment.rate;
  };

  const getSubtotalForBOQAdjustment = (boq: BOQ, adjIndex: number, baseTotal: number): number => {
    const adjustments = boq.summaryAdjustments || [];
    for (let i = adjIndex - 1; i >= 0; i--) {
      if (adjustments[i].type === 'subtotal') {
        return calculateBOQAdjustmentAmount(boq, adjustments[i], baseTotal, i);
      }
    }
    return baseTotal;
  };

  // Calculate project base total (sum of all BOQ grand totals)
  const calculateProjectBaseTotal = (): number => {
    return boqs.reduce((sum, boq) => sum + calculateBOQGrandTotal(boq), 0);
  };

  // Get subtotal for project adjustment calculation
  const getSubtotalForAdjustment = (adjIndex: number): number => {
    for (let i = adjIndex - 1; i >= 0; i--) {
      const prevAdj = summaryAdjustments[i];
      if (prevAdj.type === 'subtotal') {
        return calculateProjectAdjustmentAmount(prevAdj, calculateProjectBaseTotal(), i);
      }
    }
    return calculateProjectBaseTotal();
  };

  // Calculate project adjustment amount
  const calculateProjectAdjustmentAmount = (adjustment: SummaryAdjustment, baseTotal: number, adjIndex?: number): number => {
    if (adjustment.type === 'subtotal') {
      const index = adjIndex ?? summaryAdjustments.findIndex(a => a.id === adjustment.id);
      if (index >= 0) {
        let previousSubtotalAmount = calculateProjectBaseTotal();
        let startIndex = 0;
        
        for (let i = index - 1; i >= 0; i--) {
          if (summaryAdjustments[i].type === 'subtotal') {
            previousSubtotalAmount = calculateProjectAdjustmentAmount(summaryAdjustments[i], baseTotal, i);
            startIndex = i + 1;
            break;
          }
        }
        
        let adjustmentSum = 0;
        for (let i = startIndex; i < index; i++) {
          const adj = summaryAdjustments[i];
          if (adj.type !== 'subtotal') {
            adjustmentSum += calculateProjectAdjustmentAmount(adj, baseTotal, i);
          }
        }
        
        return previousSubtotalAmount + adjustmentSum;
      }
    }
    
    if (adjustment.isPercentage) {
      const index = adjIndex ?? summaryAdjustments.findIndex(a => a.id === adjustment.id);
      const qtyAmount = index >= 0 ? getSubtotalForAdjustment(index) : baseTotal;
      return qtyAmount * (adjustment.rate / 100);
    }
    return adjustment.qty * adjustment.rate;
  };

  // Calculate final project grand total
  const calculateFinalProjectGrandTotal = (): number => {
    const baseTotal = calculateProjectBaseTotal();
    
    for (let i = summaryAdjustments.length - 1; i >= 0; i--) {
      if (summaryAdjustments[i].type === 'subtotal') {
        return calculateProjectAdjustmentAmount(summaryAdjustments[i], baseTotal, i);
      }
    }
    
    const adjustmentsTotal = summaryAdjustments.reduce((sum, adj, index) => {
      if (adj.type !== 'subtotal') {
        return sum + calculateProjectAdjustmentAmount(adj, baseTotal, index);
      }
      return sum;
    }, 0);
    return baseTotal + adjustmentsTotal;
  };

  // Add adjustment
  const addAdjustment = (type: SummaryAdjustmentType) => {
    const isPercentage = type === 'tax' || type === 'contingency' || type === 'discount';
    const newAdjustment: SummaryAdjustment = {
      id: `adj-${Date.now()}`,
      type,
      description: type === 'subtotal' ? 'Subtotal' : 
                   type === 'tax' ? 'Tax' : 
                   type === 'contingency' ? 'Contingency' : 
                   type === 'discount' ? 'Discount' : 'Other',
      unit: isPercentage ? '%' : 'LS',
      qty: isPercentage ? calculateProjectBaseTotal() : 0,
      rate: 0,
      amount: 0,
      isPercentage,
      order: summaryAdjustments.length,
    };
    setSummaryAdjustments([...summaryAdjustments, newAdjustment]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} row added`);
  };

  // Update adjustment
  const updateAdjustment = (id: string, updates: Partial<SummaryAdjustment>) => {
    setSummaryAdjustments(summaryAdjustments.map(adj => {
      if (adj.id === id) {
        const updated = { ...adj, ...updates };
        const baseTotal = calculateProjectBaseTotal();
        updated.amount = calculateProjectAdjustmentAmount(updated, baseTotal);
        return updated;
      }
      return adj;
    }));
  };

  // Delete adjustment
  const deleteAdjustment = (id: string) => {
    setSummaryAdjustments(summaryAdjustments.filter(adj => adj.id !== id));
    toast.success('Row deleted');
  };

  // Move adjustment up
  const moveAdjustmentUp = (index: number) => {
    if (index === 0) return;
    const newAdjustments = [...summaryAdjustments];
    [newAdjustments[index - 1], newAdjustments[index]] = [newAdjustments[index], newAdjustments[index - 1]];
    setSummaryAdjustments(newAdjustments);
  };

  // Move adjustment down
  const moveAdjustmentDown = (index: number) => {
    if (index === summaryAdjustments.length - 1) return;
    const newAdjustments = [...summaryAdjustments];
    [newAdjustments[index], newAdjustments[index + 1]] = [newAdjustments[index + 1], newAdjustments[index]];
    setSummaryAdjustments(newAdjustments);
  };

  // Save project summary
  const handleSave = () => {
    const summary: ProjectSummary = {
      adjustments: summaryAdjustments,
      showBaseSubtotal,
    };
    onSave(summary);
    toast.success('Project summary saved');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (boqs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-8">
          <div className="text-center py-12">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg mb-2">No BOQs available</h3>
            <p className="text-muted-foreground">
              Create BOQs first to generate the project summary
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-[#1a5276]">Project Summary</h2>
          <p className="text-muted-foreground mt-1">Aggregate summary of all BOQs with project-level adjustments</p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-[#1a5276] hover:bg-[#14455f]"
        >
          Save Summary
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a5276]">Summary Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1a5276]">
                  <th className="border border-gray-300 px-4 py-2 text-left text-white">No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-white">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-white">Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-white">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-white">Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-white">Amount</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-white w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* BOQ Rows */}
                {boqs.map((boq, index) => (
                  <tr key={boq.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{boq.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                      ${formatCurrency(calculateBOQGrandTotal(boq))}
                    </td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                ))}

                {/* Base Subtotal */}
                {showBaseSubtotal && (
                  <tr className="bg-[#DBEAF1]">
                    <td className="border border-gray-300 px-4 py-2"></td>
                    <td className="border border-gray-300 px-4 py-2">
                      <strong>Base Subtotal</strong>
                    </td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      <strong>${formatCurrency(calculateProjectBaseTotal())}</strong>
                    </td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                )}

                {/* Adjustment Rows */}
                {summaryAdjustments.map((adj, adjIndex) => {
                  const amount = calculateProjectAdjustmentAmount(adj, calculateProjectBaseTotal(), adjIndex);
                  const isEditing = (field: string) => editingAdjustment?.id === adj.id && editingAdjustment?.field === field;

                  return (
                    <tr key={adj.id} className={adj.type === 'subtotal' ? 'bg-[#E8F4F8]' : 'hover:bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2"></td>
                      <td className="border border-gray-300 px-4 py-2">
                        {isEditing('description') ? (
                          <Input
                            value={adj.description}
                            onChange={(e) => updateAdjustment(adj.id, { description: e.target.value })}
                            onBlur={() => setEditingAdjustment(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingAdjustment(null);
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <span
                            onClick={() => adj.type !== 'subtotal' && setEditingAdjustment({ id: adj.id, field: 'description' })}
                            className={adj.type !== 'subtotal' ? 'cursor-pointer hover:bg-gray-100 block px-1' : 'font-semibold'}
                          >
                            {adj.description}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {adj.type === 'subtotal' ? '-' : (
                          isEditing('unit') ? (
                            <Select
                              value={adj.unit}
                              onValueChange={(value) => {
                                updateAdjustment(adj.id, { unit: value });
                                setEditingAdjustment(null);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="%">%</SelectItem>
                                <SelectItem value="LS">LS</SelectItem>
                                <SelectItem value="LOT">LOT</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              onClick={() => !adj.isPercentage && setEditingAdjustment({ id: adj.id, field: 'unit' })}
                              className={!adj.isPercentage ? 'cursor-pointer hover:bg-gray-100 block px-1' : ''}
                            >
                              {adj.unit}
                            </span>
                          )
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {adj.type === 'subtotal' ? '-' : (
                          adj.isPercentage ? (
                            formatCurrency(getSubtotalForAdjustment(adjIndex))
                          ) : (
                            isEditing('qty') ? (
                              <Input
                                type="number"
                                value={adj.qty}
                                onChange={(e) => updateAdjustment(adj.id, { qty: parseFloat(e.target.value) || 0 })}
                                onBlur={() => setEditingAdjustment(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingAdjustment(null);
                                }}
                                autoFocus
                                className="h-8 text-right"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingAdjustment({ id: adj.id, field: 'qty' })}
                                className="cursor-pointer hover:bg-gray-100 block px-1"
                              >
                                {formatCurrency(adj.qty)}
                              </span>
                            )
                          )
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {adj.type === 'subtotal' ? '-' : (
                          isEditing('rate') ? (
                            <Input
                              type="number"
                              value={adj.rate}
                              onChange={(e) => updateAdjustment(adj.id, { rate: parseFloat(e.target.value) || 0 })}
                              onBlur={() => setEditingAdjustment(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingAdjustment(null);
                              }}
                              autoFocus
                              className="h-8 text-right"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingAdjustment({ id: adj.id, field: 'rate' })}
                              className="cursor-pointer hover:bg-gray-100 block px-1"
                            >
                              {adj.isPercentage ? `${adj.rate}%` : formatCurrency(adj.rate)}
                            </span>
                          )
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        <strong>${formatCurrency(amount)}</strong>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveAdjustmentUp(adjIndex)}
                            disabled={adjIndex === 0}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveAdjustmentDown(adjIndex)}
                            disabled={adjIndex === summaryAdjustments.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAdjustment(adj.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total */}
                <tr className="bg-[#D5E8EF]">
                  <td className="border border-gray-300 px-4 py-2"></td>
                  <td className="border border-gray-300 px-4 py-2">
                    <strong>GRAND TOTAL</strong>
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    <strong className="text-lg">${formatCurrency(calculateFinalProjectGrandTotal())}</strong>
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#1a5276] hover:bg-[#14455f]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => addAdjustment('tax')}>
                  Tax
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addAdjustment('contingency')}>
                  Contingency
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addAdjustment('discount')}>
                  Discount
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addAdjustment('subtotal')}>
                  Subtotal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addAdjustment('other')}>
                  Other
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={() => setShowBaseSubtotal(!showBaseSubtotal)}
            >
              {showBaseSubtotal ? 'Hide' : 'Show'} Base Subtotal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
