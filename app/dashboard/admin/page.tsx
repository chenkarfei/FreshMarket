"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

function SortableCategoryRow({ category, onEdit }: { category: any, onEdit: (category: any) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as const, zIndex: 50, backgroundColor: 'var(--background)' } : {})
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-primary flex items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell>{category.order}</TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onEdit(category)}>Edit</Button>
      </TableCell>
    </TableRow>
  );
}

export default function AdminDashboard() {
  const { userData } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Item Form State
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<{ id: string, categoryId: string, name: string, priceRangeMin: number | string, priceRangeMax: number | string, unit: string }>({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkCategoryDialogOpen, setIsBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryForm, setBulkCategoryForm] = useState<{ categoryId: string }>({ categoryId: '' });

  // Category Form State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id: string, name: string, order: number | string }>({ id: '', name: '', order: 0 });

  useEffect(() => {
    if (userData?.role !== 'admin' && userData?.role !== 'super_admin') return;

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Get today's orders
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'orders'), where('orderDate', '==', today));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubCategories();
      unsubItems();
      unsubOrders();
    };
  }, [userData]);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemId = itemForm.id || uuidv4();
      await setDoc(doc(db, 'items', itemId), {
        categoryId: itemForm.categoryId,
        name: itemForm.name,
        priceRangeMin: Number(itemForm.priceRangeMin),
        priceRangeMax: Number(itemForm.priceRangeMax),
        unit: itemForm.unit,
        isActive: true
      }, { merge: true });
      
      toast.success('Item saved successfully');
      setIsItemDialogOpen(false);
      setItemForm({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryId = categoryForm.id || uuidv4();
      await setDoc(doc(db, 'categories', categoryId), {
        name: categoryForm.name,
        order: Number(categoryForm.order),
        isActive: true
      }, { merge: true });
      
      toast.success('Category saved successfully');
      setIsCategoryDialogOpen(false);
      setCategoryForm({ id: '', name: '', order: 0 });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleBulkActivate = async (isActive: boolean) => {
    if (selectedItems.length === 0) return;
    try {
      const updatePromises = selectedItems.map(itemId => 
        updateDoc(doc(db, 'items', itemId), { isActive })
      );
      await Promise.all(updatePromises);
      toast.success(`Successfully ${isActive ? 'activated' : 'deactivated'} ${selectedItems.length} items`);
      setSelectedItems([]);
    } catch (error: any) {
      toast.error('Failed to update items: ' + error.message);
    }
  };

  const handleBulkCategoryChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !bulkCategoryForm.categoryId) return;
    try {
      const updatePromises = selectedItems.map(itemId => 
        updateDoc(doc(db, 'items', itemId), { categoryId: bulkCategoryForm.categoryId })
      );
      await Promise.all(updatePromises);
      toast.success(`Successfully changed category for ${selectedItems.length} items`);
      setIsBulkCategoryDialogOpen(false);
      setSelectedItems([]);
      setBulkCategoryForm({ categoryId: '' });
    } catch (error: any) {
      toast.error('Failed to update categories: ' + error.message);
    }
  };

  const acknowledgeOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString()
      });
      toast.success('Order acknowledged');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (userData?.role !== 'admin' && userData?.role !== 'super_admin') return <div>Unauthorized</div>;

  // Generate Purchase Report
  const purchaseReport = items.map(item => {
    let totalQty = 0;
    const details: any[] = [];
    orders.filter(o => o.status !== 'draft').forEach(order => {
      const orderItem = order.items.find((i: any) => i.itemId === item.id);
      if (orderItem && orderItem.quantity > 0) {
        totalQty += orderItem.quantity;
        details.push({ restaurant: order.restaurantName, quantity: orderItem.quantity });
      }
    });
    return { ...item, totalQty, details };
  }).filter(item => item.totalQty > 0);

  const handlePrintList = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Consolidated Purchase List', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 30);

    const tableData = purchaseReport.map(item => {
      const breakdown = item.details.map((d: any) => `${d.restaurant}: ${d.quantity} ${item.unit}`).join(', ');
      return [
        item.name,
        `${item.totalQty} ${item.unit}`,
        breakdown
      ];
    });

    autoTable(doc, {
      startY: 36,
      head: [['Item to Buy', 'Total Quantity', 'Breakdown']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold', textColor: [37, 99, 235] }
      }
    });

    doc.save(`Purchase_List_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
      const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
      const newIndex = sortedCategories.findIndex((c) => c.id === over.id);

      const newCategories = arrayMove(sortedCategories, oldIndex, newIndex);
      
      // Update local state immediately for smooth UI
      setCategories(newCategories.map((c, index) => ({ ...c, order: index + 1 })));

      // Update Firestore
      try {
        const updatePromises = newCategories.map((category, index) => {
          return updateDoc(doc(db, 'categories', category.id), {
            order: index + 1
          });
        });
        await Promise.all(updatePromises);
        toast.success('Categories reordered successfully');
      } catch (error: any) {
        toast.error('Failed to save new order: ' + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Tonight's Orders</TabsTrigger>
          <TabsTrigger value="categories">Manage Categories</TabsTrigger>
          <TabsTrigger value="items">Manage Items</TabsTrigger>
          <TabsTrigger value="report">Purchase Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders for {format(new Date(), 'dd MMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Est. Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.restaurantName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          order.status === 'acknowledged' ? 'bg-green-100 text-green-800' : 
                          order.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}</TableCell>
                      <TableCell>RM {order.totalMin.toFixed(2)} - RM {order.totalMax.toFixed(2)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger render={<Button variant="outline" size="sm">View Details</Button>} />
                          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                              <DialogTitle>Order Details: {order.restaurantName}</DialogTitle>
                            </DialogHeader>
                            <div className="overflow-y-auto flex-1 pr-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Est. Price</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>{item.quantity} {item.unit}</TableCell>
                                      <TableCell>RM {(item.priceRangeMin * item.quantity).toFixed(2)} - RM {(item.priceRangeMax * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {order.status === 'submitted' && (
                              <Button onClick={() => acknowledgeOrder(order.id)} className="mt-4 w-full shrink-0">
                                Acknowledge Order
                              </Button>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No orders for tonight yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <Button onClick={() => {
                setCategoryForm({ id: '', name: '', order: categories.length + 1 });
                setIsCategoryDialogOpen(true);
              }}>Add New Category</Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{categoryForm.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input type="number" value={categoryForm.order} onChange={e => setCategoryForm({...categoryForm, order: e.target.value === '' ? '' : parseInt(e.target.value)})} required />
                  </div>
                  <Button type="submit" className="w-full">Save Category</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Market Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={categories.sort((a, b) => a.order - b.order).map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categories.sort((a, b) => a.order - b.order).map(category => (
                        <SortableCategoryRow 
                          key={category.id} 
                          category={category} 
                          onEdit={(cat) => {
                            setCategoryForm({ id: cat.id, name: cat.name, order: cat.order });
                            setIsCategoryDialogOpen(true);
                          }} 
                        />
                      ))}
                    </SortableContext>
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No categories found. Add one to get started.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {selectedItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions ({selectedItems.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkActivate(true)}>
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkActivate(false)}>
                      Deactivate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsBulkCategoryDialogOpen(true)}>
                      Change Category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <Button onClick={() => {
                setItemForm({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
                setIsItemDialogOpen(true);
              }}>Add New Item</Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add / Edit Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={itemForm.categoryId} onValueChange={v => setItemForm({...itemForm, categoryId: v || ''})}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Price (RM)</Label>
                      <Input type="number" step="0.01" value={itemForm.priceRangeMin} onChange={e => setItemForm({...itemForm, priceRangeMin: e.target.value === '' ? '' : parseFloat(e.target.value)})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Price (RM)</Label>
                      <Input type="number" step="0.01" value={itemForm.priceRangeMax} onChange={e => setItemForm({...itemForm, priceRangeMax: e.target.value === '' ? '' : parseFloat(e.target.value)})} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit (e.g., kg, bundle, box)</Label>
                    <Input value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} required />
                  </div>
                  <Button type="submit" className="w-full">Save Item</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isBulkCategoryDialogOpen} onOpenChange={setIsBulkCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Category for {selectedItems.length} Items</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBulkCategoryChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Category</Label>
                    <Select value={bulkCategoryForm.categoryId} onValueChange={v => setBulkCategoryForm({ categoryId: v || '' })}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={!bulkCategoryForm.categoryId}>Update Category</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Market Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={items.length > 0 && selectedItems.length === items.length}
                        onCheckedChange={toggleAllItems}
                        aria-label="Select all items"
                      />
                    </TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Est. Price Range</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className={item.isActive === false ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{categories.find(c => c.id === item.categoryId)?.name || 'Unknown'}</TableCell>
                      <TableCell>RM {item.priceRangeMin.toFixed(2)} - RM {item.priceRangeMax.toFixed(2)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.isActive === false ? 'Inactive' : 'Active'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          setItemForm({ id: item.id, categoryId: item.categoryId, name: item.name, priceRangeMin: item.priceRangeMin, priceRangeMax: item.priceRangeMax, unit: item.unit });
                          setIsItemDialogOpen(true);
                        }}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No items found. Add one to get started.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Consolidated Purchase List</CardTitle>
              <Button onClick={handlePrintList} variant="outline">Print List</Button>
            </CardHeader>
            <CardContent>
              <div className="print:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item to Buy</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead>Breakdown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReport.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-lg">{item.name}</TableCell>
                        <TableCell className="font-bold text-lg text-blue-600">{item.totalQty} {item.unit}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {item.details.map((d: any, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                                {d.restaurant}: {d.quantity} {item.unit}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchaseReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No items to purchase yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
