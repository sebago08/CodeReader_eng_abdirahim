import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  FileText,
  Hash,
  Layers,
  ArrowLeft,
  Download,
  Upload,
  Search,
  Save,
  FileSpreadsheet,
  X,
  Trash,
} from 'lucide-react';
import { BOQ, BOQItem, BOQItemType, SummaryAdjustment, SummaryAdjustmentType } from '../types/project';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

interface BOQEditorProps {
  boq: BOQ;
  onSave: (boq: BOQ) => void;
  onCancel: () => void;
}

export function BOQEditor({ boq, onSave, onCancel }: BOQEditorProps) {
  const [items, setItems] = useState<BOQItem[]>(boq.items);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryAdjustments, setSummaryAdjustments] = useState<SummaryAdjustment[]>(boq.summaryAdjustments || []);
  const [editingAdjustment, setEditingAdjustment] = useState<{ id: string; field: string } | null>(null);
  const [showBaseSubtotal, setShowBaseSubtotal] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic renumbering function
  const renumberAllItems = (itemsList: BOQItem[]): BOQItem[] => {
    const renumbered = [...itemsList];
    const sections = renumbered.filter(i => i.type === 'section');
    
    sections.forEach((section, sectionIndex) => {
      // Renumber section (1.0, 2.0, 3.0, etc.)
      section.no = `${sectionIndex + 1}.0`;
      
      // Find all subsections under this section
      const subsections = renumbered.filter(i => i.type === 'subsection' && i.parentId === section.id);
      
      subsections.forEach((subsection, subsectionIndex) => {
        // Renumber subsection (1.1, 1.2, etc. or 2.1, 2.2, etc.)
        subsection.no = `${sectionIndex + 1}.${subsectionIndex + 1}`;
        
        // Find all items under this subsection
        const subsectionItems = renumbered.filter(i => i.type === 'item' && i.parentId === subsection.id);
        
        subsectionItems.forEach((item, itemIndex) => {
          // Renumber item (1.1.1, 1.1.2, etc.)
          item.no = `${sectionIndex + 1}.${subsectionIndex + 1}.${itemIndex + 1}`;
        });
      });
      
      // Handle items directly under section (no subsection)
      const directItems = renumbered.filter(i => i.type === 'item' && i.parentId === section.id);
      directItems.forEach((item, itemIndex) => {
        // Renumber direct section items (1.0.1, 1.0.2, etc.)
        item.no = `${sectionIndex + 1}.0.${itemIndex + 1}`;
      });
    });
    
    return renumbered;
  };


  // Calculate subtotal - sums all items above it up to (and excluding) the previous subtotal
  const calculateSubtotal = (subtotalId: string): number => {
    const subtotalIndex = items.findIndex(item => item.id === subtotalId);
    if (subtotalIndex === -1) return 0;

    let sum = 0;
    // Loop backward from the subtotal position
    for (let i = subtotalIndex - 1; i >= 0; i--) {
      const item = items[i];
      
      // Stop if we hit another subtotal (don't include it)
      if (item.type === 'subtotal') {
        break;
      }
      
      // Add all item amounts regardless of section/subsection
      if (item.type === 'item') {
        sum += item.amount || 0;
      }
    }
    
    return sum;
  };

  // Calculate grand total - sums ALL items in the entire BOQ
  const calculateGrandTotal = (): number => {
    return items
      .filter(i => i.type === 'item')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // Calculate base subtotals total (sum of all subtotals from items)
  const calculateBaseSubtotalsTotal = (): number => {
    return getSubtotalsWithAmounts().reduce((sum, st) => sum + st.amount, 0);
  };

  // Get the subtotal amount to use for percentage-based adjustments
  const getSubtotalForAdjustment = (adjIndex: number): number => {
    // Look backwards to find the most recent subtotal or base subtotal
    for (let i = adjIndex - 1; i >= 0; i--) {
      const prevAdj = summaryAdjustments[i];
      if (prevAdj.type === 'subtotal') {
        // Return the cumulative total at that subtotal
        return calculateAdjustmentAmount(prevAdj, calculateBaseSubtotalsTotal(), i);
      }
    }
    // If no subtotal found above, use the base subtotal
    return calculateBaseSubtotalsTotal();
  };

  // Calculate adjustment amount based on qty and rate
  const calculateAdjustmentAmount = (adjustment: SummaryAdjustment, baseTotal: number, adjIndex?: number): number => {
    // For subtotal type, sum the previous subtotal + adjustments between
    if (adjustment.type === 'subtotal') {
      const index = adjIndex ?? summaryAdjustments.findIndex(a => a.id === adjustment.id);
      if (index >= 0) {
        // Find the previous subtotal
        let previousSubtotalAmount = calculateBaseSubtotalsTotal();
        let startIndex = 0;
        
        for (let i = index - 1; i >= 0; i--) {
          if (summaryAdjustments[i].type === 'subtotal') {
            // Found a previous subtotal, use its amount as the starting point
            previousSubtotalAmount = calculateAdjustmentAmount(summaryAdjustments[i], baseTotal, i);
            startIndex = i + 1;
            break;
          }
        }
        
        // Sum all adjustments between the previous subtotal and this one
        let adjustmentSum = 0;
        for (let i = startIndex; i < index; i++) {
          const adj = summaryAdjustments[i];
          if (adj.type !== 'subtotal') {
            adjustmentSum += calculateAdjustmentAmount(adj, baseTotal, i);
          }
        }
        
        return previousSubtotalAmount + adjustmentSum;
      }
    }
    
    if (adjustment.isPercentage) {
      // For percentage: qty is the subtotal above, rate is user-entered percentage
      // amount = qty * (rate/100)
      const index = adjIndex ?? summaryAdjustments.findIndex(a => a.id === adjustment.id);
      const qtyAmount = index >= 0 ? getSubtotalForAdjustment(index) : baseTotal;
      return qtyAmount * (adjustment.rate / 100);
    }
    // For fixed: amount = qty * rate
    return adjustment.qty * adjustment.rate;
  };

  // Calculate final grand total including all adjustments
  const calculateFinalGrandTotal = (): number => {
    const baseTotal = calculateBaseSubtotalsTotal();
    
    // Find the last subtotal - if it exists, use it as the grand total
    for (let i = summaryAdjustments.length - 1; i >= 0; i--) {
      if (summaryAdjustments[i].type === 'subtotal') {
        return calculateAdjustmentAmount(summaryAdjustments[i], baseTotal, i);
      }
    }
    
    // No subtotals exist, sum base + all non-subtotal adjustments
    const adjustmentsTotal = summaryAdjustments.reduce((sum, adj, index) => {
      if (adj.type !== 'subtotal') {
        return sum + calculateAdjustmentAmount(adj, baseTotal, index);
      }
      return sum;
    }, 0);
    return baseTotal + adjustmentsTotal;
  };

  // Add summary adjustment
  const addSummaryAdjustment = (type: SummaryAdjustmentType) => {
    const isPercentage = type === 'tax' || type === 'contingency' || type === 'discount';
    const newAdjustment: SummaryAdjustment = {
      id: `adj-${Date.now()}`,
      type,
      description: type === 'subtotal' ? 'Subtotal' : 
                   type === 'tax' ? 'Tax' : 
                   type === 'contingency' ? 'Contingency' : 
                   type === 'discount' ? 'Discount' : 'Other',
      unit: isPercentage ? '%' : 'LS',
      qty: isPercentage ? calculateBaseSubtotalsTotal() : 0,
      rate: 0,
      amount: 0,
      isPercentage,
      order: summaryAdjustments.length,
    };
    setSummaryAdjustments([...summaryAdjustments, newAdjustment]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} row added`);
  };

  // Update summary adjustment
  const updateSummaryAdjustment = (id: string, updates: Partial<SummaryAdjustment>) => {
    setSummaryAdjustments(summaryAdjustments.map(adj => {
      if (adj.id === id) {
        const updated = { ...adj, ...updates };
        const baseTotal = calculateBaseSubtotalsTotal();
        
        // Recalculate amount
        updated.amount = calculateAdjustmentAmount(updated, baseTotal);
        return updated;
      }
      return adj;
    }));
  };

  // Delete summary adjustment
  const deleteSummaryAdjustment = (id: string) => {
    setSummaryAdjustments(summaryAdjustments.filter(adj => adj.id !== id));
    toast.success('Row deleted');
  };

  // Move adjustment up
  const moveAdjustmentUp = (id: string) => {
    const idx = summaryAdjustments.findIndex(adj => adj.id === id);
    if (idx > 0) {
      const newAdj = [...summaryAdjustments];
      [newAdj[idx], newAdj[idx - 1]] = [newAdj[idx - 1], newAdj[idx]];
      newAdj.forEach((adj, i) => adj.order = i);
      setSummaryAdjustments(newAdj);
    }
  };

  // Move adjustment down
  const moveAdjustmentDown = (id: string) => {
    const idx = summaryAdjustments.findIndex(adj => adj.id === id);
    if (idx < summaryAdjustments.length - 1) {
      const newAdj = [...summaryAdjustments];
      [newAdj[idx], newAdj[idx + 1]] = [newAdj[idx + 1], newAdj[idx]];
      newAdj.forEach((adj, i) => adj.order = i);
      setSummaryAdjustments(newAdj);
    }
  };

  // Add grand total to the BOQ
  const addGrandTotal = () => {
    // Check if grand total already exists
    const existingGrandTotal = items.find(i => i.type === 'grandtotal');
    if (existingGrandTotal) {
      toast.error('Grand Total already exists');
      return;
    }

    const newItem: BOQItem = {
      id: `grandtotal-${Date.now()}`,
      type: 'grandtotal',
      no: '',
      description: 'GRAND TOTAL',
      order: items.length,
    };

    setItems([...items, newItem]);
    toast.success('Grand Total added');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const itemCount = items.filter(i => i.type === 'item').length;
    const sectionCount = items.filter(i => i.type === 'section').length;
    const subsectionCount = items.filter(i => i.type === 'subsection').length;
    const total = items
      .filter(i => i.type === 'item')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    return { itemCount, sectionCount, subsectionCount, total };
  }, [items]);

  // Generate next number for a given type
  const getNextNumber = (type: BOQItemType, parentId?: string): string => {
    if (type === 'section') {
      const sections = items.filter(i => i.type === 'section');
      return `${sections.length + 1}.0`;
    }
    if (type === 'subsection' && parentId) {
      const parent = items.find(i => i.id === parentId);
      if (!parent) return '1.1';
      const sectionNo = parent.no.split('.')[0];
      const subsections = items.filter(
        i => i.type === 'subsection' && i.parentId === parentId
      );
      return `${sectionNo}.${subsections.length + 1}`;
    }
    if (type === 'item' && parentId) {
      const parent = items.find(i => i.id === parentId);
      if (!parent) return '1.1.1';
      const subsectionNo = parent.no;
      const itemsInSubsection = items.filter(
        i => i.type === 'item' && i.parentId === parentId
      );
      return `${subsectionNo}.${itemsInSubsection.length + 1}`;
    }
    return '1.0';
  };

  const toggleCollapse = (itemId: string) => {
    const newCollapsed = new Set(collapsedItems);
    if (newCollapsed.has(itemId)) {
      newCollapsed.delete(itemId);
    } else {
      newCollapsed.add(itemId);
    }
    setCollapsedItems(newCollapsed);
  };

  const addSection = () => {
    const newItem: BOQItem = {
      id: `section-${Date.now()}`,
      type: 'section',
      no: '', // Will be set by renumbering
      description: 'NEW SECTION',
      order: items.length,
    };
    const newItems = renumberAllItems([...items, newItem]);
    setItems(newItems);
  };

  // Insert different types of rows above or below a given row
  const insertRow = (referenceItemId: string, rowType: BOQItemType, position: 'above' | 'below') => {
    const referenceIndex = items.findIndex(i => i.id === referenceItemId);
    if (referenceIndex === -1) return;

    const referenceItem = items[referenceIndex];
    let newItem: BOQItem;
    let parentId: string | undefined;
    let insertIndex: number;

    // Determine parent based on row type and context
    if (rowType === 'section') {
      newItem = {
        id: `section-${Date.now()}`,
        type: 'section',
        no: '', // Will be set by renumbering
        description: 'NEW SECTION',
        order: 0,
      };
      // For sections, insert directly above/below the reference
      insertIndex = position === 'above' ? referenceIndex : referenceIndex + 1;
    } else if (rowType === 'subsection') {
      // For subsection, find the parent section
      if (referenceItem.type === 'section') {
        parentId = referenceItem.id;
      } else if (referenceItem.parentId) {
        const parent = items.find(i => i.id === referenceItem.parentId);
        if (parent?.type === 'section') {
          parentId = parent.id;
        } else if (parent?.parentId) {
          const grandparent = items.find(i => i.id === parent.parentId);
          if (grandparent?.type === 'section') {
            parentId = grandparent.id;
          }
        }
      }
      if (!parentId) {
        toast.error('Cannot insert subsection here. Please insert under a section.');
        return;
      }
      newItem = {
        id: `subsection-${Date.now()}`,
        type: 'subsection',
        no: '', // Will be set by renumbering
        description: 'New Subsection',
        parentId,
        order: 0,
      };
      
      // Find the correct position relative to siblings
      if (referenceItem.type === 'section') {
        // If reference is a section, insert after it (first child position)
        insertIndex = position === 'below' ? referenceIndex + 1 : referenceIndex + 1;
      } else {
        insertIndex = position === 'above' ? referenceIndex : referenceIndex + 1;
      }
    } else if (rowType === 'description') {
      // For description, find the parent (can be section or subsection)
      if (referenceItem.type === 'section') {
        parentId = referenceItem.id;
      } else if (referenceItem.type === 'subsection') {
        parentId = referenceItem.id;
      } else if (referenceItem.parentId) {
        // Use the same parent as the reference item
        parentId = referenceItem.parentId;
      }
      if (!parentId) {
        toast.error('Cannot insert description here. Please insert under a section or subsection.');
        return;
      }

      newItem = {
        id: `description-${Date.now()}`,
        type: 'description',
        no: '',
        description: 'Enter description text here...',
        parentId,
        order: 0,
      };
      
      // Find the correct position relative to siblings
      if (referenceItem.type === 'section' || referenceItem.type === 'subsection') {
        // If reference is a section/subsection, insert after it (first child position)
        insertIndex = position === 'below' ? referenceIndex + 1 : referenceIndex + 1;
      } else {
        // Reference is a sibling (another child of the same parent)
        insertIndex = position === 'above' ? referenceIndex : referenceIndex + 1;
      }
    } else if (rowType === 'item') {
      // For item, find the parent subsection only
      if (referenceItem.type === 'subsection') {
        parentId = referenceItem.id;
      } else if (referenceItem.parentId) {
        const parent = items.find(i => i.id === referenceItem.parentId);
        if (parent?.type === 'subsection') {
          parentId = parent.id;
        }
      }
      if (!parentId) {
        toast.error('Cannot insert item here. Please insert under a subsection.');
        return;
      }

      newItem = {
        id: `item-${Date.now()}`,
        type: 'item',
        no: '', // Will be set by renumbering
        description: 'New Item',
        unit: 'sum',
        quantity: 1,
        rate: 0,
        amount: 0,
        parentId,
        order: 0,
      };
      
      // Find the correct position relative to siblings
      if (referenceItem.type === 'subsection') {
        // If reference is a subsection, insert after it (first child position)
        insertIndex = position === 'below' ? referenceIndex + 1 : referenceIndex + 1;
      } else {
        // Reference is a sibling (another child of the same parent)
        insertIndex = position === 'above' ? referenceIndex : referenceIndex + 1;
      }
    } else if (rowType === 'subtotal') {
      // For subtotal, find the parent (can be section or subsection)
      if (referenceItem.type === 'section') {
        parentId = referenceItem.id;
      } else if (referenceItem.type === 'subsection') {
        parentId = referenceItem.id;
      } else if (referenceItem.parentId) {
        // Use the same parent as the reference item
        parentId = referenceItem.parentId;
      }
      if (!parentId) {
        toast.error('Cannot insert subtotal here. Please insert under a section or subsection.');
        return;
      }

      const parent = items.find(i => i.id === parentId);
      newItem = {
        id: `subtotal-${Date.now()}`,
        type: 'subtotal',
        no: '',
        description: `Sub-total - ${parent?.description || 'Section'}`,
        parentId,
        order: 0,
      };
      
      // Find the correct position relative to siblings
      if (referenceItem.type === 'section' || referenceItem.type === 'subsection') {
        // If reference is a section/subsection, insert after it (first child position)
        insertIndex = position === 'below' ? referenceIndex + 1 : referenceIndex + 1;
      } else {
        // Reference is a sibling (another child of the same parent)
        insertIndex = position === 'above' ? referenceIndex : referenceIndex + 1;
      }
    } else {
      return;
    }

    // Insert at the calculated position
    const newItems = [...items];
    newItems.splice(insertIndex, 0, newItem);
    const renumbered = renumberAllItems(newItems);
    setItems(renumbered);
    toast.success(`${rowType.charAt(0).toUpperCase() + rowType.slice(1)} inserted ${position}`);
  };

  const duplicateItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Cannot duplicate grand total
    if (item.type === 'grandtotal') {
      toast.error('Cannot duplicate Grand Total');
      return;
    }

    // Find the index of the original item
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    const newItem: BOQItem = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      order: items.length,
      no: item.type === 'description' || item.type === 'subtotal' ? '' : item.no, // Will be renumbered
    };

    // Insert the duplicated item right after the original
    const newItems = [...items];
    newItems.splice(itemIndex + 1, 0, newItem);
    const renumbered = renumberAllItems(newItems);
    setItems(renumbered);
    toast.success('Row duplicated');
  };

  const updateItem = (itemId: string, updates: Partial<BOQItem>) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        // Auto-calculate amount if quantity or rate changed
        if (item.type === 'item' && (updates.quantity !== undefined || updates.rate !== undefined)) {
          updated.amount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const deleteItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Delete item and all its children
    const toDelete = new Set([itemId]);
    const findChildren = (parentId: string) => {
      items.forEach(i => {
        if (i.parentId === parentId) {
          toDelete.add(i.id);
          findChildren(i.id);
        }
      });
    };
    findChildren(itemId);

    const filtered = items.filter(i => !toDelete.has(i.id));
    const renumbered = renumberAllItems(filtered);
    setItems(renumbered);
    toast.success('Row deleted');
  };

  const moveItemUp = (itemId: string) => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx > 0) {
      const newItems = [...items];
      [newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]];
      const renumbered = renumberAllItems(newItems);
      setItems(renumbered);
    }
  };

  const moveItemDown = (itemId: string) => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx < items.length - 1) {
      const newItems = [...items];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      const renumbered = renumberAllItems(newItems);
      setItems(renumbered);
    }
  };

  const handleSave = () => {
    onSave({
      ...boq,
      items,
      summaryAdjustments,
      lastModified: new Date().toISOString(),
    });
    toast.success('BOQ saved successfully');
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        // Process Excel data and convert to BOQ structure
        const importedItems: BOQItem[] = [];
        let currentSection: BOQItem | null = null;
        let currentSubsection: BOQItem | null = null;
        let sectionCounter = 1;
        let subsectionCounter: { [key: string]: number } = {};
        let itemCounter: { [key: string]: number } = {};

        // Helper to detect row type
        const detectRowType = (row: any[]): { type: BOQItemType | null; data: any } => {
          if (!row || row.length === 0 || !row[0]) return { type: null, data: null };

          const firstCell = String(row[0] || '').trim();
          const secondCell = String(row[1] || '').trim();
          const allText = row.map(c => String(c || '').trim()).join(' ').toLowerCase();

          // Check for subtotal
          if (allText.includes('sub-total') || allText.includes('subtotal')) {
            return { 
              type: 'subtotal', 
              data: { 
                description: secondCell || firstCell || 'Sub-total' 
              } 
            };
          }

          // Check for section (typically numbered 1, 2, 3 or roman numerals I, II, III)
          if (/^[0-9IVX]+\.?$/.test(firstCell) || /^[A-Z\s]+$/.test(firstCell) && firstCell.length > 2) {
            return { 
              type: 'section', 
              data: { 
                no: firstCell.match(/^[0-9IVX]+/) ? firstCell : '',
                description: secondCell || firstCell 
              } 
            };
          }

          // Check for subsection (numbered like 1.1, 1.2, etc.)
          if (/^[0-9]+\.[0-9]+$/.test(firstCell)) {
            return { 
              type: 'subsection', 
              data: { 
                no: firstCell,
                description: secondCell 
              } 
            };
          }

          // Check for item (has unit, quantity, rate columns)
          // Excel columns: A=Item, B=Description, C=Unit, D=Quantity, E=Rate, F=Amount
          const hasUnit = row[2] && String(row[2]).trim().length > 0 && isNaN(Number(row[2]));
          const hasQuantity = row[3] && !isNaN(Number(row[3]));
          const hasRate = row[4] && !isNaN(Number(row[4]));

          if (hasQuantity || hasUnit || hasRate) {
            return { 
              type: 'item', 
              data: {
                no: firstCell,
                description: secondCell,
                unit: String(row[2] || 'sum'),
                quantity: parseFloat(row[3]) || 0,
                rate: parseFloat(row[4]) || 0,
                amount: parseFloat(row[5]) || (parseFloat(row[3]) || 0) * (parseFloat(row[4]) || 0)
              } 
            };
          }

          // Check for description (plain text, no numbers)
          if (secondCell && secondCell.length > 0) {
            return { 
              type: 'description', 
              data: { 
                description: secondCell || firstCell 
              } 
            };
          }

          return { type: null, data: null };
        };

        // Process each row
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const { type, data } = detectRowType(row);

          if (!type || !data) continue;

          if (type === 'section') {
            const sectionNo = data.no || `${sectionCounter}`;
            currentSection = {
              id: `section-${Date.now()}-${i}`,
              type: 'section',
              no: sectionNo,
              description: data.description.toUpperCase(),
              order: importedItems.length,
            };
            importedItems.push(currentSection);
            subsectionCounter[currentSection.id] = 1;
            currentSubsection = null;
            sectionCounter++;
          } else if (type === 'subsection') {
            if (!currentSection) {
              // Create a default section if none exists
              currentSection = {
                id: `section-${Date.now()}-${i}`,
                type: 'section',
                no: `${sectionCounter}`,
                description: 'IMPORTED SECTION',
                order: importedItems.length,
              };
              importedItems.push(currentSection);
              subsectionCounter[currentSection.id] = 1;
              sectionCounter++;
            }

            currentSubsection = {
              id: `subsection-${Date.now()}-${i}`,
              type: 'subsection',
              no: data.no || `${currentSection.no}.${subsectionCounter[currentSection.id]}`,
              description: data.description,
              parentId: currentSection.id,
              order: importedItems.length,
            };
            importedItems.push(currentSubsection);
            itemCounter[currentSubsection.id] = 1;
            subsectionCounter[currentSection.id]++;
          } else if (type === 'description') {
            const parentId = currentSubsection?.id || currentSection?.id;
            if (parentId) {
              importedItems.push({
                id: `description-${Date.now()}-${i}`,
                type: 'description',
                no: '',
                description: data.description,
                parentId,
                order: importedItems.length,
              });
            }
          } else if (type === 'item') {
            if (!currentSubsection) {
              // Items must belong to a subsection, create one if needed
              if (!currentSection) {
                currentSection = {
                  id: `section-${Date.now()}-${i}`,
                  type: 'section',
                  no: `${sectionCounter}`,
                  description: 'IMPORTED SECTION',
                  order: importedItems.length,
                };
                importedItems.push(currentSection);
                subsectionCounter[currentSection.id] = 1;
                sectionCounter++;
              }

              currentSubsection = {
                id: `subsection-${Date.now()}-${i}`,
                type: 'subsection',
                no: `${currentSection.no}.${subsectionCounter[currentSection.id]}`,
                description: 'Imported Items',
                parentId: currentSection.id,
                order: importedItems.length,
              };
              importedItems.push(currentSubsection);
              itemCounter[currentSubsection.id] = 1;
              subsectionCounter[currentSection.id]++;
            }

            importedItems.push({
              id: `item-${Date.now()}-${i}`,
              type: 'item',
              no: data.no || `${currentSubsection.no}.${itemCounter[currentSubsection.id]}`,
              description: data.description,
              unit: data.unit,
              quantity: data.quantity,
              rate: data.rate,
              amount: data.amount,
              parentId: currentSubsection.id,
              order: importedItems.length,
            });
            itemCounter[currentSubsection.id]++;
          } else if (type === 'subtotal') {
            const parentId = currentSubsection?.id || currentSection?.id;
            if (parentId) {
              importedItems.push({
                id: `subtotal-${Date.now()}-${i}`,
                type: 'subtotal',
                no: '',
                description: data.description,
                parentId,
                order: importedItems.length,
              });
            }
          }
        }

        if (importedItems.length > 0) {
          const renumbered = renumberAllItems(importedItems);
          setItems(renumbered);
          toast.success(`Successfully imported ${importedItems.length} items from Excel`);
        } else {
          toast.error('No valid BOQ data found in Excel file');
        }
      } catch (error) {
        console.error('Error importing Excel:', error);
        toast.error('Failed to import Excel file. Please check the file format.');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input value to allow re-importing the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get all subtotals with their calculated amounts
  const getSubtotalsWithAmounts = (): { description: string; amount: number }[] => {
    const subtotals = items.filter(i => i.type === 'subtotal');
    return subtotals.map(subtotal => ({
      description: subtotal.description,
      amount: calculateSubtotal(subtotal.id),
    }));
  };

  // Check if BOQ has subtotals
  const hasSubtotals = (): boolean => {
    return items.some(i => i.type === 'subtotal');
  };

  // Export BOQ to Excel with Summary Page
  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Common styles
      const headerStyle = {
        font: { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1a5276' } },
        alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FF000000' } },
          left: { style: 'thin' as const, color: { argb: 'FF000000' } },
          bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
          right: { style: 'thin' as const, color: { argb: 'FF000000' } }
        }
      };

      const subtotalStyle = {
        font: { name: 'Times New Roman', size: 11, bold: true },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8F4F8' } },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FF000000' } },
          left: { style: 'thin' as const, color: { argb: 'FF000000' } },
          bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
          right: { style: 'thin' as const, color: { argb: 'FF000000' } }
        }
      };

      const grandTotalStyle = {
        font: { name: 'Times New Roman', size: 11, bold: true },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD5E8EF' } },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FF000000' } },
          left: { style: 'thin' as const, color: { argb: 'FF000000' } },
          bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
          right: { style: 'thin' as const, color: { argb: 'FF000000' } }
        }
      };

      const cellBorder = {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      };

      // Create Summary Sheet if subtotals exist
      if (hasSubtotals()) {
        const summarySheet = workbook.addWorksheet('BOQ Summary');

        // Set column widths
        summarySheet.columns = [
          { width: 8 },   // No
          { width: 50 },  // Description
          { width: 12 },  // Unit
          { width: 14 },  // Qty
          { width: 16 },  // Rate
          { width: 16 },  // Amount
        ];

        // Title
        summarySheet.getCell('A1').value = 'BOQ SUMMARY';
        summarySheet.getCell('A1').font = { name: 'Times New Roman', size: 14, bold: true };
        summarySheet.mergeCells('A1:F1');
        summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // Project name
        summarySheet.getCell('A3').value = boq.name;
        summarySheet.getCell('A3').font = { name: 'Times New Roman', size: 12, bold: true };
        summarySheet.mergeCells('A3:F3');
        summarySheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

        // Headers
        const headerRow = summarySheet.getRow(5);
        headerRow.values = ['No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'];
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.font = headerStyle.font;
          cell.fill = headerStyle.fill;
          cell.alignment = headerStyle.alignment;
          cell.border = headerStyle.border;
        });

        // Add subtotals
        const subtotalsData = getSubtotalsWithAmounts();
        let currentRow = 6;
        subtotalsData.forEach(({ description, amount }, index) => {
          const row = summarySheet.getRow(currentRow);
          row.values = [index + 1, description, '', '', '', amount];
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Times New Roman', size: 11 };
            cell.border = cellBorder;
            if (colNumber === 6) {
              cell.numFmt = '#,##0.00';
              cell.alignment = { horizontal: 'right' };
            }
          });
          currentRow++;
        });

        // Base Subtotal row if there are adjustments or multiple subtotals and it's visible
        if (subtotalsData.length > 0 && showBaseSubtotal) {
          const baseSubtotalRow = summarySheet.getRow(currentRow);
          baseSubtotalRow.values = ['', 'Base Subtotal', '', '', '', calculateBaseSubtotalsTotal()];
          baseSubtotalRow.eachCell((cell, colNumber) => {
            cell.font = { name: 'Times New Roman', size: 11, bold: true };
            cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBE5F1' } };
            cell.border = cellBorder;
            if (colNumber === 6) {
              cell.numFmt = '#,##0.00';
              cell.alignment = { horizontal: 'right' };
            }
          });
          currentRow++;
        }

        // Add custom adjustment rows
        const baseTotal = calculateBaseSubtotalsTotal();
        summaryAdjustments.forEach((adj, adjIndex) => {
          const amount = calculateAdjustmentAmount(adj, baseTotal, adjIndex);
          const row = summarySheet.getRow(currentRow);
          
          // For subtotal type, show dashes for Unit, Qty, Rate
          if (adj.type === 'subtotal') {
            row.values = ['', adj.description, '', '', '', amount];
          } else if (adj.isPercentage) {
            // For percentage: Qty shows subtotal above, Rate shows percentage
            const displayQty = getSubtotalForAdjustment(adjIndex);
            row.values = ['', adj.description, adj.unit, displayQty, adj.rate, amount];
          } else {
            row.values = ['', adj.description, adj.unit, adj.qty, adj.rate, amount];
          }
          
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Times New Roman', size: 11 };
            cell.border = cellBorder;
            if (colNumber === 3) {
              cell.alignment = { horizontal: 'center' };
            }
            if (colNumber === 4 || colNumber === 6) {
              cell.numFmt = '#,##0.00';
              cell.alignment = { horizontal: 'right' };
            }
            if (colNumber === 5) {
              // Rate column: percentage for tax/contingency/discount, currency for others
              if (adj.isPercentage) {
                cell.numFmt = '0.00"%"';
              } else {
                cell.numFmt = '#,##0.00';
              }
              cell.alignment = { horizontal: 'right' };
            }
          });
          currentRow++;
        });

        // Grand Total
        currentRow++; // Skip a row
        const grandTotalRow = summarySheet.getRow(currentRow);
        grandTotalRow.values = ['', 'GRAND TOTAL', '', '', '', calculateFinalGrandTotal()];
        grandTotalRow.eachCell((cell, colNumber) => {
          cell.font = grandTotalStyle.font;
          cell.fill = grandTotalStyle.fill;
          cell.border = grandTotalStyle.border;
          if (colNumber === 6) {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right' };
          }
        });
      }

      // Create Detailed BOQ Sheet
      const detailedSheet = workbook.addWorksheet('Detailed BOQ');

      // Set column widths
      detailedSheet.columns = [
        { width: 12 },  // No.
        { width: 60 },  // Description
        { width: 12 },  // Unit
        { width: 14 },  // Quantity
        { width: 16 },  // Rate
        { width: 16 },  // Amount
      ];

      let rowIndex = 1;

      // Title
      detailedSheet.getCell('A1').value = 'Bill of Quantities (BOQ)';
      detailedSheet.getCell('A1').font = { name: 'Times New Roman', size: 14, bold: true };
      detailedSheet.mergeCells('A1:F1');
      detailedSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      rowIndex += 2;

      // Project name
      detailedSheet.getCell(`A${rowIndex}`).value = boq.name;
      detailedSheet.getCell(`A${rowIndex}`).font = { name: 'Times New Roman', size: 12, bold: true };
      detailedSheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
      detailedSheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
      rowIndex += 2;

      // Headers
      const headerRow = detailedSheet.getRow(rowIndex);
      headerRow.values = ['No.', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount'];
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
        cell.border = headerStyle.border;
      });
      rowIndex++;

      // Track subtotal rows for styling
      const subtotalRows: number[] = [];

      // Function to add items recursively
      const addItemsToSheet = (parentId?: string, level: number = 0) => {
        const children = items.filter(i => i.parentId === parentId);
        
        children.forEach(item => {
          const row = detailedSheet.getRow(rowIndex);
          
          if (item.type === 'section') {
            row.values = [item.no, item.description, '', '', '', ''];
            row.eachCell((cell) => {
              cell.font = { name: 'Times New Roman', size: 11, bold: true };
              cell.border = cellBorder;
            });
            rowIndex++;
            addItemsToSheet(item.id, level + 1);
          } else if (item.type === 'subsection') {
            row.values = [item.no, '  ' + item.description, '', '', '', ''];
            row.eachCell((cell) => {
              cell.font = { name: 'Times New Roman', size: 11, bold: true };
              cell.border = cellBorder;
            });
            rowIndex++;
            addItemsToSheet(item.id, level + 1);
          } else if (item.type === 'description') {
            row.values = ['', '    ' + item.description, '', '', '', ''];
            row.eachCell((cell) => {
              cell.font = { name: 'Times New Roman', size: 11 };
              cell.border = cellBorder;
            });
            rowIndex++;
          } else if (item.type === 'item') {
            row.values = [
              item.no,
              '      ' + item.description,
              item.unit || '',
              item.quantity || 0,
              item.rate || 0,
              item.amount || 0,
            ];
            row.eachCell((cell, colNumber) => {
              cell.font = { name: 'Times New Roman', size: 11 };
              cell.border = cellBorder;
              if (colNumber >= 4 && colNumber <= 6) {
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
              }
            });
            rowIndex++;
          } else if (item.type === 'subtotal') {
            subtotalRows.push(rowIndex);
            row.values = ['', '  ' + item.description, '', '', '', calculateSubtotal(item.id)];
            row.eachCell((cell, colNumber) => {
              cell.font = subtotalStyle.font;
              cell.fill = subtotalStyle.fill;
              cell.border = subtotalStyle.border;
              if (colNumber === 6) {
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
              }
            });
            rowIndex++;
          }
        });
      };

      // Add all sections and their children
      const sections = items.filter(i => i.type === 'section');
      sections.forEach(section => {
        const row = detailedSheet.getRow(rowIndex);
        row.values = [section.no, section.description, '', '', '', ''];
        row.eachCell((cell) => {
          cell.font = { name: 'Times New Roman', size: 11, bold: true };
          cell.border = cellBorder;
        });
        rowIndex++;
        addItemsToSheet(section.id, 1);
      });

      // Add grand total if exists
      if (items.find(i => i.type === 'grandtotal')) {
        rowIndex++; // Skip a row
        const grandTotalRow = detailedSheet.getRow(rowIndex);
        grandTotalRow.values = ['', 'GRAND TOTAL', '', '', '', calculateGrandTotal()];
        grandTotalRow.eachCell((cell, colNumber) => {
          cell.font = grandTotalStyle.font;
          cell.fill = grandTotalStyle.fill;
          cell.border = grandTotalStyle.border;
          if (colNumber === 6) {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right' };
          }
        });
      }

      // Generate filename
      const filename = `${boq.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('BOQ exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export BOQ to Excel');
    }
  };

  // Unified menu for all row types
  const renderRowMenu = (itemId: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">Insert Above</div>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'section', 'above')}>
          Section Header
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'subsection', 'above')}>
          Sub-section Header
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'description', 'above')}>
          Description
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'item', 'above')}>
          Line Item
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'subtotal', 'above')}>
          Sub-total
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">Insert Below</div>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'section', 'below')}>
          Section Header
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'subsection', 'below')}>
          Sub-section Header
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'description', 'below')}>
          Description
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'item', 'below')}>
          Line Item
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertRow(itemId, 'subtotal', 'below')}>
          Sub-total
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={addGrandTotal}>
          Grand Total
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => duplicateItem(itemId)}>
          Duplicate Row
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteItem(itemId)} className="text-red-600">
          Delete Row
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Build hierarchical structure for rendering
  const renderItems = () => {
    const sections = items.filter(i => i.type === 'section');
    
    return sections.map(section => {
      const sectionCollapsed = collapsedItems.has(section.id);
      const subsections = items.filter(i => i.type === 'subsection' && i.parentId === section.id);
      const sectionTotal = items
        .filter(i => i.type === 'item' && i.parentId === section.id)
        .reduce((sum, item) => sum + (item.amount || 0), 0);

      return (
        <div key={section.id}>
          {/* Section Row */}
          <div className="flex items-center border-b border-gray-200 hover:bg-gray-50 group">
            {/* Blue indicator */}
            <div className="w-1 h-full bg-[#3498db] mr-0"></div>
            
            <div className="flex items-center flex-1">
              <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                <button
                  onClick={() => toggleCollapse(section.id)}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {sectionCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="w-20 px-3 py-2.5">
                <span className="text-sm text-gray-600">
                  {section.no}
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5">
                {editingCell?.itemId === section.id && editingCell?.field === 'description' ? (
                  <Input
                    value={section.description}
                    onChange={(e) => updateItem(section.id, { description: e.target.value })}
                    onBlur={() => setEditingCell(null)}
                    className="h-7 px-2 text-sm"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => setEditingCell({ itemId: section.id, field: 'description' })}
                    className="cursor-text text-sm uppercase"
                  >
                    {section.description}
                  </span>
                )}
              </div>
              <div className="w-24 px-3 py-2.5 text-sm"></div>
              <div className="w-24 px-3 py-2.5 text-sm text-right"></div>
              <div className="w-32 px-3 py-2.5 text-sm text-right"></div>
              <div className="w-32 px-3 py-2.5 text-sm text-right text-gray-500">
                ${formatCurrency(sectionTotal)}
              </div>
              <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                {renderRowMenu(section.id)}
              </div>
            </div>
          </div>

          {/* Section-level descriptions and subtotals */}
          {!sectionCollapsed && items.filter(i => (i.type === 'description' || i.type === 'subtotal') && i.parentId === section.id).map(child => {
            if (child.type === 'description') {
              return (
                <div key={child.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50 group">
                  <div className="w-1"></div>
                  <div className="flex items-center flex-1">
                    <div className="w-12 px-2 py-2.5"></div>
                    <div className="w-20 px-3 py-2.5"></div>
                    <div className="flex-1 px-3 py-3 pl-8">
                      {editingCell?.itemId === child.id && editingCell?.field === 'description' ? (
                        <Input
                          value={child.description}
                          onChange={(e) => updateItem(child.id, { description: e.target.value })}
                          onBlur={() => setEditingCell(null)}
                          className="h-7 px-2 text-sm italic"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingCell({ itemId: child.id, field: 'description' })}
                          className="cursor-text text-sm italic text-gray-600"
                        >
                          {child.description}
                        </span>
                      )}
                    </div>
                    <div className="w-24 px-3 py-2.5"></div>
                    <div className="w-24 px-3 py-2.5"></div>
                    <div className="w-32 px-3 py-2.5"></div>
                    <div className="w-32 px-3 py-2.5 text-sm text-right text-gray-400">
                      $0.00
                    </div>
                    <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                      {renderRowMenu(child.id)}
                    </div>
                  </div>
                </div>
              );
            } else if (child.type === 'subtotal') {
              const subtotalAmount = calculateSubtotal(child.id);
              return (
                <div key={child.id} className="flex items-center border-b border-gray-200 hover:bg-gray-50 bg-gray-50 group">
                  <div className="w-1"></div>
                  <div className="flex items-center flex-1">
                    <div className="w-12 px-2 py-2.5"></div>
                    <div className="w-20 px-3 py-2.5"></div>
                    <div className="flex-1 px-3 py-2.5 pl-8">
                      {editingCell?.itemId === child.id && editingCell?.field === 'description' ? (
                        <Input
                          value={child.description}
                          onChange={(e) => updateItem(child.id, { description: e.target.value })}
                          onBlur={() => setEditingCell(null)}
                          className="h-7 px-2 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingCell({ itemId: child.id, field: 'description' })}
                          className="cursor-text text-sm"
                        >
                          {child.description}
                        </span>
                      )}
                    </div>
                    <div className="w-24 px-3 py-2.5"></div>
                    <div className="w-24 px-3 py-2.5"></div>
                    <div className="w-32 px-3 py-2.5"></div>
                    <div className="w-32 px-3 py-2.5 text-sm text-right">
                      ${formatCurrency(subtotalAmount)}
                    </div>
                    <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                      {renderRowMenu(child.id)}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* Subsections */}
          {!sectionCollapsed && subsections.map(subsection => {
            const subsectionCollapsed = collapsedItems.has(subsection.id);
            const children = items.filter(i => i.parentId === subsection.id);
            const subsectionTotal = children
              .filter(c => c.type === 'item')
              .reduce((sum, item) => sum + (item.amount || 0), 0);

            return (
              <div key={subsection.id}>
                {/* Subsection Row */}
                <div className="flex items-center border-b border-gray-200 hover:bg-gray-50 group">
                  <div className="w-1"></div>
                  <div className="flex items-center flex-1">
                    <div className="w-12 px-2 py-2.5"></div>
                    <div className="w-20 px-3 py-2.5 flex items-center">
                      <button
                        onClick={() => toggleCollapse(subsection.id)}
                        className="p-0.5 hover:bg-gray-200 rounded mr-1"
                      >
                        {subsectionCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-sm text-gray-600">
                        {subsection.no}
                      </span>
                    </div>
                    <div className="flex-1 px-3 py-2.5">
                      {editingCell?.itemId === subsection.id && editingCell?.field === 'description' ? (
                        <Input
                          value={subsection.description}
                          onChange={(e) => updateItem(subsection.id, { description: e.target.value })}
                          onBlur={() => setEditingCell(null)}
                          className="h-7 px-2 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingCell({ itemId: subsection.id, field: 'description' })}
                          className="cursor-text text-sm"
                        >
                          {subsection.description}
                        </span>
                      )}
                    </div>
                    <div className="w-24 px-3 py-2.5 text-sm"></div>
                    <div className="w-24 px-3 py-2.5 text-sm text-right"></div>
                    <div className="w-32 px-3 py-2.5 text-sm text-right"></div>
                    <div className="w-32 px-3 py-2.5 text-sm text-right text-gray-500">
                      ${formatCurrency(subsectionTotal)}
                    </div>
                    <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                      {renderRowMenu(subsection.id)}
                    </div>
                  </div>
                </div>

                {/* Children (descriptions, items, subtotals) */}
                {!subsectionCollapsed && children.map(child => {
                  if (child.type === 'description') {
                    return (
                      <div key={child.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50 group">
                        <div className="w-1"></div>
                        <div className="flex items-center flex-1">
                          <div className="w-12 px-2 py-2.5"></div>
                          <div className="w-20 px-3 py-2.5"></div>
                          <div className="flex-1 px-3 py-3 pl-12">
                            {editingCell?.itemId === child.id && editingCell?.field === 'description' ? (
                              <Input
                                value={child.description}
                                onChange={(e) => updateItem(child.id, { description: e.target.value })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-sm italic"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'description' })}
                                className="cursor-text text-sm italic text-gray-600"
                              >
                                {child.description}
                              </span>
                            )}
                          </div>
                          <div className="w-24 px-3 py-2.5"></div>
                          <div className="w-24 px-3 py-2.5"></div>
                          <div className="w-32 px-3 py-2.5"></div>
                          <div className="w-32 px-3 py-2.5 text-sm text-right text-gray-400">
                            $0.00
                          </div>
                          <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                            {renderRowMenu(child.id)}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (child.type === 'subtotal') {
                    const subtotalAmount = calculateSubtotal(child.id);
                    return (
                      <div key={child.id} className="flex items-center border-b border-gray-200 hover:bg-gray-50 bg-gray-50 group">
                        <div className="w-1"></div>
                        <div className="flex items-center flex-1 bg-[#E8F4F8]">
                          <div className="w-12 px-2 py-2.5"></div>
                          <div className="w-20 px-3 py-2.5"></div>
                          <div className="flex-1 px-3 py-2.5">
                            {editingCell?.itemId === child.id && editingCell?.field === 'description' ? (
                              <Input
                                value={child.description}
                                onChange={(e) => updateItem(child.id, { description: e.target.value })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'description' })}
                                className="cursor-text text-sm"
                              >
                                {child.description}
                              </span>
                            )}
                          </div>
                          <div className="w-24 px-3 py-2.5"></div>
                          <div className="w-24 px-3 py-2.5"></div>
                          <div className="w-32 px-3 py-2.5"></div>
                          <div className="w-32 px-3 py-2.5 text-sm text-right">
                            ${formatCurrency(subtotalAmount)}
                          </div>
                          <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                            {renderRowMenu(child.id)}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (child.type === 'item') {
                    return (
                      <div key={child.id} className="flex items-center border-b border-gray-200 hover:bg-gray-50 group">
                        <div className="w-1"></div>
                        <div className="flex items-center flex-1">
                          <div className="w-12 px-2 py-2.5"></div>
                          <div className="w-20 px-3 py-2.5 pl-8">
                            <span className="text-sm text-gray-600">
                              {child.no}
                            </span>
                          </div>
                          <div className="flex-1 px-3 py-2.5">
                            {editingCell?.itemId === child.id && editingCell?.field === 'description' ? (
                              <Input
                                value={child.description}
                                onChange={(e) => updateItem(child.id, { description: e.target.value })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'description' })}
                                className="cursor-text text-sm"
                              >
                                {child.description}
                              </span>
                            )}
                          </div>
                          <div className="w-24 px-3 py-2.5">
                            {editingCell?.itemId === child.id && editingCell?.field === 'unit' ? (
                              <Input
                                value={child.unit || ''}
                                onChange={(e) => updateItem(child.id, { unit: e.target.value })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'unit' })}
                                className="cursor-text text-sm"
                              >
                                {child.unit || '-'}
                              </span>
                            )}
                          </div>
                          <div className="w-24 px-3 py-2.5 text-right">
                            {editingCell?.itemId === child.id && editingCell?.field === 'quantity' ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={child.quantity || ''}
                                onChange={(e) => updateItem(child.id, { quantity: parseFloat(e.target.value) || 0 })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-right text-sm"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'quantity' })}
                                className="cursor-text text-sm"
                              >
                                {child.quantity?.toFixed(2) || '0.00'}
                              </span>
                            )}
                          </div>
                          <div className="w-32 px-3 py-2.5 text-right">
                            {editingCell?.itemId === child.id && editingCell?.field === 'rate' ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={child.rate || ''}
                                onChange={(e) => updateItem(child.id, { rate: parseFloat(e.target.value) || 0 })}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 px-2 text-right text-sm"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingCell({ itemId: child.id, field: 'rate' })}
                                className="cursor-text text-sm"
                              >
                                ${formatCurrency(child.rate || 0)}
                              </span>
                            )}
                          </div>
                          <div className="w-32 px-3 py-2.5 text-sm text-right">
                            ${formatCurrency(child.amount || 0)}
                          </div>
                          <div className="w-12 px-2 py-2.5 flex items-center justify-center">
                            {renderRowMenu(child.id)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onCancel} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to BOQs
          </Button>
          <div className="h-8 w-px bg-gray-300"></div>
          <h2 className="text-2xl text-gray-900">{boq.name}</h2>
        </div>
        <Button onClick={handleSave} className="bg-[#1a5276] hover:bg-[#14455f] gap-2">
          <Save className="w-4 h-4" />
          Save BOQ
        </Button>
      </div>

      {/* Title and Description */}
      <div>
        <h1 className="text-3xl mb-2">Bill of Quantities (BOQ)</h1>
        <p className="text-gray-600 mb-1">
          ${formatCurrency(stats.total)}
        </p>
        <p className="text-gray-500 text-sm">
          {stats.itemCount} line items
        </p>
      </div>

      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Import BOQ
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={addSection}>
            <Plus className="w-4 h-4" />
            Add Row
          </Button>
          {hasSubtotals() && (
            <Button 
              variant={showSummary ? "default" : "outline"}
              size="sm" 
              className={showSummary ? "gap-2 bg-[#1a5276] hover:bg-[#14455f]" : "gap-2"}
              onClick={() => setShowSummary(!showSummary)}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {showSummary ? 'Hide' : 'Show'} Summary
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportToExcel}>
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 h-9"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>{stats.itemCount} Items</span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          <span>Total: ${formatCurrency(stats.total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>{stats.sectionCount} Sections, {stats.subsectionCount} Subsections</span>
        </div>
      </div>

      {/* BOQ Summary Preview */}
      {showSummary && hasSubtotals() && (
        <div className="border-2 border-[#3498db] rounded-lg overflow-hidden bg-white">
          <div className="bg-[#1a5276] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              <h3 className="font-semibold">BOQ Summary</h3>
            </div>
            <button 
              onClick={() => setShowSummary(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              This summary will appear as the first page when exporting to Excel or PDF.
            </p>
            
            {/* Add Adjustment Buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {!showBaseSubtotal && getSubtotalsWithAmounts().length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowBaseSubtotal(true);
                    toast.success('Base Subtotal row restored');
                  }}
                  className="gap-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" />
                  Restore Base Subtotal
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSummaryAdjustment('subtotal')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Subtotal
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSummaryAdjustment('tax')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Tax
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSummaryAdjustment('contingency')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Contingency
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSummaryAdjustment('discount')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Discount
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSummaryAdjustment('other')}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Other
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1a5276] border-b border-gray-300">
                    <th className="px-4 py-3 text-left text-sm w-16 text-white font-bold">No</th>
                    <th className="px-4 py-3 text-left text-sm text-white font-bold">Description</th>
                    <th className="px-4 py-3 text-center text-sm w-24 text-white font-bold">Unit</th>
                    <th className="px-4 py-3 text-right text-sm w-28 text-white font-bold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm w-36 text-white font-bold">Rate</th>
                    <th className="px-4 py-3 text-right text-sm w-36 text-white font-bold">Amount</th>
                    <th className="px-4 py-3 text-center text-sm w-24 text-white font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Base subtotals from BOQ items */}
                  {getSubtotalsWithAmounts().map((subtotal, index) => (
                    <tr key={`subtotal-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">{subtotal.description}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-400">-</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400">-</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400">-</td>
                      <td className="px-4 py-3 text-sm text-right">${formatCurrency(subtotal.amount)}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-400">-</td>
                    </tr>
                  ))}

                  {/* Base Subtotal Row */}
                  {getSubtotalsWithAmounts().length > 0 && showBaseSubtotal && (
                    <tr className="bg-blue-50 border-t border-b border-gray-300 group">
                      <td className="px-4 py-3 text-sm"></td>
                      <td className="px-4 py-3 text-sm">
                        <strong>Base Subtotal</strong>
                      </td>
                      <td className="px-4 py-3 text-sm text-center"></td>
                      <td className="px-4 py-3 text-sm text-right"></td>
                      <td className="px-4 py-3 text-sm text-right"></td>
                      <td className="px-4 py-3 text-sm text-right">
                        <strong>${formatCurrency(calculateBaseSubtotalsTotal())}</strong>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setShowBaseSubtotal(false);
                                toast.success('Base Subtotal row hidden');
                              }}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )}

                  {/* Custom adjustment rows */}
                  {summaryAdjustments.map((adj, adjIndex) => {
                    const baseTotal = calculateBaseSubtotalsTotal();
                    // For percentage: qty shows subtotal above, rate is user-entered percentage
                    const displayQty = adj.isPercentage ? getSubtotalForAdjustment(adjIndex) : adj.qty;
                    const displayRate = adj.isPercentage ? adj.rate : adj.rate;
                    const amount = calculateAdjustmentAmount(adj, baseTotal, adjIndex);
                    
                    return (
                      <tr key={adj.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-sm"></td>
                        <td className="px-4 py-3 text-sm">
                          {editingAdjustment?.id === adj.id && editingAdjustment?.field === 'description' ? (
                            <Input
                              value={adj.description}
                              onChange={(e) => updateSummaryAdjustment(adj.id, { description: e.target.value })}
                              onBlur={() => setEditingAdjustment(null)}
                              className="h-8 px-2 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => setEditingAdjustment({ id: adj.id, field: 'description' })}
                              className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded"
                            >
                              {adj.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {adj.type === 'subtotal' ? (
                            <span className="text-gray-400">-</span>
                          ) : adj.isPercentage ? (
                            <span className="text-gray-600">%</span>
                          ) : (
                            editingAdjustment?.id === adj.id && editingAdjustment?.field === 'unit' ? (
                              <Input
                                value={adj.unit}
                                onChange={(e) => updateSummaryAdjustment(adj.id, { unit: e.target.value })}
                                onBlur={() => setEditingAdjustment(null)}
                                className="h-8 px-2 text-sm text-center"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingAdjustment({ id: adj.id, field: 'unit' })}
                                className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded"
                              >
                                {adj.unit}
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {adj.type === 'subtotal' ? (
                            <span className="text-gray-400">-</span>
                          ) : adj.isPercentage ? (
                            <span className="text-gray-600">${formatCurrency(displayQty)}</span>
                          ) : (
                            editingAdjustment?.id === adj.id && editingAdjustment?.field === 'qty' ? (
                              <Input
                                type="number"
                                value={adj.qty}
                                onChange={(e) => updateSummaryAdjustment(adj.id, { qty: parseFloat(e.target.value) || 0 })}
                                onBlur={() => setEditingAdjustment(null)}
                                className="h-8 px-2 text-sm text-right"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingAdjustment({ id: adj.id, field: 'qty' })}
                                className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded inline-block"
                              >
                                {adj.qty}
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {adj.type === 'subtotal' ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            editingAdjustment?.id === adj.id && editingAdjustment?.field === 'rate' ? (
                              <Input
                                type="number"
                                value={adj.rate}
                                onChange={(e) => updateSummaryAdjustment(adj.id, { rate: parseFloat(e.target.value) || 0 })}
                                onBlur={() => setEditingAdjustment(null)}
                                className="h-8 px-2 text-sm text-right"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => setEditingAdjustment({ id: adj.id, field: 'rate' })}
                                className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded inline-block"
                              >
                                {adj.isPercentage ? `${adj.rate}%` : `${formatCurrency(adj.rate)}`}
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          ${formatCurrency(amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => moveAdjustmentUp(adj.id)}>
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => moveAdjustmentDown(adj.id)}>
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteSummaryAdjustment(adj.id)}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-[#1a5276]/10 border-t-2 border-[#1a5276]">
                    <td className="px-4 py-3 text-sm"></td>
                    <td className="px-4 py-3 text-sm text-[#1a5276] uppercase">
                      <strong>Grand Total</strong>
                    </td>
                    <td className="px-4 py-3 text-sm"></td>
                    <td className="px-4 py-3 text-sm"></td>
                    <td className="px-4 py-3 text-sm"></td>
                    <td className="px-4 py-3 text-sm text-right text-[#1a5276]">
                      <strong>${formatCurrency(calculateFinalGrandTotal())}</strong>
                    </td>
                    <td className="px-4 py-3 text-sm"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center bg-[rgb(26,82,118)] border-b border-gray-300">
          <div className="w-1"></div>
          <div className="w-12 px-2 py-3"></div>
          <div className="w-20 px-3 py-3 text-sm text-white font-bold">No.</div>
          <div className="flex-1 px-3 py-3 text-sm text-white font-bold">Description</div>
          <div className="w-24 px-3 py-3 text-sm text-white font-bold">Unit</div>
          <div className="w-24 px-3 py-3 text-sm text-right text-white font-bold">Quantity</div>
          <div className="w-32 px-3 py-3 text-sm text-right text-white font-bold">Rate</div>
          <div className="w-32 px-3 py-3 text-sm text-right text-white font-bold">Amount</div>
          <div className="w-12 px-2 py-3"></div>
        </div>

        {/* Table Body */}
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items yet. Click "Add Row" to create a section.
          </div>
        ) : (
          <div className="bg-white">
            {renderItems()}
            
            {/* Grand Total Row */}
            {items.find(i => i.type === 'grandtotal') && (
              <div className="flex items-center border-t-2 border-[#1a5276] bg-[#1a5276]/5 group">
                <div className="w-1"></div>
                <div className="flex items-center flex-1">
                  <div className="w-12 px-2 py-3"></div>
                  <div className="w-20 px-3 py-3"></div>
                  <div className="flex-1 px-3 py-3">
                    <span className="text-sm uppercase text-[#1a5276]">
                      GRAND TOTAL
                    </span>
                  </div>
                  <div className="w-24 px-3 py-3"></div>
                  <div className="w-24 px-3 py-3"></div>
                  <div className="w-32 px-3 py-3"></div>
                  <div className="w-32 px-3 py-3 text-sm text-right text-[#1a5276]">
                    ${formatCurrency(calculateGrandTotal())}
                  </div>
                  <div className="w-12 px-2 py-3 flex items-center justify-center">
                    {renderRowMenu(items.find(i => i.type === 'grandtotal')!.id)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <p className="text-xs text-gray-500">
        <span className="font-medium">Keyboard shortcuts:</span> Enter = Insert Line Item below • Shift+Enter = Insert Line Item above • Ctrl+Enter = Edit cell
      </p>
    </div>
  );
}
