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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInSeconds, startOfDay, addHours } from 'date-fns';
import { ShoppingCart, Clock, CheckCircle2, AlertCircle, TrendingUp, Package, Loader2, Search, Filter, ChevronRight, History, Trash2, Plus, Minus, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';

export default function RestaurantDashboard() {
  const { userData } = useAuth();
  const { t } = useLanguage();
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
    toast.success(`${t('added_to_cart')}: ${item.name}`);
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
    if (!userData) return;
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

  if (userData?.role !== 'restaurant') return <div>Unauthorized</div>;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0 text-[10px] uppercase tracking-widest font-bold">Restaurant Partner</Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('welcome')}, {userData.name}</h2>
          <p className="text-slate-500 mt-1 text-sm">Manage your daily market orders and inventory.</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-50/50 border border-amber-100 text-[11px] font-bold uppercase tracking-wider text-amber-700 shadow-sm shadow-amber-100/50">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>{t('cutoff_in')} <span className="text-amber-900 font-black ml-1">{timeLeft}</span></span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('tonights_order_status')}</h3>
              {currentOrder && <span className="text-[10px] text-slate-400 font-medium">ID: {currentOrder.id.split('_').pop()}</span>}
            </div>
            <Card className="bg-white border-slate-100 shadow-sm shadow-slate-200/50 rounded-3xl overflow-hidden group hover:border-slate-200 transition-all duration-300">
              <CardContent className="p-8">
              {currentOrder ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-105 duration-500 ${
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Date</span>
                    <span className="text-sm font-bold text-slate-900">{format(new Date(), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-slate-400">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 border-dashed">
                    <ShoppingCart className="h-8 w-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 mb-1">{t('no_order_started')}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">Browse the market items below to start your daily order.</p>
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
            <Card className="bg-slate-900 border-none shadow-xl shadow-slate-200 rounded-3xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="h-24 w-24 text-white" />
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total RM</span>
                  <div className="text-5xl font-black tracking-tighter text-white">
                    {cartTotalMin.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Range: {cartTotalMin.toFixed(2)} — {cartTotalMax.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-10 flex flex-col gap-3">
                  <Button 
                    onClick={() => saveOrder('submitted')} 
                    disabled={!canEdit || cart.length === 0 || isSubmitting} 
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl h-14 font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {t('submit_order')}
                  </Button>
                  <Button 
                    onClick={() => saveOrder('draft')} 
                    disabled={!canEdit || cart.length === 0 || isSubmitting} 
                    variant="ghost" 
                    className="w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl h-12 font-bold text-xs uppercase tracking-widest transition-all"
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <TabsList className="flex w-full md:w-auto justify-start bg-slate-100/80 p-1 rounded-2xl gap-1 h-auto">
            <TabsTrigger 
              value="browse" 
              className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                {t('browse_items')}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="cart" 
              className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all duration-300 relative"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                {t('my_cart')}
                {cart.length > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white shadow-sm">
                    {cart.length}
                  </span>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                {t('order_history')}
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 pb-4 md:pb-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input 
                placeholder={t('search_items')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full md:w-64 pl-10 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-200 focus:ring-emerald-50 transition-all text-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 w-40 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-emerald-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider py-3">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold uppercase tracking-wider py-3">{cat.name}</SelectItem>
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
                  className="group relative flex flex-col justify-between p-6 rounded-[2rem] border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none px-2 py-0 text-[9px] uppercase tracking-widest font-bold group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        {categories.find(c => c.id === item.categoryId)?.name}
                      </Badge>
                      {cart.find(i => i.itemId === item.id) && (
                        <Badge className="bg-emerald-500 text-white border-none px-2 py-0 text-[9px] font-black">
                          {cart.find(i => i.itemId === item.id)?.quantity} IN CART
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 leading-tight">{item.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-400">RM</span>
                      <span className="text-xl font-black text-slate-900">{item.priceRangeMin.toFixed(2)}</span>
                      <span className="text-xs text-slate-400 font-medium">/ {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium bg-slate-50/50 p-2 rounded-xl">
                      <Info className="h-3 w-3 text-slate-300" />
                      Est. Max: RM {item.priceRangeMax.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-8">
                    <Button 
                      onClick={() => addToCart(item)} 
                      disabled={!canEdit} 
                      className="w-full bg-slate-900 hover:bg-emerald-500 text-white border-none shadow-none rounded-2xl h-12 font-bold text-[11px] uppercase tracking-widest transition-all duration-300 active:scale-95"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('add_to_cart')}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No items found</h3>
                <p className="text-slate-400 max-w-xs mx-auto">We couldn&apos;t find any items matching your search or category filter.</p>
                <Button variant="link" onClick={() => {setSearchQuery(''); setSelectedCategory('all');}} className="mt-4 text-emerald-600 font-bold">Clear all filters</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cart" className="space-y-8 outline-none">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Items in your order</h3>
                <span className="text-[10px] text-slate-400 font-medium">{cart.length} unique items</span>
              </div>
              
              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.itemId} 
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                        <Package className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{item.name}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          RM {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)} / {item.unit}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-10 mt-6 sm:mt-0">
                      <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => updateQuantity(item.itemId, item.quantity - 1)} 
                          disabled={!canEdit} 
                          className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-black text-slate-900 text-base">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.itemId, item.quantity + 1)} 
                          disabled={!canEdit} 
                          className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-all text-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="text-right min-w-[120px]">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">RM</span>
                          <span className="text-xl font-black text-slate-900">{(item.priceRangeMin * item.quantity).toFixed(2)}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Total</p>
                      </div>

                      <button 
                        onClick={() => updateQuantity(item.itemId, 0)}
                        disabled={!canEdit}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {cart.length === 0 && (
                  <div className="py-32 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                    <div className="h-24 w-24 rounded-[3rem] bg-white shadow-sm flex items-center justify-center mb-6">
                      <ShoppingCart className="h-12 w-12 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('cart_is_empty')}</h3>
                    <p className="text-slate-400 max-w-xs mx-auto">Your basket is waiting for some fresh produce. Head over to the browse tab to begin.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Order Summary</h3>
              <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden sticky top-8">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">Subtotal (Min)</span>
                      <span className="text-sm font-black text-slate-900">RM {cartTotalMin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">Subtotal (Max)</span>
                      <span className="text-sm font-black text-slate-900">RM {cartTotalMax.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Total RM</span>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                          {cartTotalMin.toFixed(2)}
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">FREE DELIVERY</Badge>
                    </div>
                    
                    <div className="pt-6 space-y-3">
                      <Button 
                        onClick={() => saveOrder('submitted')} 
                        disabled={!canEdit || cart.length === 0 || isSubmitting} 
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl h-16 font-bold text-base shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        {t('submit_order')}
                      </Button>
                      <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed">
                        By submitting, you agree to the daily market prices. Final invoice will be provided upon delivery.
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
            <span className="text-[10px] text-slate-400 font-medium">{history.length} completed orders</span>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {history.map(order => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={order.id} 
                className="group p-8 rounded-[2.5rem] border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                    <History className="h-7 w-7" />
                  </div>
                  <Badge className={`border-none font-black text-[10px] px-3 py-1 rounded-full ${
                    order.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600' : 
                    order.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {t(order.status) || order.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 mb-8">
                  <h4 className="text-xl font-black text-slate-900">{format(new Date(order.orderDate), 'EEEE, MMM dd')}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.items.length} Items Ordered</p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Paid RM</span>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{order.totalMin.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold text-xs">
                    Details <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {history.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                <div className="h-24 w-24 rounded-[3rem] bg-white shadow-sm flex items-center justify-center mb-6">
                  <Package className="h-12 w-12 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('no_past_orders')}</h3>
                <p className="text-slate-400 max-w-xs mx-auto">Your order history is currently empty. Once you complete your first order, it will appear here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
