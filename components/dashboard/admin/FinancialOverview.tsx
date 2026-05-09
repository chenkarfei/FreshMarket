"use client";

import { useMemo, useState } from 'react';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, ShoppingBag, TrendingUp, Calendar, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6'];

export function FinancialOverview({ allOrders, allUsers }: { allOrders: any[], allUsers: any[] }) {
  const { t, formatDate } = useLanguage();
  const [timeFilter, setTimeFilter] = useState('30'); // '30', '14', '7'
  
  const stats = useMemo(() => {
    const days = parseInt(timeFilter);
    const today = new Date();
    const periodStart = subDays(startOfDay(today), days);
    const previousPeriodStart = subDays(periodStart, days);

    let currentRev = 0;
    let prevRev = 0;
    let currentOrders = 0;
    let prevOrders = 0;
    
    // Status distribution
    const statusCounts = {
      completed: 0,
      processing: 0,
      cancelled: 0,
    };

    // Chart Data mapping
    const chartMap: Record<string, number> = {};
    for(let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      chartMap[formatDate(d, 'MMM d')] = 0;
    }

    allOrders.forEach(order => {
      // orderDate is typically YYYY-MM-DD
      const date = order.orderDate ? parseISO(order.orderDate) : (order.createdAt?.toDate ? order.createdAt.toDate() : new Date());
      const revenue = order.totalMin || 0;

      if (date >= periodStart) {
        currentRev += revenue;
        currentOrders++;
        
        const dateKey = formatDate(date, 'MMM d');
        if (chartMap[dateKey] !== undefined) {
          chartMap[dateKey] += revenue;
        }

        if (order.status === 'acknowledged' || order.status === 'completed') statusCounts.completed++;
        else if (order.status === 'cancelled' || order.status === 'rejected') statusCounts.cancelled++;
        else statusCounts.processing++;
        
      } else if (date >= previousPeriodStart && date < periodStart) {
        prevRev += revenue;
        prevOrders++;
      }
    });

    const activeUsers = allUsers.filter(u => u.isActive !== false).length;
    // Just a dummy prev users for now since tracking historical users requires history logs
    const prevActiveUsers = activeUsers > 0 ? activeUsers - 1 : 0; 
    
    const revGrowth = prevRev === 0 ? 100 : ((currentRev - prevRev) / prevRev) * 100;
    const ordersGrowth = prevOrders === 0 ? 100 : ((currentOrders - prevOrders) / prevOrders) * 100;
    const usersGrowth = prevActiveUsers === 0 ? 100 : ((activeUsers - prevActiveUsers) / prevActiveUsers) * 100;
    
    const currentAov = currentOrders === 0 ? 0 : currentRev / currentOrders;
    const prevAov = prevOrders === 0 ? 0 : prevRev / prevOrders;
    const aovGrowth = prevAov === 0 ? 100 : ((currentAov - prevAov) / prevAov) * 100;

    const chartData = Object.entries(chartMap).map(([name, value]) => ({ name, value }));
    const pieData = [
      { name: t('completed') || 'Completed', value: statusCounts.completed },
      { name: t('processing') || 'Processing', value: statusCounts.processing },
      { name: t('cancelled') || 'Cancelled', value: statusCounts.cancelled },
    ].filter(d => d.value > 0);
    
    if (pieData.length === 0) {
       pieData.push({ name: t('no_data') || 'No Data', value: 1 });
    }

    return {
      currentRev, revGrowth,
      currentOrders, ordersGrowth,
      activeUsers, usersGrowth,
      currentAov, aovGrowth,
      chartData, pieData
    };
  }, [allOrders, allUsers, timeFilter, t, formatDate]);

  const handleExportData = () => {
    const headers = ['Order ID', 'Date', 'Amount (Min)', 'Amount (Max)', 'Status', 'Restaurant ID', 'Customer ID'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + allOrders.filter(o => o).map(order => `${order.id},${order.orderDate || (order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : '')},${order.totalMin || 0},${order.totalMax || 0},${order.status},${order.restaurantId},${order.userId}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = () => {
    const reportContent = `Financial Report - Last ${timeFilter} Days
Generated on: ${formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}

Overview:
------------------------
Total Revenue: RM ${stats.currentRev.toFixed(2)}
Total Orders: ${stats.currentOrders}
Active Users: ${stats.activeUsers}
Average Order Value: RM ${stats.currentAov.toFixed(2)}

Growth vs Previous ${timeFilter} Days:
------------------------
Revenue Growth: ${(stats.revGrowth > 0 ? '+' : '')}${stats.revGrowth.toFixed(2)}%
Orders Growth: ${(stats.ordersGrowth > 0 ? '+' : '')}${stats.ordersGrowth.toFixed(2)}%
Users Growth: ${(stats.usersGrowth > 0 ? '+' : '')}${stats.usersGrowth.toFixed(2)}%
AOV Growth: ${(stats.aovGrowth > 0 ? '+' : '')}${stats.aovGrowth.toFixed(2)}%
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_report_${timeFilter}d_${formatDate(new Date(), 'yyyy-MM-dd')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ title, value, icon: Icon, growth, suffix = '', prefix = '', color, delay }: any) => {
    const isPositive = growth >= 0;
    
    const colorMap: Record<string, string> = {
      'bg-emerald-500': 'bg-emerald-50 text-emerald-600',
      'bg-blue-500': 'bg-blue-50 text-blue-600',
      'bg-orange-500': 'bg-orange-50 text-orange-600',
      'bg-purple-500': 'bg-purple-50 text-purple-600',
    };
    const iconColors = colorMap[color] || 'bg-slate-50 text-slate-600';

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
        <div className="glass-card h-full flex flex-col rounded-3xl p-8 transition-all hover:shadow-lg bg-white border border-white/60 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
            <div className={`p-3 rounded-2xl shadow-sm ${iconColors}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          
          <div className="flex flex-col min-w-0 flex-1 justify-center overflow-hidden">
            <div className="flex items-baseline w-full max-w-full">
              {prefix && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1.5 shrink-0">{prefix}</span>}
              <span className="text-3xl lg:text-4xl 2xl:text-5xl font-black text-slate-900 tracking-tight pr-2" style={{ whiteSpace: 'nowrap' }} title={String(value)}>
                {value}
              </span>
              {suffix && <span className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1.5 shrink-0">{suffix}</span>}
            </div>
          </div>
          
          <div className={`flex items-center mt-6 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
            {isPositive ? '+' : ''}{growth.toFixed(1)}% <span className="text-slate-400 font-medium ml-1.5">{t('vs_prev') || 'vs prev'} {timeFilter}d</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">{t('financial_overview') || 'Financial Overview'}</h1>
          <div className="flex items-center mt-1 text-slate-500 text-sm font-medium">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(new Date(), 'EEE, d MMMM yyyy')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownloadReport} className="rounded-full h-10 px-5 font-bold text-slate-600 border-slate-200">
            <Download className="h-4 w-4 mr-2" /> {t('download_report') || 'Download Report'}
          </Button>
          <Button onClick={handleExportData} className="rounded-full h-10 px-5 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10">
            <FileText className="h-4 w-4 mr-2" /> {t('export_data') || 'Export Data'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('total_revenue') || "Total Revenue"} value={stats.currentRev.toFixed(2)} prefix="RM" icon={DollarSign} growth={stats.revGrowth} color="bg-emerald-500" delay={0.1} />
        <StatCard title={t('active_users') || "Active Users"} value={stats.activeUsers} icon={Users} growth={stats.usersGrowth} color="bg-blue-500" delay={0.2} />
        <StatCard title={t('total_orders') || "Total Orders"} value={stats.currentOrders} icon={ShoppingBag} growth={stats.ordersGrowth} color="bg-orange-500" delay={0.3} />
        <StatCard title={t('avg_order_value') || "Avg Order Value"} value={stats.currentAov.toFixed(2)} prefix="RM" icon={TrendingUp} growth={stats.aovGrowth} color="bg-purple-500" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm bg-white h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-serif font-black text-slate-800">{t('revenue_performance') || 'Revenue Performance'}</CardTitle>
              <select 
                title="Time Filter"
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-full px-3 py-1.5 font-bold outline-none cursor-pointer"
              >
                <option value="7">{t('last_7_days') || 'Last 7 Days'}</option>
                <option value="14">{t('last_14_days') || 'Last 14 Days'}</option>
                <option value="30">{t('last_30_days') || 'Last 30 Days'}</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={20} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                      formatter={(value) => [`RM ${Number(value ?? 0).toFixed(2)}`, t('total_revenue') || 'Revenue']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm bg-white h-full flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-serif font-black text-slate-800">{t('order_distribution') || 'Order Distribution'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#e2e8f0' : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3 mt-4">
                {stats.pieData.map((entry, idx) => entry.name !== 'No Data' && (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-sm font-medium text-slate-600">{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
