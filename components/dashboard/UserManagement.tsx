"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, createSecondaryAuth } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

export default function UserManagement() {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });

  useEffect(() => {
    if (userData?.role !== 'super_admin') return;
    
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const userEmail = formData.email.toLowerCase();
      
      if (formData.password && !isEditing) {
        const secondaryAuth = createSecondaryAuth();
        try {
          await createUserWithEmailAndPassword(secondaryAuth, userEmail, formData.password);
          await signOut(secondaryAuth);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            throw new Error("Email is already in use. If this is an existing user, please edit them instead of creating a new one.");
          }
          throw authError;
        }
      }

      await setDoc(doc(db, 'users', userEmail), {
        name: formData.name,
        email: userEmail,
        role: formData.role,
        phone: formData.phone,
        address: formData.address,
        isActive: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      toast.success(t('user_saved'));
      setIsDialogOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      toast.success(t('user_status_updated'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (userData?.role !== 'super_admin') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-1">{t('user_management')}</h3>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">{t('manage_system_users_and_roles')}</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{t('view_details')}</DialogTitle>
              </DialogHeader>
              {selectedUserForDetails && (
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('name')}</Label>
                      <p className="text-sm font-bold text-slate-900">{selectedUserForDetails.name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('email')}</Label>
                      <p className="text-sm font-bold text-slate-900">{selectedUserForDetails.email}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('role')}</Label>
                      <p className="text-sm font-bold text-slate-900 capitalize">{selectedUserForDetails.role.replace('_', ' ')}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status')}</Label>
                      <div>
                        <span className={`inline-flex items-center rounded-none px-3 py-1 text-[10px] font-black uppercase tracking-widest ${selectedUserForDetails.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {selectedUserForDetails.isActive ? t('active') : t('inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedUserForDetails.role === 'restaurant' && (
                    <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</Label>
                        <p className="text-sm font-bold text-slate-900">{selectedUserForDetails.phone || 'N/A'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</Label>
                        <p className="text-sm font-bold text-slate-900">{selectedUserForDetails.address || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button 
                onClick={() => {
                  setFormData({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });
                  setIsEditing(false);
                  setIsDialogOpen(true);
                }}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-8 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300"
              >
                {t('add_new_user')}
              </Button>
            } />
            <DialogContent className="border-none shadow-2xl glass-card rounded-none max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{isEditing ? t('edit_user') : t('add_new_user')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('name')}</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('email')}</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                    disabled={isEditing} 
                    className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                {!isEditing && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('password_optional')}</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder={t('leave_blank_google')} 
                      className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('role')}</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v || 'restaurant'})}>
                    <SelectTrigger className="rounded-none border-slate-200 focus:ring-0 h-12 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-100 shadow-xl rounded-none">
                      <SelectItem value="restaurant">{t('restaurant')}</SelectItem>
                      <SelectItem value="admin">{t('admin_driver')}</SelectItem>
                      <SelectItem value="super_admin">{t('super_admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'restaurant' && (
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('phone')}</Label>
                      <Input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('address')}</Label>
                      <Input 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                        className="rounded-none border-slate-200 focus:border-emerald-500 focus:ring-0 h-12 font-bold"
                      />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all duration-300" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('save_user')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card rounded-none overflow-hidden border border-white/50 shadow-xl">
        <div className="p-8 border-b border-slate-100 bg-white/50">
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{t('all_users')}</h4>
        </div>
        <div className="p-0 overflow-x-auto no-scrollbar">
          <Table className="min-w-[800px] sm:min-w-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pl-8">{t('name')}</TableHead>
                <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('email')}</TableHead>
                <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('role')}</TableHead>
                <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6">{t('status')}</TableHead>
                <TableHead className="text-slate-400 font-black text-[10px] uppercase tracking-widest py-6 pr-8 text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, idx) => (
                <motion.tr 
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-slate-50 hover:bg-emerald-50/30 transition-colors group"
                >
                  <TableCell className="font-bold text-slate-900 py-6 pl-8">{u.name}</TableCell>
                  <TableCell className="text-slate-600 py-6 font-medium">{u.email}</TableCell>
                  <TableCell className="capitalize text-slate-600 py-6 font-medium">{u.role.replace('_', ' ')}</TableCell>
                  <TableCell className="py-6">
                    <span className={`inline-flex items-center rounded-none px-3 py-1 text-[10px] font-black uppercase tracking-widest ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {u.isActive ? t('active') : t('inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="py-6 pr-8 text-right">
                    <div className="flex justify-end gap-2 transition-opacity duration-300">
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[1rem] font-bold text-[11px] uppercase tracking-widest" onClick={() => {
                        setSelectedUserForDetails(u);
                        setIsDetailsDialogOpen(true);
                      }}>{t('view_details')}</Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[1rem] font-bold text-[11px] uppercase tracking-widest" onClick={() => {
                        setFormData({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '' });
                        setIsEditing(true);
                        setIsDialogOpen(true);
                      }}>{t('edit')}</Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-[1rem] font-bold text-[11px] uppercase tracking-widest" onClick={() => toggleStatus(u.id, u.isActive)}>
                        {t('toggle_status')}
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
