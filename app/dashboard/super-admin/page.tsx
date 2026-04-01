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

export default function SuperAdminDashboard() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
    try {
      const userEmail = formData.email.toLowerCase();
      
      // If a password is provided, create the user in Firebase Auth first
      if (formData.password && !isEditing) {
        const secondaryAuth = createSecondaryAuth();
        try {
          await createUserWithEmailAndPassword(secondaryAuth, userEmail, formData.password);
          await signOut(secondaryAuth); // Log out the secondary instance immediately so it doesn't affect the Super Admin
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
      
      toast.success('User saved successfully');
      setIsDialogOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      toast.success('User status updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (userData?.role !== 'super_admin') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => {
            setFormData({ name: '', email: '', password: '', role: 'restaurant', phone: '', address: '' });
            setIsEditing(false);
            setIsDialogOpen(true);
          }}>Add New User</Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={isEditing} />
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label>Password (Optional - for Email Login)</Label>
                  <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Leave blank if using Google Login only" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v || 'restaurant'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="admin">Admin (Driver)</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'restaurant' && (
                <>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full">Save User</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => {
                      setFormData({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '' });
                      setIsEditing(true);
                      setIsDialogOpen(true);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="ml-2 text-red-600" onClick={() => toggleStatus(u.id, u.isActive)}>
                      Toggle Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
