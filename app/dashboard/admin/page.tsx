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
import { GripVertical, TrendingUp, ShoppingBag, Users, Clock, Loader2, Package, ArrowUpDown, ArrowUp, ArrowDown, Filter, FileText } from 'lucide-react';
import UserManagement from '@/components/dashboard/UserManagement';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';

function SortableCategoryRow({ category, onEdit, t }: { category: any, onEdit: (category: any) => void, t: any }) {
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
        <Button variant="outline" size="sm" onClick={() => onEdit(category)}>{t('edit')}</Button>
      </TableCell>
    </TableRow>
  );
}

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  
  // Item Form State
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<{ id: string, categoryId: string, name: string, priceRangeMin: number | string, priceRangeMax: number | string, unit: string }>({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkCategoryDialogOpen, setIsBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryForm, setBulkCategoryForm] = useState<{ categoryId: string }>({ categoryId: '' });

  // Category Form State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id: string, name: string, order: number | string }>({ id: '', name: '', order: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    if (userData?.role !== 'admin' && userData?.role !== 'super_admin') return;

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Get orders for the selected date
    const q = query(collection(db, 'orders'), where('orderDate', '==', selectedDate));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubCategories();
      unsubItems();
      unsubOrders();
    };
  }, [userData, selectedDate]);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      
      toast.success(t('item_saved'));
      setIsItemDialogOpen(false);
      setItemForm({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const categoryId = categoryForm.id || uuidv4();
      await setDoc(doc(db, 'categories', categoryId), {
        name: categoryForm.name,
        order: Number(categoryForm.order),
        isActive: true
      }, { merge: true });
      
      toast.success(t('category_saved'));
      setIsCategoryDialogOpen(false);
      setCategoryForm({ id: '', name: '', order: 0 });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
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
      toast.success(`${t('successfully')} ${isActive ? t('activated') : t('deactivated')} ${selectedItems.length} ${t('items')}`);
      setSelectedItems([]);
    } catch (error: any) {
      toast.error(t('failed_to_update') + ': ' + error.message);
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
      toast.success(`${t('successfully_changed_category')} ${selectedItems.length} ${t('items')}`);
      setIsBulkCategoryDialogOpen(false);
      setSelectedItems([]);
      setBulkCategoryForm({ categoryId: '' });
    } catch (error: any) {
      toast.error(t('failed_to_update') + ': ' + error.message);
    }
  };

  const acknowledgeOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString()
      });
      toast.success(t('order_acknowledged'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Generate Purchase Report
  const purchaseReport = items.map(item => {
    let totalQty = 0;
    const details: any[] = [];
    orders.filter(o => o.status === 'acknowledged').forEach(order => {
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
    doc.text(t('consolidated_purchase_list'), 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${t('generated_on')}: ${format(new Date(), 'PPpp')}`, 14, 30);

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
      head: [[t('item_to_buy'), t('total_quantity'), t('breakdown')]],
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

  if (userData?.role !== 'admin' && userData?.role !== 'super_admin') return <div>{t('unauthorized')}</div>;

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
        toast.success(t('categories_reordered'));
      } catch (error: any) {
        toast.error(t('failed_to_update') + ': ' + error.message);
      }
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    let aValue: any;
    let bValue: any;

    switch (sortConfig.key) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'category':
        aValue = (categories.find(c => c.id === a.categoryId)?.name || '').toLowerCase();
        bValue = (categories.find(c => c.id === b.categoryId)?.name || '').toLowerCase();
        break;
      case 'price':
        aValue = a.priceRangeMin;
        bValue = b.priceRangeMin;
        break;
      case 'status':
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredItems = sortedItems.filter(item => 
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  const totalOrders = orders.length;
  const totalRevenueMin = orders.reduce((acc, order) => acc + (order.totalMin || 0), 0);
  const totalRevenueMax = orders.reduce((acc, order) => acc + (order.totalMax || 0), 0);
  const activeRestaurants = new Set(orders.map(o => o.restaurantId)).size;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {userData?.role === 'super_admin' ? t('super_admin_dashboard') : t('admin_dashboard')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t('manage_orders_and_inventory')}</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
          <Label htmlFor="date-picker" className="whitespace-nowrap text-xs font-medium text-slate-500 px-2 uppercase tracking-wider">{t('select_date')}</Label>
          <Input 
            id="date-picker" 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto border-none shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium h-8"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-200/50 transition-all hover:border-emerald-100 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('tonights_orders')}</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{totalOrders}</div>
            <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(selectedDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-200/50 transition-all hover:border-blue-100 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Revenue</span>
              <div className="flex items-center justify-center h-8 w-8 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 text-[10px] font-black">
                RM
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              <span className="text-sm font-bold text-slate-400 mr-1 uppercase tracking-widest">RM</span>
              {totalRevenueMin.toFixed(0)} - {totalRevenueMax.toFixed(0)}
            </div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-2">Based on current orders</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-200/50 transition-all hover:border-amber-100 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Restaurants</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{activeRestaurants}</div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-2">Placed orders today</p>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue={userData?.role === 'super_admin' ? 'users' : 'orders'} className="w-full">
        <TabsList className="mb-8 flex w-full justify-start overflow-x-auto bg-slate-100/80 p-1 rounded-2xl gap-1 h-auto border-none">
          {userData?.role === 'super_admin' && (
            <TabsTrigger 
              value="users" 
              className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                {t('users')}
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="orders"
            className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5" />
              {t('tonights_orders')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="categories"
            className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              {t('manage_categories')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              {t('manage_items')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="report"
            className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('purchase_report')}
            </div>
          </TabsTrigger>
        </TabsList>
        
        {userData?.role === 'super_admin' && (
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="orders" className="space-y-4">
          <Card className="border-slate-100 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-lg font-medium text-slate-900">{t('orders_for')} {format(new Date(selectedDate), 'dd MMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pl-6">{t('restaurant')}</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('status')}</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('total_items')}</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('est_total')}</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pr-6 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900 py-4 pl-6">{order.restaurantName}</TableCell>
                      <TableCell className="py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          order.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {t(order.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 py-4">{order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}</TableCell>
                      <TableCell className="text-slate-600 py-4">
                        <span className="text-xs text-slate-400 mr-1">RM</span>
                        {order.totalMin.toFixed(2)} - {order.totalMax.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">{t('view_details')}</Button>} />
                          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-none shadow-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-semibold text-slate-900">{t('order_details')}: {order.restaurantName}</DialogTitle>
                            </DialogHeader>
                            <div className="overflow-y-auto flex-1 pr-2 mt-4">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">{t('item')}</TableHead>
                                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">{t('quantity')}</TableHead>
                                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider text-right">{t('est_price')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-50">
                                      <TableCell className="text-slate-900 font-medium">{item.name}</TableCell>
                                      <TableCell className="text-slate-600">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-slate-600 text-right">
                                        <span className="text-[10px] text-slate-400 mr-1">RM</span>
                                        {(item.priceRangeMin * item.quantity).toFixed(2)} - {(item.priceRangeMax * item.quantity).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {order.status === 'submitted' && (
                              <div className="mt-8 pt-6 border-t border-slate-100">
                                <Button onClick={() => acknowledgeOrder(order.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 transition-all">
                                  {t('acknowledge_order')}
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <ShoppingBag className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="text-slate-900 font-medium">{t('no_orders_tonight')}</p>
                          <p className="text-slate-400 text-sm mt-1">Orders for the selected date will appear here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <Button 
                onClick={() => {
                  setCategoryForm({ id: '', name: '', order: categories.length + 1 });
                  setIsCategoryDialogOpen(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6"
              >
                {t('add_new_category')}
              </Button>
              <DialogContent className="border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-slate-900">{categoryForm.id ? t('edit_category') : t('add_new_category')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('category_name')}</Label>
                    <Input 
                      value={categoryForm.name} 
                      onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                      required 
                      className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('display_order')}</Label>
                    <Input 
                      type="number" 
                      value={categoryForm.order} 
                      onChange={e => setCategoryForm({...categoryForm, order: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                      required 
                      className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 transition-all" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('save_category')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border-slate-100 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-lg font-medium text-slate-900">{t('market_categories')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="w-12 py-4 pl-6"></TableHead>
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('category_name')}</TableHead>
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('display_order')}</TableHead>
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pr-6 text-right">{t('actions')}</TableHead>
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
                          t={t}
                          onEdit={(cat) => {
                            setCategoryForm({ id: cat.id, name: cat.name, order: cat.order });
                            setIsCategoryDialogOpen(true);
                          }} 
                        />
                      ))}
                    </SortableContext>
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-4 bg-slate-50 rounded-full mb-4">
                              <Package className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-900 font-medium">{t('no_categories_found')}</p>
                            <p className="text-slate-400 text-sm mt-1">Add a new category to get started.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Input 
                  placeholder={t('search_items')}
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-10 pl-9"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {selectedItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" className="rounded-lg border-slate-200 text-slate-600 h-10">
                      {t('bulk_actions')} <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{selectedItems.length}</span>
                    </Button>
                  } />
                  <DropdownMenuContent className="border-slate-100 shadow-xl">
                    <DropdownMenuItem onClick={() => handleBulkActivate(true)} className="text-sm py-2">
                      {t('activate_selected')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkActivate(false)} className="text-sm py-2">
                      {t('deactivate_selected')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsBulkCategoryDialogOpen(true)} className="text-sm py-2">
                      {t('change_category')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <Button 
                onClick={() => {
                  setItemForm({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
                  setIsItemDialogOpen(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 h-10"
              >
                {t('add_new_item')}
              </Button>
              <DialogContent className="border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-slate-900">{itemForm.id ? t('edit_item') : t('add_new_item')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('category')}</Label>
                    <Select value={itemForm.categoryId} onValueChange={v => setItemForm({...itemForm, categoryId: v || ''})}>
                      <SelectTrigger className="rounded-lg border-slate-200 focus:ring-0 h-11"><SelectValue placeholder={t('select_category')} /></SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('item_name')}</Label>
                    <Input 
                      value={itemForm.name} 
                      onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                      required 
                      className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('min_price')} (RM)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={itemForm.priceRangeMin} 
                        onChange={e => setItemForm({...itemForm, priceRangeMin: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                        required 
                        className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('max_price')} (RM)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={itemForm.priceRangeMax} 
                        onChange={e => setItemForm({...itemForm, priceRangeMax: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                        required 
                        className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('unit')}</Label>
                    <Input 
                      value={itemForm.unit} 
                      onChange={e => setItemForm({...itemForm, unit: e.target.value})} 
                      required 
                      className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 transition-all" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('save_item')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isBulkCategoryDialogOpen} onOpenChange={setIsBulkCategoryDialogOpen}>
              <DialogContent className="border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-slate-900">{t('change_category_for')} {selectedItems.length} {t('items')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBulkCategoryChange} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('new_category')}</Label>
                    <Select value={bulkCategoryForm.categoryId} onValueChange={v => setBulkCategoryForm({ categoryId: v || '' })}>
                      <SelectTrigger className="rounded-lg border-slate-200 focus:ring-0 h-11"><SelectValue placeholder={t('select_category')} /></SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 transition-all" disabled={!bulkCategoryForm.categoryId || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('update_category')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border-slate-100 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-lg font-medium text-slate-900">{t('market_items')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-12 py-4 pl-6">
                      <Checkbox 
                        checked={items.length > 0 && selectedItems.length === items.length}
                        onCheckedChange={toggleAllItems}
                        aria-label="Select all items"
                        className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                      />
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        {t('item_name')}
                        {sortConfig.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => requestSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        {t('category')}
                        {sortConfig.key === 'category' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => requestSort('price')}
                    >
                      <div className="flex items-center gap-1">
                        {t('est_price')}
                        {sortConfig.key === 'price' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('unit')}</TableHead>
                    <TableHead 
                      className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        {t('status')}
                        {sortConfig.key === 'status' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pr-6 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id} className={`border-slate-50 hover:bg-slate-50/50 transition-colors ${item.isActive === false ? 'opacity-40' : ''}`}>
                      <TableCell className="py-4 pl-6">
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 py-4">{item.name}</TableCell>
                      <TableCell className="text-slate-600 py-4">{categories.find(c => c.id === item.categoryId)?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-slate-600 py-4">
                        <span className="text-[10px] text-slate-400 mr-1">RM</span>
                        {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-600 py-4">{item.unit}</TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          variant={item.isActive !== false ? "outline" : "secondary"} 
                          className={
                            item.isActive !== false 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase tracking-wider" 
                            : "bg-slate-100 text-slate-500 border-none font-bold text-[10px] uppercase tracking-wider"
                          }
                        >
                          {item.isActive !== false ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
                          setItemForm({ id: item.id, categoryId: item.categoryId, name: item.name, priceRangeMin: item.priceRangeMin, priceRangeMax: item.priceRangeMax, unit: item.unit });
                          setIsItemDialogOpen(true);
                        }}>{t('edit')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Package className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="text-slate-900 font-medium">{items.length === 0 ? t('no_items_found') : t('no_items_match')}</p>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or add a new item.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card className="border-slate-100 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium text-slate-900">{t('consolidated_purchase_list')} ({format(new Date(selectedDate), 'dd MMM yyyy')})</CardTitle>
              <Button onClick={handlePrintList} variant="outline" className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t('print_list')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="print:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pl-6">{t('item_to_buy')}</TableHead>
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('total_quantity')}</TableHead>
                      <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pr-6">{t('breakdown')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReport.map((item, idx) => (
                      <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-semibold text-slate-900 py-6 pl-6">{item.name}</TableCell>
                        <TableCell className="py-6">
                          <span className="text-lg font-bold text-slate-900">{item.totalQty}</span>
                          <span className="text-sm text-slate-400 ml-1.5">{item.unit}</span>
                        </TableCell>
                        <TableCell className="py-6 pr-6">
                          <div className="flex flex-wrap gap-2">
                            {item.details.map((d: any, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                <span className="font-semibold text-slate-900 mr-1.5">{d.restaurant}</span>
                                <span className="text-slate-400">{d.quantity} {item.unit}</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchaseReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-4 bg-slate-50 rounded-full mb-4">
                              <ShoppingBag className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-900 font-medium">{t('no_items_to_purchase')}</p>
                            <p className="text-slate-400 text-sm mt-1">No orders have been placed for this date yet.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
