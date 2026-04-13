"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInSeconds, startOfDay, addHours } from 'date-fns';
import { ShoppingCart, Clock, CheckCircle2, AlertCircle, TrendingUp, Package, Loader2, Search, Filter, ChevronRight, History, Trash2, Plus, Minus, Info, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import domtoimage from 'dom-to-image-more';

export default function RestaurantDashboard() {
  const { userData } = useAuth();
  const { t, td, tu, formatDate } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canEdit, setCanEdit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (userData?.role !== 'restaurant') return;

    // Load Categories and Items
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load Today's Order
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'orders'), where('restaurantId', '==', userData.uid), where('orderDate', '==', today));
    
    const unsubOrder = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const orderData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        setCurrentOrder(orderData);
        setCart(orderData.items || []);
        // Only allow editing if it's a draft or submitted. Once acknowledged, it's locked.
        setCanEdit(orderData.status === 'draft' || orderData.status === 'submitted');
      } else {
        setCurrentOrder(null);
        setCart([]);
        setCanEdit(true);
      }
    });

    // Load History
    const hq = query(collection(db, 'orders'), where('restaurantId', '==', userData.uid));
    const unsubHistory = onSnapshot(hq, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).filter(o => o.orderDate !== today));
    });

    return () => {
      unsubCategories();
      unsubItems();
      unsubOrder();
      unsubHistory();
    };
  }, [userData]);

  // Countdown Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Cutoff is 4:00 AM today or tomorrow depending on current time
      let cutoff = addHours(startOfDay(now), 4);
      if (now > cutoff) {
        cutoff = addHours(startOfDay(addHours(now, 24)), 4);
      }
      
      const diff = differenceInSeconds(cutoff, now);
      if (diff <= 0) {
        setTimeLeft(t('cutoff_reached'));
        setCanEdit(false);
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [t]);

  const addToCart = (item: any) => {
    if (!canEdit) {
      toast.error(t('cannot_edit_after_cutoff'));
      return;
    }
    const existing = cart.find(i => i.itemId === item.id);
    if (existing) {
      setCart(cart.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { itemId: item.id, name: item.name, quantity: 1, priceRangeMin: item.priceRangeMin, priceRangeMax: item.priceRangeMax, unit: item.unit }]);
    }
    toast.success(`${t('added_to_cart')}: ${td(item)}`);
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (!canEdit) return;
    if (qty <= 0) {
      setCart(cart.filter(i => i.itemId !== itemId));
    } else {
      setCart(cart.map(i => i.itemId === itemId ? { ...i, quantity: qty } : i));
    }
  };

  const saveOrder = async (status: 'draft' | 'submitted') => {
    if (!userData || isSubmitting) return;
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const orderId = currentOrder?.id || `${userData.uid}_${today}`;
    
    const totalMin = cart.reduce((acc, item) => acc + (item.priceRangeMin * item.quantity), 0);
    const totalMax = cart.reduce((acc, item) => acc + (item.priceRangeMax * item.quantity), 0);

    try {
      await setDoc(doc(db, 'orders', orderId), {
        restaurantId: userData.uid,
        restaurantName: userData.name,
        status,
        items: cart,
        totalMin,
        totalMax,
        orderDate: today,
        createdAt: currentOrder?.createdAt || new Date().toISOString(),
        ...(status === 'submitted' ? { submittedAt: new Date().toISOString() } : {})
      }, { merge: true });

      toast.success(status === 'submitted' ? t('order_submitted') : t('order_saved_as_draft'));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintOrder = async (order: any) => {
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
      .pdf-container th { background-color: #10b981 !important; color: white !important; font-weight: 600 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; padding: 12px !important; text-align: left !important; }
      .pdf-container th.text-right { text-align: right !important; }
      .pdf-container td { padding: 12px !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 13px !important; color: #334155 !important; }
      .pdf-container .item-name { font-weight: 600 !important; color: #0f172a !important; }
      .pdf-container .price-cell { text-align: right !important; font-family: 'JetBrains Mono', monospace !important; font-weight: 600 !important; }
      .pdf-container .total-section { margin-top: 30px !important; padding-top: 20px !important; border-top: 2px solid #f1f5f9 !important; text-align: right !important; }
    `;
    element.className = 'pdf-container';
    element.appendChild(style);
    document.body.appendChild(element);
    
    const header = document.createElement('div');
    header.style.marginBottom = '40px';
    header.style.borderBottom = '2px solid #10b981';
    header.style.paddingBottom = '20px';
    
    const title = document.createElement('h1');
    title.innerText = `${t('order_details')} - ${userData?.name || ''}`;
    title.style.fontSize = '24px';
    title.style.fontWeight = '800';
    title.style.color = '#0f172a';
    title.style.letterSpacing = '-0.02em';
    header.appendChild(title);
    
    const metaInfo = document.createElement('div');
    metaInfo.style.display = 'flex';
    metaInfo.style.flexDirection = 'column';
    metaInfo.style.gap = '6px';
    metaInfo.style.marginTop = '15px';
    
    const dateLine = document.createElement('p');
    dateLine.innerHTML = `<span style="font-weight: 700; color: #64748b;">${t('order_date')} :</span> <span style="color: #334155;">${formatDate(new Date(order.orderDate), 'PP')}</span>`;
    dateLine.style.fontSize = '13px';
    metaInfo.appendChild(dateLine);
    
    const statusLine = document.createElement('p');
    statusLine.innerHTML = `<span style="font-weight: 700; color: #64748b;">${t('status')} :</span> <span style="font-weight: 700; color: #059669;">${(t(order.status) || order.status)}</span>`;
    statusLine.style.fontSize = '13px';
    metaInfo.appendChild(statusLine);

    const generatedLine = document.createElement('p');
    generatedLine.innerHTML = `<span style="font-weight: 700; color: #64748b;">${t('generated_on')} :</span> <span style="color: #334155;">${formatDate(new Date(), 'PPpp')}</span>`;
    generatedLine.style.fontSize = '13px';
    metaInfo.appendChild(generatedLine);
    
    header.appendChild(metaInfo);
    element.appendChild(header);
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    [t('item'), t('quantity'), t('price')].forEach((text, index) => {
      const th = document.createElement('th');
      th.innerText = text;
      if (index === 2) th.className = 'text-right';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    order.items.forEach((item: any) => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.className = 'item-name';
      nameCell.innerText = td(items.find(i => i.id === item.itemId) || item);
      row.appendChild(nameCell);
      
      const qtyCell = document.createElement('td');
      qtyCell.innerText = `${item.quantity} ${tu(item)}`;
      row.appendChild(qtyCell);
      
      const priceCell = document.createElement('td');
      priceCell.className = 'price-cell';
      priceCell.innerText = `RM ${(item.priceRangeMin * item.quantity).toFixed(2)}`;
      row.appendChild(priceCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    element.appendChild(table);
    
    const totalSection = document.createElement('div');
    totalSection.className = 'total-section';
    
    const totalLabel = document.createElement('span');
    totalLabel.innerText = `${t('total')}: `;
    totalLabel.style.fontSize = '14px';
    totalLabel.style.color = '#64748b';
    totalLabel.style.fontWeight = '600';
    totalSection.appendChild(totalLabel);
    
    const totalAmount = document.createElement('span');
    totalAmount.innerText = `RM ${order.totalMin.toFixed(2)}`;
    totalAmount.style.fontSize = '24px';
    totalAmount.style.fontWeight = '800';
    totalAmount.style.color = '#0f172a';
    totalSection.appendChild(totalAmount);
    
    element.appendChild(totalSection);
    
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
      pdf.save(`Order_${order.orderDate}_${userData?.name}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      document.body.removeChild(element);
    }
  };

  if (userData?.role !== 'restaurant') return <div>{t('unauthorized')}</div>;

  const cartTotalMin = cart.reduce((acc, item) => acc + (item.priceRangeMin * item.quantity), 0);
  const cartTotalMax = cart.reduce((acc, item) => acc + (item.priceRangeMax * item.quantity), 0);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && item.isActive !== false;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-10 relative pb-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0 text-[10px] uppercase tracking-widest font-bold rounded-none">{t('restaurant_partner')}</Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-1">
            {t('welcome')}, <span className="text-gradient">{userData.name}</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium">{t('manage_daily_orders_ease')}</p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="flex items-center justify-center lg:justify-start gap-3 px-6 py-3 rounded-none bg-amber-50/80 backdrop-blur-sm border border-amber-100 text-[11px] font-bold uppercase tracking-wider text-amber-700 shadow-sm shadow-amber-100/20 w-full sm:w-auto"
        >
          <Clock className="h-4 w-4 text-amber-500" />
          <span>{t('cutoff_in')} <span className="text-amber-900 font-black ml-1">{timeLeft}</span></span>
        </motion.div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('tonights_order_status')}</h3>
              {currentOrder && <span className="text-[10px] text-slate-400 font-medium">ID: {currentOrder.id.split('_').pop()}</span>}
            </div>
            <Card className="glass-card border-none rounded-none overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
              <CardContent className="p-10">
              {currentOrder ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-none shadow-inner transition-transform group-hover:scale-105 duration-500 ${
                    currentOrder.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-600' : 
                    currentOrder.status === 'submitted' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {currentOrder.status === 'acknowledged' ? (
                      <CheckCircle2 className="h-8 w-8" />
                    ) : currentOrder.status === 'submitted' ? (
                      <AlertCircle className="h-8 w-8" />
                    ) : (
                      <ShoppingCart className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900 text-xl capitalize">{t(currentOrder.status) || currentOrder.status}</p>
                      <div className={`h-2 w-2 rounded-full animate-pulse ${
                        currentOrder.status === 'acknowledged' ? 'bg-emerald-500' : 
                        currentOrder.status === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                      {currentOrder.status === 'acknowledged' 
                        ? t('driver_acknowledged') 
                        : currentOrder.status === 'submitted'
                        ? t('order_submitted_waiting')
                        : t('draft_saved_submit_before')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order_date')}</span>
                    <span className="text-sm font-bold text-slate-900">{formatDate(new Date(), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-slate-400">
                  <div className="flex h-16 w-16 items-center justify-center rounded-none bg-slate-50 border border-slate-100 border-dashed">
                    <ShoppingCart className="h-8 w-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 mb-1">{t('no_order_started')}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{t('browse_market_items_begin')}</p>
                  </div>
                </div>
              )}
            </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">{t('estimated_total')}</h3>
            <Card className="bg-slate-900 border-none shadow-2xl shadow-emerald-900/20 rounded-none overflow-hidden relative group transition-all duration-700 hover:shadow-emerald-500/30 hover:scale-[1.01]">
              <motion.div 
                className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              />
              <motion.div 
                initial={{ x: '-150%', skewX: -20 }}
                whileHover={{ x: '150%', skewX: -20 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent z-0"
              />
              <CardContent className="p-10 relative z-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest group-hover:text-emerald-400 transition-colors duration-500">{t('est_total_rm')}</span>
                  <div className="text-6xl font-black tracking-tighter text-white group-hover:text-emerald-50 transition-colors duration-500">
                    {cartTotalMin.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 pt-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('market_range')} <span className="text-white">{cartTotalMin.toFixed(2)}</span> — <span className="text-white">{cartTotalMax.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-12 flex flex-col gap-4">
                  <Button 
                    onClick={() => saveOrder('submitted')} 
                    disabled={!canEdit || cart.length === 0 || isSubmitting} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white rounded-[1.5rem] h-16 font-bold text-base shadow-xl shadow-emerald-500/20 transition-all active:scale-95 border-none"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {currentOrder?.status === 'submitted' ? t('update_order') : t('submit_order')}
                  </Button>
                  <Button 
                    onClick={() => saveOrder('draft')} 
                    disabled={!canEdit || cart.length === 0 || isSubmitting} 
                    variant="ghost" 
                    className="w-full text-slate-500 hover:text-white hover:bg-white/5 rounded-[1.5rem] h-12 font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('save_draft')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 px-1 sm:px-0">
          <TabsList className="flex w-full lg:w-auto justify-start bg-slate-100/30 backdrop-blur-md p-1.5 rounded-none gap-2 h-auto border border-white/50 shadow-inner overflow-x-auto no-scrollbar px-2 sm:px-1.5">
            <TabsTrigger 
              value="browse" 
              className="rounded-none px-3 sm:px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500 shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4" />
                {t('browse_items')}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="cart" 
              className="rounded-none px-3 sm:px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500 relative shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-4 w-4" />
                {t('my_cart')}
                {cart.length > 0 && (
                  <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-none bg-emerald-500 text-[10px] font-black text-white shadow-lg shadow-emerald-500/30">
                    {cart.length}
                  </span>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none px-3 sm:px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 transition-all duration-500 shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <History className="h-4 w-4" />
                {t('order_history')}
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input 
                placeholder={t('search_items')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-10 rounded-none border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-200 focus:ring-emerald-50 transition-all text-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'all')}>
              <SelectTrigger className="h-10 w-full sm:w-48 rounded-none border-slate-100 bg-slate-50/50 focus:ring-emerald-50 text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {selectedCategory === 'all'
                    ? t('all_categories')
                    : td(categories.find(c => c.id === selectedCategory)) || t('all_categories')}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-none border-slate-100 shadow-xl">
                <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider py-3">{t('all_categories')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold uppercase tracking-wider py-3">{td(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="browse" className="space-y-8 outline-none">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="group relative flex flex-col justify-between p-8 rounded-none border border-white/50 bg-white/80 backdrop-blur-md hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500"
                >
                  <div className="space-y-4">
                    <div className="relative w-full aspect-square rounded-none overflow-hidden border border-slate-100 bg-slate-50 group-hover:border-emerald-100 transition-all duration-500">
                      {item.imageUrl ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          unoptimized={item.imageUrl.startsWith('http')}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                          <Package className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-emerald-600 border-none px-3 py-0.5 text-[9px] uppercase tracking-widest font-black shadow-sm rounded-none">
                          {td(categories.find(c => c.id === item.categoryId))}
                        </Badge>
                      </div>
                      {cart.find(i => i.itemId === item.id) && (
                        <div className="absolute bottom-3 right-3 z-10">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Badge className="bg-emerald-500 text-white border-none px-2.5 py-0.5 text-[9px] font-black shadow-lg shadow-emerald-500/30 rounded-none">
                              {cart.find(i => i.itemId === item.id)?.quantity} {t('in_cart')}
                            </Badge>
                          </motion.div>
                        </div>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">{td(item)}</h4>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-slate-400">RM</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">{item.priceRangeMin.toFixed(2)}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">/ {tu(item)}</span>
                      </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100/50 p-3 rounded-none border border-white/50">
                      <Info className="h-3.5 w-3.5 text-emerald-500" />
                      {t('market_max_rm')} {item.priceRangeMax.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-10">
                    {cart.find(i => i.itemId === item.id) ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center justify-between bg-slate-50 p-1 rounded-[1.5rem] border border-slate-100 h-14">
                          <button 
                            onClick={() => updateQuantity(item.id, (cart.find(i => i.itemId === item.id)?.quantity || 0) - 1)} 
                            disabled={!canEdit} 
                            className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-black text-slate-900 text-lg">
                            {cart.find(i => i.itemId === item.id)?.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.id, (cart.find(i => i.itemId === item.id)?.quantity || 0) + 1)} 
                            disabled={!canEdit} 
                            className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => updateQuantity(item.id, 0)}
                          disabled={!canEdit}
                          className="h-14 w-14 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(item)} 
                        disabled={!canEdit} 
                        className="w-full bg-slate-900 hover:bg-emerald-500 text-white border-none shadow-xl shadow-slate-900/10 hover:shadow-emerald-500/20 rounded-[1.5rem] h-14 font-black text-[11px] uppercase tracking-widest transition-all duration-500 active:scale-95"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('add_to_cart')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 rounded-none bg-slate-50 flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('no_items_found')}</h3>
                <p className="text-slate-400 max-w-xs mx-auto">{t('no_items_matching_filter')}</p>
                <Button variant="link" onClick={() => {setSearchQuery(''); setSelectedCategory('all');}} className="mt-4 text-emerald-600 font-bold">{t('clear_all_filters')}</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cart" className="space-y-8 outline-none">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('items_in_your_order')}</h3>
                <span className="text-[10px] text-slate-400 font-medium">{cart.length} {t('unique_items')}</span>
              </div>
              
              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.itemId} 
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-none border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 rounded-none bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors overflow-hidden border border-slate-100">
                        {items.find(i => i.id === item.itemId)?.imageUrl ? (
                          <div className="relative w-full h-full">
                            <Image 
                              src={items.find(i => i.id === item.itemId).imageUrl} 
                              alt={item.name} 
                              fill 
                              className="object-cover"
                              referrerPolicy="no-referrer"
                              unoptimized={items.find(i => i.id === item.itemId).imageUrl.startsWith('http')}
                            />
                          </div>
                        ) : (
                          <Package className="h-7 w-7" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{td(items.find(i => i.id === item.itemId) || item)}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          RM {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)} / {tu(item)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-10 mt-6 sm:mt-0">
                      <div className="flex items-center gap-2 sm:gap-4 bg-slate-50 p-1 rounded-none border border-slate-100">
                        <button 
                          onClick={() => updateQuantity(item.itemId, item.quantity - 1)} 
                          disabled={!canEdit} 
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-none bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                        >
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        <span className="w-6 sm:w-8 text-center font-black text-slate-900 text-sm sm:text-base">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.itemId, item.quantity + 1)} 
                          disabled={!canEdit} 
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-none bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 sm:gap-8">
                        <div className="text-right min-w-[80px] sm:min-w-[120px]">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">RM</span>
                            <span className="text-lg sm:text-xl font-black text-slate-900">{(item.priceRangeMin * item.quantity).toFixed(2)}</span>
                          </div>
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('est_total')}</p>
                        </div>

                        <button 
                          onClick={() => updateQuantity(item.itemId, 0)}
                          disabled={!canEdit}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {cart.length === 0 && (
                  <div className="py-32 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-none border border-dashed border-slate-200">
                    <div className="h-24 w-24 rounded-none bg-white shadow-sm flex items-center justify-center mb-6">
                      <ShoppingCart className="h-12 w-12 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('cart_is_empty')}</h3>
                    <p className="text-slate-400 max-w-xs mx-auto">{t('basket_waiting_fresh_produce')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">{t('order_summary')}</h3>
              <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-none overflow-hidden sticky top-8">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">{t('subtotal_min')}</span>
                      <span className="text-sm font-black text-slate-900">RM {cartTotalMin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">{t('subtotal_max')}</span>
                      <span className="text-sm font-black text-slate-900">RM {cartTotalMax.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('est_total_rm')}</span>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                          {cartTotalMin.toFixed(2)}
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] rounded-none">{t('free_delivery')}</Badge>
                    </div>
                    
                    <div className="pt-6 space-y-3">
                      <Button 
                        onClick={() => saveOrder('submitted')} 
                        disabled={!canEdit || cart.length === 0 || isSubmitting} 
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-[1.5rem] h-16 font-bold text-base shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        {t('submit_order')}
                      </Button>
                      <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed">
                        {t('submit_agreement_policy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-8 outline-none">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('past_orders')}</h3>
            <span className="text-[10px] text-slate-400 font-medium">{history.length} {t('completed_orders')}</span>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {history.map(order => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={order.id} 
                className="group p-8 rounded-none border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-none bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                    <History className="h-7 w-7" />
                  </div>
                  <Badge className={`border-none font-black text-[10px] px-3 py-1 rounded-none ${
                    order.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600' : 
                    order.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {t(order.status) || order.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 mb-8">
                  <h4 className="text-xl font-black text-slate-900">{formatDate(new Date(order.orderDate), 'EEEE, MMM dd')}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.items.length} {t('items_ordered')}</p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('total_paid_rm')}</span>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{order.totalMin.toFixed(2)}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger render={
                      <Button variant="ghost" size="sm" className="rounded-[1rem] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold text-xs">
                        {t('details')} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    } />
                    <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-none shadow-2xl rounded-none">
                      <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-6">
                        <DialogTitle className="text-2xl font-black text-slate-900">
                          {t('order_details')} - {formatDate(new Date(order.orderDate), 'EEEE, MMM dd')}
                        </DialogTitle>
                        <Button 
                          onClick={() => handlePrintOrder(order)} 
                          variant="outline" 
                          size="sm" 
                          className="rounded-none border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 font-black text-[10px] uppercase tracking-widest h-10 px-4 flex items-center gap-2"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {t('print')}
                        </Button>
                      </DialogHeader>
                      <div className="overflow-y-auto flex-1 pr-2 mt-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100">
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">{t('item')}</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">{t('quantity')}</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 text-right">{t('est_price')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.items.map((item: any, idx: number) => (
                              <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="text-slate-900 font-bold py-4">{td(items.find(i => i.id === item.itemId) || item)}</TableCell>
                                <TableCell className="text-slate-600 py-4 font-medium">{item.quantity} {tu(item)}</TableCell>
                                <TableCell className="text-slate-900 font-black text-right py-4">
                                  <span className="text-[10px] text-slate-400 mr-1 font-bold">RM</span>
                                  {(item.priceRangeMin * item.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('total_estimated_price_label')}</p>
                          <p className="text-3xl font-black text-slate-900 tracking-tighter">RM {order.totalMin.toFixed(2)}</p>
                        </div>
                        <Badge className={`border-none font-black text-xs px-4 py-2 rounded-none ${
                          order.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {t(order.status) || order.status}
                        </Badge>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            ))}

            {history.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-none border border-dashed border-slate-200">
                <div className="h-24 w-24 rounded-none bg-white shadow-sm flex items-center justify-center mb-6">
                  <Package className="h-12 w-12 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('no_past_orders')}</h3>
                <p className="text-slate-400 max-w-xs mx-auto">{t('order_history_empty_first_order')}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
