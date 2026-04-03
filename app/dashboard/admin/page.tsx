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
import { GripVertical, TrendingUp, ShoppingBag, Users, Clock, Loader2, Package, ArrowUpDown, ArrowUp, ArrowDown, Filter, FileText, CheckCircle2, Search, Printer } from 'lucide-react';
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
      <TableCell className="py-4">
        <span className="font-bold text-slate-900">{category.name}</span>
      </TableCell>
      <TableCell className="font-medium text-slate-600">{category.order}</TableCell>
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
  const [isBulkAcknowledgeLoading, setIsBulkAcknowledgeLoading] = useState(false);
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

  const bulkAcknowledge = async () => {
    const submittedOrders = orders.filter(o => o.status === 'submitted');
    if (submittedOrders.length === 0) {
      toast.info(t('no_submitted_orders_to_acknowledge'));
      return;
    }

    setIsBulkAcknowledgeLoading(true);
    try {
      const updatePromises = submittedOrders.map(order => 
        updateDoc(doc(db, 'orders', order.id), {
          status: 'acknowledged',
          acknowledgedAt: new Date().toISOString()
        })
      );
      await Promise.all(updatePromises);
      toast.success(`${t('successfully_acknowledged_orders')}: ${submittedOrders.length}`);
    } catch (error: any) {
      toast.error(t('failed_to_update') + ': ' + error.message);
    } finally {
      setIsBulkAcknowledgeLoading(false);
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
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-1">
            {userData?.role === 'super_admin' ? t('super_admin_dashboard') : t('admin_dashboard')}
          </h2>
          <p className="text-slate-500 text-sm font-medium">{t('manage_orders_and_inventory')} with precision.</p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-none border border-white/50 shadow-sm"
        >
          <Label htmlFor="date-picker" className="whitespace-nowrap text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">{t('select_date')}</Label>
          <Input 
            id="date-picker" 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto border-none shadow-none focus-visible:ring-0 bg-transparent text-sm font-bold h-8 text-emerald-600"
          />
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass-card rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tonights_orders')}</span>
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totalOrders}</div>
            <div className="flex items-center mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              {format(new Date(selectedDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Revenue</span>
              <div className="flex items-center justify-center h-11 w-11 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-sm text-[11px] font-black">
                RM
              </div>
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-widest">RM</span>
              {totalRevenueMin.toFixed(0)} - {totalRevenueMax.toFixed(0)}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-4">Live Market Estimates</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="glass-card rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-amber-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Restaurants</span>
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{activeRestaurants}</div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-4">Participation Today</p>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue={userData?.role === 'super_admin' ? 'users' : 'orders'} className="w-full">
        <TabsList className="mb-10 flex w-full justify-start overflow-x-auto bg-slate-200/40 backdrop-blur-md p-1.5 rounded-none gap-1 h-auto border border-white/50 shadow-inner">
          {userData?.role === 'super_admin' && (
            <TabsTrigger 
              value="users" 
              className="rounded-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4" />
                {t('users')}
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="orders"
            className="rounded-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4" />
              {t('tonights_orders')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="categories"
            className="rounded-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2.5">
              <Filter className="h-4 w-4" />
              {t('manage_categories')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="rounded-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2.5">
              <Package className="h-4 w-4" />
              {t('manage_items')}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="report"
            className="rounded-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4" />
              {t('purchase_report')}
            </div>
          </TabsTrigger>
        </TabsList>
        
        {userData?.role === 'super_admin' && (
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="orders" className="space-y-6">
          <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
            <div className="p-8 border-b border-slate-100 bg-white/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('orders_for')} {format(new Date(selectedDate), 'dd MMM yyyy')}</h4>
                {orders.some(o => o.status === 'submitted') && (
                  <Button 
                    onClick={bulkAcknowledge} 
                    disabled={isBulkAcknowledgeLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-6 h-10 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {isBulkAcknowledgeLoading ? (
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {isBulkAcknowledgeLoading ? t('acknowledging') : t('bulk_acknowledge')}
                  </Button>
                )}
              </div>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pl-8">{t('restaurant')}</TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('status')}</TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('total_items')}</TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('est_total')}</TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pr-8 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, idx) => (
                    <motion.tr 
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-slate-50 hover:bg-emerald-50/30 transition-colors group"
                    >
                      <TableCell className="font-bold text-slate-900 py-6 pl-8">{order.restaurantName}</TableCell>
                      <TableCell className="py-6">
                        <span className={`inline-flex items-center rounded-none px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {t(order.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">{order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}</TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">
                        <span className="text-[10px] text-slate-400 mr-1 font-black">RM</span>
                        {order.totalMin.toFixed(2)} - {order.totalMax.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-6 pr-8 text-right">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="sm" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[1rem] font-bold text-[11px] uppercase tracking-widest">{t('view_details')}</Button>} />
                          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-none shadow-2xl glass-card rounded-none">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{t('order_details')}: {order.restaurantName}</DialogTitle>
                            </DialogHeader>
                            <div className="overflow-y-auto flex-1 pr-2 mt-6">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-4">{t('item')}</TableHead>
                                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-4">{t('quantity')}</TableHead>
                                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-4 text-right">{t('est_price')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-50">
                                      <TableCell className="py-4">
                                        <span className="text-slate-900 font-bold">{item.name}</span>
                                      </TableCell>
                                      <TableCell className="text-slate-600 font-medium py-4">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-slate-600 text-right font-medium py-4">
                                        <span className="text-[10px] text-slate-400 mr-1 font-black">RM</span>
                                        {(item.priceRangeMin * item.quantity).toFixed(2)} - {(item.priceRangeMax * item.quantity).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {order.status === 'submitted' && (
                              <div className="mt-8 pt-6 border-t border-slate-100">
                                <Button onClick={() => acknowledgeOrder(order.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300">
                                  {t('acknowledge_order')}
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </motion.tr>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-6 bg-slate-50 rounded-none mb-4">
                            <ShoppingBag className="h-10 w-10 text-slate-300" />
                          </div>
                          <p className="text-slate-900 font-black tracking-tight">{t('no_orders_tonight')}</p>
                          <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Orders for the selected date will appear here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger render={
                <Button 
                  onClick={() => {
                    setCategoryForm({ id: '', name: '', order: categories.length + 1 });
                    setIsCategoryDialogOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-8 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300"
                >
                  {t('add_new_category')}
                </Button>
              } />
              <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{categoryForm.id ? t('edit_category') : t('add_new_category')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('category_name')}</Label>
                    <Input 
                      value={categoryForm.name} 
                      onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                      required 
                      className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('display_order')}</Label>
                    <Input 
                      type="number" 
                      value={categoryForm.order} 
                      onChange={e => setCategoryForm({...categoryForm, order: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                      required 
                      className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('save_category')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
            <div className="p-8 border-b border-slate-100 bg-white/50">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('market_categories')}</h4>
            </div>
            <div className="p-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="w-12 py-6 pl-8"></TableHead>
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('category_name')}</TableHead>
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('display_order')}</TableHead>
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pr-8 text-right">{t('actions')}</TableHead>
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
                            <div className="p-6 bg-slate-50 rounded-none mb-4">
                              <Package className="h-10 w-10 text-slate-300" />
                            </div>
                            <p className="text-slate-900 font-black tracking-tight">{t('no_categories_found')}</p>
                            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Add a new category to get started.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Input 
                  placeholder={t('search_items')}
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 pl-12 font-bold bg-white/50 backdrop-blur-sm"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
              </div>
              {selectedItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" className="rounded-[1.5rem] border-white/50 bg-white/50 backdrop-blur-sm text-slate-600 h-12 px-6 font-bold flex items-center gap-2 shadow-sm">
                      {t('bulk_actions')} <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-none text-[10px] font-black">{selectedItems.length}</span>
                    </Button>
                  } />
                  <DropdownMenuContent className="border-none shadow-2xl glass-card rounded-none p-2 min-w-[200px]">
                    <DropdownMenuItem onClick={() => handleBulkActivate(true)} className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-none hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                      {t('activate_selected')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkActivate(false)} className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-none hover:bg-rose-50 hover:text-rose-600 transition-colors">
                      {t('deactivate_selected')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsBulkCategoryDialogOpen(true)} className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-none hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      {t('change_category')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger render={
                <Button 
                  onClick={() => {
                    setItemForm({ id: '', categoryId: '', name: '', priceRangeMin: 0, priceRangeMax: 0, unit: 'kg' });
                    setIsItemDialogOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-8 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300"
                >
                  {t('add_new_item')}
                </Button>
              } />
              <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{itemForm.id ? t('edit_item') : t('add_new_item')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('category')}</Label>
                    <Select value={itemForm.categoryId} onValueChange={v => setItemForm({...itemForm, categoryId: v || ''})}>
                      <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold"><SelectValue placeholder={t('select_category')} /></SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl rounded-none">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('item_name')}</Label>
                    <Input 
                      value={itemForm.name} 
                      onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                      required 
                      className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('min_price')} (RM)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={itemForm.priceRangeMin} 
                        onChange={e => setItemForm({...itemForm, priceRangeMin: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                        required 
                        className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('max_price')} (RM)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={itemForm.priceRangeMax} 
                        onChange={e => setItemForm({...itemForm, priceRangeMax: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                        required 
                        className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('unit')}</Label>
                    <Input 
                      value={itemForm.unit} 
                      onChange={e => setItemForm({...itemForm, unit: e.target.value})} 
                      required 
                      className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('save_item')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isBulkCategoryDialogOpen} onOpenChange={setIsBulkCategoryDialogOpen}>
              <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{t('change_category_for')} {selectedItems.length} {t('items')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBulkCategoryChange} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('new_category')}</Label>
                    <Select value={bulkCategoryForm.categoryId} onValueChange={v => setBulkCategoryForm({ categoryId: v || '' })}>
                      <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold"><SelectValue placeholder={t('select_category')} /></SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl rounded-none">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300" disabled={!bulkCategoryForm.categoryId || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('update_category')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
            <div className="p-8 border-b border-slate-100 bg-white/50">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('market_items')}</h4>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-12 py-6 pl-8">
                      <Checkbox 
                        checked={items.length > 0 && selectedItems.length === items.length}
                        onCheckedChange={toggleAllItems}
                        aria-label="Select all items"
                        className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-none"
                      />
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        {t('item_name')}
                        {sortConfig.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => requestSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        {t('category')}
                        {sortConfig.key === 'category' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => requestSort('price')}
                    >
                      <div className="flex items-center gap-2">
                        {t('est_price')}
                        {sortConfig.key === 'price' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('unit')}</TableHead>
                    <TableHead 
                      className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        {t('status')}
                        {sortConfig.key === 'status' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pr-8 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-slate-50 hover:bg-emerald-50/30 transition-colors group ${item.isActive === false ? 'opacity-40' : ''}`}
                    >
                      <TableCell className="py-6 pl-8">
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-none"
                        />
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">{categories.find(c => c.id === item.categoryId)?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">
                        <span className="text-[10px] text-slate-400 mr-1 font-black">RM</span>
                        {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">{item.unit}</TableCell>
                      <TableCell className="py-6">
                        <Badge 
                          variant={item.isActive !== false ? "outline" : "secondary"} 
                          className={
                            item.isActive !== false 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-none" 
                            : "bg-slate-100 text-slate-500 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-none"
                          }
                        >
                          {item.isActive !== false ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 pr-8 text-right">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[1rem] font-bold text-[11px] uppercase tracking-widest transition-opacity duration-300" onClick={() => {
                          setItemForm({ id: item.id, categoryId: item.categoryId, name: item.name, priceRangeMin: item.priceRangeMin, priceRangeMax: item.priceRangeMax, unit: item.unit });
                          setIsItemDialogOpen(true);
                        }}>{t('edit')}</Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-6 bg-slate-50 rounded-none mb-4">
                            <Package className="h-10 w-10 text-slate-300" />
                          </div>
                          <p className="text-slate-900 font-black tracking-tight">{items.length === 0 ? t('no_items_found') : t('no_items_match')}</p>
                          <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Try adjusting your search or add a new item.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
            <div className="p-8 border-b border-slate-100 bg-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('consolidated_purchase_list')} ({format(new Date(selectedDate), 'dd MMM yyyy')})</h4>
              <Button onClick={handlePrintList} variant="outline" className="rounded-[1.5rem] border-white/50 bg-white/50 backdrop-blur-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 h-12 px-8 font-black text-[11px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                <Printer className="h-4 w-4" />
                {t('print_list')}
              </Button>
            </div>
            <div className="p-0">
              <div className="print:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pl-8">{t('item_to_buy')}</TableHead>
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('total_quantity')}</TableHead>
                      <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pr-8">{t('breakdown')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReport.map((item, idx) => (
                      <motion.tr 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-slate-50 hover:bg-emerald-50/30 transition-colors"
                      >
                        <TableCell className="font-black text-slate-900 py-8 pl-8 text-lg tracking-tight">{item.name}</TableCell>
                        <TableCell className="py-8">
                          <span className="text-2xl font-black text-emerald-600 tracking-tighter">{item.totalQty}</span>
                          <span className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">{item.unit}</span>
                        </TableCell>
                        <TableCell className="py-8 pr-8">
                          <div className="flex flex-wrap gap-2">
                            {item.details.map((d: any, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-none bg-white/80 border border-white/50 px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                                <span className="text-slate-900 mr-2 uppercase tracking-widest">{d.restaurant}</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-none">{d.quantity} {item.unit}</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {purchaseReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-6 bg-slate-50 rounded-none mb-4">
                              <ShoppingBag className="h-10 w-10 text-slate-300" />
                            </div>
                            <p className="text-slate-900 font-black tracking-tight">{t('no_items_to_purchase')}</p>
                            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">No orders have been placed for this date yet.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
