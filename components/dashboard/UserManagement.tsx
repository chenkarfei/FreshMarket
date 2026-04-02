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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{t('user_management')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('manage_system_users_and_roles')}</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">{t('view_details')}</DialogTitle>
              </DialogHeader>
              {selectedUserForDetails && (
                <div className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('name')}</Label>
                      <p className="text-sm font-medium text-slate-900">{selectedUserForDetails.name}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('email')}</Label>
                      <p className="text-sm font-medium text-slate-900">{selectedUserForDetails.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('role')}</Label>
                      <p className="text-sm font-medium text-slate-900 capitalize">{selectedUserForDetails.role.replace('_', ' ')}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('status')}</Label>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${selectedUserForDetails.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {selectedUserForDetails.isActive ? t('active') : t('inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedUserForDetails.role === 'restaurant' && (
                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Phone</Label>
                        <p className="text-sm font-medium text-slate-900">{selectedUserForDetails.phone || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Address</Label>
                        <p className="text-sm font-medium text-slate-900">{selectedUserForDetails.address || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button 
              onClick={() => {
                setFormData({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });
                setIsEditing(false);
                setIsDialogOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 h-10"
            >
              {t('add_new_user')}
            </Button>
            <DialogContent className="border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">{isEditing ? t('edit_user') : t('add_new_user')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('name')}</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('email')}</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                    disabled={isEditing} 
                    className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                {!isEditing && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('password_optional')}</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder={t('leave_blank_google')} 
                      className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('role')}</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v || 'restaurant'})}>
                    <SelectTrigger className="rounded-lg border-slate-200 focus:ring-0 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-100 shadow-xl">
                      <SelectItem value="restaurant">{t('restaurant')}</SelectItem>
                      <SelectItem value="admin">{t('admin_driver')}</SelectItem>
                      <SelectItem value="super_admin">{t('super_admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'restaurant' && (
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-50">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('phone')}</Label>
                      <Input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('address')}</Label>
                      <Input 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                        className="rounded-lg border-slate-200 focus:border-slate-900 focus:ring-0 h-11"
                      />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 transition-all" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('save_user')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-slate-100 shadow-none overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-lg font-medium text-slate-900">{t('all_users')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pl-6">{t('name')}</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('email')}</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('role')}</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">{t('status')}</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4 pr-6 text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900 py-4 pl-6">{u.name}</TableCell>
                  <TableCell className="text-slate-600 py-4">{u.email}</TableCell>
                  <TableCell className="capitalize text-slate-600 py-4">{u.role.replace('_', ' ')}</TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {u.isActive ? t('active') : t('inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
                        setSelectedUserForDetails(u);
                        setIsDetailsDialogOpen(true);
                      }}>{t('view_details')}</Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
                        setFormData({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '' });
                        setIsEditing(true);
                        setIsDialogOpen(true);
                      }}>{t('edit')}</Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => toggleStatus(u.id, u.isActive)}>
                        {t('toggle_status')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
