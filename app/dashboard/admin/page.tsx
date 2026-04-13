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
import domtoimage from 'dom-to-image-more';
import Image from 'next/image';
import { ImageUpload } from '@/components/ui/image-upload';
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
import { GripVertical, TrendingUp, ShoppingBag, Users, Clock, Loader2, Package, ArrowUpDown, ArrowUp, ArrowDown, Filter, FileText, CheckCircle2, Search, Printer, Sparkles } from 'lucide-react';
import UserManagement from '@/components/dashboard/UserManagement';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { GoogleGenAI } from "@google/genai";

const STANDARD_UNITS = [
  { value: 'kg', label: 'kg (公斤)' },
  { value: 'g', label: 'g (克)' },
  { value: 'pack', label: 'pack (包)' },
  { value: 'tray', label: 'tray (托盘)' },
  { value: 'box', label: 'box (箱)' },
  { value: 'bottle', label: 'bottle (瓶)' },
  { value: 'bundle', label: 'bundle (捆)' },
];

function SortableCategoryRow({ category, onEdit, t, td }: { category: any, onEdit: (category: any) => void, t: any, td: any }) {
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
        <div className="flex items-center gap-3">
          {category.imageUrl ? (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0">
              <Image 
                src={category.imageUrl} 
                alt={category.name} 
                fill 
                className="object-cover"
                referrerPolicy="no-referrer"
                unoptimized={category.imageUrl.startsWith('http')}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
              <Filter className="h-4 w-4 text-slate-300" />
            </div>
          )}
          <span className="font-bold text-slate-900">{td(category)}</span>
        </div>
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
  const { t, td, tu, formatDate } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  
  // Item Form State
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<{ id: string, categoryId: string, name: string, translations: Record<string, string>, priceRangeMin: number | string, priceRangeMax: number | string, unit: string, unitTranslations: Record<string, string>, imageUrl: string }>({ id: '', categoryId: '', name: '', translations: {}, priceRangeMin: 0, priceRangeMax: 0, unit: 'kg', unitTranslations: {}, imageUrl: '' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkCategoryDialogOpen, setIsBulkCategoryDialogOpen] = useState(false);
  const [isBulkAcknowledgeLoading, setIsBulkAcknowledgeLoading] = useState(false);
  const [bulkCategoryForm, setBulkCategoryForm] = useState<{ categoryId: string }>({ categoryId: '' });

  // Category Form State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id: string, name: string, translations: Record<string, string>, order: number | string, imageUrl: string }>({ id: '', name: '', translations: {}, order: 0, imageUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  // Translation States
  const [isTranslatingCat, setIsTranslatingCat] = useState(false);
  const [isTranslatingItem, setIsTranslatingItem] = useState(false);
  const [isTranslatingUnit, setIsTranslatingUnit] = useState(false);

  const translateText = async (text: string, targetLang: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key is missing');
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Translate the following text to ${targetLang === 'zh' ? 'Simplified Chinese' : 'English'}. Only return the translated text, nothing else. Text: "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text?.trim();
    } catch (error: any) {
      console.error("Translation error:", error);
      throw error;
    }
  };

  const handleTranslateCategory = async () => {
    const en = categoryForm.translations?.['en'];
    const zh = categoryForm.translations?.['zh'];
    if (!en && !zh) return toast.error(t('enter_text_to_translate'));

    setIsTranslatingCat(true);
    try {
      if (en && !zh) {
        const translated = await translateText(en, 'zh');
        setCategoryForm(prev => ({ ...prev, translations: { ...prev.translations, zh: translated ?? '' } }));
      } else if (zh && !en) {
        const translated = await translateText(zh, 'en');
        setCategoryForm(prev => ({ ...prev, name: translated ?? '', translations: { ...prev.translations, en: translated ?? '' } }));
      } else {
        const translated = await translateText(en, 'zh');
        setCategoryForm(prev => ({ ...prev, translations: { ...prev.translations, zh: translated ?? '' } }));
      }
      toast.success(t('translation_complete'));
    } catch (e) {
      toast.error(t('translation_failed'));
    } finally {
      setIsTranslatingCat(false);
    }
  };

  const handleTranslateItem = async () => {
    const en = itemForm.translations?.['en'];
    const zh = itemForm.translations?.['zh'];
    if (!en && !zh) return toast.error(t('enter_text_to_translate'));

    setIsTranslatingItem(true);
    try {
      if (en && !zh) {
        const translated = await translateText(en, 'zh');
        setItemForm(prev => ({ ...prev, translations: { ...prev.translations, zh: translated ?? '' } }));
      } else if (zh && !en) {
        const translated = await translateText(zh, 'en');
        setItemForm(prev => ({ ...prev, name: translated ?? '', translations: { ...prev.translations, en: translated ?? '' } }));
      } else {
        const translated = await translateText(en, 'zh');
        setItemForm(prev => ({ ...prev, translations: { ...prev.translations, zh: translated ?? '' } }));
      }
      toast.success(t('translation_complete'));
    } catch (e) {
      toast.error(t('translation_failed'));
    } finally {
      setIsTranslatingItem(false);
    }
  };

  const handleTranslateUnit = async () => {
    const en = itemForm.unitTranslations?.['en'];
    const zh = itemForm.unitTranslations?.['zh'];
    if (!en && !zh) return toast.error(t('enter_text_to_translate'));

    setIsTranslatingUnit(true);
    try {
      if (en && !zh) {
        const translated = await translateText(en, 'zh');
        setItemForm(prev => ({ ...prev, unitTranslations: { ...prev.unitTranslations, zh: translated ?? '' } }));
      } else if (zh && !en) {
        const translated = await translateText(zh, 'en');
        setItemForm(prev => ({ ...prev, unitTranslations: { ...prev.unitTranslations, en: translated ?? '' } }));
      } else {
        const translated = await translateText(en, 'zh');
        setItemForm(prev => ({ ...prev, unitTranslations: { ...prev.unitTranslations, zh: translated ?? '' } }));
      }
      toast.success(t('translation_complete'));
    } catch (e) {
      toast.error(t('translation_failed'));
    } finally {
      setIsTranslatingUnit(false);
    }
  };

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
      const unitToSave = itemForm.unit === 'custom' ? (itemForm.unitTranslations?.['en'] || 'custom') : itemForm.unit;
      const unitTranslationsToSave = itemForm.unit === 'custom' ? itemForm.unitTranslations : {};

      await setDoc(doc(db, 'items', itemId), {
        categoryId: itemForm.categoryId,
        name: itemForm.name,
        translations: itemForm.translations || {},
        priceRangeMin: Number(itemForm.priceRangeMin),
        priceRangeMax: Number(itemForm.priceRangeMax),
        unit: unitToSave,
        unitTranslations: unitTranslationsToSave,
        isActive: true,
        imageUrl: itemForm.imageUrl || ''
      }, { merge: true });
      
      toast.success(t('item_saved'));
      setIsItemDialogOpen(false);
      setItemForm({ id: '', categoryId: '', name: '', translations: {}, priceRangeMin: 0, priceRangeMax: 0, unit: 'kg', unitTranslations: {}, imageUrl: '' });
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
        translations: categoryForm.translations || {},
        order: Number(categoryForm.order),
        isActive: true,
        imageUrl: categoryForm.imageUrl || ''
      }, { merge: true });
      
      toast.success(t('category_saved'));
      setIsCategoryDialogOpen(false);
      setCategoryForm({ id: '', name: '', translations: {}, order: 0, imageUrl: '' });
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

  const handlePrintList = async () => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Inter, sans-serif';
    element.style.backgroundColor = 'white';
    element.style.color = '#1e293b';
    element.style.width = '800px';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    
    // Reset global styles that might interfere
    const style = document.createElement('style');
    style.innerHTML = `
      .pdf-container * { border: none !important; outline: none !important; box-shadow: none !important; margin: 0; padding: 0; box-sizing: border-box; }
      .pdf-container table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px !important; }
      .pdf-container th { background-color: #f8fafc !important; color: #64748b !important; font-weight: 600 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; padding: 12px !important; border-bottom: 2px solid #e2e8f0 !important; text-align: left !important; }
      .pdf-container td { padding: 12px !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 13px !important; color: #334155 !important; vertical-align: top !important; }
      .pdf-container .item-name { font-weight: 600 !important; color: #0f172a !important; }
      .pdf-container .qty-cell { font-weight: 700 !important; color: #059669 !important; }
      .pdf-container .breakdown-text { color: #64748b !important; font-size: 11px !important; line-height: 1.5 !important; }
    `;
    element.className = 'pdf-container';
    element.appendChild(style);
    document.body.appendChild(element);
    
    const header = document.createElement('div');
    header.style.borderBottom = '2px solid #10b981';
    header.style.paddingBottom = '20px';
    header.style.marginBottom = '30px';
    
    const title = document.createElement('h1');
    title.innerText = t('consolidated_purchase_list');
    title.style.fontSize = '28px';
    title.style.fontWeight = '800';
    title.style.color = '#0f172a';
    title.style.letterSpacing = '-0.02em';
    header.appendChild(title);
    
    const meta = document.createElement('p');
    meta.innerText = `${t('generated_on')}: ${formatDate(new Date(), 'PPpp')}`;
    meta.style.fontSize = '12px';
    meta.style.color = '#94a3b8';
    meta.style.marginTop = '4px';
    header.appendChild(meta);
    
    element.appendChild(header);
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    [t('item_to_buy'), t('total_quantity'), t('breakdown')].forEach(text => {
      const th = document.createElement('th');
      th.innerText = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    purchaseReport.forEach(item => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.className = 'item-name';
      nameCell.innerText = td(item);
      row.appendChild(nameCell);
      
      const qtyCell = document.createElement('td');
      qtyCell.className = 'qty-cell';
      qtyCell.innerText = `${item.totalQty} ${tu(item)}`;
      row.appendChild(qtyCell);
      
      const breakdownCell = document.createElement('td');
      breakdownCell.className = 'breakdown-text';
      breakdownCell.innerText = item.details.map((d: any) => `${d.restaurant}: ${d.quantity} ${tu(item)}`).join(', ');
      row.appendChild(breakdownCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    element.appendChild(table);

    try {
      const dataUrl = await domtoimage.toPng(element, {
        bgcolor: 'white',
        width: 800,
        height: element.scrollHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Purchase_List_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      document.body.removeChild(element);
    }
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
        aValue = t(categories.find(c => c.id === a.categoryId)?.name || '').toLowerCase();
        bValue = t(categories.find(c => c.id === b.categoryId)?.name || '').toLowerCase();
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
          <p className="text-slate-500 text-sm font-medium">{t('manage_orders_and_inventory')} {t('with_precision')}</p>
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
        <motion.div className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass-card h-full flex flex-col rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tonights_orders')}</span>
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totalOrders}</div>
            <div className="flex items-center mt-auto pt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              {formatDate(new Date(selectedDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </motion.div>
        
        <motion.div className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card h-full flex flex-col rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('est_revenue')}</span>
              <div className="flex items-center justify-center h-11 w-11 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-sm text-[11px] font-black">
                RM
              </div>
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-widest">RM</span>
              {totalRevenueMin.toFixed(0)} - {totalRevenueMax.toFixed(0)}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-auto pt-4">{t('live_market_estimates')}</p>
          </div>
        </motion.div>

        <motion.div className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="glass-card h-full flex flex-col rounded-none p-8 transition-all hover:shadow-2xl hover:shadow-amber-500/10 group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('active_restaurants')}</span>
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{activeRestaurants}</div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-auto pt-4">{t('participation_today')}</p>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue={userData?.role === 'super_admin' ? 'users' : 'orders'} className="w-full">
        <div className="px-1 sm:px-0 mb-10">
          <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar bg-slate-50/50 backdrop-blur-md p-1 rounded-none gap-3 h-auto border border-slate-100 shadow-sm px-2 sm:px-1.5">
            {userData?.role === 'super_admin' && (
              <TabsTrigger 
                value="users" 
                className="rounded-none px-3 sm:px-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md transition-all duration-300 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  {t('users')}
                </div>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="orders"
              className="rounded-none px-3 sm:px-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md transition-all duration-300 shrink-0"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5" />
                {t('tonights_orders')}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="categories"
              className="rounded-none px-3 sm:px-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md transition-all duration-300 shrink-0"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                {t('manage_categories')}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="items"
              className="rounded-none px-3 sm:px-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md transition-all duration-300 shrink-0"
            >
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                {t('manage_items')}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="report"
              className="rounded-none px-3 sm:px-8 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md transition-all duration-300 shrink-0"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('purchase_report')}
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
        
        {userData?.role === 'super_admin' && (
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="orders" className="space-y-6">
          <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
            <div className="p-8 border-b border-slate-100 bg-white/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('orders_for')} {formatDate(new Date(selectedDate), 'dd MMM yyyy')}</h4>
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
            <div className="p-0 overflow-x-auto no-scrollbar">
              <Table className="min-w-[800px] sm:min-w-0">
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
                                        <span className="text-slate-900 font-bold">{td(items.find(i => i.id === item.itemId) || item)}</span>
                                      </TableCell>
                                      <TableCell className="text-slate-600 font-medium py-4">{item.quantity} {tu(item)}</TableCell>
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
+                          <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{t('orders_date_appear')}</p>
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
                    setCategoryForm({ id: '', name: '', translations: {}, order: categories.length + 1, imageUrl: '' });
                    setIsCategoryDialogOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-8 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300"
                >
                  {t('add_new_category')}
                </Button>
              } />
              <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{categoryForm.id ? t('edit_category') : t('add_new_category')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-6 mt-6">
                  <ImageUpload 
                    value={categoryForm.imageUrl} 
                    onChange={(val) => setCategoryForm({...categoryForm, imageUrl: val})}
                    label={t('category_image')}
                  />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('category_name')}</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleTranslateCategory} disabled={isTranslatingCat} className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 rounded-[1rem]">
                        {isTranslatingCat ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {t('auto_translate')}
                      </Button>
                    </div>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={lang.code} className="flex items-center gap-3">
                        <Badge variant="outline" className="w-16 justify-center font-black text-[10px] uppercase tracking-widest rounded-none">{lang.label}</Badge>
                        <Input 
                          value={categoryForm.translations?.[lang.code] || ''} 
                          onChange={e => {
                            const newTranslations = { ...(categoryForm.translations || {}), [lang.code]: e.target.value };
                            setCategoryForm({
                              ...categoryForm, 
                              translations: newTranslations,
                              ...(lang.code === 'en' ? { name: e.target.value } : {})
                            });
                          }} 
                          required={lang.code === 'en'} 
                          className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold flex-1"
                          placeholder={lang.code === 'en' ? 'e.g. Vegetables' : 'e.g. 蔬菜'}
                        />
                      </div>
                    ))}
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
            <div className="p-0 overflow-x-auto no-scrollbar">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table className="min-w-[600px] sm:min-w-0">
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
                          td={td}
                          onEdit={(cat) => {
                            setCategoryForm({ id: cat.id, name: cat.name, translations: cat.translations || {}, order: cat.order, imageUrl: cat.imageUrl || '' });
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
                            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{t('add_category_started')}</p>
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
                    setItemForm({ id: '', categoryId: '', name: '', translations: {}, priceRangeMin: 0, priceRangeMax: 0, unit: 'kg', unitTranslations: {}, imageUrl: '' });
                    setIsItemDialogOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-8 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300"
                >
                  {t('add_new_item')}
                </Button>
              } />
              <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{itemForm.id ? t('edit_item') : t('add_new_item')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-6 mt-6">
                  <ImageUpload 
                    value={itemForm.imageUrl} 
                    onChange={(val) => setItemForm({...itemForm, imageUrl: val})}
                    label={t('item_image')}
                  />
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('category')}</Label>
                    <Select value={itemForm.categoryId} onValueChange={v => setItemForm({...itemForm, categoryId: v || ''})}>
                      <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold">
                        <span className="flex flex-1 text-left line-clamp-1">
                          {itemForm.categoryId ? td(categories.find(c => c.id === itemForm.categoryId)) : <span className="text-slate-500 font-normal">{t('select_category')}</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl rounded-none">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{td(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('item_name')}</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleTranslateItem} disabled={isTranslatingItem} className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 rounded-[1rem]">
                        {isTranslatingItem ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {t('auto_translate')}
                      </Button>
                    </div>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={lang.code} className="flex items-center gap-3">
                        <Badge variant="outline" className="w-16 justify-center font-black text-[10px] uppercase tracking-widest rounded-none">{lang.label}</Badge>
                        <Input 
                          value={itemForm.translations?.[lang.code] || ''} 
                          onChange={e => {
                            const newTranslations = { ...(itemForm.translations || {}), [lang.code]: e.target.value };
                            setItemForm({
                              ...itemForm, 
                              translations: newTranslations,
                              ...(lang.code === 'en' ? { name: e.target.value } : {})
                            });
                          }} 
                          required={lang.code === 'en'} 
                          className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold flex-1"
                          placeholder={lang.code === 'en' ? 'e.g. Fresh Tomatoes' : 'e.g. 新鲜西红柿'}
                        />
                      </div>
                    ))}
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
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('unit_label')}</Label>
                    <Select value={itemForm.unit} onValueChange={v => setItemForm({...itemForm, unit: v})}>
                      <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold">
                        <span className="flex flex-1 text-left line-clamp-1">
                          {itemForm.unit ? (itemForm.unit === 'custom' ? t('other_custom_unit') : STANDARD_UNITS.find(u => u.value === itemForm.unit)?.label || itemForm.unit) : <span className="text-slate-500 font-normal">{t('select_unit')}</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl rounded-none">
                        {STANDARD_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                        <SelectItem value="custom">{t('other_custom_unit')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {itemForm.unit === 'custom' && (
                    <div className="space-y-4 mt-4 p-4 bg-slate-50 border border-slate-100 rounded-none">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('custom_unit')}</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={handleTranslateUnit} disabled={isTranslatingUnit} className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 rounded-[1rem]">
                          {isTranslatingUnit ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          {t('auto_translate')}
                        </Button>
                      </div>
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <div key={lang.code} className="flex items-center gap-3">
                          <Badge variant="outline" className="w-16 justify-center font-black text-[10px] uppercase tracking-widest rounded-none">{lang.label}</Badge>
                          <Input
                            value={itemForm.unitTranslations?.[lang.code] || ''}
                            onChange={e => {
                              const newTranslations = { ...(itemForm.unitTranslations || {}), [lang.code]: e.target.value };
                              setItemForm({ ...itemForm, unitTranslations: newTranslations });
                            }}
                            required={lang.code === 'en'}
                            className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-10 font-bold flex-1"
                            placeholder={lang.code === 'en' ? 'e.g. Bucket' : 'e.g. 桶'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
                      <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold">
                        <span className="flex flex-1 text-left line-clamp-1">
                          {bulkCategoryForm.categoryId ? td(categories.find(c => c.id === bulkCategoryForm.categoryId)) : <span className="text-slate-500 font-normal">{t('select_category')}</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="border-slate-100 shadow-xl rounded-none">
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{td(c)}</SelectItem>)}
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
            <div className="p-0 overflow-x-auto no-scrollbar">
              <Table className="min-w-[800px] sm:min-w-0">
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
                    <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('unit_label')}</TableHead>
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
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0">
                              <Image 
                                src={item.imageUrl} 
                                alt={item.name} 
                                fill 
                                className="object-cover"
                                referrerPolicy="no-referrer"
                                unoptimized={item.imageUrl.startsWith('http')}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                              <Package className="h-5 w-5 text-slate-300" />
                            </div>
                          )}
                          <span className="font-bold text-slate-900">{td(item)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">{td(categories.find(c => c.id === item.categoryId)) || t('unknown')}</TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">
                        <span className="text-[10px] text-slate-400 mr-1 font-black">RM</span>
                        {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-600 py-6 font-medium">{tu(item)}</TableCell>
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
                          const isStandardUnit = STANDARD_UNITS.some(u => u.value === item.unit);
                          setItemForm({ 
                            id: item.id, 
                            categoryId: item.categoryId, 
                            name: item.name, 
                            translations: item.translations || {}, 
                            priceRangeMin: item.priceRangeMin, 
                            priceRangeMax: item.priceRangeMax, 
                            unit: isStandardUnit ? item.unit : 'custom', 
                            unitTranslations: isStandardUnit ? {} : (item.unitTranslations || { en: item.unit }),
                            imageUrl: item.imageUrl || '' 
                          });
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
                          <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{t('adjust_search_add_item')}</p>
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
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('consolidated_purchase_list')} ({formatDate(new Date(selectedDate), 'dd MMM yyyy')})</h4>
              <Button onClick={handlePrintList} variant="outline" className="rounded-[1.5rem] border-white/50 bg-white/50 backdrop-blur-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 h-12 px-8 font-black text-[11px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                <Printer className="h-4 w-4" />
                {t('print_list')}
              </Button>
            </div>
            <div className="p-0 overflow-x-auto no-scrollbar">
              <div className="print:block">
                <Table className="min-w-[800px] sm:min-w-0">
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
                        <TableCell className="font-black text-slate-900 py-8 pl-8 text-lg tracking-tight">{t(item.name)}</TableCell>
                        <TableCell className="py-8">
                          <span className="text-2xl font-black text-emerald-600 tracking-tighter">{item.totalQty}</span>
                          <span className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">{tu(item)}</span>
                        </TableCell>
                        <TableCell className="py-8 pr-8">
                          <div className="flex flex-wrap gap-2">
                            {item.details.map((d: any, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-none bg-white/80 border border-white/50 px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                                <span className="text-slate-900 mr-2 uppercase tracking-widest">{d.restaurant}</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-none">{d.quantity} {tu(item)}</span>
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
                            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{t('no_orders_placed_date')}</p>
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
