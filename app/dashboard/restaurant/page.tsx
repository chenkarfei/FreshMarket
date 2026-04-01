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
import { toast } from 'sonner';
import { format, differenceInSeconds, startOfDay, addHours } from 'date-fns';
import { ShoppingCart, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RestaurantDashboard() {
  const { userData } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canEdit, setCanEdit] = useState(true);

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
        setTimeLeft('Cut-off reached');
        setCanEdit(false);
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addToCart = (item: any) => {
    if (!canEdit) {
      toast.error('Cannot edit order after cut-off or acknowledgment.');
      return;
    }
    const existing = cart.find(i => i.itemId === item.id);
    if (existing) {
      setCart(cart.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { itemId: item.id, name: item.name, quantity: 1, priceRangeMin: item.priceRangeMin, priceRangeMax: item.priceRangeMax, unit: item.unit }]);
    }
    toast.success(`Added ${item.name} to cart`);
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

      toast.success(`Order ${status === 'submitted' ? 'submitted' : 'saved as draft'}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (userData?.role !== 'restaurant') return <div>Unauthorized</div>;

  const cartTotalMin = cart.reduce((acc, item) => acc + (item.priceRangeMin * item.quantity), 0);
  const cartTotalMax = cart.reduce((acc, item) => acc + (item.priceRangeMax * item.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {userData.name}</h2>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <Clock className="h-4 w-4 text-orange-500" />
          <span>Cut-off in: <strong className="text-orange-600">{timeLeft}</strong></span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tonight's Order Status</CardTitle>
            <CardDescription>Order for delivery tomorrow morning.</CardDescription>
          </CardHeader>
          <CardContent>
            {currentOrder ? (
              <div className="flex items-center gap-4 rounded-lg border p-4">
                {currentOrder.status === 'acknowledged' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : currentOrder.status === 'submitted' ? (
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                ) : (
                  <ShoppingCart className="h-8 w-8 text-slate-400" />
                )}
                <div>
                  <p className="font-semibold text-lg capitalize">{currentOrder.status}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentOrder.status === 'acknowledged' 
                      ? 'Driver has acknowledged your order. Preparing for market.' 
                      : currentOrder.status === 'submitted'
                      ? 'Order submitted. Waiting for driver acknowledgment.'
                      : 'Draft saved. Please submit before 4:00 AM.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-lg border border-dashed p-4 text-muted-foreground">
                <ShoppingCart className="h-8 w-8" />
                <p>No order started for tonight. Browse items to begin.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimated Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              RM {cartTotalMin.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              to RM {cartTotalMax.toFixed(2)}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => saveOrder('submitted')} disabled={!canEdit || cart.length === 0} className="w-full">
                Submit Order
              </Button>
              <Button onClick={() => saveOrder('draft')} disabled={!canEdit || cart.length === 0} variant="outline" className="w-full">
                Save Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Items</TabsTrigger>
          <TabsTrigger value="cart">
            My Cart {cart.length > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{cart.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map(item => (
              <Card key={item.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{categories.find(c => c.id === item.categoryId)?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-sm font-medium">RM {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground"> / {item.unit}</span>
                  </div>
                  <Button onClick={() => addToCart(item)} disabled={!canEdit} className="w-full" variant="secondary">
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Est. Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total Est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>RM {item.priceRangeMin.toFixed(2)} - {item.priceRangeMax.toFixed(2)} / {item.unit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.itemId, item.quantity - 1)} disabled={!canEdit}>-</Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.itemId, item.quantity + 1)} disabled={!canEdit}>+</Button>
                        </div>
                      </TableCell>
                      <TableCell>RM {(item.priceRangeMin * item.quantity).toFixed(2)} - {(item.priceRangeMax * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Cart is empty.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Est. Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderDate}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>RM {order.totalMin.toFixed(2)} - {order.totalMax.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{order.status}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No past orders found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
